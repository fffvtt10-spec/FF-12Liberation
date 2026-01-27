import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 
import sanchezImg from '../assets/sanchez.jpeg'; 

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
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  
  // Estados para Resenha do Sanches
  const [resenha, setResenha] = useState("");
  const [tituloResenha, setTituloResenha] = useState("");
  const [previewPapiro, setPreviewPapiro] = useState(false);
  const [showDestinatarios, setShowDestinatarios] = useState(false); // Estado para o menu flutuante

  // --- PERSISTÊNCIA DA ASSINATURA (LOCAL STORAGE) ---
  const [mestreIdentidade, setMestreIdentidade] = useState(() => {
    const salva = localStorage.getItem('mestreAssinatura');
    return salva || auth.currentUser?.email?.split('@')[0] || "Narrador";
  });

  useEffect(() => {
    localStorage.setItem('mestreAssinatura', mestreIdentidade);
  }, [mestreIdentidade]);

  // Personagens (Conexão futura)
  const personagensDisponiveis = ["Cloud Strife", "Tifa Lockhart", "Barret Wallace", "Aerith Gainsborough"];
  const [destinatarios, setDestinatarios] = useState([]);

  // Formulário da Missão
  const [form, setForm] = useState({
    nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: ''
  });

  // --- BUSCA DE MISSÕES EM TEMPO REAL ---
  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "missoes"), 
      where("mestreId", "==", auth.currentUser.uid), 
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMissoes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Aguardando índice composto...");
      const fallbackQ = query(collection(db, "missoes"), where("mestreId", "==", auth.currentUser.uid));
      onSnapshot(fallbackQ, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    });
    return () => unsubscribe();
  }, []);

  const parseDuration = (str) => {
    const weeks = (str.match(/(\d+)w/) || [0, 0])[1] * 604800000;
    const days = (str.match(/(\d+)d/) || [0, 0])[1] * 86400000;
    const hours = (str.match(/(\d+)h/) || [0, 0])[1] * 3600000;
    return weeks + days + hours || 3600000;
  };

  // --- CRIAÇÃO DE MISSÃO ---
  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      const msToAdd = parseDuration(form.duracao);
      const expiraEm = new Date(Date.now() + msToAdd);
      await addDoc(collection(db, "missoes"), {
        ...form, 
        mestreNome: mestreIdentidade, 
        mestreId: auth.currentUser.uid, 
        createdAt: serverTimestamp(), 
        expiraEm: expiraEm.toISOString()
      });
      setShowModal(false);
      setForm({ nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: '' });
    } catch (err) { alert("Erro ao forjar cartaz."); }
  };

  // --- PUBLICAÇÃO DA RESENHA ---
  const publicarResenha = async () => {
    if (!tituloResenha || !resenha) return alert("Sanches exige título e texto!");
    try {
      const expiraEm = new Date();
      expiraEm.setDate(expiraEm.getDate() + 1); 
      await addDoc(collection(db, "resenhas"), {
        titulo: tituloResenha,
        conteudo: resenha,
        mestre: mestreIdentidade,
        mestreId: auth.currentUser.uid,
        destinatarios,
        createdAt: serverTimestamp(),
        expiraEm: expiraEm.toISOString()
      });
      alert("A crônica foi enviada!");
      setResenha(""); setTituloResenha(""); setDestinatarios([]);
      setShowDestinatarios(false);
    } catch (e) { alert("Erro ao publicar."); }
  };

  // Função interna para processar negrito e itálico na visualização
  const renderFormattedText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
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

          {/* COLUNA 2: RESENHA DO SANCHES */}
          <div className="ff-card fade-in sanchez-card">
            <div className="sanchez-bg-fade" style={{backgroundImage: `url(${sanchezImg})`}}></div>
            <h3>RESENHA DO SANCHES</h3>
            <input className="sanchez-title-input" placeholder="Título da Crônica..." value={tituloResenha} onChange={(e)=>setTituloResenha(e.target.value)} />
            
            <div className="editor-container">
              <textarea 
                className="ff-resenha-input"
                placeholder="Escreva a história aqui... Use **texto** para Negrito e *texto* para Itálico." 
                value={resenha} 
                onChange={(e) => setResenha(e.target.value)}
              />
            </div>

            {/* Menu Flutuante de Destinatários */}
            <div className="dropdown-destinatarios">
              <button className="dropdown-toggle" onClick={() => setShowDestinatarios(!showDestinatarios)}>
                ENVIAR PARA: {destinatarios.length > 0 ? `(${destinatarios.length})` : "SELECIONAR"}
              </button>
              {showDestinatarios && (
                <div className="dropdown-menu">
                  {personagensDisponiveis.map(p => (
                    <label key={p} className="dropdown-item">
                      <input 
                        type="checkbox" 
                        checked={destinatarios.includes(p)} 
                        onChange={() => destinatarios.includes(p) ? setDestinatarios(destinatarios.filter(x=>x!==p)) : setDestinatarios([...destinatarios, p])} 
                      /> {p}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="btn-group-column">
              <button className="ff-submit-gold" onClick={publicarResenha}>PUBLICAR</button>
              <button className="ff-btn-preview" onClick={() => setPreviewPapiro(true)}>VISUALIZAR</button>
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

      {/* MODAL DE CRIAÇÃO MISSÃO */}
      {showModal && (
        <div className="ff-modal-overlay">
          <div className="ff-modal ff-card">
            <h3 className="modal-title">NOVA MISSÃO</h3>
            <form onSubmit={handleCreateMission}>
              <input placeholder="Nome da Missão" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required />
              <textarea placeholder="Descrição" className="tall-area" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} />
              <textarea placeholder="Objetivos" className="tall-area" value={form.objetivo} onChange={e=>setForm({...form, objetivo: e.target.value})} />
              <textarea placeholder="Requisitos" className="tall-area" value={form.requisitos} onChange={e=>setForm({...form, requisitos: e.target.value})} />
              <div className="row">
                <input placeholder="Grupo (ex: até 6)" value={form.grupo} onChange={e=>setForm({...form, grupo: e.target.value})} />
                <select value={form.rank} onChange={e=>setForm({...form, rank: e.target.value})}>
                  {['E','D','C','B','A','S','SS','SC'].map(r => <option key={r} value={r}>RANK {r}</option>)}
                </select>
              </div>
              <textarea placeholder="Recompensas" className="tall-area" value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} />
              <div className="row">
                <input type="text" className="gil-input" placeholder="Gil de Recompensa (Ex: 5000)" value={form.gilRecompensa} onChange={e => setForm({...form, gilRecompensa: e.target.value.replace(/\D/g, '')})} />
                <input placeholder="Duração (Ex: 1w 2d 10h)" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required />
              </div>
              <input placeholder="URL do Cartaz (Imgur Link)" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} />
              <div className="btn-group">
                <button type="submit" className="btn-forjar">FORJAR</button>
                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES MISSÃO */}
      {showDetails && (
        <div className="ff-modal-overlay" onClick={() => setShowDetails(null)}>
          <div className="ff-modal ff-card detail-view" onClick={e => e.stopPropagation()}>
            <div className={`rank-tag rank-${showDetails.rank}`}>RANK {showDetails.rank}</div>
            <h2>{showDetails.nome}</h2>
            <div className="detail-section"><strong>REQUISITOS:</strong><p>{showDetails.requisitos}</p></div>
            <div className="detail-section"><strong>OBJETIVOS:</strong><p>{showDetails.objetivo}</p></div>
            <div className="recompensa-list">
              <strong>RECOMPENSAS:</strong>
              <p className="gil-txt">💰 {showDetails.gilRecompensa} Gil</p>
              <ul>{showDetails.recompensa.split('\n').filter(r => r.trim() !== "").map((r,i) => <li key={i}>{r}</li>)}</ul>
            </div>
            <button className="ff-submit-gold" onClick={() => setShowDetails(null)}>FECHAR</button>
          </div>
        </div>
      )}

      {/* LIGHTBOX DO CARTAZ */}
      {viewImage && (
        <div className="ff-image-viewer" onClick={() => setViewImage(null)}>
          <button className="close-viewer">×</button>
          <div className="image-frame" onClick={e => e.stopPropagation()}>
            <img src={viewImage} alt="Cartaz da Missão" />
          </div>
        </div>
      )}

      {/* PAPIRO ANIMADO DE VISUALIZAÇÃO */}
      {previewPapiro && (
        <div className="papiro-overlay" onClick={() => setPreviewPapiro(false)}>
          <div className="papiro-container" onClick={e=>e.stopPropagation()}>
            <div className="papiro-scroll-top"></div>
            <div className="papiro-content">
              <div className="sanchez-portrait-oval" style={{backgroundImage: `url(${sanchezImg})`}}></div>
              <h2 className="papiro-title">{tituloResenha || "Crônica"}</h2>
              <p className="papiro-mestre-tag">Escrito por: {mestreIdentidade}</p>
              <div className="papiro-text" dangerouslySetInnerHTML={{ __html: renderFormattedText(resenha) }}></div>
              <button className="close-papiro" onClick={() => setPreviewPapiro(false)}>FECHAR</button>
            </div>
            <div className="papiro-scroll-bottom"></div>
          </div>
        </div>
      )}

      <style>{`
        /* --- ESTILOS GERAIS --- */
        .mestre-container { background: #000; min-height: 100vh; position: relative; overflow: hidden; color: #fff; font-family: 'serif'; }
        .mestre-bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url(${fundoMestre}) no-repeat center center; background-size: cover; z-index: 0; }
        .ether-vortex-gold { position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: conic-gradient(from 0deg, transparent, rgba(255, 204, 0, 0.03), transparent); animation: rotateEther 40s linear infinite; z-index: 1; pointer-events: none; }
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .mestre-content { position: relative; z-index: 10; padding: 30px; }
        .ff-title { color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 30px; text-shadow: 0 0 10px #ffcc00; }
        .mestre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .ff-card { background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; padding: 20px; border-radius: 4px; backdrop-filter: blur(10px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; }
        
        .mestre-identity-box { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border: 1px solid #ffcc00; padding: 10px 15px; background: rgba(0, 10, 30, 0.8); max-width: 450px; }
        .mestre-identity-box input { background: transparent; border: none; border-bottom: 1px solid #ffcc00; color: #ffcc00; font-weight: bold; width: 180px; outline: none; }

        /* --- SANCHEZ CARD --- */
        .sanchez-card { position: relative; overflow: hidden; display: flex; flex-direction: column; }
        .sanchez-bg-fade { position: absolute; top: 0; right: 0; width: 150px; height: 100%; background-size: cover; background-position: center; opacity: 0.15; mask-image: radial-gradient(circle at right, black, transparent 80%); z-index: 0; }
        .editor-container { background: #fff; border-radius: 4px; height: 200px; margin: 10px 0; border: 1px solid #444; overflow: hidden; z-index: 1; }
        .ff-resenha-input { width: 100%; height: 100%; border: none; padding: 12px; resize: none; outline: none; font-family: 'serif'; font-size: 14px; color: #000; background: #fff; }
        .sanchez-title-input { width: 100%; background: transparent; border: none; border-bottom: 1px solid #444; color: #ffcc00; font-weight: bold; outline: none; margin-bottom: 5px; z-index: 1; }
        .btn-group-column { display: flex; flex-direction: column; gap: 8px; z-index: 1; }

        /* Menu Flutuante Estilizado */
        .dropdown-destinatarios { position: relative; margin: 10px 0; z-index: 10; }
        .dropdown-toggle { width: 100%; background: rgba(0,0,0,0.5); border: 1px solid #ffcc00; color: #ffcc00; padding: 8px; cursor: pointer; font-size: 10px; font-weight: bold; text-align: left; }
        .dropdown-menu { position: absolute; bottom: 100%; left: 0; width: 100%; background: #000c1d; border: 1px solid #ffcc00; max-height: 150px; overflow-y: auto; padding: 10px; box-shadow: 0 -5px 15px rgba(0,0,0,0.5); }
        .dropdown-item { display: block; padding: 5px 0; font-size: 11px; cursor: pointer; border-bottom: 1px solid #112a45; }
        .dropdown-item:last-child { border-bottom: none; }
        .dropdown-item input { margin-right: 10px; }

        /* --- PAPIRO ANIMADO --- */
        .papiro-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .papiro-container { width: 450px; position: relative; }
        .papiro-content { background: #f4e4bc; color: #3b2b1a; padding: 40px; border-left: 2px solid #d4a373; border-right: 2px solid #d4a373; animation: openScroll 1.2s forwards; max-height: 80vh; overflow-y: auto; }
        @keyframes openScroll { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        .papiro-scroll-top, .papiro-scroll-bottom { height: 30px; background: #d4a373; border-radius: 15px; width: 106%; margin-left: -3%; z-index: 10; position: relative; }
        .sanchez-portrait-oval { width: 80px; height: 100px; float: right; margin-left: 15px; background-size: cover; background-position: center; border-radius: 50%; border: 2px solid #3b2b1a; }
        .papiro-mestre-tag { font-size: 10px; font-style: italic; margin-bottom: 10px; color: #3b2b1a; opacity: 0.7; }

        /* --- ESTILOS DE MISSÕES --- */
        .ff-add-btn { background: rgba(0, 242, 255, 0.05); border: 1px solid #00f2ff; color: #00f2ff; font-size: 10px; padding: 6px 14px; cursor: pointer; font-weight: bold; transition: 0.4s; text-transform: uppercase; }
        .ff-add-btn:hover { background: #00f2ff; color: #000; box-shadow: 0 0 20px #00f2ff; }
        .mission-scroll { height: 320px; overflow-y: auto; padding-right: 5px; }
        .mission-poster { background: rgba(0,0,0,0.5); border: 1px solid #444; margin-bottom: 12px; padding: 12px; border-left: 3px solid #00f2ff; position: relative; }
        .mestre-tag { font-size: 8px; color: #ffcc00; display: block; margin-bottom: 5px; text-transform: uppercase; }
        .poster-actions { display: flex; gap: 5px; margin-top: 10px; }
        .poster-actions button { font-size: 8px; padding: 4px 8px; background: transparent; cursor: pointer; font-weight: bold; }
        .btn-cyan { border: 1px solid #00f2ff; color: #00f2ff; }
        .btn-cyan:hover { background: #00f2ff; color: #000; }
        .btn-red { border: 1px solid #f44; color: #f44; }
        .btn-red:hover { background: #f44; color: #fff; }

        .tall-area { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 10px; height: 80px; resize: none; outline: none; }
        
        /* --- BOTÕES --- */
        .ff-submit-gold { width: 100%; background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 10px; cursor: pointer; font-weight: bold; transition: 0.3s; }
        .ff-submit-gold:hover { background: #ffcc00; color: #000; }
        .ff-btn-preview { width: 100%; background: transparent; border: 1px solid #00f2ff; color: #00f2ff; padding: 10px; cursor: pointer; font-size: 11px; font-weight: bold; }
        .ff-btn-preview:hover { background: #00f2ff; color: #000; }

        /* --- LIGHTBOX --- */
        .ff-image-viewer { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 2000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
        .image-frame { max-width: 85%; max-height: 85%; border: 2px solid #ffcc00; background: #000; box-shadow: 0 0 50px rgba(0,0,0,0.5); }
        .image-frame img { max-width: 100%; max-height: 80vh; display: block; }
        .close-viewer { position: absolute; top: 20px; right: 40px; background: none; border: none; color: #ffcc00; font-size: 60px; cursor: pointer; }

        .gil-input::-webkit-outer-spin-button, .gil-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .btn-cancelar { flex: 1; background: #000; color: #fff; border: 1px solid #fff; padding: 10px; cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        .btn-forjar { flex: 1; background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; }
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}