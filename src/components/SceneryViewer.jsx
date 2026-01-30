import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

export default function SceneryViewer({ sessaoData, isMaster, showManager, onCloseManager }) {
  const [activeScenery, setActiveScenery] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Estados do Gerenciador (Mestre)
  const [sceneryList, setSceneryList] = useState([]);
  const [editingName, setEditingName] = useState("");
  const [selectedUrl, setSelectedUrl] = useState(null);

  useEffect(() => {
    if (sessaoData) {
      // Ouve qual cenário está ativo no banco
      setActiveScenery(sessaoData.active_scenery || null);

      if (isMaster) {
        // Carrega a lista de 'cenarios' salva na criação da sessão
        const rawLinks = sessaoData.cenarios || [];
        setSceneryList(rawLinks);
      }
    }
  }, [sessaoData, isMaster]);

  // Se ativou um novo cenário, maximiza automaticamente
  useEffect(() => {
    if (activeScenery) {
        setIsMinimized(false);
    }
  }, [activeScenery?.url]);

  const handleActivate = async () => {
    if (!selectedUrl) return;
    const name = editingName || "Ambiente";
    
    const sceneryObj = {
        url: selectedUrl,
        name: name,
        timestamp: Date.now()
    };

    try {
        const sessaoRef = doc(db, "sessoes", sessaoData.id);
        await updateDoc(sessaoRef, { active_scenery: sceneryObj });
        if (onCloseManager) onCloseManager();
        setEditingName("");
        setSelectedUrl(null);
    } catch (error) {
        console.error("Erro ao projetar cenário:", error);
    }
  };

  const handleCloseGlobal = async () => {
      if (!window.confirm("Fechar o cenário para todos?")) return;
      try {
        const sessaoRef = doc(db, "sessoes", sessaoData.id);
        await updateDoc(sessaoRef, { active_scenery: null });
      } catch (e) { console.error(e); }
  };

  // Renderiza nada se não tiver cenário nem estiver gerenciando
  if (!activeScenery && !showManager) return null;

  return (
    <>
      {/* --- CAMADA DE VISUALIZAÇÃO (TODOS) --- */}
      {activeScenery && (
        <div className={`scenery-layer ${isMinimized ? 'minimized' : 'immersive'}`}>
            
            {/* Imagem de Fundo com Fade nas Bordas */}
            {!isMinimized && (
                <div className="scenery-viewport">
                    {/* MÁSCARA OVAL CINEMATOGRÁFICA */}
                    <div className="vignette-mask"></div>
                    
                    <img src={activeScenery.url} alt="Cenário" className="scenery-img" />
                    
                    {/* Título Dark Fantasy com Animação de Entrada/Saída */}
                    <div className="scenery-title-overlay">
                        <h2>{activeScenery.name}</h2>
                    </div>
                </div>
            )}

            {/* Barra de Controle (Minimizado ou Hover) */}
            <div className="scenery-hud">
                {isMinimized && <span className="mini-label">🖼️ {activeScenery.name}</span>}
                
                <div className="scenery-actions">
                    <button 
                        className="btn-scenery-toggle" 
                        onClick={() => setIsMinimized(!isMinimized)}
                        title={isMinimized ? "Maximizar Cenário" : "Minimizar"}
                    >
                        {isMinimized ? '👁️' : '🔽'}
                    </button>
                    
                    {isMaster && (
                        <button 
                            className="btn-scenery-close" 
                            onClick={handleCloseGlobal}
                            title="Encerrar Projeção"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- GERENCIADOR (SÓ MESTRE) --- */}
      {isMaster && showManager && (
        <div className="scenery-manager-overlay" onClick={onCloseManager}>
            <div className="scenery-manager-box" onClick={e => e.stopPropagation()}>
                <h3 className="manager-title">PROJETOR DE AMBIENTES</h3>
                
                <div className="scenery-grid">
                    {sceneryList.length === 0 && <p className="empty-txt">Nenhuma imagem de cenário carregada na sessão.</p>}
                    {sceneryList.map((url, i) => (
                        <div 
                            key={i} 
                            className={`scenery-thumb ${selectedUrl === url ? 'selected' : ''}`}
                            onClick={() => setSelectedUrl(url)}
                        >
                            <img src={url} alt={`Opção ${i}`} />
                        </div>
                    ))}
                </div>

                <div className="scenery-input-row">
                    <input 
                        type="text" 
                        placeholder="Nome do Local (Ex: Ruínas Antigas)" 
                        value={editingName} 
                        onChange={e => setEditingName(e.target.value)} 
                    />
                    <button className="btn-project" onClick={handleActivate} disabled={!selectedUrl}>
                        PROJETAR
                    </button>
                </div>
                <button className="btn-close-manager" onClick={onCloseManager}>CANCELAR</button>
            </div>
        </div>
      )}

      <style>{`
        /* --- ESTILO IMERSIVO --- */
        .scenery-layer {
            position: fixed;
            transition: all 0.8s cubic-bezier(0.2, 2, 0.2, 1);
            overflow: hidden;
            /* Z-INDEX EXTREMAMENTE ALTO PARA COBRIR TUDO (Bazar, Fichas, etc) */
            z-index: 200000; 
        }

        .scenery-layer.immersive {
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000;
            animation: fadeInDeep 4s ease-out;
        }

        .scenery-layer.minimized {
            top: 0; /* Cola no teto */
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            height: 40px;
            background: rgba(0,0,0,0.9);
            border: 1px solid #ffcc00;
            border-top: none;
            border-radius: 0 0 15px 15px;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 200001;
            box-shadow: 0 5px 20px rgba(0,0,0,0.5);
        }

        @keyframes fadeInDeep { from { opacity: 0; filter: blur(10px); } to { opacity: 1; filter: blur(0); } }

        .scenery-viewport {
            width: 100%;
            height: 100%;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .scenery-img {
            width: 100%;
            height: 100%;
            object-fit: cover; /* Garante que cubra a tela toda sem bordas internas */
            /* Efeito Ken Burns lento e suave */
            animation: kenBurns 80s infinite alternate ease-in-out;
            opacity: 0.9; /* Levemente escuro para o texto brilhar */
        }

        @keyframes kenBurns { from { transform: scale(1.0); } to { transform: scale(1.15); } }

        /* VIGNETTE CINEMATOGRÁFICA (OVAL) */
        .vignette-mask {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            z-index: 2;
            /* Gradiente ELÍPTICO: Começa transparente no centro e escurece forte nas bordas */
            background: radial-gradient(
                ellipse at center, 
                rgba(0,0,0,0) 30%, 
                rgba(0,0,0,0.3) 60%, 
                rgba(0,0,0,0.8) 85%, 
                #000 100%
            );
            /* Adiciona uma sombra interna extra para garantir bordas pretas */
            box-shadow: inset 0 0 150px #000;
        }

        .scenery-title-overlay {
            position: absolute;
            top: 80px; /* Um pouco mais para baixo para não colar no topo */
            width: 100%;
            text-align: center;
            z-index: 5;
            pointer-events: none;
        }

        .scenery-title-overlay h2 {
            font-family: 'Cinzel', serif;
            font-size: 4.5rem;
            color: #ffcc00;
            text-transform: uppercase;
            letter-spacing: 15px;
            /* Sombra profunda para destacar no fundo */
            text-shadow: 0 10px 30px #000, 0 0 50px rgba(255, 204, 0, 0.2);
            margin: 0;
            opacity: 0;
            /* ANIMAÇÃO DE SEQUÊNCIA: Entra -> Espera -> Sai */
            animation: cinematicTitleSequence 8s ease-in-out 0.5s forwards;
        }

        @keyframes cinematicTitleSequence { 
            0% { 
                opacity: 0; 
                transform: translateY(30px) scale(0.9); 
                letter-spacing: 30px; 
            } 
            20% { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
                letter-spacing: 15px; 
            }
            80% { 
                opacity: 1; 
                transform: translateY(0) scale(1); 
                letter-spacing: 15px; 
            }
            100% { 
                opacity: 0; 
                transform: translateY(-20px) scale(1.05); 
                letter-spacing: 30px; /* Volta a espalhar ao sair */
            } 
        }

        /* HUD DE CONTROLE */
        .scenery-hud {
            position: absolute;
            top: 0; left: 0; width: 100%;
            padding: 20px;
            display: flex;
            justify-content: flex-end; /* Botões na direita */
            align-items: flex-start;
            z-index: 10;
            opacity: 0; /* Invisível por padrão */
            transition: opacity 0.3s;
        }
        
        /* Aparece ao passar o mouse ou se estiver minimizado */
        .scenery-layer:hover .scenery-hud, .scenery-layer.minimized .scenery-hud {
            opacity: 1;
        }
        
        .scenery-layer.minimized .scenery-hud {
            position: relative;
            padding: 0 15px;
            align-items: center;
            justify-content: space-between; /* Espalha texto e botões no modo mini */
            width: 100%;
        }

        .scenery-actions {
            display: flex;
            gap: 15px;
        }

        .btn-scenery-toggle, .btn-scenery-close {
            background: rgba(0,0,0,0.4);
            border: 1px solid rgba(255,255,255,0.3);
            color: #fff;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 0.3s;
            pointer-events: auto;
            backdrop-filter: blur(5px);
        }
        .btn-scenery-toggle:hover { background: #fff; color: #000; transform: scale(1.1); }
        .btn-scenery-close { border-color: rgba(255, 68, 68, 0.5); color: #f44; }
        .btn-scenery-close:hover { background: #f44; color: #fff; transform: scale(1.1); }

        .mini-label {
            color: #ffcc00;
            font-family: 'Cinzel', serif;
            font-weight: bold;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-right: 10px;
            text-shadow: 0 0 10px rgba(255,204,0,0.5);
        }

        /* --- GERENCIADOR (MODAL) --- */
        .scenery-manager-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 200002; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
        .scenery-manager-box { width: 700px; background: #080808; border: 2px solid #ffcc00; padding: 30px; border-radius: 8px; box-shadow: 0 0 80px rgba(255, 204, 0, 0.15); }
        .manager-title { color: #ffcc00; font-family: 'Cinzel', serif; margin: 0 0 25px 0; text-align: center; border-bottom: 1px solid #333; padding-bottom: 15px; letter-spacing: 3px; font-size: 24px; }
        
        .scenery-grid { 
            display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; 
            max-height: 50vh; overflow-y: auto; margin-bottom: 25px; padding: 10px;
            background: #000; border: 1px solid #222; border-radius: 4px;
        }
        .scenery-thumb { height: 100px; border: 2px solid #333; border-radius: 6px; overflow: hidden; cursor: pointer; opacity: 0.6; transition: 0.3s; position: relative; }
        .scenery-thumb:hover { opacity: 1; transform: scale(1.05); border-color: #777; }
        .scenery-thumb.selected { border-color: #ffcc00; opacity: 1; box-shadow: 0 0 20px rgba(255,204,0,0.3); transform: scale(1.05); }
        .scenery-thumb img { width: 100%; height: 100%; object-fit: cover; }
        
        .scenery-input-row { display: flex; gap: 15px; margin-bottom: 20px; }
        .scenery-input-row input { flex: 1; background: #111; border: 1px solid #444; color: #fff; padding: 15px; font-family: 'Cinzel', serif; outline: none; font-size: 16px; border-radius: 4px; }
        .scenery-input-row input:focus { border-color: #ffcc00; box-shadow: 0 0 10px rgba(255,204,0,0.1); }
        
        .btn-project { background: linear-gradient(45deg, #ffcc00, #d4a000); color: #000; border: none; padding: 0 35px; font-weight: bold; cursor: pointer; font-family: 'Cinzel', serif; font-size: 16px; border-radius: 4px; }
        .btn-project:hover:not(:disabled) { filter: brightness(1.2); box-shadow: 0 0 25px rgba(255,204,0,0.4); }
        .btn-project:disabled { opacity: 0.5; cursor: not-allowed; background: #444; }
        
        .btn-close-manager { width: 100%; background: transparent; border: 1px solid #555; color: #aaa; padding: 12px; cursor: pointer; transition: 0.2s; font-family: sans-serif; letter-spacing: 2px; font-size: 12px; }
        .btn-close-manager:hover { border-color: #fff; color: #fff; background: rgba(255,255,255,0.05); }
        .empty-txt { color: #666; text-align: center; grid-column: 1 / -1; padding: 30px; font-style: italic; }
      `}</style>
    </>
  );
}