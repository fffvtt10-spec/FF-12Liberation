import React from 'react';
import { useNavigate } from 'react-router-dom';
import musicaTema from '../assets/musica-tema.mp3';
import fundoRPG from '../assets/fundo-rpg.jpg'; 

// CRIAÇÃO DA INSTÂNCIA GLOBAL
export const backgroundMusic = new Audio(musicaTema);
backgroundMusic.loop = true;
backgroundMusic.volume = 0.2; // <--- FORÇA O VOLUME AQUI NO INÍCIO

export default function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    // Garante volume antes de tocar
    backgroundMusic.volume = 0.2; 
    
    backgroundMusic.play().then(() => {
      console.log("Éter musical sintonizado.");
    }).catch(error => {
      console.log("Aguardando interação: ", error);
    });
    
    navigate('/login');
  };

  return (
    <div className="landing-container" onClick={handleStart}>
      <div className="content">
        <h1 className="game-title">FINAL FANTASY</h1>
        <h2 className="sub-title">12ª Libertação</h2>
        <div className="press-start">PRESS START</div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .landing-container {
          height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${fundoRPG}) no-repeat center center;
          background-size: cover; cursor: pointer; position: fixed; top: 0; left: 0; z-index: 1000;
        }
        .content { text-align: center; animation: fadeInSuave 4s ease-in-out; }
        .game-title { font-size: clamp(30px, 8vw, 60px); letter-spacing: 8px; color: #fff; text-shadow: 3px 3px 5px #000, 0 0 20px rgba(0, 242, 255, 0.5); font-family: 'serif'; }
        .sub-title { font-size: clamp(14px, 4vw, 24px); color: #ffcc00; margin-top: 10px; text-shadow: 1px 1px 3px #000; font-family: 'serif'; }
        .press-start { margin-top: 80px; font-size: 20px; color: #fff; letter-spacing: 5px; text-shadow: 0 0 10px #00f2ff; animation: blink 1.5s infinite; font-family: 'sans-serif'; }
        @keyframes blink { 0%, 100% { opacity: 0; } 50% { opacity: 1; } }
        @keyframes fadeInSuave { from { opacity: 0; filter: blur(15px); transform: scale(0.9); } to { opacity: 1; filter: blur(0); transform: scale(1); } }
      ` }} />
    </div>
  );
}