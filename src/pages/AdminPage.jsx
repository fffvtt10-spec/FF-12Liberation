import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);

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

  const handleDeleteChar = async (id) => {
    if (window.confirm("Banir este personagem permanentemente?")) {
      await deleteDoc(doc(db, "characters", id));
      fetchCharacters();
    }
  };

  return (
    <div className="admin-container">
      <h1>PAINEL SUPREMO</h1>
      <div className="admin-sections">
        <section className="card">
          <h2>PERSONAGENS ATIVOS</h2>
          {characters.map(c => (
            <div key={c.id} className="item">
              <span>{c.name}</span>
              <button onClick={() => handleDeleteChar(c.id)}>APAGAR</button>
            </div>
          ))}
        </section>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .admin-container { background: #050510; min-height: 100vh; color: #fff; padding: 40px; }
        .card { background: rgba(0,0,40,0.8); border: 1px solid #00f2ff; padding: 20px; border-radius: 4px; }
        .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #222; }
        button { background: #ff4444; color: #fff; border: none; padding: 5px 10px; cursor: pointer; }
      `}} />
    </div>
  );
}