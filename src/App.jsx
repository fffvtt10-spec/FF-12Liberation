import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LoginPage from './components/LoginPage';
import AdminLoginPage from './components/AdminLoginPage';
import AdminPage from './components/AdminPage';

// Componente de Proteção de Rota
const ProtectedAdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Listener para persistência de login
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div style={{background: '#000', height: '100vh'}}></div>;

  // Validação rígida para o e-mail de mestre
  if (user && user.email === 'fffvtt10@gmail.com') {
    return children;
  }

  return <Navigate to="/admin-login" />;
};

export default function App() {
  return (
    <Router basename="/FF-12Liberation">
      <Routes>
        {/* Rota Pública de Login */}
        <Route path="/" element={<LoginPage />} />
        
        {/* Rota de Login do Admin (Acesso pelo Leão) */}
        <Route path="/admin-login" element={<AdminLoginPage />} />

        {/* Rota Protegida do Painel de Mestre */}
        <Route 
          path="/admin" 
          element={
            <ProtectedAdminRoute>
              <AdminPage />
            </ProtectedAdminRoute>
          } 
        />

        {/* Fallback para rotas não encontradas */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}