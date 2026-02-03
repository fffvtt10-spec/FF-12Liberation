import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, query, where, addDoc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import fundoMestre from '../assets/fundo-mestre.jpg';
import chocoboGif from '../assets/chocobo-loading.gif';
import Ficha from '../components/Ficha';
import Bazar from '../components/Bazar';
import Forja from '../components/Forja';
import Tabletop from '../components/Tabletop'; 
import SceneryViewer from '../components/SceneryViewer'; 
import NPCViewer from '../components/NPCViewer'; 
import { DiceSelector, DiceResult } from '../components/DiceSystem'; 

// --- NOVOS ÍCONES SVG (ESTILO DARK FANTASY) ---

// Mapa Dobrável
const IconTabletop = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

// D20 Estilizado
const IconDice = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 7v10l10 5 10-5V7" />
    <path d="M12 22V12" />
  </svg>
);

// Quadro/Paisagem
const IconScenery = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
);

// Caveira/Monstro
const IconMonsters = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2c-4 0-8 3-8 8 0 4 3 7 5 7.5V21h6v-3.5c2-.5 5-3.5 5-7.5 0-5-4-8-8-8z" />
    <path d="M9 10h.01" />
    <path d="M15 10h.01" />
    <path d="M10 14h4" />
  </svg>
);

// Silhueta de Pessoa
const IconNPC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Peão de Xadrez (Jogador)
const IconPlayers = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 1 3 3c0 2-3 3-3 3s-3-1-3-3a3 3 0 0 1 3-3z" />
    <path d="M15 9c1 1 2.5 2 2.5 4 0 2-2.5 4-2.5 4H9s-2.5-2-2.5-4c0-2 1.5-3 2.5-4" />
    <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
    <line x1="7" y1="22" x2="17" y2="22" />
  </svg>
);

// Espadas Cruzadas
const IconCombat = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
    <path d="M13 19l6-6" />
    <path d="M16 16l4 4" />
    <path d="M19 21l2-2" />
  </svg>
);

// Livro
const IconBook = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

export default function MestreVTTPage() {
  const navigate = useNavigate();
  
  // Estados Principais
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [personagensData, setPersonagensData] = useState([]);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [selectedFicha, setSelectedFicha] = useState(null);
  
  // Modais
  const [showMapManager, setShowMapManager] = useState(false);
  const [showSceneryManager, setShowSceneryManager] = useState(false); 
  const [showNPCManager, setShowNPCManager] = useState(false); 
  const [showMonsterManager, setShowMonsterManager] = useState(false); 
  const [showPlayerManager, setShowPlayerManager] = useState(false);   
  const [showCombatTracker, setShowCombatTracker] = useState(false);
  
  const [viewMonsterDetails, setViewMonsterDetails] = useState(null);

  // Estados Tracker Drag
  const [trackerPos, setTrackerPos] = useState({ x: 280, y: 100 });
  const [isDraggingTracker, setIsDraggingTracker] = useState(false);
  const [dragOffsetTracker, setDragOffsetTracker] = useState({ x: 0, y: 0 });

  // Estados Criação e Edição
  const [editingToken, setEditingToken] = useState(null);
  const [monsterForm, setMonsterForm] = useState({
      name: '', img: '', stars: 1, difficultyQ: false, 
      hpCurrent: 10, hpMax: 10, mpCurrent: 10, mpMax: 10,
      xp: 0, drops: '', tips: '', description: '', visibleBars: false
  });
  const [bestiary, setBestiary] = useState([]);
  const [creatingMonsterStep, setCreatingMonsterStep] = useState('list'); 

  const [allCharacters, setAllCharacters] = useState([]);
  const [showDiceSelector, setShowDiceSelector] = useState(false);
  const [rollResult, setRollResult] = useState(null); 
  const dismissedRollTimestamp = useRef(0);
  
  const sessaoRef = useRef(null);

  useEffect(() => { sessaoRef.current = sessaoAtiva; }, [sessaoAtiva]);

  // --- 1. MINIMUM TIME LOADING ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  // Check Loading State
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // --- 2. AUTH & DATA ---
  useEffect(() => {
    let unsubSession = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            const q = query(collection(db, "sessoes"), where("mestreId", "==", user.uid));
            unsubSession = onSnapshot(q, (snap) => {
              const sessoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              const ativa = sessoes.find(s => {
                  const agora = new Date();
                  const fim = new Date(s.expiraEm);
                  return agora <= fim; 
              });
              if (ativa) {
                setSessaoAtiva(ativa);
                setConnectedPlayers(ativa.connected_players || []); 
                if (ativa.latest_roll) {
                     const roll = ativa.latest_roll;
                     if (roll.timestamp > dismissedRollTimestamp.current) {
                        setRollResult(prev => { if (!prev || prev.timestamp !== roll.timestamp) return roll; return prev; });
                     }
                }
              }
              setLoading(false); 
            });
            const qBestiary = query(collection(db, "bestiary"), where("mestreId", "==", user.uid));
            onSnapshot(qBestiary, (snap) => setBestiary(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        } else { setLoading(false); navigate('/login'); }
    });
    return () => { unsubscribeAuth(); unsubSession(); };
  }, [navigate]); 

  // Online Check
  useEffect(() => {
    if (sessaoAtiva?.id) {
        updateDoc(doc(db, "sessoes", sessaoAtiva.id), { dm_online: true }).catch(console.error);
        return () => updateDoc(doc(db, "sessoes", sessaoAtiva.id), { dm_online: false }).catch(console.error);
    }
  }, [sessaoAtiva?.id]); 

  // Data Characters
  useEffect(() => {
    const qAll = query(collection(db, "characters"));
    const unsubAll = onSnapshot(qAll, (snap) => {
        const allChars = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllCharacters(allChars);
        if (sessaoAtiva && sessaoAtiva.participantes) {
            const sessionChars = allChars.filter(c => sessaoAtiva.participantes.includes(c.name));
            setPersonagensData(sessionChars);
        }
    });
    return () => unsubAll();
  }, [sessaoAtiva?.participantes]); 

  // Monster/Player Handlers
  const handleSaveMonster = async () => {
      try {
          await addDoc(collection(db, "bestiary"), { ...monsterForm, mestreId: auth.currentUser.uid, createdAt: new Date().toISOString() });
          setCreatingMonsterStep('list');
          setMonsterForm({ name: '', img: '', stars: 1, difficultyQ: false, hpCurrent: 10, hpMax: 10, mpCurrent: 10, mpMax: 10, xp: 0, drops: '', tips: '', description: '', visibleBars: false });
      } catch (e) { alert("Erro: " + e.message); }
  };

  const handleDeployMonster = async (monster) => {
      if(!sessaoAtiva) return;
      const newToken = {
          id: `enemy_${Date.now()}`,
          type: 'enemy',
          name: monster.name,
          img: monster.img,
          x: 0, y: 0, size: 1,
          visible: true, 
          visibleBars: monster.visibleBars,
          stats: { hp: { current: monster.hpCurrent, max: monster.hpMax }, mp: { current: monster.mpCurrent, max: monster.mpMax } },
          details: { ...monster } 
      };
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: [...(sessaoAtiva.tokens||[]), newToken] });
      setShowMonsterManager(false); 
  };

  const handleDeployPlayer = async (char) => {
      if(!sessaoAtiva) return;
      if(sessaoAtiva.tokens?.find(t => t.uid === char.uid)) return alert("Jogador já está no mapa!");
      const newToken = {
          id: `player_${char.uid}`, type: 'player', uid: char.uid, name: char.name,
          img: char.character_sheet?.imgUrl || '', x: 0, y: 0, size: 1, visible: true, controlledBy: char.uid 
      };
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: [...(sessaoAtiva.tokens||[]), newToken] });
      setShowPlayerManager(false); 
  };

  // Combat Tracker Handlers
  const handleRemoveToken = async (tokenId) => {
      const updatedTokens = sessaoAtiva.tokens.filter(t => t.id !== tokenId);
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: updatedTokens });
  };

  const handleUpdateTokenInTracker = async (token, updates) => {
      const updatedTokens = sessaoAtiva.tokens.map(t => t.id === token.id ? { ...t, ...updates } : t);
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: updatedTokens });
  };

  const handleUpdateStatsInTracker = async (token, statType, value) => {
      if (token.type !== 'enemy') return; 
      const updatedTokens = sessaoAtiva.tokens.map(t => {
          if (t.id === token.id) {
              return { ...t, stats: { ...t.stats, [statType]: { ...t.stats[statType], current: Number(value) } } };
          }
          return t;
      });
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: updatedTokens });
  };

  const onDragStart = (e, index) => { e.dataTransfer.setData("dragIndex", index); };
  const onDrop = async (e, dropIndex) => {
      const dragIndex = e.dataTransfer.getData("dragIndex");
      if (dragIndex === "") return;
      const newTokens = [...sessaoAtiva.tokens];
      const [draggedItem] = newTokens.splice(dragIndex, 1);
      newTokens.splice(dropIndex, 0, draggedItem);
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: newTokens });
  };

  const handleTrackerMouseDown = (e) => {
      setIsDraggingTracker(true);
      setDragOffsetTracker({ x: e.clientX - trackerPos.x, y: e.clientY - trackerPos.y });
  };
  const handleWindowMouseMove = (e) => {
      if (isDraggingTracker) { setTrackerPos({ x: e.clientX - dragOffsetTracker.x, y: e.clientY - dragOffsetTracker.y }); }
  };
  const handleWindowMouseUp = () => { setIsDraggingTracker(false); };

  // Token Edit Logic
  const handleUpdateTokenStats = async () => {
      if(!editingToken || !sessaoAtiva) return;
      const updatedTokens = sessaoAtiva.tokens.map(t => {
          if(t.id === editingToken.id) {
              let newToken = { ...t };
              if (editingToken.stats) {
                  newToken.stats = {
                      hp: { ...t.stats?.hp, current: editingToken.stats.hp.current },
                      mp: { ...t.stats?.mp, current: editingToken.stats.mp.current }
                  };
              }
              newToken.imgX = editingToken.imgX;
              newToken.imgY = editingToken.imgY;
              return newToken;
          }
          return t;
      });
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: updatedTokens });
      setEditingToken(null);
  };

  const adjustImageOffset = (axis, val) => {
      if(!editingToken) return;
      const currentVal = editingToken[axis] !== undefined ? editingToken[axis] : 50;
      setEditingToken({ ...editingToken, [axis]: currentVal + val });
  };

  // --- LOADING SCREEN (PADRONIZADA) ---
  if (loading || !minTimeElapsed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', 
        background: 'radial-gradient(circle at center, #001a33 0%, #000000 100%)', 
        color: '#ffcc00', fontFamily: 'Cinzel, serif', zIndex: 9999, position: 'fixed', top: 0, left: 0
      }}>
        <img src={chocoboGif} alt="Carregando..." style={{ width: '100px', marginBottom: '20px' }} />
        <p style={{ 
          fontSize: '18px', letterSpacing: '2px', textTransform: 'uppercase',
          animation: 'pulseText 2s infinite ease-in-out' 
        }}>Sintonizando Éter...</p>
        <style>{`
          @keyframes pulseText { 
            0% { opacity: 0.3; } 
            50% { opacity: 1; } 
            100% { opacity: 0.3; } 
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="mestre-vtt-container" onMouseMove={handleWindowMouseMove} onMouseUp={handleWindowMouseUp}>
      <div className="mestre-bg-layer" style={{ backgroundImage: `url(${fundoMestre})` }} />
      
      {/* SIDEBAR */}
      <div className="dm-players-sidebar">
          <h3 className="sidebar-title">AVENTUREIROS</h3>
          <div className="players-list-scroll">
              {personagensData.map(char => {
                  const isOnline = connectedPlayers.includes(char.uid); 
                  const bgImage = char.character_sheet?.imgUrl; 
                  return (
                      <div key={char.id} className={`mini-player-card ${isOnline ? 'online' : 'offline'}`} onClick={() => setSelectedFicha(char)} title="Ficha">
                          <div className="mini-avatar">
                              {bgImage ? <div className="avatar-img" style={{backgroundImage: `url(${bgImage})`}}></div> : <div className="avatar-placeholder">{char.name.charAt(0)}</div>}
                              <div className={`status-dot ${isOnline ? 'green' : 'gray'}`}></div>
                          </div>
                          <div className="mini-info"><span className="p-name">{char.name}</span><span className="p-lvl">LVL {char.character_sheet?.basic_info?.level || 1}</span></div>
                      </div>
                  );
              })}
          </div>
      </div>

      <div className="session-status-top">
          <div className="status-indicator active"></div>
          <div className="status-info"><h2>SESSÃO ATIVA: {sessaoAtiva.missaoNome}</h2><p>Mestre Online • {connectedPlayers.length} Jogadores Conectados</p></div>
      </div>

      {/* --- COMPONENTS --- */}
      <Tabletop 
        sessaoData={sessaoAtiva} isMaster={true} showManager={showMapManager}
        onCloseManager={() => setShowMapManager(false)} personagensData={personagensData}
        onEditToken={(token) => setEditingToken(JSON.parse(JSON.stringify(token)))}
      />
      <SceneryViewer sessaoData={sessaoAtiva} isMaster={true} showManager={showSceneryManager} onCloseManager={() => setShowSceneryManager(false)} />
      <NPCViewer sessaoData={sessaoAtiva} isMaster={true} showManager={showNPCManager} onCloseManager={() => setShowNPCManager(false)} />
      {rollResult && <DiceResult rollData={rollResult} onClose={() => { dismissedRollTimestamp.current = rollResult.timestamp; setRollResult(null); }} />}
      {showDiceSelector && <DiceSelector sessaoId={sessaoAtiva.id} playerName="MESTRE" onClose={() => setShowDiceSelector(false)} />}

      {/* --- COMBAT TRACKER --- */}
      {showCombatTracker && (
          <div 
            className="combat-tracker-panel fade-in"
            style={{ top: trackerPos.y, left: trackerPos.x, zIndex: 1000 }}
          >
              <div 
                className="tracker-header" 
                onMouseDown={handleTrackerMouseDown}
                style={{cursor: 'grab'}}
              >
                  <h3 className="tracker-title">COMBATE</h3>
              </div>
              <div className="tracker-list">
                  {sessaoAtiva.tokens?.map((token, index) => {
                      let hpVal = 0, hpMax = 0, mpVal = 0, mpMax = 0, imgUrl = token.img;
                      
                      if(token.type === 'player') {
                          const p = personagensData.find(pd => pd.uid === token.uid);
                          if(p) {
                              hpVal = p.character_sheet?.status?.hp?.current || 0;
                              hpMax = p.character_sheet?.status?.hp?.max || 0;
                              mpVal = p.character_sheet?.status?.mp?.current || 0;
                              mpMax = p.character_sheet?.status?.mp?.max || 0;
                              if(p.character_sheet?.imgUrl) imgUrl = p.character_sheet.imgUrl;
                          }
                      } else {
                          hpVal = token.stats.hp.current; hpMax = token.stats.hp.max;
                          mpVal = token.stats.mp.current; mpMax = token.stats.mp.max;
                      }

                      const isVisible = token.visible !== false;

                      return (
                          <div 
                            key={token.id} 
                            className="tracker-item"
                            draggable
                            onDragStart={(e) => onDragStart(e, index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => onDrop(e, index)}
                          >
                              <div className="t-col-img">
                                  <div className="t-index">{index + 1}</div>
                                  <div className="t-img" style={{backgroundImage: `url(${imgUrl})`, backgroundPosition: `${token.imgX||50}% ${token.imgY||50}%`, opacity: isVisible ? 1 : 0.5}}></div>
                              </div>
                              
                              <div className="t-col-info">
                                  <div className="t-name">{token.name}</div>
                                  <div className="t-stats-row">
                                      <div className="t-stat hp">
                                          <label>HP</label>
                                          {token.type === 'enemy' ? (
                                              <input type="number" value={hpVal} onChange={(e) => handleUpdateStatsInTracker(token, 'hp', e.target.value)} />
                                          ) : <span>{hpVal}</span>}
                                          <small>/{hpMax}</small>
                                      </div>
                                      <div className="t-stat mp">
                                          <label>MP</label>
                                          {token.type === 'enemy' ? (
                                              <input type="number" value={mpVal} onChange={(e) => handleUpdateStatsInTracker(token, 'mp', e.target.value)} />
                                          ) : <span>{mpVal}</span>}
                                          <small>/{mpMax}</small>
                                      </div>
                                  </div>
                              </div>

                              <div className="t-col-actions">
                                  <div className="img-adj-grid">
                                      <button onClick={() => handleUpdateTokenInTracker(token, { imgY: (token.imgY||50)-10 })}>▲</button>
                                      <div style={{display:'flex'}}>
                                        <button onClick={() => handleUpdateTokenInTracker(token, { imgX: (token.imgX||50)-10 })}>◄</button>
                                        <button onClick={() => handleUpdateTokenInTracker(token, { imgX: (token.imgX||50)+10 })}>►</button>
                                      </div>
                                      <button onClick={() => handleUpdateTokenInTracker(token, { imgY: (token.imgY||50)+10 })}>▼</button>
                                  </div>
                                  <div className="act-btns">
                                      <button 
                                        className="btn-icon-sm" 
                                        title={isVisible ? "Ocultar" : "Mostrar"} 
                                        onClick={() => handleUpdateTokenInTracker(token, { visible: !isVisible })}
                                        style={{color: isVisible ? '#ffcc00' : '#666'}}
                                      >
                                          {isVisible ? '👁️' : '🙈'}
                                      </button>

                                      {token.type === 'enemy' && (
                                          <button className="btn-icon-sm" title="Detalhes" onClick={() => setViewMonsterDetails({ ...token.details, img: token.img })}>📜</button>
                                      )}
                                      
                                      <button className="btn-icon-sm delete" title="Remover" onClick={() => handleRemoveToken(token.id)}>✕</button>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
                  {(!sessaoAtiva.tokens || sessaoAtiva.tokens.length === 0) && <div className="empty-tracker">Mesa Vazia</div>}
              </div>
          </div>
      )}

      {viewMonsterDetails && (
          <div className="ff-modal-overlay-flex" onClick={() => setViewMonsterDetails(null)}>
              <div className="monster-detail-card" onClick={e => e.stopPropagation()}>
                  <div className="md-header">
                      <div className="md-title-row">
                          <h2>{viewMonsterDetails.name}</h2>
                          <div className="md-stars">
                              {[...Array(viewMonsterDetails.stars || 1)].map((_,i) => <span key={i}>★</span>)}
                              {viewMonsterDetails.difficultyQ && <span className="md-boss-mark">?</span>}
                          </div>
                      </div>
                      <div className="md-sub">XP: {viewMonsterDetails.xp}</div>
                  </div>
                  <div className="md-body">
                      <div className="md-img-col">
                          <div className="md-portrait" style={{backgroundImage: `url(${viewMonsterDetails.img})`}}></div>
                      </div>
                      <div className="md-info-col custom-scrollbar">
                          <div className="md-block">
                              <label>DESCRIÇÃO</label>
                              <p>{viewMonsterDetails.description || "Sem descrição."}</p>
                          </div>
                          {viewMonsterDetails.drops && (
                              <div className="md-block">
                                  <label>DROPS & ITENS</label>
                                  <p>{viewMonsterDetails.drops}</p>
                              </div>
                          )}
                          {viewMonsterDetails.tips && (
                              <div className="md-block tips">
                                  <label>DICAS DO SANCHEZ (GM)</label>
                                  <p>{viewMonsterDetails.tips}</p>
                              </div>
                          )}
                      </div>
                  </div>
                  <button className="md-close-btn" onClick={() => setViewMonsterDetails(null)}>FECHAR</button>
              </div>
          </div>
      )}

      {/* DOCK FERRAMENTAS - Z-INDEX 2000 */}
      <div className="dm-tools-dock">
          <div className="tool-group"><Bazar isMestre={true} vttDock={true} /><div className="tool-label">BAZAR</div></div>
          <div className="tool-group"><Forja vttDock={true} /><div className="tool-label">FORJA</div></div>
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowMapManager(true)}><IconTabletop /></button><div className="tool-label">TABLETOP</div></div>
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowCombatTracker(!showCombatTracker)} title="Rastreador de Combate"><IconCombat /></button><div className="tool-label">COMBATE</div></div>
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowDiceSelector(true)}><IconDice /></button><div className="tool-label">DADOS</div></div>
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => window.open('https://www.canva.com/design/DAGpzszHsc4/NcbQ19hsr4grzm9aotQFtw/edit?utm_content=DAGpzszHsc4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', '_blank')}><IconBook /></button><div className="tool-label">LIVRO</div></div>
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowSceneryManager(true)}><IconScenery /></button><div className="tool-label">CENÁRIOS</div></div>
          
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowMonsterManager(true)}><IconMonsters /></button><div className="tool-label">MONSTROS</div></div>
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowNPCManager(true)}><IconNPC /></button><div className="tool-label">NPCS</div></div>
          <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowPlayerManager(true)}><IconPlayers /></button><div className="tool-label">JOGADORES</div></div>
      </div>

      {selectedFicha && <Ficha characterData={selectedFicha} isMaster={true} onClose={() => setSelectedFicha(null)} />}

      {/* --- MODAL DE BESTIÁRIO (CSS CORRIGIDO) --- */}
      {showMonsterManager && (
          <div className="modal-overlay-custom" onClick={() => setShowMonsterManager(false)}>
              <div className="modal-box-custom wide" onClick={e => e.stopPropagation()}>
                  <div className="modal-header-c"><h3>BESTIÁRIO</h3><button className="close-c" onClick={() => setShowMonsterManager(false)}>✕</button></div>
                  {creatingMonsterStep === 'list' ? (
                      <div className="monster-list-view">
                          <button className="btn-create-monster" onClick={() => setCreatingMonsterStep('create')}>+ CRIAR NOVA AMEAÇA</button>
                          <div className="bestiary-grid">
                              {bestiary.map(mon => (
                                  <div key={mon.id} className="monster-card-db">
                                      <div className="m-thumb" style={{backgroundImage: `url(${mon.img})`}}></div>
                                      <div className="m-info"><strong>{mon.name}</strong><small>HP: {mon.hpMax}</small></div>
                                      <div className="m-actions"><button className="btn-deploy" onClick={() => handleDeployMonster(mon)}>INSERIR</button></div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <div className="monster-create-view">
                          <div className="create-row">
                              <div className="img-upload-box"><div className="preview-img" style={{backgroundImage: `url(${monsterForm.img})`}}></div><input placeholder="Link Imagem..." value={monsterForm.img} onChange={e => setMonsterForm({...monsterForm, img: e.target.value})} /></div>
                              <div className="details-inputs">
                                  <input className="input-title" placeholder="Nome" value={monsterForm.name} onChange={e => setMonsterForm({...monsterForm, name: e.target.value})} />
                                  <div className="stats-row-c">
                                      <div><label>HP Max</label><input type="number" value={monsterForm.hpMax} onChange={e => setMonsterForm({...monsterForm, hpMax: Number(e.target.value), hpCurrent: Number(e.target.value)})} /></div>
                                      <div><label>MP Max</label><input type="number" value={monsterForm.mpMax} onChange={e => setMonsterForm({...monsterForm, mpMax: Number(e.target.value), mpCurrent: Number(e.target.value)})} /></div>
                                  </div>
                                  <div className="toggle-row"><input type="checkbox" checked={monsterForm.visibleBars} onChange={e => setMonsterForm({...monsterForm, visibleBars: e.target.checked})} /><label>Barras visíveis?</label></div>
                              </div>
                          </div>
                          <div className="text-areas-row" style={{flexDirection:'column', height:'auto'}}>
                              <textarea style={{height:'60px'}} placeholder="Descrição (Lore)..." value={monsterForm.description} onChange={e => setMonsterForm({...monsterForm, description: e.target.value})} />
                              <textarea style={{height:'60px'}} placeholder="Drops (Use Enter para tópicos)" value={monsterForm.drops} onChange={(e) => setMonsterForm({...monsterForm, drops: e.target.value})} />
                              <textarea style={{height:'60px'}} placeholder="Dicas do Sanchez (Secreto)" value={monsterForm.tips} onChange={e => setMonsterForm({...monsterForm, tips: e.target.value})} />
                          </div>
                          <div className="actions-row-bottom"><button className="btn-save-m" onClick={handleSaveMonster}>SALVAR</button><button className="btn-cancel-m" onClick={() => setCreatingMonsterStep('list')}>VOLTAR</button></div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- MODAL INSERIR JOGADOR (CSS CORRIGIDO) --- */}
      {showPlayerManager && (
          <div className="modal-overlay-custom" onClick={() => setShowPlayerManager(false)}>
              <div className="modal-box-custom" onClick={e => e.stopPropagation()}>
                  <div className="modal-header-c"><h3>INSERIR JOGADOR</h3><button className="close-c" onClick={() => setShowPlayerManager(false)}>✕</button></div>
                  <div className="player-select-grid">
                      {allCharacters.map(char => (
                          <div key={char.id} className="char-select-card" onClick={() => handleDeployPlayer(char)}>
                              <div className="c-avatar" style={{backgroundImage: `url(${char.character_sheet?.imgUrl})`}}></div><span>{char.name}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL DE EDIÇÃO DE TOKEN (REFINADO) --- */}
      {editingToken && (
          <div className="modal-overlay-custom" onClick={() => setEditingToken(null)}>
              <div className="modal-box-custom refined-edit" onClick={e => e.stopPropagation()}>
                  <h3 className="modal-edit-title">EDITAR: {editingToken.name}</h3>
                  <div className="refined-stats-container">
                      <div className="refined-stat-row">
                          <span className="stat-label hp">HP</span>
                          <button className="btn-adj" onClick={() => setEditingToken({...editingToken, stats: {...editingToken.stats, hp: {...editingToken.stats.hp, current: editingToken.stats.hp.current - 1}}})}>-</button>
                          <span className="stat-value">{editingToken.stats.hp.current} / {editingToken.stats.hp.max}</span>
                          <button className="btn-adj" onClick={() => setEditingToken({...editingToken, stats: {...editingToken.stats, hp: {...editingToken.stats.hp, current: editingToken.stats.hp.current + 1}}})}>+</button>
                      </div>
                      <div className="refined-stat-row">
                          <span className="stat-label mp">MP</span>
                          <button className="btn-adj" onClick={() => setEditingToken({...editingToken, stats: {...editingToken.stats, mp: {...editingToken.stats.mp, current: editingToken.stats.mp.current - 1}}})}>-</button>
                          <span className="stat-value">{editingToken.stats.mp.current} / {editingToken.stats.mp.max}</span>
                          <button className="btn-adj" onClick={() => setEditingToken({...editingToken, stats: {...editingToken.stats, mp: {...editingToken.stats.mp, current: editingToken.stats.mp.current + 1}}})}>+</button>
                      </div>
                  </div>
                  <div className="refined-image-control">
                      <label>AJUSTAR ROSTO (POSIÇÃO)</label>
                      <div className="d-pad-grid">
                          <div></div><button onClick={() => adjustImageOffset('imgY', -10)}>▲</button><div></div>
                          <button onClick={() => adjustImageOffset('imgX', -10)}>◄</button><div className="center-dot"></div><button onClick={() => adjustImageOffset('imgX', 10)}>►</button>
                          <div></div><button onClick={() => adjustImageOffset('imgY', 10)}>▼</button><div></div>
                      </div>
                  </div>
                  <button className="btn-save-refined" onClick={handleUpdateTokenStats}>OK (SALVAR)</button>
              </div>
          </div>
      )}

      <style>{`
        .mestre-vtt-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; background: #000; font-family: 'Cinzel', serif; color: #fff; }
        .mestre-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.4; z-index: 0; }
        .dm-players-sidebar { position: absolute; top: 20px; left: 20px; width: 200px; background: rgba(0, 10, 20, 0.95); border: 2px solid #ffcc00; border-radius: 8px; padding: 10px; z-index: 50; max-height: 80vh; display: flex; flex-direction: column; }
        .sidebar-title { color: #ffcc00; font-size: 12px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 10px; text-align: center; }
        .players-list-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .mini-player-card { display: flex; align-items: center; padding: 5px; background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 4px; cursor: pointer; }
        .mini-player-card.online { border-left: 3px solid #00f2ff; }
        .mini-avatar { position: relative; margin-right: 8px; }
        .avatar-img, .avatar-placeholder { width: 30px; height: 30px; border-radius: 50%; background-size: cover; border: 1px solid #fff; }
        .avatar-placeholder { background: #222; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; position: absolute; bottom: 0; right: 0; border: 1px solid #000; }
        .status-dot.green { background: #00f2ff; } .status-dot.gray { background: #666; }
        .p-name { font-size: 11px; font-weight: bold; display: block; }
        .p-lvl { font-size: 9px; color: #ffcc00; }

        .session-status-top { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); border: 1px solid #00f2ff; padding: 5px 20px; border-radius: 20px; display: flex; align-items: center; gap: 10px; z-index: 40; }
        .status-indicator { width: 10px; height: 10px; background: #00f2ff; border-radius: 50%; box-shadow: 0 0 10px #00f2ff; animation: pulse 2s infinite; }
        .status-info h2 { margin: 0; font-size: 14px; color: #fff; }
        .status-info p { margin: 0; font-size: 10px; color: #00f2ff; }

        /* COMBAT TRACKER */
        .combat-tracker-panel { position: absolute; width: 320px; max-height: 70vh; background: linear-gradient(180deg, #0d0d10 0%, #000 100%); border: 2px solid #b8860b; border-radius: 6px; display: flex; flex-direction: column; box-shadow: 0 0 25px rgba(0,0,0,0.9); }
        .tracker-header { background: #15100a; border-bottom: 2px solid #b8860b; padding: 10px; text-align: center; }
        .tracker-title { color: #ffcc00; margin: 0; font-family: 'Cinzel', serif; letter-spacing: 3px; font-size: 16px; text-shadow: 0 0 5px #ffcc00; }
        .tracker-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .tracker-item { display: flex; align-items: center; background: rgba(20, 20, 25, 0.9); border: 1px solid #444; border-radius: 4px; padding: 8px 5px; gap: 8px; transition: 0.2s; }
        .tracker-item:hover { border-color: #ffcc00; }
        .t-col-img { display: flex; flex-direction: column; align-items: center; width: 45px; flex-shrink: 0; }
        .t-index { color: #666; font-size: 10px; font-weight: bold; margin-bottom: 2px; }
        .t-img { width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 1px solid #777; box-shadow: 0 0 5px #000; }
        .t-col-info { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
        .t-name { font-size: 13px; font-weight: bold; color: #eec; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .t-stats-row { display: flex; gap: 5px; }
        .t-stat { display: flex; align-items: center; font-size: 11px; background: #080808; padding: 2px 5px; border-radius: 3px; border: 1px solid #333; }
        .t-stat label { margin-right: 4px; font-weight: bold; font-size: 9px; }
        .t-stat.hp label { color: #f44; } .t-stat.mp label { color: #00f2ff; }
        .t-stat input { width: 28px; background: transparent; border: none; color: #fff; text-align: center; padding: 0; font-size: 11px; font-weight: bold; }
        .t-stat span { color: #fff; font-weight: bold; }
        .t-stat small { color: #555; margin-left: 2px; font-size: 9px; }
        .t-col-actions { display: flex; gap: 6px; align-items: center; }
        .img-adj-grid { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .img-adj-grid button { width: 14px; height: 12px; font-size: 7px; padding: 0; line-height: 1; background: #222; border: 1px solid #555; color: #aaa; cursor: pointer; }
        .img-adj-grid button:hover { background: #ffcc00; color: #000; }
        .act-btns { display: flex; flex-direction: column; gap: 3px; }
        .btn-icon-sm { background: #222; border: 1px solid #555; color: #ccc; width: 22px; height: 22px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 3px; }
        .btn-icon-sm:hover { border-color: #ffcc00; color: #fff; }
        .btn-icon-sm.delete:hover { background: #300; border-color: #f44; color: #f44; }
        .empty-tracker { text-align: center; padding: 30px; color: #666; font-style: italic; font-size: 12px; font-family: 'serif'; }

        /* MONSTER DETAIL */
        .monster-detail-card { width: 500px; max-width: 95vw; background: #0d0d10 url('https://www.transparenttextures.com/patterns/dark-matter.png'); border: 2px solid #b8860b; box-shadow: 0 0 50px rgba(0,0,0,0.9), inset 0 0 100px rgba(0,0,0,0.8); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
        .md-header { background: linear-gradient(90deg, #15100a, #000); padding: 15px 20px; border-bottom: 1px solid #b8860b; }
        .md-title-row { display: flex; justify-content: space-between; align-items: center; }
        .md-title-row h2 { margin: 0; font-family: 'Cinzel', serif; color: #ffcc00; font-size: 20px; letter-spacing: 2px; }
        .md-stars { color: #ffd700; font-size: 14px; text-shadow: 0 0 5px #ffd700; }
        .md-boss-mark { color: #f44; font-weight: bold; margin-left: 5px; font-size: 16px; }
        .md-sub { font-size: 12px; color: #888; margin-top: 5px; font-style: italic; }
        .md-body { display: flex; padding: 20px; gap: 20px; min-height: 250px; }
        .md-img-col { width: 120px; flex-shrink: 0; }
        .md-portrait { width: 120px; height: 120px; border: 2px solid #444; border-radius: 4px; background-size: cover; background-position: center; box-shadow: 0 0 15px #000; }
        .md-info-col { flex: 1; overflow-y: auto; max-height: 400px; padding-right: 5px; }
        .md-block { margin-bottom: 15px; }
        .md-block label { display: block; color: #b8860b; font-size: 10px; font-weight: bold; border-bottom: 1px solid #333; margin-bottom: 5px; }
        .md-block p { margin: 0; font-size: 13px; color: #ccc; line-height: 1.4; white-space: pre-wrap; }
        .md-block.tips p { color: #00f2ff; font-style: italic; }
        .md-close-btn { width: 100%; padding: 15px; background: #111; color: #fff; border: none; border-top: 1px solid #b8860b; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .md-close-btn:hover { background: #b8860b; color: #000; }

        /* DOCK COM Z-INDEX ALTO (2000) */
        .dm-tools-dock { position: absolute; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 2000; align-items: flex-end; }
        .tool-group { display: flex; align-items: center; gap: 10px; flex-direction: row-reverse; }
        .tool-label { background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #ffcc00; opacity: 0; transition: 0.2s; pointer-events: none; transform: translateX(10px); }
        .tool-group:hover .tool-label { opacity: 1; transform: translateX(0); }
        .tool-btn-placeholder { width: 50px; height: 50px; border-radius: 50%; background: #111; border: 2px solid #555; color: #fff; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-shadow: 0 0 10px #000; pointer-events: auto; }
        .tool-btn-placeholder:hover { border-color: #ffcc00; color: #ffcc00; transform: scale(1.1); }

        /* MODAIS GERAIS */
        .modal-overlay-custom { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .modal-box-custom { background: #080808; border: 2px solid #ffcc00; padding: 20px; border-radius: 8px; width: 500px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; }
        .modal-box-custom.wide { width: 800px; }
        .modal-header-c { display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; align-items: center; }
        .modal-header-c h3 { margin: 0; color: #ffcc00; }
        .close-c { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        
        /* ESTILOS REPARADOS PARA BESTIÁRIO E LISTA JOGADORES */
        .monster-list-view { display: flex; flex-direction: column; gap: 15px; width: 100%; }
        .btn-create-monster { background: #222; border: 1px dashed #ffcc00; color: #ffcc00; padding: 15px; font-weight: bold; cursor: pointer; transition: 0.2s; text-align: center; width: 100%; }
        .btn-create-monster:hover { background: rgba(255, 204, 0, 0.1); }
        .bestiary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; width: 100%; }
        .monster-card-db { display: flex; background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 10px; gap: 10px; align-items: center; }
        .m-thumb { width: 50px; height: 50px; background-size: cover; border-radius: 4px; border: 1px solid #555; flex-shrink: 0; }
        .m-info { flex: 1; display: flex; flex-direction: column; font-size: 12px; }
        .m-info strong { color: #fff; font-size: 14px; }
        .m-info small { color: #888; }
        .btn-deploy { background: #00f2ff; color: #000; border: none; font-size: 10px; font-weight: bold; padding: 4px 8px; cursor: pointer; border-radius: 2px; }
        
        .player-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
        .char-select-card { background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 10px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; border-radius: 4px; }
        .char-select-card:hover { border-color: #00f2ff; background: rgba(0, 242, 255, 0.1); }
        .c-avatar { width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 1px solid #fff; flex-shrink: 0; }

        /* REFINED EDIT MODAL (CORRIGIDO PARA NÃO CORTAR) */
        .modal-box-custom.refined-edit { width: 450px; padding: 30px; overflow: visible; background: #0d0d10; border: 2px solid #ffcc00; box-shadow: 0 0 50px rgba(255, 204, 0, 0.2); max-height: none; height: auto; }
        .modal-edit-title { text-align: center; color: #ffcc00; border-bottom: 1px solid #333; padding-bottom: 10px; margin-top: 0; letter-spacing: 1px; }
        .refined-stats-container { margin: 20px 0; display: flex; flex-direction: column; gap: 10px; }
        .refined-stat-row { display: flex; align-items: center; background: #1a1a1a; padding: 5px; border-radius: 4px; border: 1px solid #333; }
        .stat-label { width: 40px; font-weight: bold; font-size: 14px; text-align: center; }
        .stat-label.hp { color: #f44; } .stat-label.mp { color: #00f2ff; }
        .btn-adj { width: 30px; height: 30px; background: #333; color: #fff; border: 1px solid #555; cursor: pointer; font-weight: bold; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .btn-adj:hover { background: #fff; color: #000; }
        .stat-value { flex: 1; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        .refined-image-control { text-align: center; margin: 20px 0; border-top: 1px solid #333; padding-top: 15px; }
        .refined-image-control label { color: #888; font-size: 10px; letter-spacing: 1px; margin-bottom: 10px; display: block; }
        .d-pad-grid { display: inline-grid; grid-template-columns: 30px 30px 30px; gap: 5px; justify-content: center; }
        .d-pad-grid button { width: 30px; height: 30px; background: #222; border: 1px solid #555; color: #ffcc00; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; }
        .d-pad-grid button:hover { background: #ffcc00; color: #000; }
        .center-dot { width: 6px; height: 6px; background: #555; border-radius: 50%; margin: auto; }
        .btn-save-refined { width: 100%; padding: 15px; font-size: 14px; font-weight: bold; background: #ffcc00; color: #000; border: none; cursor: pointer; text-transform: uppercase; margin-top: 10px; transition: 0.2s; }
        .btn-save-refined:hover { background: #fff; box-shadow: 0 0 20px #ffcc00; }

        .monster-create-view .create-row { display: flex; gap: 15px; margin-bottom: 15px; }
        .img-upload-box { width: 120px; display: flex; flex-direction: column; gap: 5px; }
        .preview-img { width: 120px; height: 120px; background: #000; border: 1px solid #444; background-size: cover; }
        .details-inputs { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .input-title { width: 100%; background: #111; border: 1px solid #444; padding: 8px; color: #ffcc00; font-weight: bold; }
        .stats-row-c { display: flex; gap: 10px; }
        .stats-row-c div { flex: 1; }
        .stats-row-c input { width: 100%; background: #111; border: 1px solid #444; color: #fff; padding: 5px; text-align: center; }
        .actions-row-bottom { display: flex; gap: 10px; margin-top: 15px; }
        .btn-save-m { flex: 1; background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; }
        .btn-cancel-m { background: #333; color: #fff; border: none; padding: 10px; cursor: pointer; }
        
        .toggle-row { display: flex; align-items: center; gap: 10px; color: #aaa; font-size: 12px; margin-top: 5px; }
        .text-areas-row { display: flex; gap: 10px; }
        .text-areas-row textarea { background: #111; border: 1px solid #444; color: #ccc; padding: 10px; resize: none; margin-bottom: 5px; }

        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}