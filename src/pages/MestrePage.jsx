import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp, arrayRemove, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom'; 
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 
import sanchezImg from '../assets/sanchez.jpeg'; 
import papiroImg from '../assets/papiro.png'; 
import chocoboGif from '../assets/chocobo-loading.gif';
import Bazar from '../components/Bazar'; 
import Forja from '../components/Forja'; 
import Ficha from '../components/Ficha'; 
import fichaIcon from '../assets/ficha-icon.png'; 

const Timer = ({ expiry }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiry).getTime() - now;
      if (distance < 0) { 
        setTimeLeft("EXPIRADA"); 
        clearInterval(interval); 
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${days}d ${hours}h ${mins}m`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiry]);
  return <span className="mission-timer">⏳ {timeLeft}</span>;
};

export default function MestrePage() {
  const navigate = useNavigate();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [missoes, setMissoes] = useState([]);
  const [resenhas, setResenhas] = useState([]); 
  const [sessoes, setSessoes] = useState([]); 
  const [personagensDb, setPersonagensDb] = useState([]);
  
  // Loading Control
  const [loading, setLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Modais
  const [showModal, setShowModal] = useState(false); 
  const [showResenhaModal, setShowResenhaModal] = useState(false); 
  const [showSessionModal, setShowSessionModal] = useState(false); 
  const [showFichasList, setShowFichasList] = useState(false); 
  const [selectedFicha, setSelectedFicha] = useState(null); 
  
  // Visualizações
  const [showDetails, setShowDetails] = useState(null); 
  const [viewResenha, setViewResenha] = useState(null); 
  const [viewImage, setViewImage] = useState(null); 
  const [viewMembers, setViewMembers] = useState(null); 

  // Forms
  const [resenha, setResenha] = useState("");
  const [tituloResenha, setTituloResenha] = useState("");
  const [destinatarios, setDestinatarios] = useState([]);
  const [sessaoDestinatarios, setSessaoDestinatarios] = useState([]); 
  const [form, setForm] = useState({
    nome: '', local: '', contratante: '', descricaoMissao: '', objetivosMissao: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: ''
  });
  
  const [sessionForm, setSessionForm] = useState({
    missaoId: '', 
    dataInicio: '', 
    mapas: [],      
    cenarios: [],   
    monstros: [],   
    npcs: [],       
    jogadores: []   
  });
  const [tempLink, setTempLink] = useState("");
  const [tempType, setTempType] = useState("mapas"); 

  const [mestreIdentidade, setMestreIdentidade] = useState(() => {
    return localStorage.getItem('mestreAssinatura') || "Narrador";
  });

  useEffect(() => {
    localStorage.setItem('mestreAssinatura', mestreIdentidade);
  }, [mestreIdentidade]);

  // --- 1. MINIMUM TIME LOADING LOGIC ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000); // 2 Segundos Mínimos
    return () => clearTimeout(timer);
  }, []);

  // --- 2. AUTH & DATA ---
  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();

    const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
            setCurrentUser(user);
            const qM = query(collection(db, "missoes"), where("mestreId", "==", user.uid), orderBy("createdAt", "desc"));
            const qR = query(collection(db, "resenhas"), where("mestreId", "==", user.uid), orderBy("createdAt", "desc"));
            const qS = query(collection(db, "sessoes"), where("mestreId", "==", user.uid), orderBy("dataInicio", "asc"));
            const qC = query(collection(db, "characters"));

            const unsubM = onSnapshot(qM, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            const unsubR = onSnapshot(qR, (snap) => setResenhas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            const unsubS = onSnapshot(qS, (snap) => setSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            const unsubC = onSnapshot(qC, (snap) => {
                setPersonagensDb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false); 
            });

            return () => { unsubM(); unsubR(); unsubS(); unsubC(); };
        } else {
            setLoading(false);
            navigate('/login'); 
        }
    });

    return () => unsub();
  }, [navigate]);

  useEffect(() => {
      if (selectedFicha) {
          const updated = personagensDb.find(p => p.id === selectedFicha.id);
          if (updated) setSelectedFicha(updated);
      }
  }, [personagensDb]);

  // --- HANDLERS ---
  const handleCreateMission = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const msToAdd = (form.duracao.match(/(\d+)w/) || [0, 0])[1] * 604800000 + 
                      (form.duracao.match(/(\d+)d/) || [0, 0])[1] * 86400000 + 
                      (form.duracao.match(/(\d+)h/) || [0, 0])[1] * 3600000;
      await addDoc(collection(db, "missoes"), {
        ...form, mestreNome: mestreIdentidade, mestreId: currentUser.uid, createdAt: serverTimestamp(), expiraEm: new Date(Date.now() + (msToAdd || 3600000)).toISOString()
      });
      setShowModal(false);
      setForm({ nome: '', local: '', contratante: '', descricaoMissao: '', objetivosMissao: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: '' });
    } catch (err) { alert("Erro ao forjar cartaz: " + err.message); }
  };

  const publicarResenha = async () => {
    if (!tituloResenha || !resenha || !currentUser) return alert("Preencha título e conteúdo!");
    try {
      const expiraEm = new Date(); expiraEm.setDate(expiraEm.getDate() + 7); 
      await addDoc(collection(db, "resenhas"), {
        titulo: tituloResenha, conteudo: resenha, mestre: mestreIdentidade, mestreId: currentUser.uid, destinatarios, createdAt: serverTimestamp(), expiraEm: expiraEm.toISOString()
      });
      setShowResenhaModal(false); setResenha(""); setTituloResenha(""); setDestinatarios([]);
    } catch (e) { alert("Erro ao publicar."); }
  };

  const handleRemoveCandidate = async (missaoId, candidate) => {
      if(window.confirm(`Remover ${candidate.nome} da missão?`)) {
          const missaoRef = doc(db, "missoes", missaoId);
          await updateDoc(missaoRef, {
              candidatos: arrayRemove(candidate)
          });
      }
  };

  const handleAddAsset = () => {
      if (!tempLink) return;
      setSessionForm(prev => ({
          ...prev,
          [tempType]: [...prev[tempType], tempLink]
      }));
      setTempLink(""); 
  };

  const handleRemoveAsset = (type, index) => {
      setSessionForm(prev => ({
          ...prev,
          [type]: prev[type].filter((_, i) => i !== index)
      }));
  };

  const criarSessao = async (e) => {
      e.preventDefault();
      if (!sessionForm.missaoId || !sessionForm.dataInicio || !currentUser) return alert("Selecione a missão e o horário!");
      try {
        const missaoObj = missoes.find(m => m.id === sessionForm.missaoId);
        const inicio = new Date(sessionForm.dataInicio);
        const fim = new Date(inicio.getTime() + (24 * 60 * 60 * 1000)); 
        await addDoc(collection(db, "sessoes"), {
            missaoId: sessionForm.missaoId,
            missaoNome: missaoObj ? missaoObj.nome : "Missão Desconhecida",
            mestreId: currentUser.uid,
            dataInicio: sessionForm.dataInicio,
            expiraEm: fim.toISOString(),
            participantes: sessaoDestinatarios, 
            mapas: sessionForm.mapas,
            cenarios: sessionForm.cenarios,
            monstros: sessionForm.monstros,
            npcs: sessionForm.npcs,
            jogadores: sessionForm.jogadores,
            connected_players: [],
            dm_online: false,
            createdAt: serverTimestamp()
        });
        setShowSessionModal(false);
        setSessionForm({ missaoId: '', dataInicio: '', mapas: [], cenarios: [], monstros: [], npcs: [], jogadores: [] });
        setSessaoDestinatarios([]);
        alert("Sessão criada com sucesso!");
      } catch (err) {
          alert("Erro ao criar sessão: " + err.message);
      }
  };

  const enterVTT = (sessao) => {
      navigate('/mestre-vtt');
  };

  // --- TELA DE CARREGAMENTO (PADRONIZADA 2S) ---
  if (loading || !minTimeElapsed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', 
        background: 'radial-gradient(circle at center, #001a33 0%, #000000 100%)', 
        color: '#ffcc00', fontFamily: 'Cinzel, serif', zIndex: 9999, position: 'fixed', top: 0, left: 0
      }}>
        <img src={chocoboGif} alt="Carregando..." style={{ width: '120px', marginBottom: '20px' }} />
        <p style={{ 
          fontSize: '18px', letterSpacing: '4px', textTransform: 'uppercase',
          animation: 'pulseText 2s infinite ease-in-out' 
        }}>Sintonizando Éter...</p>
        <style>{`
          @keyframes pulseText { 
            0% { opacity: 0.4; transform: scale(0.98); } 
            50% { opacity: 1; transform: scale(1.02); } 
            100% { opacity: 0.4; transform: scale(0.98); } 
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mestre-container">
      <div className="mestre-bg-image-full" style={{backgroundImage: `url(${fundoMestre})`}}></div>
      
      <div className="mestre-content">
        <div className="top-bar-flex">
            <h1 className="ff-title">HUB DO NARRADOR</h1>
            
            <div className="mestre-identity-box ff-card fade-in">
                <label>ASSINATURA DO MESTRE:</label>
                <input type="text" value={mestreIdentidade} onChange={(e) => setMestreIdentidade(e.target.value)} />
            </div>
        </div>
        
        <div className="mestre-grid">
          {/* COLUNA 1: MISSÕES */}
          <div className="ff-card board-column">
            <div className="card-header no-border">
              <h3>QUADRO DE MISSÕES</h3>
              <button className="ff-add-btn" onClick={() => setShowModal(true)}><span>+</span> ADICIONAR CARTAZ</button>
            </div>
            <div className="mission-scroll">
              {missoes.map(m => {
                const maxGroup = parseInt(m.grupo) || 0;
                const currentGroup = m.candidatos ? m.candidatos.length : 0;
                const fillPercent = maxGroup > 0 ? (currentGroup / maxGroup) * 100 : 0;
                const isFull = currentGroup >= maxGroup && maxGroup > 0;

                return (
                    <div key={m.id} className={`mission-poster rank-${m.rank}`}>
                    <div className="poster-rank-label-fixed">{m.rank}</div>
                    <span className="mestre-tag">Narrador: {m.mestreNome}</span>
                    <h4>{m.nome}</h4>
                    <p className="gil-recompensa">💰 Recompensa: {m.gilRecompensa} Gil</p>
                    
                    <div className="vagas-container">
                        <div className="vagas-labels">
                            <span>JOGADORES:</span>
                            <span style={{color: isFull ? '#f44' : '#0f0'}}>{currentGroup} / {maxGroup}</span>
                        </div>
                        <div className="vagas-track">
                            <div className="vagas-fill" style={{width: `${fillPercent}%`, background: isFull ? '#f44' : '#00f2ff'}}></div>
                        </div>
                    </div>

                    {m.candidatos && m.candidatos.length > 0 && (
                        <div className="candidates-mini-box">
                        <strong>Candidatos:</strong>
                        {m.candidatos.map(c => (
                            <div key={c.uid} className="cand-row-master">
                                <span style={{color: c.isLeader ? '#ffcc00' : '#ccc'}}>
                                    {c.isLeader && '👑'} {c.nome} ({c.classe})
                                </span>
                                <button className="btn-kick-x" title="Remover Jogador" onClick={() => handleRemoveCandidate(m.id, c)}>×</button>
                            </div>
                        ))}
                        </div>
                    )}

                    <Timer expiry={m.expiraEm} />
                    <div className="poster-actions">
                        <button className="btn-cyan" onClick={() => setViewImage(m.imagem)}>CARTAZ</button>
                        <button className="btn-cyan" onClick={() => setShowDetails(m)}>DETALHES</button>
                        <button className="btn-red" onClick={() => deleteDoc(doc(db, "missoes", m.id))}>EXCLUIR</button>
                    </div>
                    </div>
                );
              })}
            </div>
          </div>

          {/* COLUNA 2: RESENHAS */}
          <div className="ff-card sanchez-card board-column">
            <div className="sanchez-header-top no-border">
              <h3>RESENHA DO SANCHES</h3>
              <button className="ff-add-btn-gold-small" onClick={() => setShowResenhaModal(true)}>+ CRIAR NOVA RESENHA</button>
            </div>
            <div className="mission-scroll">
              {resenhas.map(r => (
                <div key={r.id} className="resenha-item-card">
                  <h4>{r.titulo}</h4>
                  <Timer expiry={r.expiraEm} />
                  <div className="poster-actions">
                    <button className="btn-cyan" onClick={() => setViewResenha(r)}>VISUALIZAR</button>
                    <button className="btn-red" onClick={() => deleteDoc(doc(db, "resenhas", r.id))}>EXCLUIR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUNA 3: SESSÕES */}
          <div className="ff-card board-column">
            <div className="card-header no-border">
              <h3>SESSÕES DE JOGO</h3>
              <button className="ff-add-btn small-btn" onClick={() => setShowSessionModal(true)}>INICIAR NOVA SESSÃO</button>
            </div>
            <div className="mission-scroll">
               {sessoes.length === 0 ? (
                   <div className="empty-instancia">NENHUMA INSTÂNCIA ATIVA</div>
               ) : (
                   sessoes.map(s => (
                       <div key={s.id} className="sessao-card">
                           <div className="sessao-status">🔴 AO VIVO / AGENDADA</div>
                           <h4 className="sessao-title">{s.missaoNome}</h4>
                           <div className="sessao-info">
                               <span>📅 {new Date(s.dataInicio).toLocaleString()}</span>
                               <span className="sessao-players">👥 {s.participantes?.length || 0} Jogadores</span>
                           </div>
                           <div className="sessao-assets-count">
                               🖼️ {(s.mapas?.length || 0) + (s.cenarios?.length || 0)} Imagens
                           </div>
                           <div className="poster-actions" style={{marginTop: '15px'}}>
                               <button className="btn-cyan" onClick={() => setViewMembers(s)}>👥 MEMBROS</button>
                               <button className="btn-play-vtt" onClick={() => enterVTT(s)}>▶ ACESSAR VTT</button>
                               <button className="btn-red" onClick={() => deleteDoc(doc(db, "sessoes", s.id))}>CANCELAR</button>
                           </div>
                       </div>
                   ))
               )}
            </div>
          </div>
        </div>
      </div>

      {/* BOTÃO FLUTUANTE DE FICHAS */}
      <button className="fichas-trigger-btn" onClick={() => setShowFichasList(true)} title="Acessar Fichas">
          <img src={fichaIcon} alt="Fichas" />
      </button>

      {/* BOTÕES FLUTUANTES DE SISTEMA */}
      <Bazar isMestre={true} />
      <Forja />

      {/* MODAL DE LISTA DE FICHAS */}
      {showFichasList && (
          <div className="ff-modal-overlay-fixed" onClick={() => setShowFichasList(false)}>
              <div className="ff-modal-scrollable ff-card" onClick={e => e.stopPropagation()}>
                  <h3 className="modal-title-ff">PERSONAGENS REGISTRADOS</h3>
                  <div className="destinatarios-grid-fixed">
                      {personagensDb.map(p => (
                          <div key={p.id} className="ficha-list-item">
                              <div className="ficha-row-name">
                                  <strong>{p.name}</strong> 
                                  <small>{p.race} // {p.class}</small>
                              </div>
                              <button className="btn-cyan" onClick={() => { setSelectedFicha(p); setShowFichasList(false); }}>ABRIR FICHA ➔</button>
                          </div>
                      ))}
                  </div>
                  <button className="btn-cancelar-main" style={{marginTop:'20px'}} onClick={() => setShowFichasList(false)}>FECHAR</button>
              </div>
          </div>
      )}

      {/* MODAL DA FICHA EM MODO MESTRE */}
      {selectedFicha && (
          <Ficha 
            characterData={selectedFicha} 
            isMaster={true} 
            onClose={() => setSelectedFicha(null)} 
          />
      )}

      {/* --- OUTROS MODAIS --- */}
      {showModal && (
        <div className="ff-modal-overlay-fixed">
          <div className="ff-modal-scrollable ff-card">
            <h3 className="modal-title-ff">NOVA MISSÃO</h3>
            <form onSubmit={handleCreateMission}>
              <div className="modal-input-group"><label>NOME DA MISSÃO</label><input placeholder="Título..." value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required /></div>
              <div className="modal-input-group"><label>LOCAL</label><input placeholder="Onde ocorre..." value={form.local} onChange={e=>setForm({...form, local: e.target.value})} /></div>
              <div className="modal-input-group"><label>CONTRATANTE</label><input placeholder="Quem paga..." value={form.contratante} onChange={e=>setForm({...form, contratante: e.target.value})} /></div>
              <div className="modal-input-group"><label>DESCRIÇÃO DA MISSÃO</label><textarea className="tall-area-dark" placeholder="Detalhes da história e contexto..." value={form.descricaoMissao} onChange={e=>setForm({...form, descricaoMissao: e.target.value})} /></div>
              <div className="modal-input-group"><label>OBJETIVOS DA MISSÃO</label><textarea className="tall-area-dark" placeholder="O que deve ser feito passo a passo..." value={form.objetivosMissao} onChange={e=>setForm({...form, objetivosMissao: e.target.value})} /></div>
              <div className="modal-input-group"><label>REQUISITOS DA MISSÃO</label><textarea className="tall-area-dark" placeholder="O que é necessário para aceitar..." value={form.requisitos} onChange={e=>setForm({...form, requisitos: e.target.value})} /></div>
              <div className="row-double-ff">
                <div className="field-group"><label>GRUPO MÁXIMO</label><input placeholder="Ex: 4" value={form.grupo} onChange={e=>setForm({...form, grupo: e.target.value})} /></div>
                <div className="field-group"><label>RANK</label><select value={form.rank} onChange={e=>setForm({...form, rank: e.target.value})}>{['E','D','C','B','A','S','SS','SC'].map(r => <option key={r} value={r}>RANK {r}</option>)}</select></div>
              </div>
              <div className="modal-input-group"><label>RECOMPENSAS EXTRAS</label><textarea className="tall-area-dark" placeholder="Itens, especiarias..." value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} /></div>
              <div className="row-double-ff">
                <div className="field-group"><label>GIL</label><input type="text" className="gil-input" placeholder="Ex: 5000" value={form.gilRecompensa} onChange={e => setForm({...form, gilRecompensa: e.target.value.replace(/\D/g, '')})} /></div>
                <div className="field-group"><label>DURAÇÃO</label><input placeholder="Ex: 1d 10h" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required /></div>
              </div>
              <div className="modal-input-group"><label>IMAGEM</label><input placeholder="Link Imgur..." value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} /></div>
              <div className="btn-group-ff"><button type="submit" className="btn-forjar-main">FORJAR MISSÃO</button><button type="button" className="btn-cancelar-main" onClick={() => setShowModal(false)}>FECHAR</button></div>
            </form>
          </div>
        </div>
      )}

      {showResenhaModal && (
        <div className="ff-modal-overlay-fixed">
          <div className="ff-modal-scrollable ff-card">
            <h3 className="modal-title-ff">ESCREVER CRÔNICA</h3>
            <div className="modal-input-group"><label>TÍTULO</label><input className="ff-modal-input-dark" value={tituloResenha} onChange={(e)=>setTituloResenha(e.target.value)} /></div>
            <div className="modal-input-group"><label>CORPO</label><textarea className="tall-area-ff-dark" value={resenha} onChange={(e) => setResenha(e.target.value)} /></div>
            <div className="player-selector-box-fixed"><label>DESTINATÁRIOS:</label><div className="destinatarios-grid-fixed">{personagensDb.map(p => (<label key={p.id} className="chip-label-ff"><input type="checkbox" checked={destinatarios.includes(p.name)} onChange={() => destinatarios.includes(p.name) ? setDestinatarios(destinatarios.filter(x=>x!==p.name)) : setDestinatarios([...destinatarios, p.name])} /> {p.name}</label>))}</div></div>
            <div className="btn-group-ff"><button className="btn-forjar-main" onClick={publicarResenha}>PUBLICAR</button><button className="btn-cancelar-main" onClick={() => setShowResenhaModal(false)}>FECHAR</button></div>
          </div>
        </div>
      )}

      {showSessionModal && (
          <div className="ff-modal-overlay-fixed">
              <div className="ff-modal-scrollable ff-card">
                  <h3 className="modal-title-ff">CRIAR NOVA SESSÃO</h3>
                  <form onSubmit={criarSessao}>
                      <div className="modal-input-group"><label>SELECIONAR MISSÃO</label><select className="ff-select-dark" value={sessionForm.missaoId} onChange={e => setSessionForm({...sessionForm, missaoId: e.target.value})} required><option value="">-- Escolha --</option>{missoes.map(m => <option key={m.id} value={m.id}>{m.nome} (Rank {m.rank})</option>)}</select></div>
                      <div className="modal-input-group"><label>DATA E HORÁRIO</label><input type="datetime-local" className="ff-input-dark" value={sessionForm.dataInicio} onChange={e => setSessionForm({...sessionForm, dataInicio: e.target.value})} required /></div>
                      <div className="player-selector-box-fixed"><label>JOGADORES:</label><div className="destinatarios-grid-fixed">{personagensDb.map(p => (<label key={p.id} className="chip-label-ff"><input type="checkbox" checked={sessaoDestinatarios.includes(p.name)} onChange={() => sessaoDestinatarios.includes(p.name) ? setSessaoDestinatarios(sessaoDestinatarios.filter(x=>x!==p.name)) : setSessaoDestinatarios([...sessaoDestinatarios, p.name])} /> {p.name} ({p.class})</label>))}</div></div>
                      
                      <div className="upload-section-box">
                          <h4 className="upload-section-title">IMPORTAR IMAGENS</h4>
                          <div className="link-import-row">
                              <input 
                                className="ff-input-dark" 
                                placeholder="Link da imagem..."
                                value={tempLink} 
                                onChange={e => setTempLink(e.target.value)} 
                              />
                              <select 
                                className="ff-select-dark small-select" 
                                value={tempType} 
                                onChange={e => setTempType(e.target.value)}
                              >
                                <option value="mapas">Tabletop</option>
                                <option value="cenarios">Cenário</option>
                                <option value="npcs">NPCs</option>
                              </select>
                              <button type="button" className="btn-cyan" onClick={handleAddAsset}>+</button>
                          </div>
                          <div className="assets-lists">
                              {sessionForm.mapas.map((link, i) => (<div key={`map-${i}`} className="asset-item"><span className="truncate-link">[TABLETOP] {link}</span><button type="button" className="btn-remove-x" onClick={() => handleRemoveAsset('mapas', i)}>×</button></div>))}
                              {sessionForm.cenarios.map((link, i) => (<div key={`cen-${i}`} className="asset-item"><span className="truncate-link">[CENÁRIO] {link}</span><button type="button" className="btn-remove-x" onClick={() => handleRemoveAsset('cenarios', i)}>×</button></div>))}
                              {sessionForm.npcs.map((link, i) => (<div key={`npc-${i}`} className="asset-item"><span className="truncate-link">[NPC] {link}</span><button type="button" className="btn-remove-x" onClick={() => handleRemoveAsset('npcs', i)}>×</button></div>))}
                          </div>
                      </div>
                      <div className="btn-group-ff"><button type="submit" className="btn-forjar-main">AGENDAR</button><button type="button" className="btn-cancelar-main" onClick={() => setShowSessionModal(false)}>CANCELAR</button></div>
                  </form>
              </div>
          </div>
      )}

      {viewMembers && (
          <div className="ff-modal-overlay-fixed" onClick={() => setViewMembers(null)}>
              <div className="ff-modal-scrollable ff-card" onClick={e => e.stopPropagation()} style={{height: 'auto', maxHeight: '500px'}}>
                  <h3 className="modal-title-ff">MEMBROS ALOCADOS</h3>
                  <div className="destinatarios-grid-fixed">{viewMembers.participantes?.map((nome, idx) => (<div key={idx} className="chip-label-ff" style={{cursor: 'default', color: '#fff', borderColor: '#00f2ff'}}>👤 {nome}</div>))}</div>
                  <button className="btn-cancelar-main" style={{marginTop: '20px', width: '100%'}} onClick={() => setViewMembers(null)}>FECHAR</button>
              </div>
          </div>
      )}

      {showDetails && (
        <div className="ff-modal-overlay-fixed" onClick={() => setShowDetails(null)}>
          <div className="ff-modal ff-card detail-view-main" onClick={e => e.stopPropagation()}>
            <div className="detail-header-modern"><div className={`detail-rank-badge rank-${showDetails.rank}`}>{showDetails.rank}</div><div className="detail-title-col"><h2>{showDetails.nome}</h2><span className="detail-narrator">Narrador: {showDetails.mestreNome}</span></div></div>
            <div className="detail-body-grid">
              <div className="detail-info-row"><div className="info-item"><label>🌍 LOCAL</label><span>{showDetails.local || "Desconhecido"}</span></div><div className="info-item"><label>👤 CONTRATANTE</label><span>{showDetails.contratante || "Anônimo"}</span></div></div>
              <div className="detail-section">
                <label className="section-label">VAGAS</label>
                <div style={{background: '#111', padding: '10px', borderRadius: '4px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#aaa', marginBottom:'5px'}}>
                    <span>STATUS DO GRUPO</span>
                    <span>{showDetails.candidatos ? showDetails.candidatos.length : 0} / {showDetails.grupo || '?'}</span>
                  </div>
                  <div style={{width: '100%', height: '6px', background: '#333', borderRadius:'3px'}}>
                    <div style={{ width: `${Math.min(((showDetails.candidatos?.length || 0) / (parseInt(showDetails.grupo) || 1)) * 100, 100)}%`, height:'100%', background: (showDetails.candidatos?.length >= parseInt(showDetails.grupo)) ? '#f44' : '#00f2ff' }}></div>
                  </div>
                </div>
              </div>
              <div className="detail-section"><label className="section-label">📜 DESCRIÇÃO</label><p className="section-text">{showDetails.descricaoMissao}</p></div>
              <div className="detail-section"><label className="section-label">⚔️ OBJETIVOS</label><p className="section-text">{showDetails.objetivosMissao}</p></div>
              <div className="detail-section"><label className="section-label">⚡ REQUISITOS</label><p className="section-text">{showDetails.requisitos}</p></div>
              <div className="detail-section reward-section"><label className="section-label">💎 RECOMPENSAS</label><div className="reward-content-box"><div className="gil-display-row"><span className="gil-icon">💰</span> <span className="gil-value">{showDetails.gilRecompensa || 0} GIL</span></div>{showDetails.recompensa && (<div className="extra-rewards-list">{showDetails.recompensa.split('\n').map((r,i) => (<div key={i} className="reward-item">• {r}</div>))}</div>)}</div></div>
            </div>
            <button className="ff-final-close-btn" onClick={() => setShowDetails(null)}>FECHAR RELATÓRIO</button>
          </div>
        </div>
      )}

      {viewImage && (
        <div className="ff-modal-overlay-fixed" onClick={() => setViewImage(null)}>
          <div className="lightbox-wrap"><button className="close-lightbox" onClick={() => setViewImage(null)}>×</button><img src={viewImage} alt="Cartaz" className="cartaz-full-view" /></div>
        </div>
      )}

      {viewResenha && (
        <div className="papiro-overlay-full" onClick={() => setViewResenha(null)}>
          <div className="papiro-real-container" style={{backgroundImage: `url(${papiroImg})`}} onClick={e=>e.stopPropagation()}>
            <div className="sanchez-oval-view-no-border" style={{backgroundImage: `url(${sanchezImg})`}}></div>
            <h2 className="papiro-title-real">{viewResenha.titulo}</h2>
            <p className="papiro-mestre-sub">Narrador: {viewResenha.mestre}</p>
            <div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: viewResenha.conteudo }}></div>
            <button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button>
          </div>
        </div>
      )}

      <style>{`
        /* --- ESTILOS PRINCIPAIS MESTRE --- */
        .mestre-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; background: #020617; font-family: 'Cinzel', serif; color: #e2e8f0; }
        .mestre-bg-image-full { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.3; z-index: 0; animation: slowPan 60s infinite alternate; }
        @keyframes slowPan { from { transform: scale(1.0); } to { transform: scale(1.1); } }
        
        .mestre-content { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
        .top-bar-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .ff-title { font-size: 2rem; color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.5); letter-spacing: 4px; margin: 0; }
        .mestre-identity-box { padding: 10px 20px; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.6); border: 1px solid #fbbf24; border-radius: 4px; }
        .mestre-identity-box label { font-size: 0.8rem; color: #fbbf24; font-weight: bold; }
        .mestre-identity-box input { background: transparent; border: none; border-bottom: 1px solid #555; color: #fff; font-family: 'Cinzel', serif; text-align: center; width: 150px; }
        
        .mestre-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; flex: 1; min-height: 0; }
        .board-column { display: flex; flex-direction: column; height: 100%; background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-radius: 8px; overflow: hidden; backdrop-filter: blur(5px); box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .card-header { padding: 15px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); }
        .card-header h3 { margin: 0; color: #e2e8f0; font-size: 1rem; letter-spacing: 2px; }
        .no-border { border-bottom: none !important; }
        
        .mission-scroll { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 15px; scrollbar-width: thin; scrollbar-color: #fbbf24 #0f172a; }
        .mission-scroll::-webkit-scrollbar { width: 6px; }
        .mission-scroll::-webkit-scrollbar-thumb { background: #fbbf24; border-radius: 3px; }
        
        /* CARD MISSÃO */
        .mission-poster { background: #1e293b; border: 1px solid #334155; padding: 15px; border-radius: 4px; position: relative; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .mission-poster:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.3); border-color: #fbbf24; }
        .mission-poster h4 { margin: 25px 0 5px 0; color: #fbbf24; font-size: 1.1rem; text-transform: uppercase; }
        .poster-rank-label-fixed { position: absolute; top: 10px; right: 10px; font-weight: 900; font-size: 1.5rem; opacity: 0.3; color: #fff; }
        .mestre-tag { font-size: 0.7rem; color: #94a3b8; display: block; margin-bottom: 5px; }
        .gil-recompensa { font-size: 0.9rem; color: #fcd34d; font-weight: bold; margin-bottom: 10px; }
        
        .vagas-container { background: #0f172a; padding: 8px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #334155; }
        .vagas-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: #cbd5e1; margin-bottom: 4px; }
        .vagas-track { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; }
        .vagas-fill { height: 100%; transition: width 0.3s ease; }
        
        .candidates-mini-box { background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; margin-bottom: 10px; font-size: 0.75rem; }
        .cand-row-master { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-bottom: 2px; border-bottom: 1px dashed #334155; }
        .btn-kick-x { background: transparent; border: none; color: #ef4444; cursor: pointer; font-weight: bold; font-size: 14px; }
        .btn-kick-x:hover { color: #f87171; }
        
        .mission-timer { display: block; text-align: center; font-size: 0.8rem; color: #94a3b8; margin: 10px 0; font-weight: bold; }
        
        .poster-actions { display: flex; gap: 5px; justify-content: space-between; }
        .btn-cyan { flex: 1; padding: 6px; font-size: 0.7rem; background: transparent; border: 1px solid #00f2ff; color: #00f2ff; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .btn-cyan:hover { background: rgba(0, 242, 255, 0.1); }
        .btn-red { flex: 1; padding: 6px; font-size: 0.7rem; background: transparent; border: 1px solid #ef4444; color: #ef4444; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .btn-red:hover { background: rgba(239, 68, 68, 0.1); }
        
        /* SANCHES */
        .sanchez-card { border-color: #00f2ff; }
        .sanchez-header-top { padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #00f2ff; background: rgba(0, 242, 255, 0.05); }
        .sanchez-header-top h3 { color: #00f2ff; text-shadow: 0 0 5px rgba(0, 242, 255, 0.5); }
        .resenha-item-card { background: #0f172a; border: 1px solid #334155; padding: 15px; border-radius: 4px; border-left: 3px solid #00f2ff; }
        .resenha-item-card h4 { margin: 0 0 10px 0; color: #e2e8f0; font-size: 1rem; }
        
        /* SESSÕES */
        .sessao-card { background: #1e293b; border: 1px solid #fbbf24; padding: 15px; border-radius: 4px; position: relative; }
        .sessao-status { position: absolute; top: -10px; left: 10px; background: #fbbf24; color: #000; font-size: 0.6rem; font-weight: bold; padding: 2px 6px; border-radius: 2px; }
        .sessao-title { margin: 10px 0 5px 0; color: #fff; font-size: 1.1rem; }
        .sessao-info { font-size: 0.8rem; color: #94a3b8; display: flex; flex-direction: column; gap: 2px; }
        .sessao-assets-count { font-size: 0.75rem; color: #cbd5e1; margin-top: 5px; font-style: italic; }
        .btn-play-vtt { background: #fbbf24; color: #000; border: none; padding: 8px; font-weight: bold; cursor: pointer; flex: 2; transition: 0.2s; }
        .btn-play-vtt:hover { background: #f59e0b; box-shadow: 0 0 10px rgba(251, 191, 36, 0.4); }
        .empty-instancia { text-align: center; color: #475569; padding: 20px; font-style: italic; border: 2px dashed #334155; border-radius: 8px; }

        /* MODAIS GERAIS */
        .ff-modal-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .ff-modal-scrollable { background: #0f172a; border: 1px solid #fbbf24; width: 600px; max-width: 95vw; max-height: 90vh; overflow-y: auto; padding: 25px; border-radius: 8px; box-shadow: 0 0 30px rgba(0,0,0,0.8); }
        .modal-title-ff { color: #fbbf24; text-align: center; border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 20px; letter-spacing: 2px; font-size: 1.5rem; }
        .modal-input-group { margin-bottom: 15px; }
        .modal-input-group label { display: block; color: #94a3b8; font-size: 0.8rem; margin-bottom: 5px; font-weight: bold; }
        .modal-input-group input, .modal-input-group textarea, .modal-input-group select { width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 10px; font-family: 'Lato', sans-serif; border-radius: 4px; outline: none; }
        .modal-input-group input:focus, .modal-input-group textarea:focus { border-color: #fbbf24; }
        .tall-area-dark { min-height: 100px; resize: vertical; }
        .row-double-ff { display: flex; gap: 15px; margin-bottom: 15px; }
        .field-group { flex: 1; }
        .field-group input, .field-group select { width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; color: #fff; border-radius: 4px; }
        
        .btn-group-ff { display: flex; gap: 10px; margin-top: 20px; }
        .btn-forjar-main { flex: 1; background: #fbbf24; color: #000; border: none; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: 'Cinzel', serif; letter-spacing: 1px; }
        .btn-forjar-main:hover { background: #f59e0b; }
        .btn-cancelar-main { flex: 1; background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: 'Cinzel', serif; }
        .btn-cancelar-main:hover { border-color: #fff; color: #fff; }

        .ff-add-btn { background: transparent; border: 1px dashed #fbbf24; color: #fbbf24; padding: 5px 15px; cursor: pointer; font-size: 0.8rem; font-weight: bold; transition: 0.2s; }
        .ff-add-btn:hover { background: rgba(251, 191, 36, 0.1); }
        .ff-add-btn-gold-small { background: transparent; border: 1px dashed #00f2ff; color: #00f2ff; padding: 5px 10px; cursor: pointer; font-size: 0.7rem; font-weight: bold; }
        .ff-add-btn-gold-small:hover { background: rgba(0, 242, 255, 0.1); }

        /* UPLOAD SECTION (SESSÃO) */
        .upload-section-box { border: 1px solid #334155; padding: 15px; border-radius: 4px; margin-top: 20px; background: rgba(0,0,0,0.2); }
        .upload-section-title { font-size: 0.9rem; color: #fbbf24; margin-bottom: 10px; text-transform: uppercase; border-bottom: 1px solid #334155; padding-bottom: 5px; }
        .link-import-row { display: flex; gap: 10px; margin-bottom: 10px; }
        .ff-input-dark { flex: 1; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 8px; border-radius: 4px; outline: none; }
        .ff-select-dark { background: #1e293b; border: 1px solid #334155; color: #fff; padding: 8px; border-radius: 4px; outline: none; }
        .small-select { width: 120px; }
        .assets-lists { display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; }
        .asset-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; color: #ccc; }
        .truncate-link { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; }
        .btn-remove-x { background: transparent; border: none; color: #f44; cursor: pointer; font-weight: bold; }

        /* SELEÇÃO DE JOGADORES */
        .player-selector-box-fixed { margin: 15px 0; }
        .destinatarios-grid-fixed { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-height: 150px; overflow-y: auto; background: #020617; padding: 10px; border: 1px solid #334155; border-radius: 4px; }
        .chip-label-ff { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #94a3b8; cursor: pointer; padding: 5px; border: 1px solid transparent; border-radius: 4px; transition: 0.2s; }
        .chip-label-ff:hover { background: rgba(255,255,255,0.05); }
        .chip-label-ff input { width: auto; margin: 0; }

        /* PAPIRO REAL (FIXED & IMPROVED) */
        .papiro-overlay-full { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .papiro-real-container { width: 800px; max-width: 95vw; height: 85vh; background-size: 100% 100%; position: relative; padding: 100px 90px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; color: #3e2723; font-family: 'Cinzel', serif; text-shadow: 0 1px 0 rgba(255,255,255,0.5); }
        .sanchez-oval-view-no-border { width: 80px; height: 80px; border-radius: 50%; background-size: cover; border: 4px solid #8d6e63; margin-bottom: 20px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .papiro-title-real { font-size: 2.5rem; margin: 0; border-bottom: 2px solid #5d4037; padding-bottom: 10px; width: 100%; text-align: center; }
        .papiro-mestre-sub { font-size: 0.9rem; font-style: italic; color: #5d4037; margin-bottom: 30px; }
        .papiro-body-real { font-size: 1.2rem; line-height: 1.8; text-align: justify; overflow-y: auto; width: 100%; flex: 1; padding-right: 15px; font-family: 'Lato', serif; font-weight: 600; }
        .papiro-close-btn { margin-top: 20px; background: transparent; color: #d7ccc8; border: 2px solid #5d4037; color: #5d4037; padding: 10px 40px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: 'Cinzel', serif; font-size: 1.1rem; }
        .papiro-close-btn:hover { background: #5d4037; color: #fff; }
        .papiro-body-real::-webkit-scrollbar { width: 8px; }
        .papiro-body-real::-webkit-scrollbar-thumb { background: #8d6e63; border-radius: 4px; }

        /* DETALHES MISSÃO (MODERN DARK) */
        .detail-view-main { width: 800px; height: 600px; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; border: 2px solid #fbbf24; border-radius: 8px; }
        .detail-header-modern { background: linear-gradient(90deg, #1e293b, #0f172a); padding: 20px; border-bottom: 1px solid #334155; display: flex; gap: 20px; align-items: center; }
        .detail-rank-badge { font-size: 3rem; font-weight: 900; color: rgba(255,255,255,0.1); text-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
        .detail-rank-badge.rank-S, .detail-rank-badge.rank-SS { color: #fbbf24; opacity: 1; }
        .detail-title-col h2 { margin: 0; font-size: 2rem; color: #f1f5f9; letter-spacing: 2px; }
        .detail-narrator { color: #00f2ff; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
        .detail-body-grid { flex: 1; overflow-y: auto; padding: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .detail-info-row { grid-column: 1 / -1; display: flex; gap: 40px; border-bottom: 1px solid #334155; padding-bottom: 20px; }
        .info-item label { color: #fbbf24; font-size: 0.7rem; font-weight: bold; display: block; margin-bottom: 5px; }
        .info-item span { color: #fff; font-size: 1.1rem; }
        .detail-section { margin-bottom: 10px; }
        .section-label { display: block; color: #94a3b8; font-size: 0.75rem; font-weight: bold; margin-bottom: 8px; border-left: 3px solid #fbbf24; padding-left: 8px; }
        .section-text { color: #cbd5e1; line-height: 1.6; font-size: 0.95rem; white-space: pre-wrap; }
        .reward-section { grid-column: 1 / -1; background: rgba(251, 191, 36, 0.05); padding: 15px; border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 6px; }
        .reward-content-box { display: flex; justify-content: space-between; align-items: center; }
        .gil-display-row { font-size: 1.5rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px; }
        .gil-value { color: #fcd34d; }
        .extra-rewards-list { text-align: right; color: #fbbf24; font-size: 0.9rem; font-style: italic; }
        .ff-final-close-btn { width: 100%; padding: 20px; background: #020617; color: #fff; border: none; border-top: 1px solid #334155; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.2s; letter-spacing: 2px; }
        .ff-final-close-btn:hover { background: #fbbf24; color: #000; }

        /* LIGHTBOX */
        .lightbox-wrap { position: relative; max-width: 90vw; max-height: 90vh; }
        .cartaz-full-view { max-width: 100%; max-height: 90vh; border: 3px solid #ffcc00; box-shadow: 0 0 50px #000; }
        .close-lightbox { position: absolute; top: -40px; right: -40px; background: transparent; border: none; color: #fff; font-size: 40px; cursor: pointer; }
        
        /* BOTÃO FLUTUANTE DE FICHAS */
        .fichas-trigger-btn { position: fixed; bottom: 30px; right: 190px; width: 70px; height: 70px; border-radius: 50%; border: 2px solid #00f2ff; background: #000; cursor: pointer; z-index: 9999; transition: transform 0.2s, box-shadow 0.2s; padding: 0; display: flex; align-items: center; justify-content: center; }
        .fichas-trigger-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #00f2ff; }
        .fichas-trigger-btn img { width: 70%; height: 70%; object-fit: contain; }

        /* LISTA DE FICHAS */
        .ficha-list-item { display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 15px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #334155; }
        .ficha-row-name strong { display: block; color: #fff; font-size: 1.1rem; }
        .ficha-row-name small { color: #94a3b8; }
        .btn-cyan { padding: 8px 15px; font-size: 0.8rem; }
      `}</style>
    </div>
  );
}