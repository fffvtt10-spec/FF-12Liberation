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
      setErro("Acesso Negado: Verifique suas credenciais.");
    }
  };

  return (
    <div className="login-screen">
      {/* O formulário agora flutua sem uma caixa sólida em volta */}
      <form className="aura-form" onSubmit={handleLogin}>
        <h2 className="title-aura">IDENTIFIQUE-SE</h2>
        <p className="subtitle">FAÇA LOGIN NA SUA CONTA</p>

        <div className="input-aura-wrapper">
          <input 
            type="email" 
            placeholder="E-MAIL"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>

        <div className="input-aura-wrapper">
          <input 
            type="password" 
            placeholder="SENHA"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        {erro && <p className="error-msg">{erro}</p>}

        <button type="submit" className="btn-aura">ENTRAR</button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-screen {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: url(${fundoLogin}) no-repeat center center;
          background-size: cover;
          overflow: hidden;
        }

        .aura-form {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
          border-radius: 50%; /* Faz a aura ser circular/oval */
          box-shadow: 0 0 60px 10px rgba(0, 150, 255, 0.3); /* Aura externa suave */
          animation: ambientAura 6s infinite alternate ease-in-out;
        }

        .title-aura {
          color: #ffcc00;
          font-size: 28px;
          letter-spacing: 4px;
          text-shadow: 0 0 15px rgba(255, 204, 0, 0.7);
          margin-bottom: 5px;
        }

        .subtitle {
          color: #fff;
          font-size: 12px;
          margin-bottom: 40px;
          letter-spacing: 2px;
          opacity: 0.8;
        }

        .input-aura-wrapper {
          margin-bottom: 25px;
          position: relative;
        }

        .input-aura-wrapper input {
          width: 280px;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 150, 255, 0.5);
          border-radius: 25px; /* Bordas arredondadas para evitar o "quadrado" */
          color: #fff;
          text-align: center;
          outline: none;
          transition: 0.4s;
          box-shadow: 0 0 10px rgba(0, 150, 255, 0.2);
        }

        .input-aura-wrapper input:focus {
          border-color: #00f2ff;
          box-shadow: 0 0 20px rgba(0, 242, 255, 0.6);
          transform: scale(1.05);
        }

        .btn-aura {
          width: 180px;
          padding: 12px;
          margin-top: 20px;
          background: transparent;
          color: #00f2ff;
          border: 2px solid #00f2ff;
          border-radius: 30px;
          font-weight: bold;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: 0.3s;
          box-shadow: 0 0 15px rgba(0, 242, 255, 0.4);
        }

        .btn-aura:hover {
          background: #00f2ff;
          color: #000;
          box-shadow: 0 0 30px #00f2ff;
        }

        /* Animação da Aura Girando e Pulsando */
        @keyframes ambientAura {
          0% {
            box-shadow: 0 0 50px 5px rgba(0, 150, 255, 0.3);
            transform: scale(1);
          }
          100% {
            box-shadow: 0 0 80px 20px rgba(0, 242, 255, 0.5);
            transform: scale(1.02);
          }
        }

        .error-msg {
          color: #ff4444;
          font-size: 13px;
          margin-bottom: 15px;
          text-shadow: 0 0 5px #000;
        }
      `}} />
    </div>
  );
}