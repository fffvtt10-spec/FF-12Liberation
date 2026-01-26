import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import videoFundo from '../assets/video-fundo.mp4'; 
import iconAdmin from '../assets/botao-admin.png';
import { db, login } from '../firebase'; // Certifique-se de importar o 'db'
import { doc, getDoc } from "firebase/firestore";

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
  e.preventDefault();
  setErro(""); // Limpa erros anteriores
  
  try {
    // 1. Faz o login no Firebase Auth
    const userCredential = await login(email, password);
    const user = userCredential.user;

    // 2. Busca o cargo (role) do usuário no Firestore usando o UID
    // Importante: Na AdminPage usamos user.uid como ID do documento
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();

      // 3. Validação: Se ele escolheu "NARRADOR" mas no banco é "jogador", ele não entra
      // Nota: 'role' (estado do clique) vs 'userData.role' (o que está no banco)
      if (role === 'master' && userData.role !== 'mestre') {
        setErro("ACESSO NEGADO: VOCÊ NÃO É UM MESTRE.");
        return;
      }

      // 4. Redirecionamento correto
      if (userData.role === 'mestre') {
        navigate('/mestre'); // Crie esta rota no seu App.jsx
      } else {
        navigate('/jogador'); // Crie esta rota no seu App.jsx
      }
    } else {
      setErro("USUÁRIO SEM PERFIL NO ÉTER.");
    }
  } catch (err) {
    console.error(err);
    setErro("FALHA NA CONEXÃO COM O ÉTER.");
  }
};

  return (
    <div className="login-container">
      {/* 1. VÍDEO DE FUNDO COM Z-INDEX 1 */}
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        preload="auto" 
        className="background-video"
      >
        <source src={videoFundo} type="video/mp4" />
      </video>

      {/* 2. OVERLAY TRANSPARENTE COM Z-INDEX 10 */}
      <div className="content-overlay">
        {!role ? (
          <div className="selection-screen fade-in">
            <h2 className="ff-title">ESCOLHA SUA CLASSE</h2>
            <div className="ff-button-group">
              <button className="ff-btn" onClick={() => setRole('player')}>JOGADOR</button>
              <button className="ff-btn" onClick={() => setRole('master')}>NARRADOR</button>
            </div>
          </div>
        ) : (
          <form className="login-panel fade-in" onSubmit={handleLogin}>
            <button type="button" className="ff-back" onClick={() => setRole(null)}>← RETORNAR</button>
            <h3 className="ff-subtitle">{role === 'master' ? 'NARRADOR' : 'JOGADOR'}</h3>
            <div className="ff-input-group">
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
            </div>
            {erro && <p className="ff-error">{erro}</p>}
            <button type="submit" className="ff-submit">ENTRAR</button>
          </form>
        )}
      </div>

      {/* 3. BOTÃO DE ADMIN (LION ICON) COM Z-INDEX 100 */}
      <button 
        className="admin-portal-btn" 
        onClick={() => navigate('/admin-login')} 
        title="Acesso ao Narrador"
      >
        <img src={iconAdmin} alt="Portal Admin" />
      </button>

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

        .background-video {
          position: absolute;
          top: 50%;
          left: 50%;
          min-width: 100%;
          min-height: 100%;
          width: auto;
          height: auto;
          z-index: 1; 
          transform: translate(-50%, -50%);
          object-fit: cover;
          animation: quickLoopFade 0.5s ease-in-out;
        }

        @keyframes quickLoopFade {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .content-overlay {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
        }

        .ff-title { 
          color: #fff; 
          font-size: 32px; 
          letter-spacing: 8px; 
          margin-bottom: 40px; 
          text-shadow: 0 0 15px rgba(255, 255, 255, 0.5); 
          text-align: center;
          font-family: 'serif'; /* Simula tipografia FF */
        }

        .ff-subtitle { color: #ffcc00; letter-spacing: 4px; margin-bottom: 30px; text-align: center; }
        .ff-button-group { display: flex; flex-direction: column; gap: 20px; align-items: center; }
        
        .ff-btn, .ff-submit {
          background: rgba(0, 0, 30, 0.6); 
          border: 1px solid rgba(255, 255, 255, 0.6);
          color: #fff;
          padding: 15px 50px;
          letter-spacing: 3px;
          cursor: pointer;
          transition: 0.4s;
          width: 280px;
          backdrop-filter: blur(5px);
          font-weight: bold;
        }

        .ff-btn:hover, .ff-submit:hover { 
          background: #fff; 
          color: #000; 
          box-shadow: 0 0 20px #fff; 
        }

        .ff-input-group input {
          display: block; 
          width: 300px; 
          padding: 12px; 
          margin: 0 auto 20px auto;
          background: rgba(0, 0, 0, 0.7); 
          border: 1px solid #444;
          color: #fff; 
          text-align: center; 
          letter-spacing: 2px; 
          outline: none;
        }

        .ff-input-group input:focus { border-color: #ffcc00; }
        .ff-back { background: none; border: none; color: #ffcc00; cursor: pointer; margin-bottom: 15px; display: block; font-weight: bold; }
        .ff-error { color: #ff4444; font-size: 12px; margin-bottom: 15px; text-shadow: 0 0 5px #000; }

        .admin-portal-btn {
          position: absolute;
          bottom: 30px;
          right: 30px;
          z-index: 100;
          background: none;
          border: none;
          cursor: pointer;
          width: 70px;
          transition: 0.5s;
          filter: drop-shadow(0 0 8px rgba(0, 242, 255, 0.6));
        }

        .admin-portal-btn img { width: 100%; height: auto; }
        .admin-portal-btn:hover { transform: scale(1.2) rotate(-5deg); filter: drop-shadow(0 0 15px #00f2ff); }

        .fade-in { animation: fadeInFF 2s ease-out forwards; }

        @keyframes fadeInFF {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}