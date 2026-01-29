import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import chocoboGif from './assets/chocobo-loading.gif';

// --- IMPORTAÇÃO DAS PÁGINAS ---
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage from './pages/AdminPage';
import MestrePage from './pages/MestrePage';
import CharacterCreation from './pages/CharacterCreation';
import JogadorVttPage from './pages/JogadorVttPage';
import MestreVTTPage from './pages/MestreVTTPage'; // <--- IMPORTAÇÃO NOVA

// Rota do Jogador (Placeholder antigo, mantido por enquanto)
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
      if (initializing) setInitializing(false);
    });
    return unsubscribe;
  }, [initializing]);

  // Tela de Loading Inicial (Chocobo)
  if (initializing) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        overflow: 'hidden'
      }}>
        <img src={chocoboGif} alt="Loading..." style={{width: '100px', marginBottom: '20px', filter: 'drop-shadow(0 0 10px #ffcc00)'}} />
        <div style={{width: '200px', height: '4px', background: '#333', borderRadius: '2px', overflow: 'hidden'}}>
          <div className="progress-bar"></div>
        </div>
        <p style={{marginTop: '10px'}}>CARREGANDO...</p>
        <style>{`
          .progress-bar {
            height: 100%; background: #ffcc00; width: 0%;
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
      
      {/* Rotas do Mestre */}
      <Route path="/mestre" element={<MestrePage />} /> 
      <Route path="/mestre-vtt" element={<MestreVTTPage />} /> {/* <--- ROTA NOVA ADICIONADA */}
      
      {/* Rotas do Jogador */}
      <Route path="/jogador" element={<JogadorPage />} />
      <Route path="/create-character" element={<CharacterCreation />} />
      <Route path="/jogador-vtt" element={<JogadorVttPage />} />

      {/* Rotas de Admin */}
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route 
        path="/admin-dashboard" 
        element={
          <ProtectedAdminRoute user={user}>
            <AdminPage />
          </ProtectedAdminRoute>
        } 
      />
    </Routes>
  );
}