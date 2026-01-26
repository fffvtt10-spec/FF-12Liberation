import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
// Importando a imagem de fundo
import fundoMestre from '../assets/fundo-mestre.jpg'; 

export default function MestrePage() {
  const [resenha, setResenha] = useState("");

  useEffect(() => {
    // Pausa a música tema para o mestre focar na narração
    if (backgroundMusic) backgroundMusic.pause();
  }, []);

  const enviarResenha = async () => {
    if (!resenha.trim()) return alert("O Sanches não tem nada a dizer?");
    try {
      await addDoc(collection(db, "resenhas"), {
        texto: resenha,
        autor: "Sanches",
        data: new Date()
      });
      alert("A Resenha do Sanches foi enviada aos jogadores!");
      setResenha("");
    } catch (e) { 
      alert("Erro ao enviar resenha para o Éter."); 
    }
  };

  return (
    <div className="mestre-container">
      {/* Camada 1: Imagem de Fundo */}
      <div className="mestre-bg-image"></div>
      
      {/* Camada 2: Vórtice Dourado */}
      <div className="ether-vortex-gold"></div>
      
      <div className="mestre-content">
        <h1 className="ff-title">HUB DO NARRADOR</h1>
        
        <div className="mestre-grid">
          {/* Card: Quadro de Missões */}
          <div className="ff-card fade-in">
            <h3>QUADRO DE MISSÕES</h3>
            <div className="mission-placeholder">
              <p>Gerencie seus cartazes de caça aqui.</p>
              <button className="ff-btn-small">ADICIONAR CARTAZ</button>
            </div>
          </div>

          {/* Card: Resenha do Sanches */}
          <div className="ff-card fade-in">
            <h3>RESENHA DO SANCHES</h3>
            <div className="sanches-header">
              <div className="sanches-photo"></div>
              <span>SANCHES ESTÁ ESCREVENDO...</span>
            </div>
            <textarea 
              value={resenha} 
              onChange={(e) => setResenha(e.target.value)}
              placeholder="Digite a crônica ou resenha para os jogadores..."
            />
            <button className="ff-submit" onClick={enviarResenha}>PUBLICAR RESENHA</button>
          </div>

          {/* Card: Sessões Ativas */}
          <div className="ff-card fade-in">
            <h3>SESSÕES DE JOGO</h3>
            <button className="ff-btn-small">INICIAR NOVA SESSÃO</button>
            <div className="list-box-empty">
              <span>NENHUMA INSTÂNCIA ATIVA</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .mestre-container { 
          background: #000; 
          min-height: 100vh; 
          position: relative; 
          overflow: hidden; 
          color: #fff; 
        }

        /* Camada de Imagem de Fundo */
        .mestre-bg-image {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), 
                      url(${fundoMestre}) no-repeat center center;
          background-size: cover;
          z-index: 0;
        }

        .ether-vortex-gold {
          position: absolute; top: -100%; left: -100%; width: 300%; height: 300%;
          background: conic-gradient(from 0deg, transparent, rgba(255, 204, 0, 0.04), transparent);
          animation: rotateEther 45s linear infinite; 
          z-index: 1; 
          pointer-events: none;
        }
        
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .mestre-content { position: relative; z-index: 10; padding: 40px; }
        .mestre-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 30px; }
        
        .ff-card { 
          background: rgba(0, 10, 30, 0.85); 
          border: 1px solid #ffcc00; 
          padding: 25px; 
          border-radius: 4px; 
          backdrop-filter: blur(8px); 
          box-shadow: 0 0 15px rgba(255, 204, 0, 0.1);
        }

        .ff-title { color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 40px; text-shadow: 0 0 10px #ffcc00; font-family: 'serif'; }
        h3 { color: #ffcc00; font-size: 13px; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 20px; letter-spacing: 2px; }
        
        .sanches-header { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
        .sanches-photo { width: 45px; height: 45px; background: #222; border: 1px solid #ffcc00; border-radius: 50%; }
        
        textarea { width: 100%; background: rgba(0,0,0,0.6); border: 1px solid #444; color: #fff; padding: 12px; height: 120px; resize: none; outline: none; }
        textarea:focus { border-color: #ffcc00; }
        
        .ff-submit { width: 100%; margin-top: 15px; background: transparent; border: 1px solid #ffcc00; color: #ffcc00; padding: 12px; cursor: pointer; transition: 0.3s; font-weight: bold; }
        .ff-submit:hover { background: #ffcc00; color: #000; }
        
        .ff-btn-small { background: transparent; border: 1px solid #00f2ff; color: #00f2ff; padding: 5px 15px; cursor: pointer; font-size: 10px; }
        .ff-btn-small:hover { background: #00f2ff; color: #000; }
        
        .mission-placeholder, .list-box-empty { text-align: center; padding: 20px; color: #888; font-size: 12px; }

        .fade-in { animation: fadeIn 2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}