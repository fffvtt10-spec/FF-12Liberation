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

  // 1. Limpeza de Audio (Agressiva) - Garante que a música do Login morre aqui
  useEffect(() => {
    const stopAudio = () => {
      const audioElements = document.querySelectorAll('audio, video');
      audioElements.forEach(el => {
        // Ignora o vídeo de fundo se ele tiver a classe especifica
        if(el.tagName === 'VIDEO' && el.classList.contains('background-video')) return;
        
        try {
          el.pause();
          el.currentTime = 0; 
        } catch (e) {
          console.error("Erro ao pausar audio:", e);
        }
      });
    };

    // Tenta parar imediatamente
    stopAudio();
    
    // Insiste em parar algumas vezes nos primeiros segundos para garantir que nada carregue depois
    const interval = setInterval(stopAudio, 200);
    const timeout = setTimeout(() => clearInterval(interval), 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
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

  // --- LÓGICA DE TRADUÇÃO E FORMATAÇÃO ---
  const renderBonuses = (bonusData) => {
    if (!bonusData) return "Nenhum";

    const translations = {
      value: "Valor",
      detail: "Detalhes",
      details: "Detalhes",
      free_points: "Pontos Livres",
      female: "Feminino",
      male: "Masculino",
      male_exiled: "Masculino (Exilado)"
    };

    if (typeof bonusData === 'object') {
      return Object.entries(bonusData).map(([key, val], index) => {
        if (key === 'type') return null;

        const label = translations[key] || key.toUpperCase().replace(/_/g, ' ');
        
        let displayVal = val;
        if (typeof val === 'object') {
          displayVal = JSON.stringify(val).replace(/["{}]/g, '').replace(/:/g, ': ').replace(/,/g, ', ');
        }

        return (
          <div key={index} className="mb-1">
            <span className="text-gray-400 font-bold">{label}:</span> <span className="text-gray-200">{displayVal}</span>
          </div>
        );
      });
    }
    return bonusData;
  };

  // --- LÓGICA DE DADOS ---
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

  const getClassDetails = (className) => {
    return classesData.classes.find(c => c.name === className);
  };

  // Handlers
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
      
      {/* Estilos inline para animação personalizada do modal */}
      <style>{`
        @keyframes scaleInCenter {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scaleInCenter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
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

          <div 
            ref={carouselRef}
            onWheel={handleWheelScroll}
            className="carousel-viewport"
          >
            {races.map((race, idx) => (
              <div 
                key={race.id}
                onClick={() => setActiveIndex(idx)}
                className={`race-card-frame ${idx === activeIndex ? 'active' : ''}`}
              >
                <img src={race.image} alt={race.name} />
                <div className="card-label">{race.name}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10 z-10">
            <button 
              onClick={confirmRaceSelection}
              className="confirm-btn w-64 mx-auto"
            >
              Escolher {activeRace.name}
            </button>
          </div>
        </div>
      )}

      {/* --- FASE 2: DETALHES --- */}
      {viewState === 'details' && selectedRace && (
        <div className="details-grid">
          
          {/* LADO ESQUERDO: IMAGEM */}
          <div className="char-portrait-container">
            <img src={selectedRace.image} alt={selectedRace.name} className="char-portrait" />
          </div>

          {/* LADO DIREITO: INFO */}
          <div className="info-scroll-area custom-scrollbar">
            
            {/* Bloco 1: Lore */}
            <div className="glass-panel mt-8 border-l-4 border-yellow-600">
              <h3 className="section-header !border-none !mb-2 text-yellow-500">Descrição</h3>
              <p className="description-text">
                "{selectedRace.description}"
              </p>
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                 <div>
                   <span className="text-[10px] uppercase text-blue-400 font-bold">Características</span>
                   <p className="text-xs text-gray-400 mt-1">{selectedRace.characteristics}</p>
                 </div>
                 <div>
                   <span className="text-[10px] uppercase text-green-400 font-bold">Bônus Racial</span>
                   <div className="text-xs text-gray-300 font-mono mt-1">
                     {renderBonuses(selectedRace.racial_bonus)}
                   </div>
                 </div>
              </div>
            </div>

            {/* Bloco 2: Gênero */}
            <div className="glass-panel flex flex-col gap-2">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Gênero</span>
              <div className="flex w-full">
                <div 
                  onClick={() => { setSelectedGender('female'); setSelectedClass(null); }}
                  className={`gender-option ${selectedGender === 'female' ? 'active' : ''}`}
                >
                  Feminino
                </div>
                <div 
                  onClick={() => { setSelectedGender('male'); setSelectedClass(null); }}
                  className={`gender-option ${selectedGender === 'male' ? 'active' : ''}`}
                >
                  Masculino
                </div>
              </div>
            </div>

            {/* Bloco 3: Classes */}
            <div>
              <h3 className="rpg-title text-xl mb-4 text-white">Vocação</h3>
              
              <div className="class-selector-grid">
                {getAvailableClasses().map((clsName) => {
                  const details = getClassDetails(clsName);
                  return (
                    <div 
                      key={clsName}
                      onClick={() => setSelectedClass(clsName)}
                      className={`class-btn ${selectedClass === clsName ? 'selected' : ''}`}
                    >
                      <span className="class-btn-title">{clsName}</span>
                      <span className="class-btn-role">
                        {details?.role || 'Básico'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {selectedClass && (() => {
                const info = getClassDetails(selectedClass);
                return info ? (
                  <div className="class-detail-container">
                    
                    <div className="cd-header">
                      <div>
                        <h4 className="cd-title rpg-title">{info.name}</h4>
                        <div className="cd-meta text-blue-400">{info.type} // {info.role}</div>
                      </div>
                      <div className="cd-req">
                        <span className="cd-req-label">Requisitos</span>
                        <div className="cd-req-val">
                          {info.requirements?.length ? info.requirements.join(', ') : 'Nenhum'}
                        </div>
                      </div>
                    </div>

                    <div className="cd-desc">
                      "{info.description}"
                    </div>

                    <div className="cd-bonus-box">
                        <span className="text-xs uppercase font-bold text-blue-300">Bônus de Classe</span>
                        <span className="font-mono text-sm text-white">
                          {renderBonuses(info.bonus_class)}
                        </span>
                    </div>

                    <div>
                      <h5 className="text-xs uppercase text-yellow-500 font-bold mb-3 tracking-wider border-b border-white/10 pb-1 inline-block">
                        Habilidades Iniciais
                      </h5>
                      <div className="cd-abilities-grid">
                        {info.abilities?.map((ab, i) => (
                          <div key={i} className="cd-ability-card">
                            <div className="cd-ab-header">
                              <span className="cd-ab-name">{ab.name}</span>
                              <span className="cd-ab-cost">{ab.cost}</span>
                            </div>
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
               <button
                 disabled={!selectedClass}
                 onClick={() => setShowNameModal(true)}
                 className="confirm-btn"
               >
                 {selectedClass ? 'Finalizar Criação' : 'Selecione uma Vocação'}
               </button>
            </div>

          </div>
        </div>
      )}

      {/* --- MODAL DE NOME RPG STYLE (VISUAL ATUALIZADO) --- */}
      {showNameModal && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="bg-black/80 backdrop-blur-xl" // Blur forte e fundo escuro
        >
           {/* Container da Caixa (Animação Scale In) */}
           <div className="animate-scale-in relative w-full max-w-lg m-4">
             
             {/* Borda Externa Dourada/Fancy (Camada Decorativa) */}
             <div className="relative bg-gradient-to-b from-yellow-700 via-yellow-500 to-yellow-800 rounded-lg p-[3px] shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                
                {/* Borda Interna e Conteúdo */}
                <div className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black rounded-md p-8 flex flex-col items-center gap-6 border-2 border-yellow-900/50 relative overflow-hidden">
                   
                   {/* Detalhe de Brilho no Topo */}
                   <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50"></div>

                   {/* Título Estilizado */}
                   <div className="text-center space-y-2 z-10">
                     <h3 className="text-4xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 font-serif font-bold tracking-wider drop-shadow-sm uppercase">
                       Identidade
                     </h3>
                     <p className="text-yellow-600/80 font-serif italic text-sm tracking-widest border-t border-yellow-900/30 pt-2">
                       Como a história o conhecerá?
                     </p>
                   </div>

                   {/* Container do Input e Botão (Estilo Unificado) */}
                   <div className="w-full relative flex items-stretch shadow-2xl mt-2 z-10">
                      
                      <input 
                        type="text" 
                        value={charName}
                        onChange={(e) => setCharName(e.target.value)}
                        placeholder="Nome do Aventureiro"
                        className="flex-1 bg-black/40 border-y-2 border-l-2 border-yellow-700/60 text-yellow-100 px-4 py-3 text-lg font-serif placeholder-yellow-800/40 focus:border-yellow-500/80 focus:bg-black/60 outline-none transition-all rounded-l-md"
                        autoFocus
                      />
                      
                      <button 
                        onClick={handleFinalizeCreation}
                        disabled={!charName.trim()}
                        className="bg-gradient-to-b from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 text-white font-serif font-bold text-lg px-6 py-2 border-2 border-yellow-700/80 rounded-r-md shadow-inner transition-all disabled:opacity-50 disabled:grayscale uppercase tracking-widest"
                      >
                        Go
                      </button>
                   </div>

                   {/* Botão Fechar Decorativo */}
                   <button 
                     onClick={() => setShowNameModal(false)}
                     className="absolute top-2 right-3 text-yellow-800 hover:text-yellow-400 transition-colors text-xl font-bold z-20"
                   >
                     ✕
                   </button>
                </div>

                {/* Cantos Decorativos Dourados (Simulação de Cantoneiras) */}
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-yellow-300"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-yellow-300"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-yellow-300"></div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-yellow-300"></div>

             </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default CharacterCreation;