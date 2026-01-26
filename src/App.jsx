import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Caminhos corrigidos: Saindo de App.jsx e entrando direto em /pages/
import LoginPage from './pages/LoginPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminPage from './pages/AdminPage';

// ... restante do código (ProtectedAdminRoute e componente App)

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

  // Validação para o e-mail de mestre
  if (user && user.email === 'fffvtt10@gmail.com') {
    return children;
  }

  return <Navigate to="/admin-login" />;
};

export default function App() {
  return (
    // Com HashRouter, o basename não é estritamente necessário, mas ajuda na organização
    <Router>
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
}// fim