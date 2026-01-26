import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { sendPasswordResetEmail, updatePassword } from "firebase/auth"; 
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

export default function AdminPage() {
  // Estados para Gestão de Dados
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  
  // Estados para Formulários
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState(''); // Estado para a senha inicial
  const [newRole, setNewRole] = useState('player');
  const [adminPass, setAdminPass] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchCharacters();
  }, []);

  // Lógica de Busca
  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchCharacters = async () => {
    const querySnapshot = await getDocs(collection(db, "characters"));
    setCharacters(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // Lógica de Criação de Conta com Senha
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      // Salva os dados no Firestore para controle do Narrador
      await addDoc(collection(db, "users"), {
        email: newEmail,
        password: newPassword, // Senha definida manualmente
        role: newRole,
        active: true
      });
      setNewEmail('');
      setNewPassword(''); // Limpa o campo após criar
      fetchUsers();
      alert("Nova conta e senha registradas no Éter!");
    } catch (err) {
      alert("Erro ao invocar conta.");
    }
  };

  // Lógica de Exclusão de Personagem
  const handleDeleteChar = async (id) => {
    if (window.confirm("Banir este personagem permanentemente?")) {
      await deleteDoc(doc(db, "characters", id));
      fetchCharacters();
    }
  };

  // Lógica de Troca de Senha Própria
  const handleUpdateAdminPass = async () => {
    if (adminPass.length < 6) return alert("A senha deve ter no mínimo 6 caracteres.");
    try {
      await updatePassword(auth.currentUser, adminPass);
      alert("Sua chave de mestre foi alterada!");
      setAdminPass('');
    } catch (err) {
      alert("Erro ao trocar senha. Tente fazer login novamente.");
    }
  };

  // Lógica de Envio de E-mail de Reset
  const handleSendReset = (email) => {
    sendPasswordResetEmail(auth, email)
      .then(() => alert(`E-mail de recuperação enviado para ${email}`))
      .catch(() => alert("Erro ao enviar e-mail."));
  };

  return (
    <div className="admin-dashboard">
      <h1 className="main-title">GESTÃO DO ÉTER SUPREMO</h1>
      
      <div className="cards-grid">
        {/* Balão 1: Criar Conta com Senha */}
        <div className="ff-card fade-in">
          <h3>INVOCAR NOVA CONTA</h3>
          <form onSubmit={handleCreateUser}>
            <input 
              type="email" 
              placeholder="E-mail do Alvo" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
              required 
            />
            <input 
              type="password" 
              placeholder="Definir Senha Inicial" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              required 
            />
            <select value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="player">JOGADOR</option>
              <option value="master">NARRADOR</option>
            </select>
            <button type="submit">CRIAR ACESSO</button>
          </form>
        </div>

        {/* Balão 2: Gerenciar Usuários */}
        <div className="ff-card fade-in">
          <h3>VIAJANTES E MESTRES</h3>
          <div className="list-box">
            {users.map(u => (
              <div key={u.id} className="item">
                <span className={`badge ${u.role}`}>{u.role.toUpperCase()}</span>
                <p className="email-text">{u.email}</p>
                <button onClick={() => handleSendReset(u.email)}>ENVIAR RESET</button>
              </div>
            ))}
          </div>
        </div>

        {/* Balão 3: Personagens */}
        <div className="ff-card fade-in">
          <h3>PERSONAGENS ATIVOS</h3>
          <div className="list-box">
            {characters.map(c => (
              <div key={c.id} className="item">
                <span>{c.name}</span>
                <button className="del" onClick={() => handleDeleteChar(c.id)}>BANIR</button>
              </div>
            ))}
          </div>
        </div>

        {/* Balão 4: Minha Chave */}
        <div className="ff-card fade-in">
          <h3>MINHA CHAVE DE MESTRE</h3>
          <input 
            type="password" 
            placeholder="Nova Senha Admin" 
            value={adminPass} 
            onChange={e => setAdminPass(e.target.value)} 
          />
          <button onClick={handleUpdateAdminPass}>TROCAR MINHA SENHA</button>
        </div>
      </div>

      <style>{`
        .admin-dashboard { 
          background: radial-gradient(circle at center, #001a33 0%, #000000 100%); 
          min-height: 100vh; 
          padding: 40px; 
          color: #fff; 
          font-family: 'Segoe UI', sans-serif; 
          position: relative;
          overflow: hidden;
        }

        /* Vórtice de Éter Calmo */
        .admin-dashboard::before {
          content: "";
          position: absolute;
          top: -50%; left: -50%;
          width: 200%; height: 200%;
          background: conic-gradient(from 0deg, transparent, rgba(0, 242, 255, 0.05), transparent);
          animation: rotateEther 20s linear infinite;
          z-index: 0;
          pointer-events: none;
        }

        @keyframes rotateEther {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .main-title { position: relative; z-index: 1; color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 50px; text-shadow: 0 0 10px #ffcc00; }
        .cards-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 30px; }
        
        .ff-card { 
          background: rgba(0, 10, 30, 0.85); 
          border: 1px solid rgba(0, 242, 255, 0.5); 
          padding: 25px; 
          border-radius: 8px; 
          box-shadow: 0 0 20px rgba(0,242,255,0.1);
          backdrop-filter: blur(10px);
        }

        h3 { color: #00f2ff; font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; letter-spacing: 2px; }
        .item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #111; }
        .email-text { font-size: 13px; color: #ccc; margin: 0 10px; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; }
        .badge { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: #ffcc00; color: #000; font-weight: bold; }
        .badge.player { background: #00f2ff; }
        
        input, select { background: rgba(0,0,0,0.8); border: 1px solid #444; color: #fff; padding: 12px; width: 100%; margin-bottom: 15px; outline: none; transition: 0.3s; }
        input:focus { border-color: #ffcc00; box-shadow: 0 0 5px rgba(255, 204, 0, 0.3); }
        
        button { background: transparent; border: 1px solid #00f2ff; color: #fff; padding: 8px 15px; cursor: pointer; transition: 0.3s; font-size: 12px; }
        button:hover { background: #fff; color: #000; box-shadow: 0 0 10px #fff; }
        button.del:hover { background: #ff4444; border-color: #ff4444; color: white; }
        
        .list-box { max-height: 250px; overflow-y: auto; padding-right: 5px; }
        .list-box::-webkit-scrollbar { width: 4px; }
        .list-box::-webkit-scrollbar-thumb { background: #00f2ff; }
        
        .fade-in { animation: fadeIn 1.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}