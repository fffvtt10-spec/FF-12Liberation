import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import racesData from './data/races.json'; // Ajuste o caminho se necessário
import classesData from './data/classes.json'; // Ajuste o caminho se necessário

const CharacterCreation = () => {
  const navigate = useNavigate();
  
  // Estados
  const [introVisible, setIntroVisible] = useState(true);
  const [selectedRace, setSelectedRace] = useState(null);
  const [selectedGender, setSelectedGender] = useState('female'); // Padrão para Viera/Grias
  const [selectedClass, setSelectedClass] = useState(null);
  
  // Dados brutos
  const races = racesData.races;
  
  // Resolve as classes disponíveis baseadas na raça e gênero selecionados
  const getAvailableClasses = () => {
    if (!selectedRace) return [];
    
    // Se base_classes for um array, retorna ele
    if (Array.isArray(selectedRace.base_classes)) {
      return selectedRace.base_classes;
    }
    
    // Se for objeto (como Viera), depende do gênero
    if (typeof selectedRace.base_classes === 'object') {
      if (selectedRace.id === 'viera') {
        return selectedGender === 'female' 
          ? selectedRace.base_classes.female 
          : selectedRace.base_classes.male || selectedRace.base_classes.male_exiled;
      }
    }
    return [];
  };

  const availableClasses = getAvailableClasses();

  const handleConfirm = () => {
    if (selectedRace && selectedClass) {
      console.log("Personagem Criado:", {
        race: selectedRace.name,
        class: selectedClass,
        gender: selectedGender
      });
      // Navegar para o VTT (rota placeholder por enquanto)
      navigate('/vtt'); 
    }
  };

  // Encontra detalhes da classe selecionada no JSON de classes
  const getClassDetails = (className) => {
    return classesData.classes.find(c => c.name === className) || { description: "Detalhes não encontrados." };
  };

  return (
    <div className="relative w-full h-screen overflow-hidden font-sans text-white">
      {/* Background Éter */}
      <div className="ether-bg">
        <div className="ether-particles"></div>
      </div>

      {/* Tela de Intro com Blur */}
      <div 
        className={`intro-blur ${!introVisible ? 'hidden' : ''}`} 
        onClick={() => setIntroVisible(false)}
      >
        <div className="text-center">
          <h1 className="press-start-text mb-4">Crie seu Destino</h1>
          <p className="text-blue-200 text-sm animate-bounce">Toque para iniciar</p>
        </div>
      </div>

      {/* Conteúdo Principal (Só aparece/interage quando o blur sai) */}
      <div className={`relative z-10 w-full h-full p-4 md:p-8 flex flex-col transition-opacity duration-1000 ${introVisible ? 'opacity-0' : 'opacity-100'}`}>
        
        {/* Cabeçalho */}
        <header className="fft-window mb-6 flex justify-between items-center bg-opacity-90">
          <div>
            <h2 className="text-xl font-bold text-yellow-300 uppercase tracking-widest">Criação de Personagem</h2>
            <p className="text-xs text-gray-300">Escolha sua linhagem e vocação</p>
          </div>
          {selectedRace && (
             <div className="text-right">
               <span className="text-sm text-blue-300">Raça:</span> <span className="font-bold">{selectedRace.name}</span>
               <span className="mx-2">|</span>
               <span className="text-sm text-blue-300">Classe:</span> <span className="font-bold">{selectedClass || '...'}</span>
             </div>
          )}
        </header>

        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden pb-4">
          
          {/* Coluna 1: Seleção de Raça */}
          <div className="flex-1 fft-window overflow-y-auto custom-scrollbar bg-opacity-90 flex flex-col">
            <h3 className="text-yellow-200 mb-4 border-b border-gray-600 pb-2">1. Escolha a Raça</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {races.map((race) => (
                <div 
                  key={race.id}
                  onClick={() => {
                    setSelectedRace(race);
                    setSelectedClass(null); // Reseta a classe ao mudar a raça
                  }}
                  className={`race-card p-3 rounded flex items-center gap-3 border ${selectedRace?.id === race.id ? 'bg-blue-900 border-yellow-400' : 'bg-transparent border-gray-600 hover:bg-white/10'}`}
                >
                  {/* Avatar Placeholder - usa a prop image do JSON ou fallback */}
                  <div className="w-12 h-12 bg-black border border-gray-400 rounded-full overflow-hidden shrink-0">
                    <img src={race.image} alt={race.name} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{race.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2">{race.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coluna 2: Detalhes e Classe */}
          <div className="flex-[1.5] flex flex-col gap-4">
            
            {/* Detalhes da Raça */}
            <div className="fft-window flex-1 bg-opacity-90 relative">
              {!selectedRace ? (
                <div className="flex items-center justify-center h-full text-gray-500 italic">
                  Selecione uma raça ao lado para ver os detalhes.
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-2xl text-yellow-300 font-serif">{selectedRace.name}</h3>
                    
                    {/* Seletor de Gênero (Aparece para todas, mas crucial para Viera) */}
                    <div className="flex bg-black/30 rounded p-1">
                      <button 
                        onClick={() => { setSelectedGender('female'); setSelectedClass(null); }}
                        className={`px-3 py-1 text-xs rounded ${selectedGender === 'female' ? 'bg-pink-700 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        ♀ Fem
                      </button>
                      <button 
                         onClick={() => { setSelectedGender('male'); setSelectedClass(null); }}
                         className={`px-3 py-1 text-xs rounded ${selectedGender === 'male' ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-white'}`}
                      >
                        ♂ Masc
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 mb-4">
                    <p className="text-sm mb-4 leading-relaxed text-gray-200">{selectedRace.description}</p>
                    
                    <div className="bg-black/20 p-3 rounded mb-4">
                      <h4 className="text-blue-300 text-xs font-bold uppercase mb-1">Características</h4>
                      <p className="text-xs">{selectedRace.characteristics}</p>
                    </div>

                    <div className="bg-black/20 p-3 rounded">
                      <h4 className="text-green-300 text-xs font-bold uppercase mb-1">Bônus Racial</h4>
                      <p className="text-xs font-mono">
                         {/* Renderização simples do objeto de bônus */}
                         {JSON.stringify(selectedRace.racial_bonus).replace(/["{}]/g, '').replace(/,/g, ', ')}
                      </p>
                    </div>
                  </div>

                  {/* Seletor de Classe (Gamificado) */}
                  <div className="border-t border-gray-600 pt-4 mt-auto">
                    <h4 className="text-yellow-200 mb-2 text-sm">2. Classe Inicial</h4>
                    <div className="flex flex-wrap gap-2">
                      {availableClasses.map((clsName) => (
                        <button
                          key={clsName}
                          onClick={() => setSelectedClass(clsName)}
                          className={`fft-button text-xs flex-1 min-w-[100px] ${selectedClass === clsName ? 'ring-2 ring-yellow-400 bg-blue-800' : ''}`}
                        >
                          {clsName}
                        </button>
                      ))}
                    </div>
                    {/* Preview da Classe */}
                    {selectedClass && (
                      <div className="mt-2 text-xs text-blue-200 bg-blue-900/30 p-2 rounded border border-blue-800">
                        <span className="font-bold text-white">Função:</span> {getClassDetails(selectedClass).role || "Básica"} <br/>
                        <span className="italic">{getClassDetails(selectedClass).description}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Confirmação */}
            <button 
              onClick={handleConfirm}
              disabled={!selectedRace || !selectedClass}
              className={`fft-button w-full py-4 text-lg tracking-widest transition-all duration-300 ${(!selectedRace || !selectedClass) ? 'opacity-50 grayscale' : 'hover:scale-[1.02]'}`}
            >
              INICIAR JORNADA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CharacterCreation;