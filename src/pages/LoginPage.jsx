import React, { useState } from 'react';
import { login } from '../firebase';

export default function LoginPage() {
  const [role, setRole] = useState(null); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      // A lógica de redirecionamento mestre/jogador entra aqui após o sucesso
    } catch (err) {
      setErro("FALHA NA CONEXÃO COM O ÉTER.");
    }
  };

  return (
    <div className="login-container">
      {/* Filtro SVG para fundir as partículas e criar o efeito de chama líquida */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="fire-filter">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="fire-filter" />
        </filter>
      </svg>

      <div className="fire-canvas">
        {/* Gerando chamas e micro partículas */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="fire-particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            width: `${20 + Math.random() * 60}px`,
            height: `${20 + Math.random() * 60}px`
          }}></div>
        ))}
      </div>

      <div className="content-wrapper">
        {!role ? (
          <div className="role-card fade-in">
            <h2>ESCOLHA SUA CLASSE</h2>
            <div className="btn-group-vertical">
              <button className="btn-fft-selection" onClick={() => setRole('player')}>
                <span className="icon">🛡️</span> JOGADOR
              </button>
              <button className="btn-fft-selection" onClick={() => setRole('master')}>
                <span className="icon">📜</span> NARRADOR
              </button>
            </div>
          </div>
        ) : (
          <form className="login-panel fade-in" onSubmit={handleLogin}>
            <button className="back-btn" onClick={() => setRole(null)}>← RETORNAR</button>
            <h3>{role === 'master' ? 'NARRADOR' : 'JOGADOR'}</h3>
            <div className="input-field">
              <input type="email" placeholder="E-MAIL" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="input-field">
              <input type="password" placeholder="SENHA" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {erro && <p className="error-txt">{erro}</p>}
            <button type="submit" className="btn-action">ENTRAR</button>
          </form>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-container {
          height: 100vh;
          width: 100vw;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }

        /* Chamas Orgânicas */
        .fire-canvas {
          position: absolute;
          bottom: -50px;
          width: 100%;
          height: 60%;
          filter: url(#fire-filter);
          z-index: 1;
        }

        .fire-particle {
          position: absolute;
          bottom: 0;
          background: linear-gradient(to top, #4b0082, #00f2ff);
          border-radius: 50%;
          opacity: 0.6;
          animation: flame-rise 3s infinite ease-in;
        }

        @keyframes flame-rise {
          0% { transform: translateY(0) scale(1.5); opacity: 0.8; }
          100% { transform: translateY(-500px) scale(0.1); opacity: 0; }
        }

        /* Painel de Login Estilo Interface RPG */
        .content-wrapper { position: relative; z-index: 10; }

        .role-card, .login-panel {
          background: rgba(0, 0, 30, 0.85);
          border: 1px solid rgba(0, 242, 255, 0.4);
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 0 30px rgba(0, 242, 255, 0.2), inset 0 0 20px rgba(255, 255, 255, 0.05);
          text-align: center;
          width: 380px;
          backdrop-filter: blur(5px);
        }

        h2, h3 { color: #fff; letter-spacing: 4px; margin-bottom: 30px; text-shadow: 0 0 10px #00f2ff; }

        .btn-group-vertical { display: flex; flex-direction: column; gap: 15px; }

        .btn-fft-selection, .btn-action {
          background: transparent;
          border: 1px solid #00f2ff;
          color: #fff;
          padding: 15px;
          cursor: pointer;
          font-weight: bold;
          letter-spacing: 2px;
          transition: 0.3s;
          position: relative;
        }

        .btn-fft-selection:hover, .btn-action:hover {
          background: #00f2ff;
          color: #000;
          box-shadow: 0 0 20px #00f2ff;
        }

        .input-field input {
          width: 100%;
          padding: 12px;
          margin-bottom: 20px;
          background: rgba(0,0,0,0.8);
          border: 1px solid #444;
          color: #fff;
          text-align: center;
        }

        .input-field input:focus { border-color: #00f2ff; outline: none; }

        .back-btn { background: none; border: none; color: #00f2ff; cursor: pointer; font-size: 10px; margin-bottom: 10px; }

        .fade-in { animation: fadeIn 1.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}