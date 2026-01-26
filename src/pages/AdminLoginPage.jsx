import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from 'react-router-dom';

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
      navigate('/admin'); // Corrigido para bater com a rota do App.jsx
    } catch (err) {
      setErro("SENHA INCORRETA PARA O MESTRE.");
    }
  };

  return (
    <div className="admin-login-screen">
      <form className="admin-box fade-in" onSubmit={handleAdminLogin}>
        <h2 className="title-gold">PORTAL DO MESTRE</h2>
        {erro && <p style={{color: 'red', fontSize: '12px'}}>{erro}</p>}
        <div className="input-field">
          <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="input-field">
          <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn-enter">ENTRAR</button>
        <button type="button" className="btn-back" onClick={() => navigate('/')}>RETORNAR</button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-login-screen { height: 100vh; width: 100vw; background: #000; display: flex; align-items: center; justify-content: center; }
        .admin-box { background: rgba(0,0,30,0.95); border: 2px solid #ffcc00; padding: 40px; text-align: center; }
        .title-gold { color: #ffcc00; margin-bottom: 20px; }
        input { width: 100%; padding: 10px; margin-bottom: 10px; background: #111; border: 1px solid #444; color: #fff; }
        .btn-enter { width: 100%; padding: 10px; background: #ffcc00; border: none; cursor: pointer; font-weight: bold; }
        .btn-back { background: none; border: none; color: #666; margin-top: 15px; cursor: pointer; }
      `}} />
    </div>
  );
}