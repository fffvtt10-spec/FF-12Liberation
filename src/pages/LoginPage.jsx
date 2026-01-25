import React, { useState } from 'react';
import { login } from '../firebase';

export default function LoginPage() {
  const [role, setRole] = useState(null); // null, 'player', ou 'master'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await login(email, password);
      const user = userCredential.user;
      
      // Lógica de Redirecionamento Baseada no Role
      if (role === 'master') {
        console.log("Redirecionando para Painel do Mestre:", user.uid);
        // window.location.href = `/admin/${user.uid}`;
      } else {
        console.log("Redirecionando para Tela do Jogador");
      }
    } catch (err) {
      setErro("FALHA NA AUTENTICAÇÃO. TENTE NOVAMENTE.");
    }
  };

  return (
    <div className="login-container">
      {/* Fundo de Chamas e Partículas */}
      <div className="fire-wrapper">
        <div className="fire">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </div>

      {!role ? (
        <div className="role-selection">
          <h2 className="fade-in">COMO DESEJA ENTRAR?</h2>
          <div className="btn-group">
            <button className="btn-epic" onClick={() => setRole('player')}>JOGADOR</button>
            <button className="btn-epic" onClick={() => setRole('master')}>NARRADOR</button>
          </div>
        </div>
      ) : (
        <form className="login-box-epic fade-in" onSubmit={handleLogin}>
          <button className="back-link" onClick={() => setRole(null)}>← VOLTAR</button>
          <h3>{role === 'master' ? 'ACESSO AO MESTRE' : 'ENTRADA DE JOGADOR'}</h3>
          
          <input 
            type="email" 
            placeholder="E-MAIL" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <input 
            type="password" 
            placeholder="SENHA" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          
          {erro && <p className="error">{erro}</p>}
          <button type="submit" className="btn-summon">LOGAR</button>
        </form>
      )}

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

        /* Efeito de Chamas Azuis/Roxas */
        .fire-wrapper {
          position: absolute;
          bottom: -50px;
          width: 100%;
          height: 500px;
          filter: blur(20px) contrast(30);
          background: #000;
          z-index: 1;
        }

        .fire {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .particle {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 100px;
          height: 100px;
          background: #4b0082; /* Roxo */
          border-radius: 50%;
          filter: blur(10px);
          animation: rise 4s infinite ease-in;
          opacity: 0.5;
        }

        .particle:nth-child(2n) { background: #0000ff; left: 40%; animation-delay: 1s; }
        .particle:nth-child(3n) { background: #8a2be2; left: 60%; animation-delay: 2s; }

        @keyframes rise {
          0% { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-600px) scale(0.1); opacity: 0; }
        }

        /* Caixa de Login Estilo Menu FF */
        .login-box-epic, .role-selection {
          position: relative;
          z-index: 10;
          background: rgba(0, 0, 40, 0.9);
          border: 2px solid #555;
          padding: 40px;
          border-radius: 4px;
          box-shadow: 0 0 20px rgba(75, 0, 130, 0.5);
          text-align: center;
          width: 350px;
        }

        h2, h3 { color: #fff; letter-spacing: 3px; margin-bottom: 20px; }

        input {
          width: 100%;
          padding: 12px;
          margin-bottom: 15px;
          background: #000;
          border: 1px solid #444;
          color: #fff;
          outline: none;
        }

        input:focus { border-color: #8a2be2; box-shadow: 0 0 10px #4b0082; }

        .btn-epic, .btn-summon {
          width: 100%;
          padding: 15px;
          background: transparent;
          border: 1px solid #fff;
          color: #fff;
          cursor: pointer;
          margin-bottom: 10px;
          transition: 0.3s;
        }

        .btn-epic:hover, .btn-summon:hover {
          background: #fff;
          color: #000;
          box-shadow: 0 0 15px #fff;
        }

        .back-link {
          background: none;
          border: none;
          color: #aaa;
          font-size: 10px;
          cursor: pointer;
          margin-bottom: 10px;
        }

        .error { color: #ff4444; font-size: 12px; }

        .fade-in { animation: fadeIn 1.5s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}