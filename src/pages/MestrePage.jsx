import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 

// Componente Timer para o relógio lateral dos cartazes
const Timer = ({ expiry }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(expiry).getTime() - now;
      if (distance < 0) { setTimeLeft("EXPIRADA"); clearInterval(interval); }
      else {
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${d}d ${h}h ${m}m`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiry]);
  return <div className="timer-badge">⏳ {timeLeft}</div>;
};

export default function MestrePage() {
  const [missoes, setMissoes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] = useState(null);
  const [mestreIdentidade, setMestreIdentidade] = useState(auth.currentUser?.email?.split('@')[0] || "Narrador");

  const [form, setForm] = useState({
    nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: "0.00"
  });

  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();
    
    // Listener em tempo real com filtro por Mestre
    const q = query(
      collection(db, "missoes"), 
      where("mestreId", "==", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMissoes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Erro no Éter:", error));
    
    return () => unsubscribe();
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
        ...form, 
        gilValue: parseFloat(form.gilRecompensa), // Valor numérico para cálculos
        mestreNome: mestreIdentidade, 
        mestreId: auth.currentUser.uid, 
        createdAt: serverTimestamp(), // Essencial para a query funcionar
        expiraEm: expiraEm.toISOString()
      });

      setShowModal(false);
      setForm({ nome: '', descricao: '', objetivo: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: "0.00" });
    } catch (err) { alert("Falha na forja: " + err.message); }
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
          {/* QUADRO DE MISSÕES */}
          <div className="ff-card fade-in">
            <div className="card-header">
              <h3>QUADRO DE MISSÕES</h3>
              <button className="ff-btn-small" onClick={() => setShowModal(true)}>ADICIONAR CARTAZ</button>
            </div>
            <div className="mission-scroll">
              {missoes.map(m => (
                <div key={m.id} className={`mission-poster rank-${m.rank}`}>
                  <div className="poster-rank">{m.rank}</div>
                  <span className="mestre-tag">{m.mestreNome}</span>
                  <h4>{m.nome}</h4>
                  <div className="gil-display">💰 {parseFloat(m.gilValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Gil</div>
                  <Timer expiry={m.expiraEm} />
                  <div className="poster-actions">
                    <button onClick={() => window.open(m.imagem, '_blank')}>IMAGEM</button>
                    <button onClick={() => setShowDetails(m)}>DETALHES</button>
                    <button className="del" onClick={() => deleteDoc(doc(db, "missoes", m.id))}>X</button>
                  </div>
                </div>
              ))}
            </div>
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
              <textarea placeholder="Objetivos" className="tall-area" value={form.objetivo} onChange={e=>setForm({...form, objetivo: e.target.value})} />
              <textarea placeholder="Requisitos" className="tall-area" value={form.requisitos} onChange={e=>setForm({...form, requisitos: e.target.value})} />
              
              <div className="row">
                <input placeholder="Grupo (ex: 6)" value={form.grupo} onChange={e=>setForm({...form, grupo: e.target.value})} />
                <select value={form.rank} onChange={e=>setForm({...form, rank: e.target.value})}>
                  {['E','D','C','B','A','S','SS','SC'].map(r => <option key={r} value={r}>RANK {r}</option>)}
                </select>
              </div>

              <textarea placeholder="Recompensas (Itens)" className="tall-area" value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} />
              
              <div className="row">
                <input type="number" step="0.01" placeholder="Gil Recompensa" value={form.gilRecompensa} onChange={e=>setForm({...form, gilRecompensa: e.target.value})} />
                <input placeholder="Duração (1w 2d 10h)" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required />
              </div>

              <input placeholder="URL da Imagem" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} />

              <div className="btn-group">
                <button type="submit" className="btn-forjar">FORJAR</button>
                <button type="button" className="btn-cancelar" onClick={() => setShowModal(false)}>CANCELAR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .mestre-container { background: #000; min-height: 100vh; position: relative; overflow: hidden; color: #fff; font-family: 'serif'; }
        .mestre-bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url(${fundoMestre}) no-repeat center center; background-size: cover; z-index: 0; }
        .ether-vortex-gold { position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: conic-gradient(from 0deg, transparent, rgba(255, 204, 0, 0.03), transparent); animation: rotateEther 40s linear infinite; z-index: 1; pointer-events: none; }
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .mestre-content { position: relative; z-index: 10; padding: 30px; }
        .mestre-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .ff-card { background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; padding: 20px; border-radius: 4px; backdrop-filter: blur(10px); }
        
        .mestre-identity-box { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; border-color: #ffcc00; padding: 10px 15px; background: rgba(0,0,0,0.4); max-width: 450px; }
        .mestre-identity-box input { background: transparent; border: none; border-bottom: 1px solid #ffcc00; color: #ffcc00; font-weight: bold; width: 180px; outline: none; }

        .mission-scroll { height: 300px; overflow-y: auto; padding-right: 10px; }
        .mission-poster { background: rgba(0,0,0,0.6); border: 1px solid #333; margin-bottom: 12px; padding: 12px; border-left: 3px solid #00f2ff; position: relative; }
        .mestre-tag { font-size: 8px; color: #ffcc00; display: block; margin-bottom: 4px; text-transform: uppercase; }
        .gil-display { color: #ffcc00; font-weight: bold; font-size: 11px; margin: 4px 0; }
        .timer-badge { font-size: 10px; color: #00f2ff; margin-bottom: 10px; }

        .ff-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .ff-modal { width: 450px; max-height: 90vh; overflow-y: auto; border: 1px solid #ffcc00; }
        .tall-area { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 10px; height: 80px; resize: none; }
        .ff-modal input, .ff-modal select { width: 100%; background: #000; border: 1px solid #333; color: #fff; padding: 10px; margin-bottom: 10px; outline: none; }
        
        .btn-group { display: flex; gap: 10px; margin-top: 10px; }
        .btn-forjar { flex: 1; background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; }
        .btn-cancelar { flex: 1; background: transparent; color: #fff; border: 1px solid #fff; padding: 10px; cursor: pointer; }

        /* Ranks */
        .rank-SC { border-color: #f00; animation: glowRed 2s infinite; }
        @keyframes glowRed { 0%, 100% { box-shadow: 0 0 5px #f00; } 50% { box-shadow: 0 0 15px #f00; } }
      `}</style>
    </div>
  );
}