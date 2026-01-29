import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, updateDoc, setDoc, doc, onSnapshot, query, where, orderBy, serverTimestamp } from "firebase/firestore"; // ADICIONADO setDoc
import bazarIcon from '../assets/bazar.png'; 

// AGORA ACEITA playerData PARA VERIFICAR SALDO
export default function Bazar({ isMestre, playerData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]); 
  const [vaultItems, setVaultItems] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isEditing, setIsEditing] = useState(null); 
  const [selectedVaultId, setSelectedVaultId] = useState(""); 

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    imagem: '',
    valorGil: '',
    valorReal: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, "game_items"), where("status", "==", "bazar"), orderBy("updatedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isMestre) return;
    const q = query(collection(db, "game_items"), where("status", "==", "vault"), orderBy("nome", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      // Filtra apenas os que não tem dono para venda geral
      const available = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => !i.ownerId);
      setVaultItems(available);
    });
    return () => unsub();
  }, [isOpen, isMestre]);

  const handleSelectVaultItem = (e) => {
    const vId = e.target.value;
    setSelectedVaultId(vId);
    if (!vId) return;

    const selected = vaultItems.find(v => v.id === vId);
    if (selected) {
      setForm({
        ...form,
        nome: selected.nome,
        descricao: selected.descricao,
        imagem: selected.imagem,
        valorGil: '', 
        valorReal: ''
      });
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.valorGil) return alert("Preencha nome e valor em Gil!");

    try {
      const payload = { ...form, updatedAt: serverTimestamp() };

      if (isEditing) {
        await updateDoc(doc(db, "game_items", isEditing), payload);
        setIsEditing(null);
      } else if (selectedVaultId) {
        await updateDoc(doc(db, "game_items", selectedVaultId), { ...payload, status: 'bazar' });
        setSelectedVaultId("");
      } else {
        await addDoc(collection(db, "game_items"), { ...payload, status: 'bazar', ownerId: null, createdAt: serverTimestamp() });
      }
      setForm({ nome: '', descricao: '', imagem: '', valorGil: '', valorReal: '' });
    } catch (err) {
      alert("Erro ao salvar item no Bazar.");
    }
  };

  const handleRemoveFromBazar = async (id) => {
    if (window.confirm("Remover do mercado? O item voltará para a Forja.")) {
      await updateDoc(doc(db, "game_items", id), { status: 'vault', updatedAt: serverTimestamp() });
    }
  };

  const handleBuyItem = async (item) => {
    if (!auth.currentUser) return alert("Você precisa estar logado.");
    
    // VERIFICAÇÃO DE SALDO
    const currentGil = playerData?.character_sheet?.inventory?.gil || 0;
    const price = Number(item.valorGil);

    if (currentGil < price) {
        return alert(`Saldo insuficiente! Você tem ${currentGil} Gil, mas o item custa ${price} Gil.`);
    }

    const confirm = window.confirm(`Comprar "${item.nome}" por ${item.valorGil} Gil?`);
    if (confirm) {
        try {
            // 1. Debita o valor do jogador
            const newGil = currentGil - price;
            
            // CORREÇÃO AQUI: Usar setDoc com merge em vez de updateDoc para evitar erro de "No document"
            const charRef = doc(db, "characters", auth.currentUser.uid);
            
            const updatedSheet = JSON.parse(JSON.stringify(playerData.character_sheet));
            updatedSheet.inventory.gil = newGil;
            
            // setDoc com merge = true garante que se o documento não existir (por algum erro), ele cria, 
            // e se existir, ele apenas atualiza o campo character_sheet
            await setDoc(charRef, { character_sheet: updatedSheet }, { merge: true });

            // 2. Atualiza o item para "solicitado"
            await updateDoc(doc(db, "game_items", item.id), { 
                status: 'requested', 
                ownerId: auth.currentUser.uid, 
                buyerName: playerData.name, 
                updatedAt: serverTimestamp() 
            });

            alert(`Solicitação enviada! O Mestre aprovará a entrega em breve. Saldo restante: ${newGil} Gil.`);
        } catch (err) {
            console.error("Erro na compra:", err);
            alert("Erro na transação. Verifique o console.");
        }
    }
  };

  // Se for mestre, ele vê itens 'requested' também para aprovar
  const [requestedItems, setRequestedItems] = useState([]);
  
  useEffect(() => {
      if (!isMestre || !isOpen) return;
      const q = query(collection(db, "game_items"), where("status", "==", "requested"));
      const unsub = onSnapshot(q, (snap) => {
          setRequestedItems(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      return () => unsub();
  }, [isMestre, isOpen]);

  const handleApprovePurchase = async (item) => {
      try {
          await updateDoc(doc(db, "game_items", item.id), { 
              status: 'vault', 
              ownerId: item.ownerId, 
              buyerName: item.buyerName, 
              updatedAt: serverTimestamp() 
          });
          
          alert(`Venda aprovada! O item "${item.nome}" foi enviado para o Cofre Pessoal de ${item.buyerName}.`);
      } catch (e) {
          alert("Erro ao aprovar.");
      }
  };

  const handleEditClick = (item) => {
    setIsEditing(item.id);
    setSelectedVaultId(""); 
    setForm(item);
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setSelectedVaultId("");
    setForm({ nome: '', descricao: '', imagem: '', valorGil: '', valorReal: '' });
  };

  const filteredItems = items.filter(item => item.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  // Função auxiliar para validar imagem e evitar erro de rede
  const getSafeImage = (url) => {
      return (url && url.startsWith('http')) ? `url(${url})` : `url('https://via.placeholder.com/150?text=Item')`;
  };

  return (
    <>
      <button className="bazar-trigger-btn" onClick={() => setIsOpen(true)} title="Abrir Bazar">
        <img src={bazarIcon} alt="Bazar" onError={(e) => {e.target.style.display='none'; e.target.parentNode.innerText='BAZAR'}} />
      </button>

      {isOpen && (
        <div className="bazar-overlay-flex" onClick={() => setIsOpen(false)}>
          <div className="bazar-modal-centered" onClick={e => e.stopPropagation()}>
            
            <div className="bazar-header">
              <h2>MERCADO NEGRO</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {isMestre && (
              <div className="mestre-panel">
                {/* ÁREA DE APROVAÇÃO DE VENDAS */}
                {requestedItems.length > 0 && (
                    <div className="requests-box">
                        <h4>PEDIDOS DE COMPRA ({requestedItems.length})</h4>
                        {requestedItems.map(req => (
                            <div key={req.id} className="request-row">
                                <span><strong>{req.buyerName}</strong> quer comprar <strong>{req.nome}</strong> ({req.valorGil} G)</span>
                                <button className="btn-approve" onClick={() => handleApprovePurchase(req)}>APROVAR ENTREGA</button>
                            </div>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSaveItem} className="bazar-form">
                  {!isEditing && (
                    <div className="row" style={{marginBottom: '10px'}}>
                        <select className="bazar-input" onChange={handleSelectVaultItem} value={selectedVaultId}>
                            <option value="">📥 Selecionar Item do Cofre (Forja)...</option>
                            {vaultItems.map(v => (<option key={v.id} value={v.id}>{v.nome}</option>))}
                        </select>
                    </div>
                  )}
                  <div className="row">
                    <input placeholder="Nome do Item" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} className="bazar-input" readOnly={!!selectedVaultId && !isEditing} />
                    <input placeholder="Link Imagem" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} className="bazar-input" />
                  </div>
                  <div className="row">
                    <input placeholder="Valor Gil" type="number" value={form.valorGil} onChange={e=>setForm({...form, valorGil: e.target.value})} className="bazar-input" required />
                    <input placeholder="Valor Real (R$)" type="number" value={form.valorReal} onChange={e=>setForm({...form, valorReal: e.target.value})} className="bazar-input" />
                  </div>
                  <textarea placeholder="Descrição do item..." value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} className="bazar-input area" />
                  <div className="form-actions">
                    <button type="submit" className="btn-save">{isEditing ? "SALVAR ALTERAÇÕES" : (selectedVaultId ? "COLOCAR À VENDA" : "CRIAR E VENDER")}</button>
                    {(isEditing || selectedVaultId) && <button type="button" onClick={handleCancelEdit} className="btn-cancel">CANCELAR</button>}
                  </div>
                </form>
              </div>
            )}

            <div className="search-bar-container">
              <input type="text" placeholder="🔍 Procurar mercadoria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
            </div>

            <div className="bazar-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="bazar-item-card">
                  <div className="item-img" style={{backgroundImage: getSafeImage(item.imagem)}}></div>
                  <div className="item-info">
                    <h4>{item.nome}</h4>
                    <p className="desc">{item.descricao}</p>
                    <div className="prices">
                      <span className="price-tag gil">💰 {item.valorGil} G</span>
                      {item.valorReal && <span className="price-tag real">💎 R$ {item.valorReal}</span>}
                    </div>
                  </div>
                  <div className="item-actions">
                    {isMestre ? (
                      <>
                        <button className="btn-icon edit" onClick={() => handleEditClick(item)} title="Editar Preço">✏️</button>
                        <button className="btn-icon delete" onClick={() => handleRemoveFromBazar(item.id)} title="Devolver para a Forja">🔙</button>
                      </>
                    ) : (
                      <button className="btn-buy" onClick={() => handleBuyItem(item)}>COMPRAR</button>
                    )}
                  </div>
                </div>
              ))}
              {filteredItems.length === 0 && <p className="empty-msg">Nenhum item à venda no momento.</p>}
            </div>

          </div>
        </div>
      )}

      <style>{`
        .bazar-trigger-btn { position: fixed; bottom: 30px; right: 30px; width: 70px; height: 70px; border-radius: 50%; border: 2px solid #ffcc00; background: #000; cursor: pointer; z-index: 9999; transition: transform 0.2s, box-shadow 0.2s; padding: 0; display: flex; align-items: center; justify-content: center; }
        .bazar-trigger-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #ffcc00; }
        .bazar-trigger-btn img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

        /* NOVO CSS PARA CENTRALIZAR O MODAL SEM CORTAR */
        .bazar-overlay-flex { 
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
            background: rgba(0,0,0,0.85); z-index: 100000; 
            display: flex; align-items: center; justify-content: center; 
            backdrop-filter: blur(5px); 
        }
        .bazar-modal-centered { 
            width: 800px; max-width: 95vw; 
            height: 750px; max-height: 90vh; /* Garante que cabe na tela */
            background: #0d0d15; border: 1px solid #ffcc00; 
            display: flex; flex-direction: column; 
            box-shadow: 0 0 50px rgba(0,0,0,0.8); border-radius: 8px; 
            overflow: hidden; 
        }

        .bazar-header { background: linear-gradient(90deg, #1a1a1a, #000); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ffcc00; }
        .bazar-header h2 { margin: 0; color: #ffcc00; font-family: serif; letter-spacing: 2px; text-shadow: 0 0 10px #ffcc00; font-size: 24px; }
        .close-btn { background: transparent; border: none; color: #fff; font-size: 30px; cursor: pointer; }

        .mestre-panel { background: rgba(255, 204, 0, 0.05); padding: 15px; border-bottom: 1px solid #333; }
        
        .requests-box { background: rgba(0, 242, 255, 0.1); border: 1px solid #00f2ff; padding: 10px; margin-bottom: 15px; border-radius: 4px; }
        .requests-box h4 { color: #00f2ff; margin: 0 0 10px 0; font-size: 12px; }
        .request-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 12px; color: #fff; }
        .btn-approve { background: #00f2ff; color: #000; border: none; padding: 5px 10px; font-weight: bold; cursor: pointer; border-radius: 3px; }

        .bazar-form { display: flex; flex-direction: column; gap: 10px; }
        .bazar-form .row { display: flex; gap: 10px; }
        .bazar-input { background: #000; border: 1px solid #444; color: #fff; padding: 10px; flex: 1; outline: none; font-family: serif; }
        .bazar-input.area { height: 60px; resize: none; }
        .form-actions { display: flex; gap: 10px; }
        .btn-save { flex: 1; background: #ffcc00; border: none; padding: 10px; font-weight: bold; cursor: pointer; color: #000; }
        .btn-cancel { background: #333; color: #fff; border: 1px solid #555; padding: 10px; cursor: pointer; }

        .search-bar-container { padding: 15px; background: #000; border-bottom: 1px solid #333; }
        .search-input { width: 100%; background: #111; border: 1px solid #444; color: #fff; padding: 12px; border-radius: 20px; text-align: center; outline: none; font-size: 16px; }

        .bazar-grid { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; scrollbar-width: none; -ms-overflow-style: none; }
        .bazar-grid::-webkit-scrollbar { display: none; }

        .bazar-item-card { background: linear-gradient(90deg, rgba(20,20,30,0.9), rgba(0,0,0,0.8)); border: 1px solid #444; display: flex; align-items: center; padding: 10px; border-radius: 4px; transition: 0.2s; }
        .bazar-item-card:hover { border-color: #00f2ff; box-shadow: 0 0 15px rgba(0, 242, 255, 0.1); }
        
        .item-img { width: 80px; height: 80px; background-size: cover; background-position: center; border: 1px solid #666; margin-right: 15px; border-radius: 4px; background-color: #000; }
        .item-info { flex: 1; }
        .item-info h4 { margin: 0 0 5px 0; color: #fff; font-size: 18px; letter-spacing: 1px; }
        .item-info .desc { margin: 0 0 10px 0; color: #aaa; font-size: 12px; font-style: italic; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        
        .prices { display: flex; gap: 10px; }
        .price-tag { padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 12px; }
        .price-tag.gil { background: rgba(255,255,0,0.1); color: #ffcc00; border: 1px solid #ffcc00; }
        .price-tag.real { background: rgba(0, 242, 255, 0.1); color: #00f2ff; border: 1px solid #00f2ff; }

        .item-actions { display: flex; gap: 8px; align-items: center; margin-left: 15px; }
        .btn-buy { background: #00f2ff; color: #000; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; clip-path: polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%); transition: 0.2s; }
        .btn-buy:hover { background: #fff; box-shadow: 0 0 15px #00f2ff; }
        
        .btn-icon { background: transparent; border: 1px solid #444; color: #fff; padding: 8px; cursor: pointer; border-radius: 4px; font-size: 16px; }
        .btn-icon:hover { background: #fff; color: #000; }
        .btn-icon.delete:hover { background: #f44; border-color: #f44; color: #fff; }
        .empty-msg { text-align: center; color: #666; margin-top: 50px; font-style: italic; }
      `}</style>
    </>
  );
}