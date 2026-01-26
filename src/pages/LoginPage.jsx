import React, { useState } from 'react';
import videoFundo from '../assets/video-fundo.mp4';

export default function LoginPage() {
  const [role, setRole] = useState(null);

  return (
    <div className="login-screen">
      <video autoPlay loop muted playsInline className="video-bg">
        <source src={videoFundo} type="video/mp4" />
      </video>

      <div className="login-overlay">
        {!role ? (
          <div className="box fade-in">
            <h2 className="ff-title">ESCOLHA SEU CAMINHO</h2>
            <button className="ff-btn" onClick={() => setRole('player')}>JOGADOR</button>
            <button className="ff-btn" onClick={() => setRole('master')}>MESTRE</button>
          </div>
        ) : (
          <div className="box fade-in">
            <button className="back-link" onClick={() => setRole(null)}>❮ VOLTAR</button>
            <h2 className="ff-title">{role.toUpperCase()}</h2>
            <input type="email" placeholder="E-MAIL" />
            <input type="password" placeholder="SENHA" />
            <button className="ff-btn">CONECTAR</button>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-screen { height: 100vh; width: 100vw; position: relative; overflow: hidden; }
        .video-bg { position: absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index: 1; }
        .login-overlay { position: relative; z-index: 10; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
        .box { background: rgba(0,0,30,0.85); border: 1px solid #00f2ff; padding: 40px; text-align: center; border-radius: 4px; box-shadow: 0 0 20px #00f2ff33; }
        .ff-title { color: #fff; margin-bottom: 20px; letter-spacing: 3px; }
        .ff-btn { display: block; width: 100%; margin: 10px 0; padding: 12px; background: none; border: 1px solid #00f2ff; color: #fff; cursor: pointer; transition: 0.3s; }
        .ff-btn:hover { background: #fff; color: #000; }
        input { width: 100%; padding: 10px; margin-bottom: 10px; background: #000; border: 1px solid #333; color: #fff; }
        .back-link { background: none; border: none; color: #ffcc00; cursor: pointer; margin-bottom: 10px; }
        .fade-in { animation: fadeIn 0.8s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}