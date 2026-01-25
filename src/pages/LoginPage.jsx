import React, { useState } from 'react';
import { login } from '../firebase';
import videoFundo from '../assets/video-fundo.mp4'; 

export default function LoginPage() {
  const [role, setRole] = useState(null); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setErro("FALHA NA CONEXÃO COM O ÉTER.");
    }
  };

  return (
    <div className="login-container">
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        preload="auto" 
        className="background-video"
      >
        <source src={videoFundo} type="video/mp4" />
      </video>

      <div className="content-overlay">
        {!role ? (
          <div className="selection-screen fade-in">
            <h2 className="ff-title">ESCOLHA SUA CLASSE</h2>
            <div className="ff-button-group">
              <button className="ff-btn" onClick={() => setRole('player')}>JOGADOR</button>
              <button className="ff-btn" onClick={() => setRole('master')}>NARRADOR</button>
            </div>
          </div>
        ) : (
          <form className="login-panel fade-in" onSubmit={handleLogin}>
            <button className="ff-back" onClick={() => setRole(null)}>← RETORNAR</button>
            <h3 className="ff-subtitle">{role === 'master' ? 'NARRADOR' : 'JOGADOR'}</h3>
            <div className="ff-input-group">
              <input type="email" placeholder="E-MAIL" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input type="password" placeholder="SENHA" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {erro && <p className="ff-error">{erro}</p>}
            <button type="submit" className="ff-submit">ENTRAR</button>
          </form>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-container {
          height: 100vh;
          width: 100vw;
          background: #000; /* Fundo base preto */
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        .background-video {
          position: absolute;
          top: 50%;
          left: 50%;
          min-width: 100%;
          min-height: 100%;
          width: auto;
          height: auto;
          z-index: 0; /* Fica acima do background preto, mas abaixo do overlay */
          transform: translate(-50%, -50%);
          object-fit: cover;
          /* Ajuste o tempo (10s) para a duração real do seu vídeo */
          animation: videoLoopFade 10s infinite; 
        }

        .content-overlay {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
        }

        .ff-title { color: #fff; font-size: 32px; letter-spacing: 8px; margin-bottom: 40px; text-shadow: 0 0 15px rgba(255, 255, 255, 0.5); }
        .ff-subtitle { color: #ffcc00; letter-spacing: 4px; margin-bottom: 30px; }
        .ff-button-group { display: flex; flex-direction: column; gap: 20px; align-items: center; }
        
        .ff-btn, .ff-submit {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.6);
          color: #fff;
          padding: 15px 50px;
          letter-spacing: 3px;
          cursor: pointer;
          transition: 0.4s;
          width: 280px;
        }

        .ff-btn:hover, .ff-submit:hover { background: #fff; color: #000; box-shadow: 0 0 20px #fff; }

        .ff-input-group input {
          display: block; width: 300px; padding: 12px; margin-bottom: 20px;
          background: rgba(0, 0, 0, 0.8); border: 1px solid #444;
          color: #fff; text-align: center; letter-spacing: 2px; outline: none;
        }

        .ff-input-group input:focus { border-color: #ffcc00; }
        .ff-back { background: none; border: none; color: #ffcc00; cursor: pointer; margin-bottom: 10px; }
        .ff-error { color: #ff4444; font-size: 12px; margin-bottom: 15px; }

        .fade-in { animation: fadeInFF 2s ease-out forwards; }

        @keyframes fadeInFF {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes videoLoopFade {
          0% { opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}} />
    </div>
  );
}