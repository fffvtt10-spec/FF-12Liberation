import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, addDoc, getDocs } from "firebase/firestore";

/* ESTRUTURA DO FIRESTORE (Coleção: 'guild_fraternidade'):
  {
    originalCharId: string, 
    name: string,
    race: string,
    class: string,
    level: number,
    photo: string,
    mvpScore: number, (0-100)
    status: 'active' | 'dead',
    order: number,
    missions: []
  }
*/

const GuildBoard = ({ isMaster }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  // Estados para formulário de nova missão (apenas Mestre)
  const [newMissionName, setNewMissionName] = useState("");
  const [newMissionRank, setNewMissionRank] = useState("D");

  // Escuta a coleção da guilda (dados visuais)
  useEffect(() => {
    const q = query(collection(db, "guild_fraternidade"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(data);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE SINCRONIZAÇÃO (MESTRE) ---
  // CORREÇÃO: Agora busca na coleção 'characters' e verifica estrutura aninhada
  const syncWithCharacters = async () => {
    if (!isMaster) return;
    
    try {
        console.log("Iniciando sincronização...");
        // 1. Busca na coleção correta: 'characters'
        const charsRef = collection(db, "characters"); 
        const charsSnap = await getDocs(charsRef);
        
        if (charsSnap.empty) {
            alert("Nenhum personagem encontrado na coleção 'characters'.");
            return;
        }

        const activeFichas = charsSnap.docs.map(d => {
            const data = d.data();
            // Tenta pegar dados da raiz OU do character_sheet (fallback robusto)
            const sheet = data.character_sheet || {};
            const info = sheet.basic_info || {};

            return { 
                id: d.id, 
                // Prioridade: Raiz -> character_sheet.basic_info -> Padrão
                name: data.name || data.nome || info.name || "Sem Nome",
                race: data.race || data.raca || info.race || "?",
                class: data.class || data.classe || info.class || "?",
                level: data.level || data.nivel || info.level || 1,
                // Imagem pode estar em vários lugares
                photo: data.imagemUrl || data.photo || sheet.imgUrl || "https://via.placeholder.com/100"
            };
        });

        console.log("Fichas encontradas:", activeFichas);

        // 2. Processa atualização/criação
        for (let ficha of activeFichas) {
            // Ignora fichas sem nome ou muito vazias se necessário
            if (ficha.name === "Sem Nome") continue;

            const exists = members.find(m => m.originalCharId === ficha.id);
            
            if (!exists) {
                // Adiciona novo membro
                const newOrder = members.length + 1;
                await addDoc(collection(db, "guild_fraternidade"), {
                    originalCharId: ficha.id,
                    name: ficha.name,
                    race: ficha.race,
                    class: ficha.class,
                    level: Number(ficha.level),
                    photo: ficha.photo,
                    mvpScore: 0,
                    status: 'active',
                    order: newOrder,
                    missions: []
                });
            } else {
                // Atualiza existente (Level, Foto, Classe mudam com o tempo)
                const memberRef = doc(db, "guild_fraternidade", exists.id);
                await updateDoc(memberRef, {
                    name: ficha.name,
                    race: ficha.race,
                    class: ficha.class,
                    level: Number(ficha.level),
                    photo: ficha.photo,
                    // Garante que se o mestre marcou 'active' manualmente ou sync, ele fique ativo
                    // Se quiser que R.I.P seja permanente até o mestre tirar, remova a linha abaixo:
                    status: exists.status === 'dead' ? 'dead' : 'active' 
                });
            }
        }

        // 3. Opcional: Marcar como R.I.P quem foi deletado do banco 'characters'
        // (Cuidado: as vezes deletam a ficha pra refazer, então o R.I.P pode ser manual)
        // Vou deixar manual para evitar acidentes, ou descomente abaixo:
        /*
        for (let member of members) {
            const stillActive = activeFichas.find(f => f.id === member.originalCharId);
            if (!stillActive && member.status !== 'dead') {
                await updateDoc(doc(db, "guild_fraternidade", member.id), { status: 'dead' });
            }
        }
        */

        alert(`Sincronização concluída! ${activeFichas.length} personagens verificados.`);
    } catch (error) {
        console.error("Erro detalhado ao sincronizar:", error);
        alert("Erro ao sincronizar. Veja o console (F12) para detalhes.");
    }
  };

  // --- DRAG AND DROP (MESTRE) ---
  const handleDragStart = (index) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = async (index) => {
    if (!isMaster || draggedItemIndex === null) return;
    
    const newMembers = [...members];
    const [draggedItem] = newMembers.splice(draggedItemIndex, 1);
    newMembers.splice(index, 0, draggedItem);

    setMembers(newMembers); 
    setDraggedItemIndex(null);

    // Atualiza ordem no Firestore
    for (let i = 0; i < newMembers.length; i++) {
        const member = newMembers[i];
        if (member.order !== i + 1) {
            await updateDoc(doc(db, "guild_fraternidade", member.id), { order: i + 1 });
        }
    }
  };

  // --- GESTÃO DE DADOS DO MEMBRO ---
  const updateMvpScore = async (val) => {
    if (!selectedMember || !isMaster) return;
    let newScore = parseInt(val);
    if (isNaN(newScore)) newScore = 0;
    if (newScore < 0) newScore = 0;
    if (newScore > 100) newScore = 100;
    
    await updateDoc(doc(db, "guild_fraternidade", selectedMember.id), { mvpScore: newScore });
    // Update local otimista é feito pelo onSnapshot
  };

  const addMission = async () => {
    if (!newMissionName || !selectedMember) return;
    const newMission = {
        id: Date.now().toString(),
        name: newMissionName,
        rank: newMissionRank,
        completed: false,
        isMvp: false
    };
    
    const updatedMissions = [...(selectedMember.missions || []), newMission];
    
    await updateDoc(doc(db, "guild_fraternidade", selectedMember.id), { missions: updatedMissions });
    setNewMissionName("");
  };

  const toggleMissionStatus = async (missionId, field) => {
    if (!isMaster || !selectedMember) return;

    const updatedMissions = selectedMember.missions.map(m => {
        if (m.id === missionId) {
            return { ...m, [field]: !m[field] };
        }
        return m;
    });

    await updateDoc(doc(db, "guild_fraternidade", selectedMember.id), { missions: updatedMissions });
  };

  const deleteMission = async (missionId) => {
      if (!isMaster || !selectedMember) return;
      const updatedMissions = selectedMember.missions.filter(m => m.id !== missionId);
      await updateDoc(doc(db, "guild_fraternidade", selectedMember.id), { missions: updatedMissions });
  }

  // Toggle R.I.P manual
  const toggleRipStatus = async () => {
      if(!isMaster || !selectedMember) return;
      const newStatus = selectedMember.status === 'dead' ? 'active' : 'dead';
      await updateDoc(doc(db, "guild_fraternidade", selectedMember.id), { status: newStatus });
  }

  // Se o membro selecionado mudar na lista (ex: sync), atualiza o modal
  useEffect(() => {
    if (selectedMember) {
        const liveData = members.find(m => m.id === selectedMember.id);
        if (liveData) setSelectedMember(liveData);
    }
  }, [members]);

  return (
    <>
      <style>{`
        .guild-btn-float {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 60px;
            background: #000;
            border: 2px solid #ffcc00;
            border-radius: 50%;
            color: #ffcc00;
            font-size: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 0 15px #ffcc00;
            transition: all 0.3s;
        }
        .guild-btn-float:hover {
            transform: translateX(-50%) scale(1.1);
            background: #ffcc00;
            color: #000;
        }

        .guild-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.85);
            z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        }
        .guild-board-container {
            width: 500px;
            height: 80vh;
            background: #111;
            border: 4px solid #ffcc00;
            border-radius: 10px;
            display: flex; flex-direction: column;
            padding: 20px;
            box-shadow: 0 0 30px rgba(255, 204, 0, 0.3);
            position: relative;
        }
        .guild-title {
            text-align: center;
            color: #ffcc00;
            font-family: 'Cinzel', serif;
            font-size: 24px;
            margin-bottom: 20px;
            text-transform: uppercase;
            text-shadow: 0 0 10px #ffcc00;
        }
        
        /* Lista Invisível Scroll */
        .guild-list {
            flex: 1;
            overflow-y: auto;
            padding-right: 5px;
        }
        .guild-list::-webkit-scrollbar { display: none; }
        .guild-list { -ms-overflow-style: none; scrollbar-width: none; }

        .guild-row {
            display: flex; align-items: center;
            background: rgba(255, 255, 255, 0.05);
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #333;
            cursor: pointer;
            transition: 0.2s;
            border-radius: 5px;
        }
        .guild-row:hover { border-color: #ffcc00; background: rgba(255, 204, 0, 0.1); }
        .guild-row.rip {
            filter: grayscale(100%);
            opacity: 0.6;
            border-color: #555;
        }
        .guild-row.rip:hover { filter: grayscale(0%); opacity: 1; }

        .rank-num {
            font-size: 20px; font-weight: bold; color: #ffcc00;
            width: 40px; text-align: center; font-family: 'Cinzel', serif;
        }
        .char-info { flex: 1; display: flex; flex-direction: column; }
        .char-name { font-weight: bold; color: #fff; font-size: 16px; }
        .char-meta { font-size: 12px; color: #aaa; }
        .rip-tag { color: #fff; background: #333; padding: 2px 5px; font-size: 10px; margin-left: 5px; border: 1px solid #555; }

        /* Modal Detalhes */
        .member-modal {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: #1a1a1a;
            padding: 20px;
            display: flex; flex-direction: column;
            z-index: 10001;
            overflow-y: auto;
        }
        .close-btn {
            position: absolute; top: 10px; right: 10px;
            background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;
        }
        .member-header { display: flex; gap: 20px; margin-bottom: 20px; align-items: center; }
        .member-photo {
            width: 100px; height: 100px; object-fit: cover;
            border: 2px solid #ffcc00; border-radius: 50%;
            background: #000;
        }
        .mvp-box {
            background: #000; border: 1px solid #ffcc00; padding: 10px;
            text-align: center;
            min-width: 80px;
        }
        .mvp-val { font-size: 24px; color: #ffcc00; font-weight: bold; }
        .mvp-input { width: 50px; background: #222; border: 1px solid #555; color: #fff; text-align: center; }

        .missions-container { flex: 1; background: #000; border: 1px solid #333; padding: 10px; overflow-y: auto; }
        .mission-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 8px; border-bottom: 1px solid #222;
        }
        .m-name { color: #fff; font-size: 14px; flex: 1; }
        .m-rank { color: #aaa; font-size: 12px; margin-right: 10px; }
        .m-status { font-size: 18px; cursor: pointer; margin-right: 10px; }
        .m-mvp { font-size: 18px; cursor: pointer; color: #333; }
        .m-mvp.active { color: #ffcc00; text-shadow: 0 0 5px #ffcc00; }
        
        .status-success { color: #4ade80; }
        .status-fail { color: #f87171; }
        
        .add-mission-box { display: flex; gap: 5px; margin-top: 10px; }
        .input-dark { background: #222; border: 1px solid #444; color: #fff; padding: 5px; }
        .btn-gold { background: #ffcc00; color: #000; border: none; font-weight: bold; padding: 5px 10px; cursor: pointer; }

        .sync-btn {
            margin-top: 10px; background: #333; color: #aaa; border: 1px solid #555;
            width: 100%; padding: 5px; cursor: pointer; font-size: 12px; transition: 0.2s;
        }
        .sync-btn:hover { background: #444; color: #fff; border-color: #ffcc00; }
        
        .rip-btn {
            background: #222; color: #f44; border: 1px solid #f44;
            padding: 5px; font-size: 10px; cursor: pointer; margin-top: 5px;
        }
      `}</style>

      {/* Botão Flutuante */}
      <div className="guild-btn-float" onClick={() => setIsOpen(true)} title="Fraternidade das Lâmpadas Errantes">
        ★
      </div>

      {/* Modal Principal (Lista) */}
      {isOpen && (
        <div className="guild-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="guild-board-container" onClick={e => e.stopPropagation()}>
            <h2 className="guild-title">Fraternidade das Lâmpadas Errantes</h2>
            
            <div className="guild-list">
                {members.map((member, index) => (
                    <div 
                        key={member.id}
                        className={`guild-row ${member.status === 'dead' ? 'rip' : ''}`}
                        draggable={isMaster}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        onClick={() => setSelectedMember(member)}
                    >
                        <div className="rank-num">{index + 1}</div>
                        <div className="char-info">
                            <div className="char-name">
                                {member.name} 
                                {member.status === 'dead' && <span className="rip-tag">R.I.P ✝</span>}
                            </div>
                            <div className="char-meta">
                                {member.race} | {member.class} | Lvl {member.level}
                            </div>
                        </div>
                    </div>
                ))}
                {members.length === 0 && <p style={{textAlign:'center', color:'#555', marginTop:20}}>A guilda está vazia.</p>}
            </div>

            {isMaster && (
                <button className="sync-btn" onClick={syncWithCharacters}>
                    ↻ Sincronizar com Banco de Dados
                </button>
            )}

            {/* Modal Detalhe Membro */}
            {selectedMember && (
                <div className="member-modal">
                    <button className="close-btn" onClick={() => setSelectedMember(null)}>×</button>
                    
                    <div className="member-header">
                        <img 
                            src={selectedMember.photo || "https://via.placeholder.com/100"} 
                            alt="Char" 
                            className="member-photo" 
                        />
                        <div>
                            <h2 style={{margin:0, color:'#fff'}}>{selectedMember.name}</h2>
                            <p style={{margin:0, color:'#aaa'}}>
                                {selectedMember.race} - {selectedMember.class}
                            </p>
                            <p style={{margin:0, color:'#aaa'}}>Nível: {selectedMember.level}</p>
                            
                            {selectedMember.status === 'dead' && <p style={{color:'red', fontWeight:'bold', fontSize:'12px', marginTop:5}}>✝ MORTOS NÃO CONTAM HISTÓRIAS ✝</p>}
                            
                            {isMaster && (
                                <button className="rip-btn" onClick={toggleRipStatus}>
                                    {selectedMember.status === 'dead' ? 'REVIVER' : 'MARCAR R.I.P'}
                                </button>
                            )}
                        </div>
                        
                        <div className="mvp-box">
                            <div style={{fontSize:'10px', color:'#aaa', textTransform:'uppercase'}}>MVP Score</div>
                            {isMaster ? (
                                <input 
                                    type="number" 
                                    className="mvp-input"
                                    value={selectedMember.mvpScore}
                                    onChange={(e) => updateMvpScore(e.target.value)}
                                />
                            ) : (
                                <div className="mvp-val">{selectedMember.mvpScore}</div>
                            )}
                        </div>
                    </div>

                    <h3 style={{color:'#ffcc00', borderBottom:'1px solid #333', paddingBottom:'5px'}}>Registro de Missões</h3>
                    
                    <div className="missions-container">
                        {selectedMember.missions && selectedMember.missions.length > 0 ? (
                            selectedMember.missions.map(m => (
                                <div key={m.id} className="mission-row">
                                    <div style={{flex:1}}>
                                        <div className="m-name">{m.name}</div>
                                        <div className="m-rank">Rank: {m.rank}</div>
                                    </div>
                                    
                                    <div 
                                        className={`m-status ${m.completed ? 'status-success' : 'status-fail'}`}
                                        title={m.completed ? "Concluída" : "Falha"}
                                        onClick={() => isMaster && toggleMissionStatus(m.id, 'completed')}
                                    >
                                        {m.completed ? '✔' : '✖'}
                                    </div>

                                    <div 
                                        className={`m-mvp ${m.isMvp ? 'active' : ''}`}
                                        title="Foi MVP?"
                                        onClick={() => isMaster && toggleMissionStatus(m.id, 'isMvp')}
                                    >
                                        ★
                                    </div>
                                    
                                    {isMaster && (
                                        <div style={{color:'red', cursor:'pointer', marginLeft: 10}} onClick={() => deleteMission(m.id)}>🗑</div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p style={{color:'#666', textAlign:'center', marginTop: 20}}>Nenhum registro encontrado.</p>
                        )}
                    </div>

                    {isMaster && (
                        <div className="add-mission-box">
                            <input 
                                className="input-dark" 
                                style={{flex:1}} 
                                placeholder="Nome da Missão"
                                value={newMissionName}
                                onChange={e => setNewMissionName(e.target.value)}
                            />
                            <select 
                                className="input-dark"
                                value={newMissionRank}
                                onChange={e => setNewMissionRank(e.target.value)}
                            >
                                <option>S</option>
                                <option>A</option>
                                <option>B</option>
                                <option>C</option>
                                <option>D</option>
                                <option>E</option>
                            </select>
                            <button className="btn-gold" onClick={addMission}>+</button>
                        </div>
                    )}
                </div>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default GuildBoard;