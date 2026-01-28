import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import racesData from '../data/races.json';
import classesData from '../data/classes.json';
// Importe sua imagem de fundo corretamente
import bgCharacter from '../assets/fundo-character.jpg';

const CharacterCreation = () => {
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  // --- ESTADOS ---
  const [viewState, setViewState] = useState('carousel'); // 'carousel' | 'details'
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
      // Largura do Card (260px) + Gap (40px) = 300px
      const itemSize = 300; 
      const centerOffset = (window.innerWidth / 2) - (260 / 2);
      const scrollPos = (activeIndex * itemSize) - centerOffset + 130; 
      carouselRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [activeIndex, viewState]);

  // 3. Scroll Horizontal com Mouse Wheel
  const handleWheelScroll = (e) => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft += e.deltaY;
    }
  };

  // --- LÓGICA DE DADOS ---
  
  const getAvailableClasses = () => {
    if (!selectedRace) return [];
    
    // Tratamento especial para Viera
    if (typeof selectedRace.base_classes === 'object' && !Array.isArray(selectedRace.base_classes)) {
      if (selectedRace.id === 'viera') {
        return selectedGender === 'female' 
          ? selectedRace.base_classes.female 
          : selectedRace.base_classes.male || selectedRace.base_classes.male_exiled;
      }
      return []; // Fallback
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

  const activeRace = races[activeIndex];

  return (
    <div className="relative w-full h-screen overflow-hidden">
      
      {/* --- CAMADA 1: BACKGROUND FIXO E ESCURO --- */}
      <div className="fixed-bg-layer">
        <img src={bgCharacter} alt="Background" />
      </div>
      <div className="overlay-layer"></div>
      <div className="ether-particles"></div>

      {/* --- CAMADA 2: HEADER (Sempre visível) --- */}
      <header className="absolute top-0 w-full p-6 z-50 flex justify-between items-center border-b border-white/10 bg-gradient-to-b from-black to-transparent">
        <div>
          <h1 className="rpg-title text-3xl">Gênese da Alma</h1>
          <p className="text-gray-400 text-xs tracking-widest uppercase">
            {viewState === 'carousel' ? 'Selecione sua Linhagem' : `${selectedRace?.name} // Personalização`}
          </p>
        </div>
        {viewState === 'details' && (
          <button 
            onClick={() => setViewState('carousel')}
            className="px-6 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500 rounded text-xs uppercase tracking-widest transition-all bg-black/50"
          >
            Voltar
          </button>
        )}
      </header>

      {/* --- CAMADA 3: CONTEÚDO PRINCIPAL --- */}
      
      {/* MODO CARROSEL */}
      {viewState === 'carousel' && (
        <div className="w-full h-full flex flex-col justify-center animate-[fadeIn_1s]">
          
          {/* Título da Raça Ativa */}
          <div className="text-center mb-6 z-10">
            <h2 className="rpg-title text-5xl text-yellow-500 drop-shadow-lg">{activeRace.name}</h2>
          </div>

          {/* Carousel Viewport */}
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

          {/* Botão de Selecionar */}
          <div className="text-center mt-10 z-10">
            <button 
              onClick={confirmRaceSelection}
              className="cta-button w-64 mx-auto"
            >
              Escolher {activeRace.name}
            </button>
          </div>
        </div>
      )}

      {/* MODO DETALHES (GRID) */}
      {viewState === 'details' && selectedRace && (
        <div className="details-grid">
          
          {/* Coluna Esquerda: Imagem */}
          <div className="char-portrait-container">
            <h1 className="absolute bottom-10 left-[-50px] text-9xl rpg-title opacity-10 pointer-events-none rotate-90 whitespace-nowrap">
              {selectedRace.name}
            </h1>
            <img src={selectedRace.image} alt={selectedRace.name} className="char-portrait" />
          </div>

          {/* Coluna Direita: Informações (Scrollável) */}
          <div className="info-scroll-area custom-scrollbar">
            
            {/* 1. Painel da Raça */}
            <div className="glass-panel mt-10">
              <h3 className="section-header">Sobre a Raça</h3>
              <p className="text-gray-300 italic mb-6 leading-relaxed text-sm">
                "{selectedRace.description}"
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-blue-400 uppercase font-bold">Características</span>
                  <p className="text-xs text-gray-400 mt-1">{selectedRace.characteristics}</p>
                </div>
                <div>
                  <span className="text-xs text-green-400 uppercase font-bold">Bônus Racial</span>
                  <div className="text-xs text-gray-300 font-mono mt-1">
                    {JSON.stringify(selectedRace.racial_bonus).replace(/["{}]/g, '').replace(/,/g, ', ')}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Seletor de Gênero */}
            <div className="glass-panel flex items-center justify-between">
              <span className="rpg-text text-gray-400 text-sm">GÊNERO DO PERSONAGEM</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSelectedGender('female'); setSelectedClass(null); }}
                  className={`px-4 py-1 text-xs border rounded uppercase transition-all ${selectedGender === 'female' ? 'bg-pink-900/50 border-pink-500 text-white' : 'border-gray-600 text-gray-500'}`}
                >
                  Feminino
                </button>
                <button 
                  onClick={() => { setSelectedGender('male'); setSelectedClass(null); }}
                  className={`px-4 py-1 text-xs border rounded uppercase transition-all ${selectedGender === 'male' ? 'bg-blue-900/50 border-blue-500 text-white' : 'border-gray-600 text-gray-500'}`}
                >
                  Masculino
                </button>
              </div>
            </div>

            {/* 3. Seleção de Classe */}
            <div className="mt-8">
              <h3 className="section-header text-white mb-4">Escolha sua Vocação</h3>
              
              <div className="class-selector-grid">
                {getAvailableClasses().map((clsName) => {
                  const details = getClassDetails(clsName);
                  return (
                    <button
                      key={clsName}
                      onClick={() => setSelectedClass(clsName)}
                      className={`class-btn ${selectedClass === clsName ? 'selected' : ''}`}
                    >
                      <span className="block rpg-text font-bold text-sm text-gray-200">{clsName}</span>
                      <span className="block text-[10px] text-gray-500 uppercase mt-1">
                        {details?.role || 'Básico'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* 4. Detalhes da Classe (Aparece ao selecionar) */}
              {selectedClass && (() => {
                const info = getClassDetails(selectedClass);
                return info ? (
                  <div className="glass-panel border-t-2 border-yellow-500 animate-[fadeIn_0.3s]">
                    <div className="flex justify-between items-end mb-4 border-b border-white/10 pb-2">
                      <h2 className="text-2xl rpg-title text-white">{info.name}</h2>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 uppercase block">Tipo</span>
                        <span className="text-xs text-blue-300 font-bold">{info.type}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-6 italic">"{info.description}"</p>

                    {/* Stats e Requisitos */}
                    <div className="flex gap-4 mb-6 bg-black/30 p-3 rounded">
                       <div className="flex-1">
                         <span className="text-[10px] uppercase text-gray-500 block">Bônus de Classe</span>
                         <span className="text-xs font-mono text-green-300">
                           {JSON.stringify(info.bonus_class).replace(/["{}]/g, '').replace(/,/g, ' | ')}
                         </span>
                       </div>
                       <div className="flex-1 border-l border-white/10 pl-4">
                         <span className="text-[10px] uppercase text-gray-500 block">Requisitos</span>
                         <span className="text-xs text-red-300">
                           {info.requirements?.length ? info.requirements.join(', ') : 'Nenhum'}
                         </span>
                       </div>
                    </div>

                    {/* Habilidades */}
                    <div>
                      <h4 className="text-xs uppercase text-yellow-500 font-bold mb-3">Habilidades Iniciais</h4>
                      <div className="space-y-2">
                        {info.abilities?.map((ab, i) => (
                          <div key={i} className="flex flex-col bg-white/5 p-2 rounded hover:bg-white/10 transition-colors border border-transparent hover:border-white/20">
                            <div className="flex justify-between">
                              <span className="text-xs font-bold text-gray-200">{ab.name}</span>
                              <span className="text-[10px] text-blue-300 bg-blue-900/30 px-2 rounded">{ab.cost}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">{ab.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : <div className="p-4 text-center">Carregando dados...</div>;
              })()}
            </div>

            {/* Botão Final */}
            <div className="mt-8 mb-20">
              <button 
                disabled={!selectedClass}
                onClick={() => navigate('/vtt')}
                className="cta-button"
              >
                {selectedClass ? 'Finalizar Criação' : 'Selecione uma Classe'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreation;