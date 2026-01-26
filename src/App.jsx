import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage from './pages/AdminPage';
import MestrePage from './pages/MestrePage';
import JogadorPage from './pages/JogadorPage';

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
  if (user && user.email === 'fffvtt10@gmail.com') return children;

  return <Navigate to="/admin-login" />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/mestre" element={<MestrePage />} /> {/* Rota do Mestre */}
      <Route path="/jogador" element={<JogadorPage />} /> {/* Rota do Jogador */}
      <Route path="/admin-login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}