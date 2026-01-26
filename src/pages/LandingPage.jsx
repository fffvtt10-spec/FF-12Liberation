import React from 'react';
import { useNavigate } from 'react-router-dom';
import musicaTema from '../assets/musica-tema.mp3';
import fundoRPG from '../assets/fundo-rpg.jpg'; 

export default function LandingPage() {

  const audioRef = React.useRef(new Audio(musicaTema));
  const navigate = useNavigate();

  return (
    <div className="landing-container" onClick={() => navigate('/login')}>
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
          background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), 
                      url(${fundoRPG}) no-repeat center center;
          background-size: cover; 
          cursor: pointer;
          position: fixed;
          top: 0;
          left: 0;
        }

        .content {
          text-align: center;
          animation: fadeInSuave 4s ease-in-out; 
        }

        .game-title {
          font-size: clamp(30px, 8vw, 60px);
          letter-spacing: 8px;
          color: #fff;
          text-shadow: 3px 3px 5px #000, 0 0 20px rgba(0, 242, 255, 0.5);
        }

        .sub-title {
          font-size: clamp(14px, 4vw, 24px);
          color: #ffcc00;
          margin-top: 10px;
          text-shadow: 1px 1px 3px #000;
        }

        .press-start {
          margin-top: 80px;
          font-size: 20px;
          color: #fff;
          letter-spacing: 5px;
          text-shadow: 0 0 10px #00f2ff;
          animation: blink 1.5s infinite;
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