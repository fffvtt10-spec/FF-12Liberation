import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom'; // Adicionado o Import do Router
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* O HashRouter deve envolver o App para as rotas funcionarem */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
);