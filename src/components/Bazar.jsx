import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, deleteDoc, updateDoc, setDoc, doc, onSnapshot, query, where, orderBy, serverTimestamp } from "firebase/firestore"; 
import bazarIcon from '../assets/bazar.png'; 

export default function Bazar({ isMestre, playerData, vttDock }) { 
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]); 
  const [vaultItems, setVaultItems] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isEditing, setIsEditing] = useState(null); 
  const [selectedVaultId, setSelectedVaultId] = useState(""); 
  const [applyToAll, setApplyToAll] = useState(false);

  // --- ESTADO DO SISTEMA DE DIÁLOGOS (MODAL CUSTOMIZADO) ---
  const [dialog, setDialog] = useState({
    show: false,
    type: '', // 'alert', 'confirm', 'prompt'
    title: '',
    message: '',
    inputValue: 1, // Para o prompt de quantidade
    maxQuantity: 1, // Limite do input
    actionData: null, // Dados temporários (ex: item sendo comprado)
    onConfirm: null // Função a executar ao confirmar
  });

  const [form, setForm] = useState({
    nome: '',
    descricao: '',
    imagem: '',
    valorGil: '',
    valorReal: ''
  });

  const [requestedItems, setRequestedItems] = useState([]);

  // --- EFEITOS DE CARREGAMENTO ---
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
      const available = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(i => !i.ownerId);
      setVaultItems(available);
    });
    return () => unsub();
  }, [isOpen, isMestre]);

  useEffect(() => {
      if (!isMestre || !isOpen) return;
      const q = query(collection(db, "game_items"), where("status", "==", "requested"));
      const unsub = onSnapshot(q, (snap) => {
          setRequestedItems(snap.docs.map(d => ({id: d.id, ...d.data()})));
      });
      return () => unsub();
  }, [isMestre, isOpen]);


  // --- FUNÇÕES AUXILIARES DE DIÁLOGO ---
  const showAlert = (title, message) => {
    setDialog({ show: true, type: 'alert', title, message, onConfirm: closeDialog });
  };

  const closeDialog = () => {
    setDialog({ ...dialog, show: false, actionData: null, onConfirm: null });
  };

  // --- LÓGICA DO MESTRE (SALVAR/EDITAR) ---
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
    if (!form.nome || !form.valorGil) return showAlert("ERRO", "Preencha nome e valor em Gil!");

    try {
      const payload = { ...form, updatedAt: serverTimestamp() };

      if (isEditing) {
        await updateDoc(doc(db, "game_items", isEditing), payload);
        setIsEditing(null);
      } else if (selectedVaultId) {
        if (applyToAll) {
            const sameItems = vaultItems.filter(v => v.nome === form.nome);
            const batchPromises = sameItems.map(item => 
                updateDoc(doc(db, "game_items", item.id), { ...payload, status: 'bazar' })
            );
            await Promise.all(batchPromises);
            showAlert("SUCESSO", `${batchPromises.length} itens colocados à venda!`);
        } else {
            await updateDoc(doc(db, "game_items", selectedVaultId), { ...payload, status: 'bazar' });
        }
        setSelectedVaultId("");
      } else {
        await addDoc(collection(db, "game_items"), { ...payload, status: 'bazar', ownerId: null, createdAt: serverTimestamp() });
      }
      setForm({ nome: '', descricao: '', imagem: '', valorGil: '', valorReal: '' });
      setApplyToAll(false);
    } catch (err) {
      showAlert("ERRO", "Erro ao salvar item no Bazar.");
    }
  };

  const handleRemoveFromBazar = async (id) => {
    if (window.confirm("Remover do mercado? O item voltará para a Forja.")) {
      await updateDoc(doc(db, "game_items", id), { status: 'vault', updatedAt: serverTimestamp() });
    }
  };

  const handleApprovePurchaseGroup = async (group) => {
      if(!window.confirm(`Aprovar a entrega de ${group.length} itens para ${group[0].buyerName}?`)) return;
      try {
          const batchPromises = group.map(item => 
             updateDoc(doc(db, "game_items", item.id), { status: 'vault', updatedAt: serverTimestamp() })
          );
          await Promise.all(batchPromises);
          showAlert("APROVADO", "Venda aprovada! Itens enviados.");
      } catch (e) {
          showAlert("ERRO", "Erro ao aprovar.");
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


  // --- FLUXO DE COMPRA COM DIÁLOGOS CUSTOMIZADOS (ORDEM CORRIGIDA) ---

  // PASSO 3: Executa a compra no banco de dados
  const executePurchase = async (data) => {
    const { group, quantity, totalPrice, currentGil } = data;
    
    try {
        // 1. Atualiza Gil
        const newGil = currentGil - totalPrice;
        const charRef = doc(db, "characters", auth.currentUser.uid);
        const updatedSheet = JSON.parse(JSON.stringify(playerData.character_sheet));
        updatedSheet.inventory.gil = newGil;
        await setDoc(charRef, { character_sheet: updatedSheet }, { merge: true });

        // 2. Atualiza Itens
        const itemsToBuy = group.slice(0, quantity);
        const batchPromises = itemsToBuy.map(item => 
            updateDoc(doc(db, "game_items", item.id), { 
                status: 'requested', 
                ownerId: auth.currentUser.uid, 
                buyerName: playerData.name, 
                updatedAt: serverTimestamp() 
            })
        );
        await Promise.all(batchPromises);

        showAlert("SUCESSO", `Solicitação enviada! Saldo restante: ${newGil} Gil.`);

    } catch (err) {
        console.error(err);
        showAlert("ERRO CRÍTICO", "Falha na transação.");
    }
  };

  // PASSO 2: Usuário confirmou quantidade -> Validar Saldo -> Abre Confirmação de Valor
  const handleQuantityConfirmed = (qty, group) => {
    const quantity = parseInt(qty);
    if (isNaN(quantity) || quantity <= 0) return showAlert("ERRO", "Quantidade inválida.");
    if (quantity > group.length) return showAlert("ERRO", `Estoque insuficiente. Máximo: ${group.length}`);

    const refItem = group[0];
    const currentGil = playerData?.character_sheet?.inventory?.gil || 0;
    const unitPrice = Number(refItem.valorGil);
    const totalPrice = unitPrice * quantity;

    if (currentGil < totalPrice) {
        return showAlert("SALDO INSUFICIENTE", `Você tem ${currentGil} Gil. Custo total: ${totalPrice} Gil.`);
    }

    // Abre Modal de Confirmação Final
    setDialog({
        show: true,
        type: 'confirm',
        title: 'CONFIRMAR COMPRA',
        message: `Comprar ${quantity}x "${refItem.nome}" por ${totalPrice} Gil?`,
        actionData: { group, quantity, totalPrice, currentGil },
        onConfirm: executePurchase
    });
  };

  // PASSO 1: Usuário clica em comprar
  const handleBuyClick = (group) => {
    if (!auth.currentUser) return showAlert("ACESSO NEGADO", "Você precisa estar logado.");
    
    // ATUALIZAÇÃO: Se só tem 1 item, pula a pergunta de "Quantos?"
    if (group.length === 1) {
        handleQuantityConfirmed(1, group);
    } else {
        setDialog({
            show: true,
            type: 'prompt',
            title: 'QUANTIDADE',
            message: `Quantas unidades de "${group[0].nome}" deseja comprar?`,
            inputValue: 1,
            maxQuantity: group.length,
            actionData: group, 
            onConfirm: handleQuantityConfirmed
        });
    }
  };


  // --- VISUALIZAÇÃO ---
  const groupItems = (itemList) => {
      return itemList.reduce((acc, item) => {
          const key = `${item.nome}-${item.valorGil}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
      }, {});
  };

  const groupRequests = (reqList) => {
      return reqList.reduce((acc, item) => {
          const key = `${item.buyerName}-${item.nome}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
      }, {});
  };

  const filteredItems = items.filter(item => item.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const groupedDisplayItems = groupItems(filteredItems);
  const groupedRequests = groupRequests(requestedItems);

  const getSafeImage = (url) => {
      return (url && url.startsWith('http')) ? `url(${url})` : `url('https://via.placeholder.com/150?text=Item')`;
  };

  return (
    <>
      <button 
        className={`bazar-trigger-btn ${vttDock ? 'vtt-dock-style' : ''}`} 
        onClick={() => setIsOpen(true)} 
        title="Abrir Bazar"
      >
        <img src={bazarIcon} alt="Bazar" onError={(e) => {e.target.style.display='none'; e.target.parentNode.innerText='BAZAR'}} />
      </button>

      {isOpen && (
        <div className="bazar-overlay-flex" onClick={() => setIsOpen(false)}>
          <div className="bazar-modal-centered" onClick={e => e.stopPropagation()}>
            <div className="bazar-header">
              <h2>Bazar</h2>
              <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
            </div>

            {isMestre && (
              <div className="mestre-panel">
                {requestedItems.length > 0 && (
                    <div className="requests-box">
                        <h4>PEDIDOS DE COMPRA ({requestedItems.length})</h4>
                        {Object.values(groupedRequests).map((group, idx) => {
                            const req = group[0];
                            const totalValue = group.reduce((sum, i) => sum + Number(i.valorGil), 0);
                            return (
                                <div key={idx} className="request-row">
                                    <span>
                                        <strong>{req.buyerName}</strong>: {group.length}x {req.nome} (Total: {totalValue} G)
                                    </span>
                                    <button className="btn-approve" onClick={() => handleApprovePurchaseGroup(group)}>APROVAR</button>
                                </div>
                            );
                        })}
                    </div>
                )}

                <form onSubmit={handleSaveItem} className="bazar-form">
                  {!isEditing && (
                    <div className="row" style={{marginBottom: '10px', alignItems: 'center'}}>
                        <select className="bazar-input" onChange={handleSelectVaultItem} value={selectedVaultId}>
                            <option value="">📥 Item da Forja...</option>
                            {Array.from(new Set(vaultItems.map(v => v.nome))).map(nome => {
                                const item = vaultItems.find(v => v.nome === nome);
                                const count = vaultItems.filter(v => v.nome === nome).length;
                                return <option key={item.id} value={item.id}>{nome} (Estoque: {count})</option>;
                            })}
                        </select>
                        {selectedVaultId && (
                            <label style={{color: '#fff', fontSize: '12px', marginLeft: '10px', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                <input type="checkbox" checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)} />
                                Vender Todos
                            </label>
                        )}
                    </div>
                  )}
                  <div className="row">
                    <input placeholder="Nome" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} className="bazar-input" readOnly={!!selectedVaultId && !isEditing} />
                    <input placeholder="Imagem URL" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} className="bazar-input" />
                  </div>
                  <div className="row">
                    <input placeholder="Valor Gil" type="number" value={form.valorGil} onChange={e=>setForm({...form, valorGil: e.target.value})} className="bazar-input" required />
                    <input placeholder="R$ (Opcional)" type="number" value={form.valorReal} onChange={e=>setForm({...form, valorReal: e.target.value})} className="bazar-input" />
                  </div>
                  <textarea placeholder="Descrição..." value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} className="bazar-input area" />
                  <div className="form-actions">
                    <button type="submit" className="btn-save">{isEditing ? "SALVAR" : (selectedVaultId ? (applyToAll ? "VENDER LOTE" : "VENDER ITEM") : "CRIAR E VENDER")}</button>
                    {(isEditing || selectedVaultId) && <button type="button" onClick={handleCancelEdit} className="btn-cancel">CANCELAR</button>}
                  </div>
                </form>
              </div>
            )}

            <div className="search-bar-container">
              <input type="text" placeholder="🔍 Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
            </div>

            <div className="bazar-grid">
              {Object.values(groupedDisplayItems).map(group => {
                const item = group[0];
                const estoque = group.length;
                
                return (
                    <div key={item.id} className="bazar-item-card">
                    <div className="item-img" style={{backgroundImage: getSafeImage(item.imagem)}}></div>
                    <div className="item-info">
                        <div className="item-header-row">
                            <h4>{item.nome}</h4>
                            <span className="stock-badge">QTD: {estoque}</span>
                        </div>
                        <p className="desc">{item.descricao}</p>
                        <div className="prices">
                            <span className="price-tag gil">💰 {item.valorGil} G</span>
                            {item.valorReal && <span className="price-tag real">💎 R$ {item.valorReal}</span>}
                        </div>
                    </div>
                    <div className="item-actions">
                        {isMestre ? (
                        <>
                            <button className="btn-icon edit" onClick={() => handleEditClick(item)}>✏️</button>
                            <button className="btn-icon delete" onClick={() => handleRemoveFromBazar(item.id)}>🔙</button>
                        </>
                        ) : (
                        <button className="btn-buy" onClick={() => handleBuyClick(group)}>COMPRAR</button>
                        )}
                    </div>
                    </div>
                );
              })}
              {filteredItems.length === 0 && <p className="empty-msg">Mercado vazio.</p>}
            </div>
          </div>

          {/* --- MODAL CUSTOMIZADO (ALERT/CONFIRM/PROMPT) --- */}
          {dialog.show && (
            <div className="custom-dialog-overlay" onClick={(e) => e.stopPropagation()}>
                <div className="custom-dialog-box" onClick={(e) => e.stopPropagation()}>
                    <h3 className="dialog-title">{dialog.title}</h3>
                    <p className="dialog-msg">{dialog.message}</p>
                    
                    {dialog.type === 'prompt' && (
                        <div className="dialog-input-container">
                             <input 
                                type="number" 
                                min="1" 
                                max={dialog.maxQuantity}
                                value={dialog.inputValue} 
                                onChange={(e) => setDialog({...dialog, inputValue: e.target.value})}
                                className="dialog-input"
                                autoFocus
                             />
                             <small style={{color:'#888', display:'block', marginTop:'5px'}}>Máximo: {dialog.maxQuantity}</small>
                        </div>
                    )}

                    <div className="dialog-actions">
                        {dialog.type !== 'alert' && (
                            <button className="dialog-btn cancel" onClick={closeDialog}>CANCELAR</button>
                        )}
                        <button 
                            className="dialog-btn confirm" 
                            onClick={() => {
                                if (dialog.onConfirm) {
                                    if (dialog.type === 'prompt') dialog.onConfirm(dialog.inputValue, dialog.actionData);
                                    else dialog.onConfirm(dialog.actionData);
                                } else {
                                    closeDialog();
                                }
                            }}
                        >
                            {dialog.type === 'alert' ? 'OK' : 'CONFIRMAR'}
                        </button>
                    </div>
                </div>
            </div>
          )}

        </div>
      )}

      <style>{`
        /* ESTILO PADRÃO (FIXO) */
        .bazar-trigger-btn { position: fixed; bottom: 30px; right: 30px; width: 70px; height: 70px; border-radius: 50%; border: 2px solid #ffcc00; background: #000; cursor: pointer; z-index: 9999; transition: transform 0.2s, box-shadow 0.2s; padding: 0; display: flex; align-items: center; justify-content: center; }
        .bazar-trigger-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #ffcc00; }
        .bazar-trigger-btn img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }

        .bazar-trigger-btn.vtt-dock-style { position: relative; bottom: auto; right: auto; width: 50px; height: 50px; margin: 0; z-index: auto; border: 2px solid #555; background: #111; box-shadow: 0 0 10px #000; }
        .bazar-trigger-btn.vtt-dock-style:hover { border-color: #ffcc00; color: #ffcc00; transform: scale(1.1); }

        .bazar-overlay-flex { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .bazar-modal-centered { width: 800px; max-width: 95vw; height: 750px; max-height: 90vh; background: #0d0d15; border: 1px solid #ffcc00; display: flex; flex-direction: column; box-shadow: 0 0 50px rgba(0,0,0,0.8); border-radius: 8px; overflow: hidden; position: relative; }
        
        .bazar-header { background: linear-gradient(90deg, #1a1a1a, #000); padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ffcc00; }
        .bazar-header h2 { margin: 0; color: #ffcc00; font-family: serif; letter-spacing: 2px; text-shadow: 0 0 10px #ffcc00; font-size: 24px; }
        .close-btn { background: transparent; border: none; color: #fff; font-size: 30px; cursor: pointer; }
        
        .mestre-panel { background: rgba(255, 204, 0, 0.05); padding: 15px; border-bottom: 1px solid #333; }
        .requests-box { background: rgba(0, 242, 255, 0.1); border: 1px solid #00f2ff; padding: 10px; margin-bottom: 15px; border-radius: 4px; max-height: 150px; overflow-y: auto; }
        .requests-box h4 { color: #00f2ff; margin: 0 0 10px 0; font-size: 12px; }
        .request-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 12px; color: #fff; border-bottom: 1px solid rgba(0,242,255,0.2); padding-bottom: 2px; }
        .btn-approve { background: #00f2ff; color: #000; border: none; padding: 2px 8px; font-weight: bold; cursor: pointer; border-radius: 3px; font-size: 10px; }
        
        .bazar-form { display: flex; flex-direction: column; gap: 8px; }
        .bazar-form .row { display: flex; gap: 10px; }
        .bazar-input { background: #000; border: 1px solid #444; color: #fff; padding: 8px; flex: 1; outline: none; font-family: serif; font-size: 14px; }
        .bazar-input.area { height: 50px; resize: none; }
        .form-actions { display: flex; gap: 10px; }
        .btn-save { flex: 1; background: #ffcc00; border: none; padding: 8px; font-weight: bold; cursor: pointer; color: #000; }
        .btn-cancel { background: #333; color: #fff; border: 1px solid #555; padding: 8px; cursor: pointer; }
        
        .search-bar-container { padding: 10px 15px; background: #000; border-bottom: 1px solid #333; }
        .search-input { width: 100%; background: #111; border: 1px solid #444; color: #fff; padding: 10px; border-radius: 20px; text-align: center; outline: none; font-size: 16px; }
        
        .bazar-grid { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; }
        .bazar-item-card { background: linear-gradient(90deg, rgba(20,20,30,0.9), rgba(0,0,0,0.8)); border: 1px solid #444; display: flex; align-items: center; padding: 10px; border-radius: 4px; transition: 0.2s; }
        .bazar-item-card:hover { border-color: #00f2ff; box-shadow: 0 0 15px rgba(0, 242, 255, 0.1); }
        .item-img { width: 70px; height: 70px; background-size: cover; background-position: center; border: 1px solid #666; margin-right: 15px; border-radius: 4px; background-color: #000; }
        .item-info { flex: 1; }
        
        /* ALINHAMENTO DO HEADER DO ITEM */
        .item-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
        .item-header-row h4 { margin: 0; color: #fff; font-size: 18px; letter-spacing: 1px; }
        
        .item-info .desc { margin: 0 0 8px 0; color: #aaa; font-size: 12px; font-style: italic; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .stock-badge { font-size: 10px; background: #333; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #555; }
        
        .prices { display: flex; gap: 10px; }
        .price-tag { padding: 3px 6px; border-radius: 3px; font-weight: bold; font-size: 11px; }
        .price-tag.gil { background: rgba(255,255,0,0.1); color: #ffcc00; border: 1px solid #ffcc00; }
        .price-tag.real { background: rgba(0, 242, 255, 0.1); color: #00f2ff; border: 1px solid #00f2ff; }
        
        .item-actions { display: flex; gap: 8px; align-items: center; margin-left: 15px; }
        .btn-buy { background: #00f2ff; color: #000; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; clip-path: polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%); transition: 0.2s; }
        .btn-buy:hover { background: #fff; box-shadow: 0 0 15px #00f2ff; }
        .btn-icon { background: transparent; border: 1px solid #444; color: #fff; padding: 8px; cursor: pointer; border-radius: 4px; }
        .btn-icon:hover { background: #fff; color: #000; }
        
        /* ESTILOS DO MODAL CUSTOMIZADO */
        .custom-dialog-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100010; backdrop-filter: blur(2px); }
        .custom-dialog-box { width: 350px; background: #111; border: 2px solid #ffcc00; box-shadow: 0 0 30px #ffcc00; padding: 20px; text-align: center; border-radius: 8px; animation: popIn 0.2s ease-out; }
        .dialog-title { color: #ffcc00; margin: 0 0 10px 0; font-family: serif; text-transform: uppercase; letter-spacing: 2px; }
        .dialog-msg { color: #fff; margin-bottom: 20px; font-size: 14px; line-height: 1.4; }
        .dialog-input-container { margin-bottom: 20px; }
        .dialog-input { background: #000; color: #fff; border: 1px solid #ffcc00; padding: 10px; font-size: 18px; width: 80px; text-align: center; outline: none; border-radius: 5px; }
        .dialog-actions { display: flex; justify-content: center; gap: 15px; }
        .dialog-btn { padding: 10px 20px; border: none; cursor: pointer; font-weight: bold; text-transform: uppercase; border-radius: 3px; }
        .dialog-btn.confirm { background: #ffcc00; color: #000; box-shadow: 0 0 10px rgba(255, 204, 0, 0.4); }
        .dialog-btn.confirm:hover { background: #fff; transform: scale(1.05); }
        .dialog-btn.cancel { background: #333; color: #ccc; border: 1px solid #555; }
        .dialog-btn.cancel:hover { background: #444; color: #fff; }

        @keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}