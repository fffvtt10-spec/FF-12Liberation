import React from 'react';

export default function LandingPage({ onStart }) {
  return (
    <div className="landing-container" onClick={onStart}>
      <div className="content">
        {/* Aqui você pode colocar uma logo em PNG ou apenas texto */}
        <h1 className="game-title">FINAL FANTASY</h1>
        <h2 className="sub-title">12ª Libertação</h2>
        
        <div className="press-start">
          PRESS START
        </div>
      </div>

      <style jsx>{`
        .landing-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000; /* Pode trocar por uma imagem de fundo depois */
          cursor: pointer;
        }

        .content {
          text-align: center;
          animation: fadeIn 3s ease-in;
        }

        .game-title {
          font-size: 40px;
          margin-bottom: 0;
          letter-spacing: 5px;
          color: #eee;
          text-shadow: 2px 2px #444;
        }

        .sub-title {
          font-size: 18px;
          color: var(--fft-gold, #ffcc00);
          margin-top: 10px;
        }

        .press-start {
          margin-top: 100px;
          font-size: 16px;
          animation: blink 1.2s infinite;
        }

        @keyframes blink {
          0% { opacity: 0; }
          50% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}