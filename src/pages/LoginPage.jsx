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
      // Aqui o Firebase cuida do login. Futuramente redirecionamos para o painel.
    } catch (err) {
      setErro("Acesso Negado: Verifique suas credenciais.");
    }
  };

  return (
    <div className="login-screen">
      <div className="login-box">
        <h2 className="title-fft">IDENTIFIQUE-SE</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>E-MAIL</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="input-group">
            <label>SENHA</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>
          {erro && <p className="error-msg">{erro}</p>}
          <button type="submit" className="btn-fft">ENTRAR</button>
        </form>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-screen {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${fundoLogin}) no-repeat center center;
          background-size: cover;
          animation: fadeIn 2s ease-in;
        }

        .login-box {
          background: rgba(0, 0, 50, 0.85); /* Azul escuro estilo FFT */
          border: 3px solid #ccc;
          border-radius: 8px;
          padding: 30px;
          width: 350px;
          box-shadow: 0 0 15px rgba(0,0,0,0.5), inset 0 0 10px rgba(255,255,255,0.1);
        }

        .title-fft {
          color: #ffcc00;
          text-align: center;
          margin-bottom: 25px;
          letter-spacing: 3px;
          font-size: 22px;
          text-shadow: 2px 2px #000;
        }

        .input-group {
          margin-bottom: 20px;
        }

        .input-group label {
          display: block;
          color: #eee;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .input-group input {
          width: 100%;
          padding: 10px;
          background: #000;
          border: 1px solid #ffcc00;
          color: #fff;
          outline: none;
        }

        .btn-fft {
          width: 100%;
          padding: 12px;
          background: #ffcc00;
          color: #000;
          border: none;
          font-weight: bold;
          cursor: pointer;
          transition: 0.3s;
          margin-top: 10px;
        }

        .btn-fft:hover {
          background: #fff;
          box-shadow: 0 0 10px #ffcc00;
        }

        .error-msg {
          color: #ff4444;
          font-size: 12px;
          text-align: center;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}