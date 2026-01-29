import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot, collection, query, where, arrayUnion, arrayRemove } from "firebase/firestore";
import fundoMestre from '../assets/fundo-mestre.jpg';
import Ficha from '../components/Ficha';
import Bazar from '../components/Bazar';
import Forja from '../components/Forja';

// Ícones placeholder para futuras ferramentas (você pode substituir pelos seus depois)
const IconTabletop = () => <span>🗺️</span>;
const IconDice = () => <span>🎲</span>;
const IconNPC = () => <span>👹</span>;
const IconEnemies = () => <span>⚔️</span>;

export default function MestreVTTPage() {
  const [sessaoAtiva, setSessaoAtiva] = useState(null);
  const [personagensData, setPersonagensData] = useState([]);
  const [connectedPlayers, setConnectedPlayers] = useState([]);
  const [selectedFicha, setSelectedFicha] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- 1. ENCONTRAR E INICIAR SESSÃO DO MESTRE ---
  useEffect(() => {
    if (!auth.currentUser) return;

    // Busca a sessão ativa que este mestre criou
    const q = query(
      collection(db, "sessoes"), 
      where("mestreId", "==", auth.currentUser.uid),
      // Pode adicionar filtro de data se quiser, por enquanto pega a primeira válida
    );

    const unsub = onSnapshot(q, (snap) => {
      const sessoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Pega a sessão mais recente ou ativa baseada na data
      const ativa = sessoes.find(s => {
          const agora = new Date();
          const fim = new Date(s.expiraEm);
          return agora <= fim; 
      });

      if (ativa) {
        setSessaoAtiva(ativa);
        setConnectedPlayers(ativa.connected_players || []); // Lista de UIDs online
        
        // Marca Mestre como Online no Banco
        if (!ativa.dm_online) {
            updateDoc(doc(db, "sessoes", ativa.id), { dm_online: true });
        }
      }
    });

    // Cleanup: Marca mestre como offline ao sair
    return () => {
        unsub();
        if (sessaoAtiva) {
            updateDoc(doc(db, "sessoes", sessaoAtiva.id), { dm_online: false });
        }
    };
  }, []);

  // --- 2. CARREGAR DADOS DOS PERSONAGENS DA SESSÃO ---
  useEffect(() => {
    if (!sessaoAtiva || !sessaoAtiva.participantes) return;

    // Busca dados reais dos personagens listados na sessão
    // Nota: Participantes na sessão salva nomes, mas idealmente salvaria UIDs. 
    // Aqui assumimos que vamos buscar todos os chars e filtrar pelos nomes/uids da sessão.
    const q = query(collection(db, "characters"));
    const unsub = onSnapshot(q, (snap) => {
        const allChars = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Filtra apenas os que estão na sessão (por nome ou UID se tiver)
        const sessionChars = allChars.filter(c => sessaoAtiva.participantes.includes(c.name));
        setPersonagensData(sessionChars);
    });

    return () => unsub();
  }, [sessaoAtiva]);

  // Relógio
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!sessaoAtiva) return <div className="loading-screen-master">BUSCANDO SINTONIA COM O ÉTER...</div>;

  return (
    <div className="mestre-vtt-container">
      <div className="mestre-bg-layer" style={{ backgroundImage: `url(${fundoMestre})` }} />
      
      {/* --- HUD LATERAL ESQUERDA: LISTA DE JOGADORES --- */}
      <div className="dm-players-sidebar">
          <h3 className="sidebar-title">AVENTUREIROS</h3>
          <div className="players-list-scroll">
              {personagensData.map(char => {
                  const isOnline = connectedPlayers.includes(char.uid); // Verifica se UID está na lista de conectados
                  return (
                      <div 
                        key={char.id} 
                        className={`mini-player-card ${isOnline ? 'online' : 'offline'}`}
                        onClick={() => setSelectedFicha(char)}
                        title="Clique para editar ficha"
                      >
                          <div className="mini-avatar">
                              {char.character_sheet?.imgUrl ? (
                                  <div className="avatar-img" style={{backgroundImage: `url(${char.character_sheet.imgUrl})`}}></div>
                              ) : (
                                  <div className="avatar-placeholder">{char.name.charAt(0)}</div>
                              )}
                              <div className={`status-dot ${isOnline ? 'green' : 'gray'}`}></div>
                          </div>
                          <div className="mini-info">
                              <span className="p-name">{char.name}</span>
                              <span className="p-meta">{char.race} // {char.class}</span>
                              <span className="p-lvl">LVL {char.character_sheet?.basic_info?.level || 1}</span>
                          </div>
                      </div>
                  );
              })}
              {personagensData.length === 0 && <div className="empty-slot">Aguardando aventureiros...</div>}
          </div>
      </div>

      {/* --- STATUS DA SESSÃO (CENTRO/TOPO) --- */}
      <div className="session-status-top">
          <div className="status-indicator active"></div>
          <div className="status-info">
              <h2>SESSÃO ATIVA: {sessaoAtiva.missaoNome}</h2>
              <p>Mestre Online • {connectedPlayers.length} Jogadores Conectados • {currentTime.toLocaleTimeString()}</p>
          </div>
      </div>

      {/* --- ÁREA CENTRAL (TABLETOP VAZIO POR ENQUANTO) --- */}
      <div className="vtt-workspace">
          {/* Aqui entrará o mapa/grid futuramente */}
          <div className="empty-tabletop-msg">
              SELECIONE UMA FERRAMENTA PARA INICIAR
          </div>
      </div>

      {/* --- FERRAMENTAS DO MESTRE (DIREITA/FLUTUANTES) --- */}
      <div className="dm-tools-dock">
          {/* Componentes Já Criados (Com Permissão de Mestre) */}
          <div className="tool-group">
            <Bazar isMestre={true} />
            <div className="tool-label">BAZAR</div>
          </div>
          
          <div className="tool-group">
            <Forja />
            <div className="tool-label">FORJA</div>
          </div>

          {/* Placeholders Futuros */}
          <div className="tool-group">
            <button className="tool-btn-placeholder" onClick={() => alert("Em breve: Grid de Batalha")}><IconTabletop /></button>
            <div className="tool-label">MAPA</div>
          </div>

          <div className="tool-group">
            <button className="tool-btn-placeholder" onClick={() => alert("Em breve: Rolagem de Dados")}><IconDice /></button>
            <div className="tool-label">DADOS</div>
          </div>

          <div className="tool-group">
            <button className="tool-btn-placeholder" onClick={() => alert("Em breve: Gerenciador de NPCs")}><IconNPC /></button>
            <div className="tool-label">NPCS</div>
          </div>

          <div className="tool-group">
            <button className="tool-btn-placeholder" onClick={() => alert("Em breve: Gerenciador de Combate")}><IconEnemies /></button>
            <div className="tool-label">COMBATE</div>
          </div>
      </div>

      {/* --- MODAL DA FICHA (EDIÇÃO DE MESTRE) --- */}
      {selectedFicha && (
          <Ficha 
            characterData={selectedFicha} 
            isMaster={true} 
            onClose={() => setSelectedFicha(null)} 
          />
      )}

      <style>{`
        .mestre-vtt-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; background: #000; font-family: 'Cinzel', serif; color: #fff; }
        .mestre-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.4; z-index: 0; }
        .loading-screen-master { display: flex; align-items: center; justify-content: center; height: 100vh; color: #ffcc00; font-size: 24px; letter-spacing: 2px; background: #050505; }

        /* SIDEBAR JOGADORES */
        .dm-players-sidebar { position: absolute; top: 20px; left: 20px; width: 280px; background: rgba(0, 10, 20, 0.95); border: 2px solid #ffcc00; border-radius: 8px; padding: 15px; z-index: 50; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 0 30px rgba(0,0,0,0.8); }
        .sidebar-title { color: #ffcc00; font-size: 16px; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 15px; text-align: center; letter-spacing: 2px; }
        .players-list-scroll { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; scrollbar-width: none; }
        
        .mini-player-card { display: flex; align-items: center; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid #333; border-radius: 4px; cursor: pointer; transition: 0.2s; }
        .mini-player-card:hover { border-color: #ffcc00; background: rgba(255, 204, 0, 0.1); }
        .mini-player-card.online { border-left: 3px solid #00f2ff; }
        .mini-player-card.offline { border-left: 3px solid #666; opacity: 0.7; filter: grayscale(0.8); }
        
        .mini-avatar { position: relative; margin-right: 12px; }
        .avatar-img { width: 40px; height: 40px; border-radius: 50%; background-size: cover; border: 1px solid #fff; }
        .avatar-placeholder { width: 40px; height: 40px; border-radius: 50%; background: #222; border: 1px solid #555; display: flex; align-items: center; justify-content: center; font-weight: bold; }
        .status-dot { width: 10px; height: 10px; border-radius: 50%; position: absolute; bottom: 0; right: 0; border: 1px solid #000; }
        .status-dot.green { background: #00f2ff; box-shadow: 0 0 5px #00f2ff; }
        .status-dot.gray { background: #666; }

        .mini-info { display: flex; flex-direction: column; }
        .p-name { font-size: 14px; font-weight: bold; color: #fff; line-height: 1.2; }
        .p-meta { font-size: 10px; color: #aaa; }
        .p-lvl { font-size: 10px; color: #ffcc00; font-weight: bold; }
        .empty-slot { font-size: 12px; color: #666; text-align: center; padding: 20px 0; font-style: italic; }

        /* STATUS TOP */
        .session-status-top { position: absolute; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); border: 1px solid #00f2ff; padding: 10px 30px; border-radius: 30px; display: flex; align-items: center; gap: 15px; z-index: 40; box-shadow: 0 0 20px rgba(0, 242, 255, 0.2); }
        .status-indicator { width: 12px; height: 12px; background: #00f2ff; border-radius: 50%; box-shadow: 0 0 10px #00f2ff; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
        .status-info h2 { margin: 0; font-size: 16px; color: #fff; letter-spacing: 1px; }
        .status-info p { margin: 0; font-size: 10px; color: #00f2ff; text-transform: uppercase; letter-spacing: 1px; }

        /* WORKSPACE */
        .vtt-workspace { position: relative; z-index: 10; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none; }
        .empty-tabletop-msg { font-size: 30px; color: rgba(255,255,255,0.1); font-weight: bold; letter-spacing: 5px; }

        /* DOCK DE FERRAMENTAS */
        .dm-tools-dock { position: absolute; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 15px; z-index: 60; align-items: flex-end; }
        .tool-group { display: flex; align-items: center; gap: 10px; flex-direction: row-reverse; }
        .tool-label { background: rgba(0,0,0,0.8); padding: 4px 8px; border-radius: 4px; font-size: 10px; color: #ffcc00; opacity: 0; transition: 0.2s; pointer-events: none; transform: translateX(10px); }
        .tool-group:hover .tool-label { opacity: 1; transform: translateX(0); }
        
        /* Ajuste para os botões já existentes (Bazar/Forja) ficarem no estilo dock */
        /* Note: Forja e Bazar tem position fixed no componente original. 
           Idealmente, passariamos uma prop 'className' pra tirar o fixed, 
           mas aqui vamos usar CSS pra forçar posição relativa dentro do dock */
        .dm-tools-dock .bazar-trigger-btn, 
        .dm-tools-dock .forja-trigger-btn { position: relative; bottom: auto; right: auto; margin: 0; box-shadow: 0 0 10px #000; width: 60px; height: 60px; }
        
        .tool-btn-placeholder { width: 60px; height: 60px; border-radius: 50%; background: #111; border: 2px solid #555; color: #fff; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; box-shadow: 0 0 10px #000; }
        .tool-btn-placeholder:hover { border-color: #ffcc00; color: #ffcc00; box-shadow: 0 0 20px #ffcc00; transform: scale(1.1); }
      `}</style>
    </div>
  );
}