import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { db, auth } from '../firebase';
import { doc, updateDoc, onSnapshot, collection, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom';
import {
  subscribeVTTLibrary,
  migrateLegacyData,
  addLibraryItem,
  updateLibraryItem,
  deleteLibraryItem,
  VTT_TYPES,
} from '../services/vttLibrary';
import fundoMestre from '../assets/fundo-mestre.jpg';
import fundoJogador from '../assets/fundo-jogador.jpg';
import fundoJogador1 from '../assets/fundo-jogador1.jpeg';
import fundoJogador2 from '../assets/fundo-jogador2.jpeg';
import fundoJogador3 from '../assets/fundo-jogador3.jpeg';
import fundoJogador4 from '../assets/fundo-jogador4.jpeg';
import chocoboGif from '../assets/chocobo-loading.gif';
import WallpaperPicker from '../components/WallpaperPicker';
import Ficha from '../components/Ficha';
import Bazar from '../components/Bazar';
import Forja from '../components/Forja';
import Tabletop from '../components/Tabletop'; 
import SceneryViewer from '../components/SceneryViewer'; 
import NPCViewer from '../components/NPCViewer'; 
import DmOrbitalMenu from '../components/DmOrbitalMenu';
import { DiceSelector } from '../components/DiceSystem';
import { Dice3DResult } from '../components/Dice3DResult'; 
import AnnouncementManager from '../components/AnnouncementManager';
import { IconTabletop, IconDice, IconCombat, IconBook, IconFolder, IconLantern, IconSparkle, IconMegaphone } from '../components/VttIcons';
import { dismissRoll, getRollId, shouldOpenRollOverlay } from '../utils/dismissedRolls';
import { createInitialRollTracker, syncRollTracker, readRollTrackerSnapshot, commitRollTracker } from '../utils/rollTracker';

// --- ÍCONES DE STATUS NEGATIVOS (FONT AWESOME - 100% ESTÁVEL PARA VERCEL) ---
import { FaBolt, FaIcicles, FaEyeSlash, FaVolumeMute, FaFire, FaLock, FaBan, FaSkull, FaFlask, FaTint, FaFeather } from 'react-icons/fa';

const STATUS_EFFECTS = [
    { id: 'Paralisado', icon: <FaBolt />, color: '#ffdd00' },
    { id: 'Congelado', icon: <FaIcicles />, color: '#00ffff' },
    { id: 'Cego', icon: <FaEyeSlash />, color: '#aaaaaa' },
    { id: 'Silêncio', icon: <FaVolumeMute />, color: '#dddddd' },
    { id: 'Queimado', icon: <FaFire />, color: '#ff4400' },
    { id: 'Imobilizado', icon: <FaLock />, color: '#888888' },
    { id: 'Desabilitado', icon: <FaBan />, color: '#ff8800' },
    { id: 'Condenado', icon: <FaSkull />, color: '#ff0000' },
    { id: 'Envenenado', icon: <FaFlask />, color: '#00ff00' },
    { id: 'Sangramento', icon: <FaTint />, color: '#dc2626' }
];

const MESTRE_WALLPAPERS = [
  { label: 'Padrão',      src: fundoMestre   },
  { label: 'Wallpaper 2', src: fundoJogador  },
  { label: 'Wallpaper 3', src: fundoJogador1 },
  { label: 'Wallpaper 4', src: fundoJogador2 },
  { label: 'Wallpaper 5', src: fundoJogador3 },
  { label: 'Wallpaper 6', src: fundoJogador4 },
];

export default function MestreVTTPage() {
  const navigate = useNavigate();
  
  // Wallpaper state
  const [wallpaper, setWallpaper] = useState(() => {
    const saved = localStorage.getItem('mestre_wallpaper');
    return saved || fundoMestre;
  });

  // Estados Principais
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [loading, setLoading] = useState(true); 
  const [personagensData, setPersonagensData] = useState([]);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [selectedFicha, setSelectedFicha] = useState(null);
  
  // Modais & hubs agrupados
  const [orbitalOpen, setOrbitalOpen] = useState(false);
  const [showMesaHub, setShowMesaHub] = useState(false);
  const [mesaTab, setMesaTab] = useState('tabletop');
  const [showEconomiaHub, setShowEconomiaHub] = useState(false);
  const [economiaTab, setEconomiaTab] = useState('mercado');
  const [bazarOpen, setBazarOpen] = useState(false);
  const [forjaOpen, setForjaOpen] = useState(false);
  const [showCombatTracker, setShowCombatTracker] = useState(false);
  const [trocasPendentes, setTrocasPendentes] = useState([]);
  const [showBencaoManager, setShowBencaoManager] = useState(false);
  const [showAnnouncementManager, setShowAnnouncementManager] = useState(false);
  const [bencaoFlash, setBencaoFlash] = useState(false);
  const lastBencaoTsRef = useRef(null);
  
  // Biblioteca VTT global (mapas, cenários, NPCs, monstros, objetos)
  const [vttLibrary, setVttLibrary] = useState([]);
  const [showLibraryManager, setShowLibraryManager] = useState(false);
  const [libraryTab, setLibraryTab] = useState(VTT_TYPES.MAP);
  const [uploadMapUrl, setUploadMapUrl] = useState("");
  const [uploadMapName, setUploadMapName] = useState("");

  const [viewMonsterDetails, setViewMonsterDetails] = useState(null);
  const [activeStatusMenu, setActiveStatusMenu] = useState(null); // ID do token com o menu de status aberto

  // Estados Tracker Drag
  const [trackerPos, setTrackerPos] = useState({ x: 280, y: 100 });
  const [isDraggingTracker, setIsDraggingTracker] = useState(false);
  const [dragOffsetTracker, setDragOffsetTracker] = useState({ x: 0, y: 0 });

  // Estados Monster Details Drag
  const [detailsPos, setDetailsPos] = useState({ x: 620, y: 100 });
  const [isDraggingDetails, setIsDraggingDetails] = useState(false);
  const [dragOffsetDetails, setDragOffsetDetails] = useState({ x: 0, y: 0 });

  // Token Highlight
  const [highlightTokenId, setHighlightTokenId] = useState(null);

  // Estados Criação e Edição Bestiário
  const [editingToken, setEditingToken] = useState(null);
  const [monsterForm, setMonsterForm] = useState({
      name: '', img: '', stars: 1, difficultyQ: false, 
      hpCurrent: 10, hpMax: 10, mpCurrent: 10, mpMax: 10,
      xp: 0, drops: '', tips: '', description: '', visibleBars: false
  });
  const [creatingMonsterStep, setCreatingMonsterStep] = useState('list');
  const [editingLibraryId, setEditingLibraryId] = useState(null);

  const [allCharacters, setAllCharacters] = useState([]);
  const [showDiceSelector, setShowDiceSelector] = useState(false);
  const [rollResult, setRollResult] = useState(null); 
  const rollTrackerRef = useRef(createInitialRollTracker());
  
  const sessaoRef = useRef(null);

  useEffect(() => { sessaoRef.current = sessaoAtiva; }, [sessaoAtiva]);

  // Loading Timer
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => { setMinTimeElapsed(true); }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    migrateLegacyData().catch(console.error);
    const unsubLib = subscribeVTTLibrary(setVttLibrary);
    return () => unsubLib();
  }, []);

  // Auth & Data Sync
  useEffect(() => {
    let unsubSession = () => {};
    let unsubTrocas = () => {};
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
            // Aceitando permissões multi-mestre (sem where restrito a apenas "user.uid" como criador, 
            // basta ser uma sessão ativa). Como MestreVTTPage é acessada pós-login, pegaremos a mais recente 
            // ou a marcada como ativa baseada no Firestore. (Ajuste multi-mestre)
            const q = query(collection(db, "sessoes"));
            unsubSession = onSnapshot(q, (snap) => {
              const sessoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              const agora = new Date();
              const minhasSessoesAtivas = sessoes
                .filter(s => s.mestreId === user.uid && agora <= new Date(s.expiraEm))
                .sort((a, b) => {
                  if (a.dm_online && !b.dm_online) return -1;
                  if (!a.dm_online && b.dm_online) return 1;
                  return new Date(b.dataInicio || 0) - new Date(a.dataInicio || 0);
                });
              const ativa = minhasSessoesAtivas[0] || null;
              if (ativa) {
                setSessaoAtiva(ativa);
                setConnectedPlayers(ativa.connected_players || []); 
                if (ativa.latest_roll) {
                     const roll = ativa.latest_roll;
                     syncRollTracker(rollTrackerRef, ativa.id);
                     const trackerSnap = readRollTrackerSnapshot(rollTrackerRef);
                     if (shouldOpenRollOverlay({
                       roll,
                       sessaoId: ativa.id,
                       uid: auth.currentUser?.uid,
                       ...trackerSnap,
                     })) {
                       setRollResult(roll);
                     }
                     commitRollTracker(rollTrackerRef, roll);
                }

                // Listener do Mercado dos Lanternas (Aprovações do Mestre)
                const qTrocas = query(collection(db, "sessoes", ativa.id, "mercado_lanternas"), where("status", "==", "pendente_mestre"));
                unsubTrocas = onSnapshot(qTrocas, (trocasSnap) => {
                    setTrocasPendentes(trocasSnap.docs.map(tDoc => ({id: tDoc.id, ...tDoc.data()})));
                });
              } else {
                setSessaoAtiva(null);
                setConnectedPlayers([]);
              }
              setLoading(false); 
            });
        } else { setLoading(false); navigate('/login'); }
    });
    return () => { unsubscribeAuth(); unsubSession(); unsubTrocas(); };
  }, [navigate]); 

  useEffect(() => {
      const bencao = sessaoAtiva?.bencao_deuses;
      if (!bencao?.timestamp || !bencao?.vencedores?.length) return;
      if (lastBencaoTsRef.current === bencao.timestamp) return;
      lastBencaoTsRef.current = bencao.timestamp;
      setBencaoFlash(true);
      const t = setTimeout(() => setBencaoFlash(false), 4000);
      return () => clearTimeout(t);
  }, [sessaoAtiva?.bencao_deuses?.timestamp, sessaoAtiva?.bencao_deuses?.vencedores]);

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

  useEffect(() => {
    if (!showEconomiaHub) {
      setBazarOpen(false);
      setForjaOpen(false);
      return;
    }
    setBazarOpen(economiaTab === 'bazar');
    setForjaOpen(economiaTab === 'forja');
  }, [showEconomiaHub, economiaTab]);

  const resetUploadForm = () => {
    setUploadMapUrl("");
    setUploadMapName("");
  };

  const resetMonsterForm = () => {
    setMonsterForm({
      name: '', img: '', stars: 1, difficultyQ: false,
      hpCurrent: 10, hpMax: 10, mpCurrent: 10, mpMax: 10,
      xp: 0, drops: '', tips: '', description: '', visibleBars: false
    });
    setEditingLibraryId(null);
  };

  const openLibrary = (tab = VTT_TYPES.MAP) => {
    setLibraryTab(tab);
    setCreatingMonsterStep('list');
    resetMonsterForm();
    setShowLibraryManager(true);
  };

  const closeLibrary = () => {
    setShowLibraryManager(false);
    resetUploadForm();
    setCreatingMonsterStep('list');
    resetMonsterForm();
  };

  const clearActiveSessionMedia = async (item) => {
    if (!sessaoAtiva) return;
    const updates = {};
    if (item.type === VTT_TYPES.MAP && sessaoAtiva.active_map?.url === item.url) updates.active_map = null;
    if (item.type === VTT_TYPES.SCENERY && sessaoAtiva.active_scenery?.url === item.url) updates.active_scenery = null;
    if (item.type === VTT_TYPES.NPC && sessaoAtiva.active_npc?.url === item.url) updates.active_npc = null;
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), updates);
    }
  };

  const handleAddToLibrary = async (e) => {
    e.preventDefault();
    if (!uploadMapUrl) return;

    const defaultNames = {
      [VTT_TYPES.MAP]: uploadMapName || "Novo Mapa VTT",
      [VTT_TYPES.SCENERY]: uploadMapName || "Novo Cenário",
      [VTT_TYPES.NPC]: uploadMapName || "Novo NPC",
    };

    try {
      const jaExiste = vttLibrary.some((item) => item.type === libraryTab && (item.url || item.img) === uploadMapUrl);
      if (jaExiste) return alert("Este item já está na biblioteca global.");

      await addLibraryItem({
        type: libraryTab,
        name: defaultNames[libraryTab] || "Sem nome",
        url: uploadMapUrl,
      });
      resetUploadForm();
      alert("Item adicionado à biblioteca global!");
    } catch (err) {
      alert("Erro ao salvar na biblioteca: " + err.message);
    }
  };

  const handleDeleteLibraryItem = async (item) => {
    if (!window.confirm(`Excluir "${item.name}" da biblioteca global?`)) return;
    try {
      await clearActiveSessionMedia(item);
      await deleteLibraryItem(item.id);
    } catch (err) {
      alert("Erro ao excluir: " + err.message);
    }
  };

  const handleUpdateMapItem = async (id, updates) => {
    await updateLibraryItem(id, updates);
  };

  // --- HANDLERS DO MERCADO DOS LANTERNAS ---
  const handleAprovarTroca = async (troca) => {
    try {
        await updateDoc(doc(db, "sessoes", sessaoAtiva.id, "mercado_lanternas", troca.id), {
            status: 'aprovado',
            dataAprovacao: new Date().toISOString()
        });
        alert("Troca autorizada! Os itens e recursos foram movimentados.");
    } catch(e) {
        alert("Erro ao aprovar troca: " + e.message);
    }
  };
  
  const handleRecusarTroca = async (troca) => {
    try {
        await updateDoc(doc(db, "sessoes", sessaoAtiva.id, "mercado_lanternas", troca.id), {
            status: 'recusado',
            dataRecusa: new Date().toISOString()
        });
        alert("Troca recusada!");
    } catch(e) {
        alert("Erro ao recusar troca: " + e.message);
    }
  };

  // --- HANDLER DO DdD (BÊNÇÃO DOS DEUSES) ---
  const handleRolarDdD = async () => {
    if (!sessaoAtiva) return;
    const resultado = Math.floor(Math.random() * 100) + 1;
    const numeros = sessaoAtiva.bencao_deuses?.numeros_escolhidos || {};
    const vencedores = [];
    
    Object.entries(numeros).forEach(([nome, num]) => {
        if (Number(num) === resultado) vencedores.push(nome);
    });

    try {
        await updateDoc(doc(db, "sessoes", sessaoAtiva.id), {
            bencao_deuses: {
                active: true,
                numeros_escolhidos: numeros,
                resultado_d100: resultado,
                vencedores: vencedores,
                buff_ativo: [...vencedores],
                timestamp: Date.now()
            }
        });
    } catch(e) { console.error("Erro ao rolar DdD", e); }
  };

  const handleRemoverBuffSinalizacao = async (playerName) => {
      if (!sessaoAtiva) return;
      const buffAtivo = (sessaoAtiva.bencao_deuses?.buff_ativo || sessaoAtiva.bencao_deuses?.vencedores || []).filter(n => n !== playerName);
      try {
          await updateDoc(doc(db, "sessoes", sessaoAtiva.id), {
              bencao_deuses: {
                  ...(sessaoAtiva.bencao_deuses || {}),
                  buff_ativo: buffAtivo
              }
          });
      } catch (e) { console.error("Erro ao remover buff", e); }
  };

  // Handler Piscar Token no VTT
  const blinkToken = (id) => {
      setHighlightTokenId(id);
      setTimeout(() => setHighlightTokenId(null), 3000); 
  };

  const handleEditMonster = (item) => {
    setMonsterForm({
      name: item.name || '',
      img: item.img || item.url || '',
      stars: item.stars ?? 1,
      difficultyQ: item.difficultyQ ?? false,
      hpCurrent: item.hpCurrent ?? item.hpMax ?? 10,
      hpMax: item.hpMax ?? 10,
      mpCurrent: item.mpCurrent ?? item.mpMax ?? 10,
      mpMax: item.mpMax ?? 10,
      xp: item.xp ?? 0,
      drops: item.drops || '',
      tips: item.tips || '',
      description: item.description || '',
      visibleBars: item.visibleBars ?? false,
    });
    setEditingLibraryId(item.id);
    setCreatingMonsterStep('create');
  };

  const handleSaveMonster = async () => {
      if (!monsterForm.name?.trim()) return alert("Informe o nome.");
      if (!monsterForm.img?.trim()) return alert("Informe a URL da imagem.");
      try {
          const type = libraryTab === VTT_TYPES.OBJECT ? VTT_TYPES.OBJECT : VTT_TYPES.MONSTER;
          const payload = {
              ...monsterForm,
              type,
              category: type === VTT_TYPES.OBJECT ? 'object' : 'monster',
              url: monsterForm.img,
          };
          if (editingLibraryId) {
            await updateLibraryItem(editingLibraryId, payload);
          } else {
            await addLibraryItem(payload);
          }
          setCreatingMonsterStep('list');
          resetMonsterForm();
      } catch (e) { alert("Erro: " + e.message); }
  };

  const handleDeployMonster = async (item) => {
      if(!sessaoAtiva) return;
      const tType = item.type === VTT_TYPES.OBJECT || item.category === 'object' ? 'object' : 'enemy';
      const img = item.img || item.url || '';
      const newToken = {
          id: `${tType}_${Date.now()}`,
          type: tType,
          name: item.name,
          img,
          x: 0, y: 0, size: 1,
          visible: true, 
          visibleBars: item.visibleBars,
          statuses: [], // Array novo para status negativos
          stats: { hp: { current: item.hpCurrent, max: item.hpMax }, mp: { current: item.mpCurrent, max: item.mpMax } },
          details: { ...item } 
      };
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: [...(sessaoAtiva.tokens||[]), newToken] });
      setShowLibraryManager(false); 
  };

  const handleDeployPlayer = async (char) => {
      if(!sessaoAtiva) return;
      if(sessaoAtiva.tokens?.find(t => t.uid === char.uid)) return alert("Jogador já está no mapa!");
      const newToken = {
          id: `player_${char.uid}`, type: 'player', uid: char.uid, name: char.name,
          img: char.character_sheet?.imgUrl || '', x: 0, y: 0, size: 1, visible: true, controlledBy: char.uid,
          statuses: [] // Array novo para status negativos
      };
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: [...(sessaoAtiva.tokens||[]), newToken] });
  };
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

  // --- HANDLER DE STATUS NEGATIVOS ---
  const handleToggleStatus = async (token, statusId) => {
      let currentStatuses = token.statuses || [];
      if (currentStatuses.includes(statusId)) {
          currentStatuses = currentStatuses.filter(s => s !== statusId);
      } else {
          currentStatuses = [...currentStatuses, statusId];
      }
      await handleUpdateTokenInTracker(token, { statuses: currentStatuses });
  };

  const onDragStart = (e, originalIndex) => { e.dataTransfer.setData("dragIndex", originalIndex); };
  const onDrop = async (e, dropOriginalIndex) => {
      const dragIndex = e.dataTransfer.getData("dragIndex");
      if (dragIndex === "") return;
      const newTokens = [...sessaoAtiva.tokens];
      const [draggedItem] = newTokens.splice(dragIndex, 1);
      newTokens.splice(dropOriginalIndex, 0, draggedItem);
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { tokens: newTokens });
  };

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
  };
  const handleWindowMouseUp = () => { setIsDraggingTracker(false); setIsDraggingDetails(false); };

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

  // --- MODO PVP HANDLER ---
  const handleTogglePVPMode = async () => {
      if(!sessaoAtiva) return;
      const newVal = !sessaoAtiva.pvp_mode;
      await updateDoc(doc(db, "sessoes", sessaoAtiva.id), { pvp_mode: newVal });
  };

  // --- HELPER: BUSCAR COR DO TIME NO MODO PVP ---
  const getTeamColor = (tokenName) => {
      if (!sessaoAtiva || !sessaoAtiva.equipes) return null;
      for (let eq of sessaoAtiva.equipes) {
          if (eq.membros.includes(tokenName)) return eq.cor;
      }
      return null;
  };

  const filteredCreatures = vttLibrary.filter((item) =>
    libraryTab === VTT_TYPES.MONSTER ? item.type === VTT_TYPES.MONSTER : item.type === VTT_TYPES.OBJECT
  );
  const filteredMedia = vttLibrary.filter((item) => item.type === libraryTab);
  const libraryMaps = vttLibrary.filter((item) => item.type === VTT_TYPES.MAP);
  const libraryScenery = vttLibrary.filter((item) => item.type === VTT_TYPES.SCENERY);
  const libraryNpcs = vttLibrary.filter((item) => item.type === VTT_TYPES.NPC);
  const isCreatureTab = libraryTab === VTT_TYPES.MONSTER || libraryTab === VTT_TYPES.OBJECT;

  const orbitalItems = [
    { id: 'mesa', label: 'Mesa de Jogo', shortLabel: 'MESA', icon: <IconTabletop />, onClick: () => { setMesaTab('tabletop'); setShowMesaHub(true); } },
    { id: 'biblioteca', label: 'Biblioteca VTT', shortLabel: 'BIBLIOTECA', icon: <IconFolder />, onClick: () => openLibrary(VTT_TYPES.MAP) },
    { id: 'economia', label: 'Economia & Trocas', shortLabel: 'ECONOMIA', icon: <IconLantern />, badge: trocasPendentes.length, onClick: () => { setEconomiaTab('mercado'); setShowEconomiaHub(true); } },
    { id: 'combate', label: 'Rastreador de Combate', shortLabel: 'COMBATE', icon: <IconCombat />, onClick: () => setShowCombatTracker((v) => !v) },
    { id: 'dados', label: 'Rolagem de Dados', shortLabel: 'DADOS', icon: <IconDice />, onClick: () => setShowDiceSelector(true) },
    { id: 'bencao', label: 'Bênção dos Deuses (D100)', shortLabel: 'BÊNÇÃO', icon: <IconSparkle />, onClick: () => setShowBencaoManager(true) },
    { id: 'anuncios', label: 'Anúncios da Mesa', shortLabel: 'ANÚNCIOS', icon: <IconMegaphone />, onClick: () => setShowAnnouncementManager(true) },
    { id: 'livro', label: 'Livro / Referência', shortLabel: 'LIVRO', icon: <IconBook />, onClick: () => window.open('https://www.canva.com/design/DAGpzszHsc4/NcbQ19hsr4grzm9aotQFtw/edit?utm_content=DAGpzszHsc4&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton', '_blank') },
  ];

  const buffAtivo = sessaoAtiva?.bencao_deuses?.buff_ativo || sessaoAtiva?.bencao_deuses?.vencedores || [];

  // --- LOADING SCREEN ---
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
        <style>{`@keyframes pulseText { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }`}</style>
      </div>
    );
  }

  return (
    <div className="mestre-vtt-container" onMouseMove={handleWindowMouseMove} onMouseUp={handleWindowMouseUp}>
      <div className="mestre-bg-layer" style={{ backgroundImage: `url(${wallpaper})` }} />

      <button
        type="button"
        className="btn-back-mestre-hub"
        onClick={() => navigate('/mestre')}
        title="Voltar ao painel do mestre"
      >
        ← Painel
      </button>

      {bencaoFlash && sessaoAtiva?.bencao_deuses?.vencedores?.length > 0 && createPortal(
          <div className="bencao-roll-flash">
              <div className="bencao-roll-flash-inner">
                  <span className="bencao-flash-label">BÊNÇÃO DOS DEUSES</span>
                  <span className="bencao-flash-number">{sessaoAtiva.bencao_deuses.resultado_d100}</span>
                  <span className="bencao-flash-winners">Bênção para: {sessaoAtiva.bencao_deuses.vencedores.join(', ')}</span>
              </div>
          </div>,
          document.body
      )}
      
      {/* SIDEBAR AVENTUREIROS (Com Destaque para Bênção dos Deuses) */}
      <div className="dm-players-sidebar">
          <h3 className="sidebar-title">AVENTUREIROS</h3>
          <div className="players-list-scroll">
              {personagensData.map(char => {
                  const isOnline = connectedPlayers.includes(char.uid); 
                  const isBencaoWinner = buffAtivo.includes(char.name);
                  const bgImage = char.character_sheet?.imgUrl; 
                  return (
                      <div key={char.id} className={`mini-player-card ${isOnline ? 'online' : 'offline'} ${isBencaoWinner ? 'bencao-highlight' : ''}`} onClick={() => setSelectedFicha(char)} title="Ficha">
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
          
          <button 
              className={`btn-pvp-toggle ${sessaoAtiva.pvp_mode ? 'active' : ''}`}
              onClick={handleTogglePVPMode}
              title="Alternar Modo PVP/Arena"
          >
              {sessaoAtiva.pvp_mode ? '⚔️ MODO PVP: ON' : '🛡️ MODO PVP: OFF'}
          </button>
      </div>

      {/* --- COMPONENTS --- */}
      <Tabletop 
        sessaoData={sessaoAtiva} isMaster={true} showManager={false}
        onCloseManager={() => {}} personagensData={personagensData}
        onEditToken={(token) => setEditingToken(JSON.parse(JSON.stringify(token)))}
        highlightTokenId={highlightTokenId}
        libraryMaps={libraryMaps}
        onUpdateMapItem={handleUpdateMapItem}
      />
      
      <SceneryViewer sessaoData={sessaoAtiva} isMaster={true} showManager={false} onCloseManager={() => {}} sceneryLibrary={libraryScenery} />
      <NPCViewer sessaoData={sessaoAtiva} isMaster={true} showManager={false} onCloseManager={() => {}} npcLibrary={libraryNpcs} />
      {rollResult && (
        <Dice3DResult
          key={rollResult.id || rollResult.timestamp}
          rollData={rollResult}
          sessaoId={sessaoAtiva?.id}
          isRoller={rollResult.rolledBy === auth.currentUser?.uid}
          onClose={() => {
            const rollId = getRollId(rollResult);
            if (sessaoAtiva?.id && rollId) {
              dismissRoll(sessaoAtiva.id, rollId);
            }
            setRollResult(null);
          }}
        />
      )}
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
                  {/* --- COMBATE (JOGADORES E MONSTROS) --- */}
                  {sessaoAtiva.tokens?.map((token, index) => ({...token, originalIndex: index})).filter(t => t.type !== 'object').map((token) => {
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
                      const isPvP = sessaoAtiva.pvp_mode;
                      const teamColor = isPvP ? getTeamColor(token.name) : null;
                      const customBorder = teamColor ? { borderLeft: `4px solid ${teamColor}` } : {};
                      const hasBencaoBuff = token.type === 'player' && buffAtivo.includes(token.name);

                      return (
                          <div key={token.id} className={`tracker-item-wrapper ${hasBencaoBuff ? 'bencao-highlight' : ''}`}>
                              <div 
                                className={`tracker-item ${token.type} ${!isVisible ? 'hidden' : ''} ${token.stealth ? 'stealth-active' : ''} ${token.flying ? 'flying-active' : ''}`}
                                draggable
                                onDragStart={(e) => onDragStart(e, token.originalIndex)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => onDrop(e, token.originalIndex)}
                                style={customBorder}
                              >
                                  <div className="t-col-img">
                                      <div className="t-index">{token.originalIndex + 1}</div>
                                      <div className="t-img" style={{backgroundImage: `url(${imgUrl})`, backgroundPosition: `${token.imgX||50}% ${token.imgY||50}%`, opacity: isVisible ? 1 : 0.5}}></div>
                                  </div>
                                  
                                  <div className="t-col-info">
                                      <div className="t-name" style={teamColor ? {color: teamColor} : {}}>
                                          {token.name}
                                          {token.flying && <span className="t-flying-icon" title="Em voo"><FaFeather size={11} /></span>}
                                          {hasBencaoBuff && <span className="t-bencao-icon" title="Bênção dos Deuses ativa">✨</span>}
                                          <span className="t-active-statuses">
                                              {token.statuses?.map(s => {
                                                  const effect = STATUS_EFFECTS.find(e => e.id === s);
                                                  return effect ? <span key={s} style={{color: effect.color}} title={s}>{effect.icon}</span> : null;
                                              })}
                                          </span>
                                      </div>
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
                                              title="Status Negativos" 
                                              onClick={() => setActiveStatusMenu(activeStatusMenu === token.id ? null : token.id)} 
                                              style={{color: '#f44'}}
                                          >
                                              🩸
                                          </button>
                                          <button 
                                              className="btn-icon-sm" 
                                              title={token.stealth ? "Remover Furtividade (Apenas Dono e Mestre veem)" : "Ativar Furtividade (Invisível para adversários)"} 
                                              onClick={() => handleUpdateTokenInTracker(token, { stealth: !token.stealth })} 
                                              style={{color: token.stealth ? '#a855f7' : '#666'}}
                                          >
                                              🥷
                                          </button>
                                          <button 
                                              className="btn-icon-sm" 
                                              title={token.flying ? "Remover Voo" : "Ativar Voo (token flutuando no grid)"} 
                                              onClick={() => handleUpdateTokenInTracker(token, { flying: !token.flying })} 
                                              style={{color: token.flying ? '#38bdf8' : '#666'}}
                                          >
                                              <FaFeather size={12} />
                                          </button>
                                          <button className="btn-icon-sm" title={isVisible ? "Ocultar" : "Mostrar"} onClick={() => handleUpdateTokenInTracker(token, { visible: !isVisible })} style={{color: isVisible ? '#ffcc00' : '#666'}}>
                                              {isVisible ? '👁️' : '🙈'}
                                          </button>
                                          {hasBencaoBuff && (
                                              <button className="btn-icon-sm" title="Remover sinalização da Bênção" onClick={() => handleRemoverBuffSinalizacao(token.name)} style={{color: '#ffcc00'}}>✨</button>
                                          )}
                                          {token.type === 'enemy' && (
                                              <button className="btn-icon-sm" title="Detalhes" onClick={() => setViewMonsterDetails({ ...token.details, img: token.img })}>📜</button>
                                          )}
                                          <button className="btn-icon-sm delete" title="Remover" onClick={() => handleRemoveToken(token.id)}>✕</button>
                                      </div>
                                  </div>
                              </div>
                              
                              {/* --- MENU INLINE DE STATUS --- */}
                              {activeStatusMenu === token.id && (
                                  <div className="status-menu-inline fade-in">
                                      {STATUS_EFFECTS.map(st => {
                                          const isActive = token.statuses?.includes(st.id);
                                          return (
                                              <button 
                                                  key={st.id} 
                                                  className={`status-btn ${isActive ? 'active' : ''}`} 
                                                  title={st.id}
                                                  onClick={() => handleToggleStatus(token, st.id)}
                                                  style={{ color: isActive ? st.color : '#555' }}
                                              >
                                                  {st.icon}
                                              </button>
                                          )
                                      })}
                                  </div>
                              )}
                          </div>
                      );
                  })}

                  {/* --- OBJETOS --- */}
                  {sessaoAtiva.tokens?.some(t => t.type === 'object') && (
                      <>
                          <div className="tracker-divider">OBJETOS</div>
                          {sessaoAtiva.tokens?.map((token, index) => ({...token, originalIndex: index})).filter(t => t.type === 'object').map((token) => {
                              const isVisible = token.visible !== false;

                              return (
                                  <div 
                                    key={token.id} 
                                    className={`tracker-item object-item ${token.stealth ? 'stealth-active' : ''}`}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, token.originalIndex)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => onDrop(e, token.originalIndex)}
                                  >
                                      <div className="t-col-img">
                                          <div className="t-index">{token.originalIndex + 1}</div>
                                          <div className="t-img" style={{backgroundImage: `url(${token.img})`, backgroundPosition: `${token.imgX||50}% ${token.imgY||50}%`, opacity: isVisible ? 1 : 0.5}}></div>
                                      </div>
                                      
                                      <div className="t-col-info">
                                          <div className="t-name" style={{color: '#ffcc00'}}>{token.name} <small>(Obj)</small></div>
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
                                                  title={token.stealth ? "Remover Furtividade" : "Ativar Furtividade"} 
                                                  onClick={() => handleUpdateTokenInTracker(token, { stealth: !token.stealth })} 
                                                  style={{color: token.stealth ? '#a855f7' : '#666'}}
                                              >
                                                  🥷
                                              </button>
                                              <button className="btn-icon-sm" title={isVisible ? "Ocultar" : "Mostrar"} onClick={() => handleUpdateTokenInTracker(token, { visible: !isVisible })} style={{color: isVisible ? '#ffcc00' : '#666'}}>
                                                  {isVisible ? '👁️' : '🙈'}
                                              </button>
                                              <button className="btn-icon-sm" title="Destacar no Mapa" onClick={() => blinkToken(token.id)}>👁️‍🗨️</button>
                                              <button className="btn-icon-sm delete" title="Remover" onClick={() => handleRemoveToken(token.id)}>✕</button>
                                          </div>
                                      </div>
                                  </div>
                              );
                          })}
                      </>
                  )}

                  {(!sessaoAtiva.tokens || sessaoAtiva.tokens.length === 0) && <div className="empty-tracker">Mesa Vazia</div>}
              </div>
          </div>
      )}

      {/* --- DETALHES DO MONSTRO FLUTUANTE --- */}
      {viewMonsterDetails && (
          <div 
              className="monster-detail-card draggable-card fade-in" 
              style={{ position: 'absolute', top: detailsPos.y, left: detailsPos.x, zIndex: 1100 }}
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
                              <label>DICAS DO SANCHES (GM)</label>
                              <p>{viewMonsterDetails.tips}</p>
                          </div>
                      )}
                  </div>
              </div>
              <button className="md-close-btn" onClick={() => setViewMonsterDetails(null)}>FECHAR</button>
          </div>
      )}

      {/* Bazar & Forja (controlados pelo hub Economia ou uso standalone) */}
      <Bazar isMestre={true} hideTrigger isOpen={bazarOpen} onOpenChange={setBazarOpen} />
      <Forja hideTrigger isOpen={forjaOpen} onOpenChange={setForjaOpen} />

      <DmOrbitalMenu open={orbitalOpen} onToggle={setOrbitalOpen} items={orbitalItems} />

      {selectedFicha && <Ficha characterData={selectedFicha} isMaster={true} onClose={() => setSelectedFicha(null)} />}

      {/* HUB MESA DE JOGO */}
      {showMesaHub && (
          <div className="modal-overlay-custom" onClick={() => setShowMesaHub(false)}>
              <div className="modal-box-custom wide hub-modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header-c">
                      <h3>MESA DE JOGO</h3>
                      <div className="media-tabs hub-tabs">
                          <button type="button" className={mesaTab === 'tabletop' ? 'active' : ''} onClick={() => setMesaTab('tabletop')}>TABLETOP</button>
                          <button type="button" className={mesaTab === 'cenarios' ? 'active' : ''} onClick={() => setMesaTab('cenarios')}>CENÁRIOS</button>
                          <button type="button" className={mesaTab === 'npcs' ? 'active' : ''} onClick={() => setMesaTab('npcs')}>NPCS</button>
                          <button type="button" className={mesaTab === 'jogadores' ? 'active' : ''} onClick={() => setMesaTab('jogadores')}>JOGADORES</button>
                      </div>
                      <button className="close-c" onClick={() => setShowMesaHub(false)}>✕</button>
                  </div>
                  <div className="hub-panel-body">
                      {mesaTab === 'tabletop' && (
                          <Tabletop 
                            sessaoData={sessaoAtiva} isMaster={true} showManager={true} embeddedManager={true} managerOnly={true}
                            onCloseManager={() => setShowMesaHub(false)} personagensData={personagensData}
                            highlightTokenId={highlightTokenId} libraryMaps={libraryMaps} onUpdateMapItem={handleUpdateMapItem}
                          />
                      )}
                      {mesaTab === 'cenarios' && (
                          <SceneryViewer sessaoData={sessaoAtiva} isMaster={true} showManager={true} embeddedManager={true} onCloseManager={() => setShowMesaHub(false)} sceneryLibrary={libraryScenery} />
                      )}
                      {mesaTab === 'npcs' && (
                          <NPCViewer sessaoData={sessaoAtiva} isMaster={true} showManager={true} embeddedManager={true} onCloseManager={() => setShowMesaHub(false)} npcLibrary={libraryNpcs} />
                      )}
                      {mesaTab === 'jogadores' && (
                          <div className="hub-jogadores-panel">
                              <p className="hub-hint">Selecione um personagem para inserir como token no mapa ativo.</p>
                              <div className="player-select-grid">
                                  {allCharacters.map(char => (
                                      <div key={char.id} className="char-select-card" onClick={() => handleDeployPlayer(char)}>
                                          <div className="c-avatar" style={{backgroundImage: `url(${char.character_sheet?.imgUrl})`}}></div>
                                          <span>{char.name}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* HUB ECONOMIA */}
      {showEconomiaHub && (
          <div className="modal-overlay-custom" onClick={() => setShowEconomiaHub(false)}>
              <div className="modal-box-custom wide hub-modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header-c">
                      <h3>ECONOMIA & TROCAS</h3>
                      <div className="media-tabs hub-tabs">
                          <button type="button" className={economiaTab === 'mercado' ? 'active' : ''} onClick={() => setEconomiaTab('mercado')}>
                              MERCADO DOS LANTERNAS {trocasPendentes.length > 0 && `(${trocasPendentes.length})`}
                          </button>
                          <button type="button" className={economiaTab === 'bazar' ? 'active' : ''} onClick={() => setEconomiaTab('bazar')}>BAZAR</button>
                          <button type="button" className={economiaTab === 'forja' ? 'active' : ''} onClick={() => setEconomiaTab('forja')}>FORJA</button>
                      </div>
                      <button className="close-c" onClick={() => setShowEconomiaHub(false)}>✕</button>
                  </div>
                  <div className="hub-panel-body">
                      {economiaTab === 'mercado' && (
                          <div className="mercado-list">
                              {trocasPendentes.length === 0 ? <p style={{color: '#666', textAlign: 'center', margin: '20px 0'}}>Nenhuma troca ou envio pendente de autorização.</p> : null}
                              {trocasPendentes.map(troca => (
                                  <div key={troca.id} className="troca-card-dm">
                                      <p><strong>De:</strong> {troca.remetente}</p>
                                      <p><strong>Para:</strong> {troca.destinatario}</p>
                                      <p><strong>Itens:</strong> {troca.itens?.map(i => `${i.quantidade}x ${i.name}`).join(', ') || 'Nenhum'}</p>
                                      <p><strong>Gil:</strong> {troca.gil || 0}</p>
                                      {troca.mensagem && <p style={{color: '#00f2ff', fontStyle: 'italic'}}><strong>Msg:</strong> "{troca.mensagem}"</p>}
                                      <div className="troca-actions">
                                          <button className="btn-approve" onClick={() => handleAprovarTroca(troca)}>AUTORIZAR</button>
                                          <button className="btn-deny" onClick={() => handleRecusarTroca(troca)}>BARRAR</button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                      {economiaTab === 'bazar' && (
                          <div className="hub-external-tool">
                              <p className="hub-hint">A interface completa do Bazar abre sobre a mesa. Feche o Bazar para voltar a este painel.</p>
                              <button type="button" className="btn-save-m" onClick={() => setBazarOpen(true)}>ABRIR BAZAR</button>
                          </div>
                      )}
                      {economiaTab === 'forja' && (
                          <div className="hub-external-tool">
                              <p className="hub-hint">A interface completa da Forja abre sobre a mesa. Feche a Forja para voltar a este painel.</p>
                              <button type="button" className="btn-save-m" onClick={() => setForjaOpen(true)}>ABRIR FORJA</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* BÊNÇÃO DOS DEUSES (D100) */}
      {showBencaoManager && (
         <div className="modal-overlay-custom" onClick={() => setShowBencaoManager(false)}>
            <div className="modal-box-custom" onClick={e => e.stopPropagation()}>
                <div className="modal-header-c">
                    <h3>✨ BÊNÇÃO DOS DEUSES (D100)</h3>
                    <button className="close-c" onClick={() => setShowBencaoManager(false)}>✕</button>
                </div>
                <div className="bencao-body">
                    <div className="numeros-jogadores">
                        <h4 style={{color: '#aaa', marginBottom: '10px', borderBottom: '1px solid #333', paddingBottom: '5px'}}>NÚMEROS APOSTADOS (Atuais):</h4>
                        <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                        {Object.entries(sessaoAtiva?.bencao_deuses?.numeros_escolhidos || {}).map(([nome, num]) => (
                            <li key={nome} style={{background: '#111', padding: '10px', borderRadius: '4px', border: '1px solid #333'}}>
                                <strong style={{color: '#00f2ff'}}>{nome}:</strong> <span style={{fontSize: '18px', color: '#ffcc00', float: 'right', fontWeight: 'bold'}}>{num}</span>
                            </li>
                        ))}
                        {Object.keys(sessaoAtiva?.bencao_deuses?.numeros_escolhidos || {}).length === 0 && <p style={{color: '#666', gridColumn: '1 / -1'}}>Nenhum jogador apostou ainda.</p>}
                        </ul>
                    </div>
                    
                    <div className="bencao-actions" style={{textAlign:'center', marginTop:'30px'}}>
                        <button className="btn-save-m" style={{fontSize:'20px', padding:'15px 30px', width: '100%'}} onClick={handleRolarDdD}>ROLAR DdD (1-100)</button>
                    </div>

                    {sessaoAtiva?.bencao_deuses?.resultado_d100 > 0 && (
                        <div className="bencao-resultado" style={{textAlign:'center', marginTop:'30px', background: 'rgba(255,204,0,0.1)', padding: '20px', borderRadius: '8px', border: '1px solid #ffcc00'}}>
                            <h4 style={{margin: 0, color: '#aaa'}}>O DADO DOS DEUSES CRAVOU:</h4>
                            <h1 style={{fontSize:'60px', color:'#ffcc00', margin:'10px 0', textShadow: '0 0 20px #ffcc00'}}>{sessaoAtiva.bencao_deuses.resultado_d100}</h1>
                            {sessaoAtiva.bencao_deuses.vencedores?.length > 0 ? (
                                <h3 style={{color:'#0f0', margin: 0, animation: 'pulse 1.5s infinite'}}>Bênção ativada para: {sessaoAtiva.bencao_deuses.vencedores.join(', ')}!</h3>
                            ) : (
                                <p style={{color:'#aaa', fontStyle: 'italic', margin: 0}}>Os deuses permanecem em silêncio...</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* ANÚNCIOS DA MESA */}
      {showAnnouncementManager && (
        <AnnouncementManager onClose={() => setShowAnnouncementManager(false)} />
      )}

      {/* 3. BIBLIOTECA VTT GLOBAL */}
      {showLibraryManager && (
         <div className="modal-overlay-custom" onClick={closeLibrary}>
            <div className="modal-box-custom wide" onClick={e => e.stopPropagation()}>
                <div className="modal-header-c">
                    <h3>BIBLIOTECA VTT</h3>
                    <div className="media-tabs">
                        <button type="button" className={libraryTab === VTT_TYPES.MAP ? 'active' : ''} onClick={() => { setLibraryTab(VTT_TYPES.MAP); setCreatingMonsterStep('list'); resetUploadForm(); resetMonsterForm(); }}>MAPAS</button>
                        <button type="button" className={libraryTab === VTT_TYPES.SCENERY ? 'active' : ''} onClick={() => { setLibraryTab(VTT_TYPES.SCENERY); setCreatingMonsterStep('list'); resetUploadForm(); resetMonsterForm(); }}>CENÁRIOS</button>
                        <button type="button" className={libraryTab === VTT_TYPES.NPC ? 'active' : ''} onClick={() => { setLibraryTab(VTT_TYPES.NPC); setCreatingMonsterStep('list'); resetUploadForm(); resetMonsterForm(); }}>NPCS</button>
                        <button type="button" className={libraryTab === VTT_TYPES.MONSTER ? 'active' : ''} onClick={() => { setLibraryTab(VTT_TYPES.MONSTER); setCreatingMonsterStep('list'); resetUploadForm(); resetMonsterForm(); }}>MONSTROS</button>
                        <button type="button" className={libraryTab === VTT_TYPES.OBJECT ? 'active' : ''} onClick={() => { setLibraryTab(VTT_TYPES.OBJECT); setCreatingMonsterStep('list'); resetUploadForm(); resetMonsterForm(); }}>OBJETOS</button>
                    </div>
                    <button className="close-c" onClick={closeLibrary}>✕</button>
                </div>

                {!isCreatureTab ? (
                  <>
                    <form onSubmit={handleAddToLibrary} className="upload-manager-body">
                        {(libraryTab === VTT_TYPES.MAP || libraryTab === VTT_TYPES.SCENERY || libraryTab === VTT_TYPES.NPC) && (
                            <div className="modal-input-group">
                                <label style={{color: '#94a3b8', fontSize: '11px'}}>NOME</label>
                                <input placeholder={libraryTab === VTT_TYPES.MAP ? "Ex: Taverna do Javali" : "Opcional"} className="file-input-dark" value={uploadMapName} onChange={e => setUploadMapName(e.target.value)} required={libraryTab === VTT_TYPES.MAP} />
                            </div>
                        )}
                        <div className="modal-input-group">
                            <label style={{color: '#94a3b8', fontSize: '11px'}}>LINK DA IMAGEM (URL)</label>
                            <input placeholder="https://..." className="file-input-dark" value={uploadMapUrl} onChange={e => setUploadMapUrl(e.target.value)} required />
                        </div>

                        {uploadMapUrl && (
                            <div style={{marginBottom: '20px', textAlign: 'center', background: '#111', padding: '10px', borderRadius: '4px', border: '1px solid #333'}}>
                                <p style={{fontSize: '10px', color: '#888', margin: '0 0 5px 0'}}>PRÉ-VISUALIZAÇÃO</p>
                                <img src={uploadMapUrl} alt="Preview" style={{maxHeight: '150px', maxWidth: '100%', borderRadius: '4px'}} />
                            </div>
                        )}

                        <button type="submit" className="btn-save-m" style={{width: '100%', padding: '15px', marginBottom: '25px'}}>
                            ADICIONAR À BIBLIOTECA GLOBAL
                        </button>
                    </form>

                    <div className="media-library-section">
                        <h4 className="media-library-title">ITENS CADASTRADOS</h4>
                        <div className="media-library-grid">
                            {filteredMedia.length === 0 && (
                                <p className="media-empty">Nenhum item nesta categoria.</p>
                            )}
                            {filteredMedia.map((item) => (
                                <div key={item.id} className="media-library-item">
                                    <div className={`media-thumb ${libraryTab === VTT_TYPES.SCENERY ? 'scenery' : ''} ${libraryTab === VTT_TYPES.NPC ? 'npc' : ''}`} style={{backgroundImage: `url(${item.url || item.img})`}}></div>
                                    <span className="media-name">{item.name}</span>
                                    <button type="button" className="btn-media-delete" onClick={() => handleDeleteLibraryItem(item)}>EXCLUIR</button>
                                </div>
                            ))}
                        </div>
                    </div>
                  </>
                ) : creatingMonsterStep === 'list' ? (
                      <div className="monster-list-view">
                          <button className="btn-create-monster" onClick={() => { resetMonsterForm(); setCreatingMonsterStep('create'); }}>+ CRIAR NOVO {libraryTab === VTT_TYPES.MONSTER ? 'MONSTRO' : 'OBJETO'}</button>
                          <div className="bestiary-grid">
                              {filteredCreatures.map((mon) => (
                                  <div key={mon.id} className="monster-card-db">
                                      <div className="m-thumb" style={{backgroundImage: `url(${mon.img || mon.url})`}}></div>
                                      <div className="m-info">
                                          <strong>{mon.name}</strong>
                                          {mon.type !== VTT_TYPES.OBJECT && <small>HP: {mon.hpMax}</small>}
                                      </div>
                                      <div className="m-actions">
                                          <button className="btn-deploy" onClick={() => handleDeployMonster(mon)}>INSERIR</button>
                                          <button className="btn-edit" onClick={() => handleEditMonster(mon)} title="Editar">✏️</button>
                                          <button className="btn-delete" onClick={() => handleDeleteLibraryItem(mon)}>EXCLUIR</button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  ) : (
                      <div className="monster-create-view">
                          <div className="create-row">
                              <div className="img-upload-box">
                                  <div className="preview-img" style={{backgroundImage: `url(${monsterForm.img})`}}></div>
                                  <input className="input-title" style={{marginTop: '5px', fontSize: '10px'}} placeholder="Link Imagem (URL)..." value={monsterForm.img} onChange={e => setMonsterForm({...monsterForm, img: e.target.value})} />
                              </div>
                              <div className="details-inputs">
                                  <input className="input-title" placeholder="Nome" value={monsterForm.name} onChange={e => setMonsterForm({...monsterForm, name: e.target.value})} />
                                  
                                  {libraryTab === VTT_TYPES.MONSTER && (
                                    <div className="stats-row-c">
                                        <div><label>HP Max</label><input type="number" value={monsterForm.hpMax} onChange={e => setMonsterForm({...monsterForm, hpMax: Number(e.target.value), hpCurrent: Number(e.target.value)})} /></div>
                                        <div><label>MP Max</label><input type="number" value={monsterForm.mpMax} onChange={e => setMonsterForm({...monsterForm, mpMax: Number(e.target.value), mpCurrent: Number(e.target.value)})} /></div>
                                    </div>
                                  )}

                                  <div className="toggle-row"><input type="checkbox" checked={monsterForm.visibleBars} onChange={e => setMonsterForm({...monsterForm, visibleBars: e.target.checked})} /><label>Barras visíveis?</label></div>
                              </div>
                          </div>
                          <div className="text-areas-row" style={{flexDirection:'column', height:'auto'}}>
                              <textarea style={{height:'60px'}} placeholder="Descrição (Lore)..." value={monsterForm.description} onChange={e => setMonsterForm({...monsterForm, description: e.target.value})} />
                              
                              {libraryTab === VTT_TYPES.MONSTER && (
                                  <>
                                      <textarea style={{height:'60px'}} placeholder="Drops (Use Enter para tópicos)" value={monsterForm.drops} onChange={(e) => setMonsterForm({...monsterForm, drops: e.target.value})} />
                                      <textarea style={{height:'60px'}} placeholder="Dicas do Sanches (Secreto)" value={monsterForm.tips} onChange={e => setMonsterForm({...monsterForm, tips: e.target.value})} />
                                  </>
                              )}
                          </div>
                          <div className="actions-row-bottom"><button className="btn-save-m" onClick={handleSaveMonster}>{editingLibraryId ? 'SALVAR ALTERAÇÕES' : 'SALVAR NA BIBLIOTECA'}</button><button className="btn-cancel-m" onClick={() => { setCreatingMonsterStep('list'); resetMonsterForm(); }}>VOLTAR</button></div>
                      </div>
                  )}
            </div>
        </div>
      )}


      {/* --- MODAL DE EDIÇÃO DE TOKEN (REFINADO) --- */}
      {editingToken && (
          <div className="modal-overlay-custom" onClick={() => setEditingToken(null)}>
              <div className="modal-box-custom refined-edit" onClick={e => e.stopPropagation()}>
                  <h3 className="modal-edit-title">EDITAR: {editingToken.name}</h3>
                  
                  {editingToken.type !== 'object' && (
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
                  )}

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
        .btn-back-mestre-hub {
          position: fixed;
          top: 20px;
          right: 16px;
          z-index: 60;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(255, 204, 0, 0.35);
          color: rgba(255, 204, 0, 0.75);
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.5px;
          padding: 6px 12px;
          border-radius: 20px;
          cursor: pointer;
          opacity: 0.55;
          transition: opacity 0.2s, background 0.2s, border-color 0.2s, color 0.2s;
          backdrop-filter: blur(4px);
        }
        .btn-back-mestre-hub:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.75);
          border-color: #ffcc00;
          color: #ffcc00;
        }
        .dm-players-sidebar { position: absolute; top: 20px; left: 20px; width: 200px; background: rgba(0, 10, 20, 0.95); border: 2px solid #ffcc00; border-radius: 8px; padding: 10px; z-index: 50; max-height: 80vh; display: flex; flex-direction: column; }
        .sidebar-title { color: #ffcc00; font-size: 12px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 10px; text-align: center; }
        .players-list-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .mini-player-card { display: flex; align-items: center; padding: 5px; background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 4px; cursor: pointer; transition: 0.2s; }
        .mini-player-card.online { border-left: 3px solid #00f2ff; }
        .mini-avatar { position: relative; margin-right: 8px; }
        .avatar-img, .avatar-placeholder { width: 30px; height: 30px; border-radius: 50%; background-size: cover; border: 1px solid #fff; }
        .avatar-placeholder { background: #222; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .status-dot { width: 6px; height: 6px; border-radius: 50%; position: absolute; bottom: 0; right: 0; border: 1px solid #000; }
        .status-dot.green { background: #00f2ff; } .status-dot.gray { background: #666; }
        .p-name { font-size: 11px; font-weight: bold; display: block; }
        .p-lvl { font-size: 9px; color: #ffcc00; }

        /* DESTAQUE BÊNÇÃO DOS DEUSES */
        .bencao-highlight { animation: flashGold 1.5s infinite alternate; border: 2px solid #ffcc00 !important; box-shadow: 0 0 15px #ffcc00; }
        @keyframes flashGold { 0% { filter: brightness(1); box-shadow: 0 0 5px #ffcc00; } 100% { filter: brightness(1.5); box-shadow: 0 0 25px #ffcc00; } }
        .t-bencao-icon { margin-left: 6px; font-size: 14px; filter: drop-shadow(0 0 4px #ffcc00); }
        .t-flying-icon { margin-left: 6px; color: #38bdf8; display: inline-flex; vertical-align: middle; filter: drop-shadow(0 0 3px rgba(56, 189, 248, 0.6)); }

        .bencao-roll-flash { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; pointer-events: none; background: rgba(0,0,0,0.75); animation: bencaoFlashBg 4s ease-out forwards; }
        .bencao-roll-flash-inner { display: flex; flex-direction: column; align-items: center; text-align: center; animation: bencaoFlashPop 4s ease-out forwards; }
        .bencao-flash-label { font-family: 'Cinzel', serif; font-size: clamp(18px, 4vw, 32px); color: #ffcc00; letter-spacing: 6px; text-transform: uppercase; text-shadow: 0 0 20px #ffcc00; margin-bottom: 10px; }
        .bencao-flash-number { font-family: 'Cinzel', serif; font-size: clamp(80px, 20vw, 160px); font-weight: bold; color: #ffcc00; line-height: 1; text-shadow: 0 0 40px #ffcc00, 0 0 80px rgba(255,204,0,0.5); }
        .bencao-flash-winners { font-family: 'Cinzel', serif; font-size: clamp(14px, 3vw, 24px); color: #0f0; margin-top: 15px; letter-spacing: 2px; text-shadow: 0 0 10px #0f0; }
        @keyframes bencaoFlashBg { 0% { opacity: 0; } 10% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes bencaoFlashPop { 0% { transform: scale(0.5); opacity: 0; } 10% { transform: scale(1.1); opacity: 1; } 80% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.05); opacity: 0; } }

        .session-status-top { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); border: 1px solid #00f2ff; padding: 5px 20px; border-radius: 20px; display: flex; align-items: center; gap: 10px; z-index: 40; }
        .status-indicator { width: 10px; height: 10px; background: #00f2ff; border-radius: 50%; box-shadow: 0 0 10px #00f2ff; animation: pulse 2s infinite; }
        .status-info h2 { margin: 0; font-size: 14px; color: #fff; }
        .status-info p { margin: 0; font-size: 10px; color: #00f2ff; }

        /* BOTAO PVP E FURTIVIDADE */
        .btn-pvp-toggle { background: #111; color: #666; border: 1px solid #555; padding: 6px 15px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: 0.3s; margin-left: 20px; font-family: 'Cinzel', serif; font-size: 12px; }
        .btn-pvp-toggle.active { background: #3b0764; color: #c4b5fd; border-color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.5); }
        .tracker-item.stealth-active { border-color: #a855f7; border-style: dashed; box-shadow: inset 0 0 15px rgba(168, 85, 247, 0.2); }
        .tracker-item.flying-active { border-color: #38bdf8; box-shadow: inset 0 0 12px rgba(56, 189, 248, 0.25); }
        .tracker-item-wrapper:has(.flying-active) { border-color: #38bdf8; }

        /* COMBAT TRACKER */
        .combat-tracker-panel { position: absolute; width: 360px; max-height: 70vh; background: linear-gradient(180deg, #0d0d10 0%, #000 100%); border: 2px solid #b8860b; border-radius: 6px; display: flex; flex-direction: column; box-shadow: 0 0 25px rgba(0,0,0,0.9); }
        .tracker-header { background: #15100a; border-bottom: 2px solid #b8860b; padding: 10px; text-align: center; }
        .tracker-title { color: #ffcc00; margin: 0; font-family: 'Cinzel', serif; letter-spacing: 3px; font-size: 16px; text-shadow: 0 0 5px #ffcc00; }
        .tracker-divider { background: #1a1a1a; color: #ffcc00; font-size: 11px; font-weight: bold; text-align: center; padding: 4px; margin: 5px 0; border-top: 1px dashed #444; border-bottom: 1px dashed #444; letter-spacing: 1px; }
        .tracker-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        
        .tracker-item-wrapper { background: rgba(20, 20, 25, 0.9); border: 1px solid #444; border-radius: 4px; transition: 0.2s; display: flex; flex-direction: column; }
        .tracker-item-wrapper:hover { border-color: #ffcc00; }
        .tracker-item { display: flex; align-items: center; padding: 8px 5px; gap: 8px; }
        
        .tracker-item.object-item { border-style: dashed; }
        
        .t-col-img { display: flex; flex-direction: column; align-items: center; width: 45px; flex-shrink: 0; }
        .t-index { color: #666; font-size: 10px; font-weight: bold; margin-bottom: 2px; }
        .t-img { width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 1px solid #777; box-shadow: 0 0 5px #000; }
        .t-col-info { flex: 1; display: flex; flex-direction: column; gap: 4px; overflow: hidden; }
        .t-name { font-size: 13px; font-weight: bold; color: #eec; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; }
        
        /* STATUS ICONS NA LISTA */
        .t-active-statuses { display: inline-flex; align-items: center; gap: 2px; margin-left: 6px; font-size: 12px; }
        .status-menu-inline { display: flex; gap: 6px; padding: 8px; background: #080808; border-top: 1px solid #333; flex-wrap: wrap; justify-content: center; border-radius: 0 0 4px 4px; }
        .status-btn { background: transparent; border: 1px solid #333; font-size: 16px; padding: 6px; cursor: pointer; border-radius: 4px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .status-btn:hover { background: #222; border-color: #666; transform: scale(1.1); }
        .status-btn.active { border-color: currentColor; background: rgba(255,255,255,0.1); }

        .t-stats-row { display: flex; gap: 4px; flex-wrap: wrap; }
        .t-stat { display: flex; align-items: center; font-size: 11px; background: #080808; padding: 2px 5px; border-radius: 3px; border: 1px solid #333; min-width: 0; }
        .t-stat label { margin-right: 4px; font-weight: bold; font-size: 9px; flex-shrink: 0; }
        .t-stat.hp label { color: #f44; } .t-stat.mp label { color: #00f2ff; }
        .t-stat input { width: 46px; min-width: 46px; background: transparent; border: none; color: #fff; text-align: center; padding: 0; font-size: 11px; font-weight: bold; }
        .t-stat span { color: #fff; font-weight: bold; min-width: 20px; text-align: center; }
        .t-stat small { color: #555; margin-left: 2px; font-size: 9px; white-space: nowrap; }
        .t-col-actions { display: flex; gap: 6px; align-items: center; }
        .img-adj-grid { display: flex; flex-direction: column; align-items: center; gap: 1px; }
        .img-adj-grid button { width: 14px; height: 12px; font-size: 7px; padding: 0; line-height: 1; background: #222; border: 1px solid #555; color: #aaa; cursor: pointer; }
        .img-adj-grid button:hover { background: #ffcc00; color: #000; }
        .act-btns { display: flex; flex-direction: column; gap: 3px; }
        .btn-icon-sm { background: #222; border: 1px solid #555; color: #ccc; width: 22px; height: 22px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 3px; transition: 0.2s; }
        .btn-icon-sm:hover { background: #444; color: #fff; border-color: #fff; }
        .btn-icon-sm.delete:hover { background: #300; border-color: #f44; color: #f44; }
        .empty-tracker { text-align: center; padding: 30px; color: #666; font-style: italic; font-size: 12px; font-family: 'serif'; }

        /* MONSTER DETAIL DRAGGABLE WINDOW */
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
        .md-block.tips p { color: #00f2ff; font-style: italic; }
        .md-close-btn { width: 100%; padding: 15px; background: #111; color: #fff; border: none; border-top: 1px solid #b8860b; font-family: 'Cinzel', serif; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .md-close-btn:hover { background: #b8860b; color: #000; }

        .embedded-manager-panel { width: 100%; background: #0a0a0a; border: 1px solid #333; border-radius: 6px; padding: 15px; }
        .embedded-manager-panel .manager-list { max-height: 45vh; overflow-y: auto; }

        .hub-modal { max-height: 92vh; }
        .hub-tabs { flex-wrap: wrap; gap: 8px !important; margin: 0 10px !important; }
        .hub-tabs button { font-size: 10px !important; white-space: nowrap; }
        .hub-panel-body { min-height: 200px; max-height: 65vh; overflow-y: auto; padding-top: 5px; }
        .hub-hint { color: #888; font-size: 12px; margin: 0 0 15px 0; font-style: italic; }
        .hub-jogadores-panel .player-select-grid { max-height: 50vh; overflow-y: auto; }
        .hub-external-tool { text-align: center; padding: 40px 20px; }

        /* MODAIS GERAIS E QUEUE 01 */
        .modal-overlay-custom { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 9999; display: flex; align-items: center; justify-content: center; }
        .modal-box-custom { background: #080808; border: 2px solid #ffcc00; padding: 20px; border-radius: 8px; width: 500px; max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; }
        .modal-box-custom.wide { width: 800px; }
        .modal-header-c { display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 20px; align-items: center; }
        .modal-header-c h3 { margin: 0; color: #ffcc00; }
        .close-c { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
        
        .file-input-dark { background: #111; color: #fff; border: 1px solid #444; padding: 10px; width: 100%; margin-bottom: 15px; border-radius: 4px; outline: none; }
        .btn-approve { background: #00f2ff; color: #000; font-weight: bold; padding: 8px 15px; border: none; cursor: pointer; border-radius: 4px; transition: 0.2s; }
        .btn-approve:hover { background: #fff; box-shadow: 0 0 10px #00f2ff; }
        .btn-deny { background: #f44; color: #fff; font-weight: bold; padding: 8px 15px; border: none; cursor: pointer; border-radius: 4px; transition: 0.2s; }
        .btn-deny:hover { background: #f00; box-shadow: 0 0 10px #f44; }
        .troca-card-dm { background: #111; border: 1px solid #333; padding: 15px; border-radius: 4px; margin-bottom: 10px; }
        .troca-card-dm p { margin: 5px 0; font-size: 13px; color: #ccc; }
        .troca-actions { display: flex; gap: 10px; margin-top: 15px; }

        /* TABS DO BESTIÁRIO E MÍDIA DA SESSÃO */
        .bestiary-tabs, .media-tabs { display: flex; gap: 15px; margin: 0 20px; }
        .bestiary-tabs button, .media-tabs button { background: transparent; border: none; color: #aaa; font-family: 'Cinzel', serif; font-size: 12px; cursor: pointer; padding-bottom: 5px; font-weight: bold; }
        .bestiary-tabs button.active, .media-tabs button.active { color: #ffcc00; border-bottom: 2px solid #ffcc00; }

        .media-library-section { border-top: 1px solid #333; padding-top: 15px; }
        .media-library-title { color: #94a3b8; font-size: 11px; margin: 0 0 15px 0; letter-spacing: 1px; }
        .media-library-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; max-height: 35vh; overflow-y: auto; padding: 5px; }
        .media-library-item { background: #111; border: 1px solid #333; border-radius: 4px; padding: 8px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
        .media-thumb { width: 100%; height: 90px; background-size: cover; background-position: center; border-radius: 4px; border: 1px solid #444; }
        .media-thumb.scenery { height: 70px; }
        .media-thumb.npc { height: 110px; background-size: contain; background-repeat: no-repeat; background-color: #000; }
        .media-name { font-size: 11px; color: #ccc; text-align: center; word-break: break-word; }
        .media-empty { color: #666; text-align: center; grid-column: 1 / -1; font-style: italic; padding: 20px; margin: 0; }
        .btn-media-delete { background: transparent; border: 1px solid #f44; color: #f44; font-size: 10px; font-weight: bold; padding: 5px 10px; cursor: pointer; width: 100%; transition: 0.2s; font-family: 'Cinzel', serif; }
        .btn-media-delete:hover { background: #f44; color: #fff; }
        
        .monster-list-view { display: flex; flex-direction: column; gap: 15px; width: 100%; }
        .btn-create-monster { background: #222; border: 1px dashed #ffcc00; color: #ffcc00; padding: 15px; font-weight: bold; cursor: pointer; transition: 0.2s; text-align: center; width: 100%; }
        .btn-create-monster:hover { background: rgba(255, 204, 0, 0.1); }
        .bestiary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 15px; width: 100%; }
        .monster-card-db { display: flex; background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 10px; gap: 10px; align-items: center; }
        .m-thumb { width: 50px; height: 50px; background-size: cover; border-radius: 4px; border: 1px solid #555; flex-shrink: 0; }
        .m-info { flex: 1; display: flex; flex-direction: column; font-size: 12px; }
        .m-info strong { color: #fff; font-size: 14px; }
        .m-info small { color: #888; }
        .m-actions { display: flex; flex-direction: column; gap: 4px; }
        .btn-deploy { background: #00f2ff; color: #000; border: none; font-size: 10px; font-weight: bold; padding: 4px 8px; cursor: pointer; border-radius: 2px; }
        .btn-edit { background: #ffcc00; color: #000; border: none; font-size: 12px; font-weight: bold; padding: 4px 8px; cursor: pointer; border-radius: 2px; line-height: 1; }
        .btn-edit:hover { background: #fff; }
        .btn-delete { background: #f44; color: #fff; border: none; font-size: 10px; font-weight: bold; padding: 4px 8px; cursor: pointer; border-radius: 2px; }
        
        .player-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
        .char-select-card { background: rgba(255,255,255,0.05); border: 1px solid #333; padding: 10px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; border-radius: 4px; }
        .char-select-card:hover { border-color: #00f2ff; background: rgba(0, 242, 255, 0.1); }
        .c-avatar { width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 1px solid #fff; flex-shrink: 0; }

        /* REFINED EDIT MODAL */
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
        .btn-save-m { flex: 1; background: #ffcc00; color: #000; border: none; padding: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-save-m:hover { background: #fff; box-shadow: 0 0 10px #ffcc00; }
        .btn-cancel-m { background: #333; color: #fff; border: none; padding: 10px; cursor: pointer; }
        
        .toggle-row { display: flex; align-items: center; gap: 10px; color: #aaa; font-size: 12px; margin-top: 5px; }
        .text-areas-row { display: flex; gap: 10px; }
        .text-areas-row textarea { background: #111; border: 1px solid #444; color: #ccc; padding: 10px; resize: none; margin-bottom: 5px; }

        .fade-in { animation: fadeIn 0.2s ease-in; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
      `}</style>

      <WallpaperPicker
        wallpapers={MESTRE_WALLPAPERS}
        current={wallpaper}
        onChange={setWallpaper}
        storageKey="mestre_wallpaper"
        side="left"
        bottom={22}
        sideOffset={22}
      />
    </div>
  );
}