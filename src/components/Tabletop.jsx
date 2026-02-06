import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";

// --- HELPER: GERAR COR DO JOGADOR ---
const getPlayerColor = (uid) => {
    if (!uid) return '#ffffff';
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
        hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// --- COMPONENTE INTERNO DO PING ---
const PingMarker = ({ ping }) => {
    return (
        <div 
            className={`ping-marker ${ping.isMaster ? 'master-ping' : ''}`}
            style={{ 
                left: ping.x, 
                top: ping.y,
                '--ping-color': ping.color // Variável CSS para facilitar
            }}
        >
            <div className="ping-center" style={{ backgroundColor: ping.color }}></div>
            <div className="ping-ripple" style={{ borderColor: ping.color }}></div>
            {ping.isMaster && <div className="ping-ripple delay" style={{ borderColor: ping.color }}></div>}
        </div>
    );
};

// --- COMPONENTE INTERNO DO TOKEN ---
const Token = ({ token, gridSize, isMaster, onUpdate, onMouseDown, charData }) => {
    const [flash, setFlash] = useState('');
    const prevHp = useRef(token.stats?.hp?.current);

    useEffect(() => {
        let currentHp;
        if (token.type === 'player' && charData) {
            currentHp = charData.character_sheet?.status?.hp?.current;
        } else if (token.type === 'enemy' && token.stats) {
            currentHp = token.stats.hp.current;
        }

        const prev = prevHp.current;
        if (prev !== undefined && currentHp !== undefined && currentHp !== prev) {
            if (currentHp < prev) setFlash('flash-damage');
            else if (currentHp > prev) setFlash('flash-heal');
            
            const timer = setTimeout(() => setFlash(''), 1000);
            return () => clearTimeout(timer);
        }
        prevHp.current = currentHp;
    }, [token.stats?.hp?.current, charData?.character_sheet?.status?.hp?.current]);

    const sizePx = gridSize * (token.size || 1);
    let imgUrl = token.img;

    if (token.type === 'player' && charData) {
        if (charData.character_sheet?.imgUrl) imgUrl = charData.character_sheet.imgUrl;
    }

    const bgPosX = token.imgX !== undefined ? token.imgX : 50;
    const bgPosY = token.imgY !== undefined ? token.imgY : 50;
    const isVisible = token.visible !== false; 

    if (!isMaster && !isVisible) return null;

    return (
        <div 
            className={`vtt-token ${token.type} ${flash} ${!isVisible ? 'ghost-token' : ''}`}
            style={{
                width: sizePx,
                height: sizePx,
                left: token.x * gridSize,
                top: token.y * gridSize,
                cursor: isMaster || (token.type === 'player' && token.controlledBy === 'me') ? 'grab' : 'default',
                zIndex: isMaster ? 100 : 50 
            }}
            onMouseDown={(e) => onMouseDown(e, token)}
        >
            <div 
                className="token-inner" 
                style={{
                    backgroundImage: `url(${imgUrl})`,
                    backgroundPosition: `${bgPosX}% ${bgPosY}%` 
                }}
            ></div>
            
            {isMaster && (
                <div className="token-sizer">
                    <button onMouseDown={(e) => { e.stopPropagation(); onUpdate('resize', token, -1); }}>-</button>
                    <button onMouseDown={(e) => { e.stopPropagation(); onUpdate('resize', token, 1); }}>+</button>
                </div>
            )}
            
            <div className="token-name">{token.name}</div>
        </div>
    );
};

export default function Tabletop({ sessaoData, isMaster, showManager, onCloseManager, currentUserUid, personagensData }) {
  const [activeMap, setActiveMap] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [pings, setPings] = useState([]); 
  
  const [mapList, setMapList] = useState([]); 
  const [editingName, setEditingName] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [gridCols, setGridCols] = useState(sessaoData?.grid_cols || 25); 
  const [gridSizePx, setGridSizePx] = useState(0); 
  
  const [draggingToken, setDraggingToken] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [activeTool, setActiveTool] = useState('cursor'); 
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [rulerStart, setRulerStart] = useState(null);
  const [rulerCurrent, setRulerCurrent] = useState(null);
  
  const mapContainerRef = useRef(null);
  const imgRef = useRef(null);

  // --- EFEITOS E SINCRONIZAÇÃO ---
  useEffect(() => {
    if (sessaoData) {
      setActiveMap(sessaoData.active_map || null);
      if (sessaoData.grid_cols && sessaoData.grid_cols !== gridCols) setGridCols(sessaoData.grid_cols);
      if (sessaoData.tokens) setTokens(sessaoData.tokens);
      else setTokens([]);
      
      if (sessaoData.pings) setPings(sessaoData.pings);
      else setPings([]);

      if (isMaster) {
        const rawLinks = sessaoData.mapas || []; 
        const savedMaps = sessaoData.saved_maps || [];
        const combinedList = rawLinks.map((link, index) => {
            const existing = savedMaps.find(m => m.url === link);
            if (existing) return existing;
            return { id: `temp_${index}`, name: `Mapa Importado ${index + 1}`, url: link, isTemp: true };
        });
        setMapList(combinedList);
      }
    }
  }, [sessaoData, isMaster]); 

  // --- CORREÇÃO: Limpeza automática de pings com setInterval ---
  useEffect(() => {
      if (!isMaster) return; // Apenas o mestre limpa

      const interval = setInterval(() => {
          if (!pings || pings.length === 0) return;

          const now = Date.now();
          // Identifica pings expirados (mais de 3 segundos)
          const pingsToDelete = pings.filter(p => now - p.createdAt > 3000);
          
          if (pingsToDelete.length > 0) {
              const sessaoRef = doc(db, "sessoes", sessaoData.id);
              // Remove um por um para evitar conflitos de concorrência com novos pings
              pingsToDelete.forEach(async (p) => {
                  try {
                      await updateDoc(sessaoRef, { pings: arrayRemove(p) });
                  } catch(e) { console.log("Erro ao limpar ping", e); }
              });
          }
      }, 1000); // Verifica a cada 1 segundo

      return () => clearInterval(interval);
  }, [pings, isMaster, sessaoData?.id]);

  const recalcGrid = () => {
      if (mapContainerRef.current) {
          const width = mapContainerRef.current.offsetWidth;
          if (gridCols > 0) {
              const size = width / gridCols;
              setGridSizePx(size);
          }
      }
  };
  useEffect(() => { recalcGrid(); window.addEventListener('resize', recalcGrid); return () => window.removeEventListener('resize', recalcGrid); }, [activeMap, gridCols]);

  const getLocalCoords = (e) => {
      if (!mapContainerRef.current) return { x: 0, y: 0 };
      const rect = mapContainerRef.current.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleCreatePing = async (e) => {
      if (!activeMap) return;
      const coords = getLocalCoords(e);
      
      const newPing = {
          id: Date.now().toString() + Math.random(),
          x: coords.x,
          y: coords.y,
          color: isMaster ? '#ffd700' : getPlayerColor(currentUserUid),
          isMaster: !!isMaster, // Garante que é booleano
          createdAt: Date.now(),
          uid: currentUserUid || 'anon'
      };

      try {
          await updateDoc(doc(db, "sessoes", sessaoData.id), {
              pings: arrayUnion(newPing)
          });
      } catch (err) {
          console.error("Erro ao criar ping:", err);
      }
  };

  const handleTokenMouseDown = (e, token) => {
      if (activeTool === 'ruler' || activeTool === 'ping') return;
      const isMine = token.type === 'player' && token.uid === currentUserUid;
      if (!isMaster && !isMine) return;

      e.stopPropagation();
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setDraggingToken({ ...token, tempX: token.x * gridSizePx, tempY: token.y * gridSizePx });
  };

  const handleMouseMove = (e) => {
      if (isMeasuring) setRulerCurrent(getLocalCoords(e));
      if (draggingToken) {
          const parentRect = mapContainerRef.current.getBoundingClientRect();
          let newX = e.clientX - parentRect.left - dragOffset.x;
          let newY = e.clientY - parentRect.top - dragOffset.y;
          const sizeMult = draggingToken.size || 1;
          const maxX = parentRect.width - (gridSizePx * sizeMult);
          const maxY = parentRect.height - (gridSizePx * sizeMult);
          setDraggingToken(prev => ({ ...prev, tempX: Math.max(0, Math.min(newX, maxX)), tempY: Math.max(0, Math.min(newY, maxY)) }));
      }
  };

  const handleMouseUp = async () => {
      if (isMeasuring) { setIsMeasuring(false); setRulerStart(null); setRulerCurrent(null); }
      if (draggingToken) {
          const gridX = Math.round(draggingToken.tempX / gridSizePx);
          const gridY = Math.round(draggingToken.tempY / gridSizePx);
          const updatedTokens = tokens.map(t => {
              if (t.id === draggingToken.id) return { ...t, x: gridX, y: gridY };
              return t;
          });
          setTokens(updatedTokens);
          setDraggingToken(null);
          try {
             await updateDoc(doc(db, "sessoes", sessaoData.id), { tokens: updatedTokens });
          } catch (err) { console.error("Erro ao mover token", err); }
      }
  };

  const handleTokenUpdate = async (action, token, value) => {
      if (!isMaster) return;
      let newTokens = [...tokens];
      const idx = newTokens.findIndex(t => t.id === token.id);
      if (idx === -1) return;

      if (action === 'resize') {
          let newSize = (newTokens[idx].size || 1) + value;
          if (newSize < 1) newSize = 1;
          if (newSize > 4) newSize = 4;
          newTokens[idx].size = newSize;
          setTokens(newTokens);
          await updateDoc(doc(db, "sessoes", sessaoData.id), { tokens: newTokens });
      }
  };

  const handleMouseDown = (e) => {
      if (activeTool === 'ping') {
          e.preventDefault();
          handleCreatePing(e);
          return;
      }

      if (activeTool === 'ruler' || e.button === 2) {
          e.preventDefault(); 
          setIsMeasuring(true);
          const rawCoords = getLocalCoords(e);
          setRulerStart(rawCoords);
          setRulerCurrent(rawCoords);
      }
  };

  const updateGridDb = async (newVal) => {
      if (!isMaster) return;
      const val = Math.max(1, Math.min(100, Number(newVal)));
      setGridCols(val); 
      await updateDoc(doc(db, "sessoes", sessaoData.id), { grid_cols: val });
  };

  const calculateDistance = () => {
    if (!rulerStart || !rulerCurrent || !gridSizePx) return "0m";
    const dx = Math.abs(rulerStart.x - rulerCurrent.x);
    const dy = Math.abs(rulerStart.y - rulerCurrent.y);
    const distPx = Math.sqrt(dx*dx + dy*dy);
    const squares = distPx / gridSizePx;
    return `${(squares * 1.5).toFixed(1)}m (${squares.toFixed(1)} qd)`;
  };

  const handleSaveMapInfo = async (mapItem) => {
    const mapToSave = { id: mapItem.id.toString().startsWith('temp') ? Date.now().toString() : mapItem.id, name: editingName || mapItem.name, url: mapItem.url };
    const sessaoRef = doc(db, "sessoes", sessaoData.id);
    if (!mapItem.isTemp) await updateDoc(sessaoRef, { saved_maps: arrayRemove(mapItem) });
    await updateDoc(sessaoRef, { saved_maps: arrayUnion(mapToSave) });
    setEditingId(null); setEditingName("");
  };

  const handleActivateMap = async (mapItem) => {
    await updateDoc(doc(db, "sessoes", sessaoData.id), { active_map: mapItem });
    if(onCloseManager) onCloseManager(); 
    setIsMinimized(false);
  };

  const handleDeactivateMap = async () => {
    if(!window.confirm("Fechar o mapa para todos?")) return;
    await updateDoc(doc(db, "sessoes", sessaoData.id), { active_map: null });
  };

  if (!activeMap && !isMaster && !showManager) return null;

  return (
    <>
        {activeMap && (
            <div className={`tabletop-wrapper ${isMinimized ? 'minimized' : ''}`}>
                <div className="tt-header">
                    <span className="tt-title">📍 {activeMap.name}</span>
                    {!isMinimized && (
                        <div className="tt-toolbar">
                            <button className={`tool-btn ${activeTool === 'cursor' ? 'active' : ''}`} onClick={() => setActiveTool('cursor')} title="Mover">👆</button>
                            <button className={`tool-btn ${activeTool === 'ruler' ? 'active' : ''}`} onClick={() => setActiveTool('ruler')} title="Régua">📏</button>
                            <button className={`tool-btn ${activeTool === 'ping' ? 'active' : ''}`} onClick={() => setActiveTool('ping')} title="Ping">🎯</button>
                            
                            {isMaster && (
                                <div className="grid-control-box">
                                    <span className="grid-label">GRID</span>
                                    <div className="grid-input-wrapper">
                                        <button className="grid-btn-mini" onClick={() => updateGridDb(gridCols - 1)}>-</button>
                                        <input type="number" className="grid-number-display" value={gridCols} onChange={(e) => updateGridDb(e.target.value)} />
                                        <button className="grid-btn-mini" onClick={() => updateGridDb(gridCols + 1)}>+</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="tt-controls">
                        <button onClick={() => setIsMinimized(!isMinimized)}>{isMinimized ? '🔼' : '🔽'}</button>
                        {isMaster && <button className="close-x" onClick={handleDeactivateMap}>✕</button>}
                    </div>
                </div>

                {!isMinimized && (
                    <div className="tt-viewport">
                        <div 
                            className="map-layer-container"
                            ref={mapContainerRef}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onContextMenu={e => e.preventDefault()}
                            style={{ 
                                cursor: activeTool === 'ruler' ? 'crosshair' : activeTool === 'ping' ? 'copy' : 'default' 
                            }}
                        >
                            <img ref={imgRef} src={activeMap.url} alt="Map" className="map-img-element" />
                            
                            {/* CAMADA DE PINGS */}
                            <div className="pings-layer">
                                {pings.map(p => (
                                    <PingMarker key={p.id} ping={p} />
                                ))}
                            </div>

                            {gridSizePx > 0 && (
                                <>
                                    <div className="grid-layer" style={{
                                        backgroundSize: `${gridSizePx}px ${gridSizePx}px`,
                                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)`
                                    }}></div>
                                    <div className="tokens-layer">
                                        {tokens.map(t => (
                                            (draggingToken && draggingToken.id === t.id) ? null : (
                                                <Token 
                                                    key={t.id} token={t} gridSize={gridSizePx} isMaster={isMaster}
                                                    onUpdate={handleTokenUpdate} onMouseDown={handleTokenMouseDown}
                                                    charData={t.type === 'player' ? personagensData.find(p => p.uid === t.uid) : null}
                                                />
                                            )
                                        ))}
                                        {draggingToken && (
                                            <div 
                                                className={`vtt-token ${draggingToken.type} dragging`}
                                                style={{
                                                    width: gridSizePx * (draggingToken.size || 1), height: gridSizePx * (draggingToken.size || 1),
                                                    left: draggingToken.tempX, top: draggingToken.tempY,
                                                    cursor: 'grabbing', zIndex: 1000
                                                }}
                                            >
                                                <div className="token-inner" style={{backgroundImage: `url(${draggingToken.img})`, backgroundPosition: `${draggingToken.imgX||50}% ${draggingToken.imgY||50}%`}}></div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            {isMeasuring && rulerStart && rulerCurrent && (
                                <div className="ruler-overlay">
                                    <svg width="100%" height="100%">
                                        <line x1={rulerStart.x} y1={rulerStart.y} x2={rulerCurrent.x} y2={rulerCurrent.y} stroke="#ffcc00" strokeWidth="3" strokeDasharray="10,5" filter="drop-shadow(0px 0px 2px black)" />
                                        <circle cx={rulerStart.x} cy={rulerStart.y} r="4" fill="#ffcc00" stroke="black" />
                                        <circle cx={rulerCurrent.x} cy={rulerCurrent.y} r="4" fill="#ffcc00" stroke="black" />
                                    </svg>
                                    <div className="ruler-tag" style={{ left: rulerCurrent.x + 15, top: rulerCurrent.y + 15 }}>{calculateDistance()}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {isMaster && showManager && ( 
            <div className="manager-overlay" onClick={onCloseManager}>
                <div className="manager-box" onClick={e => e.stopPropagation()}>
                    <h3 className="manager-title">SALA DE CARTOGRAFIA</h3>
                    <div className="manager-list">
                        {mapList.map((map, idx) => (
                            <div key={idx} className="manager-item">
                                <img src={map.url} className="thumb-preview" alt="thumb" />
                                {editingId === map.id ? (
                                    <input className="manager-name-input" value={editingName} onChange={e => setEditingName(e.target.value)} placeholder="Nome" autoFocus />
                                ) : (<span className="map-name-span">{map.name}</span>)}
                                {editingId === map.id ? (<button className="btn-action-sm btn-save-name" onClick={() => handleSaveMapInfo(map)}>SALVAR</button>) : (<button className="btn-action-sm" onClick={() => { setEditingId(map.id); setEditingName(map.name); }}>RENOMEAR</button>)}
                                <button className="btn-action-sm btn-activate" onClick={() => handleActivateMap(map)}>ABRIR</button>
                            </div>
                        ))}
                    </div>
                    <button className="btn-cancelar-main" onClick={onCloseManager}>FECHAR</button>
                </div>
            </div>
        )}

        <style>{`
            .tabletop-wrapper { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90vw; height: 85vh; background: #0b0b0b; border: 2px solid #ffcc00; z-index: 1000; display: flex; flex-direction: column; box-shadow: 0 0 100px rgba(0,0,0,0.9); border-radius: 8px; }
            .tabletop-wrapper.minimized { width: 400px; height: 45px; top: 96%; left: 50%; border-color: #444; border-radius: 10px 10px 0 0; }
            .tt-header { height: 45px; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; }
            .tt-title { color: #ffcc00; font-weight: bold; letter-spacing: 1px; font-size: 14px; }
            .tt-toolbar { display: flex; gap: 15px; align-items: center; background: #000; padding: 4px 15px; border-radius: 20px; border: 1px solid #333; }
            .tool-btn { background: none; border: none; font-size: 18px; cursor: pointer; opacity: 0.5; }
            .tool-btn.active { opacity: 1; border-bottom: 2px solid #00f2ff; }
            .tt-controls button { background: none; border: none; color: #aaa; cursor: pointer; margin-left: 10px; }
            .tt-viewport { flex: 1; background: #050505; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; }
            .grid-control-box { display: flex; align-items: center; gap: 8px; border-left: 1px solid #444; padding-left: 12px; margin-left: 5px; }
            .grid-label { font-size: 10px; color: #888; font-weight: bold; }
            .grid-input-wrapper { display: flex; align-items: center; background: #222; border: 1px solid #444; border-radius: 4px; }
            .grid-btn-mini { background: #333; color: #fff; border: none; width: 20px; cursor: pointer; }
            .grid-number-display { width: 30px; background: #222; border: none; color: #ffcc00; text-align: center; font-size: 12px; outline: none; }
            
            .map-layer-container { position: relative; box-shadow: 0 0 30px #000; user-select: none; }
            .map-img-element { display: block; max-width: 100%; max-height: 80vh; object-fit: contain; pointer-events: none; }
            .grid-layer, .tokens-layer, .pings-layer, .ruler-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            .grid-layer { pointer-events: none; z-index: 2; opacity: 0.6; }
            .tokens-layer { z-index: 5; }
            .pings-layer { z-index: 20; pointer-events: none; }
            .ruler-overlay { z-index: 10; pointer-events: none; }
            .ruler-tag { position: absolute; background: rgba(0,0,0,0.9); color: #ffcc00; border: 1px solid #ffcc00; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; pointer-events: none; z-index: 20; }

            /* --- ESTILOS DE PING (CORRIGIDO) --- */
            .ping-marker {
                position: absolute;
                width: 0; height: 0;
                transform: translate(-50%, -50%);
                pointer-events: none;
                z-index: 20;
            }
            .ping-center {
                position: absolute;
                left: -6px; top: -6px;
                width: 12px; height: 12px;
                border-radius: 50%;
                box-shadow: 0 0 10px var(--ping-color);
                animation: pingPop 0.3s ease-out;
            }
            .ping-ripple {
                position: absolute;
                left: -25px; top: -25px;
                width: 50px; height: 50px;
                border-radius: 50%;
                border: 3px solid;
                opacity: 0;
                box-shadow: 0 0 5px var(--ping-color);
                animation: pingRipple 1.5s ease-out infinite;
            }
            .ping-ripple.delay { animation-delay: 0.5s; }
            
            /* Estilo específico do Mestre */
            .ping-marker.master-ping .ping-center {
                width: 16px; height: 16px; left: -8px; top: -8px;
                box-shadow: 0 0 20px #ffd700, 0 0 40px #ffd700;
                background-color: #ffd700 !important;
            }
            .ping-marker.master-ping .ping-ripple {
                border-color: #ffd700 !important;
                border-width: 4px;
                animation-duration: 1s;
                width: 60px; height: 60px; left: -30px; top: -30px;
            }

            @keyframes pingPop { 
                0% { transform: scale(0); opacity: 0; } 
                80% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 1; } 
            }
            @keyframes pingRipple {
                0% { transform: scale(0.2); opacity: 1; border-width: 3px; }
                100% { transform: scale(2.0); opacity: 0; border-width: 0px; }
            }

            .vtt-token { position: absolute; border-radius: 50%; box-shadow: 0 0 10px #000; z-index: 10; overflow: visible; }
            .vtt-token.dragging { z-index: 100; transition: none; box-shadow: 0 10px 20px rgba(0,0,0,0.8); transform: scale(1.05); }
            .vtt-token.enemy { border: 2px solid #f44; }
            .vtt-token.player { border: 2px solid #00f2ff; }
            
            .vtt-token.ghost-token { opacity: 0.5; filter: grayscale(100%); border-style: dashed; }

            .token-inner { width: 100%; height: 100%; border-radius: 50%; background-size: cover; pointer-events: none; background-repeat: no-repeat; }
            .token-name { position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: #fff; font-size: 10px; padding: 2px 5px; border-radius: 4px; white-space: nowrap; pointer-events: none; opacity: 0; transition: 0.2s; z-index: 15; text-shadow: 0 0 3px #000; }
            .vtt-token:hover .token-name { opacity: 1; }
            
            .token-sizer { position: absolute; top: -10px; right: -20px; display: flex; flex-direction: column; opacity: 0; transition: 0.2s; gap: 2px; }
            .vtt-token:hover .token-sizer { opacity: 1; }
            .token-sizer button { width: 15px; height: 15px; background: #000; color: #fff; border: 1px solid #555; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .token-sizer button:hover { border-color: #ffcc00; color: #ffcc00; }

            .flash-damage { animation: flashRed 0.5s; }
            .flash-heal { animation: flashGreen 0.5s; }
            @keyframes flashRed { 0% { box-shadow: 0 0 0 #f00; } 50% { box-shadow: 0 0 20px #f00; border-color: #f00; } 100% { box-shadow: 0 0 0 #000; } }
            @keyframes flashGreen { 0% { box-shadow: 0 0 0 #0f0; } 50% { box-shadow: 0 0 20px #0f0; border-color: #0f0; } 100% { box-shadow: 0 0 0 #000; } }

            .manager-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index: 10000; display:flex; align-items:center; justify-content:center; }
            .manager-box { width: 700px; max-height: 85vh; background: #080808; border: 2px solid #00f2ff; padding: 25px; display:flex; flex-direction:column; border-radius: 8px; }
            .manager-title { color: #00f2ff; border-bottom: 1px solid #00f2ff; padding-bottom: 15px; margin: 0; }
            .manager-list { overflow-y: auto; flex: 1; margin-top: 20px; border: 1px solid #333; background: #000; }
            .manager-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #333; gap: 15px; }
            .thumb-preview { width: 80px; height: 50px; object-fit: cover; border: 1px solid #555; }
            .manager-name-input { flex: 1; background: #111; border: 1px solid #444; color: #fff; padding: 8px; }
            .map-name-span { flex: 1; color: #fff; font-size: 14px; }
            .btn-action-sm { padding: 8px 15px; font-size: 11px; cursor: pointer; border: 1px solid #555; background: transparent; color: #ccc; }
            .btn-activate { border-color: #00f2ff; color: #00f2ff; margin-left: 10px; }
            .btn-save-name { color: #0f0; border-color: #0f0; }
            .btn-cancelar-main { width: 100%; background: #000; color: #fff; border: 1px solid #fff; padding: 14px; cursor: pointer; margin-top: 20px; }
        `}</style>
    </>
  );
}