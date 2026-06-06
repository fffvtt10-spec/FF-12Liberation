import React, { useState, useEffect, useRef } from 'react';
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
import Forja from '../components/Forja';
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
    ...sessoes.map(s => ({ ...s, type: 'session', dateObj: new Date(s.dataInicio) }))
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
                className={`cal-event-pill ${ev.type}`} 
                onClick={(e) => { e.stopPropagation(); setViewEvent(ev); }}
                title={ev.type === 'session' ? ev.missaoNome : 'Disponível'}
              >
                {ev.dateObj.getHours()}:{String(ev.dateObj.getMinutes()).padStart(2,'0')} {ev.type === 'session' ? '⚔️' : '✅'}
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
                            <h4 style={{color: '#f44'}}>⚔️ SESSÃO AGENDADA</h4>
                            <h3>{viewEvent.missaoNome}</h3>
                            <p><strong>Horário:</strong> {new Date(viewEvent.dataInicio).toLocaleString()}</p>
                            <p><strong>Narrador:</strong> {viewEvent.mestreNome}</p>
                            <div className="detail-players">
                                <strong>Jogadores:</strong>
                                {viewEvent.participantes?.join(', ') || "Nenhum"}
                            </div>
                        </>
                    ) : (
                        <>
                            <h4 style={{color: '#0f0'}}>✅ HORÁRIO DISPONÍVEL</h4>
                            <p><strong>Data:</strong> {new Date(viewEvent.start).toLocaleString()}</p>
                            <p>O Mestre está livre neste horário.</p>
                        </>
                    )}
                    <button className="btn-cancelar-main" style={{marginTop:'10px', width:'100%'}} onClick={() => setViewEvent(null)}>FECHAR</button>
                </div>
            </div>
        )}
      </div>
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

const IconTabletop = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>);
const IconDice = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 7v10l10 5 10-5V7" /><path d="M12 22V12" /></svg>);
const IconScenery = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>);
const IconNPC = () => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>);


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

  // Wallpaper state
  const [wallpaper, setWallpaper] = useState(() => {
    const saved = localStorage.getItem('jogador_wallpaper');
    return saved || fundoJogador;
  });
  
  // Arenas Disponíveis para Inscrição
  const [arenasDisponiveis, setArenasDisponiveis] = useState([]);
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [showArenaDetails, setShowArenaDetails] = useState(null);

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
  const [bencaoVencedorAtivo, setBencaoVencedorAtivo] = useState(false);

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
    let unsubChar = () => {}; let unsubMissoes = () => {}; let unsubDisp = () => {}; let unsubArenas = () => {}; let unsubAllChars = () => {};
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

            unsubMissoes = onSnapshot(qMissoes, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            unsubDisp = onSnapshot(qDisp, (snap) => setDisponibilidades(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            unsubArenas = onSnapshot(qArenas, (snap) => setArenasDisponiveis(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            unsubAllChars = onSnapshot(qAllChars, (snap) => setAllPersonagens(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

        } else { setLoading(false); navigate('/login'); }
    });
    return () => { unsubscribeAuth(); unsubChar(); unsubMissoes(); unsubDisp(); unsubArenas(); unsubAllChars(); };
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
  }, [personagem?.name, currentVttSession?.id]); 

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

  // --- ESCUTAR MERCADO DE TROCAS ---
  useEffect(() => {
      if (!currentVttSession || !personagem) return;
      const qMercado = query(collection(db, "sessoes", currentVttSession.id, "mercado_lanternas"));
      const unsubMercado = onSnapshot(qMercado, mercSnap => {
          const allTrocas = mercSnap.docs.map(d => ({id: d.id, ...d.data()}));
          setMinhasTrocas(allTrocas.filter(t => t.remetenteUid === personagem.uid || t.destinatarioUid === personagem.uid));
      });
      return () => unsubMercado();
  }, [currentVttSession?.id, personagem?.uid]);

  // --- CHECK VITÓRIA BÊNÇÃO ---
  useEffect(() => {
      if(currentVttSession?.bencao_deuses?.active && currentVttSession.bencao_deuses.vencedores?.includes(personagem?.name)) {
          setBencaoVencedorAtivo(true);
          const t = setTimeout(() => setBencaoVencedorAtivo(false), 5000); 
          return () => clearTimeout(t);
      }
  }, [currentVttSession?.bencao_deuses?.timestamp, personagem?.name, currentVttSession?.bencao_deuses?.active, currentVttSession?.bencao_deuses?.vencedores]);

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

  // --- HANDLERS TROCAS (JOGADOR) ---
  const toggleItemTroca = (slot) => {
      setTrocaForm(prev => {
          const isSelected = prev.itensSelecionados.find(i => i.slot_id === slot.slot_id);
          if (isSelected) {
              return { ...prev, itensSelecionados: prev.itensSelecionados.filter(i => i.slot_id !== slot.slot_id) };
          } else {
              return { ...prev, itensSelecionados: [...prev.itensSelecionados, slot] };
          }
      });
  };

  const handleEnviarProposta = async (e) => {
      e.preventDefault();
      if(!currentVttSession || !personagem || !trocaForm.destinatarioUid) return alert("Selecione o destinatário da troca.");
      
      const target = allPersonagens.find(p => p.uid === trocaForm.destinatarioUid);
      if (!target) return alert("Destinatário não encontrado.");
      
      const itensFormatados = trocaForm.itensSelecionados.map(i => ({ 
          name: i.item_name, 
          quantidade: 1, 
          slot_id: i.slot_id,
          effect: i.effect || ''
      }));

      try {
          await addDoc(collection(db, "sessoes", currentVttSession.id, "mercado_lanternas"), {
              remetenteUid: personagem.uid,
              remetente: personagem.name,
              destinatarioUid: target.uid,
              destinatario: target.name,
              itens: itensFormatados, 
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
      if(!currentVttSession || !personagem || !numeroDestino) return;
      try {
          await updateDoc(doc(db, "sessoes", currentVttSession.id), {
              [`bencao_deuses.numeros_escolhidos.${personagem.name}`]: Number(numeroDestino)
          });
          alert(`Número ${numeroDestino} cravado! Os deuses o observam.`);
      } catch(err) { alert("Erro ao apostar: " + err.message); }
  };

  // --- HANDLERS ARRASTAR MOUSE/TOUCH (TREE, CHAT, TRACKER, DETAILS) ---
  const startDragTree = (clientX, clientY) => {
      setIsDraggingTree(true);
      setDragOffsetTree({ x: clientX - treePos.x, y: clientY - treePos.y });
  };
  const onDragMoveTree = (clientX, clientY) => {
      if (!isDraggingTree) return;
      setTreePos({ x: clientX - dragOffsetTree.x, y: clientY - dragOffsetTree.y });
  };
  
  const handleTreeMouseDown = (e) => startDragTree(e.clientX, e.clientY);
  const handleTreeMouseMove = (e) => onDragMoveTree(e.clientX, e.clientY);
  const handleTreeMouseUp = () => setIsDraggingTree(false);

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

  // --- LOGICA E LISTENERS DO CHAT DE EQUIPE (PVP) ---
  const myTeam = currentVttSession?.pvp_mode && currentVttSession?.equipes?.find(eq => eq.membros.includes(personagem?.name));
  const showTeamChat = vttStatus === 'connected' && currentVttSession?.pvp_mode && myTeam;

  useEffect(() => {
    if (!showTeamChat || !myTeam) {
      setChatMessages([]);
      setUnreadChatMessages(0);
      return;
    }

    const messagesQuery = query(
      collection(db, "sessoes", currentVttSession.id, "team_chats", myTeam.id.toString(), "messages"),
      orderBy("createdAt", "asc")
    );

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

  // --- HELPER: BUSCAR COR DO TIME NO MODO PVP ---
  const getTeamColor = (tokenName) => {
      if (!currentVttSession || !currentVttSession.equipes) return null;
      for (let eq of currentVttSession.equipes) {
          if (eq.membros.includes(tokenName)) return eq.cor;
      }
      return null;
  };

  // --- RENDER ÁRVORE VISUAL ELEGANTE (FLEXBOX/GLASS PANEL) ---
  const renderClassTree = () => {
      if (treeTab === 'Bangaa') {
          return (
              <div className="modern-tree-flow">
                  <div className="tree-branch">
                      <div className="tree-node base">Guerreiro</div><div className="tree-arrow">➔</div>
                      <div className="tree-col">
                          <div className="tree-row"><div className="tree-node adv">Gladiador</div><div className="tree-arrow">➔</div><div className="tree-node max">Viking</div></div>
                          <div className="tree-row"><div className="tree-node adv">Lanceiro</div><div className="tree-arrow">➔</div><div className="tree-node max">Bangalor</div></div>
                      </div>
                  </div>
                  <div className="tree-divider"></div>
                  <div className="tree-branch">
                      <div className="tree-node base">Monge</div><div className="tree-arrow">➔</div>
                      <div className="tree-col">
                          <div className="tree-row"><div className="tree-node adv">Artista Marcial</div><div className="tree-arrow">➔</div><div className="tree-node max">Mestre Artes</div></div>
                          <div className="tree-row"><div className="tree-node adv">Lutador Rua</div><div className="tree-arrow">➔</div><div className="tree-node max">Brutamontes</div></div>
                      </div>
                  </div>
                  <div className="tree-divider"></div>
                  <div className="tree-branch">
                      <div className="tree-node legend">Cavaleiro Dragão</div><div className="tree-arrow">➔</div><div className="tree-node legend" style={{borderColor:'#f44', color:'#fff'}}>Dragonslayer</div>
                  </div>
              </div>
          );
      }
      if (treeTab === 'Elvaan') {
          return (
              <div className="modern-tree-flow">
                  <div className="tree-branch">
                      <div className="tree-node base">Soldado</div><div className="tree-arrow">➔</div>
                      <div className="tree-col">
                          <div className="tree-row"><div className="tree-node adv">Paladino</div><div className="tree-arrow">➔</div><div className="tree-node max">Templário</div></div>
                          <div className="tree-row"><div className="tree-node adv">Lâminas Mágicas</div><div className="tree-arrow">➔</div><div className="tree-node max">Saber</div></div>
                      </div>
                  </div>
                  <div className="tree-divider"></div>
                  <div className="tree-branch">
                      <div className="tree-node base">Espadachim</div><div className="tree-arrow">➔</div>
                      <div className="tree-col">
                          <div className="tree-row"><div className="tree-node adv">Duelista</div><div className="tree-arrow">➔</div><div className="tree-node max">Ronin</div></div>
                          <div className="tree-row"><div className="tree-node adv" style={{opacity:0.5}}>Lâminas Mágicas</div><div className="tree-arrow" style={{opacity:0.5}}>➔</div><div className="tree-node max" style={{opacity:0.5}}>Saber</div></div>
                      </div>
                  </div>
              </div>
          );
      }
      if (treeTab === 'Viera') {
          return (
              <div className="modern-tree-flow">
                  <div className="tree-branch"><div className="tree-node base">Arqueira</div><div className="tree-arrow">➔</div><div className="tree-node adv">Caçadora</div><div className="tree-arrow">➔</div><div className="tree-node max">Patrulheira</div></div>
                  <div className="tree-divider"></div>
                  <div className="tree-branch">
                      <div className="tree-node base">Curandeiro</div><div className="tree-arrow">➔</div>
                      <div className="tree-col">
                          <div className="tree-row"><div className="tree-node adv">Espiritualista</div><div className="tree-arrow">➔</div><div className="tree-node max">Tecelã</div></div>
                          <div className="tree-row"><div className="tree-node adv">Maga Vermelha</div><div className="tree-arrow">➔</div><div className="tree-node max">Spellblade</div></div>
                      </div>
                  </div>
                  <div className="tree-divider"></div>
                  <div className="tree-branch">
                      <div className="tree-node base">Esgrimista</div><div className="tree-arrow">➔</div>
                      <div className="tree-col">
                          <div className="tree-row"><div className="tree-node adv" style={{opacity:0.5}}>Maga Vermelha</div><div className="tree-arrow" style={{opacity:0.5}}>➔</div><div className="tree-node max" style={{opacity:0.5}}>Spellblade</div></div>
                          <div className="tree-row"><div className="tree-node adv">Floretista</div><div className="tree-arrow">➔</div><div className="tree-node max">Mosqueteira</div></div>
                      </div>
                  </div>
                  <div className="tree-divider"></div>
                  <div className="tree-branch"><div className="tree-node legend">Exilado</div><div className="tree-arrow">➔</div><div className="tree-node adv">Mercenário</div><div className="tree-arrow">➔</div><div className="tree-node legend" style={{borderColor:'#f44', color:'#fff'}}>Mestre Armas</div></div>
              </div>
          );
      }
      return null;
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
      </div>
    );
  }

  if (!personagem) return <div className="loading-screen">Nenhum personagem encontrado.</div>;

  const isBencaoWinner = currentVttSession?.bencao_deuses?.vencedores?.includes(personagem?.name);
  const meuInventario = personagem?.character_sheet?.inventory?.slots?.filter(s => s && s.item_name && s.item_name.trim() !== '') || [];
  const meuGil = personagem?.character_sheet?.inventory?.gil || 0;

  return (
    <div className="jogador-container" onMouseMove={handleWindowMouseMove} onMouseUp={handleWindowMouseUp}>
      <div className="background-layer" style={{ backgroundImage: `url(${wallpaper})` }} />
      
      {bencaoVencedorAtivo && (
          <div className="bencao-victory-overlay">
              <div className="bencao-victory-box">
                  <h2>OS DEUSES SORRIEM PARA VOCÊ!</h2>
                  <p>O Narrador rolou o seu Número do Destino ({numeroDestino}).</p>
                  <p className="subtext">Você recebeu a Bênção dos Deuses nesta sessão!</p>
              </div>
          </div>
      )}

      <div className="content-layer">

        <div className={`char-hud clickable-hud ${isBencaoWinner ? 'bencao-highlight' : ''}`} onClick={() => setShowFicha(true)} title="Abrir Ficha">
          <div className="char-avatar"><div className="avatar-circle"><span className="hud-level">{personagem.character_sheet?.basic_info?.level || 1}</span></div></div>
          <div className="char-info"><h2 className="char-name">{personagem.name}</h2><span className="char-meta">{personagem.race} // {personagem.class}</span></div>
        </div>

        {currentVttSession && currentVttSession.active_map && (
            <Tabletop sessaoData={currentVttSession} isMaster={false} currentUserUid={auth.currentUser?.uid} personagensData={allPersonagens} />
        )}

        <SceneryViewer sessaoData={currentVttSession} isMaster={false} />
        <NPCViewer sessaoData={currentVttSession} isMaster={false} />
        {rollResult && <DiceResult rollData={rollResult} onClose={() => { dismissedRollTimestamp.current = rollResult.id || rollResult.timestamp; setRollResult(null); }} />}
        {showDiceSelector && currentVttSession && <DiceSelector sessaoId={currentVttSession.id} playerName={personagem.name} onClose={() => setShowDiceSelector(false)} />}
        
        {/* --- COMBAT TRACKER COM LÓGICA DE FURTIVIDADE PVP E CORES DO TIME --- */}
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
                        
                        // LÓGICA DE VISIBILIDADE (INCLUI FURTIVIDADE)
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

                        // LÓGICA DE HP PARA TODOS OS JOGADORES (E NÃO APENAS O SEU)
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

                        // --- ADICIONA A COR DO TIME NA BORDA SE O MODO PVP ESTIVER ATIVADO ---
                        const teamColor = isPvP ? getTeamColor(token.name) : null;
                        const customBorder = teamColor ? { borderLeft: `4px solid ${teamColor}` } : {};

                        return (
                            <div 
                                key={token.id} 
                                className={`tracker-item readonly ${isMyStealth ? 'tracker-stealth-self' : ''}`}
                                style={customBorder}
                            >
                                <div className="t-col-img">
                                    <div className="t-index">{token.originalIndex + 1}</div>
                                    <div className="t-img" style={{backgroundImage: `url(${imgUrl})`, backgroundPosition: `${token.imgX||50}% ${token.imgY||50}%`}}></div>
                                </div>
                                <div className="t-col-info">
                                    <div className="t-name" style={teamColor ? {color: teamColor} : {}}>{token.name}</div>
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
        
        {/* --- DOCK DE FERRAMENTAS CENTRALIZADO E LIMPO --- */}
        <div className="dm-tools-dock">
            <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowMissionModal(true)}>📜</button><div className="tool-label">MISSÕES E CONTRATOS</div></div>
            <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowCalendar(true)}>📅</button><div className="tool-label">AGENDA DE SESSÕES</div></div>
            <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowArenaModal(true)}>⚔️</button><div className="tool-label">ARENAS PVP</div></div>
            
            {resenhas.length > 0 && (
                <div className="tool-group">
                    <button className="tool-btn-placeholder" onClick={handleOpenSanches} style={{position: 'relative', overflow: 'hidden'}}>
                        <div className="sanches-icon-face" style={{backgroundImage: `url(${sanchezImg})`}}></div>
                        {unreadResenhas > 0 && <span className="notification-badge">{unreadResenhas}</span>}
                    </button>
                    <div className="tool-label">RESENHAS DO SANCHES</div>
                </div>
            )}

            <div className="tool-group"><Bazar isMestre={false} playerData={personagem} vttDock={true} /><div className="tool-label">BAZAR DE ITENS</div></div>
            <div className="tool-group"><Forja vttDock={true} /><div className="tool-label">FORJA MÁGICA</div></div>
            <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => window.open('https://www.canva.com/design/DAGpzszHsc4/NcbQ19hsr4grzm9aotQFtw/edit?utm_content=DAGpzszHsc4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', '_blank')}><IconBook /></button><div className="tool-label">LIVRO OFICIAL</div></div>
            
            {/* NOVAS FERRAMENTAS QUEUE 01 (VISÍVEIS SEMPRE, MAS COM REGRAS) */}
            <div className="tool-group">
                <button className="tool-btn-placeholder" onClick={() => setShowClassTree(true)}>🌳</button>
                <div className="tool-label">ÁRVORE DE CLASSES</div>
            </div>
            
            {currentVttSession && (
                <>
                    <div className="tool-group">
                        <button className="tool-btn-placeholder" onClick={() => setShowTrocas(true)} style={{position: 'relative', borderColor: '#a855f7', color: '#a855f7'}}>
                            🏮
                            {minhasTrocas.filter(t=>t.status==='pendente_mestre' && t.remetenteUid===personagem?.uid).length > 0 && <span className="notification-badge">!</span>}
                        </button>
                        <div className="tool-label">SISTEMA DE TROCAS</div>
                    </div>

                    <div className="tool-group">
                        <button className={`tool-btn-placeholder ${isBencaoWinner ? 'bencao-highlight' : ''}`} onClick={() => setShowBencao(true)} style={{borderColor: '#ffcc00', color: '#ffcc00'}}>
                            ✨
                        </button>
                        <div className="tool-label">BÊNÇÃO DOS DEUSES</div>
                    </div>
                    
                    <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowCombatTracker(!showCombatTracker)}><CombatIcon /></button><div className="tool-label">COMBATE</div></div>
                    <div className="tool-group"><button className="tool-btn-placeholder" onClick={() => setShowDiceSelector(true)}><IconDice /></button><div className="tool-label">ROLAR DADOS</div></div>
                </>
            )}
        </div>

        <GuildBoard isMaster={false} />

        {showCalendar && (
          <CalendarSystemPlayer 
            onClose={() => setShowCalendar(false)} 
            disponibilidades={disponibilidades}
            sessoes={allSessoes} 
          />
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

        {showTeamChat && chatOpen && (
            <div 
                className="team-chat-panel fade-in"
                style={{ 
                    top: chatPos.y, 
                    left: chatPos.x, 
                    zIndex: 2100,
                    '--team-color': myTeam.cor || '#a855f7',
                    '--team-color-alpha': `${myTeam.cor || '#a855f7'}66`,
                    '--team-color-faded': `${myTeam.cor || '#a855f7'}22`
                }}
            >
                <div 
                    className="chat-header"
                    onMouseDown={handleChatMouseDown}
                    style={{ cursor: 'grab' }}
                >
                    <h3>💬 CHAT: {myTeam.nome}</h3>
                    <div className="chat-header-actions">
                        <button 
                            type="button" 
                            onClick={() => {
                                setChatOpen(false);
                                setLastOpenedChat(Date.now());
                                setUnreadChatMessages(0);
                            }}
                            title="Minimizar"
                        >
                            ➖
                        </button>
                    </div>
                </div>
                
                <div className="chat-messages-container custom-scrollbar">
                    {chatMessages.map((msg) => {
                        const isMe = msg.senderUid === auth.currentUser?.uid;
                        const senderChar = allPersonagens.find(p => p.name === msg.senderName);
                        const avatarUrl = senderChar?.character_sheet?.imgUrl || '';

                        let timeStr = "";
                        if (msg.createdAt) {
                            const date = msg.createdAt.toDate();
                            timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } else {
                            timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }

                        return (
                            <div key={msg.id} className={`chat-message-bubble ${isMe ? 'me' : 'other'}`}>
                                {avatarUrl ? (
                                    <div 
                                        className="chat-avatar-mini" 
                                        style={{ backgroundImage: `url(${avatarUrl})` }}
                                        title={msg.senderName}
                                    />
                                ) : (
                                    <div className="chat-avatar-mini-default" title={msg.senderName}>
                                        {msg.senderName ? msg.senderName.substring(0, 2).toUpperCase() : '?'}
                                    </div>
                                )}
                                <div className="chat-bubble-content">
                                    {!isMe && <span className="chat-sender-name">{msg.senderName}</span>}
                                    <span className="chat-message-text">{msg.content}</span>
                                    <span className="chat-message-time">{timeStr}</span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>
                
                <form className="chat-input-area" onSubmit={handleSendChatMessage}>
                    <input 
                        type="text" 
                        className="chat-input-field" 
                        placeholder="Mensagem para equipe..." 
                        value={chatInputText}
                        onChange={(e) => setChatInputText(e.target.value)}
                    />
                    <button type="submit" className="chat-send-btn">➤</button>
                </form>
            </div>
        )}

        {/* --- MODAIS QUEUE 01 (REFINADOS) --- */}

        {/* 1. MODAL: SISTEMA DE TROCAS */}
        {showTrocas && currentVttSession && (
            <div className="glass-modal-overlay" onClick={() => setShowTrocas(false)}>
                <div className="glass-modal-box wide" onClick={e => e.stopPropagation()}>
                    <div className="glass-modal-header">
                        <h3>🏮 SISTEMA DE TROCAS E OFERTAS</h3>
                        <button className="glass-close-btn" onClick={() => setShowTrocas(false)}>✕</button>
                    </div>
                    
                    <div className="glass-split-layout">
                        
                        {/* Nova Proposta */}
                        <div className="glass-section">
                            <h4 className="glass-section-title">Oferecer Itens para Aventureiro</h4>
                            <form onSubmit={handleEnviarProposta}>
                                <div className="glass-input-group">
                                    <label>Aventureiro Destinatário</label>
                                    <select className="glass-input" value={trocaForm.destinatarioUid} onChange={e => setTrocaForm({...trocaForm, destinatarioUid: e.target.value})} required>
                                        <option value="">-- Selecione o Alvo --</option>
                                        {/* Agora lista todos os jogadores logados na sessão atual (exceto o próprio jogador) */}
                                        {allPersonagens.filter(p => p.uid !== personagem?.uid && currentVttSession?.participantes?.includes(p.name)).map(p => (
                                            <option key={p.uid} value={p.uid}>{p.name} ({p.class})</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="glass-input-group">
                                    <label>Itens da Sua Mochila</label>
                                    <div className="glass-inventory-list custom-scrollbar">
                                        {meuInventario.length === 0 && <p className="glass-empty-text">A sua mochila está vazia. Não há nada para ofertar.</p>}
                                        {meuInventario.map(slot => (
                                            <label key={slot.slot_id} className="glass-checkbox-row">
                                                <input type="checkbox" checked={!!trocaForm.itensSelecionados.find(i => i.slot_id === slot.slot_id)} onChange={() => toggleItemTroca(slot)} />
                                                <span>{slot.item_name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="glass-input-group">
                                    <label>Ofertar Gil (Máximo na Ficha: {meuGil} Gil)</label>
                                    <input type="number" min="0" max={meuGil} className="glass-input" placeholder="0" value={trocaForm.gil} onChange={e => setTrocaForm({...trocaForm, gil: Number(e.target.value)})} />
                                </div>

                                <div className="glass-input-group">
                                    <label>Mensagem de Roleplay (Opcional)</label>
                                    <textarea className="glass-input" rows="3" placeholder="O que você diz ao entregar os itens?" value={trocaForm.mensagem} onChange={e => setTrocaForm({...trocaForm, mensagem: e.target.value})} />
                                </div>
                                <button type="submit" className="glass-btn-primary">ENVIAR PROPOSTA</button>
                            </form>
                        </div>

                        {/* Histórico */}
                        <div className="glass-section">
                            <h4 className="glass-section-title" style={{color: '#ffcc00'}}>Meu Livro-Caixa (Histórico)</h4>
                            <div className="glass-history-list custom-scrollbar">
                                {minhasTrocas.length === 0 && <p className="glass-empty-text">Nenhuma movimentação comercial registrada nesta sessão.</p>}
                                {minhasTrocas.map(t => {
                                    const isSent = t.remetenteUid === personagem?.uid;
                                    const statusColor = t.status === 'aprovado' ? '#22c55e' : t.status === 'recusado' ? '#ef4444' : '#fbbf24';
                                    const statusText = t.status === 'aprovado' ? '✓ Transação Aprovada' : t.status === 'recusado' ? '✕ Transação Recusada' : '⏳ Aguardando Mestre';
                                    return (
                                        <div key={t.id} className={`glass-history-card ${isSent ? 'sent' : 'received'}`}>
                                            <div className="gh-header">
                                                <span>{isSent ? `Enviado para: ${t.destinatario}` : `Recebido de: ${t.remetente}`}</span>
                                                <strong style={{color: statusColor}}>{statusText}</strong>
                                            </div>
                                            <div className="gh-body">
                                                <p><strong>Itens:</strong> {t.itens?.length > 0 ? t.itens.map(i => i.name).join(', ') : 'Nenhum'}</p>
                                                <p><strong>Gil Envolvido:</strong> {t.gil} moedas</p>
                                                {t.mensagem && <p className="gh-msg">"{t.mensagem}"</p>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* 2. MODAL: BÊNÇÃO DOS DEUSES */}
        {showBencao && currentVttSession && (
            <div className="glass-modal-overlay" onClick={() => setShowBencao(false)}>
                <div className="glass-modal-box compact" onClick={e => e.stopPropagation()}>
                    <div className="glass-modal-header" style={{borderBottomColor: '#fbbf24'}}>
                        <h3 style={{color: '#fbbf24'}}>✨ BÊNÇÃO DOS DEUSES (D100)</h3>
                        <button className="glass-close-btn" onClick={() => setShowBencao(false)}>✕</button>
                    </div>
                    <div className="glass-bencao-body">
                        <p>
                            Os Deuses o observam... Escolha o seu <strong>Número do Destino</strong> (entre 1 e 100).
                            Se o Mestre rolar este número na Mesa, a Bênção será derramada sobre você nesta sessão!
                        </p>
                        
                        <form onSubmit={handleApostarNumero} className="glass-bencao-form">
                            <input 
                                type="number" min="1" max="100" required
                                className="glass-huge-input"
                                placeholder="00"
                                value={numeroDestino} onChange={e => setNumeroDestino(e.target.value)}
                            />
                            <button type="submit" className="glass-btn-gold">REGISTRAR DESTINO</button>
                        </form>
                        
                        <div className="glass-bencao-status">
                            <label>Sua aposta atual com os Deuses:</label>
                            <span>{currentVttSession?.bencao_deuses?.numeros_escolhidos?.[personagem?.name] || "Nenhum"}</span>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 3. MODAL: ÁRVORE DE CLASSES */}
        {showClassTree && (
            <div 
                className="draggable-card fade-in" 
                style={{ position: 'absolute', top: treePos.y, left: treePos.x, zIndex: 3000, width: '700px', maxWidth: '95vw' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="glass-modal-box huge" style={{margin: 0, height: 'auto', border: '2px solid #00f2ff'}}>
                    <div 
                        className="glass-modal-header drag-handle" 
                        onMouseDown={handleTreeMouseDown} onTouchStart={handleTreeTouchStart}
                        onTouchMove={handleTreeTouchMove} onTouchEnd={handleTreeTouchEnd}
                    >
                        <h3>🌳 PROGRESSÃO DE CLASSES (VOCAÇÕES)</h3>
                        <button className="glass-close-btn" onClick={() => setShowClassTree(false)}>✕</button>
                    </div>
                    
                    <div className="glass-tree-tabs">
                        {['Bangaa', 'Elvaan', 'Viera'].map(r => (
                            <button key={r} className={treeTab === r ? 'active' : ''} onClick={() => setTreeTab(r)}>{r}</button>
                        ))}
                    </div>
                    
                    <div className="glass-tree-content custom-scrollbar">
                        {renderClassTree()}
                    </div>
                </div>
            </div>
        )}

      </div>
      <style>{`
        /* --- ESTILOS PRINCIPAIS DO JOGADOR --- */
        .jogador-container { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: #000; font-family: 'Cinzel', serif; color: white; }
        .background-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; z-index: 0; }
        .content-layer { position: relative; z-index: 10; width: 100%; height: 100%; }
        
        .char-hud { position: absolute; top: 20px; left: 20px; display: flex; align-items: center; gap: 15px; background: rgba(0,0,0,0.8); padding: 15px 25px; border-radius: 50px; border: 1px solid #ffcc00; z-index: 999; cursor: pointer; transition: 0.3s; }
        .avatar-circle { width: 60px; height: 60px; background: #222; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; }
        .hud-level { font-size: 28px; font-weight: bold; color: #ffcc00; }
        .char-info h2 { margin: 0; font-size: 20px; color: #ffcc00; text-shadow: 0 0 10px rgba(255, 204, 0, 0.5); }
        .char-meta { font-size: 12px; color: #00f2ff; }
        
        /* DOCK DE FERRAMENTAS CENTRALIZADO, LIMPO E ALINHADO */
        .dm-tools-dock { position: absolute; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 12px; z-index: 2000; align-items: flex-end; }
        .tool-group { display: flex; align-items: center; gap: 10px; flex-direction: row-reverse; }
        .tool-label { background: rgba(0,0,0,0.8); padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #fff; border: 1px solid #444; opacity: 0; transition: 0.2s; pointer-events: none; transform: translateX(10px); }
        .tool-group:hover .tool-label { opacity: 1; transform: translateX(0); border-color: #00f2ff; color: #00f2ff; }
        
        .tool-btn-placeholder { 
            width: 50px; height: 50px; border-radius: 50%; background: rgba(10,15,30, 0.9); 
            border: 2px solid #fff; color: #fff; font-size: 20px; cursor: pointer; 
            display: flex; align-items: center; justify-content: center; 
            transition: 0.2s; box-shadow: 0 0 10px rgba(0,0,0,0.8); backdrop-filter: blur(5px);
        }
        .tool-btn-placeholder:hover { border-color: #00f2ff; color: #00f2ff; transform: scale(1.1); box-shadow: 0 0 15px rgba(0,242,255, 0.5); }
        .sanches-icon-face { width: 100%; height: 100%; border-radius: 50%; background-size: cover; background-position: center; opacity: 0.9; }
        
        .notification-badge { position: absolute; top: -5px; right: -5px; background: #ef4444; color: #fff; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border: 2px solid #000; z-index: 10; box-shadow: 0 0 8px #ef4444; }

        /* DESTAQUE BÊNÇÃO E OVERLAY */
        .bencao-highlight { animation: flashGold 1.5s infinite alternate; border: 2px solid #ffcc00 !important; box-shadow: 0 0 15px #ffcc00; }
        @keyframes flashGold { 0% { filter: brightness(1); box-shadow: 0 0 5px #ffcc00; } 100% { filter: brightness(1.5); box-shadow: 0 0 25px #ffcc00; } }
        .bencao-victory-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(255, 204, 0, 0.15); z-index: 10000; display: flex; align-items: center; justify-content: center; pointer-events: none; animation: flashScreen 0.5s ease-out; }
        .bencao-victory-box { background: rgba(0,0,0,0.9); border: 3px solid #ffcc00; box-shadow: 0 0 50px #ffcc00; padding: 40px; text-align: center; border-radius: 10px; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: auto; }
        .bencao-victory-box h2 { color: #ffcc00; font-size: 30px; margin: 0 0 10px 0; text-shadow: 0 0 10px #ffcc00; }
        .bencao-victory-box p { color: #fff; font-size: 18px; margin: 5px 0; }
        .bencao-victory-box .subtext { color: #0f0; font-weight: bold; margin-top: 15px; }

        /* --- GLASS PANEL SYSTEM (MODAIS REFINADOS) --- */
        .glass-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); z-index: 99999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .glass-modal-box { background: rgba(10, 15, 30, 0.85); border: 1px solid rgba(0, 242, 255, 0.3); box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 20px rgba(0, 242, 255, 0.05); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; animation: zoomIn 0.2s ease-out; }
        .glass-modal-box.wide { width: 900px; max-width: 95vw; height: 600px; max-height: 90vh; }
        .glass-modal-box.compact { width: 450px; max-width: 90vw; }
        .glass-modal-box.huge { width: 100%; height: 100%; }

        .glass-modal-header { padding: 20px 25px; border-bottom: 1px solid rgba(0, 242, 255, 0.2); display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.4); }
        .drag-handle { cursor: grab; } .drag-handle:active { cursor: grabbing; }
        .glass-modal-header h3 { margin: 0; color: #00f2ff; font-size: 1.2rem; letter-spacing: 2px; text-shadow: 0 0 8px rgba(0, 242, 255, 0.4); }
        .glass-close-btn { background: transparent; border: none; color: #94a3b8; font-size: 24px; cursor: pointer; transition: 0.2s; }
        .glass-close-btn:hover { color: #f44; transform: scale(1.1); }

        .glass-split-layout { display: flex; flex: 1; overflow: hidden; }
        .glass-section { flex: 1; padding: 25px; display: flex; flex-direction: column; overflow-y: auto; }
        .glass-section:first-child { border-right: 1px solid rgba(0, 242, 255, 0.1); background: rgba(255,255,255,0.02); }
        .glass-section-title { margin: 0 0 20px 0; color: #e2e8f0; font-size: 1rem; border-bottom: 1px solid #334155; padding-bottom: 8px; }

        .glass-input-group { margin-bottom: 15px; }
        .glass-input-group label { display: block; font-size: 11px; color: #94a3b8; font-weight: bold; margin-bottom: 6px; text-transform: uppercase; }
        .glass-input { width: 100%; background: rgba(0,0,0,0.5); border: 1px solid #334155; color: #fff; padding: 12px; border-radius: 6px; outline: none; transition: 0.2s; font-family: 'Lato', sans-serif; }
        .glass-input:focus { border-color: #00f2ff; box-shadow: 0 0 10px rgba(0,242,255,0.2); }

        .glass-inventory-list { background: rgba(0,0,0,0.5); border: 1px solid #334155; border-radius: 6px; padding: 10px; max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .glass-empty-text { font-size: 12px; color: #64748b; font-style: italic; text-align: center; margin: 10px 0; }
        .glass-checkbox-row { display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 6px; border-radius: 4px; transition: 0.2s; }
        .glass-checkbox-row:hover { background: rgba(255,255,255,0.05); }
        .glass-checkbox-row input { accent-color: #00f2ff; transform: scale(1.2); }
        .glass-checkbox-row span { font-size: 13px; color: #e2e8f0; }

        .glass-btn-primary { width: 100%; background: linear-gradient(90deg, #00f2ff, #0284c7); color: #000; font-weight: bold; padding: 15px; border: none; border-radius: 6px; font-family: 'Cinzel', serif; letter-spacing: 1px; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 15px rgba(0,242,255,0.3); }
        .glass-btn-primary:hover { filter: brightness(1.2); transform: translateY(-2px); }

        .glass-history-list { display: flex; flex-direction: column; gap: 12px; }
        .glass-history-card { background: rgba(0,0,0,0.6); border: 1px solid #334155; border-radius: 8px; padding: 15px; position: relative; overflow: hidden; }
        .glass-history-card::before { content: ''; position: absolute; left: 0; top: 0; width: 4px; height: 100%; }
        .glass-history-card.sent::before { background: #00f2ff; }
        .glass-history-card.received::before { background: #a855f7; }
        .gh-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; color: #94a3b8; }
        .gh-body p { margin: 4px 0; font-size: 13px; color: #cbd5e1; }
        .gh-msg { font-style: italic; color: #fbbf24 !important; border-left: 2px solid #fbbf24; padding-left: 8px; margin-top: 8px !important; }

        .glass-bencao-body { padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .glass-bencao-body p { color: #cbd5e1; text-align: center; line-height: 1.5; margin: 0; }
        .glass-bencao-form { display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%; }
        .glass-huge-input { background: rgba(0,0,0,0.8); color: #fbbf24; border: 2px solid #fbbf24; border-radius: 12px; font-size: 48px; text-align: center; width: 120px; height: 100px; outline: none; font-weight: bold; text-shadow: 0 0 15px #fbbf24; box-shadow: inset 0 0 20px rgba(251,191,36,0.2); }
        .glass-btn-gold { background: linear-gradient(90deg, #fbbf24, #d97706); color: #000; font-weight: bold; border: none; padding: 15px 30px; border-radius: 50px; font-family: 'Cinzel', serif; letter-spacing: 2px; cursor: pointer; transition: 0.2s; box-shadow: 0 0 20px rgba(251,191,36,0.4); }
        .glass-btn-gold:hover { transform: scale(1.05); filter: brightness(1.2); }
        .glass-bencao-status { background: rgba(0,0,0,0.5); padding: 15px; border-radius: 8px; border: 1px solid #334155; width: 100%; text-align: center; display: flex; flex-direction: column; gap: 5px; }
        .glass-bencao-status label { color: #94a3b8; font-size: 12px; text-transform: uppercase; }
        .glass-bencao-status span { color: #00f2ff; font-size: 24px; font-weight: bold; }

        .glass-tree-tabs { display: flex; padding: 0 25px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.3); }
        .glass-tree-tabs button { flex: 1; background: transparent; border: none; color: #64748b; font-family: 'Cinzel', serif; font-size: 14px; font-weight: bold; padding: 15px 0; cursor: pointer; transition: 0.2s; border-bottom: 3px solid transparent; }
        .glass-tree-tabs button:hover { color: #e2e8f0; }
        .glass-tree-tabs button.active { color: #00f2ff; border-bottom-color: #00f2ff; text-shadow: 0 0 10px rgba(0,242,255,0.5); }
        .glass-tree-content { padding: 30px; flex: 1; overflow: auto; display: flex; justify-content: center; }

        /* NOVA ÁRVORE DE CLASSES (FLEXBOX DESIGN) */
        .modern-tree-flow { display: flex; flex-direction: column; gap: 30px; width: 100%; align-items: flex-start; }
        .tree-branch { display: flex; align-items: center; width: 100%; }
        .tree-col { display: flex; flex-direction: column; gap: 15px; }
        .tree-row { display: flex; align-items: center; }
        .tree-node { padding: 12px 20px; border-radius: 8px; font-family: 'Cinzel', serif; font-weight: bold; font-size: 13px; text-align: center; min-width: 140px; text-transform: uppercase; letter-spacing: 1px; backdrop-filter: blur(4px); }
        .tree-node.base { background: rgba(30, 58, 138, 0.6); border: 2px solid #3b82f6; color: #fff; box-shadow: 0 0 15px rgba(59,130,246,0.3); }
        .tree-node.adv { background: rgba(184, 134, 11, 0.6); border: 2px solid #fbbf24; color: #fbbf24; }
        .tree-node.max { background: rgba(220, 38, 38, 0.6); border: 2px solid #ef4444; color: #ef4444; box-shadow: 0 0 15px rgba(239,68,68,0.5); }
        .tree-node.legend { background: rgba(147, 51, 234, 0.6); border: 2px solid #a855f7; color: #e9d5ff; box-shadow: 0 0 20px rgba(168,85,247,0.6); }
        .tree-arrow { color: #475569; font-size: 20px; font-weight: bold; margin: 0 15px; }
        .tree-divider { width: 100%; height: 1px; background: rgba(255,255,255,0.1); }

        /* OUTROS ESTILOS JÁ EXISTENTES */
        .session-status-top { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); border: 1px solid #00f2ff; padding: 5px 20px; border-radius: 20px; display: flex; align-items: center; gap: 10px; z-index: 40; transition: 0.3s; }
        .session-status-top.pvp-active { border-color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.4); }
        .status-indicator { width: 10px; height: 10px; border-radius: 50%; animation: pulse 2s infinite; }
        .status-indicator.active { background: #00f2ff; box-shadow: 0 0 10px #00f2ff; }
        .status-indicator.offline { background: #f44; box-shadow: 0 0 10px #f44; animation: none; }
        .status-info h2 { margin: 0; font-size: 14px; color: #fff; }
        .status-info p { margin: 0; font-size: 10px; color: #aaa; }
        .pvp-active .status-info p { color: #c4b5fd; }

        .dm-players-sidebar { position: absolute; top: 20px; left: 20px; width: 200px; background: rgba(0, 10, 20, 0.95); border: 2px solid #00f2ff; border-radius: 8px; padding: 10px; z-index: 50; max-height: 80vh; display: flex; flex-direction: column; }
        .sidebar-title { color: #00f2ff; font-size: 12px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 10px; text-align: center; }
        .players-list-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .mini-player-card { display: flex; align-items: center; padding: 5px; background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 4px; transition: 0.2s; }
        .mini-player-card.online { border-left: 3px solid #00f2ff; }
        .mini-avatar { position: relative; margin-right: 8px; }
        .avatar-img, .avatar-placeholder { width: 30px; height: 30px; border-radius: 50%; background-size: cover; border: 1px solid #fff; }
        .avatar-placeholder { background: #222; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; position: absolute; bottom: 0; right: 0; border: 1px solid #000; }
        .status-dot.green { background: #00f2ff; } .status-dot.gray { background: #666; }
        .p-name { font-size: 11px; font-weight: bold; display: block; }
        .p-lvl { font-size: 9px; color: #ffcc00; }

        .combat-tracker-panel { 
            position: absolute; 
            width: 300px; 
            max-height: 70vh; 
            background: linear-gradient(180deg, #0d0d10 0%, #000 100%);
            border: 2px solid #b8860b; 
            border-radius: 6px; 
            z-index: 2100; 
            display: flex; flex-direction: column; 
            box-shadow: 0 0 25px rgba(0,0,0,0.9);
        }
        .tracker-header { background: #15100a; border-bottom: 2px solid #b8860b; padding: 10px; text-align: center; }
        .tracker-title { color: #ffcc00; margin: 0; font-family: 'Cinzel', serif; letter-spacing: 3px; font-size: 16px; text-shadow: 0 0 5px #ffcc00; }
        .tracker-divider { background: #1a1a1a; color: #ffcc00; font-size: 11px; font-weight: bold; text-align: center; padding: 4px; margin: 5px 0; border-top: 1px dashed #444; border-bottom: 1px dashed #444; letter-spacing: 1px; }
        .tracker-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        
        .tracker-item { display: flex; align-items: center; background: rgba(20, 20, 25, 0.9); border: 1px solid #444; border-radius: 4px; padding: 8px 5px; gap: 8px; transition: 0.2s; }
        .tracker-item.object-item { border-style: dashed; }
        .tracker-item:hover { border-color: #ffcc00; }
        
        .tracker-item.tracker-stealth-self { border-color: #a855f7; border-style: dashed; opacity: 0.8; box-shadow: inset 0 0 10px rgba(168, 85, 247, 0.3); }

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
        .md-close-btn { width: 100%; padding: 15px; background: #111; color: #fff; border: none; border-top: 1px solid #b8860b; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .md-close-btn:hover { background: #b8860b; color: #000; }

        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }

        .vtt-status-widget { position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.9); border: 2px solid; padding: 15px; border-radius: 8px; display: flex; align-items: center; gap: 15px; z-index: 999; width: 200px; }
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

        .fft-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        
        .fft-dialog-box {
          position: relative;
          width: 800px;
          max-width: 95vw;
          height: 450px;
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

        .levelup-global-overlay {
            position: fixed;
            top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.8);
            z-index: 200000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
        }

        .levelup-content {
            text-align: center;
            animation: zoomIn 0.5s ease-out;
        }

        .levelup-title {
            font-family: 'Cinzel', serif;
            font-size: 80px;
            font-weight: bold;
            color: #ffcc00;
            text-transform: uppercase;
            letter-spacing: 10px;
            margin: 0 0 30px 0;
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
        @keyframes pulseText { from { text-shadow: 0 0 20px #ffcc00; } to { text-shadow: 0 0 40px #ffcc00, 0 0 10px #fff; } }
        
        .guild-btn-float {
            top: auto !important;
            left: auto !important;
            transform: none !important;
            bottom: 30px !important;
            right: 110px !important; 
            z-index: 2000 !important;
        }

        /* --- RESPONSIVIDADE ADICIONADA --- */
        @media (max-width: 850px) {
            .player-dashboard-grid { grid-template-columns: 1fr; }
            .top-bar-flex { flex-direction: column; gap: 15px; text-align: center; }
            .char-identity-box { width: 100%; justify-content: center; }
            .ff-modal-compact { width: 95vw; max-height: 90vh; padding: 15px; }
            .missions-grid-compact { grid-template-columns: 1fr; }
            .mc-right { flex-direction: column; gap: 5px; align-items: stretch; }
            .ff-modal-details-wide { width: 95vw; height: auto; max-height: 90vh; }
            .detail-wide-header { flex-direction: column; height: auto; padding: 15px; text-align: center; gap: 10px; }
            .dw-vagas-box { align-items: center; width: 100%; }
            .detail-wide-body { flex-direction: column; overflow-y: auto; }
            .dw-col-left { width: 100%; border-right: none; border-bottom: 1px solid #333; overflow-y: visible; }
            .dw-col-right { width: 100%; padding: 15px; overflow-y: visible; }
            .detail-wide-body > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
            .fft-dialog-box { flex-direction: column; height: auto; max-height: 90vh; align-items: center; padding: 20px; }
            .fft-portrait-section { width: 100px; }
            .fft-portrait-frame { width: 100px; height: 130px; }
            .fft-title { font-size: 1.4rem; text-align: center; }
        }

        /* --- TEAM CHAT STYLES --- */
        .floating-team-chat-btn { 
            position: fixed; bottom: 450px; left: 15px; width: 50px; height: 50px; border-radius: 50%; 
            background: #000; color: #fff; font-size: 20px; cursor: pointer; z-index: 2000; 
            display: flex; align-items: center; justify-content: center; transition: 0.3s; 
        }
        .floating-team-chat-btn:hover { transform: scale(1.1); }
        .team-chat-panel {
            position: absolute; width: 320px; height: 420px; background: rgba(10, 10, 12, 0.95);
            border: 2px solid var(--team-color, #a855f7); border-radius: 8px; display: flex;
            flex-direction: column; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8); backdrop-filter: blur(10px); overflow: hidden;
        }
        .chat-header {
            background: rgba(20, 20, 25, 0.9); border-bottom: 2px solid var(--team-color, #a855f7);
            padding: 10px 15px; display: flex; justify-content: space-between; align-items: center;
        }
        .chat-header h3 {
            margin: 0; font-family: 'Cinzel', serif; font-size: 13px; letter-spacing: 1px; color: var(--team-color, #fff);
            text-shadow: 0 0 8px var(--team-color-alpha, rgba(168, 85, 247, 0.4));
        }
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
      `}</style>

      <WallpaperPicker
        wallpapers={JOGADOR_WALLPAPERS}
        current={wallpaper}
        onChange={setWallpaper}
        storageKey="jogador_wallpaper"
        side="left"
        bottom={30}
        sideOffset={22}
      />
    </div>
  );
}