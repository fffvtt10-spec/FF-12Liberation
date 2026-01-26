import React, { useState, useRef } from 'react';
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import musicaTema from "./assets/musica-tema.mp3";

function App() {
  const [stage, setStage] = useState('landing');
  const audioRef = useRef(null);

  const handleStart = () => {
    // Inicia a música com volume baixo (0.2 vai de 0 a 1)
    if (audioRef.current) {
      audioRef.current.volume = 0.2;
      audioRef.current.play().catch(e => console.log("Erro ao tocar áudio:", e));
    }
    setStage('login');
  };

  return (
    <div className="app-container">
      <audio ref={audioRef} src={musicaTema} loop />
      {stage === 'landing' ? (
        <LandingPage onStart={handleStart} />
      ) : (
        <LoginPage />
      )}
    </div>
  );
}

const user = auth.currentUser;
if (user && user.email === 'fffvtt10@gmail.com') {
  return <AdminPage />;
} else {
  return <Redirect to="/login" />;
}

export default App;