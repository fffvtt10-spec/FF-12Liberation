import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]); // Gerenciamento de personagens
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('player');
  const [adminPass, setAdminPass] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchCharacters();
  }, []);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const fetchCharacters = async () => {
    const querySnapshot = await getDocs(collection(db, "characters"));
    setCharacters(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, "users"), {
      email: newEmail,
      role: newRole,
      active: true
    });
    setNewEmail('');
    fetchUsers();
  };

  const toggleStatus = async (id, currentStatus) => {
    await updateDoc(doc(db, "users", id), { active: !currentStatus });
    fetchUsers();
  };

  const handleResetEmail = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Comunicação enviada via Éter!");
    } catch (err) {
      alert("Falha no envio.");
    }
  };

  // Função para apagar personagem de jogador
  const handleDeleteChar = async (id) => {
    if(window.confirm("Deseja banir este personagem permanentemente?")) {
      await deleteDoc(doc(db, "characters", id));
      fetchCharacters();
    }
  };

  const handleUpdateAdminPass = async () => {
    if (adminPass.length < 6) return alert("Mínimo de 6 caracteres.");
    try {
      await updatePassword(auth.currentUser, adminPass);
      alert("Senha de Mestre atualizada!");
      setAdminPass('');
    } catch (err) {
      alert("Erro na atualização. Faça login novamente.");
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">PAINEL DO NARRADOR SUPREMO</h1>
      
      <div className="admin-grid">
        <section className="admin-card">
          <h2>GESTÃO DE CONTAS</h2>
          <form onSubmit={handleCreateUser} className="create-form">
            <input type="email" placeholder="E-mail do Alvo" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
            <select value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="player">JOGADOR</option>
              <option value="master">NARRADOR</option>
            </select>
            <button type="submit">CADASTRAR</button>
          </form>

          <table className="user-table">
            <thead>
              <tr>
                <th>E-MAIL</th>
                <th>CLASSE</th>
                <th>STATUS</th>
                <th>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role.toUpperCase()}</td>
                  <td className={u.active ? 'active' : 'inactive'}>{u.active ? 'ATIVO' : 'INATIVO'}</td>
                  <td>
                    <button onClick={() => toggleStatus(u.id, u.active)}>STATUS</button>
                    <button onClick={() => handleResetEmail(u.email)}>SENHA</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="admin-sidebar">
          <section className="admin-card">
            <h2>CONFIGURAÇÕES DE ADMIN</h2>
            <div className="pass-change">
              <input type="password" placeholder="Nova Senha Admin" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
              <button onClick={handleUpdateAdminPass}>TROCAR MINHA SENHA</button>
            </div>
          </section>

          <section className="admin-card char-section">
            <h2>PERSONAGENS ATIVOS</h2>
            <div className="char-list">
              {characters.map(c => (
                <div key={c.id} className="char-item">
                  <span>{c.name}</span>
                  <button onClick={() => handleDeleteChar(c.id)} className="btn-delete">BANIR</button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-container { min-height: 100vh; background: #050510; color: #fff; padding: 40px; font-family: 'Segoe UI', sans-serif; }
        .admin-title { text-align: center; letter-spacing: 5px; color: #ffcc00; text-shadow: 0 0 10px #ffcc00; margin-bottom: 40px; }
        .admin-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
        .admin-card { background: rgba(10,10,40,0.9); border: 1px solid #00f2ff; padding: 25px; border-radius: 4px; margin-bottom: 20px; }
        h2 { color: #00f2ff; font-size: 16px; letter-spacing: 2px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .user-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #1a1a1a; }
        .active { color: #00ff00; }
        .inactive { color: #ff4444; }
        .char-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #222; }
        .btn-delete { background: #ff4444; color: white; border: none; padding: 5px 10px; cursor: pointer; font-size: 10px; }
        .btn-delete:hover { background: #ff0000; }
        button { cursor: pointer; transition: 0.3s; }
      `}} />
    </div>
  );
}