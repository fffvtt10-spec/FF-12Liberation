import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage from './pages/AdminPage';
import MestrePage from './pages/MestrePage';
// Adicione a página de jogador para evitar erro de rota inexistente
const JogadorPage = () => <div style={{color: 'white'}}>PÁGINA DO JOGADOR EM CONSTRUÇÃO</div>;

// 1. Componente de Rota Protegida (Melhorado)
const ProtectedAdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{background: '#000', height: '100vh'}}></div>;
  
  // Verifica se é o seu e-mail de Admin Supremo
  if (user && user.email === 'fffvtt10@gmail.com') return children;

  return <Navigate to="/admin-login" />;
};

export default function App() {
  return (
    // Remova o <Router> daqui se ele já estiver no seu main.jsx
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Rota do Mestre */}
      <Route path="/mestre" element={<MestrePage />} /> 
      
      {/* Rota do Jogador */}
      <Route path="/jogador" element={<JogadorPage />} />

      <Route path="/admin-login" element={<AdminLoginPage />} />

      {/* 2. PROTEGENDO A PÁGINA ADMIN */}
      <Route 
        path="/admin" 
        element={
          <ProtectedAdminRoute>
            <AdminPage />
          </ProtectedAdminRoute>
        } 
      />
      
      {/* Rota de Fallback: Se digitar algo errado, volta para o início */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}