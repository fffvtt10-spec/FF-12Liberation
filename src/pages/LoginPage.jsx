import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importado
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
              <button className="ff-button" onClick={() => setRole('player')}>JOGADOR</button>
              <button className="ff-button" onClick={() => setRole('master')}>MESTRE</button>
            </div>
          </div>
        ) : (
          <form className="login-box fade-in" onSubmit={handleLogin}>
            <button className="ff-back" onClick={() => setRole(null)}>❮ VOLTAR</button>
            <h2 className="ff-title">{role === 'master' ? 'NARRADOR' : 'VIAJANTE'}</h2>
            {erro && <p className="ff-error">{erro}</p>}
            <input type="email" placeholder="E-MAIL" onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="SENHA" onChange={e => setPassword(e.target.value)} required />
            <button type="submit" className="ff-button-submit">CONECTAR</button>
          </form>
        )}
      </div>

      {/* Botão de Admin corrigido com navigate */}
      <button className="admin-portal-btn" onClick={() => navigate('/admin-login')}>
        <img src={iconAdmin} alt="Portal Admin" />
      </button>

      {/* Estilos... (mantidos conforme o seu original) */}
    </div>
  );
}