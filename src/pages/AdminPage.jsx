import React, { useState, useEffect } from 'react';
import { auth, db, login } from '../firebase';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from "firebase/auth"; 
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('jogador'); 
  const [adminPass, setAdminPass] = useState('');

  useEffect(() => {
    if (backgroundMusic) {
      backgroundMusic.pause();
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 1. Busca Usuários
      const uSnap = await getDocs(collection(db, "users"));
      const usersData = uSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.email !== 'fffvtt10@gmail.com');

      // 2. Busca Personagens
      const cSnap = await getDocs(collection(db, "characters"));
      const charsData = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      setUsers(usersData);
      setCharacters(charsData);
    } catch (err) {
      console.error("Erro ao carregar dados do Éter: ", err);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    const adminEmail = 'fffvtt10@gmail.com'; 
    // !!! ATENÇÃO !!! VOCÊ PRECISA COLOCAR A SENHA REAL AQUI ABAIXO !!!
    const adminPassOriginal = 'SUA_SENHA_AQUI'; 

    try {
      // 1. Cria usuário (Desloga o admin)
      const userCredential = await createUserWithEmailAndPassword(auth, newEmail, newPassword);
      const user = userCredential.user;

      // 2. Salva no banco
      await setDoc(doc(db, "users", user.uid), {
        email: newEmail,
        role: newRole,
        active: true,
        createdAt: new Date()
      });

      alert("Usuário invocado! Reconectando Admin...");
      // 3. Reloga o admin (Isso quebrava sem a senha correta)
      await login(adminEmail, adminPassOriginal); 
      
      setNewEmail(''); setNewPassword(''); fetchData();
    } catch (err) {
      alert("Erro no processo (Verifique a senha no código!): " + err.message);
    }
  };

  const handleDeleteUser = async (id, email) => {
    if (window.confirm(`Deseja banir permanentemente ${email} do Éter?`)) {
      try {
        await deleteDoc(doc(db, "users", id));
        // Tenta deletar o personagem associado também
        await deleteDoc(doc(db, "characters", id)); 
        alert("Conta e personagem banidos com sucesso.");
        fetchData();
      } catch (err) {
        alert("Erro ao banir usuário: " + err.message);
      }
    }
  };

  // NOVA FUNÇÃO: Deleta APENAS o personagem, mantendo a conta
  const handleDeleteChar = async (uid) => {
    if (window.confirm("Tem certeza que deseja apagar APENAS o personagem deste usuário? Ele terá que criar outro.")) {
      try {
        await deleteDoc(doc(db, "characters", uid));
        alert("Personagem deletado. O usuário continua ativo.");
        fetchData();
      } catch (err) {
        alert("Erro ao deletar personagem: " + err.message);
      }
    }
  };

  const getCharName = (uid) => {
    const char = characters.find(c => c.uid === uid);
    return char ? char : null;
  };

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

  return (
    <div className="admin-dashboard">
      <div className="ether-vortex"></div>
      
      <div className="admin-content">
        <h1 className="main-title">GESTÃO DO ÉTER SUPREMO</h1>
        
        <div className="cards-grid">
          {/* Balão 1: Criar Conta */}
          <div className="ff-card fade-in">
            <h3>INVOCAR NOVA CONTA</h3>
            <form onSubmit={handleCreateUser}>
              <input type="email" placeholder="E-mail do Alvo" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              <input type="password" placeholder="Definir Senha Inicial" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="jogador">JOGADOR</option>
                <option value="mestre">MESTRE</option>
              </select>
              <button type="submit">CRIAR ACESSO</button>
            </form>
          </div>

          {/* Balão 2: Gerenciar Usuários e Seus Personagens */}
          <div className="ff-card fade-in">
            <h3>VIAJANTES E MESTRES</h3>
            <div className="list-box">
              {users.map(u => {
                const charInfo = getCharName(u.id);
                return (
                  <div key={u.id} className="item">
                    <div style={{flex: 1}}>
                      <span className={`badge ${u.role}`}>{u.role.toUpperCase()}</span>
                      <p className="email-text">{u.email}</p>
                      
                      {/* Exibir Personagem com botão de exclusão independente */}
                      {charInfo && (
                        <div style={{display: 'flex', alignItems: 'center', marginTop: '4px'}}>
                           <span style={{fontSize: '10px', color: '#ffcc00', marginRight: '10px'}}>
                             ⚔️ {charInfo.name} ({charInfo.class})
                           </span>
                           <button className="btn-mini-del" onClick={() => handleDeleteChar(u.id)} title="Apagar Personagem">
                             💀 Excluir Char
                           </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="btn-group">
                      <button onClick={() => {
                        sendPasswordResetEmail(auth, u.email);
                        alert("E-mail de reset enviado.");
                      }}>RESET</button>
                      <button className="del" onClick={() => handleDeleteUser(u.id, u.email)}>BANIR</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Balão 3: Minha Chave */}
          <div className="ff-card fade-in">
            <h3>MINHA CHAVE DE ADMIN</h3>
            <input type="password" placeholder="Nova Senha" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
            <button onClick={handleUpdateAdminPass}>TROCAR MINHA SENHA</button>
          </div>
        </div>
      </div>

      <style>{`
        .admin-dashboard { background: radial-gradient(circle at center, #001a33 0%, #000000 100%); min-height: 100vh; color: #fff; font-family: 'Segoe UI', sans-serif; position: relative; overflow: hidden; }
        .ether-vortex { content: ""; position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: conic-gradient(from 0deg, transparent, rgba(0, 242, 255, 0.08), transparent); animation: rotateEther 30s linear infinite; z-index: 0; pointer-events: none; }
        @keyframes rotateEther { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .admin-content { position: relative; z-index: 1; padding: 40px; }
        .main-title { color: #ffcc00; text-align: center; letter-spacing: 5px; margin-bottom: 50px; text-shadow: 0 0 10px #ffcc00; }
        .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 30px; }
        .ff-card { background: rgba(0, 10, 30, 0.85); border: 1px solid rgba(0, 242, 255, 0.5); padding: 25px; border-radius: 8px; box-shadow: 0 0 20px rgba(0,242,255,0.1); backdrop-filter: blur(10px); }
        h3 { color: #00f2ff; font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .item { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #111; }
        .email-text { font-size: 11px; color: #ccc; margin: 2px 0; overflow: hidden; text-overflow: ellipsis; }
        .badge { font-size: 9px; padding: 2px 6px; border-radius: 3px; font-weight: bold; color: #000; }
        .badge.mestre { background: #ffcc00; }
        .badge.jogador { background: #00f2ff; }
        .btn-group { display: flex; gap: 8px; align-items: center; }
        input, select { background: rgba(0,0,0,0.8); border: 1px solid #444; color: #fff; padding: 12px; width: 100%; margin-bottom: 15px; outline: none; transition: 0.3s; }
        input:focus { border-color: #ffcc00; }
        button { background: transparent; border: 1px solid #00f2ff; color: #fff; padding: 8px 15px; cursor: pointer; transition: 0.3s; font-size: 11px; }
        button:hover { background: #fff; color: #000; box-shadow: 0 0 10px #fff; }
        button.del { border-color: #ff4444; color: #ff4444; }
        button.del:hover { background: #ff4444; color: white; border-color: #ff4444; }
        .btn-mini-del { padding: 2px 6px; font-size: 9px; border-color: #ff4444; color: #ff4444; margin-left: 0; }
        .btn-mini-del:hover { background: #ff4444; color: #fff; }
        .list-box { max-height: 250px; overflow-y: auto; }
        .list-box::-webkit-scrollbar { width: 4px; }
        .list-box::-webkit-scrollbar-thumb { background: #00f2ff; }
        .fade-in { animation: fadeIn 1.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}