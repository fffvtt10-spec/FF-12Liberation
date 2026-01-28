import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import chocoboGif from './assets/chocobo-loading.gif';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage from './pages/AdminPage';
import MestrePage from './pages/MestrePage';
import CharacterCreation from './CharacterCreation'; // Importação mantida

// Rota do Jogador (Mantenha o recurso conforme solicitado)
const JogadorPage = () => <div style={{color: 'white', padding: '50px'}}>PÁGINA DO JOGADOR EM CONSTRUÇÃO</div>;

// Componente de Rota Protegida para Admin
const ProtectedAdminRoute = ({ user, children }) => {
  if (user && user.email === 'fffvtt10@gmail.com') return children;
  return <Navigate to="/admin-login" />;
};

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1. Escuta o estado do Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      // 2. Garante o tempo de 1 segundo para o carregamento do Chocobo e efeito de blur
      const timer = setTimeout(() => {
        setInitializing(false);
      }, 1000);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  // COMPONENTE DE LOADING (CHOCOBO + BLUR)
  if (initializing) {
    return (
      <div className="ether-loading">
        <div className="loading-blur-bg"></div>
        <div className="loading-content">
          <img src={chocoboGif} alt="Carregando..." className="chocobo-anim" />
          <div className="loading-bar">
            <div className="loading-fill"></div>
          </div>
          <p>SINTONIZANDO COM O ÉTER...</p>
        </div>
        <style>{`
          .ether-loading {
            height: 100vh; width: 100vw; background: #000;
            display: flex; align-items: center; justify-content: center;
            position: fixed; top: 0; left: 0; z-index: 9999;
          }
          .loading-blur-bg {
            position: absolute; width: 100%; height: 100%;
            background: radial-gradient(circle, #001a33 0%, #000 100%);
            filter: blur(40px);
            animation: pulseBlur 2s infinite alternate;
          }
          .loading-content { position: relative; z-index: 10; text-align: center; }
          .chocobo-anim { width: 120px; filter: drop-shadow(0 0 10px #ffcc00); margin-bottom: 20px; }
          
          .loading-bar {
            width: 200px; height: 2px; background: rgba(255, 255, 255, 0.1);
            margin: 0 auto 15px auto; border-radius: 10px; overflow: hidden;
          }
          .loading-fill {
            height: 100%; width: 0%; background: #ffcc00;
            box-shadow: 0 0 10px #ffcc00;
            animation: fillProgress 1s ease-in-out forwards;
          }
          
          p { color: #ffcc00; font-family: 'serif'; font-size: 10px; letter-spacing: 3px; animation: fadeText 1s infinite alternate; }
          
          @keyframes fillProgress { from { width: 0%; } to { width: 100%; } }
          @keyframes pulseBlur { from { opacity: 0.5; } to { opacity: 0.8; } }
          @keyframes fadeText { from { opacity: 0.4; } to { opacity: 1; } }
        `}</style>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rota do Mestre */}
      <Route path="/mestre" element={<MestrePage />} /> 
      
      {/* Rota do Jogador */}
      <Route path="/jogador" element={<JogadorPage />} />

      {/* NOVA ROTA ADICIONADA: CRIAÇÃO DE PERSONAGEM */}
      <Route path="/create-character" element={<CharacterCreation />} />

      <Route path="/admin-login" element={<AdminLoginPage />} />

      {/* PROTEGENDO A PÁGINA ADMIN (Passando o usuário atualizado) */}
      <Route 
        path="/admin" 
        element={
          <ProtectedAdminRoute user={user}>
            <AdminPage />
          </ProtectedAdminRoute>
        } 
      />
      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}