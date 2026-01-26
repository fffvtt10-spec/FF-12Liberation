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
    // Validação rígida de e-mail de mestre
    if (email !== 'fffvtt10@gmail.com') {
      setErro("VOCÊ NÃO TEM PERMISSÃO DE NARRADOR.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/painel-mestre'); // Redireciona para a página de gestão
    } catch (err) {
      setErro("SENHA INCORRETA PARA O MESTRE.");
    }
  };

  return (
    <div className="admin-login-screen">
      <form className="admin-box fade-in" onSubmit={handleAdminLogin}>
        <h2 className="title-gold">PORTAL DO MESTRE</h2>
        <div className="input-field">
          <input type="email" placeholder="E-MAIL DE NARRADOR" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="input-field">
          <input type="password" placeholder="CHAVE DE ACESSO" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {erro && <p className="error-msg">{erro}</p>}
        <button type="submit" className="btn-enter">LIBERAR PODER</button>
        <button type="button" className="btn-cancel" onClick={() => navigate('/')}>RETORNAR</button>
      </form>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-login-screen {
          height: 100vh; width: 100vw; background: #000;
          display: flex; align-items: center; justify-content: center;
        }
        .admin-box {
          background: rgba(0,0,30,0.95); border: 2px solid #ffcc00;
          padding: 50px; border-radius: 8px; text-align: center;
          box-shadow: 0 0 40px rgba(255, 204, 0, 0.2);
        }
        .title-gold { color: #ffcc00; letter-spacing: 5px; margin-bottom: 30px; text-shadow: 0 0 10px #ffcc00; }
        .input-field input {
          width: 300px; padding: 12px; margin-bottom: 15px;
          background: #000; border: 1px solid #444; color: #fff; text-align: center;
        }
        .input-field input:focus { border-color: #ffcc00; outline: none; }
        .btn-enter {
          width: 100%; padding: 15px; background: #ffcc00; color: #000;
          border: none; font-weight: bold; cursor: pointer; transition: 0.3s;
        }
        .btn-enter:hover { background: #fff; box-shadow: 0 0 20px #fff; }
        .btn-cancel { background: none; border: none; color: #888; margin-top: 15px; cursor: pointer; }
        .error-msg { color: #ff4444; font-size: 12px; margin-bottom: 15px; }
        .fade-in { animation: fadeIn 1s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}} />
    </div>
  );
}
//fim//