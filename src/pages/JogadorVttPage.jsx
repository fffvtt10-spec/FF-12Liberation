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

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;
      if (distance < 0) setTimeLeft("AGORA");
      else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
      }
    };
    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  return <span className="countdown-text">{timeLeft}</span>;
};

const CombatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
      <path d="M13 19l6-6" />
      <path d="M16 16l4 4" />
      <path d="M19 21l2-2" />
    </svg>
);

export default function JogadorVttPage() {
  const navigate = useNavigate();
  const [personagem, setPersonagem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missoes, setMissoes] = useState([]);
  const [allSessoes, setAllSessoes] = useState([]); 
  const [sessoesAtivas, setSessoesAtivas] = useState([]); 
  const [sessoesFuturas, setSessoesFuturas] = useState([]); 
  const [hasJoinedSession, setHasJoinedSession] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showMissionDetails, setShowMissionDetails] = useState(null); 
  const [viewImage, setViewImage] = useState(null); 
  const [resenhas, setResenhas] = useState([]);
  const [showResenhasList, setShowResenhasList] = useState(false);
  const [viewResenha, setViewResenha] = useState(null);
  const [vttStatus, setVttStatus] = useState(null); 
  const [currentVttSession, setCurrentVttSession] = useState(null);
  const [showFicha, setShowFicha] = useState(false);
  
  const [showCombatTracker, setShowCombatTracker] = useState(false);
  const [viewMonsterDetails, setViewMonsterDetails] = useState(null); 
  const [trackerPos, setTrackerPos] = useState({ x: 280, y: 100 });
  const [isDraggingTracker, setIsDraggingTracker] = useState(false);
  const [dragOffsetTracker, setDragOffsetTracker] = useState({ x: 0, y: 0 });

  const [showDiceSelector, setShowDiceSelector] = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const dismissedRollTimestamp = useRef(0);
  const [unreadResenhas, setUnreadResenhas] = useState(0);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const prevLevelRef = useRef(null); 
  const audioRef = useRef(new Audio(levelUpMusic)); 

  useEffect(() => {
    if (backgroundMusic) { backgroundMusic.pause(); backgroundMusic.currentTime = 0; }
  }, []);

  useEffect(() => {
    audioRef.current.volume = 0.2;
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const ativas = []; const futuras = [];
    allSessoes.forEach(s => {
        const inicio = new Date(s.dataInicio); const fim = new Date(s.expiraEm);
        if (currentTime >= inicio && currentTime <= fim) ativas.push(s); else if (currentTime < inicio) futuras.push(s);
    });
    setSessoesAtivas(ativas); setSessoesFuturas(futuras);
  }, [currentTime, allSessoes]);

  useEffect(() => {
    let unsubChar = () => {}; let unsubMissoes = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            const docRef = doc(db, "characters", user.uid);
            unsubChar = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const currentLevel = data.character_sheet?.basic_info?.level || 1;
                    if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current) {
                        setShowLevelUpModal(true); audioRef.current.currentTime = 0; audioRef.current.play().catch(console.error);
                    }
                    prevLevelRef.current = currentLevel;
                    setPersonagem(data); setLoading(false); 
                } else setLoading(false);
            });
            const qMissoes = query(collection(db, "missoes"));
            unsubMissoes = onSnapshot(qMissoes, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        } else { setLoading(false); navigate('/login'); }
    });
    return () => { unsubscribeAuth(); unsubChar(); unsubMissoes(); };
  }, [navigate]);

  useEffect(() => {
      if (!personagem) return;
      const qSessoes = query(collection(db, "sessoes"), where("participantes", "array-contains", personagem.name));
      const unsubSessoes = onSnapshot(qSessoes, (snap) => {
        const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllSessoes(todas);
        if (currentVttSession) {
            const sessionUpdated = todas.find(s => s.id === currentVttSession.id);
            if (sessionUpdated) {
                setCurrentVttSession(sessionUpdated);
                if (sessionUpdated.latest_roll) {
                     const roll = sessionUpdated.latest_roll;
                     if (roll.timestamp > dismissedRollTimestamp.current) {
                        setRollResult(prev => { if (!prev || prev.timestamp !== roll.timestamp) return roll; return prev; });
                     }
                }
                const playerInList = sessionUpdated.connected_players?.includes(auth.currentUser?.uid);
                setVttStatus(playerInList ? 'connected' : 'waiting');
            }
        }
      });
      const qResenhas = query(collection(db, "resenhas"), where("destinatarios", "array-contains", personagem.name));
      const unsubResenhas = onSnapshot(qResenhas, (snap) => {
        const validas = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => new Date(r.expiraEm) > new Date());
        setResenhas(validas);
        const lastSeen = parseInt(localStorage.getItem('sanchez_last_read_count') || '0');
        if (validas.length > lastSeen) setUnreadResenhas(validas.length - lastSeen); else setUnreadResenhas(0);
      });
      return () => { unsubSessoes(); unsubResenhas(); };
  }, [personagem, currentVttSession?.id]); 

  useEffect(() => {
      if (!currentVttSession || !auth.currentUser) return;
      const sessionRef = doc(db, "sessoes", currentVttSession.id);
      const userId = auth.currentUser.uid;
      updateDoc(sessionRef, { connected_players: arrayUnion(userId) }).catch(console.error);
      const handleBeforeUnload = () => {};
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          updateDoc(sessionRef, { connected_players: arrayRemove(userId) }).catch(console.error);
      };
  }, [currentVttSession?.id]); 

  const handleConfirmLevelUp = () => { setShowLevelUpModal(false); audioRef.current.pause(); };
  
  const handleCandidatar = async (missao) => {
    if (!personagem) return;
    if (missao.candidatos?.some(c => c.uid === auth.currentUser.uid)) return alert("Já candidatado!");
    const isLeader = !missao.candidatos || missao.candidatos.length === 0;
    const candidatoObj = { uid: auth.currentUser.uid, nome: personagem.name, classe: personagem.class, isLeader, dataCandidatura: new Date().toISOString() };
    try {
      await updateDoc(doc(db, "missoes", missao.id), { candidatos: arrayUnion(candidatoObj) });
      alert(isLeader ? "Você é o LÍDER DO GRUPO!" : "Candidatura realizada!");
    } catch (e) { console.error(e); alert("Erro ao candidatar."); }
  };

  const enterVTT = (sessao) => { setCurrentVttSession(sessao); setHasJoinedSession(true); setVttStatus(new Date() >= new Date(sessao.dataInicio) ? 'connected' : 'waiting'); };
  const handleOpenSanchez = () => { setShowResenhasList(true); localStorage.setItem('sanchez_last_read_count', resenhas.length.toString()); setUnreadResenhas(0); };

  // --- DRAG WINDOW LOGIC ---
  const handleTrackerMouseDown = (e) => {
      setIsDraggingTracker(true);
      setDragOffsetTracker({ x: e.clientX - trackerPos.x, y: e.clientY - trackerPos.y });
  };
  const handleWindowMouseMove = (e) => {
      if (isDraggingTracker) { setTrackerPos({ x: e.clientX - dragOffsetTracker.x, y: e.clientY - dragOffsetTracker.y }); }
  };
  const handleWindowMouseUp = () => { setIsDraggingTracker(false); };

  if (loading) return <div className="loading-screen"><img src={chocoboGif} width="100"/></div>;
  if (!personagem) return <div className="loading-screen">Nenhum personagem encontrado.</div>;

  return (
    <div className="jogador-container" onMouseMove={handleWindowMouseMove} onMouseUp={handleWindowMouseUp}>
      <div className="background-layer" style={{ backgroundImage: `url(${fundoJogador})` }} />
      <div className="content-layer">

        <div className="char-hud clickable-hud" onClick={() => setShowFicha(true)} title="Abrir Ficha">
          <div className="char-avatar"><div className="avatar-circle"><span className="hud-level">{personagem.character_sheet?.basic_info?.level || 1}</span></div></div>
          <div className="char-info"><h2 className="char-name">{personagem.name}</h2><span className="char-meta">{personagem.race} // {personagem.class}</span></div>
        </div>

        {currentVttSession && currentVttSession.active_map && (
            <Tabletop sessaoData={currentVttSession} isMaster={false} currentUserUid={auth.currentUser?.uid} personagensData={[personagem]} />
        )}

        <SceneryViewer sessaoData={currentVttSession} isMaster={false} />
        <NPCViewer sessaoData={currentVttSession} isMaster={false} />
        {rollResult && <DiceResult rollData={rollResult} onClose={() => { dismissedRollTimestamp.current = rollResult.timestamp; setRollResult(null); }} />}
        {showDiceSelector && currentVttSession && <DiceSelector sessaoId={currentVttSession.id} playerName={personagem.name} onClose={() => setShowDiceSelector(false)} />}
        
        {/* MODAL DE COMBATE */}
        {showCombatTracker && currentVttSession && (
            <div 
                className="combat-tracker-panel player-view fade-in"
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
                    {currentVttSession.tokens?.map((token, index) => {
                        const isVisible = token.visible !== false;
                        if(!isVisible) return null; 

                        let imgUrl = token.img;
                        if(token.uid === auth.currentUser.uid && personagem.character_sheet?.imgUrl) {
                            imgUrl = personagem.character_sheet.imgUrl;
                        }

                        // AGORA MOSTRA SEMPRE A VIDA DOS INIMIGOS
                        let hpDisplay = "?", mpDisplay = "?";
                        let hpMax = "?", mpMax = "?";

                        if (token.uid === auth.currentUser.uid) {
                            hpDisplay = personagem.character_sheet?.status?.hp?.current;
                            hpMax = personagem.character_sheet?.status?.hp?.max;
                            mpDisplay = personagem.character_sheet?.status?.mp?.current;
                            mpMax = personagem.character_sheet?.status?.mp?.max;
                        } else if (token.type === 'enemy') {
                            // MOSTRA VIDA DO INIMIGO
                            hpDisplay = token.stats?.hp?.current;
                            hpMax = token.stats?.hp?.max;
                            mpDisplay = token.stats?.mp?.current;
                            mpMax = token.stats?.mp?.max;
                        } else if (token.visibleBars) {
                            hpDisplay = token.stats?.hp?.current;
                            hpMax = token.stats?.hp?.max;
                            mpDisplay = token.stats?.mp?.current;
                            mpMax = token.stats?.mp?.max;
                        }

                        return (
                            <div key={token.id} className="tracker-item readonly">
                                <div className="t-col-img">
                                    <div className="t-index">{index + 1}</div>
                                    <div className="t-img" style={{backgroundImage: `url(${imgUrl})`, backgroundPosition: `${token.imgX||50}% ${token.imgY||50}%`}}></div>
                                </div>
                                <div className="t-col-info">
                                    <div className="t-name">{token.name}</div>
                                    <div className="t-stats-row">
                                        <div className="t-stat hp">
                                            <label>HP</label>
                                            <span>{hpDisplay}</span>
                                            {hpMax !== "?" && <small>/{hpMax}</small>}
                                        </div>
                                        <div className="t-stat mp">
                                            <label>MP</label>
                                            <span>{mpDisplay}</span>
                                            {mpMax !== "?" && <small>/{mpMax}</small>}
                                        </div>
                                    </div>
                                </div>
                                {token.type === 'enemy' && (
                                    <div className="t-col-actions">
                                        <button className="btn-icon-sm" title="Detalhes" onClick={() => setViewMonsterDetails({...token.details, img: token.img})}>📜</button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {(!currentVttSession.tokens || currentVttSession.tokens.length === 0) && <div className="empty-tracker">Mesa Vazia</div>}
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
                        <div className="md-sub">Nível de Ameaça</div>
                    </div>
                    <div className="md-body">
                        <div className="md-img-col">
                            <div className="md-portrait" style={{backgroundImage: `url(${viewMonsterDetails.img})`}}></div>
                        </div>
                        <div className="md-info-col custom-scrollbar">
                            <div className="md-block">
                                <label>DESCRIÇÃO</label>
                                <p>{viewMonsterDetails.description || "Sem dados disponíveis."}</p>
                            </div>
                            {viewMonsterDetails.drops && (
                                <div className="md-block">
                                    <label>DROPS CONHECIDOS</label>
                                    <p>{viewMonsterDetails.drops}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="md-close-btn" onClick={() => setViewMonsterDetails(null)}>FECHAR</button>
                </div>
            </div>
        )}

        {showLevelUpModal && <div className="levelup-global-overlay"><div className="levelup-content"><h1 className="levelup-title">LEVEL UP!</h1><button className="levelup-confirm-btn" onClick={handleConfirmLevelUp}>CONFIRMAR</button></div></div>}
        {sessoesFuturas.length > 0 && sessoesAtivas.length === 0 && !hasJoinedSession && <div className="upcoming-sessions-banner"><h3>A SESSÃO VAI COMEÇAR EM BREVE</h3>{sessoesFuturas.map(s => <div key={s.id} className="countdown-row"><span className="sessao-nome-future">{s.missaoNome}</span><CountdownTimer targetDate={s.dataInicio} /></div>)}</div>}
        {sessoesAtivas.length > 0 && !hasJoinedSession && <div className="active-sessions-banner fade-in"><h3>SESSÃO EM ANDAMENTO!</h3>{sessoesAtivas.map(s => <div key={s.id} className="session-entry-row"><span className="sessao-nome-active">{s.missaoNome}</span><button className="btn-enter-session" onClick={() => enterVTT(s)}>ENTRAR AGORA</button></div>)}</div>}
        {vttStatus && currentVttSession && <div className={`vtt-status-widget ${vttStatus}`}><div className="status-indicator"></div><div className="status-text">{vttStatus === 'waiting' ? <><h4>AGUARDANDO</h4><small>Conectado...</small></> : <><h4>ONLINE</h4><small>Na Mesa</small></>}</div></div>}

        <button className="floating-mission-btn" onClick={() => setShowMissionModal(true)} title="Missões">📜</button>
        {vttStatus === 'connected' && <button className="floating-combat-btn" onClick={() => setShowCombatTracker(!showCombatTracker)} title="Ver Combate"><CombatIcon /></button>}
        {vttStatus === 'connected' && <button className="floating-dice-btn" onClick={() => setShowDiceSelector(true)} title="Rolar Dados">🎲</button>}
        {resenhas.length > 0 && <button className="floating-sanchez-btn" onClick={handleOpenSanchez} title="Resenhas"><div className="sanchez-icon-face" style={{backgroundImage: `url(${sanchezImg})`}}></div>{unreadResenhas > 0 && <span className="notification-badge">{unreadResenhas}</span>}</button>}

        <Bazar isMestre={false} playerData={personagem} /> 
        
        {showMissionModal && (<div className="ff-modal-overlay-flex" onClick={() => setShowMissionModal(false)}><div className="ff-modal-compact ff-card" onClick={e => e.stopPropagation()}><div className="modal-header-compact"><h3 className="modal-title-ff">QUADRO DE CONTRATOS</h3><button className="btn-close-x" onClick={() => setShowMissionModal(false)}>✕</button></div><div className="missions-grid-compact">{missoes.map(m => (<div key={m.id} className={`mission-card-compact rank-${m.rank}`}><div className="mc-left"><span className="mc-rank">{m.rank}</span></div><div className="mc-center"><h4 className="mc-title">{m.nome}</h4><span className="mc-reward">💰 {m.gilRecompensa} Gil</span></div><div className="mc-right"><button className="btn-details-mini" onClick={() => setShowMissionDetails(m)}>Ver Detalhes</button><button className="btn-accept-mini" onClick={() => handleCandidatar(m)}>ACEITAR</button></div></div>))}</div></div></div>)}
        {showMissionDetails && (<div className="ff-modal-overlay-flex" onClick={() => setShowMissionDetails(null)} style={{zIndex: 100000}}><div className="ff-modal-details-wide ff-card" onClick={e => e.stopPropagation()}><div className="detail-wide-header"><div className="dw-rank-badge">{showMissionDetails.rank}</div><div className="dw-title-box"><h2>{showMissionDetails.nome}</h2><span className="dw-narrator">Narrador: {showMissionDetails.mestreNome}</span></div><div className="dw-vagas-box"><span className="dw-vagas-label">Grupo: {showMissionDetails.candidatos ? showMissionDetails.candidatos.length : 0} / {showMissionDetails.grupo || '?'}</span><div className="dw-vagas-bar"><div style={{width: `${Math.min(((showMissionDetails.candidatos?.length || 0) / (parseInt(showMissionDetails.grupo) || 1)) * 100, 100)}%`}}></div></div></div></div><div className="detail-wide-body"><div className="dw-col-left"><div className="dw-info-item"><label>🌍 LOCAL</label><span>{showMissionDetails.local || "Desconhecido"}</span></div><div className="dw-info-item"><label>👤 CONTRATANTE</label><span>{showMissionDetails.contratante || "Anônimo"}</span></div><div className="dw-reward-box"><label>RECOMPENSAS</label><div className="dw-gil-row"><span className="gil-icon">💰</span> <span className="gil-val">{showMissionDetails.gilRecompensa} GIL</span></div>{showMissionDetails.recompensa && (<div className="dw-extra-rewards">{showMissionDetails.recompensa.split('\n').map((r,i) => (<div key={i} className="reward-pill">✦ {r}</div>))}</div>)}</div><div className="dw-candidates-box"><label>AVENTUREIROS INSCRITOS</label><div className="dw-cand-list">{showMissionDetails.candidatos && showMissionDetails.candidatos.length > 0 ? (showMissionDetails.candidatos.map((c, i) => (<div key={i} className="dw-cand-item" style={{color: c.isLeader ? '#ffcc00' : '#ccc'}}>{c.isLeader ? '👑' : '•'} {c.nome}</div>))) : <span style={{fontSize:'11px', color:'#666'}}>Seja o primeiro!</span>}</div></div>{showMissionDetails.imagem && (<button className="btn-cartaz-full" onClick={() => setViewImage(showMissionDetails.imagem)}>👁️ VER CARTAZ</button>)}</div><div className="dw-col-right custom-scrollbar"><div className="dw-text-block"><label>📜 DESCRIÇÃO</label><p>{showMissionDetails.descricaoMissao}</p></div><div className="dw-text-block"><label>⚔️ OBJETIVOS</label><p>{showMissionDetails.objetivosMissao}</p></div><div className="dw-text-block"><label>⚡ REQUISITOS</label><p>{showMissionDetails.requisitos}</p></div></div></div><button className="dw-close-btn" onClick={() => setShowMissionDetails(null)}>FECHAR</button></div></div>)}
        {viewImage && (<div className="ff-modal-overlay-flex" style={{zIndex: 100001}} onClick={() => setViewImage(null)}><div className="lightbox-wrap"><button className="close-lightbox" onClick={() => setViewImage(null)}>×</button><img src={viewImage} alt="Cartaz" className="cartaz-full-view" /></div></div>)}
        {showResenhasList && (<div className="ff-modal-overlay-flex" onClick={() => setShowResenhasList(false)}><div className="ff-modal-content ff-card" onClick={e => e.stopPropagation()}><div className="modal-header-row"><h3 className="modal-title-ff">RESENHAS</h3><button className="btn-close-x" onClick={() => setShowResenhasList(false)}>✕</button></div><div className="resenhas-list-container">{resenhas.map(r => (<div key={r.id} className="resenha-row-player" onClick={() => { setViewResenha(r); setShowResenhasList(false); }}><h4>{r.titulo}</h4></div>))}</div></div></div>)}
        {viewResenha && (<div className="papiro-overlay-full" onClick={() => setViewResenha(null)}><div className="papiro-real-container" style={{backgroundImage: `url(${papiroImg})`}} onClick={e=>e.stopPropagation()}><h2 className="papiro-title-real">{viewResenha.titulo}</h2><div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: viewResenha.conteudo }}></div><button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button></div></div>)}
        {showFicha && personagem && <Ficha characterData={personagem} isMaster={false} onClose={() => setShowFicha(false)} />}

      </div>
      <style>{`
        /* CSS IGUAL AO ANTERIOR + NOVOS */
        .jogador-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #000; font-family: 'Cinzel', serif; color: white; }
        .background-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; z-index: 0; }
        .content-layer { position: relative; z-index: 10; width: 100%; height: 100%; }
        
        .char-hud { position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 50px; border: 1px solid #ffcc00; z-index: 50; cursor: pointer; }
        .avatar-circle { width: 60px; height: 60px; background: #222; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
        .hud-level { font-size: 28px; font-weight: bold; color: #ffcc00; }
        .char-info h2 { margin: 0; font-size: 20px; color: #ffcc00; text-shadow: 0 0 10px rgba(255, 204, 0, 0.5); }
        .char-meta { font-size: 12px; color: #00f2ff; }
        
        /* BOTÕES FLUTUANTES EMPILHADOS */
        .floating-mission-btn { position: fixed; bottom: 30px; left: 15px; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #ffcc00; background: #000; color: #fff; font-size: 24px; cursor: pointer; z-index: 999; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .floating-mission-btn:hover { transform: scale(1.1); box-shadow: 0 0 15px #ffcc00; }

        .floating-dice-btn { position: fixed; bottom: 90px; left: 18px; width: 45px; height: 45px; border-radius: 50%; border: 2px solid #fff; background: #111; color: #fff; font-size: 20px; cursor: pointer; z-index: 999; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .floating-dice-btn:hover { border-color: #ffcc00; transform: scale(1.1); box-shadow: 0 0 15px #ffcc00; }
        
        .floating-combat-btn { position: fixed; bottom: 150px; left: 18px; width: 45px; height: 45px; border-radius: 50%; border: 2px solid #f44; background: #111; color: #f44; z-index: 999; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .floating-combat-btn:hover { border-color: #fff; color: #fff; transform: scale(1.1); box-shadow: 0 0 15px #f44; }

        .floating-sanchez-btn { position: fixed; bottom: 210px; left: 15px; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #00f2ff; background: #000; cursor: pointer; z-index: 999; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .floating-sanchez-btn:hover { transform: scale(1.1); box-shadow: 0 0 15px #00f2ff; }

        .sanchez-icon-face { width: 100%; height: 100%; border-radius: 50%; background-size: cover; opacity: 0.8; }
        .floating-sanchez-btn:hover .sanchez-icon-face { opacity: 1; }
        .notification-badge { position: absolute; top: -2px; right: -2px; background: #f00; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; font-weight: bold; font-size: 10px; z-index: 1000; box-shadow: 0 0 5px #000; }
        
        /* TRACKER VISUAL PLAYER */
        .combat-tracker-panel { 
            position: absolute; 
            width: 300px; 
            max-height: 70vh; 
            background: linear-gradient(180deg, #0d0d10 0%, #000 100%);
            border: 2px solid #b8860b; 
            border-radius: 6px; 
            z-index: 55; 
            display: flex; flex-direction: column; 
            box-shadow: 0 0 25px rgba(0,0,0,0.9);
        }
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
        .t-stat span { color: #fff; font-weight: bold; }
        .t-stat small { color: #555; margin-left: 2px; font-size: 9px; }
        .t-col-actions { display: flex; gap: 6px; align-items: center; margin-left: auto; }
        .btn-icon-sm { background: #222; border: 1px solid #555; color: #ccc; width: 22px; height: 22px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 3px; }
        .btn-icon-sm:hover { border-color: #ffcc00; color: #fff; }
        .empty-tracker { text-align: center; padding: 30px; color: #666; font-style: italic; font-size: 12px; font-family: 'serif'; }

        /* MONSTER DETAIL MODAL DARK FANTASY */
        .monster-detail-card { 
            width: 500px; max-width: 95vw;
            background: #0d0d10 url('https://www.transparenttextures.com/patterns/dark-matter.png');
            border: 2px solid #b8860b;
            box-shadow: 0 0 50px rgba(0,0,0,0.9), inset 0 0 100px rgba(0,0,0,0.8);
            border-radius: 8px; overflow: hidden; display: flex; flex-direction: column;
        }
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
        .md-close-btn { width: 100%; padding: 15px; background: #111; color: #fff; border: none; border-top: 1px solid #b8860b; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .md-close-btn:hover { background: #b8860b; color: #000; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        /* OUTROS ESTILOS (Sessão, VTT Widget, etc) */
        .vtt-status-widget { position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.9); border: 2px solid; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px; z-index: 90; width: 200px; }
        .vtt-status-widget.waiting { border-color: #ffcc00; }
        .vtt-status-widget.connected { border-color: #0f0; }
        .status-indicator { width: 15px; height: 15px; border-radius: 50%; background: #fff; }
        .waiting .status-indicator { background: #ffcc00; }
        .connected .status-indicator { background: #0f0; }
        .status-text h4 { margin: 0; font-size: 14px; color: #fff; }
        .status-text small { font-size: 11px; color: #ccc; }
        
        .upcoming-sessions-banner { position: absolute; top: 150px; left: 50%; transform: translateX(-50%); background: rgba(13, 13, 21, 0.95); border: 2px solid #ffcc00; padding: 30px 50px; border-radius: 8px; text-align: center; z-index: 80; min-width: 400px; }
        .upcoming-sessions-banner h3 { color: #ffcc00; margin: 0 0 15px 0; font-size: 20px; letter-spacing: 2px; }
        .countdown-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-top: 10px; }
        .sessao-nome-future { font-size: 16px; color: #fff; text-transform: uppercase; }
        .countdown-text { color: #00f2ff; font-family: monospace; font-size: 24px; font-weight: bold; }

        .active-sessions-banner { position: absolute; top: 150px; left: 50%; transform: translateX(-50%); background: linear-gradient(135deg, rgba(20, 0, 0, 0.95), rgba(0,0,0,0.95)); border: 2px solid #f44; padding: 30px 50px; border-radius: 12px; text-align: center; z-index: 80; min-width: 450px; animation: pulseBanner 2s infinite; }
        @keyframes pulseBanner { 0% { box-shadow: 0 0 20px rgba(255,0,0,0.2); } 50% { box-shadow: 0 0 50px rgba(255,0,0,0.5); } 100% { box-shadow: 0 0 20px rgba(255,0,0,0.2); } }
        .session-entry-row { display: flex; justify-content: space-between; align-items: center; gap: 30px; }
        .sessao-nome-active { font-size: 18px; color: #fff; font-weight: bold; text-transform: uppercase; }
        .btn-enter-session { background: #f00; color: #fff; border: none; padding: 12px 30px; cursor: pointer; font-weight: bold; font-size: 16px; border-radius: 4px; }
        
        .ff-modal-overlay-flex { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; align-items: center; justify-content: center; }
        .ff-modal-content { width: 600px; background: #0d0d15; border: 2px solid #ffcc00; padding: 25px; border-radius: 8px; }
        .modal-header-row { display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 15px; }
        .modal-title-ff { color: #ffcc00; margin: 0; }
        .btn-close-x { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
        
        .ff-modal-compact { width: 650px; background: #050505; border: 2px solid #ffcc00; padding: 20px; border-radius: 8px; max-height: 80vh; display: flex; flex-direction: column; }
        .modal-header-compact { display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px; align-items: center; }
        .missions-grid-compact { overflow-y: auto; padding-right: 5px; display: grid; grid-template-columns: 1fr; gap: 10px; }
        .mission-card-compact { display: flex; background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 4px; padding: 10px; align-items: center; transition: 0.2s; }
        .mission-card-compact:hover { border-color: #ffcc00; background: rgba(255,204,0,0.05); }
        .mc-left { width: 50px; display: flex; justify-content: center; font-size: 24px; font-weight: bold; color: #444; }
        .mc-center { flex: 1; padding: 0 15px; }
        .mc-title { margin: 0; font-size: 16px; color: #fff; text-transform: uppercase; }
        .mc-reward { font-size: 12px; color: #ffcc00; }
        .mc-right { display: flex; gap: 10px; }
        .btn-details-mini { background: transparent; border: 1px solid #00f2ff; color: #00f2ff; padding: 5px 10px; font-size: 10px; cursor: pointer; text-transform: uppercase; }
        .btn-accept-mini { background: #00f2ff; color: #000; border: none; padding: 5px 15px; font-size: 10px; font-weight: bold; cursor: pointer; }

        .ff-modal-details-wide { width: 800px; height: 500px; background: #000814; border: 2px solid #ffcc00; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 50px #000; border-radius: 6px; }
        .detail-wide-header { height: 70px; background: linear-gradient(90deg, #111, #000); border-bottom: 1px solid #333; display: flex; align-items: center; padding: 0 20px; gap: 20px; }
        .dw-rank-badge { font-size: 36px; font-weight: bold; color: #333; text-shadow: -1px -1px 0 #ffcc00; }
        .dw-title-box h2 { margin: 0; color: #fff; font-size: 22px; text-transform: uppercase; letter-spacing: 1px; }
        .dw-narrator { font-size: 11px; color: #00f2ff; text-transform: uppercase; }
        .dw-vagas-box { flex: 1; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; }
        .dw-vagas-label { font-size: 10px; color: #888; margin-bottom: 3px; }
        .dw-vagas-bar { width: 120px; height: 4px; background: #222; border-radius: 2px; overflow: hidden; }
        .dw-vagas-bar div { height: 100%; background: #0f0; transition: width 0.3s; }
        .detail-wide-body { flex: 1; display: flex; overflow: hidden; }
        .dw-col-left { width: 300px; background: rgba(255,255,255,0.02); border-right: 1px solid #333; padding: 20px; display: flex; flex-direction: column; gap: 20px; overflow-y: auto; }
        .dw-info-item label { display: block; font-size: 10px; color: #ffcc00; font-weight: bold; margin-bottom: 3px; }
        .dw-info-item span { font-size: 13px; color: #fff; }
        .dw-reward-box { background: rgba(255,204,0,0.05); padding: 15px; border: 1px solid rgba(255,204,0,0.1); border-radius: 4px; }
        .dw-reward-box label { display: block; font-size: 10px; color: #ffcc00; font-weight: bold; border-bottom: 1px solid rgba(255,204,0,0.2); padding-bottom: 5px; margin-bottom: 8px; }
        .dw-gil-row { display: flex; align-items: center; gap: 8px; font-size: 16px; color: #fff; font-weight: bold; }
        .dw-extra-rewards { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
        .reward-pill { font-size: 11px; color: #ccc; font-style: italic; }
        .dw-candidates-box label { font-size: 10px; color: #666; font-weight: bold; display: block; margin-bottom: 8px; }
        .dw-cand-list { display: flex; flex-direction: column; gap: 5px; }
        .dw-cand-item { font-size: 12px; }
        .btn-cartaz-full { width: 100%; background: #000; border: 1px solid #00f2ff; color: #00f2ff; padding: 10px; font-size: 11px; font-weight: bold; cursor: pointer; margin-top: auto; }
        .btn-cartaz-full:hover { background: #00f2ff; color: #000; }
        .dw-col-right { flex: 1; padding: 25px; overflow-y: auto; }
        .dw-text-block { margin-bottom: 20px; }
        .dw-text-block label { color: #ffcc00; font-size: 11px; font-weight: bold; border-bottom: 1px solid #333; display: block; padding-bottom: 5px; margin-bottom: 8px; }
        .dw-text-block p { color: #ddd; font-size: 14px; line-height: 1.5; white-space: pre-wrap; margin: 0; }
        .dw-close-btn { width: 100%; background: #111; border: none; border-top: 1px solid #333; color: #fff; padding: 12px; cursor: pointer; font-weight: bold; font-size: 12px; }
        .dw-close-btn:hover { background: #222; color: #ffcc00; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .lightbox-wrap { position: relative; max-width: 90vw; max-height: 90vh; display: flex; align-items: center; justify-content: center; }
        .cartaz-full-view { max-width: 100%; max-height: 90vh; border: 3px solid #ffcc00; box-shadow: 0 0 50px #000; }
        .close-lightbox { position: absolute; top: -40px; right: -40px; background: transparent; border: none; color: #fff; font-size: 40px; cursor: pointer; }
        .btn-cyan { border: 1px solid #00f2ff; color: #00f2ff; padding: 10px 15px; background: transparent; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; text-transform: uppercase; }
        .btn-cyan:hover { background: rgba(0, 242, 255, 0.1); box-shadow: 0 0 10px rgba(0, 242, 255, 0.2); }
      `}</style>
    </div>
  );
}