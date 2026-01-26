import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import videoFundo from '../assets/video-fundo.mp4'; // Adicionado import que faltava

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (email !== 'fffvtt10@gmail.com') {
      setErro("VOCÊ NÃO TEM PERMISSÃO DE NARRADOR.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin');
    } catch (err) {
      setErro("SENHA INCORRETA PARA O MESTRE.");
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
          <h3 className="ff-subtitle">PORTAL DO NARRADOR</h3>
          <div className="ff-input-group">
            <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="CHAVE DE ACESSO" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {erro && <p className="ff-error">{erro}</p>}
          <button type="submit" className="ff-submit">DESBLOQUEAR</button>
        </form>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .login-container { height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #000; }
        .background-video { position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%; transform: translate(-50%, -50%); object-fit: cover; z-index: 1; }
        .content-overlay { position: relative; z-index: 10; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
        .login-panel { 
          background: rgba(0, 0, 30, 0.7); 
          padding: 40px; 
          border: 1px solid #00f2ff; 
          backdrop-filter: blur(10px); 
          text-align: center;
          box-shadow: 0 0 20px rgba(0, 242, 255, 0.2);
        }
        .ff-subtitle { color: #ffcc00; letter-spacing: 4px; margin-bottom: 20px; }
        input { display: block; width: 280px; padding: 12px; margin: 10px auto; background: rgba(0,0,0,0.8); border: 1px solid #444; color: #fff; text-align: center; outline: none; }
        input:focus { border-color: #00f2ff; }
        .ff-submit { background: transparent; border: 1px solid #fff; color: #fff; padding: 12px 40px; cursor: pointer; transition: 0.3s; width: 100%; letter-spacing: 2px; }
        .ff-submit:hover { background: #fff; color: #000; box-shadow: 0 0 15px #fff; }
        .ff-back { background: none; border: none; color: #ffcc00; cursor: pointer; margin-bottom: 10px; }
        .fade-in { animation: fadeInFF 1.5s ease-out; }
        @keyframes fadeInFF { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}