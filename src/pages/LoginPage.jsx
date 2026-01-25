// src/components/LoginPage.jsx
import React, { useState } from 'react';
import { login, signUp } from '../firebase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      alert("Welcome to the Battle!");
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="login-screen">
      <div className="fft-window">
        <h3>SOLDIER OFFICE</h3>
        <form onSubmit={handleLogin} className="fft-form">
          <div className="input-group">
            <label>NAME (EMAIL)</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="ramza@beoulve.com"
            />
          </div>
          
          <div className="input-group">
            <label>CODE (PASSWORD)</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          <div className="menu-list">
            <button type="submit" className="fft-button">☞ DEPLOY (LOGIN)</button>
            <button type="button" onClick={() => signUp(email, password)} className="fft-button">
              ☞ RECRUIT (SIGN UP)
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .fft-form { display: flex; flex-direction: column; gap: 15px; }
        .input-group { display: flex; flex-direction: column; gap: 5px; }
        .input-group label { font-size: 10px; color: var(--fft-gold); }
        input {
          background: rgba(0,0,0,0.5);
          border: 1px solid var(--fft-border);
          color: white;
          padding: 8px;
          font-family: var(--font-pixel);
          outline: none;
        }
        .fft-button {
          background: none; border: none; color: white;
          font-family: var(--font-pixel); text-align: left;
          cursor: pointer; padding: 5px 0;
        }
        .fft-button:hover { color: var(--fft-gold); }
      `}</style>
    </div>
  );
}