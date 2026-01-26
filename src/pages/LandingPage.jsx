import React from 'react';
import { useNavigate } from 'react-router-dom';
import musicaTema from '../assets/musica-tema.mp3';
import fundoRPG from '../assets/fundo-rpg.jpg'; 

// Instância global para garantir que o áudio persista entre as rotas
export const backgroundMusic = new Audio(musicaTema);
backgroundMusic.loop = true;

export default function LandingPage() {
  const navigate = useNavigate();

  // Função para disparar áudio e navegação simultaneamente
  const handleStart = () => {
    // Inicia a música tema; navegadores exigem este clique prévio
    backgroundMusic.play().then(() => {
      console.log("Éter musical sintonizado.");
    }).catch(error => {
      console.log("Aguardando interação para liberar áudio: ", error);
    });
    
    // Navega para a tela de login; a música continuará tocando
    navigate('/login');
  };

  return (
    <div className="landing-container" onClick={handleStart}>
      <div className="content">
        <h1 className="game-title">FINAL FANTASY</h1>
        <h2 className="sub-title">12ª Libertação</h2>
        
        <div className="press-start">
          PRESS START
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .landing-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          /* Gradiente FF clássico sobre a imagem de fundo */
          background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), 
                      url(${fundoRPG}) no-repeat center center;
          background-size: cover; 
          cursor: pointer;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 1000;
        }

        .content {
          text-align: center;
          /* Animação de entrada suave com blur */
          animation: fadeInSuave 4s ease-in-out; 
        }

        .game-title {
          font-size: clamp(30px, 8vw, 60px);
          letter-spacing: 8px;
          color: #fff;
          text-shadow: 3px 3px 5px #000, 0 0 20px rgba(0, 242, 255, 0.5);
          font-family: 'serif';
        }

        .sub-title {
          font-size: clamp(14px, 4vw, 24px);
          color: #ffcc00;
          margin-top: 10px;
          text-shadow: 1px 1px 3px #000;
          font-family: 'serif';
        }

        .press-start {
          margin-top: 80px;
          font-size: 20px;
          color: #fff;
          letter-spacing: 5px;
          text-shadow: 0 0 10px #00f2ff;
          /* Efeito pulsante clássico de menu */
          animation: blink 1.5s infinite;
          font-family: 'sans-serif';
        }

        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes fadeInSuave {
          from { opacity: 0; filter: blur(15px); transform: scale(0.9); }
          to { opacity: 1; filter: blur(0); transform: scale(1); }
        }
      ` }} />
    </div>
  );
}