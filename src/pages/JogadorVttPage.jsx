import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase';
import { doc, collection, query, where, onSnapshot, updateDoc, arrayUnion, arrayRemove, addDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import fundoJogador from '../assets/fundo-jogador.jpg';
import fundoJogador1 from '../assets/fundo-jogador1.jpeg';
import fundoJogador2 from '../assets/fundo-jogador2.jpeg';
import fundoJogador3 from '../assets/fundo-jogador3.jpeg';
import fundoJogador4 from '../assets/fundo-jogador4.jpeg';
import WallpaperPicker from '../components/WallpaperPicker';
import sanchezImg from '../assets/sanchez.jpeg'; 
import levelUpMusic from '../assets/level-up.mp3'; 
import Bazar from '../components/Bazar';
import Ficha from '../components/Ficha';
import Tabletop from '../components/Tabletop'; 
import SceneryViewer from '../components/SceneryViewer'; 
import NPCViewer from '../components/NPCViewer'; 
import chocoboGif from '../assets/chocobo-loading.gif';
import { DiceSelector } from '../components/DiceSystem';
import { Dice3DResult } from '../components/Dice3DResult';
import AnnouncementTicker from '../components/AnnouncementTicker'; 
import { backgroundMusic } from './LandingPage'; 
import GuildBoard from '../components/GuildBoard'; 
import treeData from '../data/tree.json';
import { getCharacterClass, getCharacterRace, hasClassMismatch } from '../utils/characterHelpers';
import {
  getItensInventarioDisponiveis,
  getGilDisponivelParaTroca,
  getQuantidadeDisponivelSlot,
  validarPropostaTroca
} from '../utils/mercadoLanternas'; 
import { FaFeather } from 'react-icons/fa';

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

  const getEventPillStyle = (ev) => {
    if (!ev.mestreCor) return {};
    return {
      borderLeft: `4px solid ${ev.mestreCor}`,
      backgroundColor: `${ev.mestreCor}30`,
      borderColor: ev.mestreCor,
      color: '#fff'
    };
  };

  const getEventTitle = (ev) => {
    const mestre = ev.mestreNome || 'Mestre';
    if (ev.type === 'session') return `${ev.missaoNome} — ${mestre}`;
    return `${mestre} — Disponível`;
  };

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
                title={getEventTitle(ev)}
                style={getEventPillStyle(ev)}
              >
                {ev.dateObj.getHours()}:{String(ev.dateObj.getMinutes()).padStart(2,'0')}{' '}
                {ev.type === 'session'
                  ? (ev.isArena ? '⚔️' : '🛡️')
                  : (ev.mestreNome ? ev.mestreNome.split(' ')[0] : '✅')}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="ff-modal-overlay-calendar">
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
                            <h4 style={{color: viewEvent.isArena ? '#a855f7' : (viewEvent.mestreCor || '#f44')}}>
                              {viewEvent.isArena ? '⚔️ ARENA PVP' : '🛡️ SESSÃO AGENDADA'}
                            </h4>
                            <h3>{viewEvent.missaoNome}</h3>
                            <p><strong>Horário:</strong> {new Date(viewEvent.dataInicio).toLocaleString()}</p>
                            <p><strong>Narrador:</strong> <span style={{color: viewEvent.mestreCor || '#fff'}}>{viewEvent.mestreNome || 'Desconhecido'}</span></p>
                            <div className="detail-players">
                                <strong>Jogadores:</strong>
                                {viewEvent.participantes?.join(', ') || "Nenhum"}
                            </div>
                        </>
                    ) : (
                        <>
                            <h4 style={{color: viewEvent.mestreCor || '#0f0'}}>✅ HORÁRIO DISPONÍVEL</h4>
                            <p><strong>Data:</strong> {new Date(viewEvent.start).toLocaleString()}</p>
                            <p><strong>Narrador:</strong> <span style={{color: viewEvent.mestreCor || '#fff'}}>{viewEvent.mestreNome || 'Desconhecido'}</span></p>
                            <p>Este mestre está livre neste horário.</p>
                        </>
                    )}
                    <button className="btn-cancelar-main" style={{marginTop:'10px', width:'100%'}} onClick={() => setViewEvent(null)}>FECHAR</button>
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
        .cal-day { background: #1e293b; border: 1px solid #334155; padding: 5px; min-height: 100px; position: relative; display: flex; flex-direction: column; }
        .cal-day.empty { background: transparent; border: none; }
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
        .ff-modal-overlay-calendar { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
      `}</style>
    </div>
  );
};

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

const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const formatSanchesText = (text) => {
    if (!text) return { __html: "" };
    let formatted = text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>') 
      .replace(/_(.*?)_/g, '<em>$1</em>')           
      .replace(/\n/g, '<br />');                    
    return { __html: formatted };
  };

const JOGADOR_WALLPAPERS = [
  { label: 'Padrão',      src: fundoJogador  },
  { label: 'Wallpaper 2', src: fundoJogador1 },
  { label: 'Wallpaper 3', src: fundoJogador2 },
  { label: 'Wallpaper 4', src: fundoJogador3 },
  { label: 'Wallpaper 5', src: fundoJogador4 },
];

export default function JogadorVttPage() {
  const navigate = useNavigate();
  const [personagem, setPersonagem] = useState(null);
  const [allPersonagens, setAllPersonagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [missoes, setMissoes] = useState([]);

  const [wallpaper, setWallpaper] = useState(() => {
    const saved = localStorage.getItem('jogador_wallpaper');
    return saved || fundoJogador;
  });
  
  const [arenasDisponiveis, setArenasDisponiveis] = useState([]);
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [showArenaDetails, setShowArenaDetails] = useState(null);

  const [allSessoes, setAllSessoes] = useState([]); 
  const [allGlobalSessoes, setAllGlobalSessoes] = useState([]); // Todas as sessões do servidor (para checar status de todos)
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [disponibilidades, setDisponibilidades] = useState([]);
  
  const [showCombatTracker, setShowCombatTracker] = useState(false);
  const [viewMonsterDetails, setViewMonsterDetails] = useState(null); 
  const [trackerPos, setTrackerPos] = useState({ x: 280, y: 100 });
  const [isDraggingTracker, setIsDraggingTracker] = useState(false);
  const [dragOffsetTracker, setDragOffsetTracker] = useState({ x: 0, y: 0 });

  const [detailsPos, setDetailsPos] = useState({ x: 620, y: 100 });
  const [isDraggingDetails, setIsDraggingDetails] = useState(false);
  const [dragOffsetDetails, setDragOffsetDetails] = useState({ x: 0, y: 0 });

  const [showDiceSelector, setShowDiceSelector] = useState(false);
  const [rollResult, setRollResult] = useState(null);
  const dismissedRollTimestamp = useRef(0);
  const [unreadResenhas, setUnreadResenhas] = useState(0);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const prevLevelRef = useRef(null); 
  const audioRef = useRef(new Audio(levelUpMusic)); 
  
  // --- ESTADOS DO CHAT DE EQUIPE (PVP) ---
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInputText, setChatInputText] = useState("");
  const [unreadChatMessages, setUnreadChatMessages] = useState(0);
  const [lastOpenedChat, setLastOpenedChat] = useState(Date.now());
  const chatEndRef = useRef(null);

  const [chatPos, setChatPos] = useState({ x: 300, y: 150 });
  const [isDraggingChat, setIsDraggingChat] = useState(false);
  const [dragOffsetChat, setDragOffsetChat] = useState({ x: 0, y: 0 });

  // --- NOVOS ESTADOS - QUEUE 01 ---
  const [showBencao, setShowBencao] = useState(false);
  const [numeroDestino, setNumeroDestino] = useState("");
  const [bencaoFlash, setBencaoFlash] = useState(false);
  const lastBencaoTsRef = useRef(null);

  const [showTrocas, setShowTrocas] = useState(false);
  const [minhasTrocas, setMinhasTrocas] = useState([]);
  const [trocaForm, setTrocaForm] = useState({ destinatarioUid: '', itensSelecionados: [], gil: 0, mensagem: '' });

  const [showClassTree, setShowClassTree] = useState(false);
  const [treeTab, setTreeTab] = useState('Bangaa');
  const [treePos, setTreePos] = useState({ x: 50, y: 50 });
  const [isDraggingTree, setIsDraggingTree] = useState(false);
  const [dragOffsetTree, setDragOffsetTree] = useState({ x: 0, y: 0 });

  const handleChatMouseDown = (e) => {
      setIsDraggingChat(true);
      setDragOffsetChat({ x: e.clientX - chatPos.x, y: e.clientY - chatPos.y });
  };

  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

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
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let unsubChar = () => {}; let unsubMissoes = () => {}; let unsubDisp = () => {}; let unsubArenas = () => {}; let unsubAllChars = () => {}; let unsubGlobalSessoes = () => {};
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
            const qDisp = query(collection(db, "disponibilidades")); 
            const qArenas = query(collection(db, "sessoes"), where("isArena", "==", true));
            const qAllChars = query(collection(db, "characters"));
            const qGlobalSessoes = query(collection(db, "sessoes"));

            unsubMissoes = onSnapshot(qMissoes, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            unsubDisp = onSnapshot(qDisp, (snap) => setDisponibilidades(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            unsubArenas = onSnapshot(qArenas, (snap) => setArenasDisponiveis(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            unsubAllChars = onSnapshot(qAllChars, (snap) => setAllPersonagens(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            unsubGlobalSessoes = onSnapshot(qGlobalSessoes, (snap) => setAllGlobalSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        } else { setLoading(false); navigate('/login'); }
    });
    return () => { unsubscribeAuth(); unsubChar(); unsubMissoes(); unsubDisp(); unsubArenas(); unsubAllChars(); unsubGlobalSessoes(); };
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
                      const rollId = roll.id || roll.timestamp;
                      if (rollId !== dismissedRollTimestamp.current) {
                        setRollResult(prev => { if (!prev || (prev.id || prev.timestamp) !== rollId) return roll; return prev; });
                      }
                }
                const playerInList = sessionUpdated.connected_players?.includes(auth.currentUser?.uid);
                setVttStatus(playerInList ? 'connected' : 'waiting');
            } else {
                setCurrentVttSession(null);
                setHasJoinedSession(false);
                setVttStatus(null);
                setChatOpen(false);
                setChatMessages([]);
                setUnreadChatMessages(0);
                alert("A sessão de jogo foi encerrada.");
            }
        }
      });
      const qResenhas = query(collection(db, "resenhas"), where("destinatarios", "array-contains", personagem.name));
      const unsubResenhas = onSnapshot(qResenhas, (snap) => {
        const validas = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => new Date(r.expiraEm) > new Date());
        setResenhas(validas);
        const lastSeen = parseInt(localStorage.getItem('sanches_last_read_count') || '0');
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

  // --- LISTENER GLOBAL DE TROCAS ---
  useEffect(() => {
      if (!personagem) return;
      const qMercado = query(collection(db, "mercado_lanternas"));
      const unsubMercado = onSnapshot(qMercado, mercSnap => {
          const allTrocas = mercSnap.docs.map(d => ({id: d.id, ...d.data()}));
          const myTrocas = allTrocas.filter(t => t.remetenteUid === personagem.uid || t.destinatarioUid === personagem.uid);
          myTrocas.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
          setMinhasTrocas(myTrocas);
      });
      return () => unsubMercado();
  }, [personagem?.uid]);

  useEffect(() => {
      if (!personagem?.uid || !hasClassMismatch(personagem)) return;
      const primaryClass = personagem.character_sheet?.job_system?.primary_class?.name;
      if (!primaryClass) return;
      updateDoc(doc(db, "characters", personagem.uid), {
          class: primaryClass,
          'character_sheet.basic_info.class': primaryClass
      }).catch(console.error);
  }, [personagem?.uid, personagem?.class, personagem?.character_sheet?.job_system?.primary_class?.name]);

  useEffect(() => {
      const bencao = currentVttSession?.bencao_deuses;
      if (!bencao?.timestamp || !bencao?.vencedores?.length) return;
      if (lastBencaoTsRef.current === bencao.timestamp) return;
      lastBencaoTsRef.current = bencao.timestamp;
      setBencaoFlash(true);
      const t = setTimeout(() => setBencaoFlash(false), 4000);
      return () => clearTimeout(t);
  }, [currentVttSession?.bencao_deuses?.timestamp, currentVttSession?.bencao_deuses?.vencedores]);

  useEffect(() => {
      if (!showBencao || !currentVttSession || !personagem) return;
      const saved = currentVttSession.bencao_deuses?.numeros_escolhidos?.[personagem.name];
      setNumeroDestino(saved ? String(saved) : "");
  }, [showBencao, currentVttSession?.bencao_deuses?.numeros_escolhidos, personagem?.name, currentVttSession, personagem]);

  // Função helper para verificar se um jogador X está com sessão ativa rolando
  const isPlayerActive = (playerName) => {
      const now = new Date();
      return allGlobalSessoes.some(s => {
          const inicio = new Date(s.dataInicio);
          const fim = new Date(s.expiraEm);
          return now >= inicio && now <= fim && s.participantes?.includes(playerName);
      });
  };

  const iAmActive = personagem ? isPlayerActive(personagem.name) : false;

  const handleConfirmLevelUp = () => { setShowLevelUpModal(false); audioRef.current.pause(); };
  
  const handleCandidatar = async (missao) => {
    if (!personagem) return;
    if (missao.candidatos?.some(c => c.uid === auth.currentUser.uid)) return alert("Já candidatado!");
    const isLeader = !missao.candidatos || missao.candidatos.length === 0;
    const candidatoObj = { uid: auth.currentUser.uid, nome: personagem.name, classe: getCharacterClass(personagem), isLeader, dataCandidatura: new Date().toISOString() };
    try {
      await updateDoc(doc(db, "missoes", missao.id), { candidatos: arrayUnion(candidatoObj) });
      alert(isLeader ? "Você é o LÍDER DO GRUPO!" : "Candidatura realizada!");
    } catch (e) { console.error(e); alert("Erro ao candidatar."); }
  };

  const handleJoinArenaTeam = async (arena, equipeId) => {
      if (!personagem) return;
      if (arena.participantes?.includes(personagem.name)) return alert("Você já está inscrito nesta Arena!");

      const novaEquipe = arena.equipes.find(e => e.id === equipeId);
      if (novaEquipe.membros.length >= novaEquipe.max) return alert("Este time já está cheio!");

      const novasEquipes = arena.equipes.map(eq => {
          if (eq.id === equipeId) {
              return { ...eq, membros: [...eq.membros, personagem.name] };
          }
          return eq;
      });

      const novosParticipantes = [...(arena.participantes || []), personagem.name];

      try {
          await updateDoc(doc(db, "sessoes", arena.id), {
              equipes: novasEquipes,
              participantes: novosParticipantes
          });
          alert(`Você entrou no time ${novaEquipe.nome}!`);
          setShowArenaDetails(null);
      } catch(e) {
          alert("Erro ao entrar no time.");
      }
  };

  const enterVTT = (sessao) => { setCurrentVttSession(sessao); setHasJoinedSession(true); setVttStatus(new Date() >= new Date(sessao.dataInicio) ? 'connected' : 'waiting'); };
  const handleOpenSanches = () => { setShowResenhasList(true); localStorage.setItem('sanches_last_read_count', resenhas.length.toString()); setUnreadResenhas(0); };
  
  const handleOpenBook = () => {
    window.open("https://www.canva.com/design/DAGpzszHsc4/NcbQ19hsr4grzm9aotQFtw/edit?utm_content=DAGpzszHsc4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton", "_blank");
  };

  // --- HANDLERS TROCAS GLOBAIS (JOGADOR) ---
  const toggleItemTroca = (item) => {
      setTrocaForm(prev => {
          const isSelected = prev.itensSelecionados.find(i => i.index === item.index);
          if (isSelected) {
              return { ...prev, itensSelecionados: prev.itensSelecionados.filter(i => i.index !== item.index) };
          }
          return {
              ...prev,
              itensSelecionados: [
                  ...prev.itensSelecionados,
                  { index: item.index, name: item.name, quantidade: 1, maxQuantity: item.disponivel }
              ]
          };
      });
  };

  const updateItemQuantidadeTroca = (itemIndex, rawValue) => {
      setTrocaForm(prev => ({
          ...prev,
          itensSelecionados: prev.itensSelecionados.map(i => {
              if (i.index !== itemIndex) return i;
              const parsed = parseInt(rawValue, 10);
              const quantidade = Number.isNaN(parsed) ? 1 : Math.min(Math.max(1, parsed), i.maxQuantity);
              return { ...i, quantidade };
          })
      }));
  };

  const handleEnviarProposta = async (e) => {
      e.preventDefault();
      if(iAmActive) return alert("Você está em uma sessão ativa. Trocas não permitidas.");
      if(!personagem || !trocaForm.destinatarioUid) return alert("Selecione o destinatário da troca.");
      
      const target = allPersonagens.find(p => p.uid === trocaForm.destinatarioUid);
      if (!target) return alert("Destinatário não encontrado.");
      if (target.uid === personagem.uid) return alert("Você não pode enviar uma troca para si mesmo.");
      if (isPlayerActive(target.name)) return alert("O destinatário está em uma sessão ativa agora.");

      const inventory = personagem.character_sheet?.inventory;
      const trocasPendentes = minhasTrocas.filter(t => t.status === 'pendente_mestre');
      const validacao = validarPropostaTroca({
          inventory,
          itensSelecionados: trocaForm.itensSelecionados,
          gil: trocaForm.gil,
          trocasPendentes,
          remetenteUid: personagem.uid
      });

      if (!validacao.valid) return alert(validacao.error);

      try {
          await addDoc(collection(db, "mercado_lanternas"), {
              remetenteUid: personagem.uid,
              remetente: personagem.name,
              destinatarioUid: target.uid,
              destinatario: target.name,
              itens: validacao.itensNormalizados,
              gil: Number(trocaForm.gil) || 0,
              mensagem: trocaForm.mensagem,
              status: 'pendente_mestre',
              createdAt: new Date().toISOString()
          });
          setTrocaForm({ destinatarioUid: '', itensSelecionados: [], gil: 0, mensagem: '' });
          alert("Proposta enviada! O Narrador precisa autorizar para efetivar a movimentação na ficha.");
      } catch(err) { alert("Erro ao enviar: " + err.message); }
  };

  // --- HANDLER BÊNÇÃO DOS DEUSES ---
  const handleApostarNumero = async (e) => {
      e.preventDefault();
      if (!currentVttSession || !personagem || !numeroDestino) return;
      const num = Number(numeroDestino);
      if (num < 1 || num > 100 || !Number.isInteger(num)) return alert("Escolha um número inteiro entre 1 e 100.");
      if (currentVttSession.bencao_deuses?.resultado_d100 > 0) return alert("O dado dos deuses já foi rolado nesta sessão.");
      const bencaoAtual = currentVttSession.bencao_deuses || {};
      try {
          await updateDoc(doc(db, "sessoes", currentVttSession.id), {
              bencao_deuses: {
                  ...bencaoAtual,
                  numeros_escolhidos: {
                      ...(bencaoAtual.numeros_escolhidos || {}),
                      [personagem.name]: num
                  }
              }
          });
          alert(`Número ${num} cravado! Os deuses o observam.`);
          setShowBencao(false);
      } catch (err) { alert("Erro ao apostar: " + err.message); }
  };

  // --- HANDLERS ARRASTAR ---
  const startDragTree = (clientX, clientY) => {
      setIsDraggingTree(true);
      setDragOffsetTree({ x: clientX - treePos.x, y: clientY - treePos.y });
  };
  const onDragMoveTree = (clientX, clientY) => {
      if (!isDraggingTree) return;
      setTreePos({ x: clientX - dragOffsetTree.x, y: clientY - dragOffsetTree.y });
  };
  
  const handleTreeMouseDown = (e) => startDragTree(e.clientX, e.clientY);
  const handleTreeTouchStart = (e) => startDragTree(e.touches[0].clientX, e.touches[0].clientY);
  const handleTreeTouchMove = (e) => {
      if(isDraggingTree) e.preventDefault(); 
      onDragMoveTree(e.touches[0].clientX, e.touches[0].clientY);
  };
  const handleTreeTouchEnd = () => setIsDraggingTree(false);

  const handleTrackerMouseDown = (e) => {
      setIsDraggingTracker(true);
      setDragOffsetTracker({ x: e.clientX - trackerPos.x, y: e.clientY - trackerPos.y });
  };
  const handleDetailsMouseDown = (e) => {
      setIsDraggingDetails(true);
      setDragOffsetDetails({ x: e.clientX - detailsPos.x, y: e.clientY - detailsPos.y });
  };
  const handleWindowMouseMove = (e) => {
      if (isDraggingTracker) { setTrackerPos({ x: e.clientX - dragOffsetTracker.x, y: e.clientY - dragOffsetTracker.y }); }
      if (isDraggingDetails) { setDetailsPos({ x: e.clientX - dragOffsetDetails.x, y: e.clientY - dragOffsetDetails.y }); }
      if (isDraggingChat) { setChatPos({ x: e.clientX - dragOffsetChat.x, y: e.clientY - dragOffsetChat.y }); }
      if (isDraggingTree) { setTreePos({ x: e.clientX - dragOffsetTree.x, y: e.clientY - dragOffsetTree.y }); } 
  };
  const handleWindowMouseUp = () => { 
      setIsDraggingTracker(false); 
      setIsDraggingDetails(false); 
      setIsDraggingChat(false);
      setIsDraggingTree(false); 
  };

  const myTeam = currentVttSession?.pvp_mode && currentVttSession?.equipes?.find(eq => eq.membros.includes(personagem?.name));
  const showTeamChat = vttStatus === 'connected' && currentVttSession?.pvp_mode && myTeam;

  useEffect(() => {
    if (!showTeamChat || !myTeam) {
      setChatMessages([]);
      setUnreadChatMessages(0);
      return;
    }
    const messagesQuery = query(collection(db, "sessoes", currentVttSession.id, "team_chats", myTeam.id.toString(), "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setChatMessages(msgs);
      if (!chatOpen) {
        const newMsgs = msgs.filter(m => {
          const mTime = m.createdAt ? m.createdAt.toDate().getTime() : Date.now();
          return mTime > lastOpenedChat;
        });
        setUnreadChatMessages(newMsgs.length);
      } else {
        setUnreadChatMessages(0);
      }
    });
    return () => unsubscribe();
  }, [showTeamChat, myTeam?.id, chatOpen, lastOpenedChat, currentVttSession?.id]);

  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  const handleSendChatMessage = async (e) => {
      if (e) e.preventDefault();
      if (!chatInputText.trim() || !showTeamChat || !myTeam) return;

      const text = chatInputText;
      setChatInputText("");

      try {
          await addDoc(collection(db, "sessoes", currentVttSession.id, "team_chats", myTeam.id.toString(), "messages"), {
              senderName: personagem.name,
              senderUid: auth.currentUser.uid,
              content: text,
              createdAt: serverTimestamp()
          });
      } catch (err) {
          console.error("Erro ao enviar mensagem:", err);
      }
  };

  const getTeamColor = (tokenName) => {
      if (!currentVttSession || !currentVttSession.equipes) return null;
      for (let eq of currentVttSession.equipes) {
          if (eq.membros.includes(tokenName)) return eq.cor;
      }
      return null;
  };

  // --- RENDER ÁRVORE VISUAL DINÂMICA (Baseada no tree.json) ---
  const renderClassTree = () => {
      const raceData = treeData[treeTab];
      if (!raceData) return <p style={{color:'#666', textAlign:'center'}}>Dados de classe não encontrados para esta raça.</p>;

      return (
          <div className="tree-container">
              {raceData.map((line, idx) => (
                  <div key={idx} className="tree-line">
                      <div className={`fc-node ${line.special ? 'special' : line.isolated ? 'legendary' : 'base'}`}>
                          {line.base}
                      </div>
                      {line.paths && line.paths.length > 0 && (
                          <div className="tree-paths">
                              {line.paths.map((path, i) => (
                                  <div key={i} className="tree-path">
                                      <div className="fc-arrow">↓</div>
                                      <div className="fc-node adv">{path.adv}</div>
                                      {path.max && (
                                          <>
                                              <div className="fc-arrow">↓</div>
                                              <div className="fc-node max">{path.max}</div>
                                          </>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              ))}
          </div>
      );
  };

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
          @keyframes pulseText { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
        `}</style>
      </div>
    );
  }

  if (!personagem) return <div className="loading-screen">Nenhum personagem encontrado.</div>;

  const buffAtivo = currentVttSession?.bencao_deuses?.buff_ativo || currentVttSession?.bencao_deuses?.vencedores || [];
  const isBencaoWinner = buffAtivo.includes(personagem?.name);
  const meuNumeroDestino = currentVttSession?.bencao_deuses?.numeros_escolhidos?.[personagem?.name];
  const bencaoJaRolado = (currentVttSession?.bencao_deuses?.resultado_d100 || 0) > 0;
  const meuInventarioItems = personagem?.character_sheet?.inventory?.items || [];
  const trocasPendentesEnviadas = minhasTrocas.filter(
      t => t.remetenteUid === personagem?.uid && t.status === 'pendente_mestre'
  );
  const meuInventario = getItensInventarioDisponiveis(meuInventarioItems).map(item => ({
      ...item,
      disponivel: getQuantidadeDisponivelSlot(
          meuInventarioItems,
          item.index,
          trocasPendentesEnviadas,
          personagem.uid
      )
  })).filter(item => item.disponivel > 0);
  const meuGil = getGilDisponivelParaTroca(
      personagem?.character_sheet?.inventory,
      trocasPendentesEnviadas,
      personagem?.uid
  );

  return (
    <div className="jogador-container" onMouseMove={handleWindowMouseMove} onMouseUp={handleWindowMouseUp}>
      <div className="background-layer" style={{ backgroundImage: `url(${wallpaper})` }} />
      <AnnouncementTicker />
      
      {bencaoFlash && currentVttSession?.bencao_deuses?.vencedores?.length > 0 && createPortal(
          <div className="bencao-roll-flash">
              <div className="bencao-roll-flash-inner">
                  <span className="bencao-flash-label">BÊNÇÃO DOS DEUSES</span>
                  <span className="bencao-flash-number">{currentVttSession.bencao_deuses.resultado_d100}</span>
                  <span className="bencao-flash-winners">
                      {isBencaoWinner ? 'OS DEUSES SORRIEM PARA VOCÊ!' : `Bênção para: ${currentVttSession.bencao_deuses.vencedores.join(', ')}`}
                  </span>
              </div>
          </div>,
          document.body
      )}

      <div className="content-layer">

        <div className={`char-hud clickable-hud ${isBencaoWinner ? 'bencao-highlight' : ''}`} onClick={() => setShowFicha(true)} title="Abrir Ficha">
          <div className="char-avatar"><div className="avatar-circle"><span className="hud-level">{personagem.character_sheet?.basic_info?.level || 1}</span></div></div>
          <div className="char-info"><h2 className="char-name">{personagem.name}</h2><span className="char-meta">{personagem.character_sheet?.basic_info?.custom_title || `${getCharacterRace(personagem)} // ${getCharacterClass(personagem)}`}</span></div>
        </div>

        {currentVttSession && currentVttSession.active_map && (
            <Tabletop sessaoData={currentVttSession} isMaster={false} currentUserUid={auth.currentUser?.uid} personagensData={allPersonagens} />
        )}

        <SceneryViewer sessaoData={currentVttSession} isMaster={false} />
        <NPCViewer sessaoData={currentVttSession} isMaster={false} />
        {rollResult && <Dice3DResult rollData={rollResult} onClose={() => { dismissedRollTimestamp.current = rollResult.id || rollResult.timestamp; setRollResult(null); }} />}
        {showDiceSelector && currentVttSession && <DiceSelector sessaoId={currentVttSession.id} playerName={personagem.name} onClose={() => setShowDiceSelector(false)} />}
        
        {/* --- COMBAT TRACKER --- */}
        {showCombatTracker && currentVttSession && (
            <div 
                className="combat-tracker-panel player-view fade-in"
                style={{ top: trackerPos.y, left: trackerPos.x, zIndex: 2100 }}
            >
                <div 
                    className="tracker-header"
                    onMouseDown={handleTrackerMouseDown}
                    style={{cursor: 'grab'}}
                >
                    <h3 className="tracker-title">COMBATE</h3>
                </div>
                <div className="tracker-list">
                    {currentVttSession.tokens?.map((t, i) => ({...t, originalIndex: i})).filter(t => t.type !== 'object').map((token) => {
                        const isBaseVisible = token.visible !== false;
                        const isOwner = token.uid === auth.currentUser.uid;
                        const isPvP = currentVttSession.pvp_mode;
                        
                        let isStealthHidden = false;
                        let isMyStealth = false;

                        if (token.stealth) {
                            if (isPvP) {
                                const myTeam = currentVttSession.equipes?.find(eq => eq.membros.includes(personagem?.name));
                                const isTeammate = myTeam && myTeam.membros.includes(token.name);
                                if (isOwner || isTeammate) {
                                    isMyStealth = true;
                                } else {
                                    isStealthHidden = true;
                                }
                            } else {
                                isMyStealth = true;
                            }
                        }

                        if(!isBaseVisible || isStealthHidden) return null; 

                        let imgUrl = token.img;
                        let hpDisplay = "?", mpDisplay = "?";
                        let hpMax = "?", mpMax = "?";

                        if (token.type === 'player') {
                            const charObj = allPersonagens.find(p => p.uid === token.uid);
                            if (charObj) {
                                hpDisplay = charObj.character_sheet?.status?.hp?.current;
                                hpMax = charObj.character_sheet?.status?.hp?.max;
                                mpDisplay = charObj.character_sheet?.status?.mp?.current;
                                mpMax = charObj.character_sheet?.status?.mp?.max;
                                if(charObj.character_sheet?.imgUrl) imgUrl = charObj.character_sheet.imgUrl;
                            }
                        } else if (token.type === 'enemy') {
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

                        const teamColor = isPvP ? getTeamColor(token.name) : null;
                        const customBorder = teamColor ? { borderLeft: `4px solid ${teamColor}` } : {};
                        const hasBencaoBuff = token.type === 'player' && buffAtivo.includes(token.name);

                        return (
                            <div 
                                key={token.id} 
                                className={`tracker-item readonly ${isMyStealth ? 'tracker-stealth-self' : ''} ${token.flying ? 'tracker-flying' : ''} ${hasBencaoBuff ? 'bencao-highlight' : ''}`}
                                style={customBorder}
                            >
                                <div className="t-col-img">
                                    <div className="t-index">{token.originalIndex + 1}</div>
                                    <div className="t-img" style={{backgroundImage: `url(${imgUrl})`, backgroundPosition: `${token.imgX||50}% ${token.imgY||50}%`}}></div>
                                </div>
                                <div className="t-col-info">
                                    <div className="t-name" style={teamColor ? {color: teamColor} : {}}>
                                        {token.name}
                                        {token.flying && <span className="t-flying-icon" title="Em voo"><FaFeather size={11} /></span>}
                                        {hasBencaoBuff && <span className="t-bencao-icon" title="Bênção dos Deuses ativa">✨</span>}
                                    </div>
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

                    {currentVttSession.tokens?.some(t => t.type === 'object') && (
                        <>
                            <div className="tracker-divider">OBJETOS</div>
                            {currentVttSession.tokens?.map((t, i) => ({...t, originalIndex: i})).filter(t => t.type === 'object').map((token) => {
                                const isVisible = token.visible !== false;
                                if(!isVisible) return null; 

                                return (
                                    <div key={token.id} className="tracker-item object-item readonly">
                                        <div className="t-col-img">
                                            <div className="t-index">{token.originalIndex + 1}</div>
                                            <div className="t-img" style={{backgroundImage: `url(${token.img})`, backgroundPosition: `${token.imgX||50}% ${token.imgY||50}%`}}></div>
                                        </div>
                                        <div className="t-col-info">
                                            <div className="t-name" style={{color: '#ffcc00'}}>{token.name} <small>(Obj)</small></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {(!currentVttSession.tokens || currentVttSession.tokens.length === 0) && <div className="empty-tracker">Mesa Vazia</div>}
                </div>
            </div>
        )}

        {viewMonsterDetails && (
            <div 
                className="monster-detail-card draggable-card fade-in" 
                style={{ position: 'absolute', top: detailsPos.y, left: detailsPos.x, zIndex: 2200 }}
                onClick={e => e.stopPropagation()}
            >
                <div className="md-header" onMouseDown={handleDetailsMouseDown} style={{cursor: 'grab'}}>
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
                        {viewMonsterDetails.tips && (
                            <div className="md-block tips">
                                <label>DICAS DO SANCHES</label>
                                <p>{viewMonsterDetails.tips}</p>
                            </div>
                        )}
                    </div>
                </div>
                <button className="md-close-btn" onClick={() => setViewMonsterDetails(null)}>FECHAR</button>
            </div>
        )}

        {showLevelUpModal && (
            <div className="levelup-global-overlay">
                <div className="levelup-content">
                    <h1 className="levelup-title">LEVEL UP!</h1>
                    <button className="levelup-confirm-btn" onClick={handleConfirmLevelUp}>CONFIRMAR</button>
                </div>
            </div>
        )}
        
        {sessoesFuturas.length > 0 && sessoesAtivas.length === 0 && !hasJoinedSession && <div className="upcoming-sessions-banner"><h3>A SESSÃO VAI COMEÇAR EM BREVE</h3>{sessoesFuturas.map(s => <div key={s.id} className="countdown-row"><span className="sessao-nome-future">{s.missaoNome}</span><CountdownTimer targetDate={s.dataInicio} /></div>)}</div>}
        {sessoesAtivas.length > 0 && !hasJoinedSession && <div className="active-sessions-banner fade-in"><h3>SESSÃO EM ANDAMENTO!</h3>{sessoesAtivas.map(s => <div key={s.id} className="session-entry-row"><span className="sessao-nome-active">{s.missaoNome}</span><button className="btn-enter-session" onClick={() => enterVTT(s)}>ENTRAR AGORA</button></div>)}</div>}
        {vttStatus && currentVttSession && <div className={`vtt-status-widget ${vttStatus}`}><div className="status-indicator"></div><div className="status-text">{vttStatus === 'waiting' ? <><h4>AGUARDANDO</h4><small>Conectado...</small></> : <><h4>ONLINE</h4><small>Na Mesa</small></>}</div></div>}

        {/* --- BOTÕES FLUTUANTES ENVOLTOS EM UM FLEX CONTAINER --- */}
        <div className="hud-columns-container">
            {/* Coluna 1: Principal (Sempre visível ou global) */}
            <div className="hud-col">
                <button className="hud-btn btn-tree" onClick={() => setShowClassTree(true)} title="Árvore de Classes">🌳</button>
                <button className="hud-btn btn-trocas" onClick={() => setShowTrocas(true)} title="Sistema de Trocas">
                    🏮
                    {minhasTrocas.filter(t=>t.status==='pendente_mestre' && t.remetenteUid===personagem?.uid).length > 0 && <span className="notification-badge">!</span>}
                </button>
                <button className="hud-btn btn-arena" onClick={() => setShowArenaModal(true)} title="Arenas PVP">⚔️</button>
                <button className="hud-btn btn-calendar" onClick={() => setShowCalendar(true)} title="Agenda">📅</button>
                <button className="hud-btn btn-book" onClick={handleOpenBook} title="Livro do Jogo"><BookIcon /></button>
                {resenhas.length > 0 && <button className="hud-btn btn-sanches" onClick={handleOpenSanches} title="Resenhas">
                    <div className="sanches-icon-face" style={{backgroundImage: `url(${sanchezImg})`}}></div>
                    {unreadResenhas > 0 && <span className="notification-badge">{unreadResenhas}</span>}
                </button>}
                <button className="hud-btn btn-mission" onClick={() => setShowMissionModal(true)} title="Missões">📜</button>
            </div>

            {/* Coluna 2: Apenas durante VTT Ativo */}
            {currentVttSession && (
                <div className="hud-col">
                    {showTeamChat && (
                        <button className="hud-btn" style={{borderColor: myTeam.cor, color: '#fff'}} onClick={() => {
                            setChatOpen(!chatOpen);
                            if (!chatOpen) { setLastOpenedChat(Date.now()); setUnreadChatMessages(0); }
                        }} title="Chat de Equipe">
                            💬
                            {unreadChatMessages > 0 && <span className="notification-badge">{unreadChatMessages}</span>}
                        </button>
                    )}
                    <button className={`hud-btn btn-bencao ${isBencaoWinner ? 'bencao-highlight' : ''}`} onClick={() => setShowBencao(true)} title="Bênção dos Deuses">✨</button>
                    <button className="hud-btn btn-combat" onClick={() => setShowCombatTracker(!showCombatTracker)} title="Ver Combate"><CombatIcon /></button>
                    <button className="hud-btn btn-dice" onClick={() => setShowDiceSelector(true)} title="Rolar Dados">🎲</button>
                </div>
            )}
        </div>

        <Bazar isMestre={false} playerData={personagem} />
        <GuildBoard isMaster={false} />

        {showCalendar && (
          <CalendarSystemPlayer onClose={() => setShowCalendar(false)} disponibilidades={disponibilidades} sessoes={allSessoes} />
        )}
        
        {/* MODAL DE LISTA DE MISSÕES */}
        {showMissionModal && (<div className="ff-modal-overlay-flex" onClick={() => setShowMissionModal(false)}><div className="ff-modal-compact ff-card" onClick={e => e.stopPropagation()}><div className="modal-header-compact"><h3 className="modal-title-ff">QUADRO DE CONTRATOS</h3><button className="btn-close-x" onClick={() => setShowMissionModal(false)}>✕</button></div><div className="missions-grid-compact">{missoes.map(m => (<div key={m.id} className={`mission-card-compact rank-${m.rank}`}><div className="mc-left"><span className="mc-rank">{m.rank}</span></div><div className="mc-center"><h4 className="mc-title">{m.nome}</h4><span className="mc-reward">💰 {m.gilRecompensa} Gil</span></div><div className="mc-right"><button className="btn-details-mini" onClick={() => setShowMissionDetails(m)}>Ver Detalhes</button><button className="btn-accept-mini" onClick={() => handleCandidatar(m)}>ACEITAR</button></div></div>))}</div></div></div>)}
        
        {/* MODAL DE DETALHES DA MISSÃO */}
        {showMissionDetails && (<div className="ff-modal-overlay-flex" onClick={() => setShowMissionDetails(null)} style={{zIndex: 100000}}><div className="ff-modal-details-wide ff-card" onClick={e => e.stopPropagation()}><div className="detail-wide-header"><div className="dw-rank-badge">{showMissionDetails.rank}</div><div className="dw-title-box"><h2>{showMissionDetails.nome}</h2><span className="dw-narrator">Narrador: {showMissionDetails.mestreNome}</span></div><div className="dw-vagas-box"><span className="dw-vagas-label">Grupo: {showMissionDetails.candidatos ? showMissionDetails.candidatos.length : 0} / {showMissionDetails.grupo || '?'}</span><div className="dw-vagas-bar"><div style={{width: `${Math.min(((showMissionDetails.candidatos?.length || 0) / (parseInt(showMissionDetails.grupo) || 1)) * 100, 100)}%`}}></div></div></div></div><div className="detail-wide-body"><div className="dw-col-left"><div className="dw-info-item"><label>🌍 LOCAL</label><span>{showMissionDetails.local || "Desconhecido"}</span></div><div className="dw-info-item"><label>👤 CONTRATANTE</label><span>{showMissionDetails.contratante || "Anônimo"}</span></div><div className="dw-reward-box"><label>RECOMPENSAS</label><div className="dw-gil-row"><span className="gil-icon">💰</span> <span className="gil-val">{showMissionDetails.gilRecompensa} GIL</span></div>{showMissionDetails.recompensa && (<div className="dw-extra-rewards">{showMissionDetails.recompensa.split('\n').map((r,i) => (<div key={i} className="reward-item">• {r}</div>))}</div>)}</div><div className="dw-candidates-box"><label>AVENTUREIROS INSCRITOS</label><div className="dw-cand-list">{showMissionDetails.candidatos && showMissionDetails.candidatos.length > 0 ? (showMissionDetails.candidatos.map((c, i) => (<div key={i} className="dw-cand-item" style={{color: c.isLeader ? '#ffcc00' : '#ccc'}}>{c.isLeader ? '👑' : '•'} {c.nome}</div>))) : <span style={{fontSize:'11px', color:'#666'}}>Seja o primeiro!</span>}</div></div>{showMissionDetails.imagem && (<button className="btn-cartaz-full" onClick={() => setViewImage(showMissionDetails.imagem)}>👁️ VER CARTAZ</button>)}</div><div className="dw-col-right custom-scrollbar"><div className="dw-text-block"><label>📜 DESCRIÇÃO</label><p>{showMissionDetails.descricaoMissao}</p></div><div className="dw-text-block"><label>⚔️ OBJETIVOS</label><p>{showMissionDetails.objetivosMissao}</p></div><div className="dw-text-block"><label>⚡ REQUISITOS</label><p>{showMissionDetails.requisitos}</p></div></div></div><button className="dw-close-btn" onClick={() => setShowMissionDetails(null)}>FECHAR</button></div></div>)}
        
        {/* --- MODAIS DA ARENA --- */}
        {showArenaModal && (
            <div className="ff-modal-overlay-flex" onClick={() => setShowArenaModal(false)}>
                <div className="ff-modal-compact ff-card" onClick={e => e.stopPropagation()}>
                    <div className="modal-header-compact">
                        <h3 className="modal-title-ff" style={{color:'#a855f7'}}>ARENAS DISPONÍVEIS</h3>
                        <button className="btn-close-x" onClick={() => setShowArenaModal(false)}>✕</button>
                    </div>
                    <div className="missions-grid-compact">
                        {arenasDisponiveis.filter(a => new Date(a.expiraEm) > new Date()).map(arena => (
                            <div key={arena.id} className="mission-card-compact" style={{borderColor: '#a855f7'}}>
                                <div className="mc-left" style={{color:'#a855f7'}}>⚔️</div>
                                <div className="mc-center">
                                    <h4 className="mc-title">{arena.missaoNome}</h4>
                                    <span className="mc-reward">Equipes: {arena.equipes?.length || 0}</span>
                                </div>
                                <div className="mc-right">
                                    <button className="btn-details-mini" style={{borderColor: '#a855f7', color: '#a855f7'}} onClick={() => setShowArenaDetails(arena)}>VER TIMES</button>
                                </div>
                            </div>
                        ))}
                        {arenasDisponiveis.length === 0 && <p style={{textAlign:'center', color:'#666'}}>Nenhuma arena disponível no momento.</p>}
                    </div>
                </div>
            </div>
        )}

        {showArenaDetails && (
            <div className="ff-modal-overlay-flex" onClick={() => setShowArenaDetails(null)} style={{zIndex: 100000}}>
                <div className="ff-modal-details-wide ff-card" onClick={e => e.stopPropagation()} style={{border: '2px solid #a855f7', height: 'auto', maxHeight: '90vh'}}>
                    <div className="detail-wide-header" style={{background: 'linear-gradient(90deg, #3b0764, #000)'}}>
                        <div className="dw-rank-badge" style={{color: '#a855f7', textShadow: 'none'}}>⚔️</div>
                        <div className="dw-title-box">
                            <h2>{showArenaDetails.missaoNome}</h2>
                            <span className="dw-narrator">Mestre: {showArenaDetails.mestreNome || "Narrador"}</span>
                        </div>
                    </div>
                    <div className="detail-wide-body" style={{flexDirection: 'column', overflowY: 'auto', padding: '20px'}}>
                        <h3 style={{color:'#fbbf24', textAlign:'center', marginBottom: '20px'}}>INSCRIÇÃO DE TIMES</h3>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px'}}>
                            {showArenaDetails.equipes?.map(eq => {
                                const isFull = eq.membros.length >= eq.max;
                                const isMinhaEquipe = eq.membros.includes(personagem?.name);
                                const jaEmOutraEquipe = showArenaDetails.participantes?.includes(personagem?.name) && !isMinhaEquipe;

                                return (
                                    <div key={eq.id} style={{background:'#111', borderLeft:`4px solid ${eq.cor}`, borderRadius:'4px', padding:'15px', position: 'relative'}}>
                                        <div style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #333', paddingBottom:'10px', marginBottom:'10px'}}>
                                            <h4 style={{margin:0, color: eq.cor}}>{eq.nome}</h4>
                                            <span style={{fontSize:'12px', color: isFull ? '#f44' : '#0f0'}}>{eq.membros.length} / {eq.max}</span>
                                        </div>
                                        <div style={{minHeight:'80px', marginBottom:'15px', fontSize:'12px', color:'#ccc'}}>
                                            <strong>Líder:</strong> <span style={{color:'#ffcc00'}}>👑 {eq.lider}</span><br/><br/>
                                            <strong>Membros:</strong><br/>
                                            {eq.membros.filter(m => m !== eq.lider).map((m, i) => <div key={i}>• {m}</div>)}
                                        </div>
                                        {isMinhaEquipe ? (
                                            <button disabled style={{width:'100%', padding:'10px', background: eq.cor, color:'#000', fontWeight:'bold', border:'none', borderRadius:'4px', opacity: 0.8}}>SEU TIME</button>
                                        ) : (
                                            <button 
                                                onClick={() => handleJoinArenaTeam(showArenaDetails, eq.id)}
                                                disabled={isFull || jaEmOutraEquipe}
                                                style={{
                                                    width:'100%', padding:'10px', background: isFull || jaEmOutraEquipe ? '#333' : 'transparent', 
                                                    color: isFull || jaEmOutraEquipe ? '#666' : eq.cor, 
                                                    border:`1px solid ${isFull || jaEmOutraEquipe ? '#444' : eq.cor}`, 
                                                    fontWeight:'bold', cursor: isFull || jaEmOutraEquipe ? 'not-allowed' : 'pointer', borderRadius:'4px'
                                                }}
                                            >
                                                {isFull ? 'LOTAÇÃO MÁXIMA' : jaEmOutraEquipe ? 'INSCRITO EM OUTRO TIME' : 'ENTRAR NESTE TIME'}
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                    <button className="dw-close-btn" onClick={() => setShowArenaDetails(null)}>FECHAR</button>
                </div>
            </div>
        )}

        {viewImage && (<div className="ff-modal-overlay-flex" style={{zIndex: 100001}} onClick={() => setViewImage(null)}><div className="lightbox-wrap"><button className="close-lightbox" onClick={() => setViewImage(null)}>×</button><img src={viewImage} alt="Cartaz" className="cartaz-full-view" /></div></div>)}
        {showResenhasList && (<div className="ff-modal-overlay-flex" onClick={() => setShowResenhasList(false)}><div className="ff-modal-content ff-card" onClick={e => e.stopPropagation()}><div className="modal-header-row"><h3 className="modal-title-ff">RESENHAS</h3><button className="btn-close-x" onClick={() => setShowResenhasList(false)}>✕</button></div><div className="resenhas-list-container">{resenhas.map(r => (<div key={r.id} className="resenha-row-player" onClick={() => { setViewResenha(r); setShowResenhasList(false); }}><h4>{r.titulo}</h4></div>))}</div></div></div>)}
        
        {viewResenha && (
            <div className="fft-modal-overlay" onClick={() => setViewResenha(null)}>
            <div className="fft-dialog-box" onClick={e => e.stopPropagation()}>
                <div className="fft-portrait-section">
                    <div className="fft-portrait-frame">
                    <img src={sanchezImg} alt="Sanches" />
                    </div>
                    <div className="fft-name-plate">
                    SANCHES
                    </div>
                </div>

                <div className="fft-content-section">
                    <h2 className="fft-title">{viewResenha.titulo}</h2>
                    <div className="fft-scroll-text" dangerouslySetInnerHTML={formatSanchesText(viewResenha.conteudo)}></div>
                </div>

                <button className="fft-close-btn" onClick={() => setViewResenha(null)}>X</button>
            </div>
            </div>
        )}
        
        {showFicha && personagem && <Ficha characterData={personagem} isMaster={false} onClose={() => setShowFicha(false)} />}

        {/* MODAL: SISTEMA DE TROCAS GLOBAIS */}
        {showTrocas && (
            <div className="modal-overlay-custom" onClick={() => setShowTrocas(false)}>
                <div className="modal-box-custom wide" onClick={e => e.stopPropagation()}>
                    <div className="modal-header-c"><h3>🏮 MERCADO DOS LANTERNAS</h3><button className="close-c" onClick={() => setShowTrocas(false)}>✕</button></div>
                    <div style={{display:'flex', gap:'20px'}}>
                        
                        {/* Enviar Proposta */}
                        <div style={{flex:1, background:'#111', padding:'15px', borderRadius:'4px', border:'1px solid #333'}}>
                            <h4 style={{color:'#00f2ff', margin:'0 0 15px 0'}}>Oferecer Troca</h4>
                            {iAmActive ? (
                                <div style={{background: 'rgba(244, 68, 68, 0.1)', border: '1px solid #f44', padding: '15px', borderRadius: '4px', textAlign: 'center'}}>
                                    <span style={{fontSize: '24px'}}>⚔️</span>
                                    <p style={{color: '#f44', fontSize: '13px', fontWeight: 'bold', margin: '10px 0'}}>Acesso Negado</p>
                                    <p style={{color: '#ccc', fontSize: '11px', margin: 0}}>Você está atualmente em uma sessão ativa (combate/rp). As leis do mercado não permitem negociações nestas condições.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleEnviarProposta}>
                                    <div style={{marginBottom:'10px'}}>
                                        <label style={{display:'block', fontSize:'10px', color:'#aaa', marginBottom:'5px'}}>DESTINATÁRIO</label>
                                        <select className="file-input-dark" value={trocaForm.destinatarioUid} onChange={e => setTrocaForm({...trocaForm, destinatarioUid: e.target.value})} required>
                                            <option value="">-- Escolha um Aventureiro Livre --</option>
                                            {allPersonagens.filter(p => p.uid !== personagem?.uid && !isPlayerActive(p.name)).map(p => (
                                                <option key={p.uid} value={p.uid}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div style={{marginBottom:'10px'}}>
                                        <label style={{display:'block', fontSize:'10px', color:'#aaa', marginBottom:'5px'}}>SEUS ITENS DISPONÍVEIS</label>
                                        <div className="itens-troca-lista custom-scrollbar">
                                            {meuInventario.length === 0 && <p style={{color:'#666', fontSize:'12px', fontStyle:'italic'}}>Seu inventário está vazio.</p>}
                                            {meuInventario.map((item) => {
                                                const selecionado = trocaForm.itensSelecionados.find(i => i.index === item.index);
                                                return (
                                                    <div key={item.index} className="item-checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, cursor: 'pointer' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={!!selecionado}
                                                                onChange={() => toggleItemTroca(item)}
                                                            />
                                                            <span>{item.name} (Possui: {item.quantity}{item.disponivel < item.quantity ? ` | Disponível: ${item.disponivel}` : ''})</span>
                                                        </label>
                                                        {selecionado && (
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                max={selecionado.maxQuantity}
                                                                className="file-input-dark"
                                                                style={{ width: '70px', padding: '4px 6px', textAlign: 'center' }}
                                                                value={selecionado.quantidade}
                                                                onChange={e => updateItemQuantidadeTroca(item.index, e.target.value)}
                                                                title={`Quantidade a enviar (máx: ${selecionado.maxQuantity})`}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{marginBottom:'10px'}}>
                                        <label style={{display:'block', fontSize:'10px', color:'#aaa', marginBottom:'5px'}}>GIL ENVIADO (Máx: {meuGil})</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max={meuGil}
                                            className="file-input-dark"
                                            value={trocaForm.gil}
                                            onChange={e => {
                                                const parsed = parseInt(e.target.value, 10);
                                                const gil = Number.isNaN(parsed) ? 0 : Math.min(Math.max(0, parsed), meuGil);
                                                setTrocaForm({ ...trocaForm, gil });
                                            }}
                                        />
                                    </div>

                                    <div style={{marginBottom:'15px'}}>
                                        <label style={{display:'block', fontSize:'10px', color:'#aaa', marginBottom:'5px'}}>MENSAGEM (RP)</label>
                                        <textarea className="file-input-dark" style={{resize:'none', height:'60px'}} placeholder="Descreva sua oferta (opcional)..." value={trocaForm.mensagem} onChange={e => setTrocaForm({...trocaForm, mensagem: e.target.value})} />
                                    </div>
                                    <button type="submit" className="btn-save-m" style={{width:'100%', padding:'15px'}}>ENVIAR PROPOSTA</button>
                                </form>
                            )}
                        </div>

                        {/* Histórico */}
                        <div style={{flex:1, display:'flex', flexDirection:'column'}}>
                            <h4 style={{color:'#ffcc00', margin:'0 0 15px 0'}}>Meus Registros Mercantis</h4>
                            <div className="custom-scrollbar" style={{flex:1, background:'#0a0a0a', border:'1px solid #333', padding:'10px', overflowY:'auto', maxHeight:'450px'}}>
                                {minhasTrocas.length === 0 && <p style={{color:'#666', fontSize:'12px', textAlign:'center'}}>Nenhum registro encontrado.</p>}
                                {minhasTrocas.map(t => {
                                    const isSent = t.remetenteUid === personagem?.uid;
                                    const statusColor = t.status === 'aprovado' ? '#0f0' : t.status === 'recusado' ? '#f44' : '#ffcc00';
                                    const statusText = t.status === 'aprovado' ? '✓ Aprovado' : t.status === 'recusado' ? '✕ Recusado' : '⏳ Pendente';
                                    const dataHora = new Date(t.createdAt).toLocaleString('pt-BR');

                                    return (
                                        <div key={t.id} style={{background:'#111', border:'1px solid #333', padding:'10px', marginBottom:'10px', borderRadius:'4px', borderLeft:`3px solid ${isSent ? '#00f2ff' : '#a855f7'}`}}>
                                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'10px', color:'#888', marginBottom:'5px'}}>
                                                <span>{isSent ? `ENVIADO PARA: ${t.destinatario}` : `RECEBIDO DE: ${t.remetente}`}</span>
                                                <strong style={{color: statusColor}}>{statusText}</strong>
                                            </div>
                                            <p style={{margin:'2px 0', fontSize:'10px', color:'#555'}}>{dataHora}</p>
                                            <p style={{margin:'5px 0', fontSize:'12px', color:'#ccc'}}>Itens: {t.itens?.map(i => `${i.quantidade || 1}x ${i.name}`).join(', ') || 'Nenhum'}</p>
                                            <p style={{margin:'5px 0', fontSize:'12px', color:'#fcd34d'}}>Gil: {t.gil}</p>
                                            {t.mensagem && <p style={{margin:'5px 0', fontSize:'11px', color:'#aaa', fontStyle:'italic'}}>"{t.mensagem}"</p>}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* MODAL: BÊNÇÃO DOS DEUSES (JOGADOR) */}
        {showBencao && currentVttSession && (
            <div className="modal-overlay-custom" onClick={() => setShowBencao(false)}>
                <div className="modal-box-custom" onClick={e => e.stopPropagation()}>
                    <div className="modal-header-c">
                        <h3>✨ BÊNÇÃO DOS DEUSES (D100)</h3>
                        <button className="close-c" onClick={() => setShowBencao(false)}>✕</button>
                    </div>
                    <div className="bencao-player-body">
                        <p style={{ color: '#aaa', fontSize: '13px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                            Escolha seu <strong style={{ color: '#ffcc00' }}>Número do Destino</strong> (1–100) para esta sessão.
                            Se o Narrador rolar esse número no d100, você recebe a Bênção dos Deuses.
                        </p>
                        {meuNumeroDestino ? (
                            <div className="bencao-numero-salvo">
                                <span className="bencao-numero-label">SEU NÚMERO</span>
                                <span className="bencao-numero-valor">{meuNumeroDestino}</span>
                                {bencaoJaRolado && (
                                    <p className="bencao-numero-status">
                                        {(currentVttSession.bencao_deuses?.vencedores || []).includes(personagem.name)
                                            ? '✨ Os deuses escolheram você!'
                                            : 'O dado já foi rolado nesta sessão.'}
                                    </p>
                                )}
                            </div>
                        ) : bencaoJaRolado ? (
                            <p style={{ color: '#666', textAlign: 'center', fontStyle: 'italic' }}>O dado dos deuses já foi rolado. Não é possível apostar agora.</p>
                        ) : (
                            <form onSubmit={handleApostarNumero}>
                                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>NÚMERO DO DESTINO (1–100)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    className="file-input-dark"
                                    value={numeroDestino}
                                    onChange={e => setNumeroDestino(e.target.value)}
                                    placeholder="Ex: 42"
                                    required
                                    style={{ fontSize: '24px', textAlign: 'center', color: '#ffcc00', fontWeight: 'bold' }}
                                />
                                <button type="submit" className="btn-save-m" style={{ width: '100%', marginTop: '20px', padding: '15px', fontSize: '16px' }}>
                                    CRAVAR NÚMERO
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DRAGGABLE / TOUCH: ÁRVORE DE CLASSES */}
        {showClassTree && (
            <div 
                className="draggable-card fade-in" 
                style={{ position: 'absolute', top: treePos.y, left: treePos.x, zIndex: 3000, width: '700px', background: '#0d0d10', border: '2px solid #00f2ff', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.9)' }}
                onClick={e => e.stopPropagation()}
            >
                <div 
                    className="md-header" 
                    onMouseDown={handleTreeMouseDown}
                    onTouchStart={handleTreeTouchStart}
                    onTouchMove={handleTreeTouchMove}
                    onTouchEnd={handleTreeTouchEnd}
                    style={{ background: 'linear-gradient(90deg, #001a33, #000)', padding: '15px', borderBottom: '1px solid #00f2ff', cursor: 'grab', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <h3 style={{ margin: 0, color: '#00f2ff', fontFamily: 'Cinzel, serif', letterSpacing: '2px' }}>🌳 ÁRVORE DE CLASSES</h3>
                    <button onClick={() => setShowClassTree(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: '15px' }}>
                    <div className="tree-tabs-container">
                        {Object.keys(treeData).map(r => (
                            <button 
                                key={r} 
                                className={`tree-tab-btn ${treeTab === r ? 'active' : ''}`} 
                                onClick={() => setTreeTab(r)} 
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    {renderClassTree()}
                </div>
            </div>
        )}

      </div>
      <style>{`
        .jogador-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #000; font-family: 'Cinzel', serif; color: white; }
        .background-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; z-index: 0; }
        .content-layer { position: relative; z-index: 10; width: 100%; height: 100%; }
        
        .char-hud { position: absolute; top: 56px; left: 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 50px; border: 1px solid #ffcc00; z-index: 999; cursor: pointer; transition: 0.3s; }
        .avatar-circle { width: 60px; height: 60px; background: #222; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
        .hud-level { font-size: 28px; font-weight: bold; color: #ffcc00; }
        .char-info h2 { margin: 0; font-size: 20px; color: #ffcc00; text-shadow: 0 0 10px rgba(255, 204, 0, 0.5); }
        .char-meta { font-size: 12px; color: #00f2ff; }
        
        /* CONTAINER DOS BOTÕES FLUTUANTES (SOLUÇÃO DE ALINHAMENTO) */
        .hud-columns-container { position: fixed; left: 20px; bottom: 30px; display: flex; gap: 15px; align-items: flex-end; z-index: 2000; }
        .hud-col { display: flex; flex-direction: column; gap: 15px; }
        .hud-btn { width: 50px; height: 50px; border-radius: 50%; background: #000; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; font-size: 20px; box-shadow: 0 0 10px #000; position: relative; }
        .hud-btn:hover { transform: scale(1.1); }
        
        .btn-mission { border: 2px solid #ffcc00; color: #fff; }
        .btn-mission:hover { box-shadow: 0 0 15px #ffcc00; }
        .btn-sanches { border: 2px solid #00f2ff; }
        .btn-sanches:hover { box-shadow: 0 0 15px #00f2ff; }
        .btn-book { border: 2px solid #fff; color: #fff; }
        .btn-book:hover { border-color: #ffcc00; color: #ffcc00; box-shadow: 0 0 15px #fff; }
        .btn-calendar { border: 2px solid #22c55e; color: #22c55e; }
        .btn-calendar:hover { box-shadow: 0 0 15px #22c55e; color: #fff; border-color: #fff; }
        .btn-arena { border: 2px solid #a855f7; color: #a855f7; }
        .btn-arena:hover { box-shadow: 0 0 15px #a855f7; color: #fff; border-color: #fff; }
        .btn-trocas { border: 2px solid #f43f5e; color: #f43f5e; }
        .btn-trocas:hover { box-shadow: 0 0 15px #f43f5e; color: #fff; border-color: #fff; }
        .btn-tree { border: 2px solid #3b82f6; color: #3b82f6; }
        .btn-tree:hover { box-shadow: 0 0 15px #3b82f6; color: #fff; border-color: #fff; }
        
        .btn-dice { border: 2px solid #fff; background: #111; color: #fff; }
        .btn-dice:hover { border-color: #ffcc00; box-shadow: 0 0 15px #ffcc00; }
        .btn-combat { border: 2px solid #f44; background: #111; color: #f44; }
        .btn-combat:hover { border-color: #fff; color: #fff; box-shadow: 0 0 15px #f44; }
        .btn-bencao { border: 2px solid #ffcc00; color: #ffcc00; }
        .btn-bencao:hover { box-shadow: 0 0 15px #ffcc00; color: #fff; border-color: #fff; }

        .sanches-icon-face { width: 100%; height: 100%; border-radius: 50%; background-size: cover; opacity: 0.8; }
        .btn-sanches:hover .sanches-icon-face { opacity: 1; }
        .notification-badge { position: absolute; top: -2px; right: -2px; background: #f00; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; border: 1px solid #fff; font-weight: bold; font-size: 10px; z-index: 2000; box-shadow: 0 0 5px #000; }
        
        .combat-tracker-panel { position: absolute; width: 300px; max-height: 70vh; background: linear-gradient(180deg, #0d0d10 0%, #000 100%); border: 2px solid #b8860b; border-radius: 6px; z-index: 2100; display: flex; flex-direction: column; box-shadow: 0 0 25px rgba(0,0,0,0.9); }
        .tracker-header { background: #15100a; border-bottom: 2px solid #b8860b; padding: 10px; text-align: center; }
        .tracker-title { color: #ffcc00; margin: 0; font-family: 'Cinzel', serif; letter-spacing: 3px; font-size: 16px; text-shadow: 0 0 5px #ffcc00; }
        .tracker-divider { background: #1a1a1a; color: #ffcc00; font-size: 11px; font-weight: bold; text-align: center; padding: 4px; margin: 5px 0; border-top: 1px dashed #444; border-bottom: 1px dashed #444; letter-spacing: 1px; }
        .tracker-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        
        .tracker-item { display: flex; align-items: center; background: rgba(20, 20, 25, 0.9); border: 1px solid #444; border-radius: 4px; padding: 8px 5px; gap: 8px; transition: 0.2s; }
        .tracker-item.object-item { border-style: dashed; }
        .tracker-item:hover { border-color: #ffcc00; }
        .tracker-item.tracker-stealth-self { border-color: #a855f7; border-style: dashed; opacity: 0.8; box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.3); }
        .tracker-item.tracker-flying { border-color: #38bdf8; box-shadow: inset 0 0 10px rgba(56, 189, 248, 0.25); }
        .t-flying-icon { margin-left: 6px; color: #38bdf8; display: inline-flex; vertical-align: middle; filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.6)); }

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

        .monster-detail-card { width: 500px; max-width: 95vw; background: #0d0d10 url('https://www.transparenttextures.com/patterns/dark-matter.png'); border: 2px solid #b8860b; box-shadow: 0 0 50px rgba(0,0,0,0.9), inset 0 0 100px rgba(0,0,0,0.8); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; }
        .draggable-card { box-shadow: 0 10px 40px rgba(0,0,0,0.9); }
        .md-header { background: linear-gradient(90deg, #15100a, #000); padding: 15px 20px; border-bottom: 1px solid #b8860b; cursor: grab; }
        .md-header:active { cursor: grabbing; }
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
        .md-block.tips { background: rgba(0, 242, 255, 0.05); border: 1px solid rgba(0, 242, 255, 0.2); padding: 8px; border-radius: 4px; }
        .md-block.tips label { color: #00f2ff; }
        .md-block.tips p { color: #00f2ff; font-style: italic; }
        .md-close-btn { width: 100%; padding: 15px; background: #111; color: #fff; border: none; border-top: 1px solid #b8860b; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .md-close-btn:hover { background: #b8860b; color: #000; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .vtt-status-widget { position: fixed; top: 56px; right: 20px; background: rgba(0,0,0,0.9); border: 2px solid; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px; z-index: 999; width: 200px; }
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
        
        .fft-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .fft-dialog-box { position: relative; width: 800px; max-width: 95vw; height: 450px; background: linear-gradient(180deg, #001a4d 0%, #000022 100%); border: 4px solid #b8860b; border-radius: 8px; box-shadow: 0 0 30px rgba(0,0,0,0.8), inset 0 0 50px rgba(0,0,0,0.5); display: flex; align-items: flex-start; padding: 30px; gap: 20px; color: #fff; font-family: 'Cinzel', serif; }
        .fft-portrait-section { display: flex; flex-direction: column; align-items: center; gap: 10px; width: 150px; flex-shrink: 0; }
        .fft-portrait-frame { width: 140px; height: 180px; border: 3px solid #b8860b; background: #000; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.5); }
        .fft-portrait-frame img { width: 100%; height: 100%; object-fit: cover; }
        .fft-name-plate { width: 100%; background: linear-gradient(90deg, #b8860b, #8a6e14); color: #000; text-align: center; font-weight: bold; padding: 5px 0; font-size: 0.9rem; border: 1px solid #ffd700; box-shadow: 0 2px 5px rgba(0,0,0,0.5); letter-spacing: 1px; }
        .fft-content-section { flex: 1; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
        .fft-title { margin: 0 0 15px 0; font-size: 1.8rem; color: #00f2ff; text-shadow: 0 0 5px rgba(0, 242, 255, 0.5); border-bottom: 1px solid #b8860b; padding-bottom: 10px; letter-spacing: 1px; }
        .fft-scroll-text { flex: 1; overflow-y: auto; font-family: 'Lato', sans-serif; font-size: 1.1rem; line-height: 1.6; color: #e0e0e0; padding-right: 10px; scrollbar-width: none; -ms-overflow-style: none; }
        .fft-scroll-text::-webkit-scrollbar { display: none; }
        .fft-close-btn { position: absolute; top: -15px; right: -15px; width: 40px; height: 40px; background: #b8860b; color: #000; font-weight: bold; border: 2px solid #fff; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-family: sans-serif; box-shadow: 0 0 10px #000; transition: 0.2s; }
        .fft-close-btn:hover { background: #ffd700; transform: scale(1.1); }

        .levelup-global-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 200000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .levelup-content { text-align: center; animation: zoomIn 0.5s ease-out; }
        .levelup-title { font-family: 'Cinzel', serif; font-size: 80px; font-weight: bold; color: #ffcc00; text-transform: uppercase; letter-spacing: 10px; margin: 0 0 30px 0; text-shadow: 3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 20px #ffcc00, 0 0 40px #ffcc00; animation: pulseText 1.5s infinite alternate; }
        .levelup-confirm-btn { background: linear-gradient(to bottom, #b8860b, #8a6e14); border: 2px solid #fff; color: #000; font-family: 'Cinzel', serif; font-size: 18px; font-weight: bold; padding: 10px 40px; cursor: pointer; box-shadow: 0 0 15px #ffcc00; transition: 0.2s; border-radius: 50px; }
        .levelup-confirm-btn:hover { transform: scale(1.1); background: #ffd700; color: #000; box-shadow: 0 0 30px #ffd700; }
        @keyframes zoomIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .team-chat-panel { position: absolute; width: 320px; height: 420px; background: rgba(10, 10, 12, 0.95); border: 2px solid var(--team-color, #a855f7); border-radius: 8px; display: flex; flex-direction: column; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px); overflow: hidden; }
        .chat-header { background: rgba(20, 20, 25, 0.9); border-bottom: 2px solid var(--team-color, #a855f7); padding: 10px 15px; display: flex; justify-content: space-between; align-items: center; }
        .chat-header h3 { margin: 0; font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 1px; color: var(--team-color, #fff); text-shadow: 0 0 8px var(--team-color-alpha, rgba(168, 85, 247, 0.4)); }
        .chat-header-actions button { background: none; border: none; color: #fff; cursor: pointer; font-size: 14px; opacity: 0.7; transition: 0.2s; margin-left: 10px; }
        .chat-header-actions button:hover { opacity: 1; }
        .chat-messages-container { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        .chat-message-bubble { display: flex; gap: 8px; max-width: 85%; }
        .chat-message-bubble.me { align-self: flex-end; flex-direction: row-reverse; }
        .chat-message-bubble.other { align-self: flex-start; }
        .chat-avatar-mini { width: 32px; height: 32px; border-radius: 50%; background-size: cover; background-position: center; border: 1px solid #555; box-shadow: 0 2px 4px rgba(0,0,0,0.5); flex-shrink: 0; }
        .chat-avatar-mini-default { width: 32px; height: 32px; border-radius: 50%; background: #444; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 1px solid #555; flex-shrink: 0; }
        .chat-bubble-content { background: rgba(30, 30, 35, 0.95); border: 1px solid #333; border-radius: 8px; padding: 6px 10px; display: flex; flex-direction: column; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
        .chat-message-bubble.me .chat-bubble-content { background: var(--team-color-faded, rgba(168, 85, 247, 0.2)); border-color: var(--team-color, #a855f7); }
        .chat-sender-name { font-size: 9px; font-weight: bold; color: #ffcc00; margin-bottom: 2px; }
        .chat-message-text { font-size: 12px; color: #e2e8f0; line-height: 1.4; word-break: break-word; font-family: sans-serif; }
        .chat-message-time { font-size: 8px; color: #888; align-self: flex-end; margin-top: 3px; }
        .chat-input-area { padding: 10px; background: #0d0d10; border-top: 1px solid #222; display: flex; gap: 8px; }
        .chat-input-field { flex: 1; background: #181820; border: 1px solid #444; border-radius: 20px; padding: 6px 14px; color: #fff; font-size: 12px; outline: none; font-family: sans-serif; transition: 0.2s; }
        .chat-input-field:focus { border-color: var(--team-color, #a855f7); box-shadow: 0 0 5px var(--team-color-alpha, rgba(168, 85, 247, 0.3)); }
        .chat-send-btn { background: var(--team-color, #a855f7); color: #fff; border: none; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 14px; transition: 0.2s; }
        .chat-send-btn:hover { transform: scale(1.1); box-shadow: 0 0 8px var(--team-color, #a855f7); }

        /* MODAIS GERAIS (INCLUÍDO PARA CONSERTAR O DE TROCAS E DE BÊNÇÃO) */
        .modal-overlay-custom { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .modal-box-custom { background: #080808; border: 2px solid #ffcc00; padding: 25px; border-radius: 8px; width: 500px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; box-shadow: 0 0 30px #000; }
        .modal-box-custom.wide { width: 800px; }
        .modal-header-c { display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; align-items: center; }
        .modal-header-c h3 { margin: 0; color: #ffcc00; }
        .close-c { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        .file-input-dark { background: #111; color: #fff; border: 1px solid #444; padding: 10px; width: 100%; border-radius: 4px; }
        .btn-save-m { background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; border-radius: 4px; }
        .btn-save-m:hover { background: #fff; box-shadow: 0 0 10px #ffcc00; }

        .bencao-highlight { animation: flashGold 1.5s infinite alternate; border: 2px solid #ffcc00 !important; box-shadow: 0 0 15px #ffcc00; }
        @keyframes flashGold { 0% { filter: brightness(1); box-shadow: 0 0 5px #ffcc00; } 100% { filter: brightness(1.5); box-shadow: 0 0 25px #ffcc00; } }
        .t-bencao-icon { margin-left: 6px; font-size: 14px; filter: drop-shadow(0 0 4px #ffcc00); }

        .bencao-roll-flash { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; pointer-events: none; background: rgba(0,0,0,0.75); animation: bencaoFlashBg 4s ease-out forwards; }
        .bencao-roll-flash-inner { display: flex; flex-direction: column; align-items: center; text-align: center; animation: bencaoFlashPop 4s ease-out forwards; }
        .bencao-flash-label { font-family: 'Cinzel', serif; font-size: clamp(18px, 4vw, 32px); color: #ffcc00; letter-spacing: 6px; text-transform: uppercase; text-shadow: 0 0 20px #ffcc00; margin-bottom: 10px; }
        .bencao-flash-number { font-family: 'Cinzel', serif; font-size: clamp(80px, 20vw, 160px); font-weight: bold; color: #ffcc00; line-height: 1; text-shadow: 0 0 40px #ffcc00, 0 0 80px rgba(255,204,0,0.5); }
        .bencao-flash-winners { font-family: 'Cinzel', serif; font-size: clamp(14px, 3vw, 24px); color: #0f0; margin-top: 15px; letter-spacing: 2px; text-shadow: 0 0 10px #0f0; }
        @keyframes bencaoFlashBg { 0% { opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes bencaoFlashPop { 0% { transform: scale(0.5); opacity: 0; } 10% { transform: scale(1.1); opacity: 1; } 80% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.05); opacity: 0; } }

        .bencao-player-body { padding: 5px 0; }
        .bencao-numero-salvo { text-align: center; background: rgba(255,204,0,0.08); border: 2px solid #ffcc00; border-radius: 8px; padding: 30px 20px; }
        .bencao-numero-label { display: block; font-size: 11px; color: #aaa; letter-spacing: 3px; margin-bottom: 10px; }
        .bencao-numero-valor { display: block; font-family: 'Cinzel', serif; font-size: 72px; color: #ffcc00; font-weight: bold; text-shadow: 0 0 20px #ffcc00; }
        .bencao-numero-status { margin: 15px 0 0 0; font-size: 14px; color: #0f0; font-weight: bold; }

        .itens-troca-lista { background: #000; border: 1px solid #444; padding: 10px; max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; border-radius: 4px; }
        .item-checkbox-label { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #ccc; cursor: pointer; }
        .item-checkbox-label input { accent-color: #00f2ff; transform: scale(1.2); }

        /* NOVA ÁRVORE DE CLASSES */
        .tree-tabs-container { display: flex; gap: 10px; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; overflow-x: auto; scrollbar-width: thin; }
        .tree-tab-btn { background: transparent; border: none; color: #888; font-weight: bold; font-size: 12px; text-transform: uppercase; cursor: pointer; padding-bottom: 5px; border-bottom: 2px solid transparent; white-space: nowrap; transition: 0.2s; }
        .tree-tab-btn:hover { color: #ccc; }
        .tree-tab-btn.active { color: #00f2ff; border-bottom-color: #00f2ff; }
        
        .tree-container { display: flex; flex-direction: column; gap: 20px; max-height: 60vh; overflow-y: auto; padding-right: 10px; }
        .tree-line { background: rgba(0,0,0,0.4); border: 1px solid #222; padding: 20px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }
        .tree-paths { display: flex; gap: 30px; margin-top: 15px; width: 100%; justify-content: center; position: relative; }
        .tree-path { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; }
        
        .fc-node { padding: 10px 15px; border-radius: 6px; font-weight: bold; text-align: center; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; min-width: 140px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .fc-node.base { background: #1f2937; border: 2px solid #3b82f6; color: #fff; }
        .fc-node.adv { background: #111827; border: 2px solid #fbbf24; color: #fbbf24; }
        .fc-node.max { background: #000; border: 2px solid #f44; color: #f44; box-shadow: 0 0 15px rgba(244, 68, 68, 0.4); }
        .fc-node.special { background: #3b0764; border: 2px solid #a855f7; color: #e9d5ff; }
        .fc-node.legendary { background: #020617; border: 2px solid #00f2ff; color: #00f2ff; box-shadow: 0 0 15px #00f2ff; }
        .fc-arrow { color: #555; font-size: 16px; font-weight: bold; }
        
        .guild-btn-float { top: auto !important; left: auto !important; transform: none !important; bottom: 30px !important; right: 110px !important; z-index: 2000 !important; }
      `}</style>

      <WallpaperPicker
        wallpapers={JOGADOR_WALLPAPERS}
        current={wallpaper}
        onChange={setWallpaper}
        storageKey="jogador_wallpaper"
        side="right"
        bottom={30}
        sideOffset={170}
      />
    </div>
  );
}