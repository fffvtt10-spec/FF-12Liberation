import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebase';
import { doc, collection, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import fundoJogador from '../assets/fundo-jogador.jpg';
import sanchezImg from '../assets/sanchez.jpeg'; 
import papiroImg from '../assets/papiro.png'; 
import levelUpMusic from '../assets/level-up.mp3'; 
import Bazar from '../components/Bazar';
import Ficha from '../components/Ficha';
import Tabletop from '../components/Tabletop'; 
import SceneryViewer from '../components/SceneryViewer'; 
import NPCViewer from '../components/NPCViewer'; 
import chocoboGif from '../assets/chocobo-loading.gif';
import { DiceSelector, DiceResult } from '../components/DiceSystem'; 
import { backgroundMusic } from './LandingPage'; 
import GuildBoard from '../components/GuildBoard'; 

// --- COMPONENTE DE CALENDÁRIO (READ ONLY PARA JOGADOR) ---
const CalendarSystemPlayer = ({ onClose, disponibilidades, sessoes }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewEvent, setViewEvent] = useState(null);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const events = [
    ...disponibilidades.map(d => ({ ...d, type: 'slot', dateObj: new Date(d.start) })),
    ...sessoes.map(s => ({ ...s, type: 'session', dateObj: new Date(s.dataInicio), isArena: s.isArena }))
  ];

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="cal-day empty"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = events.filter(e => {
        const eDate = e.dateObj;
        return eDate.getDate() === d && eDate.getMonth() === month && eDate.getFullYear() === year;
      });

      days.push(
        <div key={d} className="cal-day">
          <span className="cal-day-number">{d}</span>
          <div className="cal-events-list">
            {dayEvents.map((ev, idx) => (
              <div 
                key={idx} 
                className={`cal-event-pill ${ev.type} ${ev.isArena ? 'arena' : ''}`} 
                onClick={(e) => { e.stopPropagation(); setViewEvent(ev); }}
                title={ev.type === 'session' ? ev.missaoNome : 'Mestre Disponível'}
              >
                {ev.dateObj.getHours()}:{String(ev.dateObj.getMinutes()).padStart(2,'0')} {ev.type === 'session' ? (ev.isArena ? '⚔️' : '🛡️') : '✅'}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="ff-modal-overlay-fixed" style={{zIndex: 10000}}>
      <div className="ff-modal-calendar ff-card">
        <div className="cal-header">
           <button onClick={handlePrevMonth}>◀</button>
           <h2>{monthNames[month]} {year}</h2>
           <button onClick={handleNextMonth}>▶</button>
           <button className="btn-close-cal" onClick={onClose}>FECHAR</button>
        </div>
        <div className="cal-grid-header">
          <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
        </div>
        <div className="cal-grid-body">
          {renderDays()}
        </div>

        {viewEvent && (
            <div className="mini-modal-overlay">
                <div className="mini-modal detail">
                    {viewEvent.type === 'session' ? (
                        <>
                            <h4 style={{color: viewEvent.isArena ? '#a855f7' : '#f44'}}>{viewEvent.isArena ? '⚔️ ARENA PVP' : '🛡️ SESSÃO AGENDADA'}</h4>
                            <h3>{viewEvent.missaoNome}</h3>
                            <p><strong>Horário:</strong> {new Date(viewEvent.dataInicio).toLocaleString()}</p>
                            <p><strong>Mestre:</strong> {viewEvent.mestreNome || "Desconhecido"}</p>
                            <div className="detail-players">
                                <strong>Jogadores Convocados:</strong>
                                {viewEvent.participantes?.join(', ') || "Nenhum"}
                            </div>
                        </>
                    ) : (
                        <>
                            <h4 style={{color: '#0f0'}}>✅ MESTRE DISPONÍVEL</h4>
                            <p><strong>Data:</strong> {new Date(viewEvent.start).toLocaleString()}</p>
                            <p>O Mestre reservou este horário para futuras sessões.</p>
                        </>
                    )}
                    <button className="btn-cancelar-main" style={{marginTop:'15px', width:'100%'}} onClick={() => setViewEvent(null)}>FECHAR</button>
                </div>
            </div>
        )}
      </div>
      <style>{`
        .ff-modal-calendar { width: 90vw; height: 90vh; background: #0f172a; border: 2px solid #fbbf24; display: flex; flex-direction: column; padding: 20px; box-shadow: 0 0 50px #000; }
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-size: 1.5rem; color: #fbbf24; }
        .cal-header button { background: transparent; border: 1px solid #fbbf24; color: #fbbf24; cursor: pointer; padding: 5px 15px; font-weight: bold; }
        .btn-close-cal { background: #f44 !important; border-color: #f44 !important; color: #fff !important; }
        
        .cal-grid-header { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; color: #94a3b8; font-weight: bold; margin-bottom: 10px; }
        .cal-grid-body { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-rows: 1fr; gap: 5px; flex: 1; overflow-y: auto; }
        
        .cal-day { background: #1e293b; border: 1px solid #334155; padding: 5px; min-height: 100px; position: relative; transition: 0.2s; display: flex; flex-direction: column; }
        .cal-day:hover { background: #334155; }
        .cal-day.empty { background: transparent; border: none; cursor: default; }
        .cal-day-number { font-weight: bold; color: #64748b; font-size: 0.9rem; align-self: flex-end; }
        
        .cal-events-list { display: flex; flex-direction: column; gap: 3px; margin-top: 5px; }
        .cal-event-pill { font-size: 0.75rem; padding: 2px 4px; border-radius: 3px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .cal-event-pill.session { background: #7f1d1d; color: #fca5a5; border: 1px solid #f87171; }
        .cal-event-pill.session.arena { background: #4c1d95; color: #c4b5fd; border-color: #8b5cf6; }
        .cal-event-pill.slot { background: #064e3b; color: #6ee7b7; border: 1px solid #34d399; }

        .mini-modal-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 20; }
        .mini-modal { background: #020617; border: 1px solid #fbbf24; padding: 20px; width: 300px; border-radius: 8px; box-shadow: 0 0 20px #000; }
        .mini-modal.detail { width: 400px; }
        .mini-modal h4 { color: #fbbf24; margin: 0 0 10px 0; }
      `}</style>
    </div>
  );
};

const formatSanchezText = (text) => {
  if (!text) return { __html: "" };
  let formatted = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
  return { __html: formatted };
};

export default function JogadorVttPage() {
  const navigate = useNavigate();

  const [currentUser, setCurrentUser] = useState(null);
  const [characterData, setCharacterData] = useState(null);
  
  const [missoes, setMissoes] = useState([]);
  const [resenhas, setResenhas] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [disponibilidades, setDisponibilidades] = useState([]); 

  const [showFicha, setShowFicha] = useState(false);
  const [loading, setLoading] = useState(true);

  // States para modais e visualizações
  const [showDetails, setShowDetails] = useState(null); 
  const [viewResenha, setViewResenha] = useState(null);
  const [viewImage, setViewImage] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false); 

  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [showMapManager, setShowMapManager] = useState(false);
  const [showSceneryManager, setShowSceneryManager] = useState(false); 
  const [showNPCManager, setShowNPCManager] = useState(false); 

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  
  const [showLevelUpScreen, setShowLevelUpScreen] = useState(false);
  const [levelUpData, setLevelUpData] = useState(null);

  const [showDiceSelector, setShowDiceSelector] = useState(false);
  const [rollResult, setRollResult] = useState(null); 
  const dismissedRollTimestamp = useRef(0);

  // Adicionando track de XP para a animação
  const prevXpRef = useRef(0);

  // Parar a música da landing page ao montar
  useEffect(() => {
    if (backgroundMusic) {
      backgroundMusic.pause();
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let unsubMissoes = () => {};
    let unsubResenhas = () => {};
    let unsubChar = () => {};
    let unsubSessoes = () => {};
    let unsubDisponibilidades = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Puxa personagem
        const qChar = query(collection(db, "characters"), where("uid", "==", user.uid));
        unsubChar = onSnapshot(qChar, (snap) => {
          if (!snap.empty) {
            const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
            
            // --- LÓGICA DE DETECÇÃO DE LEVEL UP ---
            const currentLevel = data.character_sheet?.basic_info?.level || 1;
            const currentXp = data.character_sheet?.basic_info?.experience?.current || 0;
            const maxXp = data.character_sheet?.basic_info?.experience?.max || 100;
            const charImg = data.character_sheet?.imgUrl || '';

            // Verifica se o XP atual atingiu o MAX e se o XP antigo era menor que o MAX (para não ficar abrindo toda hora)
            if (currentXp >= maxXp && currentXp > 0 && prevXpRef.current < maxXp && !showLevelUpScreen) {
                setLevelUpData({ level: currentLevel, name: data.name, class: data.class, imgUrl: charImg });
                setShowLevelUpScreen(true);
                
                // Toca a música de Level Up do FFT
                const audio = new Audio(levelUpMusic);
                audio.volume = 0.5;
                audio.play().catch(e => console.log("Áudio bloqueado pelo navegador", e));
            }
            
            prevXpRef.current = currentXp; // Atualiza o ref
            setCharacterData(data);
          }
          setLoading(false);
        });

        // Missões
        const qMissoes = query(collection(db, "missoes"));
        unsubMissoes = onSnapshot(qMissoes, (snap) => {
          setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Resenhas
        const qResenhas = query(collection(db, "resenhas"));
        unsubResenhas = onSnapshot(qResenhas, (snap) => {
          setResenhas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Sessões
        const qSessoes = query(collection(db, "sessoes"));
        unsubSessoes = onSnapshot(qSessoes, (snap) => {
            const allSessoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSessoes(allSessoes);
            
            // Verifica qual sessão está ativa E o player faz parte
            // Checa expiração (só ativa se expiraEm for maior que agora)
            const ativa = allSessoes.find(s => {
                const agora = new Date();
                const fim = new Date(s.expiraEm);
                return agora <= fim; 
            });

            if (ativa && characterData && ativa.participantes?.includes(characterData.name)) {
                 setSessaoAtiva(ativa);
                 
                 // Puxa rolagem de dados da sessão se houver
                 if (ativa.latest_roll) {
                     const roll = ativa.latest_roll;
                     if (roll.timestamp > dismissedRollTimestamp.current) {
                        setRollResult(prev => {
                            if (!prev || prev.timestamp !== roll.timestamp) {
                                return roll;
                            }
                            return prev;
                        });
                     }
                 }
            } else {
                 setSessaoAtiva(null);
            }
        });

        // Disponibilidades do Calendário
        const qDisp = query(collection(db, "disponibilidades"));
        unsubDisponibilidades = onSnapshot(qDisp, (snap) => {
            setDisponibilidades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

      } else {
        setLoading(false);
        navigate('/login');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubMissoes();
      unsubResenhas();
      unsubChar();
      unsubSessoes();
      unsubDisponibilidades();
    };
  }, [navigate, characterData?.name, showLevelUpScreen]);

  // Player entra/sai da sessão (Presença Online)
  useEffect(() => {
    if (sessaoAtiva && sessaoAtiva.id && currentUser) {
        const sessaoRef = doc(db, "sessoes", sessaoAtiva.id);
        updateDoc(sessaoRef, { connected_players: arrayUnion(currentUser.uid) }).catch(e => console.log(e));
        
        return () => {
             updateDoc(sessaoRef, { connected_players: arrayRemove(currentUser.uid) }).catch(e => console.log(e));
        };
    }
  }, [sessaoAtiva?.id, currentUser?.uid]);

  const handleApplyMission = async (missaoId, missaoCandidatos) => {
    if (!characterData) return;
    const isAlreadyCandidate = missaoCandidatos?.find(c => c.uid === characterData.uid);
    if (isAlreadyCandidate) return alert("Você já se candidatou para esta missão!");

    const candidatar = window.confirm("Deseja se candidatar como membro ou LÍDER do grupo?\n\n[OK] para LÍDER\n[Cancelar] para Membro Comum");
    
    const candidateObj = {
      uid: characterData.uid,
      nome: characterData.name,
      classe: characterData.class,
      isLeader: candidatar
    };

    try {
      const missaoRef = doc(db, "missoes", missaoId);
      await updateDoc(missaoRef, {
        candidatos: arrayUnion(candidateObj)
      });
      alert("Candidatura enviada ao Mestre!");
    } catch (e) {
      alert("Erro ao candidatar: " + e.message);
    }
  };

  const handleLeaveMission = async (missaoId, missaoCandidatos) => {
      if (!characterData) return;
      const myCandidature = missaoCandidatos?.find(c => c.uid === characterData.uid);
      if (!myCandidature) return;

      if(window.confirm("Deseja retirar sua candidatura desta missão?")) {
          try {
              const missaoRef = doc(db, "missoes", missaoId);
              await updateDoc(missaoRef, {
                  candidatos: arrayRemove(myCandidature)
              });
          } catch(e) {
              alert("Erro ao sair da missão: " + e.message);
          }
      }
  };

  const handleCloseLevelUp = () => {
      setShowLevelUpScreen(false);
      setLevelUpData(null);
  };

  if (loading || !minTimeElapsed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', 
        background: 'radial-gradient(circle at center, #001a33 0%, #000000 100%)', 
        color: '#00f2ff', fontFamily: 'Cinzel, serif', zIndex: 9999, position: 'fixed', top: 0, left: 0
      }}>
        <img src={chocoboGif} alt="Carregando..." style={{ width: '120px', marginBottom: '20px' }} />
        <p style={{ 
          fontSize: '18px', letterSpacing: '4px', textTransform: 'uppercase',
          animation: 'pulseText 2s infinite ease-in-out' 
        }}>Sintonizando Éter...</p>
        <style>{`
          @keyframes pulseText { 
            0% { opacity: 0.4; transform: scale(0.98); } 
            50% { opacity: 1; transform: scale(1.02); } 
            100% { opacity: 0.4; transform: scale(0.98); } 
          }
        `}</style>
      </div>
    );
  }

  const myResenhas = resenhas.filter(r => r.destinatarios?.includes(characterData?.name));

  return (
    <div className="jogador-container">
      <div className="jogador-bg-image-full" style={{backgroundImage: `url(${fundoJogador})`}}></div>

      <div className="jogador-content">
        <div className="top-bar-flex">
            <h1 className="ff-title">GUILDA DOS AVENTUREIROS</h1>
            
            {characterData && (
                <div className="char-identity-box ff-card fade-in" onClick={() => setShowFicha(true)} style={{cursor: 'pointer'}}>
                    <div className="char-avatar-mini" style={{backgroundImage: `url(${characterData.character_sheet?.imgUrl})`}}></div>
                    <div className="char-info-mini">
                        <span className="char-name-mini">{characterData.name}</span>
                        <span className="char-class-mini">LVL {characterData.character_sheet?.basic_info?.level || 1} • {characterData.class}</span>
                    </div>
                </div>
            )}
        </div>

        {/* --- AVISO DE SESSÃO ATIVA --- */}
        {sessaoAtiva && (
            <div className={`active-session-banner fade-in ${sessaoAtiva.isArena ? 'arena-banner' : ''}`}>
                <div className="banner-pulse"></div>
                <div className="banner-info">
                    <h3>{sessaoAtiva.isArena ? '⚔️ ARENA PVP ATIVA' : '🔴 SESSÃO EM ANDAMENTO'}</h3>
                    <p>{sessaoAtiva.missaoNome}</p>
                </div>
                <div className="banner-actions">
                    <button className="btn-cyan action-btn" onClick={() => setShowMapManager(true)}>MAPA (VTT)</button>
                    <button className="btn-cyan action-btn" onClick={() => setShowSceneryManager(true)}>CENÁRIOS</button>
                    <button className="btn-cyan action-btn" onClick={() => setShowNPCManager(true)}>NPCS</button>
                    <button className="btn-cyan action-btn" onClick={() => setShowDiceSelector(true)}>🎲 ROLAR DADOS</button>
                </div>
            </div>
        )}

        <div className="player-dashboard-grid">
            
          {/* COLUNA 1: QUADRO DE MISSÕES GERAL */}
          <div className="ff-card board-column">
            <div className="card-header no-border">
              <h3>QUADRO DE MISSÕES</h3>
              <button className="btn-cyan-text" onClick={() => setShowCalendar(true)}>📅 AGENDA</button>
            </div>
            <div className="mission-scroll">
              {missoes.map(m => {
                const maxGroup = parseInt(m.grupo) || 0;
                const currentGroup = m.candidatos ? m.candidatos.length : 0;
                const fillPercent = maxGroup > 0 ? (currentGroup / maxGroup) * 100 : 0;
                const isFull = currentGroup >= maxGroup && maxGroup > 0;
                const isCandidate = m.candidatos?.find(c => c.uid === characterData?.uid);

                return (
                  <div key={m.id} className={`mission-poster rank-${m.rank} ${isCandidate ? 'applied' : ''}`}>
                    <div className="poster-rank-label-fixed">{m.rank}</div>
                    <span className="mestre-tag">Narrador: {m.mestreNome}</span>
                    <h4>{m.nome}</h4>
                    <p className="gil-recompensa">💰 Recompensa: {m.gilRecompensa} Gil</p>
                    
                    <div className="vagas-container">
                        <div className="vagas-labels">
                            <span>JOGADORES:</span>
                            <span style={{color: isFull ? '#f44' : '#0f0'}}>{currentGroup} / {maxGroup}</span>
                        </div>
                        <div className="vagas-track">
                            <div className="vagas-fill" style={{width: `${fillPercent}%`, background: isFull ? '#f44' : '#00f2ff'}}></div>
                        </div>
                    </div>

                    {isCandidate && <div className="candidature-badge">VOCÊ ESTÁ NA MISSÃO</div>}
                    
                    <div className="poster-actions" style={{marginTop: '10px'}}>
                        <button className="btn-cyan" onClick={() => setViewImage(m.imagem)}>CARTAZ</button>
                        <button className="btn-cyan" onClick={() => setShowDetails(m)}>DETALHES</button>
                        
                        {isCandidate ? (
                            <button className="btn-red" onClick={() => handleLeaveMission(m.id, m.candidatos)}>DESISTIR</button>
                        ) : (
                            <button className="btn-gold-action" disabled={isFull} onClick={() => handleApplyMission(m.id, m.candidatos)}>
                                {isFull ? 'LOTAÇÃO MÁXIMA' : 'CANDIDATAR-SE'}
                            </button>
                        )}
                    </div>
                  </div>
                );
              })}
              {missoes.length === 0 && <p style={{textAlign:'center', color:'#64748b'}}>Nenhum cartaz no momento.</p>}
            </div>
          </div>

          {/* COLUNA 2: RESENHAS DO SANCHEZ (APENAS DIRECIONADAS AO PLAYER) */}
          <div className="ff-card sanchez-card board-column">
            <div className="sanchez-header-top no-border">
              <h3>CRÔNICAS PARA VOCÊ</h3>
            </div>
            <div className="mission-scroll">
              {myResenhas.length === 0 ? (
                  <p style={{textAlign:'center', color:'#64748b', fontStyle:'italic', marginTop:'20px'}}>Sanches não escreveu nada sobre suas aventuras ainda...</p>
              ) : (
                  myResenhas.map(r => (
                    <div key={r.id} className="resenha-item-card">
                      <h4>{r.titulo}</h4>
                      <p style={{fontSize:'0.7rem', color:'#94a3b8', margin:'5px 0'}}>Escrito por: {r.mestre}</p>
                      <button className="btn-cyan" style={{width:'100%', marginTop:'10px'}} onClick={() => setViewResenha(r)}>LER CRÔNICA</button>
                    </div>
                  ))
              )}
            </div>
          </div>

        </div>
      </div>

      <GuildBoard isMaster={false} />
      <Bazar isMestre={false} playerData={characterData} />

      {/* --- RENDERIZAÇÃO DOS COMPONENTES DO VTT (OCULTOS POR PADRÃO) --- */}
      {sessaoAtiva && (
          <>
             {/* MapManager no Jogador só mostra o Tabletop que o mestre ativou (controlado internamente pelo Tabletop) */}
             <Tabletop 
                 sessaoData={sessaoAtiva} 
                 isMaster={false} 
                 showManager={showMapManager} 
                 onCloseManager={() => setShowMapManager(false)}
                 currentUserUid={currentUser?.uid}
             />
             <SceneryViewer 
                 sessaoData={sessaoAtiva} 
                 isMaster={false} 
                 showManager={showSceneryManager} 
                 onCloseManager={() => setShowSceneryManager(false)} 
             />
             <NPCViewer 
                 sessaoData={sessaoAtiva} 
                 isMaster={false} 
                 showManager={showNPCManager} 
                 onCloseManager={() => setShowNPCManager(false)} 
             />
          </>
      )}

      {showDiceSelector && sessaoAtiva && (
          <DiceSelector 
              sessaoId={sessaoAtiva.id} 
              playerName={characterData?.name || "Aventureiro"} 
              onClose={() => setShowDiceSelector(false)} 
          />
      )}
      
      {rollResult && (
          <DiceResult 
              rollData={rollResult} 
              onClose={() => {
                  dismissedRollTimestamp.current = rollResult.timestamp;
                  setRollResult(null);
              }} 
          />
      )}

      {showFicha && characterData && (
        <Ficha 
          characterData={characterData} 
          isMaster={false} 
          onClose={() => setShowFicha(false)} 
        />
      )}

      {showCalendar && (
         <CalendarSystemPlayer 
            onClose={() => setShowCalendar(false)} 
            disponibilidades={disponibilidades}
            sessoes={sessoes.filter(s => s.participantes?.includes(characterData?.name))} 
         />
      )}

      {showDetails && (
        <div className="ff-modal-overlay-fixed" onClick={() => setShowDetails(null)}>
          <div className="ff-modal ff-card detail-view-main" onClick={e => e.stopPropagation()}>
            <div className="detail-header-modern"><div className={`detail-rank-badge rank-${showDetails.rank}`}>{showDetails.rank}</div><div className="detail-title-col"><h2>{showDetails.nome}</h2><span className="detail-narrator">Narrador: {showDetails.mestreNome}</span></div></div>
            <div className="detail-body-grid">
              <div className="detail-info-row"><div className="info-item"><label>🌍 LOCAL</label><span>{showDetails.local || "Desconhecido"}</span></div><div className="info-item"><label>👤 CONTRATANTE</label><span>{showDetails.contratante || "Anônimo"}</span></div></div>
              <div className="detail-section">
                <label className="section-label">VAGAS</label>
                <div style={{background: '#111', padding: '10px', borderRadius: '4px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:'11px', color:'#aaa', marginBottom:'5px'}}>
                    <span>STATUS DO GRUPO</span>
                    <span>{showDetails.candidatos ? showDetails.candidatos.length : 0} / {showDetails.grupo || '?'}</span>
                  </div>
                  <div style={{width: '100%', height: '6px', background: '#333', borderRadius:'3px'}}>
                    <div style={{ width: `${Math.min(((showDetails.candidatos?.length || 0) / (parseInt(showDetails.grupo) || 1)) * 100, 100)}%`, height:'100%', background: (showDetails.candidatos?.length >= parseInt(showDetails.grupo)) ? '#f44' : '#00f2ff' }}></div>
                  </div>
                </div>
              </div>
              <div className="detail-section"><label className="section-label">📜 DESCRIÇÃO</label><p className="section-text">{showDetails.descricaoMissao}</p></div>
              <div className="detail-section"><label className="section-label">⚔️ OBJETIVOS</label><p className="section-text">{showDetails.objetivosMissao}</p></div>
              <div className="detail-section"><label className="section-label">⚡ REQUISITOS</label><p className="section-text">{showDetails.requisitos}</p></div>
              <div className="detail-section reward-section"><label className="section-label">💎 RECOMPENSAS</label><div className="reward-content-box"><div className="gil-display-row"><span className="gil-icon">💰</span> <span className="gil-value">{showDetails.gilRecompensa || 0} GIL</span></div>{showDetails.recompensa && (<div className="extra-rewards-list">{showDetails.recompensa.split('\n').map((r,i) => (<div key={i} className="reward-item">• {r}</div>))}</div>)}</div></div>
            </div>
            <button className="ff-final-close-btn" onClick={() => setShowDetails(null)}>FECHAR RELATÓRIO</button>
          </div>
        </div>
      )}

      {viewImage && (
        <div className="ff-modal-overlay-fixed" onClick={() => setViewImage(null)}>
          <div className="lightbox-wrap"><button className="close-lightbox" onClick={() => setViewImage(null)}>×</button><img src={viewImage} alt="Cartaz" className="cartaz-full-view" /></div>
        </div>
      )}

      {viewResenha && (
        <div className="fft-modal-overlay" onClick={() => setViewResenha(null)}>
          <div className="fft-dialog-box" onClick={e => e.stopPropagation()}>
             <div className="fft-portrait-section">
                <div className="fft-portrait-frame">
                   <img src={sanchezImg} alt="Sanchez" />
                </div>
                <div className="fft-name-plate">
                   SANCHEZ
                </div>
             </div>

             <div className="fft-content-section">
                <h2 className="fft-title">{viewResenha.titulo}</h2>
                <div className="fft-scroll-text" dangerouslySetInnerHTML={formatSanchezText(viewResenha.conteudo)}></div>
             </div>

             <button className="fft-close-btn" onClick={() => setViewResenha(null)}>X</button>
          </div>
        </div>
      )}

      {/* --- LEVEL UP MODAL --- */}
      {showLevelUpScreen && levelUpData && (
          <div className="level-up-fullscreen-modal">
              <div className="levelup-content-wrapper">
                  <div className="levelup-portrait" style={{backgroundImage: `url(${levelUpData.imgUrl})`}}></div>
                  <div className="levelup-info">
                      <h1 className="levelup-title-anim">LEVEL UP!</h1>
                      <h2 className="levelup-char-name">{levelUpData.name}</h2>
                      <p className="levelup-class-info">{levelUpData.class}</p>
                      <div className="levelup-stats-box">
                          <p>O personagem atingiu o nível de poder necessário para evoluir.</p>
                          <div className="lvl-badge-big">NÍVEL {levelUpData.level}</div>
                      </div>
                      <button className="levelup-confirm-btn" onClick={handleCloseLevelUp}>AVANÇAR</button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .jogador-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; background: #020617; font-family: 'Cinzel', serif; color: #e2e8f0; }
        .jogador-bg-image-full { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.2; z-index: 0; animation: slowPan 60s infinite alternate; }
        @keyframes slowPan { from { transform: scale(1.0); } to { transform: scale(1.1); } }
        
        .jogador-content { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
        .top-bar-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .ff-title { font-size: 2rem; color: #00f2ff; text-shadow: 0 0 10px rgba(0, 242, 255, 0.5); letter-spacing: 4px; margin: 0; }
        
        .char-identity-box { padding: 10px 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.6); border: 1px solid #00f2ff; border-radius: 4px; transition: 0.2s; }
        .char-identity-box:hover { background: rgba(0, 242, 255, 0.1); box-shadow: 0 0 15px rgba(0, 242, 255, 0.3); }
        .char-avatar-mini { width: 40px; height: 40px; border-radius: 50%; border: 1px solid #fff; background-size: cover; background-position: center; }
        .char-info-mini { display: flex; flex-direction: column; }
        .char-name-mini { font-size: 1rem; color: #fbbf24; font-weight: bold; }
        .char-class-mini { font-size: 0.7rem; color: #94a3b8; }

        .active-session-banner { background: rgba(0, 242, 255, 0.1); border: 1px solid #00f2ff; padding: 15px 25px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; position: relative; overflow: hidden; box-shadow: 0 0 20px rgba(0, 242, 255, 0.2); }
        .active-session-banner.arena-banner { background: rgba(168, 85, 247, 0.1); border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.2); }
        .banner-pulse { position: absolute; left: 0; top: 0; height: 100%; width: 4px; background: #00f2ff; animation: pulseBorder 1.5s infinite; }
        .active-session-banner.arena-banner .banner-pulse { background: #a855f7; }
        @keyframes pulseBorder { 0% { opacity: 0.5; } 50% { opacity: 1; box-shadow: 0 0 10px #00f2ff; } 100% { opacity: 0.5; } }
        
        .banner-info h3 { margin: 0 0 5px 0; color: #00f2ff; font-size: 1.2rem; letter-spacing: 2px; }
        .active-session-banner.arena-banner .banner-info h3 { color: #c4b5fd; }
        .banner-info p { margin: 0; color: #e2e8f0; font-size: 0.9rem; }
        .banner-actions { display: flex; gap: 10px; }
        .action-btn { font-size: 0.8rem; padding: 10px 20px; }
        .active-session-banner.arena-banner .action-btn { border-color: #a855f7; color: #c4b5fd; }
        .active-session-banner.arena-banner .action-btn:hover { background: rgba(168, 85, 247, 0.2); color: #fff; }

        .player-dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; flex: 1; min-height: 0; }
        
        .board-column { display: flex; flex-direction: column; height: 100%; background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-radius: 8px; overflow: hidden; backdrop-filter: blur(5px); box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .card-header { padding: 15px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); }
        .card-header h3 { margin: 0; color: #e2e8f0; font-size: 1rem; letter-spacing: 2px; }
        .no-border { border-bottom: none !important; }
        
        .mission-scroll { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 15px; scrollbar-width: thin; scrollbar-color: #00f2ff #0f172a; }
        .mission-scroll::-webkit-scrollbar { width: 6px; }
        .mission-scroll::-webkit-scrollbar-thumb { background: #00f2ff; border-radius: 3px; }

        .mission-poster { background: #1e293b; border: 1px solid #334155; padding: 15px; border-radius: 4px; position: relative; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .mission-poster:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.3); border-color: #00f2ff; }
        .mission-poster.applied { border-color: #fbbf24; background: rgba(251, 191, 36, 0.05); }
        
        .mission-poster h4 { margin: 25px 0 5px 0; color: #00f2ff; font-size: 1.1rem; text-transform: uppercase; }
        .mission-poster.applied h4 { color: #fbbf24; }
        .poster-rank-label-fixed { position: absolute; top: 10px; right: 10px; font-weight: 900; font-size: 1.5rem; opacity: 0.3; color: #fff; }
        .mestre-tag { font-size: 0.7rem; color: #94a3b8; display: block; margin-bottom: 5px; }
        .gil-recompensa { font-size: 0.9rem; color: #fcd34d; font-weight: bold; margin-bottom: 10px; }
        
        .vagas-container { background: #0f172a; padding: 8px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #334155; }
        .vagas-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: #cbd5e1; margin-bottom: 4px; }
        .vagas-track { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; }
        .vagas-fill { height: 100%; transition: width 0.3s ease; }
        
        .candidature-badge { background: #fbbf24; color: #000; text-align: center; font-size: 0.7rem; font-weight: bold; padding: 4px; border-radius: 2px; margin-bottom: 10px; letter-spacing: 1px; }
        
        .poster-actions { display: flex; gap: 5px; justify-content: space-between; }
        .btn-cyan { flex: 1; padding: 6px; font-size: 0.7rem; background: transparent; border: 1px solid #00f2ff; color: #00f2ff; cursor: pointer; transition: 0.2s; font-weight: bold; text-transform: uppercase; }
        .btn-cyan:hover { background: rgba(0, 242, 255, 0.1); }
        .btn-cyan-text { background: transparent; border: none; color: #00f2ff; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; font-size: 0.8rem; }
        .btn-cyan-text:hover { color: #fff; }
        .btn-red { flex: 1; padding: 6px; font-size: 0.7rem; background: transparent; border: 1px solid #ef4444; color: #ef4444; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .btn-red:hover { background: rgba(239, 68, 68, 0.1); }
        .btn-gold-action { flex: 2; padding: 6px; font-size: 0.7rem; background: #fbbf24; border: 1px solid #fbbf24; color: #000; cursor: pointer; transition: 0.2s; font-weight: bold; text-transform: uppercase; }
        .btn-gold-action:hover:not(:disabled) { background: #f59e0b; }
        .btn-gold-action:disabled { background: #334155; border-color: #334155; color: #94a3b8; cursor: not-allowed; }

        .sanchez-card { border-color: #00f2ff; }
        .sanchez-header-top { padding: 15px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #00f2ff; background: rgba(0, 242, 255, 0.05); }
        .sanchez-header-top h3 { color: #00f2ff; text-shadow: 0 0 5px rgba(0, 242, 255, 0.5); margin: 0; letter-spacing: 2px;}
        .resenha-item-card { background: #0f172a; border: 1px solid #334155; padding: 15px; border-radius: 4px; border-left: 3px solid #00f2ff; }
        .resenha-item-card h4 { margin: 0 0 10px 0; color: #e2e8f0; font-size: 1rem; }

        /* MODAIS GERAIS */
        .ff-modal-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .ff-card { background: #0f172a; border: 1px solid #fbbf24; border-radius: 8px; box-shadow: 0 0 30px rgba(0,0,0,0.8); }
        
        .btn-cancelar-main { background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: 'Cinzel', serif; }
        .btn-cancelar-main:hover { border-color: #fff; color: #fff; }

        /* --- FINAL FANTASY TACTICS MODAL STYLE --- */
        .fft-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        
        .fft-dialog-box {
          position: relative;
          width: 800px;
          max-width: 95vw;
          height: 450px;
          max-height: 90vh;
          background: linear-gradient(180deg, #001a4d 0%, #000022 100%);
          border: 4px solid #b8860b;
          border-radius: 8px;
          box-shadow: 0 0 30px rgba(0,0,0,0.8), inset 0 0 50px rgba(0,0,0,0.5);
          display: flex;
          align-items: flex-start;
          padding: 30px;
          gap: 20px;
          color: #fff;
          font-family: 'Cinzel', serif;
        }

        .fft-portrait-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          width: 150px;
          flex-shrink: 0;
        }

        .fft-portrait-frame {
          width: 140px;
          height: 180px;
          border: 3px solid #b8860b;
          background: #000;
          overflow: hidden;
          box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }
        .fft-portrait-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .fft-name-plate {
          width: 100%;
          background: linear-gradient(90deg, #b8860b, #8a6e14);
          color: #000;
          text-align: center;
          font-weight: bold;
          padding: 5px 0;
          font-size: 0.9rem;
          border: 1px solid #ffd700;
          box-shadow: 0 2px 5px rgba(0,0,0,0.5);
          letter-spacing: 1px;
        }

        .fft-content-section {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .fft-title {
          margin: 0 0 15px 0;
          font-size: 1.8rem;
          color: #00f2ff;
          text-shadow: 0 0 5px rgba(0, 242, 255, 0.5);
          border-bottom: 1px solid #b8860b;
          padding-bottom: 10px;
          letter-spacing: 1px;
        }

        .fft-scroll-text {
          flex: 1;
          overflow-y: auto;
          font-family: 'Lato', sans-serif;
          font-size: 1.1rem;
          line-height: 1.6;
          color: #e0e0e0;
          padding-right: 10px;
          scrollbar-width: none; 
          -ms-overflow-style: none; 
        }
        .fft-scroll-text::-webkit-scrollbar { 
          display: none; 
        }

        .fft-close-btn {
          position: absolute;
          top: -15px;
          right: -15px;
          width: 40px;
          height: 40px;
          background: #b8860b;
          color: #000;
          font-weight: bold;
          border: 2px solid #fff;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: sans-serif;
          box-shadow: 0 0 10px #000;
          transition: 0.2s;
        }
        .fft-close-btn:hover {
          background: #ffd700;
          transform: scale(1.1);
        }

        /* DETALHES MISSÃO (MODAL NOVO) */
        .detail-view-main { width: 800px; max-width: 95vw; height: 600px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; border: 2px solid #fbbf24; border-radius: 8px; }
        .detail-header-modern { background: linear-gradient(90deg, #1e293b, #0f172a); padding: 20px; border-bottom: 1px solid #334155; display: flex; gap: 20px; align-items: center; }
        .detail-rank-badge { font-size: 3rem; font-weight: 900; color: rgba(255,255,255,0.1); text-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
        .detail-rank-badge.rank-S, .detail-rank-badge.rank-SS { color: #fbbf24; opacity: 1; }
        .detail-title-col h2 { margin: 0; font-size: 2rem; color: #f1f5f9; letter-spacing: 2px; }
        .detail-narrator { color: #00f2ff; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; }
        .detail-body-grid { flex: 1; overflow-y: auto; padding: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        .detail-info-row { grid-column: 1 / -1; display: flex; gap: 40px; border-bottom: 1px solid #334155; padding-bottom: 20px; }
        .info-item label { color: #fbbf24; font-size: 0.7rem; font-weight: bold; display: block; margin-bottom: 5px; }
        .info-item span { color: #fff; font-size: 1.1rem; }
        .detail-section { margin-bottom: 10px; }
        .section-label { display: block; color: #94a3b8; font-size: 0.75rem; font-weight: bold; margin-bottom: 8px; border-left: 3px solid #fbbf24; padding-left: 8px; }
        .section-text { color: #cbd5e1; line-height: 1.6; font-size: 0.95rem; white-space: pre-wrap; }
        .reward-section { grid-column: 1 / -1; background: rgba(251, 191, 36, 0.05); padding: 15px; border: 1px solid rgba(251, 191, 36, 0.2); border-radius: 6px; }
        .reward-content-box { display: flex; justify-content: space-between; align-items: center; }
        .gil-display-row { font-size: 1.5rem; font-weight: bold; color: #fff; display: flex; align-items: center; gap: 10px; }
        .gil-value { color: #fcd34d; }
        .extra-rewards-list { text-align: right; color: #fbbf24; font-size: 0.9rem; font-style: italic; }
        .ff-final-close-btn { width: 100%; padding: 20px; background: #020617; color: #fff; border: none; border-top: 1px solid #334155; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.2s; letter-spacing: 2px; }
        .ff-final-close-btn:hover { background: #fbbf24; color: #000; }

        /* LIGHTBOX */
        .lightbox-wrap { position: relative; max-width: 90vw; max-height: 90vh; }
        .cartaz-full-view { max-width: 100%; max-height: 90vh; border: 3px solid #00f2ff; box-shadow: 0 0 50px #000; }
        .close-lightbox { position: absolute; top: -40px; right: -40px; background: transparent; border: none; color: #fff; font-size: 40px; cursor: pointer; }

        /* --- TELA DE LEVEL UP ESTILO FINAL FANTASY TACTICS --- */
        .level-up-fullscreen-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.9);
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            animation: fadeInLevelUp 1s ease-out forwards;
        }

        @keyframes fadeInLevelUp {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .levelup-content-wrapper {
            display: flex;
            align-items: center;
            gap: 50px;
            background: linear-gradient(135deg, rgba(20, 30, 60, 0.9), rgba(0, 0, 0, 0.95));
            border: 2px solid #b8860b;
            padding: 50px;
            border-radius: 12px;
            box-shadow: 0 0 50px rgba(255, 204, 0, 0.2), inset 0 0 100px rgba(0, 0, 0, 0.8);
            animation: zoomIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .levelup-portrait {
            width: 250px;
            height: 350px;
            background-size: cover;
            background-position: center;
            border: 4px solid #fff;
            border-radius: 8px;
            box-shadow: 0 0 30px #00f2ff;
        }

        .levelup-info {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            color: #fff;
            font-family: 'Cinzel', serif;
        }

        .levelup-title-anim {
            font-size: 60px;
            color: #ffcc00;
            margin: 0 0 10px 0;
            letter-spacing: 10px;
            text-shadow: 
                3px 3px 0 #000,
                -1px -1px 0 #000,  
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000,
                0 0 20px #ffcc00,
                0 0 40px #ffcc00;
            animation: pulseText 1.5s infinite alternate;
        }

        .levelup-char-name {
            font-size: 30px;
            color: #00f2ff;
            margin: 0;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .levelup-class-info {
            font-size: 16px;
            color: #aaa;
            margin: 5px 0 30px 0;
            letter-spacing: 4px;
            text-transform: uppercase;
            border-bottom: 1px solid #444;
            padding-bottom: 10px;
            width: 100%;
        }

        .levelup-stats-box {
            background: rgba(0,0,0,0.5);
            border: 1px solid #444;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            width: 100%;
        }

        .levelup-stats-box p {
            margin: 0 0 15px 0;
            color: #ccc;
            font-size: 14px;
        }

        .lvl-badge-big {
            font-size: 40px;
            color: #fff;
            font-weight: bold;
            text-shadow: 0 0 15px #00f2ff;
        }

        .levelup-confirm-btn {
            background: linear-gradient(to bottom, #b8860b, #8a6e14);
            border: 2px solid #fff;
            color: #000;
            font-family: 'Cinzel', serif;
            font-size: 18px;
            font-weight: bold;
            padding: 10px 40px;
            cursor: pointer;
            box-shadow: 0 0 15px #ffcc00;
            transition: 0.2s;
            border-radius: 50px;
        }
        
        .levelup-confirm-btn:hover {
            transform: scale(1.1);
            background: #ffd700;
            color: #000;
            box-shadow: 0 0 30px #ffd700;
        }

        @keyframes zoomIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        /* --- RESPONSIVIDADE MOBILE --- */
        @media (max-width: 850px) {
            .detail-body-grid { grid-template-columns: 1fr; gap: 15px; padding: 15px; }
            .detail-info-row { flex-direction: column; gap: 10px; }
            .detail-header-modern { flex-direction: column; text-align: center; gap: 10px; padding: 15px; }
            .reward-content-box { flex-direction: column; align-items: flex-start; gap: 10px; }
            .extra-rewards-list { text-align: left; }
            
            /* Ajustes gerais do painel do jogador para mobile */
            .player-dashboard-grid { grid-template-columns: 1fr; }
            .top-bar-flex { flex-direction: column; gap: 15px; text-align: center; }
            .char-identity-box { width: 100%; justify-content: center; }
            .card-header { flex-direction: column; gap: 10px; text-align: center; }
            .btn-group-ff { flex-direction: column; }
            
            .fft-dialog-box { flex-direction: column; height: auto; max-height: 90vh; align-items: center; padding: 20px; }
            .fft-portrait-section { width: 100px; }
            .fft-portrait-frame { width: 100px; height: 130px; }
            .fft-title { font-size: 1.4rem; text-align: center; }
            
            .levelup-content-wrapper { flex-direction: column; padding: 20px; text-align: center; gap: 20px; }
            .levelup-portrait { width: 150px; height: 200px; }
            .levelup-title-anim { font-size: 40px; }
            .levelup-char-name { font-size: 24px; }
            .lvl-badge-big { font-size: 30px; }
        }
      `}</style>
    </div>
  );
}