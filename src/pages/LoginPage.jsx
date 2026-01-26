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
    try {
      await login(email, password);
    } catch (err) {
      setErro("FALHA NA CONEXÃO COM O ÉTER.");
    }
  };

  return (
    <div className="login-container">
      <video autoPlay loop muted playsInline className="background-video">
        <source src={videoFundo} type="video/mp4" />
      </video>

      <div className="content-overlay">
        {!role ? (
          <div className="selection-screen fade-in">
            <h2 className="ff-title">ESCOLHA SEU DESTINO</h2>
            <div className="ff-button-group">
              <button className="ff-btn" onClick={() => setRole('player')}>JOGADOR</button>
              <button className="ff-btn" onClick={() => setRole('master')}>NARRADOR</button>
            </div>
          </div>
        ) : (
          <form className="login-panel fade-in" onSubmit={handleLogin}>
            <button type="button" className="ff-back" onClick={() => setRole(null)}>❮ RETORNAR</button>
            <h3 className="ff-subtitle">{role === 'master' ? 'NARRADOR' : 'JOGADOR'}</h3>
            <div className="ff-input-group">
              <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} required />
              <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {erro && <p className="ff-error">{erro}</p>}
            <button type="submit" className="ff-submit">ENTRAR</button>
          </form>
        )}
      </div>

      <button className="admin-portal-btn" onClick={() => navigate('/admin-login')}>
        <img src={iconAdmin} alt="Portal Admin" />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .login-container { height: 100vh; width: 100vw; position: relative; overflow: hidden; background: #000; }
        .background-video { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
        .content-overlay { position: relative; z-index: 10; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
        .ff-title { color: #fff; text-shadow: 0 0 10px #00f2ff; letter-spacing: 5px; margin-bottom: 30px; text-align: center; }
        .ff-subtitle { color: #ffcc00; text-align: center; margin-bottom: 20px; }
        .ff-button-group { display: flex; flex-direction: column; gap: 15px; }
        .ff-btn, .ff-submit { background: rgba(0,0,30,0.8); border: 1px solid #00f2ff; color: #fff; padding: 15px 40px; cursor: pointer; transition: 0.3s; }
        .ff-btn:hover { background: #fff; color: #000; }
        input { display: block; width: 250px; padding: 10px; margin: 10px auto; background: #000; border: 1px solid #444; color: #fff; text-align: center; }
        .admin-portal-btn { position: absolute; bottom: 20px; right: 20px; z-index: 100; width: 60px; background: none; border: none; cursor: pointer; filter: drop-shadow(0 0 5px #00f2ff); }
        .ff-back { background: none; border: none; color: #ffcc00; cursor: pointer; margin-bottom: 10px; }
        .fade-in { animation: fadeIn 1s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}