import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

export default function NPCViewer({ sessaoData, isMaster, showManager, onCloseManager }) {
  const [activeNPC, setActiveNPC] = useState(null);
  
  // Estados do Gerenciador (Mestre)
  const [npcList, setNpcList] = useState([]);
  const [editingName, setEditingName] = useState("");
  const [selectedUrl, setSelectedUrl] = useState(null);

  useEffect(() => {
    if (sessaoData) {
      // Sincroniza o NPC ativo
      setActiveNPC(sessaoData.active_npc || null);

      if (isMaster) {
        // Carrega a lista de 'npcs' salva no MestrePage
        const rawLinks = sessaoData.npcs || [];
        setNpcList(rawLinks);
      }
    }
  }, [sessaoData, isMaster]);

  // --- AÇÕES DO MESTRE ---
  const handleProject = async (isVisible) => {
    if (!selectedUrl && !activeNPC) return;
    
    // Se já tem um ativo e só estamos mudando a visibilidade
    let npcToSave;

    if (selectedUrl) {
        // Novo NPC
        npcToSave = {
            url: selectedUrl,
            name: editingName || "Desconhecido",
            visible: isVisible,
            timestamp: Date.now()
        };
    } else if (activeNPC) {
        // Atualizando o atual
        npcToSave = { ...activeNPC, visible: isVisible };
    }

    try {
        const sessaoRef = doc(db, "sessoes", sessaoData.id);
        await updateDoc(sessaoRef, { active_npc: npcToSave });
        
        if (selectedUrl) {
            // Se foi uma nova seleção, limpa o form
            setSelectedUrl(null);
            setEditingName("");
            // Não fecha o modal automaticamente para permitir ajustes rápidos
            // if (onCloseManager) onCloseManager(); 
        }
    } catch (error) {
        console.error("Erro ao atualizar NPC:", error);
    }
  };

  const handleRemoveNPC = async () => {
      if(!window.confirm("Remover NPC da cena?")) return;
      try {
        const sessaoRef = doc(db, "sessoes", sessaoData.id);
        await updateDoc(sessaoRef, { active_npc: null });
      } catch (e) { console.error(e); }
  };

  // Renderização do NPC (Camada Visual)
  const renderNPC = () => {
      if (!activeNPC) return null;

      const isVisible = activeNPC.visible;

      return (
          <div className={`npc-overlay-container ${isVisible ? 'slide-in' : 'slide-out'}`}>
              <div className="npc-content-wrapper">
                  
                  {/* Container da Imagem (PNG Limpo com Fade) */}
                  <div className="npc-image-box">
                      <img src={activeNPC.url} alt="NPC" className="npc-img" />
                      {/* Fade inferior para misturar com o nome */}
                      <div className="npc-fade-bottom"></div>
                  </div>
                  
                  {/* Nome Dark Fantasy (Linha atrás do texto) */}
                  <div className="npc-title-container">
                      <div className="npc-title-line"></div>
                      <h3 className="npc-title-text">{activeNPC.name}</h3>
                  </div>

              </div>
          </div>
      );
  };

  return (
    <>
      {/* 1. O NPC EM SI (Para todos) */}
      {renderNPC()}

      {/* 2. GERENCIADOR (Só Mestre - Canto Superior Direito) */}
      {isMaster && showManager && (
        <div className="npc-manager-overlay" onClick={onCloseManager}>
            <div className="npc-manager-box" onClick={e => e.stopPropagation()}>
                <div className="npc-manager-header">
                    <h3>CONVOCAÇÃO DE NPCS</h3>
                    <button className="close-x" onClick={onCloseManager}>✕</button>
                </div>

                <div className="npc-grid-list">
                    {npcList.length === 0 && <p className="empty-msg">Nenhum NPC cadastrado na sessão.</p>}
                    {npcList.map((url, i) => (
                        <div 
                            key={i} 
                            className={`npc-thumb ${selectedUrl === url ? 'selected' : ''}`}
                            onClick={() => { setSelectedUrl(url); setEditingName(""); }}
                        >
                            <img src={url} alt="NPC Thumb" />
                        </div>
                    ))}
                </div>

                <div className="npc-controls-row">
                    <input 
                        type="text" 
                        placeholder="Nome (Ex: Lorde das Sombras)" 
                        value={editingName} 
                        onChange={e => setEditingName(e.target.value)} 
                    />
                    <div className="btn-group">
                        <button className="btn-npc-action visible" onClick={() => handleProject(true)}>ENTRAR</button>
                        <button className="btn-npc-action hidden" onClick={() => handleProject(false)}>PREPARAR</button>
                    </div>
                </div>

                {/* CONTROLES DO NPC ATIVO ATUALMENTE */}
                {activeNPC && !selectedUrl && (
                    <div className="current-npc-controls">
                        <h4>EM CENA: <span style={{color:'#fff'}}>{activeNPC.name}</span></h4>
                        <div className="active-actions">
                            <button 
                                className={`toggle-btn ${activeNPC.visible ? 'is-on' : 'is-off'}`}
                                onClick={() => handleProject(!activeNPC.visible)}
                            >
                                {activeNPC.visible ? 'OCULTAR (SAIR)' : 'REVELAR (ENTRAR)'}
                            </button>
                            <button className="remove-btn" onClick={handleRemoveNPC}>REMOVER</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      <style>{`
        /* --- CAMADA DO NPC --- */
        .npc-overlay-container {
            position: fixed;
            top: 50%;
            /* Z-INDEX SUPERIOR AO CENÁRIO */
            z-index: 210000; 
            width: 33vw; /* 1/3 da tela */
            height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            
            /* Transições cinematográficas */
            transition: left 1.5s cubic-bezier(0.22, 1, 0.36, 1), 
                        transform 1.5s cubic-bezier(0.22, 1, 0.36, 1), 
                        opacity 1.5s ease;
        }

        /* SAINDO (Esquerda) */
        .npc-overlay-container.slide-out {
            left: -40%; 
            transform: translate(-100%, -50%);
            opacity: 0;
        }

        /* ENTRANDO (Centro) */
        .npc-overlay-container.slide-in {
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 1;
        }

        .npc-content-wrapper {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            /* Animação de respiração/flutuação */
            animation: breatheNPC 8s ease-in-out infinite;
        }

        @keyframes breatheNPC {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        /* IMAGEM DO NPC (SEM BORDAS, SÓ PNG) */
        .npc-image-box {
            position: relative;
            width: 100%;
            display: flex;
            justify-content: center;
            /* Máscara suave para as bordas não ficarem duras */
            -webkit-mask-image: radial-gradient(ellipse at center, black 70%, transparent 100%);
            mask-image: radial-gradient(ellipse at center, black 70%, transparent 100%);
        }

        .npc-img {
            width: 100%;
            height: auto;
            max-height: 75vh;
            object-fit: contain;
            filter: drop-shadow(0 0 20px rgba(0,0,0,0.8));
        }

        /* FADE INFERIOR (Opcional, para misturar pés com o título) */
        .npc-fade-bottom {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 20%;
            background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.0) 100%);
        }

        /* --- TÍTULO DARK FANTASY (LINHA NO MEIO) --- */
        .npc-title-container {
            position: relative;
            width: 120%; /* Um pouco maior que a imagem */
            text-align: center;
            margin-top: -30px; /* Sobe um pouco para sobrepor a base da imagem */
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .npc-title-line {
            position: absolute;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, #ffcc00, transparent);
            box-shadow: 0 0 10px #ffcc00;
            z-index: 1;
        }

        .npc-title-text {
            font-family: 'Cinzel', serif;
            font-size: 42px;
            color: #ffcc00;
            text-transform: uppercase;
            letter-spacing: 4px;
            margin: 0;
            padding: 0 20px;
            position: relative;
            z-index: 2;
            
            /* Sombra pesada para simular contorno e cortar a linha visualmente */
            text-shadow: 
                3px 3px 0 #000,
                -1px -1px 0 #000,  
                1px -1px 0 #000,
                -1px 1px 0 #000,
                1px 1px 0 #000,
                0 0 20px rgba(0,0,0,0.8);
        }

        /* --- GERENCIADOR (CANTO SUPERIOR DIREITO) --- */
        .npc-manager-overlay { 
            position: fixed; 
            top: 0; 
            left: 0; 
            width: 100vw; 
            height: 100vh; 
            background: rgba(0,0,0,0.0); /* Fundo transparente para ver o NPC */
            z-index: 200020; 
            display: flex; 
            align-items: flex-start; /* Alinha no topo */
            justify-content: flex-end; /* Alinha na direita */
            padding: 80px 30px; /* Espaçamento da borda */
            pointer-events: none; /* Permite clicar através do overlay vazio */
        }

        .npc-manager-box { 
            width: 400px; /* Mais compacto */
            background: rgba(10, 10, 10, 0.95); 
            border: 1px solid #ffcc00; 
            padding: 20px; 
            border-radius: 4px; 
            box-shadow: 0 0 30px rgba(0,0,0,0.8);
            pointer-events: auto; /* Reativa cliques na caixa */
            backdrop-filter: blur(10px);
        }

        .npc-manager-header { display: flex; justify-content: space-between; border-bottom: 1px solid #444; padding-bottom: 10px; margin-bottom: 15px; }
        .npc-manager-header h3 { color: #ffcc00; margin: 0; font-family: 'Cinzel', serif; font-size: 16px; }
        .close-x { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; }

        .npc-grid-list { 
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; 
            max-height: 30vh; overflow-y: auto; margin-bottom: 15px; padding: 5px; 
            background: rgba(0,0,0,0.5); border: 1px solid #333;
        }
        .npc-thumb { height: 80px; border: 1px solid #444; cursor: pointer; opacity: 0.6; transition: 0.2s; overflow: hidden; border-radius: 4px; }
        .npc-thumb:hover { opacity: 1; border-color: #fff; }
        .npc-thumb.selected { border-color: #ffcc00; opacity: 1; box-shadow: 0 0 10px rgba(255, 204, 0, 0.2); }
        .npc-thumb img { width: 100%; height: 100%; object-fit: cover; }

        .npc-controls-row { display: flex; gap: 8px; flex-direction: column; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #333; }
        .npc-controls-row input { background: #000; border: 1px solid #444; color: #fff; padding: 8px; font-family: 'Cinzel', serif; outline: none; font-size: 14px; }
        .npc-controls-row input:focus { border-color: #ffcc00; }
        
        .btn-group { display: flex; gap: 5px; }
        .btn-npc-action { flex: 1; padding: 8px; font-weight: bold; cursor: pointer; border: none; font-family: 'Cinzel', serif; transition: 0.2s; font-size: 12px; }
        .btn-npc-action.visible { background: #ffcc00; color: #000; }
        .btn-npc-action.visible:hover { background: #fff; }
        .btn-npc-action.hidden { background: #222; color: #aaa; border: 1px solid #444; }
        .btn-npc-action.hidden:hover { border-color: #fff; color: #fff; }

        .current-npc-controls { background: rgba(255, 204, 0, 0.05); padding: 10px; border: 1px solid #ffcc00; border-radius: 4px; }
        .current-npc-controls h4 { margin: 0 0 8px 0; color: #ffcc00; font-size: 12px; }
        .active-actions { display: flex; gap: 5px; }
        .toggle-btn { flex: 2; padding: 8px; font-weight: bold; cursor: pointer; border: none; transition: 0.3s; font-size: 11px; }
        .toggle-btn.is-on { background: #0f0; color: #000; box-shadow: 0 0 5px #0f0; }
        .toggle-btn.is-off { background: #f44; color: #fff; }
        .remove-btn { flex: 1; background: transparent; border: 1px solid #f44; color: #f44; cursor: pointer; font-size: 11px; font-weight: bold; }
        .remove-btn:hover { background: #f44; color: #fff; }
        .empty-msg { color: #666; text-align: center; padding: 15px; font-style: italic; font-size: 12px; }
      `}</style>
    </>
  );
}