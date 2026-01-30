import React, { useState, useEffect } from 'react';
import { auth, db, firebaseConfig } from '../firebase'; // Importa config para o App Secundário
import { initializeApp, deleteApp } from "firebase/app"; 
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updatePassword, connectAuthEmulator } from "firebase/auth"; 
import { collection, getDocs, deleteDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { backgroundMusic } from './LandingPage'; 
import videoFundo from '../assets/video-fundo.mp4'; 

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('jogador'); 
  const [adminPass, setAdminPass] = useState('');
  const [loading, setLoading] = useState(false); 

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

  // --- FUNÇÃO BLINDADA: CRIA USUÁRIO SEM DESLOGAR O ADMIN ---
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return alert("Preencha todos os campos!");

    setLoading(true);
    let secondaryApp = null;

    try {
      // 1. Cria uma instância temporária do Firebase
      secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
      const secondaryAuth = getAuth(secondaryApp);

      // Se estiver rodando local, força o app secundário a usar o emulador na porta 9099
      if (window.location.hostname === "localhost") {
        connectAuthEmulator(secondaryAuth, "http://127.0.0.1:9099");
      }

      // 2. Cria o usuário nessa instância (quem loga nela é o novo user, não o admin)
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      const newUser = userCredential.user;

      // 3. Salva os dados no Firestore usando a instância PRINCIPAL (db do Admin)
      await setDoc(doc(db, "users", newUser.uid), {
        email: newEmail,
        role: newRole,
        uid: newUser.uid,
        active: true,
        createdAt: serverTimestamp()
      });

      // 4. Desloga da instância secundária para limpar memória
      await signOut(secondaryAuth);

      alert(`Usuário ${newEmail} invocado com sucesso!`);
      setNewEmail('');
      setNewPassword('');
      fetchData(); // Atualiza a lista na tela

    } catch (err) {
      console.error(err);
      alert("Erro ao invocar usuário: " + err.message);
    } finally {
      // Destrói o app secundário
      if (secondaryApp) await deleteApp(secondaryApp);
      setLoading(false);
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
    <div className="admin-container">
       <video autoPlay loop muted playsInline className="background-video-admin">
        <source src={videoFundo} type="video/mp4" />
      </video>
      <div className="admin-overlay">
        <h1 className="admin-title">PAINEL DO NARRADOR</h1>

        <div className="admin-grid">
            {/* CARD DE CRIAR USUÁRIO */}
            <div className="admin-card">
                <h3>INVOCAR NOVO JOGADOR</h3>
                <form onSubmit={handleCreateUser}>
                    <input placeholder="E-mail Arcano" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
                    <input placeholder="Palavra-Passe" type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                    <select value={newRole} onChange={e => setNewRole(e.target.value)}>
                        <option value="jogador">Jogador</option>
                        <option value="mestre">Mestre Auxiliar</option>
                    </select>
                    <button type="submit" disabled={loading} className="btn-summon">
                        {loading ? "INVOCANDO..." : "CRIAR ACESSO"}
                    </button>
                </form>
            </div>

            {/* LISTA DE USUÁRIOS */}
            <div className="admin-card scroll-card">
                <h3>ALMAS REGISTRADAS ({users.length})</h3>
                <div className="list-container">
                    {users.map(u => {
                        const charInfo = getCharName(u.id);
                        return (
                            <div key={u.id} className="list-item">
                                <div className="item-info">
                                    <span className="item-main">{u.email}</span>
                                    <span className={`badge ${u.role}`}>{u.role.toUpperCase()}</span>
                                    {charInfo && (
                                        <span style={{fontSize: '10px', color: '#ffcc00', marginTop: '2px'}}>
                                            ⚔️ {charInfo.name}
                                        </span>
                                    )}
                                </div>
                                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                                    <button className="btn-ban" onClick={() => handleDeleteUser(u.id, u.email)}>BANIR</button>
                                    {charInfo && <button className="btn-ban" style={{borderColor:'#f80', color:'#f80'}} onClick={() => handleDeleteChar(u.id)}>DEL CHAR</button>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* TROCAR SENHA ADMIN */}
            <div className="admin-card">
                <h3>MINHA CHAVE MESTRA</h3>
                <input type="password" placeholder="Nova Senha" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
                <button className="btn-summon" style={{background:'#333', border:'1px solid #fff'}} onClick={handleUpdateAdminPass}>ATUALIZAR</button>
            </div>
        </div>
      </div>

      <style>{`
        .admin-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; font-family: 'Cinzel', serif; color: #fff; background: #000; }
        .background-video-admin { position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; object-fit: cover; transform: translate(-50%, -50%); opacity: 0.4; pointer-events: none; }
        .admin-overlay { position: relative; z-index: 10; padding: 40px; display: flex; flex-direction: column; height: 100%; }
        .admin-title { color: #ffcc00; text-align: center; font-size: 32px; letter-spacing: 5px; margin-bottom: 30px; text-shadow: 0 0 10px #ffcc00; }
        .admin-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; height: 100%; }
        .admin-card { background: rgba(0, 10, 20, 0.9); border: 1px solid #ffcc00; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; backdrop-filter: blur(10px); }
        .admin-card h3 { color: #00f2ff; border-bottom: 1px solid #333; padding-bottom: 10px; margin-top: 0; font-size: 16px; letter-spacing: 2px; }
        .scroll-card .list-container { overflow-y: auto; flex: 1; padding-right: 5px; }
        .scroll-card .list-container::-webkit-scrollbar { width: 5px; }
        .scroll-card .list-container::-webkit-scrollbar-thumb { background: #333; }
        
        input, select { background: #000; border: 1px solid #444; color: #fff; padding: 12px; width: 100%; margin-bottom: 15px; font-family: 'serif'; outline: none; }
        input:focus, select:focus { border-color: #ffcc00; }
        
        .btn-summon { width: 100%; background: #ffcc00; color: #000; border: none; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-summon:hover:not(:disabled) { background: #fff; box-shadow: 0 0 15px #fff; }
        .btn-summon:disabled { background: #333; color: #666; cursor: not-allowed; }

        .list-item { display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; margin-bottom: 8px; border-radius: 4px; border: 1px solid transparent; }
        .list-item:hover { border-color: #00f2ff; }
        .item-info { display: flex; flex-direction: column; }
        .item-main { font-weight: bold; color: #eee; font-size: 14px; }
        .item-sub { font-size: 10px; color: #aaa; }
        
        .badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #000; text-transform: uppercase; margin-right: 5px; }
        .badge.jogador { background: #00f2ff; }
        .badge.mestre { background: #ffcc00; }
        
        .btn-ban { background: transparent; border: 1px solid #f44; color: #f44; font-size: 10px; padding: 4px 8px; cursor: pointer; }
        .btn-ban:hover { background: #f44; color: #fff; }
      `}</style>
    </div>
  );
}