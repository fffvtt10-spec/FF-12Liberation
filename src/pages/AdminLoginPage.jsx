import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import videoFundo from '../assets/video-fundo.mp4'; 
import { backgroundMusic } from './LandingPage'; // Importar música global

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  // Garante que a música toque aqui também
  useEffect(() => {
    backgroundMusic.volume = 0.2;
    if (backgroundMusic.paused) {
      backgroundMusic.play().catch(() => {});
    }
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setErro(""); 

    const emailAdmin = import.meta.env.VITE_ADMIN_EMAIL; 

    if (email !== emailAdmin) {
      setErro("VOCÊ NÃO TEM PERMISSÃO DE NARRADOR.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // PARAR MÚSICA AO ENTRAR NO PAINEL
      backgroundMusic.pause();
      backgroundMusic.currentTime = 0;
      
      navigate('/admin'); 
    } catch (err) {
      console.error(err);
      setErro("SENHA INCORRETA OU FALHA NA CONEXÃO.");
    }
  };

  return (
    <div className="login-container">
      <video autoPlay loop muted playsInline className="background-video">
        <source src={videoFundo} type="video/mp4" />
      </video>
      
      <div className="content-overlay">
        <form className="login-panel fade-in" onSubmit={handleAdminLogin}>
          <button type="button" className="ff-back" onClick={() => navigate('/')}>← RETORNAR</button>
          <h3 className="ff-subtitle">PORTAL DO ADMINISTRADOR</h3>
          
          <div className="ff-input-group">
            <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="CHAVE DE ACESSO" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          
          {erro && <p className="ff-error" style={{color: '#ff4444', fontSize: '12px', marginBottom: '10px'}}>{erro}</p>}
          
          <button type="submit" className="ff-submit">DESBLOQUEAR</button>
        </form>
      </div>

      <style>{`
        .login-container { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #000; }
        .background-video { position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%; transform: translate(-50%, -50%); object-fit: cover; z-index: 1; }
        .content-overlay { position: absolute; top: 0; left: 0; z-index: 10; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); }
        .login-panel { background: rgba(0, 0, 30, 0.85); padding: 40px; border: 1px solid #00f2ff; backdrop-filter: blur(15px); text-align: center; box-shadow: 0 0 30px rgba(0, 242, 255, 0.3); width: 350px; }
        .ff-subtitle { color: #ffcc00; letter-spacing: 4px; margin-bottom: 25px; font-weight: bold; }
        .ff-input-group input { display: block; width: 100%; padding: 12px; margin: 10px 0; background: rgba(0,0,0,0.8); border: 1px solid #444; color: #fff; text-align: center; outline: none; box-sizing: border-box; }
        .ff-input-group input:focus { border-color: #00f2ff; box-shadow: 0 0 10px rgba(0, 242, 255, 0.2); }
        .ff-submit { background: transparent; border: 1px solid #fff; color: #fff; padding: 12px 40px; cursor: pointer; transition: 0.3s; width: 100%; letter-spacing: 2px; margin-top: 10px; }
        .ff-submit:hover { background: #fff; color: #000; box-shadow: 0 0 15px #fff; }
        .ff-back { background: none; border: none; color: #ffcc00; cursor: pointer; margin-bottom: 20px; font-size: 12px; }
        .fade-in { animation: fadeInFF 1.5s ease-out; }
        @keyframes fadeInFF { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}