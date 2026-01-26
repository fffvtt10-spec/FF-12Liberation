import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 

export default function MestrePage() {
  const [sessoes, setSessoes] = useState([]);
  const [missoes, setMissoes] = useState([]);

  useEffect(() => {
    backgroundMusic.pause(); // Silencia o éter para foco na narração
    fetchSessoes();
    fetchMissoes();
  }, []);

  const fetchSessoes = async () => {
    const snap = await getDocs(collection(db, "sessoes"));
    setSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchMissoes = async () => {
    const snap = await getDocs(collection(db, "missoes"));
    setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  return (
    <div className="mestre-container">
      <div className="ether-vortex"></div>
      
      <div className="mestre-content">
        <h1 className="ff-title">HUB DO NARRADOR</h1>
        
        <div className="mestre-grid">
          {/* Card: Gestão de Sessões */}
          <div className="ff-card">
            <h3>SESSÕES DE JOGO</h3>
            <button className="ff-btn-small" onClick={() => {/* Lógica de criar */}}>NOVA SESSÃO</button>
            <div className="scroll-box">
              {sessoes.map(s => (
                <div key={s.id} className="session-item">
                  <p>{s.titulo} | {s.horarioInício}</p>
                  <button className="del-btn" onClick={() => deleteDoc(doc(db, "sessoes", s.id))}>X</button>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Mural de Missões (Cartazes) */}
          <div className="ff-card">
            <h3>QUADRO DE MISSÕES</h3>
            <div className="posters-grid">
              {missoes.map(m => (
                <div key={m.id} className="mission-poster">
                  <img src={m.urlImagem} alt="Cartaz" />
                  <span>{m.recompensa}G</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Resenha do Sanches */}
          <div className="ff-card">
            <h3>RESENHA DO SANCHES</h3>
            <textarea placeholder="Escreva a resenha aqui..."></textarea>
            <button className="ff-btn-gold">ENVIAR PARA JOGADORES</button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .mestre-container { background: #000; min-height: 100vh; position: relative; overflow: hidden; color: #fff; }
        .ether-vortex { position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; 
          background: conic-gradient(from 0deg, transparent, rgba(255, 204, 0, 0.05), transparent);
          animation: rotateEther 40s linear infinite; z-index: 0; pointer-events: none; }
        
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .mestre-content { position: relative; z-index: 10; padding: 40px; }
        .mestre-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px; }
        .ff-card { background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; padding: 20px; border-radius: 4px; backdrop-filter: blur(10px); }
        .ff-title { color: #ffcc00; text-align: center; letter-spacing: 5px; text-shadow: 0 0 10px #ffcc00; }
        h3 { color: #ffcc00; font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        textarea { width: 100%; background: #000; color: #fff; border: 1px solid #444; padding: 10px; height: 100px; resize: none; }
        .mission-poster { border: 1px solid #444; padding: 5px; text-align: center; background: #111; }
        .mission-poster img { width: 100%; height: 120px; object-fit: cover; }
      `}} />
    </div>
  );
}