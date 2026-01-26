import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; // Certifique-se de exportar 'db' do seu firebase.js
import { sendPasswordResetEmail, updatePassword } from "firebase/auth";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('player');
  const [adminPass, setAdminPass] = useState('');

  // 1. Carregar usuários do Firestore ao abrir
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // 2. Criar Conta (Apenas registro no Firestore para controle)
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

  // 3. Inativar/Ativar Conta
  const toggleStatus = async (id, currentStatus) => {
    await updateDoc(doc(db, "users", id), { active: !currentStatus });
    fetchUsers();
  };

  // 4. Enviar E-mail de Troca de Senha
  const handleResetEmail = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      alert("E-mail de recuperação enviado via Éter!");
    } catch (err) {
      alert("Erro ao enviar e-mail.");
    }
  };

  // 5. Trocar Própria Senha de Admin
  const handleUpdateAdminPass = async () => {
    if (adminPass.length < 6) return alert("Senha muito curta!");
    try {
      await updatePassword(auth.currentUser, adminPass);
      alert("Sua senha de mestre foi atualizada.");
      setAdminPass('');
    } catch (err) {
      alert("Erro na atualização. Re-logue para segurança.");
    }
  };

  return (
    <div className="admin-container">
      <h1 className="admin-title">PAINEL DO NARRADOR SUPREMO</h1>
      
      <div className="admin-grid">
        {/* Gestão de Usuários */}
        <section className="admin-card">
          <h2>GESTÃO DE CONTAS</h2>
          <form onSubmit={handleCreateUser} className="create-form">
            <input type="email" placeholder="Novo E-mail" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
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

        {/* Configurações do Mestre */}
        <section className="admin-card">
          <h2>CONFIGURAÇÕES DE ADMIN</h2>
          <div className="pass-change">
            <input type="password" placeholder="Nova Senha Admin" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
            <button onClick={handleUpdateAdminPass}>TROCAR MINHA SENHA</button>
          </div>
        </section>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-container { min-height: 100vh; background: #0a0a1a; color: #fff; padding: 40px; font-family: sans-serif; }
        .admin-title { text-align: center; letter-spacing: 5px; color: #ffcc00; text-shadow: 0 0 10px #ffcc00; margin-bottom: 40px; }
        .admin-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
        .admin-card { background: rgba(0,0,30,0.8); border: 1px solid #00f2ff; padding: 25px; border-radius: 8px; box-shadow: 0 0 20px rgba(0, 242, 255, 0.1); }
        h2 { color: #00f2ff; font-size: 18px; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; }
        .create-form { display: flex; gap: 10px; margin-bottom: 20px; }
        input, select { background: #000; border: 1px solid #444; color: #fff; padding: 10px; outline: none; }
        button { background: #ffcc00; color: #000; border: none; padding: 10px 15px; cursor: pointer; font-weight: bold; transition: 0.3s; }
        button:hover { background: #fff; box-shadow: 0 0 10px #fff; }
        .user-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #222; }
        .active { color: #00ff00; }
        .inactive { color: #ff4444; }
      `}} />
    </div>
  );
}   //fim