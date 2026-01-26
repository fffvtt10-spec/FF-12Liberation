import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import videoFundo from '../assets/video-fundo.mp4'; 

export default function LoginPage() {
  const navigate = useNavigate();
  // ... estados de role, email, password (mantidos)

  return (
    <div className="login-container" style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      <video autoPlay loop muted playsInline style={{ position: 'absolute', zIndex: 1, width: '100%', height: '100%', objectFit: 'cover' }}>
        <source src={videoFundo} type="video/mp4" />
      </video>
      
      <div className="content" style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: 'rgba(0,0,0,0.5)' }}>
        {/* Seu conteúdo de formulário aqui */}
        <h2 style={{ color: '#fff' }}>TELA DE LOGIN ATIVA</h2>
      </div>
    </div>
  );
}