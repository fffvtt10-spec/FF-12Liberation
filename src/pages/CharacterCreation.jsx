import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import racesData from '../data/races.json';
import classesData from '../data/classes.json';

const CharacterCreation = () => {
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  // Estados
  const [viewState, setViewState] = useState('carousel'); // 'carousel' | 'details'
  const [activeIndex, setActiveIndex] = useState(0); // Índice para o carousel
  const [selectedRace, setSelectedRace] = useState(null); // Objeto da raça selecionada
  const [selectedGender, setSelectedGender] = useState('female');
  const [selectedClass, setSelectedClass] = useState(null);

  const races = racesData.races;

  // Efeito para parar músicas residuais ao entrar
  useEffect(() => {
    const audioElements = document.querySelectorAll('audio, video');
    audioElements.forEach(el => {
      if(el.tagName === 'VIDEO' && el.classList.contains('background-video')) return; // Mantém vídeo se quiser
      el.pause();
    });
  }, []);

  // Centraliza o card ativo no carousel
  useEffect(() => {
    if (viewState === 'carousel' && carouselRef.current) {
      const scrollAmount = (activeIndex * 282) - (window.innerWidth / 2) + 141; // 250px card + 32px gap
      carouselRef.current.scrollTo({ left: scrollAmount, behavior: 'smooth' });
    }
  }, [activeIndex, viewState]);

  // Lógica de Classes Disponíveis
  const getAvailableClasses = () => {
    if (!selectedRace) return [];
    
    // Tratamento para Viera (baseado em genero) vs Outras raças
    if (typeof selectedRace.base_classes === 'object' && !Array.isArray(selectedRace.base_classes)) {
      if (selectedRace.id === 'viera') {
        return selectedGender === 'female' 
          ? selectedRace.base_classes.female 
          : selectedRace.base_classes.male || selectedRace.base_classes.male_exiled;
      }
      return [];
    }
    
    // Padrão (Array)
    return selectedRace.base_classes || [];
  };

  // Busca detalhes da classe no JSON de classes
  const getClassDetails = (className) => {
    return classesData.classes.find(c => c.name === className);
  };

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
    <div className="relative w-full h-screen text-white overflow-hidden font-sans">
      {/* Background Global */}
      <div className="ether-bg"><div className="ether-particles"></div></div>

      {/* --- CABEÇALHO --- */}
      <div className="absolute top-0 w-full p-8 z-50 flex justify-between items-center pointer-events-none">
        <div>
          <h1 className="rpg-title text-3xl md:text-5xl">Gênese da Alma</h1>
          <p className="text-gray-400 text-sm tracking-widest mt-2 uppercase font-bold">
            {viewState === 'carousel' ? 'Selecione sua Linhagem' : `Caminho do ${selectedRace?.name}`}
          </p>
        </div>
        
        {viewState === 'details' && (
          <button 
            onClick={handleBack}
            className="pointer-events-auto px-6 py-2 border border-gray-500 text-gray-300 hover:text-white hover:border-white transition-all rounded bg-black/50 backdrop-blur-sm"
          >
            Voltar à Seleção
          </button>
        )}
      </div>

      {/* --- VISUALIZAÇÃO 1: CAROUSEL --- */}
      {viewState === 'carousel' && (
        <div className="w-full h-full flex flex-col justify-center items-center animate-[fadeIn_1s]">
          
          {/* Área do Carousel */}
          <div className="relative w-full">
            <div 
              ref={carouselRef}
              className="carousel-container items-center px-[50vw]"
            >
              {races.map((race, idx) => (
                <div 
                  key={race.id}
                  onClick={() => setActiveIndex(idx)}
                  className={`fantasy-card flex-shrink-0 ${idx === activeIndex ? 'active' : ''}`}
                >
                  <img src={race.image} alt={race.name} />
                  <div className="card-name">{race.name}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de Seleção Central */}
          <div className="mt-8 z-10 text-center">
            <h2 className="text-2xl text-blue-200 font-serif mb-4 h-8">
              {activeRaceInCarousel.name}
            </h2>
            <button 
              onClick={handleSelectRace}
              className="px-12 py-3 bg-gradient-to-r from-blue-900 to-blue-700 border border-blue-400 text-white font-serif tracking-widest uppercase hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,100,255,0.5)]"
            >
              Confirmar Linhagem
            </button>
          </div>
        </div>
      )}

      {/* --- VISUALIZAÇÃO 2: DETALHES & CLASSES --- */}
      {viewState === 'details' && selectedRace && (
        <div className="details-layout">
          
          {/* Coluna da Imagem (Esquerda) */}
          <div className="details-image-col">
            <img src={selectedRace.image} alt={selectedRace.name} />
            {/* Gradiente Overlay para texto sobreposto se necessário */}
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black to-transparent"></div>
            <h1 className="absolute bottom-10 left-10 text-6xl rpg-title drop-shadow-lg z-10">
              {selectedRace.name}
            </h1>
          </div>

          {/* Coluna de Conteúdo (Direita) */}
          <div className="details-content-col custom-scrollbar">
            
            {/* Descrição */}
            <div className="info-panel">
              <p className="text-lg italic leading-relaxed text-gray-300">
                "{selectedRace.description}"
              </p>
            </div>

            {/* Características e Bônus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded border border-white/10">
                <h4 className="text-yellow-500 font-serif mb-2 uppercase text-sm">Características</h4>
                <p className="text-sm text-gray-400">{selectedRace.characteristics}</p>
              </div>
              <div className="bg-white/5 p-4 rounded border border-white/10">
                <h4 className="text-green-400 font-serif mb-2 uppercase text-sm">Bônus Racial</h4>
                <p className="text-sm font-mono text-gray-300">
                  {JSON.stringify(selectedRace.racial_bonus).replace(/["{}]/g, '').replace(/,/g, ', ')}
                </p>
              </div>
            </div>

            {/* Seletor de Gênero (Importante para Viera) */}
            <div className="mb-8 flex items-center gap-4 border-b border-gray-700 pb-4">
              <span className="text-gray-500 uppercase text-xs font-bold tracking-widest">Gênero</span>
              <button 
                onClick={() => { setSelectedGender('female'); setSelectedClass(null); }}
                className={`px-4 py-1 text-sm border transition-all ${selectedGender === 'female' ? 'border-pink-500 text-pink-300 bg-pink-900/20' : 'border-gray-600 text-gray-500'}`}
              >
                Feminino
              </button>
              <button 
                onClick={() => { setSelectedGender('male'); setSelectedClass(null); }}
                className={`px-4 py-1 text-sm border transition-all ${selectedGender === 'male' ? 'border-blue-500 text-blue-300 bg-blue-900/20' : 'border-gray-600 text-gray-500'}`}
              >
                Masculino
              </button>
            </div>

            {/* Seleção de Classe Gamificada */}
            <div className="animate-[fadeIn_0.5s_0.3s_both]">
              <h3 className="text-2xl font-serif text-white mb-2">Escolha sua Vocação</h3>
              <p className="text-xs text-gray-400 mb-4">Selecione uma classe inicial para ver seus atributos.</p>
              
              <div className="class-grid">
                {getAvailableClasses().map((clsName) => {
                  const details = getClassDetails(clsName);
                  return (
                    <div 
                      key={clsName}
                      onClick={() => setSelectedClass(clsName)}
                      className={`class-btn ${selectedClass === clsName ? 'selected' : ''}`}
                    >
                      <span className="block font-bold text-sm tracking-wider">{clsName}</span>
                      <span className="class-role">{details?.role || 'Básico'}</span>
                    </div>
                  );
                })}
              </div>

              {/* Detalhes da Classe Selecionada */}
              {selectedClass && (
                <div className="mt-6 p-6 bg-blue-900/20 border border-blue-500/30 rounded relative overflow-hidden animate-[fadeIn_0.3s]">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  
                  {(() => {
                    const info = getClassDetails(selectedClass);
                    return info ? (
                      <>
                         <h4 className="text-xl text-blue-300 font-serif mb-2">{info.name}</h4>
                         <p className="text-sm text-gray-300 mb-4">{info.description}</p>
                         
                         {/* Preview de Habilidades */}
                         {info.abilities && info.abilities.length > 0 && (
                           <div>
                             <h5 className="text-xs uppercase text-blue-500 font-bold mb-2">Habilidades Iniciais</h5>
                             <div className="flex flex-wrap gap-2">
                               {info.abilities.slice(0, 3).map((ab, i) => (
                                 <span key={i} className="text-xs bg-black/40 px-2 py-1 text-gray-400 border border-gray-700 rounded">
                                   {ab.name}
                                 </span>
                               ))}
                             </div>
                           </div>
                         )}
                      </>
                    ) : <p>Carregando...</p>
                  })()}
                </div>
              )}
            </div>

            {/* Botão Final */}
            <div className="mt-10 mb-20">
              <button
                disabled={!selectedClass}
                onClick={() => navigate('/vtt')}
                className={`w-full py-4 uppercase tracking-[4px] font-bold transition-all duration-500 border
                  ${selectedClass 
                    ? 'bg-white text-black border-white hover:bg-gray-200 cursor-pointer shadow-[0_0_30px_white]' 
                    : 'bg-transparent text-gray-600 border-gray-800 cursor-not-allowed'
                  }`}
              >
                {selectedClass ? 'Despertar' : 'Aguardando Seleção...'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreation;