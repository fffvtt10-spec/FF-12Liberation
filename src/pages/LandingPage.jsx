import React from 'react';
// Importamos a imagem para que o Vite gerencie o caminho corretamente
import fundoRPG from '../assets/fundo-rpg.jpg'; 

export default function LandingPage({ onStart }) {
  return (
    <div className="landing-container" onClick={onStart}>
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
          /* Usamos a variável da imagem importada aqui */
          background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), 
                      url(${fundoRPG}) no-repeat center center;
          background-size: cover; 
          cursor: pointer;
          overflow: hidden; 
          margin: 0;
          padding: 0;
          position: fixed; /* Garante que cubra a tela toda sem mover */
          top: 0;
          left: 0;
        }

        .content {
          text-align: center;
          animation: fadeInSuave 4s ease-in-out; 
        }

        .game-title {
          font-size: clamp(30px, 8vw, 60px);
          margin-bottom: 0;
          letter-spacing: 8px;
          color: #fff;
          text-shadow: 3px 3px 5px #000;
        }

        .sub-title {
          font-size: clamp(14px, 4vw, 24px);
          color: #ffcc00;
          margin-top: 10px;
          text-shadow: 1px 1px 3px #000;
        }

        .press-start {
          margin-top: 80px;
          font-size: 18px;
          color: #fff;
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes fadeInSuave {
          from { opacity: 0; filter: blur(10px); }
          to { opacity: 1; filter: blur(0); }
        }
      ` }} />
    </div>
  );
}