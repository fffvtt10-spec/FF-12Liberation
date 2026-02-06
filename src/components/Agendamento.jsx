import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import ptBR from 'date-fns/locale/pt-BR';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, deleteDoc, doc, updateDoc, where } from "firebase/firestore";

const locales = { 'pt-BR': ptBR };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function Agendamento({ isMestre, onClose, onSelectSlotForSession }) {
  const [events, setEvents] = useState([]);
  const [viewEvent, setViewEvent] = useState(null);

  // Carregar Eventos (Disponibilidade e Sessões)
  useEffect(() => {
    const q = query(collection(db, "agenda"));
    const unsub = onSnapshot(q, (snap) => {
      const loadedEvents = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.type === 'session' ? `⚔️ ${data.title}` : '✅ Disponível',
          start: new Date(data.start),
          end: new Date(data.end),
          type: data.type, // 'available' ou 'session'
          details: data.details || {} // Dados da missão se for sessão
        };
      });
      setEvents(loadedEvents);
    });
    return () => unsub();
  }, []);

  // Mestre: Criar Disponibilidade ao clicar num slot vazio
  const handleSelectSlot = async ({ start, end }) => {
    if (!isMestre) return;
    const title = window.prompt("Nome da Disponibilidade (ex: Tarde Livre):", "Horário Disponível");
    if (title) {
      await addDoc(collection(db, "agenda"), {
        title, start: start.toISOString(), end: end.toISOString(), type: 'available', mestreId: auth.currentUser.uid
      });
    }
  };

  // Clicar em um evento existente
  const handleSelectEvent = (event) => {
    setViewEvent(event);
  };

  // Mestre: Excluir Disponibilidade ou Editar Horário
  const handleDeleteEvent = async () => {
    if (viewEvent?.type === 'session') return alert("Cancele a sessão pelo painel de Sessões!");
    if (window.confirm("Remover este horário disponível?")) {
      await deleteDoc(doc(db, "agenda", viewEvent.id));
      setViewEvent(null);
    }
  };

  const handleUpdateEventTime = async (newStart, newEnd) => {
      // Lógica para arrastar/soltar eventos (Drag and Drop) poderia vir aqui
      // Simulação simples de update manual
      if(!isMestre) return;
      // Atualiza no Firestore
      const eventRef = doc(db, "agenda", viewEvent.id);
      await updateDoc(eventRef, {
          start: newStart.toISOString(),
          end: newEnd.toISOString()
      });
      // Se for sessão, precisa atualizar a coleção de 'sessoes' também (sincronia)
      if(viewEvent.type === 'session' && viewEvent.details?.sessaoId) {
           const sessaoRef = doc(db, "sessoes", viewEvent.details.sessaoId);
           await updateDoc(sessaoRef, { dataInicio: newStart.toISOString() });
      }
      alert("Horário atualizado!");
      setViewEvent(null);
  };

  // Estilização dos eventos
  const eventStyleGetter = (event) => {
    let backgroundColor = event.type === 'session' ? '#ef4444' : '#10b981'; // Vermelho (Sessão) ou Verde (Disponível)
    if (event.type === 'session') backgroundColor = '#b8860b'; // Gold para sessão confirmada
    return { style: { backgroundColor, border: '1px solid #fff', borderRadius: '4px', color: 'black', fontWeight: 'bold' } };
  };

  return (
    <div className="ff-modal-overlay-fixed" style={{zIndex: 10000}}>
      <div className="ff-modal-scrollable ff-card" style={{width: '90vw', height: '90vh', maxWidth: '1200px'}}>
        <div className="modal-header-row">
            <h3 className="modal-title-ff">CALENDÁRIO DO NARRADOR</h3>
            <button className="btn-close-x" onClick={onClose}>✕</button>
        </div>
        
        <div style={{height: 'calc(100% - 60px)', color: '#000', background: '#e2e8f0', padding: '10px', borderRadius: '4px'}}>
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%', fontFamily: 'Lato, sans-serif' }}
                messages={{ next: "Próx", previous: "Ant", today: "Hoje", month: "Mês", week: "Semana", day: "Dia" }}
                culture='pt-BR'
                selectable={isMestre}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
            />
        </div>

        {/* Modal de Detalhes do Evento */}
        {viewEvent && (
            <div className="event-detail-overlay">
                <div className="event-detail-box">
                    <h4>{viewEvent.title}</h4>
                    <p>📅 {format(viewEvent.start, "dd/MM/yyyy HH:mm")} - {format(viewEvent.end, "HH:mm")}</p>
                    
                    {viewEvent.type === 'session' ? (
                        <div className="session-info-mini">
                            <p><strong>Missão:</strong> {viewEvent.details?.missionName}</p>
                            <p><strong>Jogadores:</strong> {viewEvent.details?.players?.join(', ')}</p>
                            {isMestre && (
                                <div className="edit-time-box">
                                    <label>Alterar Horário:</label>
                                    <input type="datetime-local" onChange={(e) => {
                                        const newDate = new Date(e.target.value);
                                        const duration = viewEvent.end - viewEvent.start;
                                        handleUpdateEventTime(newDate, new Date(newDate.getTime() + duration));
                                    }} />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="avail-actions">
                            <p>Este horário está livre para agendamento.</p>
                            {isMestre && <button className="btn-red" onClick={handleDeleteEvent}>EXCLUIR DISPONIBILIDADE</button>}
                            {isMestre && onSelectSlotForSession && (
                                <button className="btn-cyan" onClick={() => { onSelectSlotForSession(viewEvent); setViewEvent(null); }}>USAR ESTE HORÁRIO PARA SESSÃO</button>
                            )}
                        </div>
                    )}
                    <button className="btn-cancelar-main" style={{marginTop: '10px'}} onClick={() => setViewEvent(null)}>FECHAR</button>
                </div>
            </div>
        )}
      </div>
      <style>{`
        .modal-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .btn-close-x { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
        .event-detail-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index: 100; backdrop-filter: blur(2px); }
        .event-detail-box { background: #0f172a; border: 2px solid #fbbf24; padding: 20px; width: 400px; color: #fff; border-radius: 8px; box-shadow: 0 0 20px #000; }
        .event-detail-box h4 { color: #fbbf24; margin-top: 0; font-size: 1.2rem; }
        .rbc-toolbar button { color: #000; }
        .rbc-toolbar-label { color: #000; font-weight: bold; text-transform: uppercase; }
        .session-info-mini { background: rgba(255,255,255,0.1); padding: 10px; border-radius: 4px; margin: 10px 0; }
        .edit-time-box { margin-top: 10px; display: flex; flex-direction: column; gap: 5px; }
        .edit-time-box input { background: #333; color: #fff; border: 1px solid #555; padding: 5px; }
      `}</style>
    </div>
  );
}