import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../firebase';
import videoFundo from '../assets/video-fundo.mp4'; 
import iconAdmin from '../assets/botao-admin.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try { await login(email, password); } 
    catch (err) { setErro("FALHA NA CONEXÃO COM O ÉTER."); }
  };

  return (
    <div className="login-wrapper">
      <video autoPlay loop muted playsInline className="video-bg-layer">
        <source src={videoFundo} type="video/mp4" />
      </video>

      <div className="ui-overlay">
        {!role ? (
          <div className="glass-panel fade-in">
            <h2 className="ff-text-shadow">ESCOLHA SEU CAMINHO</h2>
            <div className="btn-stack">
              <button className="ff-btn-styled" onClick={() => setRole('player')}>JOGADOR</button>
              <button className="ff-btn-styled" onClick={() => setRole('master')}>MESTRE</button>
            </div>
          </div>
        ) : (
          <form className="glass-panel fade-in" onSubmit={handleLogin}>
            <button type="button" className="back-arrow" onClick={() => setRole(null)}>❮ VOLTAR</button>
            <h2 className="ff-text-shadow">{role.toUpperCase()}</h2>
            <div className="input-stack">
              <input type="email" placeholder="E-MAIL" onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="SENHA" onChange={e => setPassword(e.target.value)} required />
            </div>
            {erro && <p className="error-ether">{erro}</p>}
            <button type="submit" className="ff-btn-styled submit-glow">CONECTAR</button>
          </form>
        )}
      </div>

      <button className="lion-admin-btn" onClick={() => navigate('/admin-login')}>
        <img src={iconAdmin} alt="Admin Portal" />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-wrapper { height: 100vh; width: 100vw; position: relative; overflow: hidden; }
        .video-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
        .ui-overlay { position: relative; z-index: 10; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
        .glass-panel { 
          background: rgba(0, 0, 30, 0.75); border: 1px solid rgba(0, 242, 255, 0.4);
          padding: 40px; border-radius: 4px; backdrop-filter: blur(8px);
          box-shadow: 0 0 30px rgba(0, 242, 255, 0.15); text-align: center;
        }
        .ff-text-shadow { color: #fff; letter-spacing: 4px; text-shadow: 0 0 10px #00f2ff; margin-bottom: 30px; }
        .ff-btn-styled { 
          background: transparent; border: 1px solid #fff; color: #fff; 
          padding: 12px 50px; cursor: pointer; transition: 0.4s; letter-spacing: 2px;
          margin: 10px; width: 250px;
        }
        .ff-btn-styled:hover { background: #fff; color: #000; box-shadow: 0 0 20px #fff; }
        .input-stack input { 
          display: block; width: 280px; padding: 12px; margin: 10px auto;
          background: rgba(0,0,0,0.8); border: 1px solid #444; color: #fff; text-align: center;
        }
        .lion-admin-btn { 
          position: absolute; bottom: 30px; right: 30px; z-index: 100;
          background: none; border: none; cursor: pointer; transition: 0.5s;
          width: 70px; filter: drop-shadow(0 0 8px rgba(0, 242, 255, 0.6));
        }
        .lion-admin-btn:hover { transform: scale(1.2) rotate(-5deg); filter: grayscale(0%); }
        .back-arrow { background: none; border: none; color: #ffcc00; cursor: pointer; margin-bottom: 10px; display: block; }
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}