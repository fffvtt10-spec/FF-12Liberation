import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import racesData from '../data/races.json';
import classesData from '../data/classes.json';
// Importe sua imagem de fundo
import bgCharacter from '../assets/fundo-character.jpg';

const CharacterCreation = () => {
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  // --- ESTADOS ---
  const [viewState, setViewState] = useState('carousel'); 
  const [activeIndex, setActiveIndex] = useState(0); 
  const [selectedRace, setSelectedRace] = useState(null); 
  const [selectedGender, setSelectedGender] = useState('female');
  const [selectedClass, setSelectedClass] = useState(null);

  // --- NOVOS ESTADOS PARA O MODAL DE NOME ---
  const [showNameModal, setShowNameModal] = useState(false);
  const [charName, setCharName] = useState('');

  const races = racesData.races;

  // 1. Limpeza de Audio
  useEffect(() => {
    const stopAudio = () => {
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach(el => {
        if(el.tagName === 'VIDEO' && el.classList.contains('background-video')) return;
        try {
          el.pause();
          el.currentTime = 0; 
        } catch (e) {
          console.error("Erro ao pausar audio:", e);
        }
      });
    };
    stopAudio();
    const timeout = setTimeout(stopAudio, 500);
    return () => clearTimeout(timeout);
  }, []);

  // 2. Centralização do Carousel
  useEffect(() => {
    if (viewState === 'carousel' && carouselRef.current) {
      const itemSize = 300; 
      const centerOffset = (window.innerWidth / 2) - (260 / 2);
      const scrollPos = (activeIndex * itemSize) - centerOffset + 130; 
      carouselRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [activeIndex, viewState]);

  // 3. Scroll RÁPIDO com Mouse Wheel
  const handleWheelScroll = (e) => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft += e.deltaY * 4; 
    }
  };

  const renderBonuses = (bonusData) => {
    if (!bonusData) return "Nenhum";
    const translations = {
      value: "Valor", detail: "Detalhes", details: "Detalhes", free_points: "Pontos Livres",
      female: "Feminino", male: "Masculino", male_exiled: "Masculino (Exilado)"
    };
    if (typeof bonusData === 'object') {
      return Object.entries(bonusData).map(([key, val], index) => {
        if (key === 'type') return null;
        const label = translations[key] || key.toUpperCase().replace(/_/g, ' ');
        let displayVal = val;
        if (typeof val === 'object') displayVal = JSON.stringify(val).replace(/["{}]/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
        return (
          <div key={index} className="mb-1">
            <span className="text-gray-400 font-bold">{label}:</span> <span className="text-gray-200">{displayVal}</span>
          </div>
        );
      });
    }
    return bonusData;
  };

  const getAvailableClasses = () => {
    if (!selectedRace) return [];
    if (typeof selectedRace.base_classes === 'object' && !Array.isArray(selectedRace.base_classes)) {
      if (selectedRace.id === 'viera') {
        return selectedGender === 'female' 
          ? selectedRace.base_classes.female 
          : selectedRace.base_classes.male || selectedRace.base_classes.male_exiled;
      }
      return []; 
    }
    return selectedRace.base_classes || [];
  };

  const getClassDetails = (className) => classesData.classes.find(c => c.name === className);

  const confirmRaceSelection = () => {
    setSelectedRace(races[activeIndex]);
    setSelectedClass(null);
    setViewState('details');
  };

  const handleBack = () => {
    setViewState('carousel');
    setSelectedClass(null);
  };

  const handleFinalizeCreation = () => {
    console.log(`Personagem Criado: ${charName} - ${selectedRace.name} - ${selectedClass}`);
    navigate('/vtt');
  };

  const activeRace = races[activeIndex];

  return (
    <div className="relative w-full h-screen overflow-hidden">
      
      {/* CSS DO MODAL DE NOME (Estilo Dourado/Pergaminho) */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .rpg-modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100vw; height: 100vh;
          background-color: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex; align-items: center; justify-content: center;
        }

        .rpg-modal-box {
          position: relative;
          width: 500px; max-width: 90%;
          background: #1a120b;
          border: 2px solid #b45309;
          box-shadow: 0 0 50px rgba(234, 179, 8, 0.4);
          padding: 6px;
          border-radius: 8px;
          animation: scaleIn 0.3s ease-out forwards;
        }

        .rpg-modal-inner {
          background: linear-gradient(to bottom, #f3e6d5, #e7cba8);
          border: 1px solid #78350f;
          padding: 40px 20px;
          border-radius: 4px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 20px;
        }

        .rpg-modal-title {
          font-family: 'Cinzel', serif; font-size: 32px; color: #78350f; font-weight: bold;
          text-transform: uppercase; text-shadow: 0px 1px 0px rgba(255,255,255,0.6); margin-bottom: 5px;
        }
        .rpg-modal-subtitle {
          font-family: 'Cinzel', serif; font-size: 14px; color: #92400e; font-style: italic;
          border-top: 1px solid rgba(146, 64, 14, 0.3); padding-top: 10px; width: 100%;
        }

        .rpg-input {
          width: 100%; padding: 12px; background: #fff8ed; border: 2px solid #854d0e;
          font-family: 'Cinzel', serif; font-size: 18px; color: #451a03; outline: none;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); border-radius: 4px;
        }
        .rpg-input:focus { border-color: #d97706; background: #ffffff; }

        .rpg-btn-go {
          background: linear-gradient(to bottom, #fcd34d, #d97706);
          border: 1px solid #92400e; padding: 10px 30px;
          font-family: 'Cinzel', serif; font-weight: bold; font-size: 18px; color: #451a03;
          text-transform: uppercase; cursor: pointer; border-radius: 4px;
          box-shadow: 0 4px 0 #92400e; transition: transform 0.1s;
        }
        .rpg-btn-go:active { transform: translateY(4px); box-shadow: 0 0 0 #92400e; }
        .rpg-btn-go:disabled { filter: grayscale(1); opacity: 0.6; cursor: not-allowed; }

        .rpg-close-btn {
          position: absolute; top: 10px; right: 15px; background: none; border: none;
          font-size: 20px; color: #92400e; cursor: pointer; font-weight: bold;
        }
        .rpg-close-btn:hover { color: #ff0000; }

        .corner { position: absolute; width: 20px; height: 20px; border-color: #fcd34d; border-style: solid; }
        .tl { top: -2px; left: -2px; border-width: 3px 0 0 3px; }
        .tr { top: -2px; right: -2px; border-width: 3px 3px 0 0; }
        .bl { bottom: -2px; left: -2px; border-width: 0 0 3px 3px; }
        .br { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; }
      `}</style>

      {/* --- BACKGROUND ANIMADO (ÉTER) --- */}
      <div className="ether-container">
        <div className="ether-vortex"></div>
        <div className="ether-particles"></div>
      </div>

      {/* --- CABEÇALHO --- */}
      <header className="absolute top-0 w-full p-6 z-50 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent">
        <div>
          <h1 className="rpg-title text-3xl">Gênese da Alma</h1>
          <p className="rpg-subtitle-styled mt-2">
            {viewState === 'carousel' ? 'Determine sua Linhagem Ancestral' : `${selectedRace?.name} // Customização`}
          </p>
        </div>
        {viewState === 'details' && (
          <button onClick={handleBack} className="nav-back-btn">
            <span>←</span> Seleção
          </button>
        )}
      </header>

      {/* --- FASE 1: CAROUSEL --- */}
      {viewState === 'carousel' && (
        <div className="w-full h-full flex flex-col justify-center animate-[fadeIn_1s]">
          <div className="text-center mb-4 z-10">
            <h2 className="rpg-title text-5xl text-yellow-500 drop-shadow-lg">{activeRace.name}</h2>
          </div>
          <div ref={carouselRef} onWheel={handleWheelScroll} className="carousel-viewport">
            {races.map((race, idx) => (
              <div key={race.id} onClick={() => setActiveIndex(idx)} className={`race-card-frame ${idx === activeIndex ? 'active' : ''}`}>
                <img src={race.image} alt={race.name} />
                <div className="card-label">{race.name}</div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10 z-10">
            <button onClick={confirmRaceSelection} className="confirm-btn w-64 mx-auto">
              Escolher {activeRace.name}
            </button>
          </div>
        </div>
      )}

      {/* --- FASE 2: DETALHES --- */}
      {viewState === 'details' && selectedRace && (
        <div className="details-grid">
          <div className="char-portrait-container">
            <img src={selectedRace.image} alt={selectedRace.name} className="char-portrait" />
          </div>
          <div className="info-scroll-area custom-scrollbar">
            <div className="glass-panel mt-8 border-l-4 border-yellow-600">
              <h3 className="section-header !border-none !mb-2 text-yellow-500">Descrição</h3>
              <p className="description-text">"{selectedRace.description}"</p>
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                 <div><span className="text-[10px] uppercase text-blue-400 font-bold">Características</span><p className="text-xs text-gray-400 mt-1">{selectedRace.characteristics}</p></div>
                 <div><span className="text-[10px] uppercase text-green-400 font-bold">Bônus Racial</span><div className="text-xs text-gray-300 font-mono mt-1">{renderBonuses(selectedRace.racial_bonus)}</div></div>
              </div>
            </div>

            <div className="glass-panel flex flex-col gap-2">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Gênero</span>
              <div className="flex w-full">
                <div onClick={() => { setSelectedGender('female'); setSelectedClass(null); }} className={`gender-option ${selectedGender === 'female' ? 'active' : ''}`}>Feminino</div>
                <div onClick={() => { setSelectedGender('male'); setSelectedClass(null); }} className={`gender-option ${selectedGender === 'male' ? 'active' : ''}`}>Masculino</div>
              </div>
            </div>

            <div>
              <h3 className="rpg-title text-xl mb-4 text-white">Vocação</h3>
              <div className="class-selector-grid">
                {getAvailableClasses().map((clsName) => {
                  const details = getClassDetails(clsName);
                  return (
                    <div key={clsName} onClick={() => setSelectedClass(clsName)} className={`class-btn ${selectedClass === clsName ? 'selected' : ''}`}>
                      <span className="class-btn-title">{clsName}</span>
                      <span className="class-btn-role">{details?.role || 'Básico'}</span>
                    </div>
                  );
                })}
              </div>

              {selectedClass && (() => {
                const info = getClassDetails(selectedClass);
                return info ? (
                  <div className="class-detail-container">
                    <div className="cd-header">
                      <div><h4 className="cd-title rpg-title">{info.name}</h4><div className="cd-meta text-blue-400">{info.type} // {info.role}</div></div>
                      <div className="cd-req"><span className="cd-req-label">Requisitos</span><div className="cd-req-val">{info.requirements?.length ? info.requirements.join(', ') : 'Nenhum'}</div></div>
                    </div>
                    <div className="cd-desc">"{info.description}"</div>
                    <div className="cd-bonus-box"><span className="text-xs uppercase font-bold text-blue-300">Bônus de Classe</span><span className="font-mono text-sm text-white">{renderBonuses(info.bonus_class)}</span></div>
                    <div>
                      <h5 className="text-xs uppercase text-yellow-500 font-bold mb-3 tracking-wider border-b border-white/10 pb-1 inline-block">Habilidades Iniciais</h5>
                      <div className="cd-abilities-grid">
                        {info.abilities?.map((ab, i) => (
                          <div key={i} className="cd-ability-card">
                            <div className="cd-ab-header"><span className="cd-ab-name">{ab.name}</span><span className="cd-ab-cost">{ab.cost}</span></div>
                            <p className="cd-ab-desc">{ab.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : <div className="p-4 text-center">Carregando...</div>;
              })()}
            </div>

            <div className="mt-8 mb-10">
               <button disabled={!selectedClass} onClick={() => setShowNameModal(true)} className="confirm-btn">
                 {selectedClass ? 'Finalizar Criação' : 'Selecione uma Vocação'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE NOME (POR CIMA DE TUDO) --- */}
      {showNameModal && (
        <div className="rpg-modal-overlay">
           <div className="rpg-modal-box">
             <div className="corner tl"></div>
             <div className="corner tr"></div>
             <div className="corner bl"></div>
             <div className="corner br"></div>

             <div className="rpg-modal-inner">
               <div className="w-full">
                  <h3 className="rpg-modal-title">Identidade</h3>
                  <p className="rpg-modal-subtitle">Como a história o conhecerá?</p>
               </div>
               
               <div className="w-full flex gap-2">
                 <input 
                   type="text" 
                   value={charName}
                   onChange={(e) => setCharName(e.target.value)}
                   placeholder="Nome do Aventureiro"
                   className="rpg-input"
                   autoFocus
                 />
                 <button 
                   onClick={handleFinalizeCreation}
                   disabled={!charName.trim()}
                   className="rpg-btn-go"
                 >
                   GO
                 </button>
               </div>

               <button className="rpg-close-btn" onClick={() => setShowNameModal(false)}>✕</button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default CharacterCreation;