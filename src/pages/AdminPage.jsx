import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { sendPasswordResetEmail, updatePassword } from "firebase/auth"; // Adicionado para reset e troca de senha
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

export default function AdminPage() {
  // Estados para Gestão de Dados
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  
  // Estados para Formulários
  const [newEmail, setNewEmail] = useState('');
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

  // Lógica de Criação de Conta
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "users"), {
        email: newEmail,
        role: newRole,
        active: true
      });
      setNewEmail('');
      fetchUsers();
      alert("Nova conta registrada no sistema!");
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
        {/* Balão 1: Criar Conta */}
        <div className="ff-card fade-in">
          <h3>INVOCAR NOVA CONTA</h3>
          <form onSubmit={handleCreateUser}>
            <input 
              type="email" 
              placeholder="E-mail" 
              value={newEmail} 
              onChange={e => setNewEmail(e.target.value)} 
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
        .admin-dashboard { background: #000; min-height: 100vh; padding: 40px; color: #fff; font-family: 'Segoe UI', sans-serif; }
        .main-title { color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 50px; text-shadow: 0 0 10px #ffcc00; }
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 30px; }
        .ff-card { 
          background: rgba(0, 20, 50, 0.8); 
          border: 1px solid #00f2ff; 
          padding: 25px; 
          border-radius: 8px; 
          box-shadow: 0 0 15px rgba(0,242,255,0.2);
          backdrop-filter: blur(8px);
        }
        h3 { color: #00f2ff; font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; letter-spacing: 2px; }
        .item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #111; }
        .email-text { font-size: 13px; color: #ccc; margin: 0 10px; flex-grow: 1; overflow: hidden; text-overflow: ellipsis; }
        .badge { font-size: 10px; padding: 2px 6px; border-radius: 3px; background: #ffcc00; color: #000; font-weight: bold; }
        .badge.player { background: #00f2ff; }
        input, select { background: rgba(0,0,0,0.8); border: 1px solid #444; color: #fff; padding: 10px; width: 100%; margin-bottom: 15px; outline: none; }
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