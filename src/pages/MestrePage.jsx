import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 

// Timer isolado para não pesar a renderização do grid
const Timer = ({ expiry }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiry).getTime() - now;
      if (distance < 0) { setTimeLeft("EXPIRADA"); clearInterval(interval); }
      else {
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiry]);
  return <span className="mission-timer">{timeLeft}</span>;
};

export default function MestrePage() {
  const [missoes, setMissoes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [resenha, setResenha] = useState("");
  const [mestreNome, setMestreNome] = useState(auth.currentUser?.email?.split('@')[0] || "Narrador");

  const [form, setForm] = useState({
    nome: '', descricao: '', objetivo: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: ''
  });

  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();
    const q = query(collection(db, "missoes"), where("mestreId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMissoes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      const expiraEm = new Date();
      expiraEm.setHours(expiraEm.getHours() + parseInt(form.duracao));
      await addDoc(collection(db, "missoes"), {
        ...form, mestreNome, mestreId: auth.currentUser.uid, createdAt: new Date(), expiraEm: expiraEm.toISOString()
      });
      setShowModal(false);
      setForm({ nome: '', descricao: '', objetivo: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '' });
    } catch (err) { alert("Erro ao forjar cartaz."); }
  };

  return (
    <div className="mestre-container">
      <div className="mestre-bg-image"></div>
      <div className="ether-vortex-gold"></div>
      
      <div className="mestre-content">
        <h1 className="ff-title">HUB DO NARRADOR</h1>

        <div className="mestre-identity ff-card fade-in">
          <label>IDENTIDADE NO MURAL:</label>
          <input type="text" value={mestreNome} onChange={(e) => setMestreNome(e.target.value)} />
        </div>
        
        <div className="mestre-grid">
          {/* QUADRO DE MISSÕES (ESTILO CARD ORIGINAL) */}
          <div className="ff-card fade-in">
            <div className="card-header">
              <h3>QUADRO DE MISSÕES</h3>
              <button className="ff-btn-small" onClick={() => setShowModal(true)}>ADICIONAR CARTAZ</button>
            </div>
            <div className="mission-scroll">
              {missoes.length === 0 && <p className="empty-msg">Gerencie seus cartazes de caça aqui.</p>}
              {missoes.map(m => (
                <div key={m.id} className={`mission-poster rank-${m.rank}`}>
                  <div className="poster-rank">{m.rank}</div>
                  <h4>{m.nome}</h4>
                  <Timer expiry={m.expiraEm} />
                  <div className="poster-actions">
                    <button onClick={() => window.open(m.imagem, '_blank')}>VER IMAGEM</button>
                    <button onClick={() => setShowDetails(m)}>DETALHES</button>
                    <button className="del" onClick={() => deleteDoc(doc(db, "missoes", m.id))}>X</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RESENHA DO SANCHES */}
          <div className="ff-card fade-in">
            <h3>RESENHA DO SANCHES</h3>
            <div className="sanches-header">
              <div className="sanches-photo"></div>
              <span>SANCHES ESTÁ ESCREVENDO...</span>
            </div>
            <textarea placeholder="Digite a crônica ou resenha para os jogadores..." value={resenha} onChange={(e)=>setResenha(e.target.value)} />
            <button className="ff-submit">PUBLICAR RESENHA</button>
          </div>

          {/* SESSÕES DE JOGO */}
          <div className="ff-card fade-in">
            <h3>SESSÕES DE JOGO</h3>
            <button className="ff-btn-small">INICIAR NOVA SESSÃO</button>
            <div className="empty-instancia">NENHUMA INSTÂNCIA ATIVA</div>
          </div>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO (DESIGN LIMPO) */}
      {showModal && (
        <div className="ff-modal-overlay">
          <div className="ff-modal ff-card">
            <h3>NOVA MISSÃO</h3>
            <form onSubmit={handleCreateMission}>
              <input placeholder="Nome da Missão" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required />
              <textarea placeholder="Descrição" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} />
              <input placeholder="Objetivo" value={form.objetivo} onChange={e=>setForm({...form, objetivo: e.target.value})} />
              <div className="row">
                <input placeholder="Grupo (ex: até 6)" value={form.grupo} onChange={e=>setForm({...form, grupo: e.target.value})} />
                <select value={form.rank} onChange={e=>setForm({...form, rank: e.target.value})}>
                  {['E','D','C','B','A','S','SS','SC'].map(r => <option key={r} value={r}>RANK {r}</option>)}
                </select>
              </div>
              <textarea placeholder="Recompensas (Bolinhas)" value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} />
              <input placeholder="URL da Imagem" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} />
              <input type="number" placeholder="Duração em Horas" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required />
              <div className="btn-group">
                <button type="submit" className="ff-btn-gold">FORJAR</button>
                <button type="button" className="ff-btn-cancel" onClick={() => setShowModal(false)}>CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {showDetails && (
        <div className="ff-modal-overlay" onClick={() => setShowDetails(null)}>
          <div className="ff-modal ff-card detail-view" onClick={e => e.stopPropagation()}>
            <div className={`rank-tag rank-${showDetails.rank}`}>RANK {showDetails.rank}</div>
            <h2>{showDetails.nome}</h2>
            <p><strong>OBJETIVO:</strong> {showDetails.objetivo}</p>
            <p><strong>GRUPO:</strong> {showDetails.grupo} pessoas</p>
            <div className="recompensa-list">
              <strong>RECOMPENSAS:</strong>
              <ul>{showDetails.recompensa.split('\n').filter(r => r.trim() !== "").map((r,i) => <li key={i}>{r}</li>)}</ul>
            </div>
            <button className="ff-btn-gold" onClick={() => setShowDetails(null)}>FECHAR</button>
          </div>
        </div>
      )}

      <style>{`
        .mestre-container { background: #000; min-height: 100vh; position: relative; overflow: hidden; color: #fff; font-family: 'serif'; }
        .mestre-bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url(${fundoMestre}) no-repeat center center; background-size: cover; z-index: 0; }
        .ether-vortex-gold { position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: conic-gradient(from 0deg, transparent, rgba(255, 204, 0, 0.03), transparent); animation: rotateEther 40s linear infinite; z-index: 1; pointer-events: none; }
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .mestre-content { position: relative; z-index: 10; padding: 30px; }
        .ff-title { color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 30px; text-shadow: 0 0 10px #ffcc00; }
        
        .mestre-identity { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border-color: #ffcc00; padding: 10px 15px; background: rgba(0,0,0,0.4); max-width: 400px; font-size: 12px; }
        .mestre-identity input { background: transparent; border: none; border-bottom: 1px solid #ffcc00; color: #ffcc00; font-weight: bold; padding: 2px; width: 150px; outline: none; }

        .mestre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .ff-card { background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; padding: 20px; border-radius: 4px; backdrop-filter: blur(10px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; }
        h3 { color: #ffcc00; font-size: 14px; margin: 0; letter-spacing: 1px; }

        .mission-scroll { height: 250px; overflow-y: auto; padding-right: 5px; }
        .mission-scroll::-webkit-scrollbar { width: 3px; }
        .mission-scroll::-webkit-scrollbar-thumb { background: #ffcc00; }

        .mission-poster { background: rgba(0,0,0,0.5); border: 1px solid #444; margin-bottom: 10px; padding: 10px; position: relative; }
        .mission-poster h4 { margin: 0 0 5px 0; font-size: 13px; color: #00f2ff; }
        .poster-rank { position: absolute; top: 5px; right: 10px; font-size: 18px; opacity: 0.2; font-weight: bold; }
        .mission-timer { font-size: 10px; color: #ffcc00; display: block; margin-bottom: 8px; }
        
        .poster-actions { display: flex; gap: 5px; }
        .poster-actions button { font-size: 8px; padding: 4px; background: transparent; border: 1px solid #00f2ff; color: #00f2ff; cursor: pointer; }
        .poster-actions button.del { border-color: #f44; color: #f44; }

        .sanches-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .sanches-photo { width: 40px; height: 40px; border: 1px solid #ffcc00; border-radius: 50%; background: #222; }
        textarea { width: 100%; background: rgba(0,0,0,0.6); border: 1px solid #444; color: #fff; padding: 10px; height: 120px; resize: none; outline: none; font-size: 12px; }
        .ff-submit { width: 100%; margin-top: 10px; background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 10px; cursor: pointer; font-weight: bold; }
        
        .empty-instancia { text-align: center; color: #666; font-size: 11px; margin-top: 50px; }
        .ff-btn-small { background: transparent; border: 1px solid #00f2ff; color: #00f2ff; font-size: 9px; padding: 4px 8px; cursor: pointer; }

        .ff-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ff-modal { width: 400px; padding: 30px; }
        .ff-modal input, .ff-modal select { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 10px; margin-bottom: 10px; }
        .ff-btn-gold { background: #ffcc00; color: #000; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; }
        
        .rank-tag { display: inline-block; padding: 2px 8px; background: #fff; color: #000; font-size: 10px; font-weight: bold; margin-bottom: 10px; }
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}