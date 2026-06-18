import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDocs } from "firebase/firestore";
import forjaIcon from '../assets/forja.png';
import { RARIDADES, DEFAULT_RARIDADE, getRaridadeById, syncRaridadeToEquippedSlots } from '../utils/itemRarity';

export default function Forja({ vttDock, hideTrigger, isOpen: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val) => {
    if (onOpenChange) onOpenChange(val);
    else setInternalOpen(val);
  };
  const [items, setItems] = useState([]); 
  const [characters, setCharacters] = useState([]); // NOVO ESTADO: Armazena os personagens do banco
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditing, setIsEditing] = useState(null);
  
  // --- NOVO ESTADO: FILTRO DE ITENS SEM USO ---
  const [showOnlyUnused, setShowOnlyUnused] = useState(false);

  // Adicionado campo quantidade ao formulário
  const [form, setForm] = useState({ nome: '', descricao: '', imagem: '', quantidade: 1, raridade: DEFAULT_RARIDADE });

  // Efeito para baixar os Itens da Forja e também a lista de Personagens para cruzar os dados
  useEffect(() => {
    if (!isOpen) return;

    // Busca os itens
    const qItems = query(collection(db, "game_items"), orderBy("createdAt", "desc"));
    const unsubItems = onSnapshot(qItems, (snap) => {
      const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(allItems.filter(i => i.status === 'vault' || i.ownerId));
    });

    // Busca os personagens para identificar de quem é o item
    const unsubChars = onSnapshot(collection(db, "characters"), (snap) => {
        setCharacters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubItems(); unsubChars(); };
  }, [isOpen]);

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!form.nome) return alert("O item precisa de um nome!");
    
    try {
      const payload = { 
        nome: form.nome,
        descricao: form.descricao,
        imagem: form.imagem,
        raridade: form.raridade || DEFAULT_RARIDADE,
        updatedAt: serverTimestamp() 
      };

      if (isEditing) {
        // Edição altera apenas o item específico selecionado
        await updateDoc(doc(db, "game_items", isEditing), payload);
        await syncRaridadeToEquippedSlots(db, updateDoc, getDocs, collection, isEditing, payload.raridade);
        setIsEditing(null);
      } else {
        // CRIAÇÃO EM LOTE: Cria N documentos baseados na quantidade informada
        const qtd = parseInt(form.quantidade) || 1;
        const batchPromises = [];
        
        for (let i = 0; i < qtd; i++) {
            batchPromises.push(addDoc(collection(db, "game_items"), { 
                ...payload, 
                status: "vault", 
                ownerId: null, 
                valorGil: 0, 
                createdAt: serverTimestamp() 
            }));
        }
        
        await Promise.all(batchPromises);
        alert(`${qtd} item(ns) forjado(s) com sucesso!`);
      }
      setForm({ nome: '', descricao: '', imagem: '', quantidade: 1, raridade: DEFAULT_RARIDADE });
    } catch (err) { alert("Erro ao forjar item."); console.error(err); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("ATENÇÃO: Isso destruirá o item permanentemente. Deseja continuar?")) {
      await deleteDoc(doc(db, "game_items", id));
    }
  };

  // NOVA FUNÇÃO: O mestre desafixa o item do jogador e joga direto pro Bazar
  const handleReturnToBazar = async (id) => {
      if (window.confirm("Desafixar item do jogador e retornar ao Bazar para venda?")) {
          await updateDoc(doc(db, "game_items", id), {
              ownerId: null,
              buyerName: null,
              status: 'bazar', // Vai direto pro bazar
              updatedAt: serverTimestamp()
          });
      }
  };

  const handleEditClick = (item) => { setIsEditing(item.id); setForm({...item, quantidade: 1}); }; // Na edição, qtde é irrelevante visualmente
  const handleCancelEdit = () => { setIsEditing(null); setForm({ nome: '', descricao: '', imagem: '', quantidade: 1, raridade: DEFAULT_RARIDADE }); };
  
  // Função Helper para pegar o nome do jogador pelo ID
  const getOwnerName = (ownerId, buyerNameFallback) => {
      if (!ownerId) return "";
      const char = characters.find(c => c.uid === ownerId || c.id === ownerId);
      if (char) return char.name || char.character_sheet?.basic_info?.character_name;
      return buyerNameFallback || "Jogador";
  };

  const groupItems = (itemList) => {
    return itemList.reduce((acc, item) => {
      const key = `${item.nome}-${item.raridade || DEFAULT_RARIDADE}-${item.ownerId || 'vault'}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  };

  // --- FILTRO APLICADO ---
  const filteredItems = items.filter(item => {
      const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const isUnused = showOnlyUnused ? !item.ownerId : true; // Se o filtro estiver ativo, mostra apenas itens que não tem dono
      return matchesSearch && isUnused;
  });

  const groupedDisplayItems = groupItems(filteredItems);

  return (
    <>
      {!hideTrigger && (
      <button 
        className={`forja-trigger-btn ${vttDock ? 'vtt-dock-style' : ''}`} 
        onClick={() => setOpen(true)} 
        title="Abrir Forja"
      >
        <img src={forjaIcon} alt="Forja" onError={(e) => {e.target.style.display='none'; e.target.parentNode.innerText='FORJA'}} />
      </button>
      )}

      {isOpen && (
        <div className="forja-overlay" onClick={() => setOpen(false)}>
          <div className="forja-modal" onClick={e => e.stopPropagation()}>
            <div className="forja-header">
              <h2>A FORJA ANTIGA</h2>
              <button className="close-btn" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="mestre-panel-forja">
                <h4 style={{color:'#f44', margin:'0 0 10px 0'}}>FORJAR NOVO ARTEFATO</h4>
                <form onSubmit={handleSaveItem} className="forja-form">
                  <div className="row">
                    <input placeholder="Nome do Artefato" value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} className="forja-input" />
                    <input placeholder="URL da Imagem (Imgur)" value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} className="forja-input" />
                  </div>
                  <div className="row">
                     {/* Input de Quantidade para criação em massa */}
                     {!isEditing && (
                         <div style={{flex: '0 0 100px'}}>
                             <input 
                                type="number" 
                                min="1" 
                                placeholder="Qtd." 
                                value={form.quantidade} 
                                onChange={e=>setForm({...form, quantidade: e.target.value})} 
                                className="forja-input" 
                                title="Quantidade de itens a criar"
                             />
                         </div>
                     )}
                     <textarea placeholder="Descrição detalhada e lore do item..." value={form.descricao} onChange={e=>setForm({...form, descricao: e.target.value})} className="forja-input area" style={{height: '40px'}} />
                  </div>
                  <div className="row">
                    <select
                      className="forja-input forja-rarity-select"
                      value={form.raridade || DEFAULT_RARIDADE}
                      onChange={e => setForm({ ...form, raridade: e.target.value })}
                    >
                      {RARIDADES.map((r) => (
                        <option key={r.id} value={r.id}>{r.nome} — {r.cor}</option>
                      ))}
                    </select>
                    <span className="rarity-preview" style={{ color: getRaridadeById(form.raridade).cor, borderColor: getRaridadeById(form.raridade).cor }}>
                      {getRaridadeById(form.raridade).nome}
                    </span>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-forjar">{isEditing ? "REFUNDIR (SALVAR)" : "FORJAR ITENS"}</button>
                    {isEditing && <button type="button" onClick={handleCancelEdit} className="btn-cancel">CANCELAR</button>}
                  </div>
                </form>
            </div>
            <div className="search-bar-container-forja" style={{display: 'flex', gap: '10px'}}>
              <input type="text" placeholder="🔍 Buscar nos arquivos da forja..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input-forja" />
              <button className="btn-filter-unused" onClick={() => setShowOnlyUnused(!showOnlyUnused)}>
                  {showOnlyUnused ? 'VER TODOS OS ITENS' : 'FILTRAR: SEM DONO'}
              </button>
            </div>
            <div className="forja-grid">
              {Object.values(groupedDisplayItems).map(group => {
                const item = group[0];
                const estoque = group.length;

                return (
                <div key={item.id} className="forja-item-card">
                  <div className="item-img" style={{backgroundImage: `url(${item.imagem || 'https://via.placeholder.com/150?text=?'})`}}></div>
                  <div className="item-info">
                    <div className="item-header-row">
                      <h4>{item.nome}</h4>
                      {estoque > 1 && <span className="stock-badge">QTD: {estoque}</span>}
                    </div>
                    <span className="rarity-tag" style={{ color: getRaridadeById(item.raridade).cor, borderColor: getRaridadeById(item.raridade).cor }}>
                      {getRaridadeById(item.raridade).nome}
                    </span>
                    {item.ownerId && (<div className="owner-tag">POSSE DE: {getOwnerName(item.ownerId, item.buyerName)}</div>)}
                    <p className="desc">{item.descricao}</p>
                    <small style={{color: '#666'}}>Status: {item.ownerId ? "Cofre Pessoal" : "Cofre Global"}</small>
                  </div>
                  <div className="item-actions">
                    {item.ownerId && (
                        <button className="btn-icon" onClick={() => handleReturnToBazar(item.id)} title="Desafixar e Retornar ao Bazar">♻️</button>
                    )}
                    <button className="btn-icon edit" onClick={() => handleEditClick(item)} title="Editar">🔨</button>
                    <button className="btn-icon delete" onClick={() => handleDelete(item.id)} title="Destruir">🔥</button>
                  </div>
                </div>
                );
              })}
              {filteredItems.length === 0 && <p className="empty-msg">A forja está fria. Nenhum item encontrado.</p>}
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
        .forja-rarity-select { flex: 1; cursor: pointer; }
        .rarity-preview, .rarity-tag { font-size: 11px; font-weight: bold; border: 1px solid; padding: 4px 10px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
        .rarity-preview { flex-shrink: 0; background: rgba(0,0,0,0.5); }
        .rarity-tag { display: inline-block; margin-bottom: 4px; }
        .btn-forjar { flex: 1; background: #f44; border: none; padding: 12px; font-weight: bold; cursor: pointer; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        .btn-forjar:hover { background: #d00; box-shadow: 0 0 10px #d00; }
        .btn-cancel { background: #333; color: #fff; border: 1px solid #555; padding: 10px; cursor: pointer; }
        .search-bar-container-forja { padding: 15px; background: #000; border-bottom: 1px solid #333; }
        .search-input-forja { width: 100%; background: #111; border: 1px solid #522; color: #fff; padding: 12px; border-radius: 20px; text-align: center; outline: none; font-size: 16px; }
        
        /* BOTÃO DE FILTRO NA FORJA */
        .btn-filter-unused { flex-shrink: 0; background: transparent; border: 1px solid #f44; color: #f44; padding: 0 15px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
        .btn-filter-unused:hover { background: #f44; color: #fff; }

        .forja-grid { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 15px; scrollbar-width: none; -ms-overflow-style: none; }
        .forja-grid::-webkit-scrollbar { display: none; }
        .forja-item-card { background: linear-gradient(90deg, rgba(40,10,10,0.9), rgba(0,0,0,0.8)); border: 1px solid #522; display: flex; align-items: center; padding: 10px; border-radius: 4px; transition: 0.2s; }
        .forja-item-card:hover { border-color: #f44; }
        .item-img { width: 70px; height: 70px; background-size: cover; background-position: center; border: 1px solid #633; margin-right: 15px; border-radius: 4px; background-color: #000; }
        .item-info { flex: 1; }
        .item-header-row { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
        .item-info h4 { margin: 0; color: #fff; font-size: 18px; }
        .stock-badge { font-size: 10px; background: #333; color: #fff; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #555; flex-shrink: 0; }
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