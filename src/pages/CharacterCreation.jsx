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
  // viewState agora pode ser: 'carousel', 'details' ou 'identity'
  const [viewState, setViewState] = useState('carousel'); 
  const [activeIndex, setActiveIndex] = useState(0); 
  const [selectedRace, setSelectedRace] = useState(null); 
  const [selectedGender, setSelectedGender] = useState('female');
  const [selectedClass, setSelectedClass] = useState(null);

  // Estado do nome
  const [charName, setCharName] = useState('');

  const races = racesData.races;

  // 1. Limpeza de Audio (Agressiva)
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

  // --- LÓGICA DE DADOS E HELPER ---
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

  // --- HANDLERS ---
  const confirmRaceSelection = () => {
    setSelectedRace(races[activeIndex]);
    setSelectedClass(null);
    setViewState('details');
  };

  const handleBack = () => {
    if (viewState === 'identity') {
      setViewState('details');
    } else if (viewState === 'details') {
      setViewState('carousel');
      setSelectedClass(null);
    }
  };

  // Aqui é a mudança: em vez de abrir modal, muda a TELA inteira
  const goToNameScreen = () => {
    if (selectedClass) {
      setViewState('identity');
    }
  };

  const handleFinalizeCreation = () => {
    console.log(`Personagem Criado: ${charName} - ${selectedRace.name} - ${selectedClass}`);
    navigate('/vtt'); // Vai para a próxima tela
  };

  const activeRace = races[activeIndex];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      
      {/* CSS Animado Inline para o Scale-In */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        
        .parchment-texture {
          background-color: #f3e5ce;
          background-image: url("https://www.transparenttextures.com/patterns/aged-paper.png");
          /* Fallback simples se a url falhar */
          box-shadow: inset 0 0 80px rgba(60, 40, 10, 0.2);
        }
      `}</style>

      {/* --- BACKGROUND ANIMADO (ÉTER) --- */}
      {/* Ele fica sempre visível, girando no fundo */}
      <div className="ether-container">
        <div className="ether-vortex"></div>
        <div className="ether-particles"></div>
      </div>

      {/* --- CABEÇALHO (Visível apenas nas fases de seleção) --- */}
      {viewState !== 'identity' && (
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
      )}

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
        <div className="details-grid animate-[fadeIn_0.5s]">
          <div className="char-portrait-container">
            <img src={selectedRace.image} alt={selectedRace.name} className="char-portrait" />
          </div>
          <div className="info-scroll-area custom-scrollbar">
            {/* Lore */}
            <div className="glass-panel mt-8 border-l-4 border-yellow-600">
              <h3 className="section-header !border-none !mb-2 text-yellow-500">Descrição</h3>
              <p className="description-text">"{selectedRace.description}"</p>
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                 <div><span className="text-[10px] uppercase text-blue-400 font-bold">Características</span><p className="text-xs text-gray-400 mt-1">{selectedRace.characteristics}</p></div>
                 <div><span className="text-[10px] uppercase text-green-400 font-bold">Bônus Racial</span><div className="text-xs text-gray-300 font-mono mt-1">{renderBonuses(selectedRace.racial_bonus)}</div></div>
              </div>
            </div>

            {/* Gênero */}
            <div className="glass-panel flex flex-col gap-2">
              <span className="text-xs text-gray-400 uppercase font-bold tracking-widest">Gênero</span>
              <div className="flex w-full">
                <div onClick={() => { setSelectedGender('female'); setSelectedClass(null); }} className={`gender-option ${selectedGender === 'female' ? 'active' : ''}`}>Feminino</div>
                <div onClick={() => { setSelectedGender('male'); setSelectedClass(null); }} className={`gender-option ${selectedGender === 'male' ? 'active' : ''}`}>Masculino</div>
              </div>
            </div>

            {/* Classes */}
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

            {/* BOTÃO PARA IR PARA TELA DE NOME */}
            <div className="mt-8 mb-10">
               <button disabled={!selectedClass} onClick={goToNameScreen} className="confirm-btn">
                 {selectedClass ? 'Confirmar Vocação' : 'Selecione uma Vocação'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- FASE 3: TELA DE IDENTIDADE (STYLE RPG HIGH-END) --- */}
      {viewState === 'identity' && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-4">
           
           {/* Fundo de Blur para focar na caixa */}
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md -z-10 transition-all duration-1000"></div>

           {/* CAIXA DE IDENTIDADE (Estilo Pergaminho Dourado) */}
           <div className="animate-scale-in relative max-w-lg w-full">
             
             {/* Borda Externa Dourada Brilhante */}
             <div className="rounded-xl p-[3px] bg-gradient-to-b from-yellow-300 via-yellow-600 to-yellow-800 shadow-[0_0_50px_rgba(234,179,8,0.6)]">
               
               {/* Borda Interna Escura (Moldura) */}
               <div className="bg-[#1a120b] p-2 rounded-lg">
                 
                 {/* Papel/Pergaminho Interno */}
                 <div className="parchment-texture rounded border border-[#854d0e] p-8 flex flex-col items-center text-center relative overflow-hidden">
                    
                    {/* Header da Caixa */}
                    <div className="mb-8 z-10 w-full">
                      <h2 className="text-4xl font-serif font-bold text-[#5c2e08] uppercase tracking-widest drop-shadow-sm mb-2" style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.5)' }}>
                        Identidade
                      </h2>
                      <div className="h-[2px] w-32 bg-[#854d0e] mx-auto opacity-50 mb-2"></div>
                      <p className="text-[#854d0e] font-serif italic text-sm font-semibold tracking-wider">
                        Como a história o conhecerá?
                      </p>
                    </div>

                    {/* Input e Botão Row */}
                    <div className="flex w-full gap-0 shadow-lg z-10 transform hover:scale-[1.02] transition-transform duration-300">
                       <input 
                         type="text" 
                         value={charName}
                         onChange={(e) => setCharName(e.target.value)}
                         placeholder="Nome do Aventureiro"
                         className="flex-1 bg-[#fff8ed] border-2 border-[#854d0e] border-r-0 rounded-l-md px-4 py-3 text-lg font-serif text-[#451a03] placeholder-[#b48358] focus:bg-white focus:outline-none transition-colors"
                         autoFocus
                       />
                       <button 
                         onClick={handleFinalizeCreation}
                         disabled={!charName.trim()}
                         className="bg-gradient-to-b from-yellow-400 to-yellow-700 text-[#3f1d06] font-serif font-bold text-xl px-8 border-2 border-[#854d0e] rounded-r-md uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed shadow-[inset_0_2px_5px_rgba(255,255,255,0.4)]"
                       >
                         GO
                       </button>
                    </div>

                    {/* Botão de Cancelar/Voltar (Pequeno X no canto) */}
                    <button 
                      onClick={handleBack}
                      className="absolute top-2 right-3 text-[#854d0e] hover:text-red-700 font-bold text-xl transition-colors z-20"
                      title="Voltar"
                    >
                      ✕
                    </button>

                    {/* Detalhes Decorativos de Cantoneira (CSS Puro) */}
                    <div className="absolute top-1 left-1 w-4 h-4 border-t-4 border-l-4 border-[#854d0e] opacity-60"></div>
                    <div className="absolute top-1 right-1 w-4 h-4 border-t-4 border-r-4 border-[#854d0e] opacity-60"></div>
                    <div className="absolute bottom-1 left-1 w-4 h-4 border-b-4 border-l-4 border-[#854d0e] opacity-60"></div>
                    <div className="absolute bottom-1 right-1 w-4 h-4 border-b-4 border-r-4 border-[#854d0e] opacity-60"></div>

                 </div>
               </div>
             </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default CharacterCreation;