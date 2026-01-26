import React from 'react';
import { useNavigate } from 'react-router-dom'; // Importado para navegação

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    // Aqui você pode adicionar um som de "start" se desejar
    navigate('/login'); // Agora o botão redireciona corretamente
  };

  return (
    <div className="landing-container" onClick={handleStart}>
      <div className="press-start fade-pulse">
        PRESS START
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .landing-container {
          height: 100vh;
          width: 100vw;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .press-start {
          color: #fff;
          font-size: 24px;
          letter-spacing: 10px;
          text-shadow: 0 0 10px #00f2ff;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .fade-pulse { animation: pulse 2s infinite; }
      `}} />
    </div>
  );
}