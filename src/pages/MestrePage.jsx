import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 

// Componente de Cronômetro com suporte a formato complexo (w, d, h)
const Timer = ({ expiry }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiry).getTime() - now;
      if (distance < 0) { setTimeLeft("EXPIRADA"); clearInterval(interval); }
      else {
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
  const [missoes, setMissoes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [resenha, setResenha] = useState("");
  // Identidade Única do Mestre
  const [mestreIdentidade, setMestreIdentidade] = useState(auth.currentUser?.email?.split('@')[0] || "Narrador");

  const [form, setForm] = useState({
    nome: '', descricao: '', objetivo: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: ''
  });

  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();
    // Filtro para garantir que o mestre veja apenas suas criações
    const q = query(collection(db, "missoes"), where("mestreId", "==", auth.currentUser.uid), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMissoes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const parseDuration = (str) => {
    const weeks = (str.match(/(\d+)w/) || [0, 0])[1] * 604800000;
    const days = (str.match(/(\d+)d/) || [0, 0])[1] * 86400000;
    const hours = (str.match(/(\d+)h/) || [0, 0])[1] * 3600000;
    return weeks + days + hours;
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    try {
      const msToAdd = parseDuration(form.duracao);
      const expiraEm = new Date(new Date().getTime() + msToAdd);
      
      await addDoc(collection(db, "missoes"), {
        ...form, 
        mestreNome: mestreIdentidade, 
        mestreId: auth.currentUser.uid, 
        createdAt: new Date(), 
        expiraEm: expiraEm.toISOString()
      });
      setShowModal(false);
      setForm({ nome: '', descricao: '', objetivo: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '' });
    } catch (err) { alert("Erro ao forjar cartaz: " + err.message); }
  };

  return (
    <div className="mestre-container">
      <div className="mestre-bg-image"></div>
      <div className="ether-vortex-gold"></div>
      
      <div className="mestre-content">
        <h1 className="ff-title">HUB DO NARRADOR</h1>

        <div className="mestre-identity-box ff-card fade-in">
          <label>IDENTIDADE DO MESTRE:</label>
          <input type="text" value={mestreIdentidade} onChange={(e) => setMestreIdentidade(e.target.value)} />
        </div>
        
        <div className="mestre-grid">
          {/* QUADRO DE MISSÕES */}
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
                  <span className="mestre-tag">Narrador: {m.mestreNome}</span>
                  <h4>{m.nome}</h4>
                  <Timer expiry={m.expiraEm} />
                  <div className="poster-actions">
                    <button onClick={() => window.open(m.imagem, '_blank')}>IMAGEM</button>
                    <button onClick={() => setShowDetails(m)}>DETALHES</button>
                    <button className="del" onClick={() => deleteDoc(doc(db, "missoes", m.id))}>EXCLUIR</button>
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
            <button className="ff-submit-gold">PUBLICAR RESENHA</button>
          </div>

          {/* SESSÕES DE JOGO */}
          <div className="ff-card fade-in">
            <h3>SESSÕES DE JOGO</h3>
            <button className="ff-btn-small">INICIAR NOVA SESSÃO</button>
            <div className="empty-instancia">NENHUMA INSTÂNCIA ATIVA</div>
          </div>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO */}
      {showModal && (
        <div className="ff-modal-overlay">
          <div className="ff-modal ff-card">
            <h3 className="modal-title">NOVA MISSÃO</h3>
            <form onSubmit={handleCreateMission}>
              <input placeholder="Nome da Missão" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required />
              <textarea placeholder="Descrição" value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} />
              <textarea placeholder="Objetivo" value={form.objetivo} onChange={e=>setForm({...form, objetivo: e.target.value})} />
              <div className="row">
                <input placeholder="Grupo (ex: até 6)" value={form.grupo} onChange={e=>setForm({...form, grupo: e.target.value})} />
                <select value={form.rank} onChange={e=>setForm({...form, rank: e.target.value})}>
                  {['E','D','C','B','A','S','SS','SC'].map(r => <option key={r} value={r}>RANK {r}</option>)}
                </select>
              </div>
              <textarea placeholder="Recompensas (Bolinhas)" value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} />
              <input placeholder="URL da Imagem" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} />
              <input placeholder="Duração (Ex: 1w 2d 10h)" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required />
              <div className="btn-group">
                <button type="submit" className="btn-forjar">FORJAR</button>
                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>CANCELAR</button>
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
            <p><strong>Narrador Responsável:</strong> {showDetails.mestreNome}</p>
            <p><strong>OBJETIVO:</strong> {showDetails.objetivo}</p>
            <p><strong>GRUPO:</strong> {showDetails.grupo}</p>
            <div className="recompensa-list">
              <strong>RECOMPENSAS:</strong>
              <ul>{showDetails.recompensa.split('\n').filter(r => r.trim() !== "").map((r,i) => <li key={i}>{r}</li>)}</ul>
            </div>
            <button className="ff-submit-gold" onClick={() => setShowDetails(null)}>FECHAR</button>
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
        
        .mestre-identity-box { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border-color: #ffcc00; padding: 10px 15px; background: rgba(0,0,0,0.4); max-width: 450px; }
        .mestre-identity-box label { font-size: 11px; color: #fff; letter-spacing: 1px; }
        .mestre-identity-box input { background: transparent; border: none; border-bottom: 1px solid #ffcc00; color: #ffcc00; font-weight: bold; width: 180px; outline: none; }

        .mestre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .ff-card { background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; padding: 20px; border-radius: 4px; backdrop-filter: blur(10px); }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px; }
        h3 { color: #ffcc00; font-size: 12px; margin: 0; letter-spacing: 1px; }

        .mission-scroll { height: 280px; overflow-y: auto; padding-right: 5px; }
        .mission-scroll::-webkit-scrollbar { width: 3px; }
        .mission-scroll::-webkit-scrollbar-thumb { background: #ffcc00; }

        .mission-poster { background: rgba(0,0,0,0.5); border: 1px solid #444; margin-bottom: 12px; padding: 12px; position: relative; border-left: 3px solid #00f2ff; }
        .mestre-tag { font-size: 8px; color: #ffcc00; display: block; margin-bottom: 5px; text-transform: uppercase; }
        .mission-poster h4 { margin: 0 0 5px 0; font-size: 13px; color: #fff; }
        .poster-rank { position: absolute; top: 5px; right: 10px; font-size: 20px; opacity: 0.15; font-weight: bold; }
        .mission-timer { font-size: 10px; color: #00f2ff; display: block; margin-bottom: 10px; }
        
        .poster-actions { display: flex; gap: 5px; }
        .poster-actions button { font-size: 8px; padding: 4px 8px; background: transparent; border: 1px solid #00f2ff; color: #00f2ff; cursor: pointer; }
        .poster-actions button.del { border-color: #f44; color: #f44; }

        .sanches-header { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
        .sanches-photo { width: 40px; height: 40px; border: 1px solid #ffcc00; border-radius: 50%; background: #222; }
        textarea { width: 100%; background: rgba(0,0,0,0.6); border: 1px solid #444; color: #fff; padding: 10px; height: 120px; resize: none; outline: none; font-size: 12px; }
        .ff-submit-gold { width: 100%; margin-top: 10px; background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 10px; cursor: pointer; font-weight: bold; transition: 0.3s; }
        .ff-submit-gold:hover { background: #ffcc00; color: #000; }
        
        .ff-btn-small { background: transparent; border: 1px solid #00f2ff; color: #00f2ff; font-size: 9px; padding: 4px 8px; cursor: pointer; }

        .ff-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ff-modal { width: 380px; padding: 25px; border: 1px solid #ffcc00; }
        .modal-title { color: #ffcc00; margin-bottom: 20px; text-align: left; }
        .ff-modal input, .ff-modal select, .ff-modal textarea { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 10px; outline: none; }
        .ff-modal input:focus, .ff-modal textarea:focus { border-color: #ffcc00; }
        
        .btn-group { display: flex; gap: 10px; margin-top: 15px; }
        .btn-forjar { flex: 1; background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; }
        .btn-cancelar { flex: 1; background: #000; color: #fff; border: 1px solid #fff; padding: 10px; cursor: pointer; }

        .rank-tag { display: inline-block; padding: 2px 8px; background: #fff; color: #000; font-size: 10px; font-weight: bold; margin-bottom: 10px; }
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}