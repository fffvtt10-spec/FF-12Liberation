import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function Tabletop({ sessaoData, isMaster, showManager, onCloseManager }) {
  // --- ESTADOS GERAIS ---
  const [activeMap, setActiveMap] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // --- ESTADOS DO GERENCIADOR ---
  const [mapList, setMapList] = useState([]); 
  const [editingName, setEditingName] = useState("");
  const [editingId, setEditingId] = useState(null);

  // --- ESTADOS DO GRID E MATEMÁTICA ---
  // Inicia com o valor do banco ou 25 se não existir
  const [gridCols, setGridCols] = useState(sessaoData?.grid_cols || 25); 
  const [gridSizePx, setGridSizePx] = useState(0); 
  const [imageRatio, setImageRatio] = useState(null);
  
  // --- FERRAMENTAS ---
  const [activeTool, setActiveTool] = useState('cursor'); 
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [rulerStart, setRulerStart] = useState(null);
  const [rulerCurrent, setRulerCurrent] = useState(null);
  
  const mapContainerRef = useRef(null);
  const imgRef = useRef(null);

  // Sincroniza dados da sessão (OUVINTE DO BANCO)
  useEffect(() => {
    if (sessaoData) {
      setActiveMap(sessaoData.active_map || null);
      
      // Sincroniza o Grid com o banco (para Jogadores e Mestre)
      if (sessaoData.grid_cols && sessaoData.grid_cols !== gridCols) {
          setGridCols(sessaoData.grid_cols);
      }
      
      if (isMaster) {
        const rawLinks = sessaoData.cenarios || [];
        const savedMaps = sessaoData.saved_maps || [];
        
        const combinedList = rawLinks.map((link, index) => {
            const existing = savedMaps.find(m => m.url === link);
            if (existing) return existing;
            return { id: `temp_${index}`, name: `Mapa Importado ${index + 1}`, url: link, isTemp: true };
        });
        setMapList(combinedList);
      }
    }
  }, [sessaoData, isMaster]); // Dependência sessaoData garante atualização em tempo real

  // --- CÁLCULO DO GRID PERFEITO ---
  const handleImageLoad = (e) => {
      const { naturalWidth, naturalHeight } = e.target;
      setImageRatio(naturalWidth / naturalHeight);
      recalcGrid();
  };

  const recalcGrid = () => {
      if (mapContainerRef.current) {
          const width = mapContainerRef.current.offsetWidth;
          if (gridCols > 0) {
              const size = width / gridCols;
              setGridSizePx(size);
          }
      }
  };

  // Recalcula grid se mudar o número de colunas ou tamanho da janela
  useEffect(() => {
      recalcGrid();
      window.addEventListener('resize', recalcGrid);
      return () => window.removeEventListener('resize', recalcGrid);
  }, [activeMap, gridCols]);

  // --- FUNÇÃO PARA SALVAR O GRID NO BANCO (SÓ MESTRE) ---
  const updateGridDb = async (newVal) => {
      if (!isMaster) return;
      // Limita entre 1 e 100 para não quebrar
      const val = Math.max(1, Math.min(100, Number(newVal)));
      setGridCols(val); // Atualiza visualmente na hora (otimista)
      
      try {
        const sessaoRef = doc(db, "sessoes", sessaoData.id);
        await updateDoc(sessaoRef, { grid_cols: val });
      } catch (error) {
          console.error("Erro ao salvar grid:", error);
      }
  };

  // --- LÓGICA DE MAGNETISMO E RÉGUA ---
  const getSnappedCoord = (x, y) => {
      if (!gridSizePx) return { x, y };
      const col = Math.round(x / gridSizePx);
      const row = Math.round(y / gridSizePx);
      return { x: col * gridSizePx, y: row * gridSizePx };
  };

  const getLocalCoords = (e) => {
      if (!mapContainerRef.current) return { x: 0, y: 0 };
      const rect = mapContainerRef.current.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e) => {
      if (activeTool === 'ruler' || e.button === 2) {
          e.preventDefault(); 
          setIsMeasuring(true);
          const rawCoords = getLocalCoords(e);
          const snapped = getSnappedCoord(rawCoords.x - (gridSizePx/2), rawCoords.y - (gridSizePx/2));
          const centerPoint = { x: snapped.x + (gridSizePx/2), y: snapped.y + (gridSizePx/2) };
          setRulerStart(centerPoint);
          setRulerCurrent(rawCoords);
      }
  };

  const handleMouseMove = (e) => {
      if (isMeasuring) setRulerCurrent(getLocalCoords(e));
  };

  const handleMouseUp = () => {
      setIsMeasuring(false);
      setRulerStart(null);
      setRulerCurrent(null);
  };

  const calculateDistance = () => {
      if (!rulerStart || !rulerCurrent || !gridSizePx) return "0m";
      const dx = Math.abs(rulerStart.x - rulerCurrent.x);
      const dy = Math.abs(rulerStart.y - rulerCurrent.y);
      const distPx = Math.sqrt(dx*dx + dy*dy);
      const squares = distPx / gridSizePx;
      const meters = squares * 1.5;
      return `${meters.toFixed(1)}m (${squares.toFixed(1)} qd)`;
  };

  // --- GERENCIAMENTO DE MAPAS ---
  const handleSaveMapInfo = async (mapItem) => {
    const mapToSave = {
        id: mapItem.id.toString().startsWith('temp') ? Date.now().toString() : mapItem.id,
        name: editingName || mapItem.name,
        url: mapItem.url
    };
    const sessaoRef = doc(db, "sessoes", sessaoData.id);
    if (!mapItem.isTemp) await updateDoc(sessaoRef, { saved_maps: arrayRemove(mapItem) });
    await updateDoc(sessaoRef, { saved_maps: arrayUnion(mapToSave) });
    setEditingId(null); setEditingName("");
  };

  const handleActivateMap = async (mapItem) => {
    const sessaoRef = doc(db, "sessoes", sessaoData.id);
    await updateDoc(sessaoRef, { active_map: mapItem });
    if(onCloseManager) onCloseManager();
    setIsMinimized(false);
  };

  const handleDeactivateMap = async () => {
    if(!window.confirm("Fechar o mapa para todos?")) return;
    const sessaoRef = doc(db, "sessoes", sessaoData.id);
    await updateDoc(sessaoRef, { active_map: null });
  };

  // --- RENDERIZAÇÃO ---
  if (!activeMap && !isMaster && !showManager) return null;

  return (
    <>
        {/* ÁREA DO MAPA */}
        {activeMap && (
            <div className={`tabletop-wrapper ${isMinimized ? 'minimized' : ''}`}>
                <div className="tt-header">
                    <span className="tt-title">📍 {activeMap.name}</span>
                    
                    {!isMinimized && (
                        <div className="tt-toolbar">
                            <button className={`tool-btn ${activeTool === 'cursor' ? 'active' : ''}`} onClick={() => setActiveTool('cursor')} title="Mover">👆</button>
                            <button className={`tool-btn ${activeTool === 'ruler' ? 'active' : ''}`} onClick={() => setActiveTool('ruler')} title="Régua">📏</button>
                            
                            {/* CONTROLE DE GRID SINCRONIZADO E BONITINHO */}
                            {isMaster && (
                                <div className="grid-control-box">
                                    <span className="grid-label">GRID</span>
                                    <div className="grid-input-wrapper">
                                        <button className="grid-btn-mini" onClick={() => updateGridDb(gridCols - 1)}>-</button>
                                        <input 
                                            type="number" 
                                            className="grid-number-display"
                                            value={gridCols} 
                                            onChange={(e) => updateGridDb(e.target.value)} 
                                            title="Tamanho do Grid"
                                        />
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
                            onContextMenu={e => e.preventDefault()}
                            style={{ cursor: activeTool === 'ruler' ? 'crosshair' : 'default' }}
                        >
                            <img ref={imgRef} src={activeMap.url} alt="Map" className="map-img-element" onLoad={handleImageLoad} />

                            {gridSizePx > 0 && (
                                <div className="grid-layer" style={{
                                    backgroundSize: `${gridSizePx}px ${gridSizePx}px`,
                                    backgroundImage: `
                                        linear-gradient(to right, rgba(255,255,255,0.2) 1px, transparent 1px),
                                        linear-gradient(to bottom, rgba(255,255,255,0.2) 1px, transparent 1px)
                                    `
                                }}></div>
                            )}

                            <div className="tokens-layer"></div>

                            {isMeasuring && rulerStart && rulerCurrent && (
                                <div className="ruler-overlay">
                                    <svg width="100%" height="100%">
                                        <line x1={rulerStart.x} y1={rulerStart.y} x2={rulerCurrent.x} y2={rulerCurrent.y} stroke="#ffcc00" strokeWidth="3" strokeDasharray="10,5" filter="drop-shadow(0px 0px 2px black)" />
                                        <circle cx={rulerStart.x} cy={rulerStart.y} r="4" fill="#ffcc00" stroke="black" />
                                        <circle cx={rulerCurrent.x} cy={rulerCurrent.y} r="4" fill="#ffcc00" stroke="black" />
                                    </svg>
                                    <div className="ruler-tag" style={{ left: rulerCurrent.x + 15, top: rulerCurrent.y + 15 }}>
                                        {calculateDistance()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* MODAL GERENCIADOR */}
        {isMaster && showManager && (
            <div className="manager-overlay" onClick={onCloseManager}>
                <div className="manager-box" onClick={e => e.stopPropagation()}>
                    <h3 className="manager-title">SALA DE CARTOGRAFIA</h3>
                    <div className="manager-list">
                        {mapList.length === 0 && <p className="empty-msg">Nenhum mapa importado.</p>}
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
            /* ESTILOS GERAIS */
            .tabletop-wrapper { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90vw; height: 85vh; background: #0b0b0b; border: 2px solid #ffcc00; z-index: 1000; display: flex; flex-direction: column; box-shadow: 0 0 100px rgba(0,0,0,0.9); border-radius: 8px; transition: all 0.3s; }
            .tabletop-wrapper.minimized { width: 400px; height: 45px; top: 96%; left: 50%; border-color: #444; border-radius: 10px 10px 0 0; }
            .tt-header { height: 45px; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; padding: 0 15px; flex-shrink: 0; }
            .tt-title { color: #ffcc00; font-weight: bold; letter-spacing: 1px; font-size: 14px; }
            .tt-toolbar { display: flex; gap: 15px; align-items: center; background: #000; padding: 4px 15px; border-radius: 20px; border: 1px solid #333; }
            .tool-btn { background: none; border: none; font-size: 18px; cursor: pointer; padding: 2px 5px; opacity: 0.5; transition: 0.2s; }
            .tool-btn:hover { opacity: 1; transform: scale(1.1); }
            .tool-btn.active { opacity: 1; text-shadow: 0 0 10px #fff; border-bottom: 2px solid #00f2ff; }
            .tt-controls button { background: none; border: none; color: #aaa; cursor: pointer; font-size: 16px; margin-left: 10px; }
            .tt-controls button:hover { color: #fff; }
            .close-x { color: #f44 !important; }
            .tt-viewport { flex: 1; background: #050505; overflow: auto; display: flex; align-items: center; justify-content: center; position: relative; }
            
            /* --- NOVO ESTILO DO GRID CONTROL --- */
            .grid-control-box { display: flex; align-items: center; gap: 8px; border-left: 1px solid #444; padding-left: 12px; margin-left: 5px; }
            .grid-label { font-size: 10px; color: #888; font-weight: bold; letter-spacing: 1px; }
            .grid-input-wrapper { display: flex; align-items: center; background: #222; border: 1px solid #444; border-radius: 4px; overflow: hidden; }
            .grid-btn-mini { background: #333; color: #fff; border: none; width: 20px; height: 22px; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
            .grid-btn-mini:hover { background: #00f2ff; color: #000; }
            .grid-number-display { 
                width: 30px; 
                background: #222; 
                border: none; 
                color: #ffcc00; 
                text-align: center; 
                font-size: 12px; 
                font-weight: bold; 
                outline: none; 
                -moz-appearance: textfield; /* Remove setas no Firefox */
            }
            /* Remove setas nativas do Chrome/Safari/Edge */
            .grid-number-display::-webkit-outer-spin-button,
            .grid-number-display::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }

            /* MAPA LAYERS */
            .map-layer-container { position: relative; box-shadow: 0 0 30px #000; user-select: none; }
            .map-img-element { display: block; max-width: 100%; max-height: 80vh; object-fit: contain; pointer-events: none; }
            .grid-layer, .tokens-layer, .ruler-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            .grid-layer { pointer-events: none; z-index: 2; opacity: 0.6; }
            .tokens-layer { z-index: 5; }
            .ruler-overlay { z-index: 10; pointer-events: none; }
            .ruler-tag { position: absolute; background: rgba(0,0,0,0.9); color: #ffcc00; border: 1px solid #ffcc00; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; pointer-events: none; z-index: 20; }

            /* MANAGER MODAL */
            .manager-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index: 10000; display:flex; align-items:center; justify-content:center; }
            .manager-box { width: 700px; max-height: 85vh; background: #080808; border: 2px solid #00f2ff; padding: 25px; display:flex; flex-direction:column; border-radius: 8px; box-shadow: 0 0 50px rgba(0, 242, 255, 0.1); }
            .manager-title { color: #00f2ff; border-bottom: 1px solid #00f2ff; padding-bottom: 15px; margin: 0; letter-spacing: 2px; }
            .manager-list { overflow-y: auto; flex: 1; margin-top: 20px; border: 1px solid #333; background: #000; }
            .manager-item { display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #333; gap: 15px; transition: 0.2s; }
            .manager-item:hover { background: rgba(0, 242, 255, 0.05); }
            .thumb-preview { width: 80px; height: 50px; object-fit: cover; border: 1px solid #555; border-radius: 4px; }
            .manager-name-input { flex: 1; background: #111; border: 1px solid #444; color: #fff; padding: 8px; outline: none; border-radius: 4px; }
            .manager-name-input:focus { border-color: #ffcc00; }
            .map-name-span { flex: 1; color: #fff; font-size: 14px; }
            .empty-msg { color: #666; padding: 20px; text-align: center; }
            .btn-action-sm { padding: 8px 15px; font-size: 11px; cursor: pointer; border: 1px solid #555; background: transparent; color: #ccc; border-radius: 4px; font-weight: bold; transition: 0.2s; }
            .btn-action-sm:hover { border-color: #fff; color: #fff; }
            .btn-activate { border-color: #00f2ff; color: #00f2ff; margin-left: 10px; }
            .btn-activate:hover { background: #00f2ff; color: #000; box-shadow: 0 0 15px #00f2ff; }
            .btn-save-name { color: #0f0; border-color: #0f0; }
            .btn-save-name:hover { background: #0f0; color: #000; }
            .btn-cancelar-main { width: 100%; background: #000; color: #fff; border: 1px solid #fff; padding: 14px; cursor: pointer; text-align: center; font-size: 14px; text-transform: uppercase; margin-top: 20px; transition: 0.3s; }
            .btn-cancelar-main:hover { background: #fff; color: #000; }
        `}</style>
    </>
  );
}