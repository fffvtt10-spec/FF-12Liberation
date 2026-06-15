import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase'; 
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, where, serverTimestamp, arrayRemove, updateDoc, getDocs, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useNavigate } from 'react-router-dom'; 
import { backgroundMusic } from './LandingPage'; 
import fundoMestre from '../assets/fundo-mestre.jpg'; 
import chocoboGif from '../assets/chocobo-loading.gif';
import Bazar from '../components/Bazar'; 
import Forja from '../components/Forja'; 
import Ficha from '../components/Ficha'; 
import GuildBoard from '../components/GuildBoard';
import { getCharacterClass, getCharacterRace } from '../utils/characterHelpers';
import { exportCharactersAsMarkdown } from '../utils/exportCharacterMarkdown';
import { exportCharactersAsJson } from '../utils/exportCharacterJson';
import { executarTransferenciaTroca } from '../utils/mercadoLanternas'; 

// --- COMPONENTE DE CALENDÁRIO INTERNO ---
const CalendarSystem = ({ onClose, isMaster, disponibilidades, sessoes, onAddSlot, onUpdateSession, onDeleteSlot }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [viewEvent, setViewEvent] = useState(null); 
  const [newTime, setNewTime] = useState("20:00"); 

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
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => {
        const eDate = e.dateObj;
        return eDate.getDate() === d && eDate.getMonth() === month && eDate.getFullYear() === year;
      });

      days.push(
        <div key={d} className={`cal-day ${selectedDay === d ? 'selected' : ''}`} onClick={() => isMaster && setSelectedDay(d)}>
          <span className="cal-day-number">{d}</span>
          <div className="cal-events-list">
            {dayEvents.map((ev, idx) => (
              <div 
                key={idx} 
                className={`cal-event-pill ${ev.type} ${ev.isArena ? 'arena' : ''}`} 
                onClick={(e) => { e.stopPropagation(); setViewEvent(ev); }}
                title={ev.type === 'session' ? ev.missaoNome : 'Disponível'}
                style={ev.mestreCor ? { borderLeft: `4px solid ${ev.mestreCor}`, backgroundColor: ev.type === 'session' ? `${ev.mestreCor}30` : '' } : {}}
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

  const handleCreateSlot = () => {
    if (!selectedDay) return;
    const dateToSave = new Date(year, month, selectedDay);
    const [hh, mm] = newTime.split(':');
    dateToSave.setHours(hh, mm);
    onAddSlot(dateToSave.toISOString());
    setSelectedDay(null);
  };

  const handleEditSessionTime = (newDateStr) => {
    if (viewEvent && viewEvent.type === 'session') {
       onUpdateSession(viewEvent.id, newDateStr);
       setViewEvent(null);
    }
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
        
        {selectedDay && isMaster && (
            <div className="mini-modal-overlay">
                <div className="mini-modal">
                    <h4>Marcar Disponibilidade</h4>
                    <p>Dia {selectedDay} de {monthNames[month]}</p>
                    <label>Horário de Início:</label>
                    <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="ff-input-dark"/>
                    <div className="row-btns">
                        <button className="btn-cyan" onClick={handleCreateSlot}>CRIAR</button>
                        <button className="btn-red" onClick={() => setSelectedDay(null)}>CANCELAR</button>
                    </div>
                </div>
            </div>
        )}

        {viewEvent && (
            <div className="mini-modal-overlay">
                <div className="mini-modal detail">
                    {viewEvent.type === 'session' ? (
                        <>
                            <h4 style={{color: viewEvent.isArena ? '#a855f7' : (viewEvent.mestreCor || '#f44')}}>{viewEvent.isArena ? '⚔️ ARENA PVP' : '🛡️ SESSÃO AGENDADA'}</h4>
                            <h3>{viewEvent.missaoNome}</h3>
                            <p><strong>Horário Atual:</strong> {new Date(viewEvent.dataInicio).toLocaleString()}</p>
                            <p><strong>Narrador:</strong> <span style={{color: viewEvent.mestreCor || '#fff'}}>{viewEvent.mestreNome || "Desconhecido"}</span></p>
                            <div className="detail-players">
                                <strong>Jogadores:</strong>
                                {viewEvent.participantes?.join(', ') || "Nenhum"}
                            </div>
                            {isMaster && (
                                <div className="edit-time-box">
                                    <label>Alterar Horário:</label>
                                    <input 
                                        type="datetime-local" 
                                        className="ff-input-dark"
                                        onChange={(e) => handleEditSessionTime(e.target.value)}
                                    />
                                    <small>Selecione para mudar imediatamente.</small>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h4 style={{color: viewEvent.mestreCor || '#0f0'}}>✅ DISPONIBILIDADE</h4>
                            <p><strong>Data:</strong> {new Date(viewEvent.start).toLocaleString()}</p>
                            <p><strong>Narrador:</strong> <span style={{color: viewEvent.mestreCor || '#fff'}}>{viewEvent.mestreNome || "Desconhecido"}</span></p>
                            <p>Horário reservado para futuras sessões.</p>
                            {isMaster && (
                                <button className="btn-red" onClick={() => { onDeleteSlot(viewEvent.id); setViewEvent(null); }}>REMOVER DISPONIBILIDADE</button>
                            )}
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
        
        .cal-day { background: #1e293b; border: 1px solid #334155; padding: 5px; min-height: 100px; position: relative; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; }
        .cal-day:hover { background: #334155; }
        .cal-day.empty { background: transparent; border: none; cursor: default; }
        .cal-day.selected { border-color: #00f2ff; background: rgba(0, 242, 255, 0.1); }
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
        .row-btns { display: flex; gap: 10px; margin-top: 15px; }
        .edit-time-box { margin-top: 15px; border-top: 1px solid #333; padding-top: 10px; }
      `}</style>
    </div>
  );
};

export default function MestrePage() {
  const navigate = useNavigate();
  const [mobileTab, setMobileTab] = useState('missoes');

  // Libera scroll do body/html no mobile — removido ao sair da página
  useEffect(() => {
    const enableScroll = () => {
      document.documentElement.classList.add('page-scrollable');
    };
    const disableScroll = () => {
      document.documentElement.classList.remove('page-scrollable');
    };
    enableScroll();
    return () => disableScroll();
  }, []);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [missoes, setMissoes] = useState([]);
  const [sessoes, setSessoes] = useState([]); 
  const [personagensDb, setPersonagensDb] = useState([]);
  const [disponibilidades, setDisponibilidades] = useState([]); 
  const [allTrocas, setAllTrocas] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const [showModal, setShowModal] = useState(false); 
  const [showSessionModal, setShowSessionModal] = useState(false); 
  const [showCalendar, setShowCalendar] = useState(false); 
  const [selectedFicha, setSelectedFicha] = useState(null); 
  
  // --- ARENA STATES ---
  const [showArenaModal, setShowArenaModal] = useState(false);
  const [viewArenaManager, setViewArenaManager] = useState(null);
  const ARENA_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899'];
  const [arenaForm, setArenaForm] = useState({
      nomeEvento: '',
      selectedSlotId: '',
      equipes: [
          { id: 1, nome: 'Time Alpha', lider: '', max: 10, cor: '#ef4444', membros: [] },
          { id: 2, nome: 'Time Ômega', lider: '', max: 10, cor: '#3b82f6', membros: [] }
      ]
  });
  
  // --- MERCADO DOS LANTERNAS (TROCAS GLOBAIS) ---
  const [showMercadoModal, setShowMercadoModal] = useState(false);
  const [mercadoTab, setMercadoTab] = useState('pendentes'); 
  
  const [showDetails, setShowDetails] = useState(null); 
  const [viewImage, setViewImage] = useState(null); 
  const [viewMembers, setViewMembers] = useState(null); 
  const [exportSelectedIds, setExportSelectedIds] = useState([]);

  const [form, setForm] = useState({
    nome: '', local: '', contratante: '', descricaoMissao: '', objetivosMissao: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: ''
  });
  
  const [sessionForm, setSessionForm] = useState({
    missaoId: '', 
    selectedSlotId: '', 
    jogadores: []   
  });
  
  const [sessaoDestinatarios, setSessaoDestinatarios] = useState([]); 

  // Assinatura vinculada agora ao banco de dados por conta
  const [mestreIdentidade, setMestreIdentidade] = useState("Narrador");
  const [mestreCor, setMestreCor] = useState("#fbbf24");
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 2000); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (backgroundMusic) backgroundMusic.pause();

    const unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
            setCurrentUser(user);
            setProfileLoaded(false);

            // Busca os dados do Narrador específicos dessa conta no Firestore
            const profileRef = doc(db, "mestres_profiles", user.uid);
            const profileSnap = await getDoc(profileRef);
            if (profileSnap.exists()) {
                setMestreIdentidade(profileSnap.data().nome || "Narrador");
                setMestreCor(profileSnap.data().cor || "#fbbf24");
            } else {
                setMestreIdentidade("Narrador");
                setMestreCor("#fbbf24");
            }
            setProfileLoaded(true);

            const qM = query(collection(db, "missoes"), orderBy("createdAt", "desc"));
            const qS = query(collection(db, "sessoes"), orderBy("dataInicio", "asc"));
            const qD = query(collection(db, "disponibilidades"));
            const qC = query(collection(db, "characters"));
            const qT = query(collection(db, "mercado_lanternas"), orderBy("createdAt", "desc"));

            const unsubM = onSnapshot(qM, (snap) => setMissoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            const unsubS = onSnapshot(qS, (snap) => setSessoes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            const unsubD = onSnapshot(qD, (snap) => setDisponibilidades(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            const unsubT = onSnapshot(qT, (snap) => setAllTrocas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
            const unsubC = onSnapshot(qC, (snap) => {
                setPersonagensDb(snap.docs.map(d => {
                    const data = { id: d.id, ...d.data() };
                    return { ...data, class: getCharacterClass(data), race: getCharacterRace(data) };
                }));
                setLoading(false); 
            });

            return () => { unsubM(); unsubS(); unsubC(); unsubD(); unsubT(); };
        } else {
            setProfileLoaded(false);
            setLoading(false);
            navigate('/login'); 
        }
    });

    return () => unsub();
  }, [navigate]);

  // Salva no Firestore após carregar o perfil, quando o Narrador mudar nome ou cor
  useEffect(() => {
      if (currentUser && profileLoaded) {
          setDoc(doc(db, "mestres_profiles", currentUser.uid), {
              nome: mestreIdentidade,
              cor: mestreCor
          }, { merge: true }).catch(console.error);
      }
  }, [mestreIdentidade, mestreCor, currentUser, profileLoaded]);

  useEffect(() => {
      if (selectedFicha) {
          const updated = personagensDb.find(p => p.id === selectedFicha.id);
          if (updated) setSelectedFicha(updated);
      }
  }, [personagensDb]);

  // --- LÓGICA DE APROVAÇÃO/RECUSA DO MERCADO DOS LANTERNAS ---
  const trocasPendentes = allTrocas.filter(t => t.status === 'pendente_mestre');
  const trocasHistorico = allTrocas.filter(t => t.status !== 'pendente_mestre');

  const handleAprovarTroca = async (troca) => {
      if(!window.confirm("Autorizar transferência de recursos entre as fichas?")) return;
      
      const remetente = personagensDb.find(p => p.uid === troca.remetenteUid);
      const destinatario = personagensDb.find(p => p.uid === troca.destinatarioUid);
      
      if(!remetente || !destinatario) return alert("Erro: Um dos personagens não foi encontrado na base de dados.");

      const resultado = executarTransferenciaTroca(
          remetente.character_sheet.inventory,
          destinatario.character_sheet.inventory,
          troca
      );

      if (!resultado.success) {
          return alert(`Erro: ${resultado.error} (${remetente.name})`);
      }

      try {
          await updateDoc(doc(db, "characters", remetente.uid), { "character_sheet.inventory": resultado.remetenteInv });
          await updateDoc(doc(db, "characters", destinatario.uid), { "character_sheet.inventory": resultado.destInv });
          await updateDoc(doc(db, "mercado_lanternas", troca.id), { status: 'aprovado', resolvedAt: new Date().toISOString(), resolvedBy: mestreIdentidade });
          
          alert("Troca APROVADA! Recursos movidos automaticamente entre as fichas.");
      } catch(e) {
          alert("Falha de rede ao processar aprovação: " + e.message);
      }
  };

  const handleRecusarTroca = async (troca) => {
      if(!window.confirm(`Negar o pedido de troca de ${troca.remetente}?`)) return;
      try {
          await updateDoc(doc(db, "mercado_lanternas", troca.id), { 
              status: 'recusado', 
              resolvedAt: new Date().toISOString(), 
              resolvedBy: mestreIdentidade 
          });
      } catch(e) {
          alert("Erro: " + e.message);
      }
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await addDoc(collection(db, "missoes"), {
        ...form, mestreNome: mestreIdentidade, mestreCor: mestreCor, mestreId: currentUser.uid, createdAt: serverTimestamp()
      });
      setShowModal(false);
      setForm({ nome: '', local: '', contratante: '', descricaoMissao: '', objetivosMissao: '', requisitos: '', grupo: '', recompensa: '', rank: 'E', imagem: '', duracao: '', gilRecompensa: '' });
    } catch (err) { alert("Erro ao forjar cartaz: " + err.message); }
  };

  const handleRemoveCandidate = async (missaoId, candidate) => {
      if(window.confirm(`Remover ${candidate.nome} da missão?`)) {
          const missaoRef = doc(db, "missoes", missaoId);
          await updateDoc(missaoRef, {
              candidatos: arrayRemove(candidate)
          });
      }
  };

  const addAvailabilitySlot = async (isoDateString) => {
      if (!currentUser) return;
      try {
          await addDoc(collection(db, "disponibilidades"), {
              mestreId: currentUser.uid,
              mestreNome: mestreIdentidade,
              mestreCor: mestreCor,
              start: isoDateString,
              status: 'free'
          });
          alert("Disponibilidade criada!");
      } catch (e) {
          alert("Erro ao criar slot: " + e.message);
      }
  };

  const deleteAvailabilitySlot = async (id) => {
      if (!window.confirm("Remover esta disponibilidade?")) return;
      try {
          await deleteDoc(doc(db, "disponibilidades", id));
      } catch (e) {
          alert("Erro ao remover: " + e.message);
      }
  };

  const updateSessionTime = async (sessionId, newDateStr) => {
      if (!newDateStr) return;
      try {
          const inicio = new Date(newDateStr);
          const fim = new Date(inicio.getTime() + (24 * 60 * 60 * 1000));
          await updateDoc(doc(db, "sessoes", sessionId), {
              dataInicio: newDateStr,
              expiraEm: fim.toISOString()
          });
          alert("Horário da sessão atualizado!");
      } catch (e) {
          alert("Erro ao atualizar horário: " + e.message);
      }
  };

  const criarSessao = async (e) => {
      e.preventDefault();
      if (!sessionForm.missaoId || !sessionForm.selectedSlotId || !currentUser) return alert("Selecione a missão e um horário disponível!");
      
      try {
        const slot = disponibilidades.find(d => d.id === sessionForm.selectedSlotId);
        if (!slot) return alert("Horário inválido ou já ocupado.");

        const missaoObj = missoes.find(m => m.id === sessionForm.missaoId);
        const inicio = new Date(slot.start);
        const fim = new Date(inicio.getTime() + (24 * 60 * 60 * 1000)); 

        await addDoc(collection(db, "sessoes"), {
            missaoId: sessionForm.missaoId,
            missaoNome: missaoObj ? missaoObj.nome : "Missão Desconhecida",
            mestreId: currentUser.uid,
            mestreNome: mestreIdentidade,
            mestreCor: mestreCor,
            dataInicio: slot.start, 
            expiraEm: fim.toISOString(),
            participantes: sessaoDestinatarios, 
            jogadores: sessionForm.jogadores,
            connected_players: [],
            dm_online: false,
            createdAt: serverTimestamp()
        });

        await deleteDoc(doc(db, "disponibilidades", sessionForm.selectedSlotId));

        setShowSessionModal(false);
        setSessionForm({ missaoId: '', selectedSlotId: '', jogadores: [] });
        setSessaoDestinatarios([]);
        alert("Sessão agendada com sucesso!");
      } catch (err) {
          alert("Erro ao criar sessão: " + err.message);
      }
  };

  // --- ARENA PVP HANDLERS ---
  const handleAddTeam = () => {
      if(arenaForm.equipes.length >= 4) return;
      setArenaForm(prev => ({
          ...prev,
          equipes: [...prev.equipes, { id: Date.now(), nome: `Time ${prev.equipes.length + 1}`, lider: '', max: 10, cor: ARENA_COLORS[prev.equipes.length], membros: [] }]
      }));
  };

  const handleRemoveTeam = (id) => {
      setArenaForm(prev => ({
          ...prev,
          equipes: prev.equipes.filter(e => e.id !== id)
      }));
  };

  const updateTeamField = (teamId, field, value) => {
      setArenaForm(prev => ({
          ...prev,
          equipes: prev.equipes.map(eq => eq.id === teamId ? { ...eq, [field]: value } : eq)
      }));
  };

  const criarArena = async (e) => {
      e.preventDefault();
      if (!arenaForm.nomeEvento || !arenaForm.selectedSlotId || !currentUser) return alert("Preencha o evento e o horário!");
      
      try {
          const slot = disponibilidades.find(d => d.id === arenaForm.selectedSlotId);
          if (!slot) return alert("Horário inválido ou já ocupado.");

          const inicio = new Date(slot.start);
          const fim = new Date(inicio.getTime() + (24 * 60 * 60 * 1000)); 

          const equipesParaSalvar = arenaForm.equipes.map(eq => ({
              id: eq.id,
              nome: eq.nome || `Equipe ${eq.id}`,
              lider: eq.lider,
              max: Number(eq.max) || 10,
              cor: eq.cor,
              membros: eq.lider ? [eq.lider] : []
          }));

          let todosParticipantes = [];
          equipesParaSalvar.forEach(eq => {
              if(eq.lider) todosParticipantes.push(eq.lider);
          });

          await addDoc(collection(db, "sessoes"), {
              missaoNome: `⚔️ ARENA: ${arenaForm.nomeEvento}`,
              mestreId: currentUser.uid,
              mestreNome: mestreIdentidade,
              mestreCor: mestreCor,
              dataInicio: slot.start,
              expiraEm: fim.toISOString(),
              participantes: todosParticipantes,
              equipes: equipesParaSalvar,
              isArena: true,
              pvp_mode: true,
              jogadores: [],
              connected_players: [], dm_online: false,
              createdAt: serverTimestamp()
          });

          await deleteDoc(doc(db, "disponibilidades", arenaForm.selectedSlotId));

          setShowArenaModal(false);
          setArenaForm({ 
              nomeEvento: '', selectedSlotId: '',
              equipes: [{ id: 1, nome: 'Time Alpha', lider: '', max: 10, cor: '#ef4444', membros: [] }, { id: 2, nome: 'Time Ômega', lider: '', max: 10, cor: '#3b82f6', membros: [] }] 
          });
          alert("Arena agendada com sucesso!");
      } catch (err) {
          alert("Erro ao criar Arena: " + err.message);
      }
  };

  const handleRemovePlayerFromTeam = async (sessaoId, equipeId, jogadorNome) => {
      if(!window.confirm(`Remover ${jogadorNome} desta equipe?`)) return;
      
      const sessaoObj = sessoes.find(s => s.id === sessaoId);
      if(!sessaoObj) return;

      const novasEquipes = sessaoObj.equipes.map(eq => {
          if(eq.id === equipeId) {
              return { ...eq, membros: eq.membros.filter(m => m !== jogadorNome) };
          }
          return eq;
      });

      let novosParticipantes = [];
      novasEquipes.forEach(eq => novosParticipantes.push(...eq.membros));

      await updateDoc(doc(db, "sessoes", sessaoId), {
          equipes: novasEquipes,
          participantes: novosParticipantes
      });
  };

  const enterVTT = (sessao) => {
      navigate('/mestre-vtt');
  };

  const handleOpenFicha = (charId) => {
      const personagem = personagensDb.find(p => p.id === charId);
      if (personagem) setSelectedFicha(personagem);
  };

  const handleToggleExportSelect = (charId) => {
      setExportSelectedIds(prev =>
          prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
      );
  };

  const getSelectedCharactersForExport = () => {
      const selected = personagensDb.filter(p => exportSelectedIds.includes(p.id));
      if (selected.length === 0) {
          alert("Nenhum personagem selecionado.");
          return null;
      }
      return selected;
  };

  const handleExportSelectedCharacters = () => {
      const selected = getSelectedCharactersForExport();
      if (!selected) return;
      exportCharactersAsMarkdown(selected);
  };

  const handleExportSelectedCharactersJson = () => {
      const selected = getSelectedCharactersForExport();
      if (!selected) return;
      exportCharactersAsJson(selected);
  };

  const handleDeleteSession = async (sessao) => {
      if (!window.confirm(`Tem certeza que deseja cancelar a sessão "${sessao.missaoNome}"?`)) return;
      
      try {
          if (sessao.equipes) {
              for (let eq of sessao.equipes) {
                  const msgsRef = collection(db, "sessoes", sessao.id, "team_chats", eq.id.toString(), "messages");
                  const msgsSnap = await getDocs(msgsRef);
                  const deletePromises = msgsSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
                  await Promise.all(deletePromises);
              }
          }
          await deleteDoc(doc(db, "sessoes", sessao.id));
      } catch (err) {
          console.error("Erro ao deletar sessão e chats:", err);
      }
  };

  if (loading || !minTimeElapsed) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', width: '100vw', 
        background: 'radial-gradient(circle at center, #001a33 0%, #000000 100%)', 
        color: '#ffcc00', fontFamily: 'Cinzel, serif', zIndex: 9999, position: 'fixed', top: 0, left: 0
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

  return (
    <div className="mestre-container">
      <div className="mestre-bg-image-full" style={{backgroundImage: `url(${fundoMestre})`}}></div>
      
      <div className="mestre-content">
        {exportSelectedIds.length > 0 && (
            <div className="export-float-bar">
                <span className="export-float-count">
                    {exportSelectedIds.length} selecionado{exportSelectedIds.length > 1 ? 's' : ''}
                </span>
                <button className="btn-export-md" onClick={handleExportSelectedCharacters}>
                    📥 EXPORTAR (.MD)
                </button>
                <button className="btn-export-json" onClick={handleExportSelectedCharactersJson}>
                    📥 EXPORTAR (.JSON)
                </button>
                <button className="btn-export-clear" onClick={() => setExportSelectedIds([])} title="Limpar seleção">
                    ✕
                </button>
            </div>
        )}

        <div className="top-bar-flex">
            <h1 className="ff-title">HUB DO NARRADOR</h1>
            
            <div className="mestre-identity-box ff-card fade-in">
                <label>ASSINATURA:</label>
                <input type="text" value={mestreIdentidade} onChange={(e) => setMestreIdentidade(e.target.value)} />
                <label className="label-cor-narrador">COR:</label>
                <input type="color" value={mestreCor} onChange={(e) => setMestreCor(e.target.value)} style={{width: '30px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer'}} />
            </div>
        </div>

        {/* --- NAVEGAÇÃO MOBILE POR ABAS --- */}
        <div className="mobile-tab-nav">
            <button
                className={`mob-tab ${mobileTab === 'missoes' ? 'active' : ''}`}
                onClick={() => setMobileTab('missoes')}
            >
                📜 MISSÕES
            </button>
            <button
                className={`mob-tab ${mobileTab === 'rank' ? 'active' : ''}`}
                onClick={() => setMobileTab('rank')}
            >
                🏆 RANK
            </button>
            <button
                className={`mob-tab ${mobileTab === 'sessoes' ? 'active' : ''}`}
                onClick={() => setMobileTab('sessoes')}
            >
                🎮 SESSÕES
            </button>
        </div>
        
        <div className="mestre-grid">
          {/* COLUNA 1: MISSÕES */}
          <div className={`ff-card board-column ${mobileTab !== 'missoes' ? 'mob-hidden' : ''}`}>
            <div className="card-header no-border">
              <h3>QUADRO DE MISSÕES</h3>
              <button className="ff-add-btn" onClick={() => setShowModal(true)}><span>+</span> ADICIONAR CARTAZ</button>
            </div>
            <div className="mission-scroll">
              {missoes.map(m => {
                const maxGroup = parseInt(m.grupo) || 0;
                const currentGroup = m.candidatos ? m.candidatos.length : 0;
                const fillPercent = maxGroup > 0 ? (currentGroup / maxGroup) * 100 : 0;
                const isFull = currentGroup >= maxGroup && maxGroup > 0;

                return (
                    <div key={m.id} className={`mission-poster rank-${m.rank}`} style={{borderColor: m.mestreCor || '#334155'}}>
                    <div className="poster-rank-label-fixed">{m.rank}</div>
                    <span className="mestre-tag" style={{color: m.mestreCor || '#94a3b8'}}>Narrador: {m.mestreNome}</span>
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

                    {m.candidatos && m.candidatos.length > 0 && (
                        <div className="candidates-mini-box">
                        <strong>Candidatos:</strong>
                        {m.candidatos.map(c => (
                            <div key={c.uid} className="cand-row-master">
                                <span style={{color: c.isLeader ? '#ffcc00' : '#ccc'}}>
                                    {c.isLeader && '👑'} {c.nome} ({c.classe})
                                </span>
                                <button className="btn-kick-x" title="Remover Jogador" onClick={() => handleRemoveCandidate(m.id, c)}>×</button>
                            </div>
                        ))}
                        </div>
                    )}
                    
                    <div className="poster-actions" style={{marginTop: '10px'}}>
                        <button className="btn-cyan" onClick={() => setViewImage(m.imagem)}>CARTAZ</button>
                        <button className="btn-cyan" onClick={() => setShowDetails(m)}>DETALHES</button>
                        <button className="btn-red" onClick={() => deleteDoc(doc(db, "missoes", m.id))}>EXCLUIR</button>
                    </div>
                    </div>
                );
              })}
            </div>
          </div>

          {/* COLUNA 2: RANK DA TEMPORADA + GESTÃO DE PERSONAGENS */}
          <div className={`ff-card rank-card board-column ${mobileTab !== 'rank' ? 'mob-hidden' : ''}`}>
            <div className="card-header no-border">
              <h3>RANK DA TEMPORADA</h3>
            </div>
            <div className="mission-scroll rank-scroll-panel">
              <GuildBoard
                isMaster={true}
                embedded={true}
                onOpenFicha={handleOpenFicha}
                selectedCharIds={exportSelectedIds}
                onToggleSelect={handleToggleExportSelect}
              />
            </div>
          </div>

          {/* COLUNA 3: SESSÕES */}
          <div className={`ff-card board-column ${mobileTab !== 'sessoes' ? 'mob-hidden' : ''}`}>
            <div className="card-header no-border" style={{display:'flex', gap:'5px', flexWrap: 'wrap'}}>
              <h3>SESSÕES DE JOGO</h3>
              <div style={{display:'flex', gap:'5px'}}>
                <button className="ff-add-btn small-btn" onClick={() => setShowCalendar(true)}>📅 AGENDA</button>
                <button className="ff-add-btn small-btn" onClick={() => setShowSessionModal(true)}>+ SESSÃO</button>
                <button className="ff-add-btn small-btn" style={{borderColor: '#a855f7', color: '#a855f7'}} onClick={() => setShowArenaModal(true)}>⚔️ ARENA</button>
              </div>
            </div>
            <div className="mission-scroll">
               {sessoes.length === 0 ? (
                   <div className="empty-instancia">NENHUMA INSTÂNCIA ATIVA</div>
               ) : (
                   sessoes.map(s => (
                       <div key={s.id} className={`sessao-card ${s.isArena ? 'arena-mode' : ''}`} style={s.mestreCor ? {borderLeft: `4px solid ${s.mestreCor}`} : {}}>
                           <div className={`sessao-status ${s.isArena ? 'arena' : ''}`}>{s.isArena ? '⚔️ ARENA PVP' : '🔴 AO VIVO / AGENDADA'}</div>
                           <h4 className="sessao-title" style={{color: s.isArena ? '#c4b5fd' : '#fff'}}>{s.missaoNome}</h4>
                           <div className="sessao-info">
                               <span>📅 {new Date(s.dataInicio).toLocaleString()}</span>
                               <span style={{color: s.mestreCor || '#94a3b8', fontWeight: 'bold'}}>Narrador: {s.mestreNome || 'Desconhecido'}</span>
                               <span className="sessao-players">👥 {s.participantes?.length || 0} Jogadores</span>
                           </div>
                           <div className="poster-actions" style={{marginTop: '15px'}}>
                               {s.isArena ? (
                                   <button className="btn-cyan arena-btn" onClick={() => setViewArenaManager(s)}>⚔️ GERENCIAR TIMES</button>
                               ) : (
                                   <button className="btn-cyan" onClick={() => setViewMembers(s)}>👥 MEMBROS</button>
                               )}
                               <button className="btn-play-vtt" onClick={() => enterVTT(s)}>▶ ACESSAR VTT</button>
                               <button className="btn-red" onClick={() => handleDeleteSession(s)}>CANCELAR</button>
                           </div>
                       </div>
                   ))
               )}
            </div>
          </div>
        </div>
      </div>

      {/* --- DOCK DOS BOTÕES FLUTUANTES --- */}
      <div className="mobile-float-dock-bg" aria-hidden="true" />
      <div className="dm-floating-container">
          <button className="dm-float-btn btn-trocas-dm" onClick={() => setShowMercadoModal(true)} title="Mercado dos Lanternas">
              🏮
              {trocasPendentes.length > 0 && <span className="notification-badge-dm">{trocasPendentes.length}</span>}
          </button>
      </div>
      <Bazar isMestre={true} />
      <Forja />

      {/* MODAL DE CALENDÁRIO */}
      {showCalendar && (
        <CalendarSystem 
            onClose={() => setShowCalendar(false)} 
            isMaster={true}
            disponibilidades={disponibilidades}
            sessoes={sessoes}
            onAddSlot={addAvailabilitySlot}
            onUpdateSession={updateSessionTime}
            onDeleteSlot={deleteAvailabilitySlot}
        />
      )}

      {/* MODAL GESTÃO MERCADO DOS LANTERNAS (TROCAS) */}
      {showMercadoModal && (
          <div className="ff-modal-overlay-fixed" onClick={() => setShowMercadoModal(false)}>
              <div className="ff-modal-scrollable ff-card" onClick={e => e.stopPropagation()} style={{width: '900px', height: '80vh', display: 'flex', flexDirection: 'column'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #334155', paddingBottom:'15px', marginBottom:'20px'}}>
                      <h3 style={{margin:0, color:'#fbbf24', fontSize:'1.5rem', letterSpacing:'2px'}}>🏮 MERCADO DOS LANTERNAS</h3>
                      <button className="btn-close-cal" onClick={() => setShowMercadoModal(false)}>✕</button>
                  </div>

                  <div className="mercado-tabs">
                      <button className={mercadoTab === 'pendentes' ? 'active' : ''} onClick={() => setMercadoTab('pendentes')}>
                          APROVAÇÕES PENDENTES ({trocasPendentes.length})
                      </button>
                      <button className={mercadoTab === 'historico' ? 'active' : ''} onClick={() => setMercadoTab('historico')}>
                          HISTÓRICO GERAL
                      </button>
                  </div>

                  <div className="mercado-content custom-scrollbar" style={{flex:1, overflowY:'auto', paddingRight:'10px'}}>
                      {mercadoTab === 'pendentes' && (
                          <div className="mercado-grid">
                              {trocasPendentes.length === 0 && <p style={{color:'#64748b', textAlign:'center', gridColumn:'1/-1', fontStyle:'italic', marginTop:'20px'}}>Nenhuma transação aguardando análise.</p>}
                              {trocasPendentes.map(t => (
                                  <div key={t.id} className="troca-card-dm" style={{borderColor: '#00f2ff'}}>
                                      <div className="tc-header" style={{background: 'rgba(0, 242, 255, 0.1)'}}>
                                          <span>De: <strong>{t.remetente}</strong></span>
                                          <span>Para: <strong>{t.destinatario}</strong></span>
                                      </div>
                                      <div className="tc-body">
                                          <p><strong>Itens:</strong> {t.itens?.map(i => `${i.quantidade}x ${i.name}`).join(', ') || 'Nenhum'}</p>
                                          <p><strong>Gil:</strong> <span style={{color:'#fbbf24'}}>{t.gil}</span></p>
                                          {t.mensagem && <p className="tc-msg">"{t.mensagem}"</p>}
                                      </div>
                                      <div className="tc-footer">
                                          <button className="btn-approve-dm" onClick={() => handleAprovarTroca(t)}>✓ APROVAR</button>
                                          <button className="btn-reject-dm" onClick={() => handleRecusarTroca(t)}>✕ BARRAR</button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}

                      {mercadoTab === 'historico' && (
                          <div className="mercado-list">
                              {trocasHistorico.length === 0 && <p style={{color:'#64748b', textAlign:'center', fontStyle:'italic', marginTop:'20px'}}>Nenhum registro encontrado.</p>}
                              {trocasHistorico.map(t => {
                                  const dateStr = new Date(t.createdAt).toLocaleString('pt-BR');
                                  const resDateStr = t.resolvedAt ? new Date(t.resolvedAt).toLocaleString('pt-BR') : '';
                                  const isAprovado = t.status === 'aprovado';
                                  return (
                                      <div key={t.id} className="historico-row-dm" style={{borderLeftColor: isAprovado ? '#22c55e' : '#ef4444'}}>
                                          <div className="hist-main-info">
                                              <span className="hist-date">{dateStr}</span>
                                              <strong>{t.remetente} ➔ {t.destinatario}</strong>
                                              <span className="hist-items">{t.itens?.map(i => `${i.quantidade}x ${i.name}`).join(', ') || 'Nenhum'} | {t.gil} Gil</span>
                                          </div>
                                          <div className="hist-status-col">
                                              <span style={{color: isAprovado ? '#22c55e' : '#ef4444', fontWeight:'bold', fontSize:'14px'}}>
                                                  {isAprovado ? 'APROVADO' : 'RECUSADO'}
                                              </span>
                                              <span className="hist-gm">por {t.resolvedBy || 'Sistema'} em {resDateStr}</span>
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {selectedFicha && (
          <Ficha 
            characterData={selectedFicha} 
            isMaster={true} 
            onClose={() => setSelectedFicha(null)} 
          />
      )}

      {/* --- MODAL DA ARENA PVP --- */}
      {showArenaModal && (
          <div className="ff-modal-overlay-fixed">
              <div className="ff-modal-scrollable ff-card" style={{border: '2px solid #a855f7'}}>
                  <h3 className="modal-title-ff" style={{color: '#a855f7', borderBottomColor: '#a855f7'}}>EVENTO PVP (ARENA)</h3>
                  <form onSubmit={criarArena}>
                      <div className="modal-input-group">
                          <label style={{color: '#c4b5fd'}}>NOME DO EVENTO ARENA</label>
                          <input placeholder="Ex: Torneio de Nibelheim" value={arenaForm.nomeEvento} onChange={e=>setArenaForm({...arenaForm, nomeEvento: e.target.value})} required style={{borderColor: '#8b5cf6'}} />
                      </div>
                      <div className="modal-input-group">
                          <label style={{color: '#c4b5fd'}}>HORÁRIO DA ARENA (AGENDA)</label>
                          <select className="ff-select-dark" value={arenaForm.selectedSlotId} onChange={e => setArenaForm({...arenaForm, selectedSlotId: e.target.value})} required style={{borderColor: '#8b5cf6'}}>
                              <option value="">-- Selecione um Horário --</option>
                              {disponibilidades.filter(d => new Date(d.start) > new Date()).sort((a,b) => new Date(a.start) - new Date(b.start)).map(d => (
                                  <option key={d.id} value={d.id}>{new Date(d.start).toLocaleString()}</option>
                              ))}
                          </select>
                      </div>

                      <div className="arena-teams-section">
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                              <h4 style={{color: '#fbbf24', margin:0}}>TIMES ({arenaForm.equipes.length}/4)</h4>
                              <button type="button" className="btn-cyan" onClick={handleAddTeam} style={{padding: '5px 10px'}} disabled={arenaForm.equipes.length >= 4}>+ NOVO TIME</button>
                          </div>
                          
                          {arenaForm.equipes.map((equipe, index) => (
                              <div key={equipe.id} className="team-setup-box" style={{borderLeft: `4px solid ${equipe.cor}`}}>
                                  <div className="ts-header">
                                      <input type="text" value={equipe.nome} onChange={e => updateTeamField(equipe.id, 'nome', e.target.value)} placeholder={`Nome do Time ${index + 1}`} required />
                                      {arenaForm.equipes.length > 2 && <button type="button" onClick={() => handleRemoveTeam(equipe.id)} className="btn-remove-x">×</button>}
                                  </div>
                                  <div className="ts-body">
                                      <div className="ts-field">
                                          <label>LÍDER (Obrigatório)</label>
                                          <select value={equipe.lider} onChange={e => updateTeamField(equipe.id, 'lider', e.target.value)} required>
                                              <option value="">-- Escolher Líder --</option>
                                              {personagensDb.map(p => <option key={p.id} value={p.name}>{p.name} ({p.class})</option>)}
                                          </select>
                                      </div>
                                      <div className="ts-field">
                                          <label>MÁXIMO DE JOGADORES</label>
                                          <input type="number" min="1" max="20" value={equipe.max} onChange={e => updateTeamField(equipe.id, 'max', e.target.value)} required />
                                      </div>
                                      <div className="ts-field">
                                          <label>COR DO TIME</label>
                                          <div className="color-picker-grid">
                                              {ARENA_COLORS.map(c => (
                                                  <div key={c} className={`color-swatch ${equipe.cor === c ? 'selected' : ''}`} style={{backgroundColor: c}} onClick={() => updateTeamField(equipe.id, 'cor', c)}></div>
                                              ))}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="btn-group-ff">
                          <button type="submit" className="btn-forjar-main" style={{background: '#a855f7'}}>CRIAR ARENA</button>
                          <button type="button" className="btn-cancelar-main" onClick={() => setShowArenaModal(false)}>CANCELAR</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- MODAL GERENCIAR TIMES DA ARENA --- */}
      {viewArenaManager && (
          <div className="ff-modal-overlay-fixed" onClick={() => setViewArenaManager(null)}>
              <div className="ff-modal-scrollable ff-card" onClick={e => e.stopPropagation()} style={{border: '2px solid #a855f7', width: '800px'}}>
                  <h3 className="modal-title-ff" style={{color: '#a855f7', borderBottomColor: '#a855f7'}}>GERENCIAR TIMES - {viewArenaManager.missaoNome}</h3>
                  <div className="arena-manager-grid">
                      {viewArenaManager.equipes?.map(equipe => (
                          <div key={equipe.id} className="arena-team-card" style={{borderColor: equipe.cor}}>
                              <div className="atc-header" style={{background: `linear-gradient(90deg, ${equipe.cor}40, transparent)`}}>
                                  <h4 style={{color: equipe.cor}}>{equipe.nome}</h4>
                                  <span>{equipe.membros.length} / {equipe.max}</span>
                              </div>
                              <div className="atc-members">
                                  {equipe.membros.length === 0 && <span style={{color:'#666', fontStyle:'italic'}}>Vazio</span>}
                                  {equipe.membros.map((membro, i) => (
                                      <div key={i} className="atc-member-row">
                                          <span>{membro === equipe.lider ? '👑' : '👤'} {membro}</span>
                                          {membro !== equipe.lider && (
                                              <button className="btn-kick-x" onClick={() => handleRemovePlayerFromTeam(viewArenaManager.id, equipe.id, membro)}>×</button>
                                          )}
                                      </div>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
                  <button className="btn-cancelar-main" style={{marginTop: '20px', width: '100%'}} onClick={() => setViewArenaManager(null)}>FECHAR</button>
              </div>
          </div>
      )}

      {/* --- OUTROS MODAIS --- */}
      {showModal && (
        <div className="ff-modal-overlay-fixed">
          <div className="ff-modal-scrollable ff-card">
            <h3 className="modal-title-ff">NOVA MISSÃO</h3>
            <form onSubmit={handleCreateMission}>
              <div className="modal-input-group"><label>NOME DA MISSÃO</label><input placeholder="Título..." value={form.nome} onChange={e=>setForm({...form, nome: e.target.value})} required /></div>
              <div className="modal-input-group"><label>LOCAL</label><input placeholder="Onde ocorre..." value={form.local} onChange={e=>setForm({...form, local: e.target.value})} /></div>
              <div className="modal-input-group"><label>CONTRATANTE</label><input placeholder="Quem paga..." value={form.contratante} onChange={e=>setForm({...form, contratante: e.target.value})} /></div>
              <div className="modal-input-group"><label>DESCRIÇÃO DA MISSÃO</label><textarea className="tall-area-dark" placeholder="Detalhes da história e contexto..." value={form.descricaoMissao} onChange={e=>setForm({...form, descricaoMissao: e.target.value})} /></div>
              <div className="modal-input-group"><label>OBJETIVOS DA MISSÃO</label><textarea className="tall-area-dark" placeholder="O que deve ser feito passo a passo..." value={form.objetivosMissao} onChange={e=>setForm({...form, objetivosMissao: e.target.value})} /></div>
              <div className="modal-input-group"><label>REQUISITOS DA MISSÃO</label><textarea className="tall-area-dark" placeholder="O que é necessário para aceitar..." value={form.requisitos} onChange={e=>setForm({...form, requisitos: e.target.value})} /></div>
              <div className="row-double-ff">
                <div className="field-group"><label>GRUPO MÁXIMO</label><input placeholder="Ex: 4" value={form.grupo} onChange={e=>setForm({...form, grupo: e.target.value})} /></div>
                <div className="field-group"><label>RANK</label><select value={form.rank} onChange={e=>setForm({...form, rank: e.target.value})}>{['E','D','C','B','A','S','SS','SC'].map(r => <option key={r} value={r}>RANK {r}</option>)}</select></div>
              </div>
              <div className="modal-input-group"><label>RECOMPENSAS EXTRAS</label><textarea className="tall-area-dark" placeholder="Itens, especiarias..." value={form.recompensa} onChange={e=>setForm({...form, recompensa: e.target.value})} /></div>
              <div className="row-double-ff">
                <div className="field-group"><label>GIL</label><input type="text" className="gil-input" placeholder="Ex: 5000" value={form.gilRecompensa} onChange={e => setForm({...form, gilRecompensa: e.target.value.replace(/\D/g, '')})} /></div>
                <div className="field-group"><label>DURAÇÃO</label><input placeholder="Ex: 1d 10h" value={form.duracao} onChange={e=>setForm({...form, duracao: e.target.value})} required /></div>
              </div>
              <div className="modal-input-group"><label>IMAGEM</label><input placeholder="Link Imgur..." value={form.imagem} onChange={e=>setForm({...form, imagem: e.target.value})} /></div>
              <div className="btn-group-ff"><button type="submit" className="btn-forjar-main">FORJAR MISSÃO</button><button type="button" className="btn-cancelar-main" onClick={() => setShowModal(false)}>FECHAR</button></div>
            </form>
          </div>
        </div>
      )}

      {showSessionModal && (
          <div className="ff-modal-overlay-fixed">
              <div className="ff-modal-scrollable ff-card">
                  <h3 className="modal-title-ff">CRIAR NOVA SESSÃO</h3>
                  <form onSubmit={criarSessao}>
                      <div className="modal-input-group"><label>SELECIONAR MISSÃO</label><select className="ff-select-dark" value={sessionForm.missaoId} onChange={e => setSessionForm({...sessionForm, missaoId: e.target.value})} required><option value="">-- Escolha --</option>{missoes.map(m => <option key={m.id} value={m.id}>{m.nome} (Rank {m.rank})</option>)}</select></div>
                      
                      <div className="modal-input-group">
                          <label>HORÁRIO DISPONÍVEL (DA AGENDA)</label>
                          <select className="ff-select-dark" value={sessionForm.selectedSlotId} onChange={e => setSessionForm({...sessionForm, selectedSlotId: e.target.value})} required>
                              <option value="">-- Selecione um Horário --</option>
                              {disponibilidades
                                  .filter(d => new Date(d.start) > new Date())
                                  .sort((a,b) => new Date(a.start) - new Date(b.start))
                                  .map(d => (
                                      <option key={d.id} value={d.id}>
                                          {new Date(d.start).toLocaleString()}
                                      </option>
                                  ))
                              }
                          </select>
                      </div>

                      <div className="player-selector-box-fixed"><label>JOGADORES:</label><div className="destinatarios-grid-fixed">{personagensDb.map(p => (<label key={p.id} className="chip-label-ff"><input type="checkbox" checked={sessaoDestinatarios.includes(p.name)} onChange={() => sessaoDestinatarios.includes(p.name) ? setSessaoDestinatarios(sessaoDestinatarios.filter(x=>x!==p.name)) : setSessaoDestinatarios([...sessaoDestinatarios, p.name])} /> {p.name} ({p.class})</label>))}</div></div>
                      
                      <div className="btn-group-ff"><button type="submit" className="btn-forjar-main">AGENDAR</button><button type="button" className="btn-cancelar-main" onClick={() => setShowSessionModal(false)}>CANCELAR</button></div>
                  </form>
              </div>
          </div>
      )}

      {viewMembers && (
          <div className="ff-modal-overlay-fixed" onClick={() => setViewMembers(null)}>
              <div className="ff-modal-scrollable ff-card" onClick={e => e.stopPropagation()} style={{height: 'auto', maxHeight: '500px'}}>
                  <h3 className="modal-title-ff">MEMBROS ALOCADOS</h3>
                  <div className="destinatarios-grid-fixed">{viewMembers.participantes?.map((nome, idx) => (<div key={idx} className="chip-label-ff" style={{cursor: 'default', color: '#fff', borderColor: '#00f2ff'}}>👤 {nome}</div>))}</div>
                  <button className="btn-cancelar-main" style={{marginTop: '20px', width: '100%'}} onClick={() => setViewMembers(null)}>FECHAR</button>
              </div>
          </div>
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

      <style>{`
        /* --- ESTILOS PRINCIPAIS MESTRE --- */
        .mestre-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; background: #020617; font-family: 'Cinzel', serif; color: #e2e8f0; }
        .mestre-bg-image-full { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.3; z-index: 0; animation: slowPan 60s infinite alternate; }
        @keyframes slowPan { from { transform: scale(1.0); } to { transform: scale(1.1); } }
        
        .mestre-content { position: relative; z-index: 10; height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }

        .export-float-bar {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 12px;
            background: rgba(15, 23, 42, 0.95);
            border: 2px solid #00f2ff;
            border-radius: 8px;
            padding: 10px 18px;
            box-shadow: 0 0 25px rgba(0, 242, 255, 0.25);
            backdrop-filter: blur(8px);
            animation: exportBarIn 0.25s ease-out;
        }
        @keyframes exportBarIn {
            from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .export-float-count {
            color: #94a3b8;
            font-size: 0.8rem;
            font-weight: bold;
            letter-spacing: 1px;
            white-space: nowrap;
        }
        .btn-export-md {
            background: linear-gradient(135deg, #00f2ff, #0891b2);
            color: #000;
            border: none;
            padding: 10px 20px;
            font-weight: bold;
            font-family: 'Cinzel', serif;
            letter-spacing: 1px;
            cursor: pointer;
            border-radius: 4px;
            transition: 0.2s;
            font-size: 0.85rem;
            white-space: nowrap;
        }
        .btn-export-md:hover {
            box-shadow: 0 0 15px rgba(0, 242, 255, 0.5);
            transform: scale(1.02);
        }
        .btn-export-json {
            background: linear-gradient(135deg, #a855f7, #7c3aed);
            color: #fff;
            border: none;
            padding: 10px 20px;
            font-weight: bold;
            font-family: 'Cinzel', serif;
            letter-spacing: 1px;
            cursor: pointer;
            border-radius: 4px;
            transition: 0.2s;
            font-size: 0.85rem;
            white-space: nowrap;
        }
        .btn-export-json:hover {
            box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
            transform: scale(1.02);
        }
        .btn-export-clear {
            background: transparent;
            border: 1px solid #475569;
            color: #94a3b8;
            width: 28px;
            height: 28px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.2s;
        }
        .btn-export-clear:hover { border-color: #ef4444; color: #ef4444; }
        .top-bar-flex { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
        .ff-title { font-size: 2rem; color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.5); letter-spacing: 4px; margin: 0; }
        .mestre-identity-box { padding: 10px 20px; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.6); border: 1px solid #fbbf24; border-radius: 4px; flex-wrap: wrap; }
        .mestre-identity-box label { font-size: 0.8rem; color: #fbbf24; font-weight: bold; }
        .mestre-identity-box input[type="text"] { background: transparent; border: none; border-bottom: 1px solid #555; color: #fff; font-family: 'Cinzel', serif; text-align: center; width: 150px; }
        
        .mestre-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; flex: 1; min-height: 0; }
        .board-column { display: flex; flex-direction: column; height: 100%; background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-radius: 8px; overflow: hidden; backdrop-filter: blur(5px); box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
        .card-header { padding: 15px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); }
        .card-header h3 { margin: 0; color: #e2e8f0; font-size: 1rem; letter-spacing: 2px; }
        .no-border { border-bottom: none !important; }
        
        .mission-scroll { flex: 1; overflow-y: auto; padding: 15px; display: flex; flex-direction: column; gap: 15px; scrollbar-width: thin; scrollbar-color: #fbbf24 #0f172a; }
        .mission-scroll::-webkit-scrollbar { width: 6px; }
        .mission-scroll::-webkit-scrollbar-thumb { background: #fbbf24; border-radius: 3px; }
        
        /* CARD MISSÃO */
        .mission-poster { background: #1e293b; border: 1px solid #334155; padding: 15px; border-radius: 4px; position: relative; transition: transform 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .mission-poster:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.3); border-color: #fbbf24; }
        .mission-poster h4 { margin: 25px 0 5px 0; color: #fbbf24; font-size: 1.1rem; text-transform: uppercase; }
        .poster-rank-label-fixed { position: absolute; top: 10px; right: 10px; font-weight: 900; font-size: 1.5rem; opacity: 0.3; color: #fff; }
        .mestre-tag { font-size: 0.7rem; color: #94a3b8; display: block; margin-bottom: 5px; }
        .gil-recompensa { font-size: 0.9rem; color: #fcd34d; font-weight: bold; margin-bottom: 10px; }
        
        .vagas-container { background: #0f172a; padding: 8px; border-radius: 4px; margin-bottom: 10px; border: 1px solid #334155; }
        .vagas-labels { display: flex; justify-content: space-between; font-size: 0.7rem; color: #cbd5e1; margin-bottom: 4px; }
        .vagas-track { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; }
        .vagas-fill { height: 100%; transition: width 0.3s ease; }
        
        .candidates-mini-box { background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; margin-bottom: 10px; font-size: 0.75rem; }
        .cand-row-master { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-bottom: 2px; border-bottom: 1px dashed #334155; }
        .btn-kick-x { background: transparent; border: none; color: #ef4444; cursor: pointer; font-weight: bold; font-size: 14px; }
        .btn-kick-x:hover { color: #f87171; }
        
        .poster-actions { display: flex; gap: 5px; justify-content: space-between; }
        .btn-cyan { flex: 1; padding: 6px; font-size: 0.7rem; background: transparent; border: 1px solid #00f2ff; color: #00f2ff; cursor: pointer; transition: 0.2s; font-weight: bold; text-transform: uppercase; }
        .btn-cyan:hover { background: rgba(0, 242, 255, 0.1); }
        .btn-red { flex: 1; padding: 6px; font-size: 0.7rem; background: transparent; border: 1px solid #ef4444; color: #ef4444; cursor: pointer; transition: 0.2s; font-weight: bold; }
        .btn-red:hover { background: rgba(239, 68, 68, 0.1); }
        
        /* RANK DA TEMPORADA */
        .rank-card { border-color: #fbbf24; }
        .rank-scroll-panel { padding: 15px; position: relative; display: flex; flex-direction: column; overflow: hidden; }
        
        /* SESSÕES E ARENA */
        .sessao-card { background: #1e293b; border: 1px solid #fbbf24; padding: 15px; border-radius: 4px; position: relative; margin-bottom: 15px; }
        .sessao-card.arena-mode { border-color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.2); }
        .sessao-status { position: absolute; top: -10px; left: 10px; background: #fbbf24; color: #000; font-size: 0.6rem; font-weight: bold; padding: 2px 6px; border-radius: 2px; }
        .sessao-status.arena { background: #a855f7; color: #fff; }
        .sessao-title { margin: 10px 0 5px 0; color: #fff; font-size: 1.1rem; }
        .sessao-info { font-size: 0.8rem; color: #94a3b8; display: flex; flex-direction: column; gap: 2px; }
        .btn-play-vtt { background: #fbbf24; color: #000; border: none; padding: 8px; font-weight: bold; cursor: pointer; flex: 2; transition: 0.2s; }
        .btn-play-vtt:hover { background: #f59e0b; box-shadow: 0 0 10px rgba(251, 191, 36, 0.4); }
        .btn-cyan.arena-btn { border-color: #a855f7; color: #a855f7; flex: 2; }
        .btn-cyan.arena-btn:hover { background: rgba(168, 85, 247, 0.2); color: #fff; }
        .empty-instancia { text-align: center; color: #475569; padding: 20px; font-style: italic; border: 2px dashed #334155; border-radius: 8px; }

        /* ESTILOS DA ARENA (FORMULARIO E GERENCIAMENTO) */
        .arena-teams-section { background: rgba(0,0,0,0.2); border: 1px solid #333; padding: 15px; border-radius: 6px; margin-top: 15px; }
        .team-setup-box { background: #1e293b; padding: 10px; border-radius: 4px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 10px; }
        .ts-header { display: flex; justify-content: space-between; align-items: center; }
        .ts-header input { background: transparent; border: none; border-bottom: 1px solid #444; color: #fff; font-size: 14px; font-weight: bold; width: 60%; outline: none; }
        .ts-body { display: flex; gap: 15px; }
        .ts-field { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .ts-field label { font-size: 10px; color: #aaa; }
        .ts-field select, .ts-field input[type="number"] { background: #0f172a; border: 1px solid #444; color: #fff; padding: 5px; border-radius: 4px; }
        .color-picker-grid { display: flex; gap: 5px; flex-wrap: wrap; }
        .color-swatch { width: 20px; height: 20px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: 0.2s; }
        .color-swatch.selected { border-color: #fff; transform: scale(1.2); box-shadow: 0 0 10px rgba(255,255,255,0.5); }

        .arena-manager-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
        .arena-team-card { background: #1e293b; border-left: 4px solid; border-radius: 4px; overflow: hidden; }
        .atc-header { padding: 10px; display: flex; justify-content: space-between; border-bottom: 1px solid #333; font-weight: bold; }
        .atc-header h4 { margin: 0; }
        .atc-members { padding: 10px; display: flex; flex-direction: column; gap: 5px; min-height: 80px; }
        .atc-member-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 3px; }

        /* MODAIS GERAIS */
        .ff-modal-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .ff-modal-scrollable { background: #0f172a; border: 1px solid #fbbf24; width: 600px; max-width: 95vw; max-height: 90vh; overflow-y: auto; padding: 25px; border-radius: 8px; box-shadow: 0 0 30px rgba(0,0,0,0.8); }
        
        .modal-title-ff { color: #fbbf24; text-align: center; border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 20px; letter-spacing: 2px; font-size: 1.5rem; }
        .modal-input-group { margin-bottom: 15px; }
        .modal-input-group label { display: block; color: #94a3b8; font-size: 0.8rem; margin-bottom: 5px; font-weight: bold; }
        .modal-input-group input, .modal-input-group textarea, .modal-input-group select { width: 100%; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 10px; font-family: 'Lato', sans-serif; border-radius: 4px; outline: none; }
        .modal-input-group input:focus, .modal-input-group textarea:focus { border-color: #fbbf24; }
        .tall-area-dark { min-height: 100px; resize: vertical; }
        .row-double-ff { display: flex; gap: 15px; margin-bottom: 15px; }
        .field-group { flex: 1; }
        .field-group input, .field-group select { width: 100%; padding: 10px; background: #1e293b; border: 1px solid #334155; color: #fff; border-radius: 4px; }
        
        .btn-group-ff { display: flex; gap: 10px; margin-top: 20px; }
        .btn-forjar-main { flex: 1; background: #fbbf24; color: #000; border: none; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: 'Cinzel', serif; letter-spacing: 1px; }
        .btn-forjar-main:hover { background: #f59e0b; }
        .btn-cancelar-main { flex: 1; background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: 'Cinzel', serif; }
        .btn-cancelar-main:hover { border-color: #fff; color: #fff; }

        .ff-add-btn { background: transparent; border: 1px dashed #fbbf24; color: #fbbf24; padding: 5px 15px; cursor: pointer; font-size: 0.8rem; font-weight: bold; transition: 0.2s; }
        .ff-add-btn:hover { background: rgba(251, 191, 36, 0.1); }
        .ff-add-btn.small-btn { padding: 4px 10px; font-size: 0.75rem; }
        .ff-add-btn-gold-small { background: transparent; border: 1px dashed #00f2ff; color: #00f2ff; padding: 5px 10px; cursor: pointer; font-size: 0.7rem; font-weight: bold; }
        .ff-add-btn-gold-small:hover { background: rgba(0, 242, 255, 0.1); }

        .ff-input-dark { flex: 1; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 8px; border-radius: 4px; outline: none; }
        .ff-select-dark { background: #1e293b; border: 1px solid #334155; color: #fff; padding: 8px; border-radius: 4px; outline: none; }

        /* SELEÇÃO DE JOGADORES */
        .player-selector-box-fixed { margin: 15px 0; }
        .destinatarios-grid-fixed { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-height: 150px; overflow-y: auto; background: #020617; padding: 10px; border: 1px solid #334155; border-radius: 4px; }
        .chip-label-ff { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #94a3b8; cursor: pointer; padding: 5px; border: 1px solid transparent; border-radius: 4px; transition: 0.2s; }
        .chip-label-ff:hover { background: rgba(255,255,255,0.05); }
        .chip-label-ff input { width: auto; margin: 0; }

        /* DETALHES MISSÃO */
        .detail-view-main { width: 800px; height: 600px; display: flex; flex-direction: column; overflow: hidden; background: #0f172a; border: 2px solid #fbbf24; border-radius: 8px; }
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
        .cartaz-full-view { max-width: 100%; max-height: 90vh; border: 3px solid #ffcc00; box-shadow: 0 0 50px #000; }
        .close-lightbox { position: absolute; top: -40px; right: -40px; background: transparent; border: none; color: #fff; font-size: 40px; cursor: pointer; }
        
        /* BOTÕES FLUTUANTES NO MESTREPAGE (EM COLUNA E MAIS ACIMA) */
        .mobile-float-dock-bg { display: none; } /* só aparece no mobile via media query */
        .dm-floating-container { position: fixed; right: 30px; bottom: 110px; display: flex; flex-direction: column; gap: 20px; z-index: 9999; }
        .dm-float-btn { width: 70px; height: 70px; border-radius: 50%; border: 2px solid; background: #000; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; position: relative; }
        .dm-float-btn:hover { transform: scale(1.1); }
        
        .btn-trocas-dm { border-color: #f43f5e; color: #f43f5e; font-size: 30px; }
        .btn-trocas-dm:hover { box-shadow: 0 0 25px #f43f5e; }
        .notification-badge-dm { position: absolute; top: 0; right: 0; background: #f00; color: #fff; font-size: 12px; font-weight: bold; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }

        /* MERCADO DOS LANTERNAS MESTRE */
        .mercado-tabs { display: flex; gap: 15px; margin-bottom: 20px; border-bottom: 1px solid #334155; }
        .mercado-tabs button { background: transparent; border: none; color: #94a3b8; padding-bottom: 10px; font-weight: bold; cursor: pointer; transition: 0.2s; border-bottom: 2px solid transparent; font-family: 'Cinzel', serif; letter-spacing: 1px; }
        .mercado-tabs button.active { color: #fbbf24; border-bottom-color: #fbbf24; }
        
        .mercado-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .troca-card-dm { background: #0f172a; border: 1px solid #334155; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; }
        .tc-header { padding: 10px 15px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; font-size: 12px; color: #fff; }
        .tc-body { padding: 15px; flex: 1; font-size: 14px; color: #cbd5e1; }
        .tc-body p { margin: 5px 0; }
        .tc-msg { font-style: italic; color: #94a3b8; border-left: 2px solid #475569; padding-left: 10px; margin-top: 10px !important; }
        .tc-footer { display: flex; border-top: 1px solid #334155; }
        .btn-approve-dm { flex: 1; background: rgba(34, 197, 94, 0.1); border: none; color: #22c55e; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; border-right: 1px solid #334155; }
        .btn-approve-dm:hover { background: #22c55e; color: #000; }
        .btn-reject-dm { flex: 1; background: rgba(239, 68, 68, 0.1); border: none; color: #ef4444; padding: 12px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-reject-dm:hover { background: #ef4444; color: #000; }

        .historico-row-dm { background: #0f172a; border: 1px solid #334155; border-left: 4px solid; padding: 15px; margin-bottom: 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
        .hist-main-info { display: flex; flex-direction: column; gap: 5px; }
        .hist-date { font-size: 10px; color: #94a3b8; }
        .hist-main-info strong { color: #fff; font-size: 14px; }
        .hist-items { color: #fbbf24; font-size: 12px; }
        .hist-status-col { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
        .hist-gm { font-size: 10px; color: #64748b; }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }

        /* --- NAVEGAÇÃO MOBILE POR ABAS (oculta no desktop) --- */
        .mobile-tab-nav { display: none; }
        .mob-hidden { display: flex !important; } /* no desktop, todas colunas aparecem */

        /* --- NOTEBOOK / TABLET LARGO (1024-1280px) --- */
        @media (max-width: 1280px) {
          .mestre-grid { gap: 14px; }
          .ff-title { font-size: 1.6rem; letter-spacing: 3px; }
        }

        /* --- TABLET (768-1100px): 3 colunas compactas --- */
        @media (max-width: 1100px) {
          .mestre-container { height: auto !important; min-height: 100vh; overflow: visible !important; }
          .mestre-content { height: auto; min-height: 100%; padding: 12px 12px 100px; overflow: visible; box-sizing: border-box; }
          .mestre-grid { display: grid; grid-template-columns: repeat(3, minmax(240px, 1fr)); gap: 12px; flex: none; min-height: 0; }
          .board-column { height: 520px; }
          .ff-title { font-size: 1.4rem; letter-spacing: 2px; }
          .mestre-identity-box { padding: 8px 12px; gap: 8px; }
        }

        /* --- MOBILE (< 768px): abas com 1 coluna por vez --- */
        @media (max-width: 768px) {
          /* Container e página rolam livremente (scroll vem do html/body via classe page-scrollable) */
          .mestre-container { height: auto !important; min-height: 100vh; overflow: visible !important; }
          .mestre-bg-image-full { position: fixed !important; }
          .mestre-content { position: relative; z-index: 10; height: auto !important; min-height: 100%; padding: 0 0 120px 0; display: flex; flex-direction: column; overflow: visible !important; box-sizing: border-box; }

          /* Tab nav sticky */
          .mobile-tab-nav {
            display: flex;
            position: sticky;
            top: 0;
            z-index: 500;
            background: rgba(2, 6, 23, 0.98);
            border-bottom: 2px solid #fbbf24;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }
          .mob-tab {
            flex: 1;
            padding: 15px 4px;
            font-family: 'Cinzel', serif;
            font-size: 0.65rem;
            font-weight: bold;
            letter-spacing: 0.5px;
            background: transparent;
            border: none;
            color: #64748b;
            cursor: pointer;
            transition: color 0.2s, background 0.2s;
            border-bottom: 3px solid transparent;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            white-space: nowrap;
          }
          .mob-tab.active { color: #fbbf24; border-bottom-color: #fbbf24; background: rgba(251,191,36,0.07); }

          /* Top bar */
          .top-bar-flex { flex-direction: column; align-items: stretch; gap: 8px; padding: 12px 12px 0; margin-bottom: 0; }
          .ff-title { font-size: 1.3rem; letter-spacing: 2px; text-align: center; }
          .mestre-identity-box { padding: 8px 12px; gap: 8px; justify-content: center; flex-wrap: wrap; }
          .label-cor-narrador { margin-left: 0 !important; }

          /* Grid: sem altura fixa, sem scroll interno — a página toda rola */
          .mestre-grid { display: block; padding: 10px 12px 0; overflow: visible; }
          .mob-hidden { display: none !important; }
          .board-column { height: auto !important; min-height: 0 !important; width: 100%; border-radius: 0 0 8px 8px; }

          /* Coluna e scrolls não cortam conteúdo no mobile — a página toda rola */
          .board-column { overflow: visible !important; }
          .mission-scroll { overflow-y: visible !important; max-height: none !important; flex: none !important; padding-bottom: 16px !important; }
          .rank-scroll-panel { overflow: visible !important; max-height: none !important; flex: none !important; }

          /* Card actions touch-friendly (área mínima de toque 44px) */
          .btn-cyan, .btn-red { padding: 12px 8px; font-size: 0.75rem; min-height: 44px; touch-action: manipulation; }
          .btn-play-vtt { min-height: 48px; font-size: 0.9rem; touch-action: manipulation; }
          .ff-add-btn { padding: 12px 14px; font-size: 0.8rem; min-height: 44px; touch-action: manipulation; }
          .btn-kick-x { min-height: 36px; min-width: 36px; }
          .poster-actions { gap: 8px; }

          /* Card header */
          .card-header { flex-wrap: wrap; gap: 8px; padding: 14px 12px; }
          .card-header h3 { font-size: 0.95rem; }
          .card-header > div { display: flex; gap: 6px; flex-wrap: wrap; }

          /* Modais: bottom sheet no mobile */
          .ff-modal-overlay-fixed { align-items: flex-end !important; padding: 0 !important; }
          .ff-modal-scrollable {
            width: 100vw !important; max-width: 100vw !important;
            max-height: 93vh !important;
            border-radius: 18px 18px 0 0 !important;
            padding: 20px 16px 30px !important;
            border-left: none !important; border-right: none !important; border-bottom: none !important;
          }
          .detail-view-main {
            width: 100vw !important; height: 93vh !important;
            border-radius: 18px 18px 0 0 !important;
          }
          .detail-body-grid { grid-template-columns: 1fr !important; padding: 16px !important; gap: 14px !important; }
          .detail-info-row { flex-direction: column !important; gap: 12px !important; }
          .detail-title-col h2 { font-size: 1.3rem !important; }
          .arena-manager-grid { grid-template-columns: 1fr !important; }
          .mercado-grid { grid-template-columns: 1fr !important; }
          .row-double-ff { flex-direction: column; gap: 10px; }
          .ts-body { flex-direction: column; }

          /* Export float bar */
          .export-float-bar { flex-wrap: wrap; justify-content: center; width: 94vw; padding: 8px 12px; gap: 8px; }
          .btn-export-md, .btn-export-json { padding: 8px 14px; font-size: 0.75rem; }

          /* ===== DOCK DOS BOTÕES FLUTUANTES NO MOBILE ===== */
          .mobile-float-dock-bg {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 70px;
            background: rgba(2, 6, 23, 0.97);
            border-top: 1px solid #334155;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            z-index: 9988;
          }
          .dm-float-btn { width: 52px !important; height: 52px !important; font-size: 22px !important; }

          /* Bazar e Forja: encaixam na dock ao lado do Mercado
             Dock layout: [🏮 Mercado] [🛒 Bazar] [⚒ Forja]
             Mercado fica no dm-floating-container (left ~16%)
             Bazar fica no centro (~50%)
             Forja fica na direita (~84%)
          */
          .bazar-trigger-btn {
            position: fixed !important;
            bottom: 8px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            right: auto !important;
            width: 52px !important; height: 52px !important;
            z-index: 9991 !important;
          }
          .forja-trigger-btn {
            position: fixed !important;
            bottom: 8px !important;
            right: 16px !important;
            left: auto !important;
            transform: none !important;
            width: 52px !important; height: 52px !important;
            z-index: 9991 !important;
          }
          /* Dock do Mercado: só o botão 🏮, alinhado à esquerda da dock */
          .dm-floating-container {
            width: auto !important;
            left: 16px !important;
            right: auto !important;
            bottom: 8px !important;
            background: transparent !important;
            border-top: none !important;
            padding: 0 !important;
          }
        }

        /* --- CELULAR PEQUENO (< 420px) --- */
        @media (max-width: 420px) {
          .ff-title { font-size: 1.1rem; letter-spacing: 1px; }
          .mob-tab { font-size: 0.58rem; padding: 13px 2px; }
          .mestre-identity-box input[type="text"] { width: 90px; }
          .dm-float-btn { width: 48px !important; height: 48px !important; font-size: 20px !important; }
          .bazar-trigger-btn { width: 48px !important; height: 48px !important; }
          .forja-trigger-btn { width: 48px !important; height: 48px !important; }
        }

      `}</style>
    </div>
  );
}