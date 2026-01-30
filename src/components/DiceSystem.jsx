import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from "firebase/firestore";

// Configuração dos tipos de dados
const DICE_TYPES = [
  { type: 'd4', sides: 4, label: 'D4' },
  { type: 'd6', sides: 6, label: 'D6' },
  { type: 'd8', sides: 8, label: 'D8' },
  { type: 'd10', sides: 10, label: 'D10' },
  { type: 'd12', sides: 12, label: 'D12' },
  { type: 'd20', sides: 20, label: 'D20' },
  { type: 'd100', sides: 100, label: 'D100' }
];

export const DiceSelector = ({ sessaoId, playerName, onClose }) => {
  const [counts, setCounts] = useState({ d4:0, d6:0, d8:0, d10:0, d12:0, d20:0, d100:0 });
  const [modifier, setModifier] = useState("");
  const [rolling, setRolling] = useState(false);

  const adjustCount = (type, delta) => {
    setCounts(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + delta)
    }));
  };

  const handleRoll = async () => {
    // Verifica se há dados selecionados
    const totalDice = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalDice === 0) return alert("Selecione pelo menos um dado!");

    setRolling(true);

    // 1. FECHAR IMEDIATAMENTE (Correção Visual)
    onClose(); 

    // 2. Calcular Resultados Locais
    let sumDice = 0;
    let details = [];

    Object.keys(counts).forEach(key => {
        const count = counts[key];
        const sides = parseInt(key.substring(1));
        for(let i=0; i<count; i++) {
            const val = Math.floor(Math.random() * sides) + 1;
            sumDice += val;
            details.push({ die: key, value: val });
        }
    });

    // 3. Processar Modificador (+5, -2, 5)
    let modValue = 0;
    if (modifier) {
        const cleanMod = modifier.replace(/\s/g, '');
        modValue = parseInt(cleanMod);
        if (isNaN(modValue)) modValue = 0;
    }

    const finalTotal = sumDice + modValue;

    // 4. Objeto da Rolagem
    const rollPayload = {
        playerName: playerName,
        rolls: details,
        modifier: modValue,
        total: finalTotal,
        timestamp: Date.now() 
    };

    // 5. Enviar para Firebase em segundo plano
    try {
        const sessionRef = doc(db, "sessoes", sessaoId);
        await updateDoc(sessionRef, {
            latest_roll: rollPayload
        });
    } catch (error) {
        console.error("Erro ao rolar dados:", error);
    }
  };

  return (
    <div className="dice-modal-overlay">
       <div className="dice-selector-box">
          <div className="ds-header">
             <h3>CAIXA DE DADOS</h3>
             <button className="ds-close-btn" onClick={onClose}>✕</button>
          </div>
          
          <div className="ds-grid">
             {DICE_TYPES.map(d => (
                 <div key={d.type} className="die-control">
                     <span className="die-label">{d.label}</span>
                     <div className="die-actions">
                         <button onClick={() => adjustCount(d.type, -1)}>-</button>
                         <span className={`die-count ${counts[d.type] > 0 ? 'active' : ''}`}>{counts[d.type]}</span>
                         <button onClick={() => adjustCount(d.type, 1)}>+</button>
                     </div>
                 </div>
             ))}
          </div>

          <div className="ds-footer">
             <div className="mod-input-group">
                 <label>MODIFICADOR</label>
                 <input 
                    type="text" 
                    placeholder="+0" 
                    value={modifier}
                    onChange={(e) => setModifier(e.target.value)}
                 />
             </div>
             <button className="btn-roll-final" onClick={handleRoll} disabled={rolling}>
                 {rolling ? "..." : "ROLAR DADOS"}
             </button>
          </div>
       </div>
       <style>{`
         .dice-modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 20000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
         /* AUMENTADO A LARGURA PARA 400px PARA CABER O BOTÃO */
         .dice-selector-box { background: #0d0d15; border: 2px solid #ffcc00; padding: 25px; border-radius: 8px; width: 400px; box-shadow: 0 0 30px rgba(255, 204, 0, 0.2); box-sizing: border-box; }
         .ds-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; }
         .ds-header h3 { margin: 0; color: #ffcc00; font-family: 'Cinzel', serif; }
         .ds-close-btn { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; }
         
         .ds-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; }
         .die-control { background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
         .die-label { color: #00f2ff; font-weight: bold; font-family: sans-serif; font-size: 14px; }
         .die-actions { display: flex; align-items: center; gap: 8px; }
         .die-actions button { background: #333; border: 1px solid #555; color: #fff; width: 24px; height: 24px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
         .die-actions button:hover { background: #ffcc00; color: #000; border-color: #ffcc00; }
         .die-count { width: 20px; text-align: center; font-weight: bold; color: #555; }
         .die-count.active { color: #fff; text-shadow: 0 0 5px #fff; }

         /* AJUSTE DO FOOTER PARA O BOTÃO NÃO SAIR */
         .ds-footer { display: flex; gap: 15px; align-items: flex-end; width: 100%; }
         .mod-input-group { width: 100px; display: flex; flex-direction: column; }
         .mod-input-group label { font-size: 10px; color: #aaa; margin-bottom: 4px; font-weight: bold; }
         .mod-input-group input { width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 10px; border-radius: 4px; text-align: center; font-weight: bold; font-size: 16px; outline: none; box-sizing: border-box; }
         .mod-input-group input:focus { border-color: #ffcc00; }
         
         .btn-roll-final { flex: 1; background: linear-gradient(45deg, #ffcc00, #d4a000); border: none; padding: 0 20px; color: #000; font-weight: bold; border-radius: 4px; cursor: pointer; font-family: 'Cinzel', serif; font-size: 16px; height: 44px; display: flex; align-items: center; justify-content: center; white-space: nowrap; }
         .btn-roll-final:hover { filter: brightness(1.2); box-shadow: 0 0 15px #ffcc00; }
         .btn-roll-final:disabled { opacity: 0.5; cursor: not-allowed; }
       `}</style>
    </div>
  );
};

export const DiceResult = ({ rollData, onClose }) => {
  if (!rollData) return null;

  return (
    <div className="dice-result-overlay">
       <div className="dice-result-content fade-in-scale">
          <div className="dr-title">
             <span className="dr-player-name">{rollData.playerName}</span>
             <span className="dr-action">ROLOU OS DADOS</span>
          </div>

          <div className="dr-dice-list">
             {rollData.rolls.map((r, idx) => (
                <div key={idx} className={`dr-die die-${r.die}`}>
                   <span className="die-icon-bg">⬡</span>
                   <span className="die-val">{r.value}</span>
                   <span className="die-type">{r.die}</span>
                </div>
             ))}
          </div>
          
          <div className="dr-calculation">
             <span className="calc-label">SOMA: {rollData.rolls.reduce((a,b)=>a+b.value,0)}</span>
             <span className="calc-mod">MOD: {rollData.modifier >= 0 ? `+${rollData.modifier}` : rollData.modifier}</span>
          </div>

          <div className="dr-total">
             <span className="total-label">RESULTADO</span>
             <span className="total-value">{rollData.total}</span>
          </div>

          <button className="dr-close-btn" onClick={onClose}>FECHAR</button>
       </div>
       <style>{`
         .dice-result-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 19000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px); }
         .dice-result-content { text-align: center; color: #fff; max-width: 80%; }
         .fade-in-scale { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
         @keyframes popIn { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
         
         .dr-title { margin-bottom: 30px; }
         .dr-player-name { display: block; font-size: 32px; color: #ffcc00; font-family: 'Cinzel', serif; font-weight: bold; text-shadow: 0 0 10px #ffcc00; }
         .dr-action { font-size: 14px; color: #aaa; letter-spacing: 2px; }

         .dr-dice-list { display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-bottom: 30px; }
         .dr-die { position: relative; width: 80px; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
         .die-icon-bg { font-size: 80px; position: absolute; color: rgba(255,255,255,0.1); z-index: 0; }
         .die-val { font-size: 36px; font-weight: bold; color: #fff; z-index: 1; text-shadow: 0 2px 4px #000; }
         .die-type { font-size: 12px; color: #00f2ff; z-index: 1; margin-top: -5px; text-transform: uppercase; font-weight: bold; }
         
         .die-d20 .die-val { color: #ffcc00; } /* Destaque pro D20 */

         .dr-calculation { font-family: monospace; color: #aaa; font-size: 18px; margin-bottom: 10px; display: flex; gap: 20px; justify-content: center; }
         
         .dr-total { margin-bottom: 30px; background: linear-gradient(90deg, transparent, rgba(255,204,0,0.2), transparent); padding: 10px; }
         .total-label { display: block; font-size: 14px; color: #ffcc00; letter-spacing: 3px; margin-bottom: 5px; }
         .total-value { font-size: 64px; font-weight: bold; color: #fff; line-height: 1; text-shadow: 0 0 20px #ffcc00; }

         .dr-close-btn { background: transparent; border: 2px solid #555; color: #aaa; padding: 10px 40px; cursor: pointer; border-radius: 30px; font-weight: bold; transition: 0.3s; pointer-events: auto; }
         .dr-close-btn:hover { border-color: #ffcc00; color: #ffcc00; background: rgba(255,255,255,0.1); }
       `}</style>
    </div>
  );
};