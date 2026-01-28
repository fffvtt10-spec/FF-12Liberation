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

  const races = racesData.races;

  // 1. Limpeza de Audio
  useEffect(() => {
    const audioElements = document.querySelectorAll('audio, video');
    audioElements.forEach(el => {
      if(el.tagName === 'VIDEO' && el.classList.contains('background-video')) return;
      el.pause();
    });
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

    // Mapa de tradução
    const translations = {
      type: "Tipo",
      value: "Valor",
      detail: "Detalhes",
      details: "Detalhes",
      free_points: "Pontos Livres",
      female: "Feminino",
      male: "Masculino",
      male_exiled: "Masculino (Exilado)"
    };

    // Se for objeto, itera e traduz
    if (typeof bonusData === 'object') {
      return Object.entries(bonusData).map(([key, val], index) => {
        const label = translations[key] || key.toUpperCase().replace(/_/g, ' ');
        
        // Se o valor for outro objeto (ex: atributos aninhados), formata recursivamente ou simplifica
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

  const activeRace = races[activeIndex];

  return (
    <div className="relative w-full h-screen overflow-hidden">
      
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
          
          {/* LADO ESQUERDO: IMAGEM (Zoom + Fade) */}
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
                     {/* Chamada da função de renderização traduzida */}
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
              
              {/* Grid de Botões */}
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

              {/* Detalhes da Classe (Expandido) */}
              {selectedClass && (() => {
                const info = getClassDetails(selectedClass);
                return info ? (
                  <div className="class-detail-container">
                    
                    {/* Header */}
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

                    {/* Descrição Formatada */}
                    <div className="cd-desc">
                      "{info.description}"
                    </div>

                    {/* Bônus */}
                    <div className="cd-bonus-box">
                       <span className="text-xs uppercase font-bold text-blue-300">Bônus de Classe</span>
                       <span className="font-mono text-sm text-white">
                         {/* Usando renderBonuses para garantir tradução aqui também se necessário */}
                         {renderBonuses(info.bonus_class)}
                       </span>
                    </div>

                    {/* Habilidades Organizadas */}
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

            {/* Botão Final */}
            <div className="mt-8 mb-10">
               <button
                 disabled={!selectedClass}
                 onClick={() => navigate('/vtt')}
                 className="confirm-btn"
               >
                 {selectedClass ? 'Finalizar Criação' : 'Selecione uma Vocação'}
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreation;