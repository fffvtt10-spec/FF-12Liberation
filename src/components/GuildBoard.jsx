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

const getRankBorderColor = (idx) => {
  if (idx === 0) return '#fbbf24';
  if (idx === 1) return '#94a3b8';
  if (idx === 2) return '#b45309';
  return '#334155';
};

const GuildBoard = ({ isMaster, embedded = false, onOpenFicha }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  const [newMissionName, setNewMissionName] = useState("");
  const [newMissionRank, setNewMissionRank] = useState("D");

  useEffect(() => {
    const q = query(collection(db, "guild_fraternidade"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMembers(data);
    });
    return () => unsubscribe();
  }, []);

  const syncWithCharacters = async () => {
    if (!isMaster) return;
    
    try {
        const charsRef = collection(db, "characters"); 
        const charsSnap = await getDocs(charsRef);
        
        if (charsSnap.empty) {
            alert("Nenhum personagem encontrado na coleção 'characters'.");
            return;
        }

        const activeFichas = charsSnap.docs.map(d => {
            const data = d.data();
            const sheet = data.character_sheet || {};
            const info = sheet.basic_info || {};

            return { 
                id: d.id, 
                name: data.name || data.nome || info.name || "Sem Nome",
                race: data.race || data.raca || info.race || "?",
                class: data.character_sheet?.job_system?.primary_class?.name || data.class || data.classe || info.class || "?",
                level: data.level || data.nivel || info.level || 1,
                photo: data.imagemUrl || data.photo || sheet.imgUrl || "https://via.placeholder.com/100"
            };
        });

        for (let ficha of activeFichas) {
            if (ficha.name === "Sem Nome") continue;

            const exists = members.find(m => m.originalCharId === ficha.id);
            
            if (!exists) {
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
                const memberRef = doc(db, "guild_fraternidade", exists.id);
                await updateDoc(memberRef, {
                    name: ficha.name,
                    race: ficha.race,
                    class: ficha.class,
                    level: Number(ficha.level),
                    photo: ficha.photo,
                    status: exists.status === 'dead' ? 'dead' : 'active' 
                });
            }
        }

        alert(`Sincronização concluída! ${activeFichas.length} personagens verificados.`);
    } catch (error) {
        console.error("Erro detalhado ao sincronizar:", error);
        alert("Erro ao sincronizar. Veja o console (F12) para detalhes.");
    }
  };

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

    for (let i = 0; i < newMembers.length; i++) {
        const member = newMembers[i];
        if (member.order !== i + 1) {
            await updateDoc(doc(db, "guild_fraternidade", member.id), { order: i + 1 });
        }
    }
  };

  const updateMvpScore = async (val) => {
    if (!selectedMember || !isMaster) return;
    let newScore = parseInt(val);
    if (isNaN(newScore)) newScore = 0;
    if (newScore < 0) newScore = 0;
    if (newScore > 100) newScore = 100;
    
    await updateDoc(doc(db, "guild_fraternidade", selectedMember.id), { mvpScore: newScore });
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
  };

  const toggleRipStatus = async () => {
      if(!isMaster || !selectedMember) return;
      const newStatus = selectedMember.status === 'dead' ? 'active' : 'dead';
      await updateDoc(doc(db, "guild_fraternidade", selectedMember.id), { status: newStatus });
  };

  const handleOpenFicha = (member, e) => {
    if (e) e.stopPropagation();
    if (!onOpenFicha || !member?.originalCharId) return;
    onOpenFicha(member.originalCharId);
    setSelectedMember(null);
  };

  useEffect(() => {
    if (selectedMember) {
        const liveData = members.find(m => m.id === selectedMember.id);
        if (liveData) setSelectedMember(liveData);
    }
  }, [members]);

  const renderMemberDetail = () => {
    if (!selectedMember) return null;

    return (
      <div className={`member-modal ${embedded ? 'member-modal-embedded' : ''}`}>
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
              <>
                <button className="rip-btn" onClick={toggleRipStatus}>
                  {selectedMember.status === 'dead' ? 'REVIVER' : 'MARCAR R.I.P'}
                </button>
                {onOpenFicha && (
                  <button className="ficha-edit-btn" onClick={(e) => handleOpenFicha(selectedMember, e)}>
                    📜 EDITAR FICHA
                  </button>
                )}
              </>
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
    );
  };

  const renderMemberRow = (member, index) => {
    if (embedded) {
      return (
        <div 
          key={member.id}
          className={`rank-item-card ${member.status === 'dead' ? 'rip' : ''}`}
          draggable={isMaster}
          onDragStart={() => handleDragStart(index)}
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(index)}
          onClick={() => setSelectedMember(member)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px',
            background: '#0f172a',
            border: '1px solid #334155',
            padding: '15px',
            borderRadius: '4px',
            borderLeft: `4px solid ${getRankBorderColor(index)}`,
            cursor: isMaster ? 'grab' : 'pointer',
            opacity: member.status === 'dead' ? 0.6 : 1,
            filter: member.status === 'dead' ? 'grayscale(100%)' : 'none'
          }}
        >
          <div className="rank-pos" style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: getRankBorderColor(index),
            minWidth: '40px'
          }}>
            #{index + 1}
          </div>
          <div
            className="rank-avatar"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundImage: `url(${member.photo || ''})`,
              backgroundSize: 'cover',
              backgroundColor: '#1e293b',
              border: '1px solid #444',
              flexShrink: 0
            }}
          />
          <div className="rank-info" style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ margin: '0 0 5px 0', color: '#e2e8f0', fontSize: '1rem', textTransform: 'uppercase' }}>
              {member.name}
              {member.status === 'dead' && <span className="rip-tag"> R.I.P ✝</span>}
            </h4>
            <div style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', color: '#94a3b8', flexWrap: 'wrap' }}>
              <span>Nível {member.level}</span>
              <span>{member.class}</span>
              {member.mvpScore > 0 && <span style={{ color: '#fbbf24' }}>MVP {member.mvpScore}</span>}
            </div>
          </div>
          {isMaster && onOpenFicha && (
            <button
              className="rank-ficha-btn"
              title="Editar Ficha"
              onClick={(e) => handleOpenFicha(member, e)}
            >
              📜
            </button>
          )}
        </div>
      );
    }

    return (
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
    );
  };

  const renderMemberList = () => (
    <>
      {members.map((member, index) => renderMemberRow(member, index))}
      {members.length === 0 && (
        <p style={{textAlign:'center', color: embedded ? '#475569' : '#555', marginTop: 20, fontStyle: embedded ? 'italic' : 'normal'}}>
          {embedded ? 'Nenhum personagem no rank. Sincronize com o banco de dados.' : 'A guilda está vazia.'}
        </p>
      )}
    </>
  );

  const renderSyncButton = () => (
    isMaster && (
      <button className="sync-btn" onClick={syncWithCharacters}>
        ↻ Sincronizar com Banco de Dados
      </button>
    )
  );

  const styles = `
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
    .guild-embedded-panel {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        position: relative;
    }
    .guild-embedded-list {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 15px;
        scrollbar-width: thin;
        scrollbar-color: #fbbf24 #0f172a;
    }
    .guild-embedded-list::-webkit-scrollbar { width: 6px; }
    .guild-embedded-list::-webkit-scrollbar-thumb { background: #fbbf24; border-radius: 3px; }
    .guild-title {
        text-align: center;
        color: #ffcc00;
        font-family: 'Cinzel', serif;
        font-size: 24px;
        margin-bottom: 20px;
        text-transform: uppercase;
        text-shadow: 0 0 10px #ffcc00;
    }
    
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

    .rank-item-card:hover { border-color: #fbbf24 !important; }
    .rank-item-card.rip:hover { filter: grayscale(0%); opacity: 1; }
    .rank-ficha-btn {
        background: transparent;
        border: 1px solid #00f2ff;
        color: #00f2ff;
        border-radius: 4px;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 1rem;
        flex-shrink: 0;
        transition: 0.2s;
    }
    .rank-ficha-btn:hover { background: rgba(0, 242, 255, 0.1); }

    .member-modal {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: #1a1a1a;
        padding: 20px;
        display: flex; flex-direction: column;
        z-index: 10001;
        overflow-y: auto;
        box-sizing: border-box;
    }
    .member-modal-embedded {
        background: rgba(15, 23, 42, 0.98);
        border: 1px solid #fbbf24;
        border-radius: 8px;
    }
    .close-btn {
        position: absolute; top: 10px; right: 10px;
        background: none; border: none; color: #fff; font-size: 24px; cursor: pointer;
    }
    .member-header { display: flex; gap: 20px; margin-bottom: 20px; align-items: center; flex-wrap: wrap; }
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

    .missions-container { flex: 1; background: #000; border: 1px solid #333; padding: 10px; overflow-y: auto; min-height: 120px; }
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
        width: 100%; padding: 8px; cursor: pointer; font-size: 12px; transition: 0.2s;
        font-family: 'Cinzel', serif;
    }
    .sync-btn:hover { background: #444; color: #fff; border-color: #ffcc00; }
    
    .rip-btn {
        background: #222; color: #f44; border: 1px solid #f44;
        padding: 5px; font-size: 10px; cursor: pointer; margin-top: 5px;
        display: block;
    }
    .ficha-edit-btn {
        background: transparent; color: #00f2ff; border: 1px solid #00f2ff;
        padding: 5px 10px; font-size: 10px; cursor: pointer; margin-top: 5px;
        display: block; font-weight: bold;
    }
    .ficha-edit-btn:hover { background: rgba(0, 242, 255, 0.1); }
  `;

  if (embedded) {
    return (
      <>
        <style>{styles}</style>
        <div className="guild-embedded-panel">
          <div className="guild-embedded-list">
            {renderMemberList()}
          </div>
          {renderSyncButton()}
          {renderMemberDetail()}
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>

      <div className="guild-btn-float" onClick={() => setIsOpen(true)} title="Fraternidade dos Lanternas Errantes">
        ★
      </div>

      {isOpen && (
        <div className="guild-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="guild-board-container" onClick={e => e.stopPropagation()}>
            <h2 className="guild-title">Fraternidade dos Lanternas Errantes</h2>
            
            <div className="guild-list">
              {renderMemberList()}
            </div>

            {renderSyncButton()}
            {renderMemberDetail()}
          </div>
        </div>
      )}
    </>
  );
};

export default GuildBoard;
