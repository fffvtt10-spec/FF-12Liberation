import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import racesData from '../data/races.json';
import classesData from '../data/classes.json';

const CharacterCreation = () => {
  const navigate = useNavigate();
  const carouselRef = useRef(null);

  // --- ESTADOS ---
  // 'selection' = Carrosel | 'details' = Raça no canto esquerdo, info na direita
  const [phase, setPhase] = useState('selection'); 
  const [focusedIndex, setFocusedIndex] = useState(0); // Qual raça está no meio do carrosel
  const [selectedGender, setSelectedGender] = useState('female');
  const [selectedClassId, setSelectedClassId] = useState(null);

  const races = racesData.races;
  const currentRace = races[focusedIndex];

  // --- EFEITOS ---
  
  // 1. Parar músicas residuais (Safety Check)
  useEffect(() => {
    const audioElements = document.querySelectorAll('audio, video');
    audioElements.forEach(el => el.pause());
  }, []);

  // 2. Centralizar scroll do carrosel quando o foco muda
  useEffect(() => {
    if (carouselRef.current && phase === 'selection') {
      const cardWidth = 220; // Largura aproximada do card + margem
      const centerOffset = (window.innerWidth / 2) - (cardWidth / 2);
      carouselRef.current.scrollTo({
        left: (focusedIndex * cardWidth) - centerOffset + (cardWidth / 2),
        behavior: 'smooth'
      });
    }
  }, [focusedIndex, phase]);

  // --- LÓGICA DE DADOS ---

  const getAvailableClasses = () => {
    if (!currentRace) return [];
    if (Array.isArray(currentRace.base_classes)) return currentRace.base_classes;
    if (typeof currentRace.base_classes === 'object') {
      if (currentRace.id === 'viera') {
        return selectedGender === 'female' 
          ? currentRace.base_classes.female 
          : currentRace.base_classes.male || currentRace.base_classes.male_exiled;
      }
    }
    return [];
  };

  const getClassInfo = (className) => {
    return classesData.classes.find(c => c.name === className);
  };

  const handleClassSelect = (className) => {
    setSelectedClassId(className);
  };

  // --- RENDERIZAÇÃO ---

  return (
    <div className="relative w-full h-screen overflow-hidden text-white fighting-bg flex flex-col">
      
      {/* HEADER / TOP BAR */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50 pointer-events-none">
        <div>
          <h1 className="arcade-font text-4xl text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            SELEÇÃO DE PERSONAGEM
          </h1>
          <p className="text-gray-400 text-sm tracking-widest font-bold">NOVA FICHA // {phase === 'selection' ? 'ESCOLHA A RAÇA' : 'CUSTOMIZAÇÃO'}</p>
        </div>
        {phase === 'details' && (
          <button 
            onClick={() => { setPhase('selection'); setSelectedClassId(null); }}
            className="pointer-events-auto bg-red-600/80 hover:bg-red-500 text-white px-6 py-2 skew-x-[-20deg] font-bold border-l-4 border-white transition-all"
          >
            <span className="skew-x-[20deg] block">VOLTAR</span>
          </button>
        )}
      </div>

      {/* --- FASE 1: CARROSEL (FIGHTING GAME STYLE) --- */}
      {phase === 'selection' && (
        <div className="w-full h-full flex flex-col justify-center items-center relative animate-fadeIn">
          
          {/* Container do Scroll Horizontal */}
          <div 
            ref={carouselRef}
            className="flex items-center gap-4 overflow-x-auto no-scrollbar w-full px-[50vw] py-10"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {races.map((race, index) => (
              <div 
                key={race.id}
                onClick={() => setFocusedIndex(index)}
                className={`racer-card relative shrink-0 w-48 h-80 md:w-64 md:h-[450px] cursor-pointer rounded-lg overflow-hidden bg-black ${index === focusedIndex ? 'active' : ''}`}
              >
                {/* Imagem de Fundo do Card */}
                <img 
                  src={race.image} 
                  alt={race.name}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => e.target.style.display='none'}
                />
                
                {/* Nome no Rodapé (Estilo Faixa) */}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-10">
                   <h2 className="arcade-font text-2xl md:text-3xl text-center text-white drop-shadow-md">
                     {race.name.toUpperCase()}
                   </h2>
                </div>
              </div>
            ))}
          </div>

          {/* Botão de Confirmar Seleção (Aparece embaixo do ativo) */}
          <div className="mt-8">
            <button 
              onClick={() => setPhase('details')}
              className="group relative px-12 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-black text-xl tracking-widest skew-x-[-20deg] transition-all hover:scale-110 shadow-[0_0_20px_rgba(255,200,0,0.6)]"
            >
              <div className="skew-x-[20deg]">SELECIONAR</div>
            </button>
          </div>
        </div>
      )}


      {/* --- FASE 2: DETALHES (SPLIT SCREEN) --- */}
      {phase === 'details' && (
        <div className="w-full h-full flex relative">
          
          {/* LADO ESQUERDO: IMAGEM GRANDE (Slant Design) */}
          <div className="hidden md:block w-1/3 h-full relative z-10 slant-container bg-black border-r-4 border-cyan-500 shadow-[10px_0_50px_rgba(0,0,0,0.8)] animate-slideInLeft">
             <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-20"></div>
             <img 
               src={currentRace.image} 
               alt={currentRace.name}
               className="w-full h-full object-cover object-top opacity-90"
             />
             <div className="absolute bottom-10 left-10 z-30">
               <h1 className="arcade-font text-6xl text-white drop-shadow-[4px_4px_0_#000]">{currentRace.name}</h1>
               <div className="h-2 w-32 bg-cyan-500 mt-2"></div>
             </div>
          </div>

          {/* LADO DIREITO: INFORMAÇÕES E CLASSES */}
          <div className="flex-1 h-full overflow-y-auto p-6 md:p-12 md:pl-20 pt-24 animate-slideInRight custom-scrollbar">
            
            <div className="max-w-4xl mx-auto flex flex-col gap-8">
              
              {/* Descrição da Raça */}
              <div className="bg-black/50 p-6 border-l-4 border-yellow-500 backdrop-blur-sm">
                <p className="text-lg text-gray-200 italic leading-relaxed">"{currentRace.description}"</p>
                <div className="mt-4 flex gap-4 text-sm font-mono text-cyan-300">
                   <span>BÔNUS RACIAL: {JSON.stringify(currentRace.racial_bonus).replace(/["{}]/g, '').replace(/,/g, ', ')}</span>
                </div>
              </div>

              {/* Seletor de Gênero (Crucial para Viera) */}
              <div className="flex gap-4 items-center">
                <span className="arcade-font text-gray-400">GÊNERO:</span>
                <button 
                  onClick={() => { setSelectedGender('female'); setSelectedClassId(null); }}
                  className={`px-6 py-2 skew-x-[-15deg] font-bold border border-white/30 transition-all ${selectedGender === 'female' ? 'bg-pink-600 text-white border-pink-400 scale-105' : 'bg-transparent text-gray-500'}`}
                >
                  <span className="skew-x-[15deg]">FEMININO</span>
                </button>
                <button 
                  onClick={() => { setSelectedGender('male'); setSelectedClassId(null); }}
                  className={`px-6 py-2 skew-x-[-15deg] font-bold border border-white/30 transition-all ${selectedGender === 'male' ? 'bg-blue-600 text-white border-blue-400 scale-105' : 'bg-transparent text-gray-500'}`}
                >
                  <span className="skew-x-[15deg]">MASCULINO</span>
                </button>
              </div>

              {/* Seleção de Classe (Cards Interativos) */}
              <div>
                <h3 className="arcade-font text-2xl mb-4 text-white border-b border-gray-700 pb-2">ESCOLHA SUA CLASSE</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {getAvailableClasses().map((clsName) => (
                    <button
                      key={clsName}
                      onClick={() => handleClassSelect(clsName)}
                      className={`relative p-4 h-24 text-left transition-all border overflow-hidden group
                        ${selectedClassId === clsName 
                          ? 'bg-cyan-900 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)] translate-y-[-2px]' 
                          : 'bg-gray-900/80 border-gray-700 hover:border-gray-400 hover:bg-gray-800'
                        }`}
                    >
                      <span className={`block font-bold text-lg uppercase ${selectedClassId === clsName ? 'text-cyan-300' : 'text-gray-300'}`}>
                        {clsName}
                      </span>
                      {/* Efeito de hover barra lateral */}
                      <div className={`absolute top-0 left-0 w-1 h-full transition-all ${selectedClassId === clsName ? 'bg-cyan-400' : 'bg-transparent group-hover:bg-gray-500'}`}></div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Painel de Informações da Classe (Abre ao clicar) */}
              {selectedClassId && (
                <div className="bg-gradient-to-r from-cyan-900/40 to-transparent p-6 border-t-2 border-cyan-500 animate-fadeInUp">
                  {(() => {
                    const clsInfo = getClassInfo(selectedClassId);
                    if (!clsInfo) return <p>Carregando dados...</p>;
                    return (
                      <>
                        <div className="flex justify-between items-end mb-2">
                           <h4 className="text-3xl font-bold text-cyan-200">{clsInfo.name}</h4>
                           <span className="text-sm bg-black px-2 py-1 border border-cyan-800 text-cyan-500">{clsInfo.role || "Classe Básica"}</span>
                        </div>
                        <p className="text-gray-300 mb-4">{clsInfo.description}</p>
                        
                        {/* Habilidades Prévias */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                           {clsInfo.abilities && clsInfo.abilities.slice(0, 4).map((ab, i) => (
                             <div key={i} className="text-xs bg-black/40 p-2 border-l-2 border-yellow-600">
                               <strong className="text-white block">{ab.name}</strong>
                               <span className="text-gray-400">{ab.description}</span>
                             </div>
                           ))}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Botão Final */}
              <div className="pb-10 pt-4">
                 <button
                   disabled={!selectedClassId}
                   onClick={() => navigate('/vtt')}
                   className={`w-full py-5 text-2xl font-black italic tracking-widest uppercase transition-all
                     ${selectedClassId 
                       ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg cursor-pointer' 
                       : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                     }`}
                 >
                   {selectedClassId ? 'CONFIRMAR IDENTIDADE' : 'SELECIONE UMA CLASSE'}
                 </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Animações CSS Inline para garantir que funcionem sem configurar tailwind.config */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
        
        @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideInLeft { animation: slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes slideInRight { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slideInRight { animation: slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards; opacity: 0; }

        @keyframes fadeInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default CharacterCreation;