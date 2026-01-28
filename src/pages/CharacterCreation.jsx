import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import racesData from '../data/races.json';
import classesData from '../data/classes.json';
// Import da imagem de fundo (Certifique-se que o arquivo existe em src/assets/)
import bgCharacter from '../assets/fundo-character.jpg';

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

  // Função para Scroll com Mouse (Wheel) no Carousel
  const handleWheelScroll = (e) => {
    if (carouselRef.current) {
      carouselRef.current.scrollLeft += e.deltaY;
    }
  };

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
    <div 
      className="relative w-full h-screen text-white overflow-hidden font-sans"
      style={{
        backgroundImage: `url(${bgCharacter})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Overlay Escuro para legibilidade */}
      <div className="absolute inset-0 bg-black/60 pointer-events-none"></div>

      {/* Background Éter (Camada extra) */}
      <div className="ether-bg opacity-50"><div className="ether-particles"></div></div>

      {/* --- CABEÇALHO --- */}
      <div className="absolute top-0 w-full p-8 z-50 flex justify-between items-center pointer-events-none">
        <div>
          <h1 className="rpg-title text-3xl md:text-5xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Gênese da Alma</h1>
          <p className="text-gray-300 text-sm tracking-widest mt-2 uppercase font-bold drop-shadow-md">
            {viewState === 'carousel' ? 'Selecione sua Linhagem' : `Caminho do ${selectedRace?.name}`}
          </p>
        </div>
        
        {viewState === 'details' && (
          <button 
            onClick={handleBack}
            className="pointer-events-auto px-6 py-2 border border-gray-400 text-gray-200 hover:text-white hover:border-white transition-all rounded bg-blue-900/60 backdrop-blur-sm shadow-lg font-serif"
          >
            ← Voltar à Seleção
          </button>
        )}
      </div>

      {/* --- VISUALIZAÇÃO 1: CAROUSEL --- */}
      {viewState === 'carousel' && (
        <div className="w-full h-full flex flex-col justify-center items-center animate-[fadeIn_1s] relative z-10">
          
          {/* Área do Carousel */}
          <div className="relative w-full">
            <div 
              ref={carouselRef}
              onWheel={handleWheelScroll} // Scroll com Mouse
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
            <h2 className="text-3xl text-yellow-200 font-serif mb-4 h-8 drop-shadow-lg tracking-widest uppercase">
              {activeRaceInCarousel.name}
            </h2>
            <button 
              onClick={handleSelectRace}
              className="px-12 py-3 bg-gradient-to-b from-blue-800 to-blue-950 border-2 border-yellow-600 text-white font-serif tracking-widest uppercase hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,100,255,0.5)] rounded-sm"
            >
              Confirmar Linhagem
            </button>
          </div>
        </div>
      )}

      {/* --- VISUALIZAÇÃO 2: DETALHES & CLASSES --- */}
      {viewState === 'details' && selectedRace && (
        <div className="details-layout relative z-10">
          
          {/* Coluna da Imagem (Esquerda) */}
          <div className="details-image-col hidden md:block">
            <img src={selectedRace.image} alt={selectedRace.name} />
            {/* Gradiente Overlay */}
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
            <h1 className="absolute bottom-10 left-10 text-6xl rpg-title drop-shadow-lg z-10">
              {selectedRace.name}
            </h1>
          </div>

          {/* Coluna de Conteúdo (Direita) */}
          <div className="details-content-col custom-scrollbar bg-black/40 backdrop-blur-md">
            
            {/* Painel de Descrição Racial */}
            <div className="info-panel border-l-4 border-yellow-600 bg-gradient-to-r from-blue-950/80 to-transparent p-6 mb-6 rounded-r-lg shadow-lg">
              <h3 className="text-yellow-500 font-serif uppercase tracking-widest text-sm mb-2">Descrição</h3>
              <p className="text-lg italic leading-relaxed text-gray-200 font-serif">
                "{selectedRace.description}"
              </p>
            </div>

            {/* Características e Bônus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-900/40 p-4 rounded border border-blue-500/30 shadow-inner">
                <h4 className="text-blue-300 font-serif mb-2 uppercase text-xs tracking-wider">Características</h4>
                <p className="text-sm text-gray-300 leading-snug">{selectedRace.characteristics}</p>
              </div>
              <div className="bg-blue-900/40 p-4 rounded border border-blue-500/30 shadow-inner">
                <h4 className="text-green-400 font-serif mb-2 uppercase text-xs tracking-wider">Bônus Racial</h4>
                <div className="text-sm font-mono text-gray-200">
                  {Object.entries(selectedRace.racial_bonus).map(([key, val]) => (
                     <div key={key} className="flex justify-between border-b border-white/10 py-1">
                       <span className="uppercase text-gray-400">{key.replace(/_/g, ' ')}:</span>
                       <span className="font-bold text-yellow-200">{typeof val === 'object' ? JSON.stringify(val).replace(/["{}]/g,'') : val}</span>
                     </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Seletor de Gênero */}
            <div className="mb-8 flex items-center gap-4 border-b border-gray-700 pb-4">
              <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Gênero:</span>
              <button 
                onClick={() => { setSelectedGender('female'); setSelectedClass(null); }}
                className={`px-4 py-1 text-sm border rounded transition-all font-serif ${selectedGender === 'female' ? 'border-pink-500 text-pink-200 bg-pink-900/40 shadow-[0_0_10px_rgba(236,72,153,0.3)]' : 'border-gray-600 text-gray-500 hover:border-gray-400'}`}
              >
                Feminino
              </button>
              <button 
                onClick={() => { setSelectedGender('male'); setSelectedClass(null); }}
                className={`px-4 py-1 text-sm border rounded transition-all font-serif ${selectedGender === 'male' ? 'border-blue-500 text-blue-200 bg-blue-900/40 shadow-[0_0_10px_rgba(59,130,246,0.3)]' : 'border-gray-600 text-gray-500 hover:border-gray-400'}`}
              >
                Masculino
              </button>
            </div>

            {/* Seleção de Classe Gamificada */}
            <div className="animate-[fadeIn_0.5s_0.3s_both]">
              <h3 className="text-2xl font-serif text-white mb-2 border-b border-yellow-600/50 inline-block pb-1">Escolha sua Vocação</h3>
              
              <div className="class-grid mt-4">
                {getAvailableClasses().map((clsName) => {
                  const details = getClassDetails(clsName);
                  const isSelected = selectedClass === clsName;
                  return (
                    <button 
                      key={clsName}
                      onClick={() => setSelectedClass(clsName)}
                      className={`
                        class-btn relative overflow-hidden transition-all duration-300 rounded-lg border
                        ${isSelected 
                          ? 'bg-gradient-to-br from-blue-800 to-blue-900 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105' 
                          : 'bg-black/40 border-gray-600 hover:border-gray-400 hover:bg-black/60'
                        }
                      `}
                    >
                      <span className={`block font-serif font-bold text-sm tracking-wider uppercase ${isSelected ? 'text-yellow-200' : 'text-gray-300'}`}>
                        {clsName}
                      </span>
                      <span className="class-role text-[10px] text-gray-500 mt-1 uppercase block">
                        {details?.role || 'Básico'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Painel Completo da Classe Selecionada (Dynamico e Arredondado) */}
              {selectedClass && (() => {
                const info = getClassDetails(selectedClass);
                return info ? (
                  <div className="mt-8 bg-black/60 border border-blue-500/50 rounded-xl p-6 shadow-2xl animate-[fadeIn_0.4s] backdrop-blur-md relative">
                    {/* Header da Classe */}
                    <div className="flex justify-between items-end border-b border-blue-500/30 pb-4 mb-4">
                       <div>
                         <h4 className="text-3xl font-serif text-yellow-100 drop-shadow-md">{info.name}</h4>
                         <span className="text-xs uppercase tracking-widest text-blue-400 font-bold">{info.type} // {info.role}</span>
                       </div>
                       <div className="text-right">
                         <span className="text-[10px] text-gray-500 uppercase block">Requisitos</span>
                         <span className="text-xs text-red-300">{info.requirements?.length ? info.requirements.join(', ') : 'Nenhum'}</span>
                       </div>
                    </div>

                    {/* Descrição e Bônus */}
                    <p className="text-sm text-gray-300 italic mb-6 leading-relaxed">"{info.description}"</p>
                    
                    <div className="flex gap-4 mb-6">
                       <div className="bg-blue-950/50 px-4 py-2 rounded-lg border border-blue-500/20">
                          <span className="text-xs text-blue-300 uppercase block font-bold">Bônus de Classe</span>
                          <span className="text-sm font-mono text-white">
                             {JSON.stringify(info.bonus_class).replace(/["{}]/g, '').replace(/,/g, ' | ')}
                          </span>
                       </div>
                    </div>

                    {/* Habilidades (Lista Completa) */}
                    <div>
                      <h5 className="text-sm uppercase text-yellow-500 font-bold mb-3 tracking-wider">Habilidades Disponíveis</h5>
                      <div className="grid grid-cols-1 gap-3">
                        {info.abilities?.map((ab, i) => (
                          <div key={i} className="flex flex-col bg-white/5 p-3 rounded-lg border border-white/5 hover:border-yellow-500/30 transition-colors">
                            <div className="flex justify-between items-center mb-1">
                              <strong className="text-sm text-white font-serif">{ab.name}</strong>
                              <div className="flex gap-2">
                                <span className="text-[10px] bg-blue-900 px-2 rounded text-blue-200 border border-blue-700">{ab.type}</span>
                                <span className="text-[10px] bg-gray-800 px-2 rounded text-gray-300 border border-gray-600">{ab.cost}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400">{ab.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : <div className="text-center p-4">Carregando dados da classe...</div>;
              })()}
            </div>

            {/* Botão Final (Estilo FFT High-End) */}
            <div className="mt-12 mb-20">
              <button
                disabled={!selectedClass}
                onClick={() => navigate('/vtt')}
                className={`w-full py-4 uppercase tracking-[4px] font-bold font-serif transition-all duration-500 border rounded-lg
                  ${selectedClass 
                    ? 'bg-gradient-to-r from-yellow-700 to-yellow-600 border-yellow-300 text-white shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:scale-[1.02] hover:brightness-110 cursor-pointer' 
                    : 'bg-gray-900/50 border-gray-700 text-gray-600 cursor-not-allowed'
                  }`}
              >
                {selectedClass ? '◆ Despertar Herói ◆' : 'Selecione uma Vocação'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCreation;