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
import chocoboGif from '../assets/chocobo-loading.gif';
import { DiceSelector, DiceResult } from '../components/DiceSystem'; 

const CountdownTimer = ({ targetDate, onComplete }) => {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(targetDate).getTime() - now;
      if (distance < 0) {
        clearInterval(interval);
        if (onComplete) onComplete();
        setTimeLeft("AGORA");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${days}d ${hours}h ${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onComplete]);
  return <span className="countdown-text">{timeLeft}</span>;
};

export default function JogadorVttPage() {
  const navigate = useNavigate();
  const [personagem, setPersonagem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [missoes, setMissoes] = useState([]);
  const [sessoesAtivas, setSessoesAtivas] = useState([]); 
  const [sessoesFuturas, setSessoesFuturas] = useState([]); 
  const [hasJoinedSession, setHasJoinedSession] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showMissionDetails, setShowMissionDetails] = useState(null); 
  const [resenhas, setResenhas] = useState([]);
  const [showResenhasList, setShowResenhasList] = useState(false);
  const [viewResenha, setViewResenha] = useState(null);
  const [vttStatus, setVttStatus] = useState(null); 
  const [currentVttSession, setCurrentVttSession] = useState(null);
  const [showFicha, setShowFicha] = useState(false);

  // --- DADOS ---
  const [showDiceSelector, setShowDiceSelector] = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const dismissedRollTimestamp = useRef(0);
  
  // --- NOTIFICAÇÃO SANCHEZ ---
  const [unreadResenhas, setUnreadResenhas] = useState(0);

  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const prevLevelRef = useRef(null); 
  const audioRef = useRef(new Audio(levelUpMusic)); 

  useEffect(() => {
    audioRef.current.volume = 0.2;
  }, []);

  useEffect(() => {
    let unsubChar = () => {};
    let unsubMissoes = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            const docRef = doc(db, "characters", user.uid);
            unsubChar = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const currentLevel = data.character_sheet?.basic_info?.level || 1;
                    if (prevLevelRef.current !== null && currentLevel > prevLevelRef.current) {
                        setShowLevelUpModal(true);
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(e => console.log("Autoplay bloqueado:", e));
                    }
                    prevLevelRef.current = currentLevel;
                    setPersonagem(data);
                    setLoading(false); 
                } else {
                    setLoading(false); 
                }
            });

            const qMissoes = query(collection(db, "missoes"));
            unsubMissoes = onSnapshot(qMissoes, (snap) => {
                setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            });

        } else {
            setLoading(false); 
            navigate('/login');
        }
    });

    return () => { unsubscribeAuth(); unsubChar(); unsubMissoes(); };
  }, [navigate]);

  useEffect(() => {
      if (!personagem) return;
      
      const qSessoes = query(collection(db, "sessoes"), where("participantes", "array-contains", personagem.name));
      const unsubSessoes = onSnapshot(qSessoes, (snap) => {
        const agora = new Date();
        const todasSessoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const ativas = [];
        const futuras = [];
        
        todasSessoes.forEach(s => {
            const inicio = new Date(s.dataInicio);
            const fim = new Date(s.expiraEm);
            if (agora >= inicio && agora <= fim) {
                ativas.push(s);
            } else if (agora < inicio) {
                futuras.push(s);
            }
        });
        
        setSessoesAtivas(ativas);
        setSessoesFuturas(futuras);
        
        // Se o jogador já entrou na sessão, atualiza os dados em tempo real
        if (currentVttSession) {
            const sessionUpdated = ativas.find(s => s.id === currentVttSession.id);
            if (sessionUpdated) {
                setCurrentVttSession(sessionUpdated);
                
                // --- DETECÇÃO DE DADOS ---
                if (sessionUpdated.latest_roll) {
                     const roll = sessionUpdated.latest_roll;
                     // Se a rolagem é nova e não foi fechada pelo jogador localmente
                     if (roll.timestamp > dismissedRollTimestamp.current) {
                        setRollResult(prev => {
                            if (!prev || prev.timestamp !== roll.timestamp) {
                                return roll;
                            }
                            return prev;
                        });
                     }
                }
                // ------------------------

                const playerInList = sessionUpdated.connected_players?.includes(auth.currentUser?.uid);
                if (playerInList) {
                    setVttStatus('connected');
                } else {
                    setVttStatus('waiting');
                }
            }
        }
      });

      const qResenhas = query(collection(db, "resenhas"), where("destinatarios", "array-contains", personagem.name));
      const unsubResenhas = onSnapshot(qResenhas, (snap) => {
        const loadedResenhas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const agora = new Date();
        const validas = loadedResenhas.filter(r => new Date(r.expiraEm) > agora);
        
        setResenhas(validas);

        // --- LÓGICA DE NOTIFICAÇÃO DO SANCHEZ ---
        // Recupera a quantidade vista anteriormente
        const lastSeenCount = parseInt(localStorage.getItem('sanchez_last_read_count') || '0');
        const currentCount = validas.length;
        
        // Se tiver mais resenhas agora do que da última vez que abriu, mostra a diferença
        if (currentCount > lastSeenCount) {
            setUnreadResenhas(currentCount - lastSeenCount);
        } else {
            setUnreadResenhas(0);
        }
      });

      return () => { unsubSessoes(); unsubResenhas(); };
  }, [personagem, currentVttSession?.id]); 

  // Atualiza presença online
  useEffect(() => {
      if (!currentVttSession || !auth.currentUser) return;
      const sessionRef = doc(db, "sessoes", currentVttSession.id);
      const userId = auth.currentUser.uid;

      updateDoc(sessionRef, { connected_players: arrayUnion(userId) }).catch(err => console.error("Erro ao conectar:", err));

      const handleBeforeUnload = () => {};
      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
          window.removeEventListener('beforeunload', handleBeforeUnload);
          updateDoc(sessionRef, { connected_players: arrayRemove(userId) }).catch(err => console.error("Erro ao desconectar:", err));
      };
  }, [currentVttSession?.id]); 

  const handleConfirmLevelUp = () => {
      setShowLevelUpModal(false);
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
  };

  const handleCandidatar = async (missao) => {
    if (!personagem) return;
    const jaCandidato = missao.candidatos?.some(c => c.uid === auth.currentUser.uid);
    if (jaCandidato) return alert("Você já se candidatou para esta missão!");
    const isLeader = !missao.candidatos || missao.candidatos.length === 0;
    const candidatoObj = {
      uid: auth.currentUser.uid,
      nome: personagem.name,
      classe: personagem.class,
      isLeader: isLeader,
      dataCandidatura: new Date().toISOString()
    };
    try {
      const missaoRef = doc(db, "missoes", missao.id);
      await updateDoc(missaoRef, { candidatos: arrayUnion(candidatoObj) });
      alert(isLeader ? "Você se candidatou e foi marcado como LÍDER DO GRUPO!" : "Candidatura realizada com sucesso!");
    } catch (erro) {
      console.error("Erro ao candidatar:", erro);
      alert("Falha ao enviar candidatura.");
    }
  };

  const enterVTT = (sessao) => {
     setCurrentVttSession(sessao);
     setHasJoinedSession(true); 
     const agora = new Date();
     const inicio = new Date(sessao.dataInicio);
     if (agora >= inicio) {
        setVttStatus('connected');
     } else {
        setVttStatus('waiting');
     }
  };

  const handleOpenSanchez = () => {
      setShowResenhasList(true);
      // Ao abrir, atualiza o 'visto' para o total atual e zera a notificação
      localStorage.setItem('sanchez_last_read_count', resenhas.length.toString());
      setUnreadResenhas(0);
  };

  if (loading) return <div className="loading-screen"><img src={chocoboGif} width="100"/></div>;
  if (!personagem) return <div className="loading-screen">Nenhum personagem encontrado.</div>;

  const charLevel = personagem.character_sheet?.basic_info?.level || 1;

  return (
    <div className="jogador-container">
      <div className="background-layer" style={{ backgroundImage: `url(${fundoJogador})` }} />
      <div className="content-layer">

        <div className="char-hud clickable-hud" onClick={() => setShowFicha(true)} title="Abrir Ficha">
          <div className="char-avatar"><div className="avatar-circle"><span className="hud-level">{charLevel}</span></div></div>
          <div className="char-info"><h2 className="char-name">{personagem.name}</h2><span className="char-meta">{personagem.race} // {personagem.class}</span></div>
        </div>

        {currentVttSession && currentVttSession.active_map && (
            <Tabletop sessaoData={currentVttSession} isMaster={false} />
        )}

        {/* --- EXIBIÇÃO DO RESULTADO DOS DADOS (SOBRE O MAPA) --- */}
        {rollResult && (
            <DiceResult 
                rollData={rollResult} 
                onClose={() => {
                    dismissedRollTimestamp.current = rollResult.timestamp;
                    setRollResult(null);
                }} 
            />
        )}

        {/* --- SELETOR DE DADOS (JOGADOR) --- */}
        {showDiceSelector && currentVttSession && (
             <DiceSelector 
                sessaoId={currentVttSession.id}
                playerName={personagem.name}
                onClose={() => setShowDiceSelector(false)}
             />
        )}

        {showLevelUpModal && (
            <div className="levelup-global-overlay">
                <div className="levelup-content"><h1 className="levelup-title">LEVEL UP!</h1><button className="levelup-confirm-btn" onClick={handleConfirmLevelUp}>CONFIRMAR</button></div>
            </div>
        )}

        {sessoesFuturas.length > 0 && sessoesAtivas.length === 0 && !hasJoinedSession && (
           <div className="upcoming-sessions-banner">
              <h3>A SESSÃO VAI COMEÇAR EM BREVE</h3>
              {sessoesFuturas.map(sessao => (<div key={sessao.id} className="countdown-row"><span>{sessao.missaoNome}</span><CountdownTimer targetDate={sessao.dataInicio} /></div>))}
           </div>
        )}

        {sessoesAtivas.length > 0 && !hasJoinedSession && (
          <div className="active-sessions-banner fade-in">
             <h3>SESSÃO EM ANDAMENTO!</h3>
             {sessoesAtivas.map(sessao => (<div key={sessao.id} className="session-entry-row"><span>{sessao.missaoNome}</span><button className="btn-enter-session" onClick={() => enterVTT(sessao)}>ENTRAR AGORA</button></div>))}
          </div>
        )}

        {vttStatus && currentVttSession && (
           <div className={`vtt-status-widget ${vttStatus}`}>
              <div className="status-indicator"></div>
              <div className="status-text">{vttStatus === 'waiting' ? (<><h4>AGUARDANDO</h4><small>Conectado...</small></>) : (<><h4>ONLINE</h4><small>Na Mesa</small></>)}</div>
           </div>
        )}

        {/* --- BOTOES FLUTUANTES (VERTICAL NA ESQUERDA - REDUZIDOS) --- */}
        
        {/* 1. Missões (Base) */}
        <button className="floating-mission-btn" onClick={() => setShowMissionModal(true)} title="Quadro de Missões">📜</button>

        {/* 2. Dados (Acima de Missões) */}
        {vttStatus === 'connected' && (
            <button className="floating-dice-btn" onClick={() => setShowDiceSelector(true)} title="Rolar Dados">🎲</button>
        )}

        {/* 3. Sanchez/Resenhas (Acima de Dados) */}
        {resenhas.length > 0 && (
           <button className="floating-sanchez-btn" onClick={handleOpenSanchez} title="Resenhas do Sanchez">
               <div className="sanchez-icon-face" style={{backgroundImage: `url(${sanchezImg})`}}></div>
               {unreadResenhas > 0 && (
                   <span className="notification-badge">{unreadResenhas}</span>
               )}
           </button>
        )}

        <Bazar isMestre={false} playerData={personagem} /> 

        {showMissionModal && (
          <div className="ff-modal-overlay-flex" onClick={() => setShowMissionModal(false)}>
             <div className="ff-modal-content ff-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header-row"><h3 className="modal-title-ff">QUADRO DE CONTRATOS</h3><button className="btn-close-x" onClick={() => setShowMissionModal(false)}>✕</button></div>
                <div className="missions-list-player">
                   {missoes.map(m => (
                        <div key={m.id} className={`mission-poster-player rank-${m.rank}`}>
                            <div className="mp-header"><span className="mp-rank">{m.rank}</span><h4>{m.nome}</h4></div>
                            <div className="mp-details"><p><strong>Recompensa:</strong> {m.gilRecompensa} Gil</p></div>
                            <div className="mp-actions-row">
                                <button className="btn-details-outline" onClick={() => setShowMissionDetails(m)}>DETALHES</button>
                                <button className="btn-candidatar" onClick={() => handleCandidatar(m)}>ACEITAR</button>
                            </div>
                        </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {showMissionDetails && (
            <div className="ff-modal-overlay-flex" onClick={() => setShowMissionDetails(null)} style={{zIndex: 100000}}>
                <div className="ff-modal ff-card detail-view-main" onClick={e => e.stopPropagation()}>
                    <div className="detail-header-modern">
                        <div className={`detail-rank-badge rank-${showMissionDetails.rank}`}>{showMissionDetails.rank}</div>
                        <div className="detail-title-col"><h2>{showMissionDetails.nome}</h2><span className="detail-narrator">Narrador: {showMissionDetails.mestreNome}</span></div>
                    </div>
                    <div className="detail-body-grid">
                        <div className="detail-section"><label className="section-label">DESCRIÇÃO</label><p className="section-text">{showMissionDetails.descricaoMissao}</p></div>
                        <div className="detail-section reward-section"><label className="section-label">RECOMPENSAS</label><div className="reward-content-box"><div className="gil-display-row"><span className="gil-icon">💰</span> <span className="gil-value">{showMissionDetails.gilRecompensa} GIL</span></div></div></div>
                    </div>
                    <button className="ff-final-close-btn" onClick={() => setShowMissionDetails(null)}>FECHAR</button>
                </div>
            </div>
        )}

        {showResenhasList && (
           <div className="ff-modal-overlay-flex" onClick={() => setShowResenhasList(false)}>
              <div className="ff-modal-content ff-card" onClick={e => e.stopPropagation()}>
                 <div className="modal-header-row"><h3 className="modal-title-ff">RESENHAS</h3><button className="btn-close-x" onClick={() => setShowResenhasList(false)}>✕</button></div>
                 <div className="resenhas-list-container">
                    {resenhas.map(r => (<div key={r.id} className="resenha-row-player" onClick={() => { setViewResenha(r); setShowResenhasList(false); }}><h4>{r.titulo}</h4></div>))}
                 </div>
              </div>
           </div>
        )}

        {viewResenha && (
           <div className="papiro-overlay-full" onClick={() => setViewResenha(null)}>
              <div className="papiro-real-container" style={{backgroundImage: `url(${papiroImg})`}} onClick={e=>e.stopPropagation()}>
                 <h2 className="papiro-title-real">{viewResenha.titulo}</h2>
                 <div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: viewResenha.conteudo }}></div>
                 <button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button>
              </div>
           </div>
        )}

        {showFicha && personagem && <Ficha characterData={personagem} isMaster={false} onClose={() => setShowFicha(false)} />}

      </div>
      <style>{`
        .jogador-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #000; font-family: 'Cinzel', serif; color: white; }
        .background-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; z-index: 0; }
        .content-layer { position: relative; z-index: 10; width: 100%; height: 100%; }
        .char-hud { position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 50px; border: 1px solid #ffcc00; z-index: 50; cursor: pointer; }
        .avatar-circle { width: 60px; height: 60px; background: #222; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
        .hud-level { font-size: 28px; font-weight: bold; color: #ffcc00; }
        .char-info h2 { margin: 0; font-size: 20px; color: #fff; }
        .char-meta { font-size: 12px; color: #00f2ff; }
        
        /* BOTOES ALINHADOS VERTICALMENTE NA ESQUERDA - REDUZIDOS */
        .floating-mission-btn { position: fixed; bottom: 30px; left: 15px; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #ffcc00; background: #000; color: #fff; font-size: 24px; cursor: pointer; z-index: 999; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .floating-mission-btn:hover { transform: scale(1.1); box-shadow: 0 0 15px #ffcc00; }

        .floating-dice-btn { position: fixed; bottom: 95px; left: 18px; width: 45px; height: 45px; border-radius: 50%; border: 2px solid #fff; background: #111; color: #fff; font-size: 20px; cursor: pointer; z-index: 999; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .floating-dice-btn:hover { border-color: #ffcc00; transform: scale(1.1); box-shadow: 0 0 15px #ffcc00; }
        
        .floating-sanchez-btn { position: fixed; bottom: 155px; left: 15px; width: 50px; height: 50px; border-radius: 50%; border: 2px solid #00f2ff; background: #000; cursor: pointer; z-index: 999; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
        .floating-sanchez-btn:hover { transform: scale(1.1); box-shadow: 0 0 15px #00f2ff; }

        .sanchez-icon-face { width: 100%; height: 100%; border-radius: 50%; background-size: cover; opacity: 0.8; }
        .floating-sanchez-btn:hover .sanchez-icon-face { opacity: 1; }
        
        .notification-badge { position: absolute; top: -2px; right: -2px; background: #f00; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; font-weight: bold; font-size: 10px; z-index: 1000; box-shadow: 0 0 5px #000; }
        
        .vtt-status-widget { position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.9); border: 2px solid; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px; z-index: 90; width: 200px; }
        .vtt-status-widget.waiting { border-color: #ffcc00; }
        .vtt-status-widget.connected { border-color: #0f0; }
        .status-indicator { width: 15px; height: 15px; border-radius: 50%; background: #fff; }
        .waiting .status-indicator { background: #ffcc00; }
        .connected .status-indicator { background: #0f0; }
        .status-text h4 { margin: 0; font-size: 14px; color: #fff; }
        .status-text small { font-size: 11px; color: #ccc; }
        .ff-modal-overlay-flex { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; align-items: center; justify-content: center; }
        .ff-modal-content { width: 600px; background: #0d0d15; border: 2px solid #ffcc00; padding: 25px; border-radius: 8px; }
        .modal-header-row { display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 15px; }
        .modal-title-ff { color: #ffcc00; margin: 0; }
        .btn-close-x { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
        .mission-poster-player { background: rgba(255,255,255,0.05); border: 1px solid #444; padding: 15px; border-radius: 4px; margin-bottom: 15px; }
        .mp-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; }
        .mp-rank { font-size: 24px; font-weight: bold; color: #ffcc00; }
        .mp-actions-row { display: flex; gap: 10px; margin-top: 15px; }
        .btn-details-outline { flex: 1; border: 1px solid #00f2ff; color: #00f2ff; background: transparent; padding: 10px; cursor: pointer; }
        .btn-candidatar { flex: 2; background: #00f2ff; color: #000; font-weight: bold; border: none; padding: 10px; cursor: pointer; }
        .papiro-overlay-full { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; align-items: center; justify-content: center; }
        .papiro-real-container { width: 800px; height: 600px; background-size: 100% 100%; padding: 100px; color: #3b2b1a; position: relative; }
        .papiro-close-btn { position: absolute; bottom: 50px; right: 100px; cursor: pointer; }
        .active-sessions-banner { position: absolute; top: 120px; left: 50%; transform: translateX(-50%); background: rgba(20, 0, 0, 0.9); border: 2px solid #f00; padding: 20px; border-radius: 8px; text-align: center; z-index: 5; }
        .btn-enter-session { background: #f00; color: #fff; border: none; padding: 10px 20px; cursor: pointer; }
      `}</style>
    </div>
  );
}