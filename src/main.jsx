import React from 'react'; // Adicione no topo do main.jsxgit mv src/pages/App.jsx src/pages/AppTemp.jsx
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Inicializa o React DOM
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)