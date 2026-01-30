import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import forjaIcon from '../assets/forja.png';

export default function Forja({ vttDock }) { // RECEBE vttDock
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(null);
  const [form, setForm] = useState({ nome: '', descricao: '', imagem: '' });

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "game_items"), where("status", "==", "vault"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isOpen]);

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!form.nome) return alert("O item precisa de um nome!");
    try {
      const payload = { ...form, updatedAt: serverTimestamp() };
      if (isEditing) {
        await updateDoc(doc(db, "game_items", isEditing), payload);
        setIsEditing(null);
      } else {
        await addDoc(collection(db, "game_items"), { ...payload, status: "vault", ownerId: null, valorGil: 0, createdAt: serverTimestamp() });
      }
      setForm({ nome: '', descricao: '', imagem: '' });
    } catch (err) { alert("Erro ao forjar item."); console.error(err); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("ATENÇÃO: Isso destruirá o item permanentemente. Deseja continuar?")) {
      await deleteDoc(doc(db, "game_items", id));
    }
  };

  const handleEditClick = (item) => { setIsEditing(item.id); setForm(item); };
  const handleCancelEdit = () => { setIsEditing(null); setForm({ nome: '', descricao: '', imagem: '' }); };
  const filteredItems = items.filter(item => item.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <button 
        className={`forja-trigger-btn ${vttDock ? 'vtt-dock-style' : ''}`} 
        onClick={() => setIsOpen(true)} 
        title="Abrir Forja"
      >
        <img src={forjaIcon} alt="Forja" onError={(e) => {e.target.style.display='none'; e.target.parentNode.innerText='FORJA'}} />
      </button>

      {isOpen && (
        <div className="forja-overlay" onClick={() => setIsOpen(false)}>
          <div className="forja-modal" onClick={e => e.stopPropagation()}>
            <div className="forja-header">
              <h2>A FORJA ANTIGA</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>
            <div className="mestre-panel-forja">
                <h4 style={{color:'#f44', margin:'0 0 10px 0'}}>FORJAR NOVO ARTEFATO</h4>
                <form onSubmit={handleSaveItem} className="forja-form">
                  <div className="row">
                    <input placeholder="Nome do Artefato" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} className="forja-input" />
                    <input placeholder="URL da Imagem (Imgur)" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} className="forja-input" />
                  </div>
                  <textarea placeholder="Descrição detalhada e lore do item..." value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} className="forja-input area" />
                  <div className="form-actions">
                    <button type="submit" className="btn-forjar">{isEditing ? "REFUNDIR (SALVAR)" : "FORJAR ITEM"}</button>
                    {isEditing && <button type="button" onClick={handleCancelEdit} className="btn-cancel">CANCELAR</button>}
                  </div>
                </form>
            </div>
            <div className="search-bar-container-forja">
              <input type="text" placeholder="🔍 Buscar nos arquivos da forja..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input-forja" />
            </div>
            <div className="forja-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="forja-item-card">
                  <div className="item-img" style={{backgroundImage: `url(${item.imagem || 'https://via.placeholder.com/150?text=?'})`}}></div>
                  <div className="item-info">
                    <h4>{item.nome}</h4>
                    {item.ownerId && (<div className="owner-tag">COMPRADO POR: {item.buyerName || "Jogador"}</div>)}
                    <p className="desc">{item.descricao}</p>
                    <small style={{color: '#666'}}>Status: {item.ownerId ? "Cofre Pessoal" : "Cofre Global"}</small>
                  </div>
                  <div className="item-actions">
                    <button className="btn-icon edit" onClick={() => handleEditClick(item)} title="Editar">🔨</button>
                    <button className="btn-icon delete" onClick={() => handleDelete(item.id)} title="Destruir">🔥</button>
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && <p className="empty-msg">A forja está fria. Nenhum item no cofre.</p>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ESTILO PADRÃO (FIXO) */
        .forja-trigger-btn { position: fixed; bottom: 30px; right: 110px; width: 70px; height: 70px; border-radius: 50%; border: 2px solid #f44; background: #000; cursor: pointer; z-index: 9999; transition: transform 0.2s, box-shadow 0.2s; padding: 0; display: flex; align-items: center; justify-content: center; color: #f44; font-weight: bold; font-size: 10px; }
        .forja-trigger-btn:hover { transform: scale(1.1); box-shadow: 0 0 20px #f44; }
        .forja-trigger-btn img { width: 80%; height: 80%; object-fit: contain; }

        /* ESTILO QUANDO NO DOCK DO VTT (SOBRESCREVE O FIXO) */
        .forja-trigger-btn.vtt-dock-style {
            position: relative; 
            bottom: auto; 
            right: auto; 
            width: 50px; 
            height: 50px; 
            margin: 0; 
            z-index: auto;
            border: 2px solid #555;
            background: #111;
            box-shadow: 0 0 10px #000;
        }
        .forja-trigger-btn.vtt-dock-style:hover {
            border-color: #ffcc00;
            color: #ffcc00;
            transform: scale(1.1);
        }

        .forja-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .forja-modal { width: 800px; max-height: 90vh; background: #150a0a; border: 1px solid #f44; display: flex; flex-direction: column; box-shadow: 0 0 50px rgba(255, 68, 68, 0.2); border-radius: 8px; overflow: hidden; }
        .forja-header { background: linear-gradient(90deg, #2a0e0e, #000); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f44; }
        .forja-header h2 { margin: 0; color: #f44; font-family: serif; letter-spacing: 2px; text-shadow: 0 0 10px #f44; font-size: 24px; }
        .close-btn { background: transparent; border: none; color: #fff; font-size: 30px; cursor: pointer; }
        .mestre-panel-forja { background: rgba(255, 68, 68, 0.05); padding: 20px; border-bottom: 1px solid #333; }
        .forja-form { display: flex; flex-direction: column; gap: 10px; }
        .forja-form .row { display: flex; gap: 10px; }
        .forja-input { background: #000; border: 1px solid #522; color: #fff; padding: 10px; flex: 1; outline: none; font-family: serif; }
        .forja-input:focus { border-color: #f44; }
        .forja-input.area { height: 80px; resize: none; }
        .btn-forjar { flex: 1; background: #f44; border: none; padding: 12px; font-weight: bold; cursor: pointer; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        .btn-forjar:hover { background: #d00; box-shadow: 0 0 10px #d00; }
        .btn-cancel { background: #333; color: #fff; border: 1px solid #555; padding: 10px; cursor: pointer; }
        .search-bar-container-forja { padding: 15px; background: #000; border-bottom: 1px solid #333; }
        .search-input-forja { width: 100%; background: #111; border: 1px solid #522; color: #fff; padding: 12px; border-radius: 20px; text-align: center; outline: none; font-size: 16px; }
        .forja-grid { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; scrollbar-width: none; -ms-overflow-style: none; }
        .forja-grid::-webkit-scrollbar { display: none; }
        .forja-item-card { background: linear-gradient(90deg, rgba(40,10,10,0.9), rgba(0,0,0,0.8)); border: 1px solid #522; display: flex; align-items: center; padding: 10px; border-radius: 4px; transition: 0.2s; }
        .forja-item-card:hover { border-color: #f44; }
        .item-img { width: 70px; height: 70px; background-size: cover; background-position: center; border: 1px solid #633; margin-right: 15px; border-radius: 4px; background-color: #000; }
        .item-info { flex: 1; }
        .item-info h4 { margin: 0 0 5px 0; color: #fff; font-size: 18px; }
        .item-info .desc { margin: 0; color: #aaa; font-size: 12px; font-style: italic; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .owner-tag { background: #00f2ff; color: #000; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px; }
        .item-actions { display: flex; gap: 8px; margin-left: 15px; }
        .btn-icon { background: transparent; border: 1px solid #444; color: #fff; padding: 8px; cursor: pointer; border-radius: 4px; }
        .btn-icon:hover { background: #fff; color: #000; }
        .btn-icon.delete:hover { background: #f44; border-color: #f44; color: #fff; }
        .empty-msg { text-align: center; color: #666; margin-top: 50px; font-style: italic; }
      `}</style>
    </>
  );
}