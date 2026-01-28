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

  // 1. Limpeza de Audio (Agressiva)
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
      
      {/* Estilos inline para animação personalizada do modal e textura */}
      <style>{`
        @keyframes scaleInCenter {
          0% { transform: scale(0); opacity: 0; }
          80% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scaleInCenter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .parchment-texture {
          background-color: #f3e5ce;
          background-image: url("https://www.transparenttextures.com/patterns/aged-paper.png");
          box-shadow: inset 0 0 80px rgba(60, 40, 10, 0.2);
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

      {/* --- MODAL DE NOME ESTILO RPG HIGH-END (OVERLAY POR CIMA DE TUDO) --- */}
      {showNameModal && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="bg-black/80 backdrop-blur-xl transition-all duration-500" // Fundo muito escuro e muito borrado
        >
           {/* Container Principal da Caixa (com animação scale-in) */}
           <div className="animate-scale-in relative max-w-lg w-full p-4">
             
             {/* 1. MOLDURA DOURADA EXTERNA */}
             <div className="relative rounded-lg p-[4px] bg-gradient-to-b from-[#d97706] via-[#fbbf24] to-[#b45309] shadow-[0_0_60px_rgba(251,191,36,0.6)]">
                
                {/* 2. MOLDURA ESCURA INTERMEDIÁRIA */}
                <div className="bg-[#1a120b] p-2 rounded-md">
                   
                   {/* 3. FUNDO PERGAMINHO INTERNO */}
                   <div className="parchment-texture rounded border border-[#854d0e] p-8 flex flex-col items-center text-center relative overflow-hidden">
                      
                      {/* Efeito de borda interna escurecida */}
                      <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(66,32,6,0.4)] pointer-events-none"></div>

                      {/* Cabeçalho */}
                      <div className="relative z-10 mb-8 w-full">
                        <h3 className="text-4xl text-[#78350f] font-serif font-bold tracking-widest drop-shadow-sm uppercase mb-2" style={{ textShadow: '1px 1px 0px rgba(255,255,255,0.4)' }}>
                          Identidade
                        </h3>
                        {/* Linha divisória ornamental */}
                        <div className="flex items-center justify-center gap-2 opacity-70 mb-2">
                           <div className="h-[2px] w-12 bg-gradient-to-l from-[#92400e] to-transparent"></div>
                           <div className="w-2 h-2 rotate-45 bg-[#92400e]"></div>
                           <div className="h-[2px] w-12 bg-gradient-to-r from-[#92400e] to-transparent"></div>
                        </div>
                        <p className="text-[#92400e] font-serif italic text-sm tracking-widest font-semibold">
                          Como a história o conhecerá?
                        </p>
                      </div>

                      {/* Input e Botão (Agrupados) */}
                      <div className="flex w-full items-stretch shadow-xl z-10 group transform hover:scale-[1.01] transition-transform duration-300">
                        {/* Input */}
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={charName}
                            onChange={(e) => setCharName(e.target.value)}
                            placeholder="Nome do Aventureiro"
                            className="w-full h-full bg-[#fff8ed] border-y-2 border-l-2 border-[#854d0e] text-[#451a03] px-4 py-3 text-lg font-serif placeholder-[#b48358] focus:bg-white focus:outline-none transition-colors rounded-l-md shadow-inner"
                            autoFocus
                          />
                        </div>

                        {/* Botão GO Dourado */}
                        <button 
                          onClick={handleFinalizeCreation}
                          disabled={!charName.trim()}
                          className="bg-gradient-to-b from-[#fcd34d] to-[#d97706] text-[#451a03] border-2 border-[#854d0e] px-8 py-2 rounded-r-md font-serif font-bold text-xl uppercase tracking-wider shadow-md hover:brightness-110 active:translate-y-1 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                        >
                          Go
                        </button>
                      </div>

                      {/* Botão Fechar (X) */}
                      <button 
                        onClick={() => setShowNameModal(false)}
                        className="absolute top-2 right-3 text-[#92400e] hover:text-[#451a03] font-bold text-xl z-20 transition-colors"
                        title="Cancelar"
                      >
                        ✕
                      </button>

                   </div>
                </div>

                {/* Cantoneiras Decorativas (Detalhes Dourados nos 4 cantos) */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-[#fcd34d] rounded-tl-sm drop-shadow-md"></div>
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-[#fcd34d] rounded-tr-sm drop-shadow-md"></div>
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-[#fcd34d] rounded-bl-sm drop-shadow-md"></div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-[#fcd34d] rounded-br-sm drop-shadow-md"></div>

             </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default CharacterCreation;