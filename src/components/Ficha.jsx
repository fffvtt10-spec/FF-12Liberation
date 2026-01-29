import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

export default function Ficha({ characterData, isMaster, onClose }) {
  const [sheet, setSheet] = useState(characterData.character_sheet || {
    basic_info: { character_name: characterData.name, level: 1, experience: { current: 0, max: 100 }, race: characterData.race, class: characterData.class },
    attributes: { FOR: { value: 0 }, CONS: { value: 0 }, INT: { value: 0 }, SOR: { value: 0 }, CAR: { value: 0 }, VEL: { value: 0 } },
    status: { hp: { current: 10, max: 10 }, mp: { current: 5, max: 5 }, arm: { value: 0 }, res: { value: 0 } },
    equipment: { slots: Array(7).fill({ item_name: "Vazio", effect: "-" }) },
    inventory: { gil: 0, items: [] },
    imgUrl: "" 
  });

  const [showLevelUpAnim, setShowLevelUpAnim] = useState(false);

  // Função para atualizar o Firebase quando houver mudança (Apenas Mestre)
  const updateField = async (path, value) => {
    if (!isMaster) return;
    
    // Lógica para aninhar o valor no objeto sheet local
    const newSheet = JSON.parse(JSON.stringify(sheet));
    const keys = path.split('.');
    let ref = newSheet;
    for (let i = 0; i < keys.length - 1; i++) ref = ref[keys[i]];
    ref[keys[keys.length - 1]] = value;

    setSheet(newSheet);
    
    // Atualiza no Firestore
    const charRef = doc(db, "characters", characterData.uid || characterData.id);
    await updateDoc(charRef, { character_sheet: newSheet });
  };

  const handleLevelUp = async () => {
    setShowLevelUpAnim(true);
    setTimeout(async () => {
        setShowLevelUpAnim(false);
        // Reseta XP e sobe Nivel
        const currentLvl = sheet.basic_info.level || 1;
        const newXpMax = sheet.basic_info.experience.max * 1.5; // Exemplo de curva
        
        await updateField('basic_info.level', currentLvl + 1);
        await updateField('basic_info.experience.current', 0);
        await updateField('basic_info.experience.max', Math.floor(newXpMax));
    }, 4000);
  };

  // --- LÓGICA DO RADAR CHART (SVG) ---
  const stats = ['FOR', 'INT', 'SOR', 'CAR', 'VEL', 'CONS']; // Ordem horária
  const maxStat = 100; // Escala do gráfico
  const radius = 90;
  const center = 150;

  const getPoint = (value, index, total) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const x = center + (radius * (value / maxStat)) * Math.cos(angle);
    const y = center + (radius * (value / maxStat)) * Math.sin(angle);
    return { x, y };
  };

  const polyPoints = stats.map((stat, i) => {
    const val = sheet.attributes[stat]?.value || 0;
    const { x, y } = getPoint(val, i, stats.length);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="ficha-overlay-fixed">
      <div className="ficha-container fade-in">
        <button className="close-btn-ficha" onClick={onClose}>✕</button>
        
        {/* CABEÇALHO */}
        <div className="ficha-header">
            <div className="header-info">
                <h1>{sheet.basic_info.character_name}</h1>
                <span className="sub-header">{sheet.basic_info.race} // {characterData.class || "Classe"}</span>
            </div>
            <div className="xp-container">
                <div className="lvl-box">
                    <small>LVL</small>
                    <span>{sheet.basic_info.level}</span>
                </div>
                <div className="xp-bar-box">
                    <div className="xp-text">XP {sheet.basic_info.experience.current} / {sheet.basic_info.experience.max}</div>
                    <div className="xp-track">
                        <div className="xp-fill" style={{width: `${(sheet.basic_info.experience.current / sheet.basic_info.experience.max) * 100}%`}}></div>
                    </div>
                </div>
                {/* BOTÃO LEVEL UP (SÓ MESTRE) */}
                {isMaster && sheet.basic_info.experience.current >= sheet.basic_info.experience.max && (
                    <button className="btn-levelup glowing" onClick={handleLevelUp}>
                        ⚡ LEVEL UP ⚡
                    </button>
                )}
            </div>
        </div>

        {/* CORPO PRINCIPAL */}
        <div className="ficha-body">
            
            {/* COLUNA ESQUERDA: ATRIBUTOS (RADAR) */}
            <div className="col-attributes">
                <h3 className="section-title">ATRIBUTOS</h3>
                <div className="radar-wrapper">
                    <svg width="300" height="300" viewBox="0 0 300 300">
                        {/* Background Web */}
                        {[20, 40, 60, 80, 100].map(r => (
                            <polygon key={r} points={stats.map((_, i) => {
                                const {x,y} = getPoint(r, i, 6); return `${x},${y}`;
                            }).join(" ")} fill="none" stroke="#333" strokeWidth="1" />
                        ))}
                        {/* Status Polygon */}
                        <polygon points={polyPoints} fill="rgba(0, 242, 255, 0.2)" stroke="#00f2ff" strokeWidth="2" />
                        {/* Labels e Values */}
                        {stats.map((stat, i) => {
                            const {x, y} = getPoint(115, i, 6); // Posição do Label
                            const val = sheet.attributes[stat]?.value || 0;
                            return (
                                <foreignObject x={x - 20} y={y - 15} width="40" height="30" key={stat}>
                                    <div className="stat-box-chart">
                                        <span className="sb-label">{stat}</span>
                                        {isMaster ? (
                                            <input className="sb-input" value={val} onChange={(e) => updateField(`attributes.${stat}.value`, Number(e.target.value))} />
                                        ) : (
                                            <span className="sb-val">{val}</span>
                                        )}
                                    </div>
                                </foreignObject>
                            );
                        })}
                    </svg>
                </div>
                
                {/* STATUS SECUNDÁRIOS */}
                <div className="secondary-stats">
                    <div className="stat-row">
                        <label>HP</label>
                        <div className="stat-bars-inputs">
                            {isMaster ? <input value={sheet.status.hp.current} onChange={e => updateField('status.hp.current', Number(e.target.value))} /> : <span>{sheet.status.hp.current}</span>}
                            /
                            {isMaster ? <input value={sheet.status.hp.max} onChange={e => updateField('status.hp.max', Number(e.target.value))} /> : <span>{sheet.status.hp.max}</span>}
                        </div>
                    </div>
                    <div className="stat-row">
                        <label>MP</label>
                        <div className="stat-bars-inputs mp">
                            {isMaster ? <input value={sheet.status.mp.current} onChange={e => updateField('status.mp.current', Number(e.target.value))} /> : <span>{sheet.status.mp.current}</span>}
                            /
                            {isMaster ? <input value={sheet.status.mp.max} onChange={e => updateField('status.mp.max', Number(e.target.value))} /> : <span>{sheet.status.mp.max}</span>}
                        </div>
                    </div>
                    <div className="stat-row-simple">
                        <div className="s-box">
                            <label>ARM</label>
                            {isMaster ? <input value={sheet.status.arm.value} onChange={e => updateField('status.arm.value', Number(e.target.value))} /> : <span>{sheet.status.arm.value}</span>}
                        </div>
                        <div className="s-box">
                            <label>RES</label>
                            {isMaster ? <input value={sheet.status.res.value} onChange={e => updateField('status.res.value', Number(e.target.value))} /> : <span>{sheet.status.res.value}</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* COLUNA CENTRAL: EQUIPAMENTOS E IMAGEM */}
            <div className="col-center-equip">
                <div className="char-image-frame">
                    {isMaster ? (
                        <input className="img-url-input" placeholder="Link da Imagem" value={sheet.imgUrl} onChange={e => updateField('imgUrl', e.target.value)} />
                    ) : null}
                    <div className="image-display" style={{backgroundImage: `url(${sheet.imgUrl || 'https://via.placeholder.com/300x400?text=Sem+Imagem'})`}}></div>
                </div>
                
                {/* Slots Orbitais (Posicionados via CSS absolute) */}
                <div className="equip-slots-overlay">
                    {[
                        {id: 0, label: "CABEÇA", top: '5%', left: '50%'},
                        {id: 1, label: "CORPO", top: '30%', right: '-10%'},
                        {id: 2, label: "MÃO DIR.", top: '60%', right: '-10%'},
                        {id: 3, label: "MÃO ESQ.", top: '60%', left: '-10%'},
                        {id: 4, label: "ACESS. 1", top: '30%', left: '-10%'},
                        {id: 5, label: "ACESS. 2", bottom: '-5%', left: '30%'},
                        {id: 6, label: "PÉS", bottom: '-5%', right: '30%'}
                    ].map((slot, idx) => (
                        <div key={idx} className="equip-slot" style={{top: slot.top, left: slot.left, right: slot.right, bottom: slot.bottom}}>
                            <div className="slot-label">{slot.label}</div>
                            {isMaster ? (
                                <input 
                                    className="slot-input" 
                                    value={sheet.equipment?.slots?.[idx]?.item_name || ""} 
                                    onChange={e => updateField(`equipment.slots.${idx}.item_name`, e.target.value)} 
                                    title={sheet.equipment?.slots?.[idx]?.effect}
                                />
                            ) : (
                                <div className="slot-display" title={sheet.equipment?.slots?.[idx]?.effect}>
                                    {sheet.equipment?.slots?.[idx]?.item_name || "Vazio"}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* COLUNA DIREITA: INVENTÁRIO & GIL */}
            <div className="col-inventory">
                <h3 className="section-title">BOLSA & GIL</h3>
                <div className="gil-display">
                    <span className="coin-icon">💰</span>
                    {isMaster ? (
                        <input type="number" value={sheet.inventory.gil} onChange={e => updateField('inventory.gil', Number(e.target.value))} />
                    ) : (
                        <span className="gil-amount">{sheet.inventory.gil}</span>
                    )}
                    <span className="currency">GIL</span>
                </div>

                <div className="items-list">
                    <h4>ITENS NA MOCHILA</h4>
                    <div className="items-scroll">
                        {/* Renderizar Itens Fixos ou Dinâmicos */}
                        {(sheet.inventory.items || []).map((item, idx) => (
                            <div key={idx} className="inv-row">
                                {isMaster ? (
                                    <>
                                        <input className="inv-name" value={item.name} onChange={e => updateField(`inventory.items.${idx}.name`, e.target.value)} />
                                        <input className="inv-qtd" type="number" value={item.quantity} onChange={e => updateField(`inventory.items.${idx}.quantity`, Number(e.target.value))} />
                                    </>
                                ) : (
                                    <>
                                        <span className="i-name">{item.name || "Slot Vazio"}</span>
                                        <span className="i-qtd">x{item.quantity || 0}</span>
                                    </>
                                )}
                            </div>
                        ))}
                        {isMaster && (
                            <button className="add-item-btn" onClick={() => {
                                const newItems = [...(sheet.inventory.items || []), {name: "Novo Item", quantity: 1}];
                                updateField('inventory.items', newItems);
                            }}>+ Adicionar Slot</button>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* LEVEL UP ANIMATION */}
        {showLevelUpAnim && (
            <div className="level-up-overlay">
                <h1 className="levelup-text">LEVEL UP!</h1>
            </div>
        )}

      </div>

      <style>{`
        .ficha-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 200000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .ficha-container { width: 1100px; height: 800px; max-width: 98vw; max-height: 98vh; background: #050a10; border: 2px solid #ffcc00; display: flex; flex-direction: column; position: relative; box-shadow: 0 0 50px rgba(255, 204, 0, 0.2); border-radius: 8px; overflow: hidden; font-family: 'Cinzel', serif; color: #fff; }
        .close-btn-ficha { position: absolute; top: 10px; right: 15px; background: transparent; border: none; color: #f44; font-size: 24px; cursor: pointer; z-index: 10; font-weight: bold; }
        
        .ficha-header { padding: 20px; background: linear-gradient(90deg, #101020, #000); border-bottom: 2px solid #333; display: flex; justify-content: space-between; align-items: center; }
        .header-info h1 { margin: 0; color: #ffcc00; font-size: 32px; letter-spacing: 2px; }
        .sub-header { color: #00f2ff; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        
        .xp-container { display: flex; align-items: center; gap: 15px; width: 50%; }
        .lvl-box { display: flex; flex-direction: column; align-items: center; background: #222; border: 1px solid #ffcc00; padding: 5px 10px; border-radius: 4px; }
        .lvl-box small { font-size: 8px; color: #ffcc00; }
        .lvl-box span { font-size: 24px; font-weight: bold; line-height: 1; }
        
        .xp-bar-box { flex: 1; display: flex; flex-direction: column; }
        .xp-text { text-align: right; font-size: 10px; color: #aaa; margin-bottom: 2px; }
        .xp-track { width: 100%; height: 10px; background: #111; border: 1px solid #444; border-radius: 5px; overflow: hidden; }
        .xp-fill { height: 100%; background: linear-gradient(90deg, #00f2ff, #0088ff); transition: width 0.5s; }
        
        .btn-levelup { background: linear-gradient(to bottom, #ffcc00, #ff8800); border: 2px solid #fff; color: #000; font-weight: bold; padding: 5px 15px; cursor: pointer; border-radius: 20px; animation: glow 1s infinite alternate; font-family: 'Cinzel', serif; }
        @keyframes glow { from { box-shadow: 0 0 10px #ffcc00; } to { box-shadow: 0 0 30px #ffcc00; transform: scale(1.05); } }

        .ficha-body { flex: 1; display: flex; padding: 20px; gap: 20px; overflow: hidden; }
        .col-attributes { width: 300px; display: flex; flex-direction: column; align-items: center; border-right: 1px solid #333; padding-right: 20px; }
        .section-title { color: #aaa; font-size: 14px; border-bottom: 1px solid #00f2ff; width: 100%; text-align: center; margin-bottom: 15px; padding-bottom: 5px; }
        
        .radar-wrapper { position: relative; margin-bottom: 20px; }
        .stat-box-chart { background: #000; border: 1px solid #ffcc00; width: 40px; height: 30px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 4px; box-shadow: 0 0 5px #000; }
        .sb-label { font-size: 8px; color: #aaa; }
        .sb-val { font-size: 12px; font-weight: bold; color: #fff; }
        .sb-input { width: 100%; height: 100%; background: transparent; border: none; color: #ffcc00; text-align: center; font-weight: bold; padding: 0; font-size: 12px; }

        .secondary-stats { width: 100%; }
        .stat-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .stat-row label { font-weight: bold; color: #ffcc00; width: 30px; }
        .stat-bars-inputs { flex: 1; background: rgba(255,0,0,0.1); border: 1px solid #522; padding: 5px; display: flex; align-items: center; justify-content: center; gap: 5px; color: #fff; border-radius: 4px; }
        .stat-bars-inputs.mp { background: rgba(0,0,255,0.1); border-color: #225; }
        .stat-bars-inputs input { background: transparent; border: none; color: #fff; width: 40px; text-align: center; font-family: 'serif'; font-weight: bold; }
        
        .stat-row-simple { display: flex; justify-content: space-between; gap: 10px; margin-top: 15px; }
        .s-box { flex: 1; background: #111; border: 1px solid #444; padding: 10px; text-align: center; border-radius: 4px; }
        .s-box label { display: block; font-size: 10px; color: #888; margin-bottom: 5px; }
        .s-box input { background: transparent; border: none; color: #fff; text-align: center; font-size: 18px; width: 100%; font-weight: bold; }
        .s-box span { font-size: 18px; font-weight: bold; }

        .col-center-equip { flex: 1; position: relative; display: flex; justify-content: center; align-items: center; }
        .char-image-frame { width: 300px; height: 450px; border: 2px solid #333; position: relative; background: #000; border-radius: 150px; overflow: hidden; box-shadow: inset 0 0 50px #000; }
        .img-url-input { position: absolute; top: 10px; left: 20px; right: 20px; z-index: 5; background: rgba(0,0,0,0.7); border: 1px solid #555; color: #fff; font-size: 10px; padding: 2px; text-align: center; }
        .image-display { width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.8; }
        
        .equip-slots-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .equip-slot { position: absolute; pointer-events: auto; width: 140px; text-align: center; transform: translate(-50%, -50%) /* Center align based on position */; }
        /* Fix positioning logic since transform translate is tricky with slot positions */
        .equip-slot { position: absolute; width: 120px; } 
        
        .slot-label { font-size: 9px; color: #00f2ff; text-shadow: 0 0 2px #000; margin-bottom: 2px; font-weight: bold; text-align: center; }
        .slot-display, .slot-input { width: 100%; background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; padding: 8px; color: #fff; font-size: 11px; text-align: center; border-radius: 4px; box-shadow: 0 0 10px rgba(0,0,0,0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .slot-input { outline: none; font-family: 'serif'; }

        .col-inventory { width: 280px; border-left: 1px solid #333; padding-left: 20px; display: flex; flex-direction: column; }
        .gil-display { background: linear-gradient(90deg, rgba(255,204,0,0.1), transparent); border: 1px solid #ffcc00; padding: 15px; border-radius: 4px; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .coin-icon { font-size: 20px; }
        .gil-amount { font-size: 24px; font-weight: bold; color: #fff; flex: 1; text-align: right; }
        .gil-display input { background: transparent; border: none; color: #fff; font-size: 24px; font-weight: bold; width: 100%; text-align: right; outline: none; }
        .currency { font-size: 10px; color: #ffcc00; font-weight: bold; }

        .items-list { flex: 1; display: flex; flex-direction: column; }
        .items-list h4 { color: #888; font-size: 12px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 10px; }
        .items-scroll { flex: 1; overflow-y: auto; padding-right: 5px; }
        .inv-row { display: flex; justify-content: space-between; border-bottom: 1px solid #222; padding: 8px 0; font-size: 12px; }
        .inv-name { background: transparent; border: none; color: #ddd; flex: 1; font-family: 'serif'; }
        .inv-qtd { background: transparent; border: none; color: #00f2ff; width: 40px; text-align: right; font-weight: bold; }
        .i-name { color: #ddd; }
        .i-qtd { color: #00f2ff; font-weight: bold; }
        .add-item-btn { width: 100%; background: #222; border: 1px dashed #555; color: #888; padding: 5px; cursor: pointer; margin-top: 10px; font-size: 10px; }
        .add-item-btn:hover { border-color: #fff; color: #fff; }

        .level-up-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeOverlay 4s forwards; pointer-events: none; }
        .levelup-text { font-size: 80px; color: #ffcc00; text-shadow: 0 0 50px #ffcc00, 0 0 20px #fff; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); letter-spacing: 5px; }
        @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeOverlay { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}