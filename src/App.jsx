import React, { useState } from 'react';
import LandingPage from "./pages/LandingPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";

function App() {
  const [stage, setStage] = useState('landing');
// 'landing' ou 'login'
  return (
    <div className="app-container">
      {stage === 'landing' ? (
        <LandingPage onStart={() => setStage('login')} />
      ) : (
        <LoginPage />
      )}
    </div>
  );
}

export default App;