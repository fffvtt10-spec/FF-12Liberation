import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, updateDoc, collection, query, where, getDocs, onSnapshot, serverTimestamp } from "firebase/firestore";

// --- LISTA DE ÍCONES DE HABILIDADE ---
const SKILL_ICONS = [
    'h-Basica.png',
    'h-avançada.png',
    'h-lendaria.png',
    'h-magica.png',
    'h-mestre.png',
    'h-passiva.png',
    'h-reacao.png',
    'h-secreta.png'
];

// --- MODAL DE UPLOAD DE IMAGEM (CENTRALIZADO) ---
const ImageUploadModal = ({ isOpen, onClose, onSave, label }) => {
    const [tempUrl, setTempUrl] = useState("");

    if (!isOpen) return null;

    return (
        <div className="img-modal-overlay" onClick={onClose}>
            <div className="img-modal-content" onClick={e => e.stopPropagation()}>
                <h3>ALTERAR IMAGEM: {label.toUpperCase()}</h3>
                <input 
                    placeholder="Cole o link da imagem (Imgur, Discord, etc)..." 
                    value={tempUrl} 
                    onChange={e => setTempUrl(e.target.value)} 
                    autoFocus
                />
                <div className="img-modal-actions">
                    <button onClick={() => { onSave(tempUrl); onClose(); }} className="btn-confirm">CONFIRMAR</button>
                    <button onClick={onClose} className="btn-cancel">CANCELAR</button>
                </div>
            </div>
        </div>
    );
};

export default function Ficha({ characterData, isMaster, onClose }) {
  // Estado local da ficha
  const [sheet, setSheet] = useState(characterData.character_sheet || {});

  const [activeTab, setActiveTab] = useState('geral'); 
  const [showLevelUpAnim, setShowLevelUpAnim] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); 
  
  // Estados de Upload
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadCallback, setUploadCallback] = useState(null);

  // Estados de Forja
  const [showForgeSelector, setShowForgeSelector] = useState(false); 
  const [forgeItems, setForgeItems] = useState([]); 
  const [activeSlotIndex, setActiveSlotIndex] = useState(null); 
  const [viewItemDetails, setViewItemDetails] = useState(null); 

  // Estado para Drag and Drop de Skills
  const [draggedSkill, setDraggedSkill] = useState(null);
  const [dragSource, setDragSource] = useState(null); 
  
  // Estado para Seleção de Ícone de Habilidade
  const [iconSelectorTarget, setIconSelectorTarget] = useState(null); // { listType, skillIndex }

  // Ref para level up
  const prevLevelRef = useRef(sheet.basic_info?.level);

  // Efeito para atualizar a ficha em tempo real e garantir arrays
  useEffect(() => {
    if (characterData && characterData.character_sheet) {
        const loadedSheet = characterData.character_sheet;
        
        // Garantir que passives e reactions sejam arrays se não existirem
        if (!loadedSheet.job_system.passives) loadedSheet.job_system.passives = [];
        if (!loadedSheet.job_system.reactions) loadedSheet.job_system.reactions = [];

        setSheet(loadedSheet);
    }
  }, [characterData]); 

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

  const saveSheetToDb = async () => {
      try {
        const charRef = doc(db, "characters", characterData.uid || characterData.id);
        await updateDoc(charRef, { character_sheet: sheet });
        setHasUnsavedChanges(false);
      } catch (error) {
          console.error("Erro ao salvar:", error);
          alert("Erro ao salvar ficha.");
      }
  };

  const openUploadModal = (label, callback) => {
      if(!isMaster) return;
      setUploadLabel(label);
      setUploadCallback(() => callback);
      setUploadModalOpen(true);
  };

  // --- LÓGICA DE SKILLS (DRAG AND DROP & XP & ICON) ---
  const handleDragStart = (e, skill, source, index) => {
      if (!isMaster) return; 
      setDraggedSkill({ skill, index });
      setDragSource(source);
      e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
      e.preventDefault();
  };

  const handleDrop = (e, targetSource, targetIndex) => {
      e.preventDefault();
      if (!draggedSkill || !isMaster) return;
      if (dragSource !== targetSource) return;

      const newSheet = JSON.parse(JSON.stringify(sheet));
      
      const getList = (s, src) => {
          if (src === 'primary') return s.job_system.primary_class.skills;
          if (src === 'secondary') return s.job_system.secondary_class.skills;
          if (src === 'passives') return s.job_system.passives;
          if (src === 'reactions') return s.job_system.reactions;
          return [];
      };

      const sourceList = getList(newSheet, dragSource);
      const [movedItem] = sourceList.splice(draggedSkill.index, 1);
      sourceList.splice(targetIndex, 0, movedItem);

      setSheet(newSheet);
      setHasUnsavedChanges(true);
      setDraggedSkill(null);
      setDragSource(null);
  };

  const addSkillSlot = (listType) => {
      const generateId = () => '_' + Math.random().toString(36).substr(2, 9);
      const newSheet = JSON.parse(JSON.stringify(sheet));
      
      const newSkill = { id: generateId(), name: "", cost: "", effect: "", xp: { current: 0, max: 100 }, master: false, icon: "h-Basica.png" };

      if (listType === 'primary') newSheet.job_system.primary_class.skills.push(newSkill);
      else if (listType === 'secondary') newSheet.job_system.secondary_class.skills.push(newSkill);
      else if (listType === 'passives') {
          if(!newSheet.job_system.passives) newSheet.job_system.passives = [];
          newSheet.job_system.passives.push(newSkill);
      }
      else if (listType === 'reactions') {
          if(!newSheet.job_system.reactions) newSheet.job_system.reactions = [];
          newSheet.job_system.reactions.push(newSkill);
      }

      setSheet(newSheet);
      setHasUnsavedChanges(true);
  };

  const removeSkillSlot = (listType, index) => {
      if (!window.confirm("Remover este slot de habilidade?")) return;
      const newSheet = JSON.parse(JSON.stringify(sheet));
      
      if (listType === 'primary') newSheet.job_system.primary_class.skills.splice(index, 1);
      else if (listType === 'secondary') newSheet.job_system.secondary_class.skills.splice(index, 1);
      else if (listType === 'passives') newSheet.job_system.passives.splice(index, 1);
      else if (listType === 'reactions') newSheet.job_system.reactions.splice(index, 1);

      setSheet(newSheet);
      setHasUnsavedChanges(true);
  };

  const toggleMastery = (listType, index) => {
      const newSheet = JSON.parse(JSON.stringify(sheet));
      let skill;
      if (listType === 'primary') skill = newSheet.job_system.primary_class.skills[index];
      else if (listType === 'secondary') skill = newSheet.job_system.secondary_class.skills[index];
      else if (listType === 'passives') skill = newSheet.job_system.passives[index];
      else if (listType === 'reactions') skill = newSheet.job_system.reactions[index];

      skill.master = true;
      skill.xp.current = skill.xp.max; 
      setSheet(newSheet);
      setHasUnsavedChanges(true);
  };

  const handleSkillIconSelect = (iconName) => {
      if (!iconSelectorTarget) return;
      const { listType, skillIndex } = iconSelectorTarget;
      
      let path = "";
      if (listType === 'primary') path = `job_system.primary_class.skills.${skillIndex}.icon`;
      else if (listType === 'secondary') path = `job_system.secondary_class.skills.${skillIndex}.icon`;
      else if (listType === 'passives') path = `job_system.passives.${skillIndex}.icon`;
      else if (listType === 'reactions') path = `job_system.reactions.${skillIndex}.icon`;

      updateField(path, iconName);
      setIconSelectorTarget(null);
  };

  // --- FORJA & EQUIPAMENTOS ---
  const handleOpenForgeSelector = async (slotIndex) => {
      if(!isMaster) return;
      setActiveSlotIndex(slotIndex);
      const q = query(collection(db, "game_items"), where("status", "==", "vault"));
      const snap = await getDocs(q);
      const allVaultItems = snap.docs.map(d => ({id: d.id, ...d.data()}));
      const filteredItems = allVaultItems.filter(item => !item.ownerId || item.ownerId === (characterData.uid || characterData.id));
      setForgeItems(filteredItems);
      setShowForgeSelector(true);
  };

  const handleEquipItem = async (item) => {
      const newSheet = JSON.parse(JSON.stringify(sheet));
      newSheet.equipment.slots[activeSlotIndex] = {
          item_id: item.id,
          item_name: item.nome,
          item_img: item.imagem,
          description: item.descricao,
          effect: "" 
      };
      setSheet(newSheet);
      setHasUnsavedChanges(true);
      const itemRef = doc(db, "game_items", item.id);
      await updateDoc(itemRef, { status: 'equipped', ownerId: characterData.uid || characterData.id, slotIndex: activeSlotIndex, updatedAt: serverTimestamp() });
      setShowForgeSelector(false);
  };

  const handleUnequipItem = async (slotIndex) => {
      if(!isMaster) return;
      const slot = sheet.equipment.slots[slotIndex];
      if(slot.item_id) {
          if(window.confirm("Isso devolverá o item para a Forja (Cofre). Confirmar?")) {
              const itemRef = doc(db, "game_items", slot.item_id);
              await updateDoc(itemRef, { status: 'vault', slotIndex: null, updatedAt: serverTimestamp() });
          }
      }
      const newSheet = JSON.parse(JSON.stringify(sheet));
      newSheet.equipment.slots[slotIndex] = { item_name: "", item_img: "", effect: "" };
      setSheet(newSheet);
      setHasUnsavedChanges(true);
  };

  const handleLevelUp = async () => {
    if(!isMaster) return;
    setShowLevelUpAnim(true);
    setTimeout(async () => {
        setShowLevelUpAnim(false);
        const currentLvl = sheet.basic_info.level || 1;
        const newXpMax = Math.floor(sheet.basic_info.experience.max * 1.5);
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
  const radius = 85; 
  const center = 125; 
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

  const getBgStyle = (url) => {
      if (url && url.length > 5) return { backgroundImage: `url(${url})` };
      return { backgroundColor: '#111', border: '1px solid #333' }; 
  };

  // Helper para Renderizar Lista de Skills (Genérico)
  const renderSkillList = (listType, skillsArray, isCompact = false) => {
      const listName = {
          'primary': sheet.job_system?.primary_class?.name || "Classe Primária",
          'secondary': sheet.job_system?.secondary_class?.name || "Classe Secundária",
          'passives': "Passivas",
          'reactions': "Reações"
      }[listType];

      const updatePathBase = {
          'primary': `job_system.primary_class.skills`,
          'secondary': `job_system.secondary_class.skills`,
          'passives': `job_system.passives`,
          'reactions': `job_system.reactions`
      }[listType];

      return (
        <div className={`skills-col ${isCompact ? 'compact-col' : ''}`}>
            <h3 className={`class-header ${listType === 'secondary' ? 'secondary' : ''} ${isCompact ? 'compact-header' : ''}`}>
                {listType === 'primary' || listType === 'secondary' ? (
                   isMaster ? <input className="class-name-input" value={listName} onChange={e => updateField(`job_system.${listType}_class.name`, e.target.value)} /> : listName
                ) : (
                   <span>{listName}</span>
                )}
                {isMaster && <button className="btn-add-skill-slot" onClick={() => addSkillSlot(listType)}>+</button>}
            </h3>
            <div className="skills-list">
                {(skillsArray || []).map((skill, i) => (
                    <div 
                        key={skill.id} 
                        className={`skill-card ${listType === 'secondary' ? 'secondary' : ''} ${isCompact ? 'compact-card' : ''} ${skill.master ? 'mastered' : ''}`}
                        draggable={isMaster}
                        onDragStart={(e) => handleDragStart(e, skill, listType, i)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, listType, i)}
                    >
                        <div className="skill-top">
                            <div style={{display:'flex', alignItems:'center', gap:'5px', flex:1}}>
                                {skill.master && <span className="star-icon pulsing">★</span>}
                                {isMaster ? <input placeholder="Nome" value={skill.name} onChange={e => updateField(`${updatePathBase}.${i}.name`, e.target.value)} className="skill-name-in" /> : <strong className="skill-name">{skill.name || "Slot Vazio"}</strong>}
                            </div>
                            
                            <div 
                                className={`skill-type-icon ${isMaster ? 'clickable' : ''}`} 
                                onClick={() => isMaster && setIconSelectorTarget({ listType, skillIndex: i })}
                                title={isMaster ? "Mudar Tipo" : ""}
                            >
                                <img src={`/simbolos/${skill.icon || 'h-Basica.png'}`} alt="Tipo" />
                            </div>
                            {isMaster && <button className="btn-x-red-small" onClick={() => removeSkillSlot(listType, i)}>×</button>}
                        </div>

                        {isMaster ? <textarea placeholder="Efeito..." value={skill.effect} onChange={e => updateField(`${updatePathBase}.${i}.effect`, e.target.value)} className="skill-desc-in" /> : <p className="skill-desc">{skill.effect}</p>}
                        
                        <div className="skill-xp-box">
                            <div className="xp-labels">
                                <span>XP</span>
                                {isMaster ? (
                                    <div style={{display:'flex'}}>
                                        <input className="xp-tiny" value={skill.xp?.current || 0} onChange={e => updateField(`${updatePathBase}.${i}.xp.current`, Number(e.target.value))} /> / 
                                        <input className="xp-tiny" value={skill.xp?.max || 100} onChange={e => updateField(`${updatePathBase}.${i}.xp.max`, Number(e.target.value))} />
                                    </div>
                                ) : <span>{skill.xp?.current || 0} / {skill.xp?.max || 100}</span>}
                            </div>
                            <div className={`skill-track ${skill.master ? 'grayed' : ''}`}>
                                <div className="skill-fill" style={{width: `${Math.min(((skill.xp?.current||0)/(skill.xp?.max||100))*100, 100)}%`}}></div>
                            </div>
                            {isMaster && !skill.master && (skill.xp?.current >= skill.xp?.max) && (
                                <button className="btn-masterize" onClick={() => toggleMastery(listType, i)}>MASTERIZAR</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      );
  };

  return (
    <div className="ficha-overlay-fixed">
        <ImageUploadModal 
            isOpen={uploadModalOpen} 
            onClose={() => setUploadModalOpen(false)} 
            onSave={uploadCallback} 
            label={uploadLabel} 
        />

        {isMaster && hasUnsavedChanges && (
            <button 
                className="save-fab glowing" 
                onClick={saveSheetToDb}
                title="Salvar Alterações"
            >
                💾
            </button>
        )}

      <div className="ficha-container fade-in">
        <button className="close-btn-ficha" onClick={onClose}>✕</button>
        
        {/* --- CABEÇALHO --- */}
        <div className="ficha-header">
            <div className="header-left-group">
                <div className="guild-insignia-box">
                    <span className="header-label-top">SIGNO</span>
                    <div className={`insignia-display ${isMaster ? 'clickable' : ''}`} style={getBgStyle(sheet.basic_info.guild_insignia)} onClick={() => openUploadModal('Signo', (url) => updateField('basic_info.guild_insignia', url))}></div>
                </div>
                <div className="guild-item-box">
                     <span className="header-label-top">RAÇA</span>
                     <div className={`special-display ${isMaster ? 'clickable' : ''}`} style={getBgStyle(sheet.basic_info.special_image)} onClick={() => openUploadModal('Raça', (url) => updateField('basic_info.special_image', url))}></div>
                </div>
            </div>
            
            <div className="header-info">
                <h1 className="responsive-title">{sheet.basic_info.character_name}</h1>
                <span className="sub-header">{sheet.basic_info.race} // {characterData.class}</span>
                <div className="xp-container">
                    <div className="lvl-box"><small>LVL</small>{isMaster ? <input className="lvl-input" type="number" value={sheet.basic_info.level} onChange={e => updateField('basic_info.level', Number(e.target.value))} /> : <span>{sheet.basic_info.level}</span>}</div>
                    <div className="xp-bar-box">
                        <div className="xp-text">XP {isMaster ? <input className="xp-mini-input" value={sheet.basic_info.experience.current} onChange={e => updateField('basic_info.experience.current', Number(e.target.value))} /> : sheet.basic_info.experience.current} / {isMaster ? <input className="xp-mini-input" value={sheet.basic_info.experience.max} onChange={e => updateField('basic_info.experience.max', Number(e.target.value))} /> : sheet.basic_info.experience.max}</div>
                        <div className="xp-track"><div className="xp-fill" style={{width: `${Math.min((sheet.basic_info.experience.current / sheet.basic_info.experience.max) * 100, 100)}%`}}></div></div>
                    </div>
                    {isMaster && sheet.basic_info.experience.current >= sheet.basic_info.experience.max && <button className="btn-levelup glowing" onClick={handleLevelUp}>⚡ UP</button>}
                </div>
            </div>
            
            <div className="header-right-group">
                <div className="guild-item-box hidemobile"><span className="header-label-top">CLASSE 1ª</span><div className={`special-display ${isMaster ? 'clickable' : ''}`} style={getBgStyle(sheet.basic_info.class1_image)} onClick={() => openUploadModal('Classe 1ª', (url) => updateField('basic_info.class1_image', url))}></div></div>
                <div className="guild-item-box hidemobile"><span className="header-label-top">CLASSE 2ª</span><div className={`special-display ${isMaster ? 'clickable' : ''}`} style={getBgStyle(sheet.basic_info.class2_image)} onClick={() => openUploadModal('Classe 2ª', (url) => updateField('basic_info.class2_image', url))}></div></div>
                <div className="guild-item-box"><span className="header-label-top">RANK</span><div className={`rank-display ${isMaster ? 'clickable' : ''}`} style={getBgStyle(sheet.basic_info.guild_rank_image)} onClick={() => openUploadModal('Rank', (url) => updateField('basic_info.guild_rank_image', url))}></div></div>
            </div>
        </div>

        <div className="ficha-tabs">
            <button className={`tab-btn ${activeTab === 'geral' ? 'active' : ''}`} onClick={() => setActiveTab('geral')}>VISÃO GERAL</button>
            <button className={`tab-btn ${activeTab === 'habilidades' ? 'active' : ''}`} onClick={() => setActiveTab('habilidades')}>GRIMÓRIO</button>
        </div>

        <div className="ficha-body">
            {activeTab === 'geral' ? (
                <>
                    <div className="col-attributes">
                        <h3 className="section-title">ATRIBUTOS</h3>
                        <div className="radar-wrapper">
                            <svg width="250" height="250" viewBox="0 0 250 250" className="radar-svg">
                                {[20, 40, 60, 80, 100].map(r => (<polygon key={r} points={stats.map((_, i) => { const {x,y} = getPoint(r, i, 6); return `${x},${y}`; }).join(" ")} fill="none" stroke="#333" strokeWidth="1" />))}
                                <polygon points={polyPoints} fill="rgba(0, 242, 255, 0.2)" stroke="#00f2ff" strokeWidth="2" />
                                {stats.map((stat, i) => {
                                    const {x, y} = getPoint(120, i, 6);
                                    const val = sheet.attributes?.[stat]?.value || 0;
                                    return (<foreignObject x={x - 20} y={y - 15} width="40" height="30" key={stat}><div className="stat-box-chart"><span className="sb-label">{stat}</span>{isMaster ? <input className="sb-input" value={val} onChange={(e) => updateField(`attributes.${stat}.value`, Number(e.target.value))} /> : <span className="sb-val">{val}</span>}</div></foreignObject>);
                                })}
                            </svg>
                        </div>
                        <div className="secondary-stats">
                            <div className="stat-row"><label>HP</label><div className="stat-bars-inputs">{isMaster ? <input value={sheet.status.hp.current} onChange={e => updateField('status.hp.current', Number(e.target.value))} /> : <span>{sheet.status.hp.current}</span>}/{isMaster ? <input value={sheet.status.hp.max} onChange={e => updateField('status.hp.max', Number(e.target.value))} /> : <span>{sheet.status.hp.max}</span>}</div></div>
                            <div className="stat-row"><label>MP</label><div className="stat-bars-inputs mp">{isMaster ? <input value={sheet.status.mp.current} onChange={e => updateField('status.mp.current', Number(e.target.value))} /> : <span>{sheet.status.mp.current}</span>}/{isMaster ? <input value={sheet.status.mp.max} onChange={e => updateField('status.mp.max', Number(e.target.value))} /> : <span>{sheet.status.mp.max}</span>}</div></div>
                            <div className="stat-row-simple">
                                <div className="s-box"><img src="/simbolos/ARM.png" alt="ARM" className="stat-icon-img" />{isMaster ? <input value={sheet.status.arm.value} onChange={e => updateField('status.arm.value', Number(e.target.value))} /> : <span>{sheet.status.arm.value}</span>}</div>
                                <div className="s-box"><img src="/simbolos/RES.png" alt="RES" className="stat-icon-img" />{isMaster ? <input value={sheet.status.res.value} onChange={e => updateField('status.res.value', Number(e.target.value))} /> : <span>{sheet.status.res.value}</span>}</div>
                                <div className="s-box"><img src="/simbolos/MOV.png" alt="MOV" className="stat-icon-img" />{isMaster ? <input value={sheet.status.mov?.value || 3} onChange={e => updateField('status.mov.value', Number(e.target.value))} /> : <span>{sheet.status.mov?.value || 3}</span>}</div>
                            </div>
                        </div>
                    </div>

                    <div className="col-center-equip">
                        <div className={`char-image-frame ${isMaster ? 'clickable' : ''}`} onClick={() => openUploadModal('Personagem', (url) => updateField('imgUrl', url))}>
                            <div className="image-display" style={getBgStyle(sheet.imgUrl)}></div>
                        </div>
                        <div className="equip-slots-overlay">
                            {[
                                {id: 0, label: "CABEÇA", style: { top: '-30px', left: '50%', transform: 'translateX(-50%)' }}, 
                                {id: 1, label: "ACESS. 2", style: { top: '80px', right: '-15px' }}, 
                                {id: 2, label: "MÃO DIR.", style: { bottom: '120px', right: '-15px' }}, 
                                {id: 3, label: "MÃO ESQ.", style: { bottom: '120px', left: '-15px' }}, 
                                {id: 4, label: "ACESS. 1", style: { top: '80px', left: '-15px' }}, 
                                {id: 5, label: "CORPO", style: { bottom: '-20px', left: '60px' }}, 
                                {id: 6, label: "PÉS", style: { bottom: '-20px', right: '60px' }} 
                            ].map((slot, idx) => (
                                <div key={idx} className="equip-slot" style={slot.style}>
                                    <div className="slot-label">{slot.label}</div>
                                    <div className="slot-square">
                                        {!sheet.equipment?.slots?.[idx]?.item_img && isMaster && <button className="btn-plus-item" onClick={() => handleOpenForgeSelector(idx)}>+</button>}
                                        {sheet.equipment?.slots?.[idx]?.item_img ? (
                                            <>
                                                <div className="item-bg" style={getBgStyle(sheet.equipment.slots[idx].item_img)}></div>
                                                <button className="btn-eye-item" onClick={() => setViewItemDetails(sheet.equipment.slots[idx])}>👁️</button>
                                                {isMaster && <button className="btn-return-forge" title="Devolver" onClick={() => handleUnequipItem(idx)}>↩️</button>}
                                            </>
                                        ) : (!isMaster && <span className="empty-text">Vazio</span>)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-inventory">
                        <h3 className="section-title">BOLSA & GIL</h3>
                        <div className="gil-display">
                            <span className="coin-icon">💰</span>
                            {isMaster ? <input type="number" className="gil-input-master" value={sheet.inventory.gil} onChange={e => updateField('inventory.gil', Number(e.target.value))} /> : <span className="gil-amount">{sheet.inventory.gil}</span>}
                            <span className="currency">GIL</span>
                        </div>
                        <div className="items-list">
                            <h4>MOCHILA</h4>
                            <div className="items-scroll">
                                {(sheet.inventory.items || []).map((item, idx) => (
                                    <div key={idx} className="inv-row">
                                        {isMaster ? (
                                            <><input className="inv-name" value={item.name} onChange={e => updateField(`inventory.items.${idx}.name`, e.target.value)} /><input className="inv-qtd" type="number" value={item.quantity} onChange={e => updateField(`inventory.items.${idx}.quantity`, Number(e.target.value))} /><button className="btn-x-red" onClick={() => { const newItems = sheet.inventory.items.filter((_, i) => i !== idx); updateField('inventory.items', newItems); }}>×</button></>
                                        ) : (<><span className="i-name">{item.name || "Slot Vazio"}</span><span className="i-qtd">x{item.quantity || 0}</span></>)}
                                    </div>
                                ))}
                                {isMaster && <button className="add-item-btn" onClick={() => updateField('inventory.items', [...(sheet.inventory.items || []), {name: "Novo Item", quantity: 1}])}>+ Slot</button>}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="skills-tab-content">
                    {renderSkillList('primary', sheet.job_system.primary_class.skills)}
                    {renderSkillList('secondary', sheet.job_system.secondary_class.skills)}

                    <div className="skills-col extra-col">
                         {/* PASSIVAS */}
                         {renderSkillList('passives', sheet.job_system.passives || [], true)}
                         
                         {/* REAÇÕES */}
                         {renderSkillList('reactions', sheet.job_system.reactions || [], true)}

                        <div className="extra-abilities-box">
                            <div className="bonus-row"><label>BÔNUS DE CLASSE</label>{isMaster ? <textarea value={sheet.job_system?.class_bonus?.value} onChange={e => updateField('job_system.class_bonus.value', e.target.value)} className="bonus-area" /> : <p className="bonus-area-read">{sheet.job_system?.class_bonus?.value || "Nenhum"}</p>}</div>
                            <div className="bonus-row" style={{marginTop:'15px'}}>
                                <label>TÍTULO</label>
                                {isMaster ? <input className="ab-input" style={{background: 'rgba(0,0,0,0.5)', padding: '5px', width: '100%', border: '1px solid #444', borderRadius: '4px'}} value={sheet.basic_info?.custom_title || ""} onChange={e => updateField('basic_info.custom_title', e.target.value)} /> : <p style={{background: 'rgba(0,0,0,0.5)', padding: '8px', borderRadius: '4px', fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', margin: 0}}>{sheet.basic_info?.custom_title || "Sem Título"}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {iconSelectorTarget && (
            <div className="item-selector-overlay" onClick={() => setIconSelectorTarget(null)}>
                <div className="item-selector-box" onClick={e => e.stopPropagation()} style={{height: 'auto', maxHeight:'400px'}}>
                    <h3>ESCOLHA O TIPO</h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '10px'}}>
                        {SKILL_ICONS.map(iconName => (
                            <div key={iconName} style={{cursor: 'pointer', border: '1px solid #333', padding: '5px', borderRadius: '4px', textAlign: 'center', background: '#fff'}} onClick={() => handleSkillIconSelect(iconName)}>
                                <img src={`/simbolos/${iconName}`} alt={iconName} style={{width: '40px', height: 'auto'}} />
                            </div>
                        ))}
                    </div>
                    <button className="btn-cancel-modal" onClick={() => setIconSelectorTarget(null)}>CANCELAR</button>
                </div>
            </div>
        )}

        {showForgeSelector && (
            <div className="item-selector-overlay" onClick={() => setShowForgeSelector(false)}>
                <div className="item-selector-box" onClick={e => e.stopPropagation()}>
                    <h3>EQUIPAR DO COFRE</h3>
                    <div className="forge-list-scroll">
                        {forgeItems.length === 0 && <p className="empty-text">Nenhum item disponível na Forja.</p>}
                        {forgeItems.map(item => (
                            <div key={item.id} className="forge-item-row" onClick={() => handleEquipItem(item)}>
                                <div className="forge-thumb" style={getBgStyle(item.imagem)}></div>
                                <div><strong>{item.nome}</strong>{item.ownerId && <small style={{color:'#0f0'}}> (Seu Item)</small>}<p>{item.descricao.substring(0, 40)}...</p></div>
                            </div>
                        ))}
                    </div>
                    <button className="btn-cancel-modal" onClick={() => setShowForgeSelector(false)}>CANCELAR</button>
                </div>
            </div>
        )}

        {viewItemDetails && (
            <div className="item-selector-overlay" onClick={() => setViewItemDetails(null)}>
                <div className="item-details-box" onClick={e => e.stopPropagation()}>
                    <div className="detail-img-large" style={getBgStyle(viewItemDetails.item_img)}></div>
                    <h3>{viewItemDetails.item_name}</h3>
                    <p className="details-desc">{viewItemDetails.description || "Sem descrição"}</p>
                    <p className="details-effect">Efeito: {viewItemDetails.effect || "Nenhum"}</p>
                    <button className="btn-cancel-modal" onClick={() => setViewItemDetails(null)}>FECHAR</button>
                </div>
            </div>
        )}

        {showLevelUpAnim && (<div className="level-up-overlay"><h1 className="levelup-text">LEVEL UP!</h1></div>)}
      </div>

      <style>{`
        /* GERAL */
        .ficha-overlay-fixed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.95); z-index: 200000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px); overflow-y: auto; }
        .ficha-container { width: 1200px; height: 850px; max-width: 95vw; max-height: 98vh; background: #050a10; border: 2px solid #ffcc00; display: flex; flex-direction: column; position: relative; box-shadow: 0 0 50px rgba(255, 204, 0, 0.2); border-radius: 8px; overflow: hidden; font-family: 'Cinzel', serif; color: #fff; }
        .close-btn-ficha { position: absolute; top: 10px; right: 15px; background: transparent; border: none; color: #f44; font-size: 24px; cursor: pointer; z-index: 200; font-weight: bold; }
        .save-fab { position: absolute; bottom: 30px; right: 30px; width: 60px; height: 60px; border-radius: 50%; background: #222; border: 2px solid #444; color: #fff; font-size: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 300; transition: 0.3s; box-shadow: 0 0 15px #000; }
        .save-fab:hover { background: #00f2ff; border-color: #fff; color: #000; box-shadow: 0 0 30px #00f2ff; }
        .save-fab.glowing { animation: pulseSave 1.5s infinite; border-color: #00f2ff; color: #00f2ff; }
        @keyframes pulseSave { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
        /* HEADER */
        .ficha-header { padding: 25px 30px 10px 30px; background: linear-gradient(90deg, #101020, #000); border-bottom: 2px solid #333; display: flex; justify-content: space-between; align-items: center; height: 140px; position: relative; flex-shrink: 0; }
        .guild-insignia-box, .guild-rank-box, .guild-item-box { display: flex; flex-direction: column; align-items: center; width: 80px; position: relative; padding-top: 10px; }
        .header-left-group, .header-right-group { display: flex; gap: 20px; align-items: flex-end; }
        .header-label-top { font-size: 10px; color: #ffcc00; font-weight: bold; letter-spacing: 1px; margin-bottom: 2px; }
        .insignia-display, .rank-display, .special-display { width: 70px; height: 70px; background-size: contain; background-repeat: no-repeat; background-position: center; border: 1px solid #333; border-radius: 50%; background-color: #000; position: relative; transition: 0.2s; }
        .special-display { border-radius: 12px; }
        .clickable:hover { cursor: pointer; border-color: #ffcc00; box-shadow: 0 0 10px #ffcc00; }
        .header-info { flex: 1; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0; }
        .header-info h1 { margin: 0; color: #ffcc00; font-size: 36px; letter-spacing: 4px; text-shadow: 0 0 10px rgba(255,204,0,0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
        .sub-header { color: #00f2ff; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; }
        .xp-container { display: flex; align-items: center; gap: 15px; width: 60%; margin-top: -5px; }
        .lvl-box { display: flex; flex-direction: column; align-items: center; background: #222; border: 1px solid #ffcc00; padding: 5px 12px; border-radius: 4px; box-shadow: 0 0 10px rgba(255,204,0,0.2); }
        .lvl-box small { font-size: 8px; color: #ffcc00; }
        .lvl-box span { font-size: 24px; font-weight: bold; line-height: 1; }
        .lvl-input { width: 40px; background: transparent; border: none; color: #fff; font-size: 24px; font-weight: bold; text-align: center; }
        .xp-bar-box { flex: 1; display: flex; flex-direction: column; }
        .xp-text { text-align: right; font-size: 10px; color: #aaa; margin-bottom: 2px; }
        .xp-mini-input { background: #111; border: none; color: #fff; width: 30px; text-align: center; font-size: 10px; }
        .xp-track { width: 100%; height: 8px; background: #111; border: 1px solid #444; border-radius: 4px; overflow: hidden; }
        .xp-fill { height: 100%; background: linear-gradient(90deg, #00f2ff, #0088ff); transition: width 0.5s; }
        .btn-levelup { background: linear-gradient(to bottom, #ffcc00, #ff8800); border: 2px solid #fff; color: #000; font-weight: bold; padding: 5px 15px; cursor: pointer; border-radius: 20px; animation: glow 1s infinite alternate; font-family: 'Cinzel', serif; font-size: 10px; }
        @keyframes glow { from { box-shadow: 0 0 10px #ffcc00; } to { box-shadow: 0 0 30px #ffcc00; transform: scale(1.05); } }
        .ficha-tabs { display: flex; background: #111; border-bottom: 1px solid #333; margin-top: 0; flex-shrink: 0; }
        .tab-btn { flex: 1; background: transparent; border: none; padding: 15px; color: #666; font-family: 'Cinzel', serif; font-size: 16px; cursor: pointer; transition: 0.3s; border-bottom: 3px solid transparent; }
        .tab-btn:hover { color: #fff; background: rgba(255,255,255,0.05); }
        .tab-btn.active { color: #ffcc00; border-bottom: 3px solid #ffcc00; background: rgba(255, 204, 0, 0.05); }
        .ficha-body { flex: 1; display: flex; padding: 30px 20px; gap: 20px; overflow: hidden; position: relative; }
        
        /* SCROLLBAR ESTILOSA (WEBKIT) */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        ::-webkit-scrollbar-track {
            background: #050a10; 
            border-left: 1px solid #333;
        }
        ::-webkit-scrollbar-thumb {
            background: #444; 
            border-radius: 4px;
            border: 1px solid #222;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #ffcc00;
            border-color: #fff;
        }

        /* Aplicando especificamente */
        .skills-list, .bonus-area, .skills-col.extra-col, .forge-list-scroll, .items-scroll {
            scrollbar-width: thin; 
            scrollbar-color: #ffcc00 #050a10; 
        }

        /* ESTILOS DE HABILIDADES */
        .skills-tab-content { display: flex; width: 100%; height: 100%; gap: 20px; }
        .skills-col { flex: 1; display: flex; flex-direction: column; background: rgba(0,0,0,0.3); border: 1px solid #333; padding: 10px; border-radius: 4px; overflow: hidden; min-width: 0; }
        .class-header { color: #00f2ff; font-size: 16px; border-bottom: 2px solid #00f2ff; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; }
        .class-header.secondary { color: #aaa; border-color: #666; }
        .class-name-input { background: transparent; border: none; color: inherit; font-size: inherit; font-weight: bold; width: 80%; }
        .btn-add-skill-slot { background: transparent; border: 1px solid #555; color: #fff; width: 20px; height: 20px; cursor: pointer; font-size: 14px; line-height: 1; }
        
        /* CORRIGIDO SCROLL DA LISTA */
        .skills-list { 
            flex: 1; 
            overflow-y: auto; 
            display: flex; 
            flex-direction: column; 
            gap: 8px; 
            padding-right: 5px; 
        }
        
        .skill-card { background: rgba(0, 30, 60, 0.4); border: 1px solid #005577; padding: 8px; border-radius: 4px; cursor: grab; transition: 0.2s; position: relative; }
        .skill-card.secondary { background: rgba(30, 30, 30, 0.4); border-color: #444; }
        .skill-card:active { cursor: grabbing; border-color: #ffcc00; }
        .skill-card.mastered { border-color: #ffd700; background: rgba(50, 40, 0, 0.4); }
        .skill-top { display: flex; justify-content: space-between; margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; align-items: flex-start; }
        .skill-name { color: #ffcc00; font-size: 13px; }
        .skill-desc { font-size: 11px; color: #ccc; line-height: 1.3; margin: 0 0 5px 0; }
        .skill-name-in { flex: 1; font-weight: bold; color: #ffcc00; background: transparent; border: none; font-size: 12px; }
        .skill-desc-in { width: 100%; background: transparent; border: none; color: #ccc; font-size: 11px; resize: none; font-family: sans-serif; height: 30px; }
        .skill-type-icon { width: 30px; height: 30px; margin-left: 5px; background: #fff; padding: 2px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .skill-type-icon img { width: 100%; height: 100%; object-fit: contain; }
        .skill-xp-box { margin-top: 5px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 3px; }
        .xp-labels { display: flex; justify-content: space-between; font-size: 9px; color: #888; margin-bottom: 2px; }
        .xp-tiny { background: transparent; border: none; color: #aaa; width: 20px; text-align: center; font-size: 9px; }
        .skill-track { width: 100%; height: 5px; background: #222; border-radius: 2px; overflow: hidden; }
        .skill-track.grayed .skill-fill { background: #888; }
        .skill-fill { height: 100%; background: #00f2ff; transition: width 0.3s; }
        .btn-masterize { width: 100%; margin-top: 4px; background: linear-gradient(to right, #d4af37, #b8860b); border: none; color: #000; font-size: 9px; font-weight: bold; cursor: pointer; padding: 2px; border-radius: 2px; }
        .star-icon { color: #ffd700; font-size: 14px; margin-right: 5px; text-shadow: 0 0 5px #ffd700; }
        .pulsing { animation: pulseStar 1.5s infinite; }
        @keyframes pulseStar { 0% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1); opacity: 0.8; } }
        .btn-x-red-small { color: #f44; background: none; border: none; font-weight: bold; cursor: pointer; font-size: 12px; margin-left: 5px; }

        /* ESTILOS COMPACTOS (PASSIVA/REAÇÃO) */
        .compact-col { background: transparent; border: none; padding: 0; margin-bottom: 10px; flex: none; }
        .compact-header { font-size: 12px; border-color: #555; color: #aaa; margin-bottom: 5px; padding-bottom: 2px; }
        .compact-card { padding: 4px; margin-bottom: 5px; border-color: #333; background: rgba(20,20,20,0.5); }
        .compact-card .skill-name { font-size: 11px; }
        .compact-card .skill-type-icon { width: 20px; height: 20px; }
        .compact-card .skill-desc { font-size: 10px; margin-bottom: 2px; }
        .compact-card .skill-track { height: 3px; }

        /* COLUNA EXTRA COM SCROLL FUNCIONAL */
        .skills-col.extra-col { 
            flex: 0.8; 
            overflow-y: auto; 
            padding-right: 5px;
        }
        .skills-col.extra-col .skills-list {
            overflow-y: visible;
            flex: none;
        }

        /* OUTRAS COLUNAS */
        .col-attributes { width: 300px; display: flex; flex-direction: column; align-items: center; border-right: 1px solid #333; padding-right: 20px; flex-shrink: 0; }
        .col-center-equip { flex: 1; position: relative; display: flex; justify-content: center; align-items: center; }
        .col-inventory { width: 280px; border-left: 1px solid #333; padding-left: 20px; display: flex; flex-direction: column; flex-shrink: 0; }
        .section-title { color: #aaa; font-size: 14px; border-bottom: 1px solid #00f2ff; width: 100%; text-align: center; margin-bottom: 15px; padding-bottom: 5px; }
        .radar-wrapper { position: relative; margin-bottom: 20px; width: 100%; display: flex; justify-content: center; }
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
        .s-box { flex: 1; background: #111; border: 1px solid #444; padding: 10px; text-align: center; border-radius: 4px; display: flex; flex-direction: column; align-items: center; gap: 5px; }
        .s-box label { display: block; font-size: 10px; color: #888; margin-bottom: 5px; }
        .s-box input { background: transparent; border: none; color: #fff; text-align: center; font-size: 18px; width: 100%; font-weight: bold; }
        .s-box span { font-size: 18px; font-weight: bold; }
        .stat-icon-img { width: 30px; height: 30px; object-fit: contain; }
        .char-image-frame { width: 300px; height: 450px; border: 2px solid #333; position: relative; background: #000; border-radius: 150px; overflow: hidden; box-shadow: inset 0 0 50px #000; margin-top: -20px; z-index: 1; transition: 0.2s; }
        .char-image-frame.clickable:hover { border-color: #ffcc00; cursor: pointer; }
        .image-display { width: 100%; height: 100%; background-size: cover; background-position: center; opacity: 0.8; }
        .equip-slots-overlay { position: absolute; width: 300px; height: 450px; left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none; z-index: 2; margin-top: -10px; }
        .equip-slot { position: absolute; width: 80px; display: flex; flex-direction: column; align-items: center; pointer-events: auto; }
        .slot-label { font-size: 9px; color: #00f2ff; text-shadow: 0 0 2px #000; margin-bottom: 2px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        .slot-square { width: 60px; height: 60px; background: rgba(0, 10, 30, 0.9); border: 1px solid #ffcc00; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(0,0,0,0.8); position: relative; overflow: hidden; border-radius: 4px; }
        .item-bg { width: 100%; height: 100%; background-size: cover; background-position: center; position: absolute; top: 0; left: 0; }
        .empty-text { font-size: 9px; color: #666; text-align: center; line-height: 1; padding: 2px; }
        .btn-plus-item { background: transparent; color: #ffcc00; font-size: 24px; border: none; cursor: pointer; font-weight: bold; }
        .btn-eye-item { position: absolute; bottom: 2px; right: 2px; font-size: 10px; background: rgba(0,0,0,0.8); color: #fff; border: none; border-radius: 3px; cursor: pointer; padding: 2px 4px; z-index: 5; }
        .btn-return-forge { position: absolute; top: 2px; left: 2px; font-size: 10px; background: rgba(200, 0, 0, 0.8); color: #fff; border: none; border-radius: 3px; cursor: pointer; padding: 2px 4px; z-index: 5; }
        .gil-display { background: linear-gradient(90deg, rgba(255,204,0,0.1), transparent); border: 1px solid #ffcc00; padding: 15px; border-radius: 4px; display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .coin-icon { font-size: 20px; }
        .gil-amount { font-size: 24px; font-weight: bold; color: #fff; flex: 1; text-align: right; }
        .gil-input-master { background: transparent; border: none; color: #fff; font-size: 24px; font-weight: bold; width: 100%; text-align: right; outline: none; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .currency { font-size: 10px; color: #ffcc00; font-weight: bold; }
        .items-list { flex: 1; display: flex; flex-direction: column; }
        .items-list h4 { color: #888; font-size: 12px; border-bottom: 1px solid #444; padding-bottom: 5px; margin-bottom: 10px; }
        .items-scroll { flex: 1; overflow-y: auto; padding-right: 5px; }
        .inv-row { display: flex; justify-content: space-between; border-bottom: 1px solid #222; padding: 8px 0; font-size: 12px; align-items: center; }
        .inv-name { background: transparent; border: none; color: #ddd; flex: 1; font-family: 'serif'; }
        .inv-qtd { background: transparent; border: none; color: #00f2ff; width: 40px; text-align: right; font-weight: bold; }
        .btn-x-red { color: #f44; background: none; border: none; cursor: pointer; font-weight: bold; margin-left: 5px; }
        .i-name { color: #ddd; }
        .i-qtd { color: #00f2ff; font-weight: bold; }
        .add-item-btn { width: 100%; background: #222; border: 1px dashed #555; color: #888; padding: 5px; cursor: pointer; margin-top: 10px; font-size: 10px; }
        .img-modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 300000; display: flex; align-items: center; justify-content: center; }
        .img-modal-content { background: #111; border: 1px solid #ffcc00; padding: 25px; width: 400px; border-radius: 8px; text-align: center; box-shadow: 0 0 30px rgba(255,204,0,0.2); }
        .img-modal-content h3 { color: #ffcc00; margin-top: 0; font-family: 'Cinzel', serif; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 20px; }
        .img-modal-content input { width: 100%; padding: 12px; background: #000; border: 1px solid #444; color: #fff; margin-bottom: 20px; outline: none; border-radius: 4px; }
        .img-modal-content input:focus { border-color: #00f2ff; }
        .img-modal-actions { display: flex; gap: 15px; justify-content: center; }
        .btn-confirm { background: #00f2ff; color: #000; padding: 10px 25px; border: none; cursor: pointer; font-weight: bold; border-radius: 4px; transition: 0.2s; }
        .btn-confirm:hover { background: #fff; box-shadow: 0 0 15px #00f2ff; }
        .btn-cancel { background: #333; color: #fff; padding: 10px 25px; border: none; cursor: pointer; border-radius: 4px; }
        .btn-cancel:hover { background: #444; }
        .item-selector-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 300000; display: flex; align-items: center; justify-content: center; }
        .item-selector-box { width: 400px; height: 500px; background: #111; border: 1px solid #ffcc00; padding: 20px; display: flex; flex-direction: column; border-radius: 8px; }
        .item-selector-box h3 { color: #ffcc00; border-bottom: 1px solid #333; padding-bottom: 10px; margin-top: 0; }
        .forge-list-scroll { flex: 1; overflow-y: auto; margin-bottom: 15px; }
        .forge-item-row { display: flex; align-items: center; padding: 10px; border-bottom: 1px solid #333; cursor: pointer; }
        .forge-item-row:hover { background: rgba(255,255,255,0.1); }
        .forge-item-row img { width: 40px; height: 40px; border: 1px solid #555; margin-right: 10px; }
        .forge-thumb { width: 40px; height: 40px; border: 1px solid #555; margin-right: 10px; background-size: cover; background-position: center; }
        .forge-item-row strong { color: #00f2ff; display: block; font-size: 12px; }
        .forge-item-row p { font-size: 10px; color: #aaa; margin: 0; }
        .btn-cancel-modal { width: 100%; padding: 10px; background: #333; color: #fff; border: none; cursor: pointer; }
        .item-details-box { width: 300px; background: #000; border: 1px solid #00f2ff; padding: 20px; text-align: center; border-radius: 8px; }
        .item-details-box img { width: 80px; height: 80px; border: 1px solid #fff; margin-bottom: 10px; }
        .detail-img-large { width: 80px; height: 80px; border: 1px solid #fff; margin: 0 auto 10px auto; background-size: cover; background-position: center; }
        .item-details-box h3 { color: #00f2ff; margin: 0 0 10px 0; }
        .details-desc { font-size: 12px; color: #ccc; margin-bottom: 10px; font-style: italic; }
        .details-effect { font-size: 12px; color: #ffcc00; font-weight: bold; margin-bottom: 20px; }
        .extra-abilities-box { margin-top: 20px; border-top: 2px solid #444; padding-top: 15px; }
        .bonus-row { margin-top: 10px; }
        .bonus-row label { font-size: 10px; color: #00f2ff; display: block; margin-bottom: 5px; font-weight: bold; }
        .bonus-row p { font-size: 12px; color: #ddd; font-style: italic; background: rgba(0,0,0,0.5); padding: 8px; border-radius: 4px; }
        
        /* CAIXA DE BÔNUS DE CLASSE MAIOR */
        .bonus-area { 
            width: 100%; 
            height: 120px; 
            background: rgba(0,0,0,0.5); 
            border: 1px solid #444; 
            color: #ddd; 
            font-size: 12px; 
            padding: 5px; 
            resize: vertical; 
        }
        .bonus-area-read {
            min-height: 40px;
            max-height: 120px;
            overflow-y: auto;
        }

        .ab-input { background: transparent; border: none; color: #fff; font-weight: bold; flex: 1; font-size: 12px; }
        .level-up-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 100; display: flex; align-items: center; justify-content: center; animation: fadeOverlay 4s forwards; pointer-events: none; }
        .levelup-text { font-size: 80px; color: #ffcc00; text-shadow: 0 0 50px #ffcc00, 0 0 20px #fff; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); letter-spacing: 5px; }
        @keyframes popIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes fadeOverlay { 0% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        .fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

        /* --- RESPONSIVIDADE --- */
        
        /* TABLET & NOTEBOOK MENOR (max-width: 1024px) */
        @media (max-width: 1024px) {
            .ficha-container { width: 100%; height: 100%; max-height: none; border-radius: 0; border: none; overflow-y: auto; }
            .ficha-header { height: auto; flex-wrap: wrap; padding-bottom: 20px; }
            .header-info h1 { font-size: 24px; }
            .ficha-body { flex-direction: column; overflow-y: visible; padding-bottom: 80px; }
            
            /* Na visão geral, alinha itens ao centro e remove larguras fixas */
            .col-attributes, .col-inventory { width: 100%; border: none; padding: 0; margin-bottom: 20px; }
            .col-attributes { border-bottom: 1px solid #333; padding-bottom: 20px; }
            .col-center-equip { order: -1; margin-bottom: 30px; transform: scale(0.9); }
            
            /* Em Habilidades, empilha colunas */
            .skills-tab-content { flex-direction: column; }
            .skills-col { overflow: visible; }
        }

        /* CELULAR (max-width: 768px) */
        @media (max-width: 768px) {
            /* 1. O CONTAINER PRINCIPAL VIRA UMA JANELA ROLÁVEL GRANDE */
            .ficha-container { 
                width: 95% !important; 
                height: 90vh !important; /* Ocupa quase toda a tela */
                max-height: none !important; 
                overflow-y: auto !important; /* Scroll aqui, na janela toda */
                margin: 20px auto; /* Centraliza */
                display: block; /* Garante que os elementos desçam */
            }

            .ficha-header { justify-content: center; flex-direction: column; gap: 10px; }
            .header-left-group, .header-right-group { gap: 10px; }
            .header-info { width: 100%; order: -1; margin-bottom: 15px; }
            .xp-container { width: 90%; }
            .hidemobile { display: none; } 
            
            .col-center-equip { transform: scale(0.85); margin-top: -30px; margin-bottom: 10px; }
            .radar-wrapper { display: none; }
            
            .stat-row-simple { gap: 5px; }
            .s-box input { font-size: 14px; }
            
            /* 2. LIBERA O TAMANHO DAS LISTAS DE HABILIDADES/PASSIVAS */
            .skills-list, .skills-col, .box-passivas { 
                max-height: none !important; /* Remove o limite de altura */
                height: auto !important;     /* Cresce conforme o texto */
                overflow: visible !important; /* Tira o scroll interno ruim */
                flex-shrink: 0; /* Impede que o flexbox esmague a caixa */
                padding-bottom: 20px;
            }
            
            .save-fab { bottom: 20px; right: 20px; width: 50px; height: 50px; font-size: 24px; }
        }
      `}</style>
    </div>
  );
}