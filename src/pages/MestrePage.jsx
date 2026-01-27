import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 
import sanchezImg from '../assets/sanchez.jpeg'; 
import papiroImg from '../assets/papiro.png'; 

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
  // --- ESTADOS GERAIS ---
  const [missoes, setMissoes] = useState([]);
  const [resenhas, setResenhas] = useState([]); 
  const [showModal, setShowModal] = useState(false); 
  const [showResenhaModal, setShowResenhaModal] = useState(false); 
  const [showDetails, setShowDetails] = useState(null); 
  const [viewResenha, setViewResenha] = useState(null); 
  const [viewImage, setViewImage] = useState(null); 

  // --- ESTADOS DE CRIAÇÃO ---
  const [resenha, setResenha] = useState("");
  const [tituloResenha, setTituloResenha] = useState("");
  const [destinatarios, setDestinatarios] = useState([]);
  const personagensDisponiveis = ["Cloud Strife", "Tifa Lockhart", "Barret Wallace", "Aerith Gainsborough"];

  const [form, setForm] = useState({
    nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: ''
  });

  // --- PERSISTÊNCIA DA ASSINATURA ---
  const [mestreIdentidade, setMestreIdentidade] = useState(() => {
    return localStorage.getItem('mestreAssinatura') || auth.currentUser?.email?.split('@')[0] || "Narrador";
  });

  useEffect(() => {
    localStorage.setItem('mestreAssinatura', mestreIdentidade);
  }, [mestreIdentidade]);

  // --- SINCRONIZAÇÃO FIREBASE ---
  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();
    if (!auth.currentUser) return;

    const qM = query(collection(db, "missoes"), where("mestreId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const unsubM = onSnapshot(qM, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qR = query(collection(db, "resenhas"), where("mestreId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const unsubR = onSnapshot(qR, (snap) => setResenhas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubM(); unsubR(); };
  }, []);

  // --- LOGICA DE CRIAÇÃO ---
  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      const msToAdd = (form.duracao.match(/(\d+)w/) || [0, 0])[1] * 604800000 + 
                      (form.duracao.match(/(\d+)d/) || [0, 0])[1] * 86400000 + 
                      (form.duracao.match(/(\d+)h/) || [0, 0])[1] * 3600000;
      await addDoc(collection(db, "missoes"), {
        ...form, mestreNome: mestreIdentidade, mestreId: auth.currentUser.uid, createdAt: serverTimestamp(), expiraEm: new Date(Date.now() + (msToAdd || 3600000)).toISOString()
      });
      setShowModal(false);
      setForm({ nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: '' });
    } catch (err) { alert("Erro ao forjar cartaz."); }
  };

  const publicarResenha = async () => {
    if (!tituloResenha || !resenha) return alert("Preencha título e conteúdo!");
    try {
      const expiraEm = new Date(); expiraEm.setDate(expiraEm.getDate() + 1); 
      await addDoc(collection(db, "resenhas"), {
        titulo: tituloResenha, conteudo: resenha, mestre: mestreIdentidade, mestreId: auth.currentUser.uid, destinatarios, createdAt: serverTimestamp(), expiraEm: expiraEm.toISOString()
      });
      setShowResenhaModal(false); setResenha(""); setTituloResenha(""); setDestinatarios([]);
    } catch (e) { alert("Erro ao publicar."); }
  };

  return (
    <div className="mestre-container">
      <div className="mestre-bg-image"></div>
      
      <div className="mestre-content">
        <h1 className="ff-title">HUB DO NARRADOR</h1>

        <div className="mestre-identity-box ff-card">
          <label>ASSINATURA DO MESTRE:</label>
          <input type="text" value={mestreIdentidade} onChange={(e) => setMestreIdentidade(e.target.value)} />
        </div>
        
        <div className="mestre-grid">
          {/* QUADRO DE MISSÕES */}
          <div className="ff-card">
            <div className="card-header">
              <h3>QUADRO DE MISSÕES</h3>
              <button className="ff-add-btn" onClick={() => setShowModal(true)}>+ ADICIONAR CARTAZ</button>
            </div>
            <div className="mission-scroll">
              {missoes.map(m => (
                <div key={m.id} className={`mission-poster rank-${m.rank}`}>
                  <div className="poster-rank-label">{m.rank}</div>
                  <span className="mestre-tag">Narrador: {m.mestreNome}</span>
                  <h4>{m.nome}</h4>
                  <p className="gil-recompensa">💰 Recompensa: {m.gilRecompensa} Gil</p>
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

          {/* RESENHA DO SANCHES */}
          <div className="ff-card sanchez-card">
            <div className="sanchez-fade-oval" style={{backgroundImage: `url(${sanchezImg})`}}></div>
            <div className="sanchez-header">
              <h3>RESENHA DO SANCHES</h3>
              <button className="ff-add-btn-gold" onClick={() => setShowResenhaModal(true)}>+ CRIAR NOVA RESENHA</button>
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

          {/* SESSÕES DE JOGO */}
          <div className="ff-card">
            <div className="card-header">
              <h3>SESSÕES DE JOGO</h3>
              <button className="ff-add-btn small-btn">INICIAR NOVA SESSÃO</button>
            </div>
            <div className="empty-instancia">NENHUMA INSTÂNCIA ATIVA</div>
          </div>
        </div>
      </div>

      {/* --- MODAL NOVA MISSÃO (RECONFIGURADO) --- */}
      {showModal && (
        <div className="ff-modal-overlay-fixed">
          <div className="ff-modal ff-card">
            <h3 className="modal-title">NOVA MISSÃO</h3>
            <form onSubmit={handleCreateMission}>
              <input placeholder="Nome da Missão" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required />
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
                <input placeholder="Ex: 1d 10h" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required />
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

      {/* --- MODAL NOVA RESENHA --- */}
      {showResenhaModal && (
        <div className="ff-modal-overlay-fixed">
          <div className="ff-modal ff-card resenha-write-modal">
            <h3 className="modal-title">ESCREVER CRÔNICA</h3>
            <input className="ff-modal-input-dark" placeholder="Título da Crônica..." value={tituloResenha} onChange={(e)=>setTituloResenha(e.target.value)} />
            <textarea className="tall-area-white" placeholder="Use **texto** para negrito..." value={resenha} onChange={(e) => setResenha(e.target.value)} />
            <div className="player-selector-box">
              <label>DESTINATÁRIOS:</label>
              <div className="destinatarios-grid">
                {personagensDisponiveis.map(p => (
                  <label key={p} className="chip-label">
                    <input type="checkbox" checked={destinatarios.includes(p)} onChange={() => destinatarios.includes(p) ? setDestinatarios(destinatarios.filter(x=>x!==p)) : setDestinatarios([...destinatarios, p])} /> {p}
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

      {/* --- MODAL DETALHES --- */}
      {showDetails && (
        <div className="ff-modal-overlay-fixed" onClick={() => setShowDetails(null)}>
          <div className="ff-modal ff-card detail-view" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
               <span className="rank-tag">RANK {showDetails.rank}</span>
               <h2>{showDetails.nome}</h2>
            </div>
            <div className="detail-body">
              <strong>REQUISITOS:</strong>
              <p>{showDetails.requisitos}</p>
              <strong>OBJETIVOS:</strong>
              <p>{showDetails.objetivo}</p>
              <div className="recompensa-list">
                <strong>RECOMPENSAS:</strong>
                <p>💰 {showDetails.gilRecompensa} Gil</p>
                <ul>{showDetails.recompensa?.split('\n').map((r,i) => <li key={i}>{r}</li>)}</ul>
              </div>
            </div>
            <button className="ff-submit-gold" onClick={() => setShowDetails(null)}>FECHAR</button>
          </div>
        </div>
      )}

      {/* --- VISUALIZAÇÃO PAPIRO --- */}
      {viewResenha && (
        <div className="papiro-overlay-full" onClick={() => setViewResenha(null)}>
           <div className="papiro-real-container" style={{backgroundImage: `url(${papiroImg})`}} onClick={e=>e.stopPropagation()}>
              <div className="sanchez-oval-view-no-border" style={{backgroundImage: `url(${sanchezImg})`}}></div>
              <h2 className="papiro-title-real">{viewResenha.titulo}</h2>
              <p className="papiro-mestre-sub">Narrador: {viewResenha.mestre}</p>
              <div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: viewResenha.conteudo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></div>
              <div className="papiro-dest-list"><strong>DESTINADO A:</strong> {viewResenha.destinatarios?.join(", ")}</div>
              <button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button>
           </div>
        </div>
      )}

      {/* --- LIGHTBOX CARTAZ (MODAL EXCLUSIVO) --- */}
      {viewImage && (
        <div className="ff-image-viewer-fixed" onClick={() => setViewImage(null)}>
          <button className="close-viewer">×</button>
          <div className="image-frame-container" onClick={e => e.stopPropagation()}>
            <img src={viewImage} alt="Cartaz" className="cartaz-full-img" />
          </div>
        </div>
      )}

      <style>{`
        .mestre-container { background: #000; min-height: 100vh; position: relative; color: #fff; font-family: 'serif'; overflow-x: hidden; }
        .mestre-bg-image { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${fundoMestre}) no-repeat center top; background-size: cover; z-index: -1; }
        .mestre-content { position: relative; z-index: 1; padding: 20px; }
        .ff-title { color: #ffcc00; text-align: center; text-shadow: 0 0 10px #ffcc00; letter-spacing: 4px; margin-bottom: 20px; }
        .mestre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
        
        .ff-card { background: rgba(0, 10, 30, 0.95); border: 1px solid #ffcc00; padding: 15px; border-radius: 4px; backdrop-filter: blur(10px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 15px; }

        /* IDENTIDADE NARRADOR */
        .mestre-identity-box { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border: 1px solid #ffcc00; padding: 8px 15px; background: rgba(0, 10, 30, 0.9); width: fit-content; }
        .mestre-identity-box input { background: #fff; border: 1px solid #ffcc00; color: #000; padding: 3px 8px; font-weight: bold; font-family: 'serif'; outline: none; border-radius: 2px; }

        /* QUADRO MISSÕES */
        .mission-scroll { height: 400px; overflow-y: auto; padding-right: 5px; }
        .mission-poster { background: rgba(255,255,255,0.03); border: 1px solid #444; margin-bottom: 12px; padding: 12px; border-left: 3px solid #00f2ff; position: relative; }
        .poster-rank-label { position: absolute; top: 8px; right: 12px; font-size: 22px; color: #ffcc00; opacity: 0.4; font-weight: bold; }
        .mestre-tag { color: #ffcc00; font-size: 8px; text-transform: uppercase; }

        /* SANCHEZ OVAL */
        .sanchez-card { position: relative; overflow: hidden; }
        .sanchez-fade-oval { position: absolute; top: 10px; right: 10px; width: 120px; height: 120px; background-size: cover; background-position: center; border-radius: 50%; mask-image: radial-gradient(circle, black 40%, transparent 100%); opacity: 0.7; z-index: 0; pointer-events: none; }
        .sanchez-header { position: relative; z-index: 1; margin-bottom: 15px; }
        .ff-add-btn-gold { background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 10px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 5px; }
        .resenha-item-card { background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 10px; margin-top: 10px; border-radius: 3px; }

        /* MODAIS FIXOS */
        .ff-modal-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 99999; display: flex; align-items: center; justify-content: center; }
        .ff-modal { width: 450px; max-height: 85vh; overflow-y: auto; background: #000c1d; border: 1px solid #ffcc00; padding: 20px; position: relative; }
        .tall-area { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; height: 80px; resize: none; margin-bottom: 10px; font-family: 'serif'; }
        .tall-area-white { width: 100%; height: 180px; background: #fff; color: #000; padding: 12px; border-radius: 3px; resize: none; font-family: 'serif'; font-size: 14px; outline: none; }
        .detail-view h2 { border-bottom: 1px solid #ffcc00; padding-bottom: 10px; margin-top: 5px; }
        .detail-body p { font-size: 13px; line-height: 1.5; margin: 5px 0 15px 0; }

        /* PAPIRO REAL */
        .papiro-real-container { width: 600px; height: 450px; background-size: 100% 100%; background-repeat: no-repeat; padding: 60px 80px; color: #3b2b1a; position: relative; }
        .sanchez-oval-view-no-border { width: 85px; height: 85px; float: right; border-radius: 50%; background-size: cover; mask-image: radial-gradient(circle, black 50%, transparent 100%); margin-left: 15px; }
        .papiro-title-real { border-bottom: 1px solid #3b2b1a; padding-bottom: 4px; margin-top: 0; font-size: 24px; }
        .papiro-body-real { margin-top: 15px; line-height: 1.4; font-size: 15px; height: 160px; overflow-y: auto; }

        /* LIGHTBOX CARTAZ */
        .ff-image-viewer-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 99999; display: flex; align-items: center; justify-content: center; }
        .image-frame-container { max-width: 90%; max-height: 90%; border: 2px solid #ffcc00; overflow: hidden; background: #000; display: flex; align-items: center; justify-content: center; }
        .cartaz-full-img { max-width: 100%; max-height: 85vh; object-fit: contain; }
        .close-viewer { position: absolute; top: 30px; right: 40px; font-size: 50px; color: #ffcc00; background: none; border: none; cursor: pointer; }

        /* BOTÕES */
        .btn-cyan { border: 1px solid #00f2ff; color: #00f2ff; padding: 4px 10px; background: transparent; cursor: pointer; font-size: 10px; margin-right: 5px; font-weight: bold; }
        .btn-red { border: 1px solid #f44; color: #f44; padding: 4px 10px; background: transparent; cursor: pointer; font-size: 10px; font-weight: bold; }
        .ff-add-btn { background: transparent; border: 1px solid #00f2ff; color: #00f2ff; padding: 6px 12px; cursor: pointer; font-weight: bold; font-size: 10px; }
        .btn-group { display: flex; gap: 10px; margin-top: 15px; }
        .btn-forjar { flex: 1; background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; }
        .btn-cancelar { flex: 1; background: #000; color: #fff; border: 1px solid #fff; padding: 10px; cursor: pointer; text-align: center; font-size: 12px; }

        .chip-label { background: rgba(255,204,0,0.1); border: 1px solid #ffcc00; padding: 4px 10px; border-radius: 20px; font-size: 10px; cursor: pointer; display: inline-block; margin: 3px; }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}