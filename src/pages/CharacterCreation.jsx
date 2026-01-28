import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import racesData from '../data/races.json';
import classesData from '../data/classes.json';
// Import da imagem de fundo
import bgCharacter from '../assets/fundo-character.jpg';

const CharacterCreation = () => {
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  // Estados
  const [viewState, setViewState] = useState('carousel'); // 'carousel' | 'details'
  const [activeIndex, setActiveIndex] = useState(0); 
  const [selectedRace, setSelectedRace] = useState(null); 
  const [selectedGender, setSelectedGender] = useState('female');
  const [selectedClass, setSelectedClass] = useState(null);

  const races = racesData.races;

  // Efeito: Parar áudio residual e resetar scroll ao mudar de view
  useEffect(() => {
    const audioElements = document.querySelectorAll('audio, video');
    audioElements.forEach(el => {
      if(el.tagName === 'VIDEO' && el.classList.contains('background-video')) return;
      el.pause();
    });
  }, []);

  // Efeito: Centralizar card no carousel
  useEffect(() => {
    if (viewState === 'carousel' && carouselRef.current) {
      // 280px card + 48px gap = 328px por item (aproximado)
      const cardWidthWithGap = 328; 
      const centerOffset = (window.innerWidth / 2) - (280 / 2); // Metade da tela - metade do card
      const scrollPos = (activeIndex * cardWidthWithGap) - centerOffset + 140; // Ajuste fino
      
      carouselRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }, [activeIndex, viewState]);

  // Handler: Scroll com Mouse Wheel
  const handleWheelScroll = (e) => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft += e.deltaY;
    }
  };

  // Helper: Obter classes baseadas na raça/gênero
  const getAvailableClasses = () => {
    if (!selectedRace) return [];
    
    // Lógica para Viera ou objetos complexos
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

  // Helper: Obter detalhes da classe
  const getClassDetails = (className) => {
    return classesData.classes.find(c => c.name === className);
  };

  // Navegação
  const handleSelectRace = () => {
    setSelectedRace(races[activeIndex]);
    setSelectedClass(null);
    setViewState('details');
  };

  const handleBack = () => {
    setViewState('carousel');
    setSelectedClass(null);
  };

  const activeRaceInCarousel = races[activeIndex];

  return (
    <div className="relative w-full h-screen text-gray-100 overflow-hidden font-sans selection:bg-yellow-500 selection:text-black">
      
      {/* 1. BACKGROUND FIXO (Z-INDEX BAIXO) */}
      <div className="fixed-bg">
        <img 
          src={bgCharacter} 
          alt="Background" 
          className="w-full h-full object-cover opacity-60"
        />
      </div>
      {/* 2. OVERLAY ESCURO (PARA LEITURA) */}
      <div className="bg-overlay"></div>

      {/* 3. CABEÇALHO (FIXO NO TOPO) */}
      <div className="absolute top-0 w-full px-8 py-6 z-50 flex justify-between items-end border-b border-white/10 bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h1 className="rpg-title text-4xl text-yellow-500">Gênese da Alma</h1>
          <p className="rpg-subtitle text-xs mt-1">Sistema de Criação de Personagem V.1.0</p>
        </div>
        
        {viewState === 'details' && (
          <button 
            onClick={handleBack}
            className="px-6 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-yellow-500 hover:bg-yellow-500/10 transition-all rounded font-serif uppercase tracking-widest text-xs"
          >
            ← Voltar à Seleção
          </button>
        )}
      </div>

      {/* --- FASE 1: CAROUSEL DE RAÇAS --- */}
      {viewState === 'carousel' && (
        <div className="w-full h-full flex flex-col justify-center items-center animate-[fadeIn_0.8s] relative z-10">
          
          <div className="text-center mb-4">
            <h2 className="rpg-title text-2xl text-white tracking-[0.5em]">{activeRaceInCarousel.name}</h2>
            <p className="text-gray-400 font-serif italic text-sm mt-2">Selecione sua linhagem ancestral</p>
          </div>

          {/* Container do Carousel */}
          <div className="w-full h-[500px] flex items-center">
            <div 
              ref={carouselRef}
              onWheel={handleWheelScroll}
              className="carousel-container"
            >
              {races.map((race, idx) => (
                <div 
                  key={race.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`race-card-frame flex-shrink-0 ${idx === activeIndex ? 'active' : ''}`}
                >
                  {/* Imagem preenche o card frame */}
                  <img src={race.image} alt={race.name} />
                  <div className="race-card-name">{race.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de Confirmação */}
          <div className="mt-8">
             <button 
               onClick={handleSelectRace}
               className="group relative px-12 py-4 bg-transparent overflow-hidden rounded-sm border border-yellow-600/50 hover:border-yellow-400 transition-all"
             >
               <div className="absolute inset-0 w-0 bg-yellow-600/20 transition-all duration-[250ms] ease-out group-hover:w-full"></div>
               <span className="relative text-yellow-100 font-serif uppercase tracking-widest font-bold group-hover:text-white">
                 Confirmar {activeRaceInCarousel.name}
               </span>
             </button>
          </div>
        </div>
      )}

      {/* --- FASE 2: DETALHES & CLASSES (LAYOUT GRID) --- */}
      {viewState === 'details' && selectedRace && (
        <div className="details-grid">
          
          {/* LADO ESQUERDO: IMAGEM DO PERSONAGEM */}
          <div className="relative h-full w-full flex items-end justify-center bg-gradient-to-r from-black/40 to-transparent">
            {/* Imagem Flutuante */}
            <img 
              src={selectedRace.image} 
              alt={selectedRace.name} 
              className="details-char-img"
            />
            {/* Nome Gigante atrás/sobre */}
            <h1 className="absolute bottom-10 left-8 text-8xl rpg-title opacity-20 pointer-events-none z-0">
              {selectedRace.name}
            </h1>
          </div>

          {/* LADO DIREITO: PAINEL DE INFORMAÇÕES (SCROLLABLE) */}
          <div className="h-full overflow-y-auto custom-scrollbar pt-28 pb-20 px-12 bg-black/40 backdrop-blur-sm border-l border-white/5">
            
            {/* Bloco 1: Lore e Stats Raciais */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10 animate-[fadeInRight_0.5s]">
              {/* Descrição */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-lg border-l-4 border-yellow-600">
                <h3 className="text-yellow-500 font-serif uppercase text-xs mb-3 tracking-widest">Lore</h3>
                <p className="text-gray-300 font-serif italic leading-relaxed text-lg">
                  "{selectedRace.description}"
                </p>
              </div>

              {/* Stats Rápidos */}
              <div className="glass-panel p-6 rounded-lg flex flex-col justify-center gap-4">
                 <div>
                   <h4 className="text-blue-400 text-xs uppercase font-bold mb-1">Características</h4>
                   <p className="text-xs text-gray-400">{selectedRace.characteristics}</p>
                 </div>
                 <div>
                   <h4 className="text-green-400 text-xs uppercase font-bold mb-1">Bônus Racial</h4>
                   <div className="text-xs font-mono text-gray-300">
                     {JSON.stringify(selectedRace.racial_bonus).replace(/["{}]/g, '').replace(/,/g, ', ').replace(/:/g, ': ')}
                   </div>
                 </div>
              </div>
            </div>

            {/* Bloco 2: Seleção de Gênero */}
            <div className="flex items-center gap-6 mb-10 border-b border-gray-800 pb-6">
              <span className="text-gray-500 font-serif uppercase tracking-widest text-sm">Gênero</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setSelectedGender('female'); setSelectedClass(null); }}
                  className={`px-6 py-2 rounded border transition-all font-serif text-sm ${selectedGender === 'female' ? 'bg-pink-900/40 border-pink-500 text-white' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
                >
                  Feminino
                </button>
                <button 
                  onClick={() => { setSelectedGender('male'); setSelectedClass(null); }}
                  className={`px-6 py-2 rounded border transition-all font-serif text-sm ${selectedGender === 'male' ? 'bg-blue-900/40 border-blue-500 text-white' : 'border-gray-700 text-gray-500 hover:text-gray-300'}`}
                >
                  Masculino
                </button>
              </div>
            </div>

            {/* Bloco 3: Seleção de Classe (Gamificada) */}
            <div className="animate-[fadeInRight_0.7s]">
              <h2 className="rpg-title text-2xl mb-6 flex items-center gap-4">
                <span className="w-8 h-[2px] bg-yellow-600"></span>
                Escolha sua Vocação
              </h2>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                
                {/* Lista de Classes (Menu) */}
                <div className="flex flex-col gap-2">
                  {getAvailableClasses().map((clsName) => {
                    const details = getClassDetails(clsName);
                    return (
                      <div 
                        key={clsName}
                        onClick={() => setSelectedClass(clsName)}
                        className={`fft-class-btn ${selectedClass === clsName ? 'selected' : ''}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-serif font-bold uppercase tracking-wider ${selectedClass === clsName ? 'text-yellow-200' : 'text-gray-400'}`}>
                            {clsName}
                          </span>
                          <span className="text-[10px] text-gray-600 border border-gray-700 px-1 rounded uppercase">
                            {details?.role || 'Básico'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detalhes da Classe (Painel Dinâmico) */}
                <div className="relative min-h-[400px]">
                  {selectedClass ? (() => {
                    const info = getClassDetails(selectedClass);
                    return info ? (
                      <div className="glass-panel p-6 rounded-lg border-t-4 border-blue-500 h-full animate-[fadeIn_0.3s]">
                        
                        {/* Cabeçalho da Classe */}
                        <div className="flex justify-between items-start mb-4 border-b border-gray-700 pb-4">
                          <div>
                             <h3 className="text-3xl font-serif text-white">{info.name}</h3>
                             <span className="text-blue-400 text-xs uppercase font-bold tracking-widest">{info.type}</span>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] text-gray-500 uppercase">Requisitos</div>
                             <div className="text-xs text-red-400">{info.requirements?.join(', ') || 'Nenhum'}</div>
                          </div>
                        </div>

                        <p className="text-gray-400 italic text-sm mb-6">"{info.description}"</p>

                        {/* Bônus */}
                        <div className="mb-6 bg-blue-950/30 p-3 rounded border border-blue-500/20">
                           <span className="text-blue-300 text-xs font-bold uppercase block mb-1">Bônus de Atributos</span>
                           <span className="font-mono text-sm text-white">
                             {JSON.stringify(info.bonus_class).replace(/["{}]/g, '').replace(/,/g, '  |  ')}
                           </span>
                        </div>

                        {/* Habilidades */}
                        <div>
                          <h4 className="text-yellow-500 text-xs uppercase font-bold mb-3 border-b border-gray-700 inline-block pb-1">Habilidades Iniciais</h4>
                          <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                             {info.abilities?.map((ab, i) => (
                               <div key={i} className="bg-white/5 p-3 rounded hover:bg-white/10 transition-colors">
                                 <div className="flex justify-between text-xs mb-1">
                                   <strong className="text-white font-serif">{ab.name}</strong>
                                   <span className="text-blue-300">{ab.cost}</span>
                                 </div>
                                 <p className="text-gray-500 text-[11px] leading-snug">{ab.description}</p>
                               </div>
                             ))}
                          </div>
                        </div>

                      </div>
                    ) : <p>Carregando...</p>
                  })() : (
                    <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg text-gray-600 font-serif">
                      Selecione uma classe ao lado para ver os detalhes
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botão Final */}
            <div className="mt-12 mb-10">
               <button
                 disabled={!selectedClass}
                 onClick={() => navigate('/vtt')}
                 className={`w-full py-5 rounded-lg uppercase tracking-[0.3em] font-bold font-serif transition-all duration-300
                   ${selectedClass 
                     ? 'bg-gradient-to-r from-yellow-700 to-yellow-600 text-white shadow-lg hover:shadow-yellow-500/20 hover:scale-[1.01] border border-yellow-500' 
                     : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                   }`}
               >
                 {selectedClass ? 'Finalizar Criação' : 'Aguardando Escolhas...'}
               </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreation;