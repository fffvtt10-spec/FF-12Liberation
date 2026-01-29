import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

export default function Ficha({ characterData, isMaster, onClose }) {
  // Estado local da ficha
  const [sheet, setSheet] = useState(characterData.character_sheet || {
    basic_info: { 
        character_name: characterData.name, 
        level: 1, 
        experience: { current: 0, max: 100 }, 
        race: characterData.race, 
        class: characterData.class,
        guild_rank: "Iniciado",
        guild_insignia: "", 
        guild_rank_image: "" 
    },
    attributes: { 
        FOR: { value: 0 }, CONS: { value: 0 }, INT: { value: 0 }, 
        SOR: { value: 0 }, CAR: { value: 0 }, VEL: { value: 0 } 
    },
    status: { 
        hp: { current: 10, max: 10 }, 
        mp: { current: 5, max: 5 }, 
        arm: { value: 0 }, 
        res: { value: 0 },
        mov: { value: 3 }
    },
    equipment: { 
        slots: Array(7).fill({ item_name: "", item_img: "", effect: "-" }) 
    },
    job_system: {
        primary_class: { 
            name: characterData.class || "Classe Primária", 
            skills: Array(4).fill({ name: "", cost: "", effect: "" }) 
        },
        secondary_class: { 
            name: "Classe Secundária", 
            skills: Array(4).fill({ name: "", cost: "", effect: "" }) 
        },
        reaction_ability: { name: "", effect: "" },
        passive_ability: { name: "", effect: "" },
        class_bonus: { value: "" }
    },
    inventory: { gil: 0, items: [] },
    imgUrl: "" 
  });

  const [activeTab, setActiveTab] = useState('geral'); 
  const [showLevelUpAnim, setShowLevelUpAnim] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Indicador visual

  // Efeito para atualizar a ficha do JOGADOR em tempo real quando o mestre salvar no banco
  useEffect(() => {
    if (!isMaster && characterData.character_sheet) {
        setSheet(characterData.character_sheet);
    }
  }, [characterData, isMaster]);

  // Função para atualizar o ESTADO LOCAL (Edição)
  const updateField = (path, value) => {
    if (!isMaster) return;
    
    const newSheet = JSON.parse(JSON.stringify(sheet));
    const keys = path.split('.');
    let ref = newSheet;
    
    for (let i = 0; i < keys.length - 1; i++) {
        if (!ref[keys[i]]) ref[keys[i]] = {}; 
        ref = ref[keys[i]];
    }
    
    ref[keys[keys.length - 1]] = value;
    setSheet(newSheet);
    setHasUnsavedChanges(true);
  };

  // Função para SALVAR NO FIREBASE (Botão do Mestre)
  const saveSheetToDb = async () => {
      try {
        const charRef = doc(db, "characters", characterData.uid || characterData.id);
        await updateDoc(charRef, { character_sheet: sheet });
        setHasUnsavedChanges(false);
        alert("Ficha salva com sucesso!");
      } catch (error) {
          console.error("Erro ao salvar:", error);
          alert("Erro ao salvar ficha.");
      }
  };

  const handleLevelUp = async () => {
    if(!isMaster) return;
    setShowLevelUpAnim(true);
    setTimeout(async () => {
        setShowLevelUpAnim(false);
        const currentLvl = sheet.basic_info.level || 1;
        const newXpMax = Math.floor(sheet.basic_info.experience.max * 1.5);
        
        // Atualiza localmente e salva automaticamente pois é um evento crítico
        const newSheet = JSON.parse(JSON.stringify(sheet));
        newSheet.basic_info.level = currentLvl + 1;
        newSheet.basic_info.experience.current = 0;
        newSheet.basic_info.experience.max = newXpMax;
        
        setSheet(newSheet);
        
        const charRef = doc(db, "characters", characterData.uid || characterData.id);
        await updateDoc(charRef, { character_sheet: newSheet });
    }, 4000);
  };

  // --- RADAR CHART LOGIC ---
  const stats = ['FOR', 'INT', 'SOR', 'CAR', 'VEL', 'CONS'];
  const maxStat = 100;
  const radius = 90;
  const center = 150;

  const getPoint = (value, index, total) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const x = center + (radius * (value / maxStat)) * Math.cos(angle);
    const y = center + (radius * (value / maxStat)) * Math.sin(angle);
    return { x, y };
  };

  const polyPoints = stats.map((stat, i) => {
    const val = sheet.attributes?.[stat]?.value || 0;
    const { x, y } = getPoint(val, i, stats.length);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="ficha-overlay-fixed">
      <div className="ficha-container fade-in">
        <button className="close-btn-ficha" onClick={onClose}>✕</button>
        
        {/* BOTÃO DE SALVAR (APENAS MESTRE) */}
        {isMaster && (
            <button 
                className={`save-btn-master ${hasUnsavedChanges ? 'unsaved' : ''}`} 
                onClick={saveSheetToDb}
            >
                {hasUnsavedChanges ? "💾 SALVAR ALTERAÇÕES" : "FICHA SALVA"}
            </button>
        )}

        {/* --- CABEÇALHO --- */}
        <div className="ficha-header">
            {/* Esquerda: Signo (Antiga Insignia) */}
            <div className="guild-insignia-box">
                <span className="header-label-top">SIGNO</span>
                {isMaster ? (
                    <input 
                        className="guild-img-input" 
                        placeholder="URL Img"
                        value={sheet.basic_info.guild_insignia || ""}
                        onChange={e => updateField('basic_info.guild_insignia', e.target.value)}
                    />
                ) : null}
                <div className="insignia-display" style={{backgroundImage: `url(${sheet.basic_info.guild_insignia || 'https://via.placeholder.com/60?text=Signo'})`}}></div>
            </div>

            {/* Centro: Infos Básicas */}
            <div className="header-info">
                <h1>{sheet.basic_info.character_name}</h1>
                <span className="sub-header">{sheet.basic_info.race} // {characterData.class}</span>
                
                {/* XP BAR */}
                <div className="xp-container">
                    <div className="lvl-box">
                        <small>LVL</small>
                        <span>{sheet.basic_info.level}</span>
                    </div>
                    <div className="xp-bar-box">
                        <div className="xp-text">XP {sheet.basic_info.experience.current} / {sheet.basic_info.experience.max}</div>
                        <div className="xp-track">
                            <div className="xp-fill" style={{width: `${Math.min((sheet.basic_info.experience.current / sheet.basic_info.experience.max) * 100, 100)}%`}}></div>
                        </div>
                    </div>
                    {isMaster && sheet.basic_info.experience.current >= sheet.basic_info.experience.max && (
                        <button className="btn-levelup glowing" onClick={handleLevelUp}>⚡ LEVEL UP ⚡</button>
                    )}
                </div>
            </div>

            {/* Direita: Rank Guilda */}
            <div className="guild-rank-box">
                <span className="header-label-top">RANK</span>
                {isMaster ? (
                    <>
                        <input className="rank-name-input" value={sheet.basic_info.guild_rank} onChange={e => updateField('basic_info.guild_rank', e.target.value)} />
                        <input className="guild-img-input rank" placeholder="URL Rank" value={sheet.basic_info.guild_rank_image || ""} onChange={e => updateField('basic_info.guild_rank_image', e.target.value)} />
                    </>
                ) : (
                    <span className="rank-name">{sheet.basic_info.guild_rank}</span>
                )}
                <div className="rank-display" style={{backgroundImage: `url(${sheet.basic_info.guild_rank_image || 'https://via.placeholder.com/60?text=Rank'})`}}></div>
            </div>
        </div>

        {/* --- NAVEGAÇÃO DE ABAS --- */}
        <div className="ficha-tabs">
            <button className={`tab-btn ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>VISÃO GERAL</button>
            <button className={`tab-btn ${activeTab === 'habilidades' ? 'active' : ''}`} onClick={() => setActiveTab('habilidades')}>GRIMÓRIO DE HABILIDADES</button>
        </div>

        {/* --- CORPO --- */}
        <div className="ficha-body">
            
            {activeTab === 'geral' ? (
                <>
                    {/* COLUNA ESQUERDA: ATRIBUTOS */}
                    <div className="col-attributes">
                        <h3 className="section-title">ATRIBUTOS</h3>
                        <div className="radar-wrapper">
                            <svg width="300" height="300" viewBox="0 0 300 300">
                                {[20, 40, 60, 80, 100].map(r => (
                                    <polygon key={r} points={stats.map((_, i) => { const {x,y} = getPoint(r, i, 6); return `${x},${y}`; }).join(" ")} fill="none" stroke="#333" strokeWidth="1" />
                                ))}
                                <polygon points={polyPoints} fill="rgba(0, 242, 255, 0.2)" stroke="#00f2ff" strokeWidth="2" />
                                {stats.map((stat, i) => {
                                    const {x, y} = getPoint(115, i, 6);
                                    const val = sheet.attributes?.[stat]?.value || 0;
                                    return (
                                        <foreignObject x={x - 20} y={y - 15} width="40" height="30" key={stat}>
                                            <div className="stat-box-chart">
                                                <span className="sb-label">{stat}</span>
                                                {isMaster ? <input className="sb-input" value={val} onChange={(e) => updateField(`attributes.${stat}.value`, Number(e.target.value))} /> : <span className="sb-val">{val}</span>}
                                            </div>
                                        </foreignObject>
                                    );
                                })}
                            </svg>
                        </div>
                        
                        <div className="secondary-stats">
                            <div className="stat-row"><label>HP</label><div className="stat-bars-inputs">{isMaster ? <input value={sheet.status.hp.current} onChange={e => updateField('status.hp.current', Number(e.target.value))} /> : <span>{sheet.status.hp.current}</span>}/{isMaster ? <input value={sheet.status.hp.max} onChange={e => updateField('status.hp.max', Number(e.target.value))} /> : <span>{sheet.status.hp.max}</span>}</div></div>
                            <div className="stat-row"><label>MP</label><div className="stat-bars-inputs mp">{isMaster ? <input value={sheet.status.mp.current} onChange={e => updateField('status.mp.current', Number(e.target.value))} /> : <span>{sheet.status.mp.current}</span>}/{isMaster ? <input value={sheet.status.mp.max} onChange={e => updateField('status.mp.max', Number(e.target.value))} /> : <span>{sheet.status.mp.max}</span>}</div></div>
                            <div className="stat-row-simple">
                                <div className="s-box"><label>ARM</label>{isMaster ? <input value={sheet.status.arm.value} onChange={e => updateField('status.arm.value', Number(e.target.value))} /> : <span>{sheet.status.arm.value}</span>}</div>
                                <div className="s-box"><label>RES</label>{isMaster ? <input value={sheet.status.res.value} onChange={e => updateField('status.res.value', Number(e.target.value))} /> : <span>{sheet.status.res.value}</span>}</div>
                                <div className="s-box"><label>MOV</label>{isMaster ? <input value={sheet.status.mov?.value || 3} onChange={e => updateField('status.mov.value', Number(e.target.value))} /> : <span>{sheet.status.mov?.value || 3}</span>}</div>
                            </div>
                        </div>
                    </div>

                    {/* COLUNA CENTRAL: EQUIPAMENTOS (Ajustado Posições) */}
                    <div className="col-center-equip">
                        <div className="char-image-frame">
                            {isMaster ? <input className="img-url-input" placeholder="Link da Imagem" value={sheet.imgUrl} onChange={e => updateField('imgUrl', e.target.value)} /> : null}
                            <div className="image-display" style={{backgroundImage: `url(${sheet.imgUrl || 'https://via.placeholder.com/300x400?text=Sem+Imagem'})`}}></div>
                        </div>
                        
                        <div className="equip-slots-overlay">
                            {[
                                {id: 0, label: "CABEÇA", top: '0%', left: '50%'}, // Mais pra cima
                                {id: 1, label: "CORPO", top: '25%', right: '-25%'}, // Mais pra fora
                                {id: 2, label: "MÃO DIR.", bottom: '25%', right: '-25%'}, // Mais pra fora
                                {id: 3, label: "MÃO ESQ.", bottom: '25%', left: '-25%'}, // Mais pra fora
                                {id: 4, label: "ACESS. 1", top: '25%', left: '-25%'}, // Mais pra fora
                                {id: 5, label: "ACESS. 2", bottom: '-15%', left: '20%'}, // Mais pra baixo
                                {id: 6, label: "PÉS", bottom: '-15%', right: '20%'} // Mais pra baixo
                            ].map((slot, idx) => (
                                <div key={idx} className="equip-slot" style={{top: slot.top, left: slot.left, right: slot.right, bottom: slot.bottom}}>
                                    <div className="slot-label">{slot.label}</div>
                                    <div className="slot-square">
                                        {sheet.equipment?.slots?.[idx]?.item_img ? (
                                            <div className="item-bg" style={{backgroundImage: `url(${sheet.equipment.slots[idx].item_img})`}}></div>
                                        ) : (
                                            <span className="empty-text">{sheet.equipment?.slots?.[idx]?.item_name || "Vazio"}</span>
                                        )}
                                        {isMaster && (
                                            <div className="master-slot-edit">
                                                <input className="slot-mini-in" placeholder="Nome" value={sheet.equipment?.slots?.[idx]?.item_name || ""} onChange={e => updateField(`equipment.slots.${idx}.item_name`, e.target.value)} />
                                                <input className="slot-mini-in" placeholder="Img URL" value={sheet.equipment?.slots?.[idx]?.item_img || ""} onChange={e => updateField(`equipment.slots.${idx}.item_img`, e.target.value)} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* COLUNA DIREITA: INVENTÁRIO */}
                    <div className="col-inventory">
                        <h3 className="section-title">BOLSA & GIL</h3>
                        <div className="gil-display">
                            <span className="coin-icon">💰</span>
                            {isMaster ? <input type="number" value={sheet.inventory.gil} onChange={e => updateField('inventory.gil', Number(e.target.value))} /> : <span className="gil-amount">{sheet.inventory.gil}</span>}
                            <span className="currency">GIL</span>
                        </div>
                        <div className="items-list">
                            <h4>MOCHILA</h4>
                            <div className="items-scroll">
                                {(sheet.inventory.items || []).map((item, idx) => (
                                    <div key={idx} className="inv-row">
                                        {isMaster ? (
                                            <>
                                                <input className="inv-name" value={item.name} onChange={e => updateField(`inventory.items.${idx}.name`, e.target.value)} />
                                                <input className="inv-qtd" type="number" value={item.quantity} onChange={e => updateField(`inventory.items.${idx}.quantity`, Number(e.target.value))} />
                                            </>
                                        ) : (
                                            <><span className="i-name">{item.name || "Slot Vazio"}</span><span className="i-qtd">x{item.quantity || 0}</span></>
                                        )}
                                    </div>
                                ))}
                                {isMaster && <button className="add-item-btn" onClick={() => updateField('inventory.items', [...(sheet.inventory.items || []), {name: "Novo Item", quantity: 1}])}>+ Slot</button>}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // --- ABA DE HABILIDADES ---
                <div className="skills-tab-content">
                    <div className="skills-col">
                        <h3 className="class-header">
                            {isMaster ? <input className="class-name-input" value={sheet.job_system?.primary_class?.name} onChange={e => updateField('job_system.primary_class.name', e.target.value)} /> : sheet.job_system?.primary_class?.name}
                        </h3>
                        <div className="skills-list">
                            {(sheet.job_system?.primary_class?.skills || []).map((skill, i) => (
                                <div key={i} className="skill-card">
                                    <div className="skill-top">
                                        {isMaster ? <input placeholder="Nome Habilidade" value={skill.name} onChange={e => updateField(`job_system.primary_class.skills.${i}.name`, e.target.value)} className="skill-name-in" /> : <strong className="skill-name">{skill.name || "Slot Vazio"}</strong>}
                                        {isMaster ? <input placeholder="Custo" value={skill.cost} onChange={e => updateField(`job_system.primary_class.skills.${i}.cost`, e.target.value)} className="skill-cost-in" /> : <span className="skill-cost">{skill.cost}</span>}
                                    </div>
                                    {isMaster ? <textarea placeholder="Efeito..." value={skill.effect} onChange={e => updateField(`job_system.primary_class.skills.${i}.effect`, e.target.value)} className="skill-desc-in" /> : <p className="skill-desc">{skill.effect}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="skills-col">
                        <h3 className="class-header secondary">
                            {isMaster ? <input className="class-name-input" value={sheet.job_system?.secondary_class?.name} onChange={e => updateField('job_system.secondary_class.name', e.target.value)} /> : sheet.job_system?.secondary_class?.name}
                        </h3>
                        <div className="skills-list">
                            {(sheet.job_system?.secondary_class?.skills || []).map((skill, i) => (
                                <div key={i} className="skill-card secondary">
                                    <div className="skill-top">
                                        {isMaster ? <input placeholder="Nome Habilidade" value={skill.name} onChange={e => updateField(`job_system.secondary_class.skills.${i}.name`, e.target.value)} className="skill-name-in" /> : <strong className="skill-name">{skill.name || "Slot Vazio"}</strong>}
                                        {isMaster ? <input placeholder="Custo" value={skill.cost} onChange={e => updateField(`job_system.secondary_class.skills.${i}.cost`, e.target.value)} className="skill-cost-in" /> : <span className="skill-cost">{skill.cost}</span>}
                                    </div>
                                    {isMaster ? <textarea placeholder="Efeito..." value={skill.effect} onChange={e => updateField(`job_system.secondary_class.skills.${i}.effect`, e.target.value)} className="skill-desc-in" /> : <p className="skill-desc">{skill.effect}</p>}
                                </div>
                            ))}
                        </div>

                        <div className="extra-abilities-box">
                            <div className="ability-row">
                                <label>REAÇÃO</label>
                                {isMaster ? <input value={sheet.job_system?.reaction_ability?.name} onChange={e => updateField('job_system.reaction_ability.name', e.target.value)} className="ab-input" /> : <span>{sheet.job_system?.reaction_ability?.name || "-"}</span>}
                            </div>
                            <div className="ability-row">
                                <label>PASSIVA</label>
                                {isMaster ? <input value={sheet.job_system?.passive_ability?.name} onChange={e => updateField('job_system.passive_ability.name', e.target.value)} className="ab-input" /> : <span>{sheet.job_system?.passive_ability?.name || "-"}</span>}
                            </div>
                            <div className="bonus-row">
                                <label>BÔNUS DE CLASSE</label>
                                {isMaster ? <textarea value={sheet.job_system?.class_bonus?.value} onChange={e => updateField('job_system.class_bonus.value', e.target.value)} className="bonus-area" /> : <p>{sheet.job_system?.class_bonus?.value || "Nenhum"}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* LEVEL UP ANIMATION */}
        {showLevelUpAnim && (
            <div className="level-up-overlay"><h1 className="levelup-text">LEVEL UP!</h1></div>
        )}

      </div>

      <style>{`
        .ficha-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 200000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); }
        .ficha-container { width: 1100px; height: 850px; max-width: 98vw; max-height: 98vh; background: #050a10; border: 2px solid #ffcc00; display: flex; flex-direction: column; position: relative; box-shadow: 0 0 50px rgba(255, 204, 0, 0.2); border-radius: 8px; overflow: hidden; font-family: 'Cinzel', serif; color: #fff; }
        .close-btn-ficha { position: absolute; top: 10px; right: 15px; background: transparent; border: none; color: #f44; font-size: 24px; cursor: pointer; z-index: 10; font-weight: bold; }
        
        .save-btn-master { position: absolute; top: 10px; right: 60px; background: #222; border: 1px solid #444; color: #aaa; padding: 5px 15px; cursor: default; font-weight: bold; font-size: 11px; z-index: 10; transition: 0.3s; }
        .save-btn-master.unsaved { background: #00f2ff; color: #000; cursor: pointer; border-color: #fff; box-shadow: 0 0 15px #00f2ff; animation: pulseSave 1.5s infinite; }
        @keyframes pulseSave { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }

        /* HEADER */
        .ficha-header { padding: 25px 30px 10px 30px; background: linear-gradient(90deg, #101020, #000); border-bottom: 2px solid #333; display: flex; justify-content: space-between; align-items: center; height: 140px; position: relative; }
        .guild-insignia-box, .guild-rank-box { display: flex; flex-direction: column; align-items: center; width: 80px; position: relative; padding-top: 10px; }
        .header-label-top { font-size: 10px; color: #ffcc00; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
        .insignia-display, .rank-display { width: 70px; height: 70px; background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid #333; border-radius: 50%; background-color: #000; }
        .guild-img-input { position: absolute; top: 20px; width: 100%; font-size: 9px; background: rgba(0,0,0,0.8); border: none; color: #fff; z-index: 2; opacity: 0; transition: opacity 0.2s; }
        .guild-insignia-box:hover .guild-img-input, .guild-rank-box:hover .guild-img-input { opacity: 1; }
        .rank-name { font-size: 10px; color: #ffcc00; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-top: 5px; }
        .rank-name-input { width: 100%; background: transparent; border: none; color: #ffcc00; font-size: 10px; text-align: center; border-bottom: 1px solid #444; margin-top: 5px; }

        .header-info { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .header-info h1 { margin: 0; color: #ffcc00; font-size: 36px; letter-spacing: 4px; text-shadow: 0 0 10px rgba(255,204,0,0.3); }
        .sub-header { color: #00f2ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; }
        
        .xp-container { display: flex; align-items: center; gap: 15px; width: 60%; margin-top: 5px; }
        .lvl-box { display: flex; flex-direction: column; align-items: center; background: #222; border: 1px solid #ffcc00; padding: 5px 12px; border-radius: 4px; box-shadow: 0 0 10px rgba(255,204,0,0.2); }
        .lvl-box small { font-size: 8px; color: #ffcc00; }
        .lvl-box span { font-size: 24px; font-weight: bold; line-height: 1; }
        .xp-bar-box { flex: 1; display: flex; flex-direction: column; }
        .xp-text { text-align: right; font-size: 10px; color: #aaa; margin-bottom: 2px; }
        .xp-track { width: 100%; height: 8px; background: #111; border: 1px solid #444; border-radius: 4px; overflow: hidden; }
        .xp-fill { height: 100%; background: linear-gradient(90deg, #00f2ff, #0088ff); transition: width 0.5s; }
        .btn-levelup { background: linear-gradient(to bottom, #ffcc00, #ff8800); border: 2px solid #fff; color: #000; font-weight: bold; padding: 5px 15px; cursor: pointer; border-radius: 20px; animation: glow 1s infinite alternate; font-family: 'Cinzel', serif; font-size: 10px; }
        @keyframes glow { from { box-shadow: 0 0 10px #ffcc00; } to { box-shadow: 0 0 30px #ffcc00; transform: scale(1.05); } }

        /* TABS */
        .ficha-tabs { display: flex; background: #111; border-bottom: 1px solid #333; margin-top: 0; }
        .tab-btn { flex: 1; background: transparent; border: none; padding: 15px; color: #666; font-family: 'Cinzel', serif; font-size: 16px; cursor: pointer; transition: 0.3s; border-bottom: 3px solid transparent; }
        .tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .tab-btn.active { color: #ffcc00; border-bottom: 3px solid #ffcc00; background: rgba(255, 204, 0, 0.05); }

        .ficha-body { flex: 1; display: flex; padding: 30px 20px; gap: 20px; overflow: hidden; position: relative; }
        
        /* COLUNA ATRIBUTOS */
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

        /* COLUNA EQUIPAMENTOS (Ajustado) */
        .col-center-equip { flex: 1; position: relative; display: flex; justify-content: center; align-items: center; }
        .char-image-frame { width: 300px; height: 450px; border: 2px solid #333; position: relative; background: #000; border-radius: 150px; overflow: hidden; box-shadow: inset 0 0 50px #000; margin-top: -20px; }
        .img-url-input { position: absolute; top: 10px; left: 20px; right: 20px; z-index: 5; background: rgba(0,0,0,0.7); border: 1px solid #555; color: #fff; font-size: 10px; padding: 2px; text-align: center; }
        .image-display { width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.8; }
        
        .equip-slots-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
        .equip-slot { position: absolute; width: 80px; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); pointer-events: auto; }
        .slot-label { font-size: 9px; color: #00f2ff; text-shadow: 0 0 2px #000; margin-bottom: 4px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .slot-square { width: 60px; height: 60px; background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(0,0,0,0.8); position: relative; overflow: hidden; border-radius: 4px; }
        .item-bg { width: 100%; height: 100%; background-size: cover; background-position: center; }
        .empty-text { font-size: 9px; color: #666; text-align: center; line-height: 1; padding: 2px; }
        .master-slot-edit { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); opacity: 0; transition: opacity 0.2s; display: flex; flex-direction: column; }
        .slot-square:hover .master-slot-edit { opacity: 1; }
        .slot-mini-in { width: 100%; height: 50%; border: none; border-bottom: 1px solid #333; background: transparent; color: #fff; font-size: 8px; padding: 2px; text-align: center; }

        /* COLUNA INVENTÁRIO */
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

        /* ABA HABILIDADES */
        .skills-tab-content { display: flex; width: 100%; height: 100%; gap: 30px; }
        .skills-col { flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.3); border: 1px solid #333; padding: 15px; border-radius: 4px; }
        .class-header { color: #00f2ff; font-size: 18px; border-bottom: 2px solid #00f2ff; padding-bottom: 10px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 2px; }
        .class-header.secondary { color: #aaa; border-color: #666; }
        .class-name-input { background: transparent; border: none; color: inherit; font-size: inherit; font-weight: bold; width: 100%; text-transform: uppercase; }
        .skills-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
        .skill-card { background: rgba(0, 30, 60, 0.4); border: 1px solid #005577; padding: 10px; border-radius: 4px; }
        .skill-card.secondary { background: rgba(30, 30, 30, 0.4); border-color: #444; }
        .skill-top { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; }
        .skill-name { color: #ffcc00; font-size: 14px; }
        .skill-cost { color: #00f2ff; font-size: 12px; font-weight: bold; }
        .skill-desc { font-size: 12px; color: #ccc; line-height: 1.4; margin: 0; }
        .skill-name-in, .skill-cost-in { background: transparent; border: none; color: #fff; font-size: 12px; }
        .skill-name-in { flex: 1; font-weight: bold; color: #ffcc00; }
        .skill-cost-in { width: 50px; text-align: right; color: #00f2ff; }
        .skill-desc-in { width: 100%; background: transparent; border: none; color: #ccc; font-size: 12px; resize: none; font-family: sans-serif; }
        .extra-abilities-box { margin-top: 20px; border-top: 2px solid #444; padding-top: 15px; }
        .ability-row { display: flex; align-items: center; margin-bottom: 10px; background: #222; padding: 8px; border-radius: 4px; border-left: 3px solid #ffcc00; }
        .ability-row label { font-size: 10px; color: #888; width: 60px; font-weight: bold; }
        .ability-row span { font-size: 12px; color: #fff; font-weight: bold; }
        .ab-input { background: transparent; border: none; color: #fff; font-weight: bold; flex: 1; font-size: 12px; }
        .bonus-row { margin-top: 10px; }
        .bonus-row label { font-size: 10px; color: #00f2ff; display: block; margin-bottom: 5px; font-weight: bold; }
        .bonus-row p { font-size: 12px; color: #ddd; font-style: italic; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 4px; }
        .bonus-area { width: 100%; height: 60px; background: rgba(0,0,0,0.5); border: 1px solid #444; color: #ddd; font-size: 12px; padding: 5px; resize: none; }

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