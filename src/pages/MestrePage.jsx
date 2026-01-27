import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 
import sanchezImg from '../assets/sanchez.jpeg'; 
import papiroImg from '../assets/papiro.png'; // Imagem solicitada

// --- COMPONENTE DE CRONÔMETRO ---
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
  // Estados para Missões e Modais
  const [missoes, setMissoes] = useState([]);
  const [resenhas, setResenhas] = useState([]); // Lista de resenhas salvas
  const [showModal, setShowModal] = useState(false);
  const [showResenhaModal, setShowResenhaModal] = useState(false); // Modal de criação
  const [showDetails, setShowDetails] = useState(null);
  const [viewResenha, setViewResenha] = useState(null); // Visualização no papiro
  const [viewImage, setViewImage] = useState(null);
  
  // Estados para Resenha do Sanches
  const [resenha, setResenha] = useState("");
  const [tituloResenha, setTituloResenha] = useState("");

  // --- PERSISTÊNCIA DA ASSINATURA (LOCAL STORAGE) ---
  const [mestreIdentidade, setMestreIdentidade] = useState(() => {
    const salva = localStorage.getItem('mestreAssinatura');
    return salva || auth.currentUser?.email?.split('@')[0] || "Narrador";
  });

  useEffect(() => {
    localStorage.setItem('mestreAssinatura', mestreIdentidade);
  }, [mestreIdentidade]);

  // Personagens Disponíveis
  const personagensDisponiveis = ["Cloud Strife", "Tifa Lockhart", "Barret Wallace", "Aerith Gainsborough"];
  const [destinatarios, setDestinatarios] = useState([]);

  // Formulário da Missão
  const [form, setForm] = useState({
    nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: ''
  });

  // --- BUSCA DE DADOS EM TEMPO REAL ---
  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();
    if (!auth.currentUser) return;

    // Listener Missões
    const qM = query(collection(db, "missoes"), where("mestreId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const unsubM = onSnapshot(qM, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // Listener Resenhas
    const qR = query(collection(db, "resenhas"), where("mestreId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const unsubR = onSnapshot(qR, (snap) => setResenhas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubM(); unsubR(); };
  }, []);

  const parseDuration = (str) => {
    const weeks = (str.match(/(\d+)w/) || [0, 0])[1] * 604800000;
    const days = (str.match(/(\d+)d/) || [0, 0])[1] * 86400000;
    const hours = (str.match(/(\d+)h/) || [0, 0])[1] * 3600000;
    return weeks + days + hours || 3600000;
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      const msToAdd = parseDuration(form.duracao);
      const expiraEm = new Date(Date.now() + msToAdd);
      await addDoc(collection(db, "missoes"), {
        ...form, mestreNome: mestreIdentidade, mestreId: auth.currentUser.uid, createdAt: serverTimestamp(), expiraEm: expiraEm.toISOString()
      });
      setShowModal(false);
      setForm({ nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: '' });
    } catch (err) { alert("Erro ao forjar cartaz."); }
  };

  const publicarResenha = async () => {
    if (!tituloResenha || !resenha) return alert("Título e texto são obrigatórios!");
    try {
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 1); // Dura exatamente 1 dia
      await addDoc(collection(db, "resenhas"), {
        titulo: tituloResenha,
        conteudo: resenha,
        mestre: mestreIdentidade,
        mestreId: auth.currentUser.uid,
        destinatarios,
        createdAt: serverTimestamp(),
        expiraEm: expiraEm.toISOString()
      });
      setShowResenhaModal(false);
      setResenha(""); setTituloResenha(""); setDestinatarios([]);
    } catch (e) { alert("Erro ao publicar."); }
  };

  const renderFormattedText = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/\n/g, '<br/>');
  };

  return (
    <div className="mestre-container">
      <div className="mestre-bg-image"></div>
      <div className="ether-vortex-gold"></div>
      
      <div className="mestre-content">
        <h1 className="ff-title">HUB DO NARRADOR</h1>

        <div className="mestre-identity-box ff-card fade-in">
          <label>ASSINATURA DO MESTRE:</label>
          <input type="text" value={mestreIdentidade} onChange={(e) => setMestreIdentidade(e.target.value)} />
        </div>
        
        <div className="mestre-grid">
          {/* COLUNA 1: QUADRO DE MISSÕES */}
          <div className="ff-card fade-in">
            <div className="card-header">
              <h3>QUADRO DE MISSÕES</h3>
              <button className="ff-add-btn" onClick={() => setShowModal(true)}><span>+</span> ADICIONAR CARTAZ</button>
            </div>
            <div className="mission-scroll">
              {missoes.map(m => (
                <div key={m.id} className={`mission-poster rank-${m.rank}`}>
                  <div className="poster-rank">{m.rank}</div>
                  <span className="mestre-tag">Narrador: {m.mestreNome}</span>
                  <h4>{m.nome}</h4>
                  <p className="gil-recompensa">💰 Recompensa: {m.gilRecompensa || 0} Gil</p>
                  <Timer expiry={m.expiraEm} />
                  <div className="poster-actions">
                    <button className="btn-cyan" onClick={() => setViewImage(m.imagem)}>CARTAZ</button>
                    <button className="btn-cyan" onClick={() => setShowDetails(m)}>DETALHES</button>
                    <button className="btn-red" onClick={() => deleteDoc(doc(db, "missoes", m.id))}>EXCLUIR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUNA 2: RESENHA DO SANCHES - REFORMULADO */}
          <div className="ff-card fade-in sanchez-card">
            <div className="sanchez-fade-portrait" style={{backgroundImage: `url(${sanchezImg})`}}></div>
            <div className="sanchez-header">
              <h3>RESENHA DO SANCHES</h3>
              <button className="ff-add-btn-gold" onClick={() => setShowResenhaModal(true)}>+ CRIAR NOVA RESENHA</button>
            </div>
            
            <div className="mission-scroll">
              {resenhas.map(r => (
                <div key={r.id} className="resenha-item-card">
                  <div className="resenha-info">
                    <h4>{r.titulo}</h4>
                    <Timer expiry={r.expiraEm} />
                  </div>
                  <div className="poster-actions">
                    <button className="btn-cyan" onClick={() => setViewResenha(r)}>VISUALIZAR</button>
                    <button className="btn-red" onClick={() => deleteDoc(doc(db, "resenhas", r.id))}>EXCLUIR</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUNA 3: SESSÕES */}
          <div className="ff-card fade-in">
            <div className="card-header">
              <h3>SESSÕES DE JOGO</h3>
              <button className="ff-add-btn small-btn">INICIAR NOVA SESSÃO</button>
            </div>
            <div className="empty-instancia">NENHUMA INSTÂNCIA ATIVA</div>
          </div>
        </div>
      </div>

      {/* MODAL CRIAÇÃO RESENHA */}
      {showResenhaModal && (
        <div className="ff-modal-overlay">
          <div className="ff-modal ff-card">
            <h3 className="modal-title">ESCREVER CRÔNICA</h3>
            <input 
              className="ff-modal-input-dark" 
              placeholder="Título da Crônica..." 
              value={tituloResenha} 
              onChange={(e)=>setTituloResenha(e.target.value)} 
            />
            <textarea 
              className="tall-area-white"
              placeholder="Use **texto** para negrito..." 
              value={resenha} 
              onChange={(e) => setResenha(e.target.value)}
            />
            
            <div className="player-selector-box">
              <label>DESTINATÁRIOS:</label>
              <div className="destinatarios-grid">
                {personagensDisponiveis.map(p => (
                  <label key={p} className="chip-label">
                    <input 
                      type="checkbox" 
                      checked={destinatarios.includes(p)} 
                      onChange={() => destinatarios.includes(p) ? setDestinatarios(destinatarios.filter(x=>x!==p)) : setDestinatarios([...destinatarios, p])} 
                    /> {p}
                  </label>
                ))}
              </div>
            </div>

            <div className="btn-group">
              <button className="btn-forjar" onClick={publicarResenha}>PUBLICAR</button>
              <button className="btn-cancelar" onClick={() => setShowResenhaModal(false)}>CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VISUALIZAÇÃO NO PAPIRO (IMAGEM) */}
      {viewResenha && (
        <div className="papiro-overlay-full" onClick={() => setViewResenha(null)}>
           <div className="papiro-real-container" style={{backgroundImage: `url(${papiroImg})`}} onClick={e=>e.stopPropagation()}>
              <div className="sanchez-oval-view" style={{backgroundImage: `url(${sanchezImg})`}}></div>
              <h2 className="papiro-title-real">{viewResenha.titulo}</h2>
              <p className="papiro-mestre-sub">Escrito por: {viewResenha.mestre}</p>
              <div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: renderFormattedText(viewResenha.conteudo) }}></div>
              
              <div className="papiro-dest-list">
                 <strong>ENVIADO PARA:</strong>
                 <p>{viewResenha.destinatarios.join(", ")}</p>
              </div>
              <button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button>
           </div>
        </div>
      )}

      {/* MODAIS DE MISSÃO (MANTIDOS) */}
      {showModal && (
        <div className="ff-modal-overlay">
          <div className="ff-modal ff-card">
            <h3 className="modal-title">NOVA MISSÃO</h3>
            <form onSubmit={handleCreateMission}>
              <input placeholder="Nome" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required />
              <textarea placeholder="Descrição" className="tall-area" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} />
              <textarea placeholder="Objetivos" className="tall-area" value={form.objetivo} onChange={e=>setForm({...form, objetivo: e.target.value})} />
              <div className="row">
                <input placeholder="Grupo" value={form.grupo} onChange={e=>setForm({...form, grupo: e.target.value})} />
                <select value={form.rank} onChange={e=>setForm({...form, rank: e.target.value})}>
                  {['E','D','C','B','A','S','SS','SC'].map(r => <option key={r} value={r}>RANK {r}</option>)}
                </select>
              </div>
              <textarea placeholder="Recompensas" className="tall-area" value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} />
              <div className="row">
                <input type="text" className="gil-input" placeholder="Gil" value={form.gilRecompensa} onChange={e => setForm({...form, gilRecompensa: e.target.value.replace(/\D/g, '')})} />
                <input placeholder="1w 2d 10h" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required />
              </div>
              <input placeholder="URL do Cartaz" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} />
              <div className="btn-group">
                <button type="submit" className="btn-forjar">FORJAR</button>
                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX IMAGEM */}
      {viewImage && (
        <div className="ff-image-viewer" onClick={() => setViewImage(null)}>
          <button className="close-viewer">×</button>
          <div className="image-frame"><img src={viewImage} alt="Cartaz" /></div>
        </div>
      )}

      <style>{`
        .mestre-container { background: #000; min-height: 100vh; position: relative; overflow: hidden; color: #fff; font-family: 'serif'; }
        .mestre-bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url(${fundoMestre}) no-repeat center center; background-size: cover; z-index: 0; }
        .ether-vortex-gold { position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: conic-gradient(from 0deg, transparent, rgba(255, 204, 0, 0.03), transparent); animation: rotateEther 40s linear infinite; z-index: 1; pointer-events: none; }
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .mestre-content { position: relative; z-index: 10; padding: 30px; }
        .ff-title { color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 30px; text-shadow: 0 0 10px #ffcc00; }
        .mestre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .ff-card { background: rgba(0, 10, 30, 0.95); border: 1px solid #ffcc00; padding: 20px; border-radius: 4px; backdrop-filter: blur(10px); }
        
        /* SANCHEZ PORTRAIT OVAL */
        .sanchez-card { position: relative; overflow: hidden; }
        .sanchez-fade-portrait { 
          position: absolute; top: 10px; right: 10px; width: 120px; height: 150px; 
          background-size: cover; background-position: center; border-radius: 50%;
          mask-image: radial-gradient(circle, black 40%, transparent 100%);
          opacity: 0.6; z-index: 0;
        }
        .sanchez-header { position: relative; z-index: 1; margin-bottom: 20px; }
        .resenha-item-card { background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 12px; margin-bottom: 10px; }
        .resenha-info h4 { margin: 0; color: #ffcc00; }

        /* PAPIRO REAL CONTAINER */
        .papiro-overlay-full { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 3000; display: flex; align-items: center; justify-content: center; }
        .papiro-real-container { 
          width: 600px; height: 450px; background-size: 100% 100%; padding: 60px 80px; 
          position: relative; color: #3b2b1a; box-shadow: 0 0 50px black;
        }
        .sanchez-oval-view { 
          width: 90px; height: 90px; float: right; border-radius: 50%; 
          background-size: cover; border: 2px solid #3b2b1a; margin-left: 20px;
        }
        .papiro-title-real { border-bottom: 1px solid #3b2b1a; padding-bottom: 5px; margin-top: 0; font-size: 24px; }
        .papiro-mestre-sub { font-size: 12px; font-style: italic; margin-top: -10px; }
        .papiro-body-real { margin-top: 20px; line-height: 1.5; font-size: 15px; height: 180px; overflow-y: auto; }
        .papiro-dest-list { margin-top: 20px; font-size: 11px; border-top: 1px dashed #3b2b1a; padding-top: 10px; }
        .papiro-close-btn { position: absolute; bottom: 40px; right: 80px; background: #3b2b1a; color: #f4e4bc; border: none; padding: 5px 15px; cursor: pointer; font-weight: bold; }

        /* MODAL STYLES */
        .ff-modal-input-dark { width: 100%; background: #000; border: 1px solid #ffcc00; color: #ffcc00; padding: 10px; margin-bottom: 10px; outline: none; }
        .tall-area-white { width: 100%; height: 200px; background: #fff; color: #000; padding: 15px; border-radius: 4px; resize: none; outline: none; font-family: 'serif'; }
        .player-selector-box { margin: 15px 0; border-top: 1px solid #333; padding-top: 10px; }
        .destinatarios-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .chip-label { background: rgba(255,204,0,0.1); border: 1px solid #ffcc00; padding: 4px 10px; border-radius: 20px; font-size: 11px; cursor: pointer; }

        .ff-add-btn-gold { background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 10px 20px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; transition: 0.3s; }
        .ff-add-btn-gold:hover { background: #ffcc00; color: #000; }
        
        /* MANTIDOS */
        .mission-scroll { height: 350px; overflow-y: auto; }
        .mission-poster { background: rgba(0,0,0,0.5); border: 1px solid #444; margin-bottom: 12px; padding: 12px; border-left: 3px solid #00f2ff; position: relative; }
        .poster-actions button { font-size: 8px; padding: 4px 8px; background: transparent; cursor: pointer; font-weight: bold; margin-right: 5px; }
        .btn-cyan { border: 1px solid #00f2ff; color: #00f2ff; }
        .btn-red { border: 1px solid #f44; color: #f44; }
        .tall-area { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 10px; height: 80px; resize: none; }
        .btn-forjar { flex: 1; background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; }
        .btn-cancelar { flex: 1; background: #000; color: #fff; border: 1px solid #fff; padding: 10px; cursor: pointer; }
      `}</style>
    </div>
  );
}