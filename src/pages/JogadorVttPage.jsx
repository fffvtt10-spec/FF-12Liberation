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
import chocoboGif from '../assets/chocobo-loading.gif';

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

  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const prevLevelRef = useRef(null); 
  const audioRef = useRef(new Audio(levelUpMusic)); 

  useEffect(() => {
    audioRef.current.volume = 0.2;
  }, []);

  // PERSISTÊNCIA E CARREGAMENTO
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

  // DADOS DEPENDENTES DO PERSONAGEM (SESSÕES E RESENHAS)
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
        
        // CORREÇÃO: Apenas atualiza o estado local, NÃO escreve no banco aqui
        if (currentVttSession) {
            const sessionUpdated = ativas.find(s => s.id === currentVttSession.id);
            if (sessionUpdated) {
                // Só marca visualmente como conectado, sem spam de banco
                const playerInList = sessionUpdated.connected_players?.includes(auth.currentUser?.uid);
                if (playerInList) {
                    setVttStatus('connected');
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
      });

      return () => { unsubSessoes(); unsubResenhas(); };
  }, [personagem, currentVttSession]);

  // CLEANUP AO SAIR DA SESSÃO
  useEffect(() => {
      return () => {
          if (currentVttSession && auth.currentUser) {
             const sessionRef = doc(db, "sessoes", currentVttSession.id);
             updateDoc(sessionRef, {
                 connected_players: arrayRemove(auth.currentUser.uid)
             }).catch(console.error);
          }
      }
  }, [currentVttSession]);

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

  // AQUI é onde a mágica acontece. Só escreve no banco UMA vez ao clicar.
  const enterVTT = async (sessao) => {
     setCurrentVttSession(sessao);
     setHasJoinedSession(true); 
     
     try {
         // Marca o jogador como online
         const sessionRef = doc(db, "sessoes", sessao.id);
         await updateDoc(sessionRef, {
             connected_players: arrayUnion(auth.currentUser.uid)
         });
     } catch (e) {
         console.error("Erro ao conectar na sessão db", e);
     }

     const agora = new Date();
     const inicio = new Date(sessao.dataInicio);
     if (agora >= inicio) {
        setVttStatus('connected');
     } else {
        setVttStatus('waiting');
     }
  };

  if (loading) {
    return (
      <div className="ether-loading">
          <div className="loading-blur-bg"></div>
          <div className="loading-content">
          <img src={chocoboGif} alt="Carregando..." className="chocobo-anim" />
          <div className="loading-bar"><div className="loading-fill"></div></div>
          <p>CARREGANDO GRIMÓRIO...</p>
          </div>
          <style>{`
          .ether-loading { height: 100vh; width: 100vw; background: #000; display: flex; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; z-index: 9999; }
          .loading-blur-bg { position: absolute; width: 100%; height: 100%; background: radial-gradient(circle, #001a33 0%, #000 100%); filter: blur(40px); animation: pulseBlur 2s infinite alternate; }
          .loading-content { position: relative; z-index: 10; text-align: center; }
          .chocobo-anim { width: 120px; filter: drop-shadow(0 0 10px #ffcc00); margin-bottom: 20px; }
          .loading-bar { width: 200px; height: 2px; background: rgba(255, 255, 255, 0.1); margin: 0 auto 15px auto; border-radius: 10px; overflow: hidden; }
          .loading-fill { height: 100%; width: 0%; background: #ffcc00; box-shadow: 0 0 10px #ffcc00; animation: fillProgress 1s ease-in-out forwards; }
          p { color: #ffcc00; font-family: 'serif'; font-size: 10px; letter-spacing: 3px; animation: fadeText 1s infinite alternate; }
          @keyframes fillProgress { from { width: 0%; } to { width: 100%; } }
          @keyframes pulseBlur { from { opacity: 0.5; } to { opacity: 0.8; } }
          @keyframes fadeText { from { opacity: 0.4; } to { opacity: 1; } }
          `}</style>
      </div>
    );
  }
  
  if (!personagem) return <div className="loading-screen">Nenhum personagem encontrado.</div>;

  const charLevel = personagem.character_sheet?.basic_info?.level || 1;

  return (
    <div className="jogador-container">
      <div className="background-layer" style={{ backgroundImage: `url(${fundoJogador})` }} />
      <div className="content-layer">

        {/* HUD SUPERIOR */}
        <div className="char-hud clickable-hud" onClick={() => setShowFicha(true)} title="Abrir Ficha do Personagem">
          <div className="char-avatar">
             <div className="avatar-circle">
                 <span className="hud-level">{charLevel}</span>
             </div>
          </div>
          <div className="char-info">
             <h2 className="char-name">{personagem.name}</h2>
             <span className="char-meta">{personagem.race} // {personagem.class}</span>
          </div>
        </div>

        {/* MODAL GLOBAL DE LEVEL UP */}
        {showLevelUpModal && (
            <div className="levelup-global-overlay">
                <div className="levelup-content">
                    <h1 className="levelup-title">LEVEL UP!</h1>
                    <p className="levelup-subtitle">Seu poder cresce...</p>
                    <button className="levelup-confirm-btn" onClick={handleConfirmLevelUp}>CONFIRMAR</button>
                </div>
            </div>
        )}

        {sessoesFuturas.length > 0 && sessoesAtivas.length === 0 && !hasJoinedSession && (
           <div className="upcoming-sessions-banner">
              <h3>A SESSÃO VAI COMEÇAR EM BREVE</h3>
              {sessoesFuturas.map(sessao => (
                 <div key={sessao.id} className="countdown-row">
                    <span>{sessao.missaoNome}</span>
                    <CountdownTimer targetDate={sessao.dataInicio} />
                 </div>
              ))}
           </div>
        )}

        {sessoesAtivas.length > 0 && !hasJoinedSession && (
          <div className="active-sessions-banner fade-in">
             <h3>SESSÃO EM ANDAMENTO!</h3>
             {sessoesAtivas.map(sessao => (
               <div key={sessao.id} className="session-entry-row">
                  <span>{sessao.missaoNome}</span>
                  <button className="btn-enter-session" onClick={() => enterVTT(sessao)}>ENTRAR AGORA</button>
               </div>
             ))}
          </div>
        )}

        {vttStatus && currentVttSession && (
           <div className={`vtt-status-widget ${vttStatus}`}>
              <div className="status-indicator"></div>
              <div className="status-text">
                 {vttStatus === 'waiting' && (<><h4>AGUARDANDO MESTRE</h4><small>Sessão Conectada! Aguardando...</small></>)}
                 {vttStatus === 'connected' && (<><h4>BEM-VINDO, AVENTUREIRO</h4><small>Sessão Conectada!</small></>)}
              </div>
           </div>
        )}

        <button className="floating-mission-btn" onClick={() => setShowMissionModal(true)} title="Quadro de Missões">📜</button>

        {resenhas.length > 0 && (
           <button className="floating-sanchez-btn" onClick={() => setShowResenhasList(true)} title="Resenhas do Sanchez">
               <div className="sanchez-icon-face" style={{backgroundImage: `url(${sanchezImg})`}}></div>
               <span className="notification-badge">{resenhas.length}</span>
           </button>
        )}

        <Bazar isMestre={false} playerData={personagem} /> 

        {showMissionModal && (
          <div className="ff-modal-overlay-flex" onClick={() => setShowMissionModal(false)}>
             <div className="ff-modal-content ff-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header-row">
                  <h3 className="modal-title-ff">QUADRO DE CONTRATOS</h3>
                  <button className="btn-close-x" onClick={() => setShowMissionModal(false)}>✕</button>
                </div>
                <div className="missions-list-player">
                   {missoes.map(m => {
                     const maxGroup = parseInt(m.grupo) || 0;
                     const currentGroup = m.candidatos ? m.candidatos.length : 0;
                     const isFull = currentGroup >= maxGroup && maxGroup > 0;
                     const alreadyCandidate = m.candidatos?.some(c => c.uid === auth.currentUser.uid);

                     return (
                        <div key={m.id} className={`mission-poster-player rank-${m.rank}`}>
                            <div className="mp-header">
                            <span className="mp-rank">{m.rank}</span>
                            <h4>{m.nome}</h4>
                            </div>
                            <div className="mp-details">
                            <p><strong>Local:</strong> {m.local}</p>
                            <p><strong>Recompensa:</strong> {m.gilRecompensa} Gil</p>
                            <p className="mp-desc">{m.descricaoMissao}</p>
                            </div>
                            
                            <div className="vagas-container-player" style={{marginTop:'10px', background:'rgba(0,0,0,0.3)', padding:'5px', borderRadius:'4px'}}>
                                <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#ccc'}}>
                                    <span>VAGAS PREENCHIDAS</span>
                                    <span>{currentGroup} / {maxGroup > 0 ? maxGroup : '∞'}</span>
                                </div>
                                <div style={{width:'100%', height:'4px', background:'#222', marginTop:'2px'}}>
                                    <div style={{
                                        width: `${Math.min((currentGroup/(maxGroup||1))*100, 100)}%`, 
                                        height:'100%', 
                                        background: isFull ? '#f44' : '#00f2ff'
                                    }}></div>
                                </div>
                            </div>

                            {m.candidatos && m.candidatos.length > 0 && (
                            <div className="candidates-box">
                                <small>Grupo em formação:</small>
                                <div className="cand-tags">
                                {m.candidatos.map((c, idx) => (
                                    <span key={idx} className={`cand-tag ${c.isLeader ? 'leader' : ''}`}>
                                    {c.isLeader && '👑'} {c.nome}
                                    </span>
                                ))}
                                </div>
                            </div>
                            )}
                            <div className="mp-actions-row">
                                <button className="btn-details-outline" onClick={() => setShowMissionDetails(m)}>DETALHES</button>
                                <button 
                                    className="btn-candidatar" 
                                    disabled={alreadyCandidate || (isFull && !alreadyCandidate)}
                                    onClick={() => handleCandidatar(m)}
                                    style={{
                                        background: isFull && !alreadyCandidate ? '#333' : '#00f2ff',
                                        color: isFull && !alreadyCandidate ? '#666' : '#000',
                                        cursor: isFull && !alreadyCandidate ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                {alreadyCandidate ? "ENVIADO" : (isFull ? "LOTADO" : "ACEITAR")}
                                </button>
                            </div>
                        </div>
                     );
                   })}
                   {missoes.length === 0 && <p style={{textAlign: 'center', padding: '20px'}}>Nenhum contrato disponível no momento.</p>}
                </div>
             </div>
          </div>
        )}

        {showMissionDetails && (
            <div className="ff-modal-overlay-flex" onClick={() => setShowMissionDetails(null)} style={{zIndex: 100000}}>
                <div className="ff-modal ff-card detail-view-main" onClick={e => e.stopPropagation()}>
                    <div className="detail-header-modern">
                        <div className={`detail-rank-badge rank-${showMissionDetails.rank}`}>{showMissionDetails.rank}</div>
                        <div className="detail-title-col">
                            <h2>{showMissionDetails.nome}</h2>
                            <span className="detail-narrator">Narrador: {showMissionDetails.mestreNome}</span>
                        </div>
                    </div>
                    <div className="detail-body-grid">
                        <div className="detail-info-row">
                            <div className="info-item"><label>🌍 LOCAL</label><span>{showMissionDetails.local || "Desconhecido"}</span></div>
                            <div className="info-item"><label>👤 CONTRATANTE</label><span>{showMissionDetails.contratante || "Anônimo"}</span></div>
                        </div>
                        <div className="detail-section"><label className="section-label">📜 DESCRIÇÃO DA MISSÃO</label><p className="section-text">{showMissionDetails.descricaoMissao || "Sem descrição."}</p></div>
                        <div className="detail-section"><label className="section-label">⚔️ OBJETIVOS DA MISSÃO</label><p className="section-text">{showMissionDetails.objetivosMissao || "Sem objetivos definidos."}</p></div>
                        <div className="detail-section"><label className="section-label">⚡ REQUISITOS</label><p className="section-text">{showMissionDetails.requisitos || "Sem requisitos especiais."}</p></div>
                        <div className="detail-section reward-section">
                            <label className="section-label">💎 RECOMPENSAS</label>
                            <div className="reward-content-box">
                                <div className="gil-display-row"><span className="gil-icon">💰</span> <span className="gil-value">{showMissionDetails.gilRecompensa || 0} GIL</span></div>
                                {showMissionDetails.recompensa && (<div className="extra-rewards-list">{showMissionDetails.recompensa.split('\n').map((r,i) => (<div key={i} className="reward-item">• {r}</div>))}</div>)}
                            </div>
                        </div>
                    </div>
                    <button className="ff-final-close-btn" onClick={() => setShowMissionDetails(null)}>FECHAR RELATÓRIO</button>
                </div>
            </div>
        )}

        {showResenhasList && (
           <div className="ff-modal-overlay-flex" onClick={() => setShowResenhasList(false)}>
              <div className="ff-modal-content ff-card" style={{height: 'auto', maxHeight: '600px'}} onClick={e => e.stopPropagation()}>
                 <div className="modal-header-row"><h3 className="modal-title-ff">RESENHAS RECEBIDAS</h3><button className="btn-close-x" onClick={() => setShowResenhasList(false)}>✕</button></div>
                 <div className="resenhas-list-container">
                    {resenhas.map(r => (
                       <div key={r.id} className="resenha-row-player" onClick={() => { setViewResenha(r); setShowResenhasList(false); }}>
                          <span className="r-icon">📩</span>
                          <div className="r-info"><h4>{r.titulo}</h4><small>De: {r.mestre}</small></div>
                          <button className="btn-read-arrow">LER ➔</button>
                       </div>
                    ))}
                 </div>
              </div>
           </div>
        )}

        {viewResenha && (
           <div className="papiro-overlay-full" onClick={() => setViewResenha(null)}>
              <div className="papiro-real-container" style={{backgroundImage: `url(${papiroImg})`}} onClick={e=>e.stopPropagation()}>
                 <div className="sanchez-oval-view-no-border" style={{backgroundImage: `url(${sanchezImg})`}}></div>
                 <h2 className="papiro-title-real">{viewResenha.titulo}</h2>
                 <p className="papiro-mestre-sub">Narrador: {viewResenha.mestre}</p>
                 <div className="papiro-body-real" dangerouslySetInnerHTML={{ __html: viewResenha.conteudo.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }}></div>
                 <button className="papiro-close-btn" onClick={() => setViewResenha(null)}>FECHAR</button>
              </div>
           </div>
        )}

        {showFicha && personagem && (
            <Ficha 
                characterData={personagem} 
                isMaster={false} 
                onClose={() => setShowFicha(false)} 
            />
        )}

      </div>

      <style>{`
        /* ESTILOS PRESERVADOS */
        .jogador-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #000; font-family: 'Cinzel', serif; color: white; }
        .background-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; z-index: 0; }
        .content-layer { position: relative; z-index: 10; width: 100%; height: 100%; }
        .loading-screen { width: 100vw; height: 100vh; background: #000; color: #ffcc00; display: flex; align-items: center; justify-content: center; font-size: 24px; font-family: 'Cinzel', serif; }
        .char-hud { position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 50px; border: 1px solid #ffcc00; box-shadow: 0 0 15px rgba(255,204,0,0.3); backdrop-filter: blur(5px); z-index: 50; transition: transform 0.2s; }
        .char-hud.clickable-hud:hover { transform: scale(1.05); cursor: pointer; border-color: #fff; box-shadow: 0 0 25px #ffcc00; }
        .avatar-circle { width: 60px; height: 60px; background: #222; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
        .hud-level { font-size: 28px; font-weight: bold; color: #ffcc00; text-shadow: 0 0 5px #000; }
        .char-info h2 { margin: 0; font-size: 20px; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        .char-meta { font-size: 12px; color: #00f2ff; font-weight: bold; }
        .levelup-global-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 999999; display: flex; align-items: center; justify-content: center; animation: fadeOverlay 0.5s forwards; }
        .levelup-content { text-align: center; }
        .levelup-title { font-size: 80px; color: #ffcc00; text-shadow: 0 0 50px #ffcc00, 0 0 20px #fff; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); letter-spacing: 5px; margin-bottom: 10px; }
        .levelup-subtitle { font-size: 24px; color: #fff; margin-bottom: 40px; font-family: 'Lato', sans-serif; opacity: 0.8; }
        .levelup-confirm-btn { background: transparent; border: 2px solid #ffcc00; color: #ffcc00; padding: 15px 40px; font-size: 18px; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.3s; text-transform: uppercase; letter-spacing: 2px; }
        .levelup-confirm-btn:hover { background: #ffcc00; color: #000; box-shadow: 0 0 30px #ffcc00; transform: scale(1.1); }
        .upcoming-sessions-banner { position: absolute; top: 120px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); border: 2px solid #ffcc00; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 0 30px rgba(255,204,0,0.3); z-index: 5; width: 400px; }
        .upcoming-sessions-banner h3 { color: #ffcc00; margin-bottom: 10px; font-size: 18px; }
        .countdown-row { display: flex; flex-direction: column; gap: 5px; border-top: 1px solid #333; padding-top: 10px; margin-top: 10px; }
        .countdown-text { font-size: 24px; color: #fff; font-weight: bold; font-family: 'Lato', sans-serif; }
        .active-sessions-banner { position: absolute; top: 120px; left: 50%; transform: translateX(-50%); background: rgba(20, 0, 0, 0.9); border: 2px solid #f00; padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 0 30px #f00; animation: pulseRed 2s infinite; z-index: 5; }
        .session-entry-row { display: flex; gap: 20px; align-items: center; margin-top: 10px; justify-content: center; }
        .btn-enter-session { background: #f00; color: #fff; border: none; padding: 10px 20px; font-weight: bold; cursor: pointer; font-family: 'Cinzel', serif; font-size: 16px; }
        .btn-enter-session:hover { background: #fff; color: #f00; }
        @keyframes pulseRed { 0% { box-shadow: 0 0 10px #f00; } 50% { box-shadow: 0 0 30px #f00; } 100% { box-shadow: 0 0 10px #f00; } }
        .vtt-status-widget { position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.9); border: 2px solid; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px; z-index: 9999; width: 280px; transition: 0.5s; box-shadow: 0 5px 20px rgba(0,0,0,0.5); }
        .vtt-status-widget.waiting { border-color: #ffcc00; }
        .vtt-status-widget.connected { border-color: #0f0; box-shadow: 0 0 20px rgba(0,255,0,0.3); }
        .status-indicator { width: 15px; height: 15px; border-radius: 50%; }
        .waiting .status-indicator { background: #ffcc00; animation: blink 1s infinite; }
        .connected .status-indicator { background: #0f0; box-shadow: 0 0 10px #0f0; }
        .status-text h4 { margin: 0; font-size: 14px; color: #fff; text-transform: uppercase; }
        .status-text small { font-size: 11px; color: #ccc; }
        .waiting .status-text h4 { color: #ffcc00; }
        .connected .status-text h4 { color: #0f0; }
        @keyframes blink { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .floating-mission-btn { position: fixed; bottom: 30px; left: 30px; width: 70px; height: 70px; border-radius: 50%; border: 2px solid #ffcc00; background: #000; color: #fff; font-size: 30px; cursor: pointer; z-index: 999; box-shadow: 0 0 15px rgba(0,0,0,0.8); transition: transform 0.2s, box-shadow 0.2s; display: flex; align-items: center; justify-content: center; }
        .floating-mission-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #ffcc00; }
        .floating-sanchez-btn { position: fixed; bottom: 110px; left: 30px; width: 70px; height: 70px; border-radius: 50%; border: 2px solid #00f2ff; background: #000; cursor: pointer; z-index: 999; box-shadow: 0 0 15px rgba(0,242,255,0.5); transition: transform 0.2s; display: flex; align-items: center; justify-content: center; overflow: visible; }
        .floating-sanchez-btn:hover { transform: scale(1.1); box-shadow: 0 0 25px #00f2ff; }
        .sanchez-icon-face { width: 100%; height: 100%; border-radius: 50%; background-size: cover; background-position: center; }
        .notification-badge { position: absolute; top: -5px; right: -5px; background: #f00; color: #fff; border-radius: 50%; width: 24px; height: 24px; font-size: 12px; font-weight: bold; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
        .ff-modal-overlay-flex { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
        .ff-modal-content { width: 600px; max-width: 95vw; max-height: 85vh; background: #0d0d15; border: 2px solid #ffcc00; padding: 25px; border-radius: 8px; box-shadow: 0 0 50px rgba(0,0,0,0.9); overflow-y: auto; display: flex; flex-direction: column; }
        .modal-header-row { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 15px; }
        .modal-title-ff { color: #ffcc00; margin: 0; font-size: 22px; letter-spacing: 2px; }
        .btn-close-x { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
        .btn-close-x:hover { color: #f00; }
        .missions-list-player { display: grid; grid-template-columns: 1fr; gap: 15px; }
        .mission-poster-player { background: rgba(255,255,255,0.05); border: 1px solid #444; padding: 15px; border-radius: 4px; position: relative; }
        .mp-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px; }
        .mp-rank { font-size: 24px; font-weight: bold; color: #ffcc00; }
        .mp-details p { margin: 4px 0; font-size: 14px; color: #ccc; }
        .mp-desc { font-style: italic; color: #aaa; margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .mp-actions-row { display: flex; gap: 10px; margin-top: 15px; }
        .btn-details-outline { flex: 1; border: 1px solid #00f2ff; color: #00f2ff; background: transparent; padding: 10px; cursor: pointer; font-weight: bold; transition: 0.3s; }
        .btn-details-outline:hover { background: #00f2ff; color: #000; }
        .btn-candidatar { flex: 2; background: #00f2ff; color: #000; font-weight: bold; border: none; padding: 10px; cursor: pointer; transition: 0.3s; }
        .btn-candidatar:hover:not(:disabled) { background: #fff; box-shadow: 0 0 10px #00f2ff; }
        .btn-candidatar:disabled { background: #333; color: #666; cursor: not-allowed; }
        .candidates-box { margin-top: 10px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; }
        .cand-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 5px; }
        .cand-tag { font-size: 11px; padding: 2px 6px; background: #222; border: 1px solid #444; border-radius: 3px; color: #ddd; }
        .cand-tag.leader { border-color: #ffcc00; color: #ffcc00; }
        .resenhas-list-container { display: flex; flex-direction: column; gap: 10px; }
        .resenha-row-player { display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 15px; border-radius: 4px; cursor: pointer; transition: 0.2s; }
        .resenha-row-player:hover { background: rgba(255,255,255,0.1); border-color: #ffcc00; }
        .r-icon { font-size: 24px; margin-right: 15px; }
        .r-info { flex: 1; }
        .r-info h4 { margin: 0; color: #ffcc00; font-size: 16px; }
        .r-info small { color: #aaa; }
        .btn-read-arrow { background: none; border: none; color: #00f2ff; font-weight: bold; cursor: pointer; }
        .detail-view-main { width: 600px; background: #000814; border: 1px solid #ffcc00; padding: 0; box-shadow: 0 0 40px rgba(255, 204, 0, 0.1); overflow: hidden; display: flex; flex-direction: column; }
        .detail-header-modern { background: linear-gradient(90deg, #1a1a1a 0%, #000 100%); padding: 25px 30px; display: flex; align-items: center; border-bottom: 1px solid #333; gap: 20px; }
        .detail-rank-badge { font-size: 32px; font-weight: bold; color: #ffcc00; text-shadow: 0 0 10px rgba(255,204,0,0.5); border: 2px solid #ffcc00; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: rgba(0,0,0,0.5); }
        .detail-title-col h2 { margin: 0; font-size: 24px; color: #fff; text-transform: uppercase; letter-spacing: 1px; }
        .detail-narrator { color: #00f2ff; font-size: 12px; font-weight: bold; text-transform: uppercase; margin-top: 4px; display: block; }
        .detail-body-grid { padding: 30px; display: flex; flex-direction: column; gap: 20px; }
        .detail-info-row { display: flex; gap: 25px; margin-bottom: 10px; border-bottom: 1px solid #333; padding-bottom: 15px; }
        .info-item { flex: 1; }
        .info-item label { color: #ffcc00; font-size: 10px; display: block; margin-bottom: 5px; font-weight: bold; opacity: 0.8; }
        .info-item span { color: #fff; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }
        .detail-section { margin-bottom: 5px; }
        .section-label { color: #ffcc00; font-size: 11px; font-weight: bold; display: block; margin-bottom: 8px; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid #333; padding-bottom: 4px; }
        .section-text { font-size: 15px; line-height: 1.5; color: #ddd; margin: 0; white-space: pre-wrap; }
        .reward-section { margin-top: 10px; background: rgba(255,204,0,0.05); padding: 15px; border-radius: 4px; border: 1px solid rgba(255,204,0,0.2); }
        .gil-display-row { display: flex; align-items: center; gap: 10px; font-size: 18px; color: #ffcc00; font-weight: bold; margin-bottom: 8px; }
        .extra-rewards-list { margin-top: 8px; padding-left: 5px; }
        .reward-item { color: #aaa; font-size: 14px; margin-bottom: 4px; font-style: italic; }
        .ff-final-close-btn { width: 100%; background: #111; color: #fff; border: none; border-top: 1px solid #333; padding: 20px; font-weight: bold; cursor: pointer; font-size: 13px; text-transform: uppercase; transition: 0.2s; }
        .ff-final-close-btn:hover { background: #222; color: #ffcc00; }
        .papiro-overlay-full { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 100000; display: flex; align-items: center; justify-content: center; }
        .papiro-real-container { width: 1000px; height: 800px; max-width: 95vw; max-height: 95vh; background-size: 100% 100%; background-repeat: no-repeat; padding: 110px 160px; color: #3b2b1a; position: relative; display: flex; flex-direction: column; }
        .sanchez-oval-view-no-border { width: 110px; height: 110px; float: right; border-radius: 50%; background-size: cover; margin-left: 20px; mask-image: radial-gradient(circle, black 60%, transparent 100%); -webkit-mask-image: radial-gradient(circle, black 60%, transparent 100%); opacity: 0.9; }
        .papiro-title-real { border-bottom: 2px solid #3b2b1a; padding-bottom: 5px; margin-top: 0; font-size: 32px; font-weight: bold; }
        .papiro-mestre-sub { font-size: 14px; font-style: italic; opacity: 0.8; margin-top: 5px; }
        .papiro-body-real { margin-top: 25px; flex: 1; overflow-y: auto; line-height: 1.6; font-size: 18px; padding-right: 10px; scrollbar-width: none; -ms-overflow-style: none; }
        .papiro-body-real::-webkit-scrollbar { display: none; }
        .papiro-close-btn { position: absolute; bottom: 45px; right: 110px; background: #3b2b1a; color: #f4e4bc; border: none; padding: 8px 20px; cursor: pointer; font-weight: bold; font-size: 13px; border-radius: 2px; }
        .fade-in { animation: fadeIn 1s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}