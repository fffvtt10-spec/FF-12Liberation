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
  const [loading, setLoading] = useState(true);

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
  
  // --- ATUALIZAÇÃO: CATEGORIAS ESPECÍFICAS PARA OS BOTÕES ---
  const [sessionForm, setSessionForm] = useState({
    missaoId: '', 
    dataInicio: '', 
    mapas: [],      // Tabletop
    cenarios: [],   // Cenários
    monstros: [],   // Monstros (Combate)
    jogadores: []   // Tokens Jogadores
  });
  const [tempLink, setTempLink] = useState("");
  const [tempType, setTempType] = useState("mapas"); // Default selection

  const [mestreIdentidade, setMestreIdentidade] = useState(() => {
    return localStorage.getItem('mestreAssinatura') || "Narrador";
  });

  useEffect(() => {
    localStorage.setItem('mestreAssinatura', mestreIdentidade);
  }, [mestreIdentidade]);

  // --- 1. AUTH & LOADING FIX ---
  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();

    const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
            setCurrentUser(user);
            setLoading(false); 
        } else {
            setLoading(false);
            navigate('/login'); 
        }
    });

    return () => unsub();
  }, [navigate]);

  // --- 2. DADOS (Assíncrono) ---
  useEffect(() => {
    if (!currentUser) return;

    // Queries com tratamento de erro no snapshot para evitar "sumiço" silencioso
    const qM = query(collection(db, "missoes"), where("mestreId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const qR = query(collection(db, "resenhas"), where("mestreId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const qS = query(collection(db, "sessoes"), where("mestreId", "==", currentUser.uid), orderBy("dataInicio", "asc"));
    const qC = query(collection(db, "characters"));

    const unsubM = onSnapshot(qM, 
      (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => console.error("Erro ao carregar Missões (Verifique Índices no Console):", error)
    );
    
    const unsubR = onSnapshot(qR, 
      (snap) => setResenhas(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => console.error("Erro ao carregar Resenhas:", error)
    );

    const unsubS = onSnapshot(qS, 
      (snap) => setSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => console.error("Erro ao carregar Sessões:", error)
    );

    const unsubC = onSnapshot(qC, 
      (snap) => setPersonagensDb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (error) => console.error("Erro ao carregar Personagens:", error)
    );

    return () => {
        unsubM(); unsubR(); unsubS(); unsubC();
    };
  }, [currentUser]); 

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
      const expiraEm = new Date(); expiraEm.setDate(expiraEm.getDate() + 1); 
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
      // Adiciona na array correta baseada na seleção
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
            
            // Novos Campos
            mapas: sessionForm.mapas,
            cenarios: sessionForm.cenarios,
            monstros: sessionForm.monstros,
            jogadores: sessionForm.jogadores,

            connected_players: [],
            dm_online: false,
            createdAt: serverTimestamp()
        });
        setShowSessionModal(false);
        setSessionForm({ missaoId: '', dataInicio: '', mapas: [], cenarios: [], monstros: [], jogadores: [] });
        setSessaoDestinatarios([]);
        alert("Sessão criada com sucesso!");
      } catch (err) {
          alert("Erro ao criar sessão: " + err.message);
      }
  };

  const enterVTT = (sessao) => {
      navigate('/mestre-vtt');
  };

  if (loading) {
    return (
      <div className="ether-loading">
          <div className="loading-blur-bg"></div>
          <div className="loading-content">
          <img src={chocoboGif} alt="Carregando..." className="chocobo-anim" />
          <div className="loading-bar"><div className="loading-fill"></div></div>
          <p>CARREGANDO DADOS DO MESTRE...</p>
          </div>
          <style>{`
          .ether-loading { height: 100vh; width: 100vw; background: #000; display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; z-index: 9999; }
          .loading-blur-bg { position: absolute; width: 100%; height: 100%; background: radial-gradient(circle, #001a33 0%, #000 100%); filter: blur(40px); animation: pulseBlur 2s infinite alternate; }
          .loading-content { position: relative; z-index: 10; text-align: center; }
          .chocobo-anim { width: 120px; filter: drop-shadow(0 0 10px #ffcc00); margin-bottom: 20px; }
          .loading-bar { width: 200px; height: 2px; background: rgba(255, 255, 255, 0.1); margin: 0 auto 15px auto; border-radius: 10px; overflow: hidden; }
          .loading-fill { height: 100%; width: 0%; background: #ffcc00; box-shadow: 0 0 10px #ffcc00; animation: fillProgress 1s ease-in-out forwards; }
          p { color: #ffcc00; font-family: 'serif'; font-size: 10px; letter-spacing: 3px; animation: fadeText 1s infinite alternate; }
          @keyframes fillProgress { from { width: 0%; } to { width: 100%; } }
          @keyframes pulseBlur { from { opacity: 0.5; } to { opacity: 0.8; } }
          @keyframes fadeText { from { opacity: 0.4; } to { opacity: 1; } }
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
              <h3>RESENHA DO SANCHEZ</h3>
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
                              {/* SELETOR DE CATEGORIA */}
                              <select 
                                className="ff-select-dark small-select" 
                                value={tempType} 
                                onChange={e => setTempType(e.target.value)}
                              >
                                <option value="mapas">Tabletop</option>
                                <option value="cenarios">Cenário</option>
                                <option value="monstros">Monstros</option>
                                <option value="jogadores">Jogadores</option>
                              </select>
                              <button type="button" className="btn-cyan" onClick={handleAddAsset}>+</button>
                          </div>
                          <div className="assets-lists">
                              {sessionForm.mapas.map((link, i) => (<div key={`map-${i}`} className="asset-item"><span className="truncate-link">[TABLETOP] {link}</span><button type="button" className="btn-remove-x" onClick={() => handleRemoveAsset('mapas', i)}>×</button></div>))}
                              {sessionForm.cenarios.map((link, i) => (<div key={`cen-${i}`} className="asset-item"><span className="truncate-link">[CENÁRIO] {link}</span><button type="button" className="btn-remove-x" onClick={() => handleRemoveAsset('cenarios', i)}>×</button></div>))}
                              {sessionForm.monstros.map((link, i) => (<div key={`mon-${i}`} className="asset-item"><span className="truncate-link">[MONSTRO] {link}</span><button type="button" className="btn-remove-x" onClick={() => handleRemoveAsset('monstros', i)}>×</button></div>))}
                              {sessionForm.jogadores.map((link, i) => (<div key={`jog-${i}`} className="asset-item"><span className="truncate-link">[JOGADOR] {link}</span><button type="button" className="btn-remove-x" onClick={() => handleRemoveAsset('jogadores', i)}>×</button></div>))}
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
                            <div style={{
                                width: `${Math.min(((showDetails.candidatos?.length || 0) / (parseInt(showDetails.grupo) || 1)) * 100, 100)}%`, 
                                height:'100%', 
                                background: (showDetails.candidatos?.length >= parseInt(showDetails.grupo)) ? '#f44' : '#00f2ff'
                            }}></div>
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
              <div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: viewResenha.conteudo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></div>
              <div className="papiro-dest-list"><strong>ENVIADO PARA:</strong> {viewResenha.destinatarios?.join(", ")}</div>
              <button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button>
           </div>
        </div>
      )}

      <div className="master-floating-group">
          <Forja /> 
          <Bazar isMestre={true} />
          <button className="fichas-trigger-btn" onClick={() => setShowFichasList(true)} title="Gerenciar Fichas">
            <img src={fichaIcon} alt="Fichas" onError={(e) => {e.target.style.display='none'; e.target.parentNode.innerText='FICHAS'}} />
          </button>
      </div>

      <style>{`
        /* ESTILOS MANTIDOS + NOVOS */
        .mestre-container { background: #000; min-height: 100vh; position: relative; color: #fff; font-family: 'serif'; overflow: hidden; }
        .mestre-bg-image-full { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center top; background-repeat: no-repeat; opacity: 0.35; z-index: 0; filter: contrast(125%) brightness(75%); }
        .mestre-content { position: relative; z-index: 1; padding: 20px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        
        .top-bar-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .ff-title { color: #ffcc00; text-shadow: 0 0 10px #ffcc00; letter-spacing: 5px; font-size: 2rem; margin: 0; }
        .mestre-identity-box { display: flex; align-items: center; gap: 10px; border: 1px solid #ffcc00; padding: 8px 15px; background: rgba(0, 10, 30, 0.9); }
        .mestre-identity-box input { background: #fff; border: 1px solid #ffcc00; color: #000; padding: 5px 10px; font-weight: bold; font-family: 'serif'; outline: none; }

        /* GRID RESPONSIVO TELA ÚNICA */
        .mestre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; flex: 1; overflow: hidden; padding-bottom: 60px; /* Espaço para botões flutuantes */ }
        
        /* CARDS TELA ÚNICA */
        .ff-card { background: rgba(0, 10, 30, 0.95); border: 1px solid #ffcc00; padding: 15px; border-radius: 4px; backdrop-filter: blur(10px); display: flex; flex-direction: column; max-height: 100%; }
        .board-column { flex: 1; overflow: hidden; min-height: 0; }
        
        .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px; flex-shrink: 0; }
        .card-header.no-border { border-bottom: none; }
        
        .mission-scroll { flex: 1; overflow-y: auto; padding-right: 5px; scrollbar-width: thin; scrollbar-color: #ffcc00 #000; }
        .mission-scroll::-webkit-scrollbar { width: 6px; }
        .mission-scroll::-webkit-scrollbar-thumb { background: #ffcc00; }

        .mission-poster { background: rgba(255,255,255,0.04); border: 1px solid #444; margin-bottom: 15px; padding: 18px; border-left: 4px solid #00f2ff; position: relative; }
        .poster-rank-label-fixed { position: absolute; top: 12px; right: 18px; font-size: 32px; color: #ffcc00; opacity: 0.35; font-weight: bold; }
        .mestre-tag { color: #ffcc00; font-size: 10px; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 8px; }
        .candidates-mini-box { margin-top: 8px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 3px; }
        .cand-row-master { display: flex; justify-content: space-between; align-items: center; font-size: 10px; margin-bottom: 2px; }
        .btn-kick-x { background: transparent; border: none; color: #f44; cursor: pointer; font-weight: bold; font-size: 12px; }
        .btn-kick-x:hover { color: #fff; }

        /* VAGAS VISUAL */
        .vagas-container { margin: 10px 0; }
        .vagas-labels { display: flex; justify-content: space-between; font-size: 10px; color: #ccc; margin-bottom: 2px; font-weight: bold; }
        .vagas-track { width: 100%; height: 6px; background: #111; border: 1px solid #444; border-radius: 3px; overflow: hidden; }
        .vagas-fill { height: 100%; transition: width 0.3s; }

        .sanchez-card { position: relative; overflow: hidden; }
        .sanchez-header-top { position: relative; z-index: 1; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; flex-shrink: 0; }
        .sanchez-header-top.no-border { border-bottom: none; }
        .resenha-item-card { background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 15px; margin-top: 12px; border-radius: 4px; }
        .sessao-card { background: linear-gradient(135deg, rgba(20,20,50,0.9), rgba(0,0,20,0.9)); border: 1px solid #00f2ff; padding: 15px; margin-bottom: 15px; border-radius: 4px; box-shadow: 0 0 10px rgba(0,242,255,0.1); }
        .sessao-status { font-size: 10px; color: #f44; font-weight: bold; margin-bottom: 8px; animation: pulse 2s infinite; }
        .sessao-title { color: #fff; font-size: 18px; margin: 0 0 10px 0; border-bottom: 1px solid #333; padding-bottom: 8px; }
        .sessao-info { display: flex; justify-content: space-between; font-size: 12px; color: #aaa; margin-bottom: 10px; }
        .sessao-assets-count { font-size: 11px; color: #ffcc00; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 3px; display: inline-block; }
        .btn-play-vtt { background: #00f2ff; color: #000; border: none; padding: 8px 15px; font-weight: bold; cursor: pointer; flex: 1; margin-right: 10px; transition: 0.3s; }
        .btn-play-vtt:hover { background: #fff; box-shadow: 0 0 15px #00f2ff; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .upload-section-box { border: 1px dashed #444; padding: 15px; margin: 20px 0; background: rgba(0,0,0,0.3); }
        .upload-section-title { color: #00f2ff; font-size: 12px; margin-bottom: 15px; border-bottom: 1px solid #00f2ff; padding-bottom: 5px; display: inline-block; }
        .ff-select-dark { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 12px; outline: none; font-family: 'serif'; }
        .ff-input-dark { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 12px; outline: none; font-family: 'serif'; color-scheme: dark; }
        .link-import-row { display: flex; gap: 10px; margin-bottom: 15px; }
        .small-select { width: 120px; }
        .assets-lists { display: flex; flex-direction: column; gap: 10px; }
        .asset-group { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 4px; }
        .asset-group label { display: block; color: #ffcc00; font-size: 10px; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #333; }
        .asset-item { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #ddd; margin-bottom: 4px; }
        .truncate-link { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px; }
        .btn-remove-x { background: transparent; border: none; color: #f44; font-weight: bold; cursor: pointer; font-size: 14px; }
        .ff-modal-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.94); z-index: 99999; display: flex; align-items: center; justify-content: center; }
        .ff-modal-scrollable { width: 550px; max-height: 90vh; overflow-y: auto; background: #000c1d; border: 2px solid #ffcc00; padding: 35px; box-shadow: 0 0 60px rgba(0,0,0,0.9); }
        .modal-title-ff { color: #fff; font-size: 22px; border-bottom: 1px solid #ffcc00; padding-bottom: 10px; margin-bottom: 20px; letter-spacing: 2px; }
        .modal-input-group { margin-bottom: 20px; }
        .modal-input-group label { color: #ffcc00; font-size: 11px; display: block; margin-bottom: 8px; font-weight: bold; letter-spacing: 1px; }
        .modal-input-group input { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 12px; outline: none; font-family: 'serif'; font-size: 14px; }
        .row-double-ff { display: flex; gap: 20px; margin-bottom: 20px; }
        .field-group { flex: 1; display: flex; flex-direction: column; }
        .field-group label { color: #ffcc00; font-size: 11px; display: block; margin-bottom: 8px; font-weight: bold; }
        .field-group input, .field-group select { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 12px; font-family: 'serif'; outline: none; }
        .tall-area-dark { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 12px; height: 110px; resize: none; font-family: 'serif'; outline: none; }
        .tall-area-ff-dark { width: 100%; background: #000; border: 1px solid #ffcc00; color: #fff; padding: 15px; height: 250px; resize: none; font-family: 'serif'; outline: none; font-size: 16px; border-radius: 4px; }
        .detail-view-main { width: 600px; background: #000814; border: 1px solid #ffcc00; padding: 0; box-shadow: 0 0 40px rgba(255, 204, 0, 0.1); overflow: hidden; display: flex; flex-direction: column; }
        .detail-header-modern { background: linear-gradient(90deg, #1a1a1a 0%, #000 100%); padding: 25px 30px; display: flex; align-items: center; border-bottom: 1px solid #333; gap: 20px; }
        .detail-rank-badge { font-size: 32px; font-weight: bold; color: #ffcc00; text-shadow: 0 0 10px rgba(255,204,0,0.5); border: 2px solid #ffcc00; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(0,0,0,0.5); }
        .detail-title-col h2 { margin: 0; font-size: 24px; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        .detail-narrator { color: #00f2ff; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 4px; display: block; }
        .detail-body-grid { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .detail-info-row { display: flex; gap: 25px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 15px; }
        .info-item { flex: 1; }
        .info-item label { color: #ffcc00; font-size: 10px; display: block; margin-bottom: 5px; font-weight: bold; opacity: 0.8; }
        .info-item span { color: #fff; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }
        .detail-section { margin-bottom: 5px; }
        .section-label { color: #ffcc00; font-size: 11px; font-weight: bold; display: block; margin-bottom: 8px; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .section-text { font-size: 15px; line-height: 1.5; color: #ddd; margin: 0; white-space: pre-wrap; }
        .reward-section { margin-top: 10px; background: rgba(255,204,0,0.05); padding: 15px; border-radius: 4px; border: 1px solid rgba(255,204,0,0.2); }
        .gil-display-row { display: flex; align-items: center; gap: 10px; font-size: 18px; color: #ffcc00; font-weight: bold; margin-bottom: 8px; }
        .extra-rewards-list { margin-top: 8px; padding-left: 5px; }
        .reward-item { color: #aaa; font-size: 14px; margin-bottom: 4px; font-style: italic; }
        .ff-final-close-btn { width: 100%; background: #111; color: #fff; border: none; border-top: 1px solid #333; padding: 20px; font-weight: bold; cursor: pointer; font-size: 13px; text-transform: uppercase; transition: 0.2s; }
        .ff-final-close-btn:hover { background: #222; color: #ffcc00; }
        .papiro-overlay-full { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; align-items: center; justify-content: center; }
        .papiro-real-container { width: 1000px; height: 800px; max-width: 95vw; max-height: 95vh; background-size: 100% 100%; background-repeat: no-repeat; padding: 110px 160px; color: #3b2b1a; position: relative; display: flex; flex-direction: column; }
        .sanchez-oval-view-no-border { width: 110px; height: 110px; float: right; border-radius: 50%; background-size: cover; margin-left: 20px; mask-image: radial-gradient(circle, black 60%, transparent 100%); -webkit-mask-image: radial-gradient(circle, black 60%, transparent 100%); opacity: 0.9; }
        .papiro-title-real { border-bottom: 2px solid #3b2b1a; padding-bottom: 5px; margin-top: 0; font-size: 32px; font-weight: bold; }
        .papiro-mestre-sub { font-size: 14px; font-style: italic; opacity: 0.8; margin-top: 5px; }
        .papiro-body-real { margin-top: 25px; flex: 1; overflow-y: auto; line-height: 1.6; font-size: 18px; padding-right: 10px; scrollbar-width: none; -ms-overflow-style: none; }
        .papiro-body-real::-webkit-scrollbar { display: none; }
        .papiro-dest-list { margin-top: 15px; font-size: 14px; border-top: 1px solid rgba(59, 43, 26, 0.3); padding-top: 10px; }
        .papiro-close-btn { position: absolute; bottom: 45px; right: 110px; background: #3b2b1a; color: #f4e4bc; border: none; padding: 8px 20px; cursor: pointer; font-weight: bold; font-size: 13px; border-radius: 2px; }
        .ff-add-btn { background: transparent; border: 1px solid #00f2ff; color: #00f2ff; padding: 10px 20px; cursor: pointer; font-weight: bold; font-size: 12px; }
        .ff-add-btn-gold-small { background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 8px 15px; cursor: pointer; font-weight: bold; font-size: 11px; transition: 0.3s; }
        .ff-add-btn-gold-small:hover { background: #ffcc00; color: #000; box-shadow: 0 0 15px #ffcc00; }
        .btn-cyan { border: 1px solid #00f2ff; color: #00f2ff; padding: 6px 15px; background: transparent; cursor: pointer; font-size: 11px; margin-right: 10px; font-weight: bold; }
        .btn-red { border: 1px solid #f44; color: #f44; padding: 6px 15px; background: transparent; cursor: pointer; font-size: 11px; font-weight: bold; }
        .btn-group-ff { display: flex; gap: 20px; margin-top: 25px; }
        .btn-forjar-main { flex: 1; background: #ffcc00; color: #000; border: none; padding: 14px; font-weight: bold; cursor: pointer; font-size: 14px; text-transform: uppercase; }
        /* CORREÇÃO DO CSS: Renomeado de btn-cancel-main para btn-cancelar-main para bater com o JSX */
        .btn-cancelar-main { flex: 1; background: #000; color: #fff; border: 1px solid #fff; padding: 14px; cursor: pointer; text-align: center; font-size: 14px; text-transform: uppercase; }
        .player-selector-box-fixed { margin: 25px 0; border-top: 1px solid #333; padding-top: 15px; }
        .destinatarios-grid-fixed { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
        .chip-label-ff { background: rgba(0, 10, 30, 0.8); border: 1px solid #ffcc00; color: #ffcc00; padding: 8px 18px; border-radius: 4px; font-size: 12px; cursor: pointer; display: inline-block; }
        .mission-timer { font-size: 12px; color: #00f2ff; display: block; margin-top: 10px; font-weight: bold; letter-spacing: 1px; }
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .lightbox-wrap { position: relative; max-width: 90vw; max-height: 90vh; }
        .cartaz-full-view { max-width: 100%; max-height: 90vh; border: 3px solid #ffcc00; box-shadow: 0 0 50px #000; }
        .close-lightbox { position: absolute; top: -40px; right: -40px; background: transparent; border: none; color: #fff; font-size: 40px; cursor: pointer; }
        
        /* BOTÃO FLUTUANTE DE FICHAS */
        .fichas-trigger-btn { position: fixed; bottom: 30px; right: 190px; width: 70px; height: 70px; border-radius: 50%; border: 2px solid #00f2ff; background: #000; cursor: pointer; z-index: 9999; transition: transform 0.2s, box-shadow 0.2s; padding: 0; display: flex; align-items: center; justify-content: center; }
        .fichas-trigger-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #00f2ff; }
        .fichas-trigger-btn img { width: 70%; height: 70%; object-fit: contain; }

        /* LISTA DE FICHAS */
        .ficha-list-item { display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.5); border: 1px solid #333; padding: 15px; cursor: pointer; transition: 0.2s; border-radius: 4px; width: 100%; }
        .ficha-list-item:hover { border-color: #00f2ff; background: rgba(0, 242, 255, 0.1); }
        .ficha-row-name { display: flex; flex-direction: column; flex: 1; margin-right: 15px; }
        .ficha-row-name strong { color: #fff; font-size: 16px; }
        .ficha-row-name small { color: #aaa; font-size: 12px; }
      `}</style>
    </div>
  );
}