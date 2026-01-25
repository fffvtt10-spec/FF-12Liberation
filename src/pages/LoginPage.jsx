import React, { useState } from 'react';
import { login } from '../firebase';
import fundoLogin from '../assets/fundo-login.jpg';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      setErro("ACESSO NEGADO: CREDENCIAIS INVÁLIDAS");
    }
  };

  return (
    <div className="login-screen">
      <div className="summoning-circle-wrapper">
        {/* Camadas da Aura de Invocação */}
        <div className="aura-layer layer-1"></div>
        <div className="aura-layer layer-2"></div>
        <div className="aura-layer layer-3"></div>

        <form className="login-form-epic" onSubmit={handleLogin}>
          <div className="header-glitch">
            <h2 className="main-title">IDENTIFIQUE-SE</h2>
            <div className="separator"></div>
          </div>

          <div className="input-field">
            <input 
              type="email" 
              placeholder="E-MAIL"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="input-field">
            <input 
              type="password" 
              placeholder="SENHA"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          {erro && <div className="error-box">{erro}</div>}

          <button type="submit" className="btn-summon">
            <span>INICIAR JORNADA</span>
          </button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-screen {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.3)), url(${fundoLogin}) no-repeat center center;
          background-size: cover;
          overflow: hidden;
        }

        .summoning-circle-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 500px;
          height: 500px;
        }

        /* Efeito de Aura Giratória */
        .aura-layer {
          position: absolute;
          border-radius: 50%;
          border: 2px solid transparent;
          filter: blur(2px);
        }

        .layer-1 {
          width: 380px;
          height: 380px;
          border: 1px solid rgba(0, 255, 255, 0.4);
          box-shadow: 0 0 40px rgba(0, 255, 255, 0.2);
          animation: spin 10s linear infinite;
        }

        .layer-2 {
          width: 420px;
          height: 420px;
          border: 1px dashed rgba(255, 204, 0, 0.3);
          animation: spinReverse 15s linear infinite;
        }

        .layer-3 {
          width: 460px;
          height: 460px;
          border: 2px double rgba(0, 255, 255, 0.1);
          box-shadow: inset 0 0 50px rgba(0, 255, 255, 0.1);
          animation: pulse 4s ease-in-out infinite;
        }

        .login-form-epic {
          position: relative;
          z-index: 10;
          text-align: center;
          width: 300px;
        }

        .main-title {
          color: #fff;
          font-size: 24px;
          letter-spacing: 6px;
          text-shadow: 0 0 10px #00f2ff, 0 0 20px #00f2ff;
          margin-bottom: 10px;
        }

        .separator {
          height: 2px;
          width: 100%;
          background: linear-gradient(90deg, transparent, #ffcc00, transparent);
          margin-bottom: 30px;
        }

        .input-field {
          margin-bottom: 20px;
        }

        .input-field input {
          width: 100%;
          padding: 12px;
          background: rgba(0, 0, 0, 0.7);
          border: none;
          border-bottom: 2px solid #00f2ff;
          color: #fff;
          text-align: center;
          letter-spacing: 2px;
          outline: none;
          transition: 0.3s;
        }

        .input-field input:focus {
          background: rgba(0, 242, 255, 0.1);
          border-bottom: 2px solid #ffcc00;
          box-shadow: 0 10px 20px -10px #00f2ff;
        }

        .btn-summon {
          background: transparent;
          border: 1px solid #ffcc00;
          padding: 15px 30px;
          color: #ffcc00;
          font-weight: bold;
          letter-spacing: 3px;
          cursor: pointer;
          position: relative;
          transition: 0.5s;
          margin-top: 20px;
          overflow: hidden;
        }

        .btn-summon:hover {
          color: #000;
          background: #ffcc00;
          box-shadow: 0 0 30px #ffcc00;
        }

        .error-box {
          color: #ff4444;
          font-size: 11px;
          margin: 10px 0;
          letter-spacing: 1px;
        }

        /* Animações Épicas */
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
      ` }} />
    </div>
  );
}