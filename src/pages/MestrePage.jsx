import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; // Importado auth para rastreio
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 

// Componente de Cronômetro regressivo isolado
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
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m restantes`);
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
  
  // Identidade do Narrador (Pega do Auth ou permite definir)
  const [mestreNome, setMestreNome] = useState(auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || "Narrador");

  // Estados do Formulário
  const [form, setForm] = useState({
    nome: '', descricao: '', objetivo: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: ''
  });

  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();
    
    // Listener filtrado: Mestre vê apenas as SUAS missões
    const q = query(
      collection(db, "missoes"), 
      where("mestreId", "==", auth.currentUser.uid), // Filtro de isolamento
      orderBy("createdAt", "desc")
    );
    
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
        ...form,
        mestreNome: mestreNome, // Tag visual para o jogador
        mestreId: auth.currentUser.uid, // ID para filtro de sistema
        createdAt: new Date(),
        expiraEm: expiraEm.toISOString()
      });
      
      setShowModal(false);
      setForm({ nome: '', descricao: '', objetivo: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '' });
      alert("Cartaz forjado e vinculado à sua conta!");
    } catch (err) { 
      alert("Erro ao criar cartaz: " + err.message); 
    }
  };

  return (
    <div className="mestre-container">
      <div className="mestre-bg-image"></div>
      <div className="ether-vortex-gold"></div>
      
      <div className="mestre-content">
        <h1 className="ff-title">HUB DO NARRADOR</h1>

        {/* Gestão de Identidade */}
        <div className="mestre-identity ff-card fade-in">
          <span>IDENTIDADE NO MURAL:</span>
          <input 
            type="text" 
            value={mestreNome} 
            onChange={(e) => setMestreNome(e.target.value)} 
            placeholder="Seu nome de Mestre..."
          />
        </div>
        
        <div className="mestre-grid">
          <div className="ff-card fade-in mission-board">
            <div className="card-header">
              <h3>MEU QUADRO DE MISSÕES</h3>
              <button className="ff-btn-small" onClick={() => setShowModal(true)}>ADICIONAR CARTAZ</button>
            </div>
            
            <div className="mission-scroll">
              {missoes.length === 0 && <p className="empty-msg">Você ainda não forjou missões neste mundo.</p>}
              {missoes.map(m => (
                <div key={m.id} className={`mission-poster rank-${m.rank}`}>
                  <div className="mestre-tag">AUTOR: {m.mestreNome}</div>
                  <div className="poster-rank">{m.rank}</div>
                  <h4>{m.nome}</h4>
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
              <textarea placeholder="Recompensas (um por linha)" value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} />
              <input placeholder="URL da Imagem" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} />
              <input type="number" placeholder="Duração (em horas)" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required />
              <div className="btn-group">
                <button type="submit" className="ff-btn-gold">PUBLICAR</button>
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
            <p><strong>NARRADOR:</strong> {showDetails.mestreNome}</p>
            <p><strong>OBJETIVO:</strong> {showDetails.objetivo}</p>
            <p><strong>GRUPO:</strong> {showDetails.grupo} pessoas</p>
            <div className="recompensa-list">
              <strong>RECOMPENSAS:</strong>
              <ul>{showDetails.recompensa.split('\n').filter(r => r.trim() !== "").map((r,i) => <li key={i}>{r}</li>)}</ul>
            </div>
            <p className="desc">{showDetails.descricao}</p>
            <button className="ff-btn-gold" onClick={() => setShowDetails(null)}>FECHAR</button>
          </div>
        </div>
      )}

      <style>{`
        .mestre-container { background: #000; min-height: 100vh; position: relative; overflow: hidden; color: #fff; font-family: sans-serif; }
        .mestre-bg-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${fundoMestre}) no-repeat center center; background-size: cover; z-index: 0; }
        .ether-vortex-gold { position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: conic-gradient(from 0deg, transparent, rgba(255, 204, 0, 0.05), transparent); animation: rotateEther 40s linear infinite; z-index: 1; pointer-events: none; }
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .mestre-content { position: relative; z-index: 10; padding: 40px; max-width: 1200px; margin: 0 auto; }
        .ff-title { color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 30px; text-shadow: 0 0 10px #ffcc00; }
        
        .mestre-identity { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; border-color: #ffcc00; padding: 10px 20px; background: rgba(0,0,0,0.6); }
        .mestre-identity input { width: auto; background: transparent; border: none; border-bottom: 1px solid #ffcc00; color: #ffcc00; margin: 0; padding: 5px; font-weight: bold; }
        
        .mestre-grid { display: grid; grid-template-columns: 1fr; gap: 30px; }
        .ff-card { background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; padding: 25px; border-radius: 4px; backdrop-filter: blur(10px); }
        
        .mission-scroll { display: flex; gap: 20px; overflow-x: auto; padding: 10px 0 20px 0; scrollbar-width: thin; scrollbar-color: #ffcc00 transparent; }
        .mission-scroll::-webkit-scrollbar { height: 6px; }
        .mission-scroll::-webkit-scrollbar-thumb { background: #ffcc00; border-radius: 10px; }

        .mission-poster { min-width: 240px; height: 150px; background: rgba(0,0,0,0.8); border-left: 5px solid #fff; padding: 15px; position: relative; display: flex; flex-direction: column; justify-content: space-between; }
        .mestre-tag { font-size: 8px; color: #ffcc00; letter-spacing: 1px; font-weight: bold; }
        .poster-rank { position: absolute; top: 10px; right: 10px; font-weight: bold; font-size: 24px; opacity: 0.15; color: #fff; }
        
        .poster-actions { display: flex; gap: 5px; }
        .poster-actions button { font-size: 9px; padding: 5px; background: transparent; border: 1px solid #555; color: #ccc; cursor: pointer; }
        .poster-actions button:hover { border-color: #fff; color: #fff; }
        .poster-actions button.del { border-color: #600; color: #f44; }

        /* Ranks */
        .rank-E { border-color: #888; } .rank-D { border-color: #4a4; } .rank-C { border-color: #44f; }
        .rank-B { border-color: #a4a; } .rank-A { border-color: #f80; } .rank-S { border-color: #ffcc00; }
        .rank-SS { border-color: #00f2ff; } .rank-SC { border-color: #f00; animation: glowRed 2s infinite; }
        @keyframes glowRed { 0%, 100% { box-shadow: 0 0 5px #f00; } 50% { box-shadow: 0 0 20px #f00; } }

        /* Modais */
        .ff-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        input, textarea, select { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 12px; margin-bottom: 12px; outline: none; }
        .ff-btn-gold { background: #ffcc00; color: #000; border: none; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .ff-btn-gold:hover { background: #fff; box-shadow: 0 0 10px #fff; }

        .fade-in { animation: fadeIn 0.8s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}