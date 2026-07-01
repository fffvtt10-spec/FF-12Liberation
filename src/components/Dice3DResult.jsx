import React, { useEffect, useId, useRef, useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { isRollComplete } from '../utils/dismissedRolls';

const DICE_BOX_CONFIG = {
  assetPath: '/assets/dice-box-threejs/',
  sounds: false,
  shadows: false,
  theme_surface: 'green-felt',
  theme_colorset: 'white',
  theme_material: 'plastic',
  strength: 1.2,
  onRollComplete: () => {},
};

/** Lista de dados a partir de counts ({ d20: 1 }) ou rolls existentes. */
export function buildRollList(rolls, diceCounts) {
  if (rolls?.length) {
    return rolls.map((r) => ({ die: r.die }));
  }
  if (!diceCounts) return [];

  const list = [];
  Object.keys(diceCounts).forEach((key) => {
    const count = diceCounts[key] || 0;
    for (let i = 0; i < count; i += 1) {
      list.push({ die: key });
    }
  });
  return list;
}

/** Notação simples: "1d20+2d6" */
export function buildPlainNotation(rollList) {
  if (!rollList?.length) return '';

  const segments = [];
  let i = 0;

  while (i < rollList.length) {
    const die = rollList[i].die;
    let count = 0;
    while (i < rollList.length && rollList[i].die === die) {
      count += 1;
      i += 1;
    }
    segments.push(`${count}${die}`);
  }

  return segments.join('+');
}

/**
 * Notação determinística para replay sincronizado (threejs).
 * Ex.: [{d20,17}] → "1d20@17"
 */
export function buildDeterministicNotation(rolls) {
  if (!rolls?.length) return '';

  const segments = [];
  const values = [];
  let i = 0;

  while (i < rolls.length) {
    const die = rolls[i].die;
    const batch = [];
    while (i < rolls.length && rolls[i].die === die) {
      batch.push(rolls[i].value);
      i += 1;
    }
    segments.push(`${batch.length}d${die.substring(1)}`);
    values.push(...batch);
  }

  return `${segments.join('+')}@${values.join(',')}`;
}

function sidesToDieType(sides) {
  const n = typeof sides === 'number' ? sides : parseInt(String(sides).replace(/\D/g, ''), 10);
  if (n === 100) return 'd100';
  return `d${n}`;
}

/** Converte retorno do dice-box-threejs para o formato do card. */
export function mapThreeJsResultsToRollData(results, rollData) {
  const rolls = [];

  if (results?.sets) {
    results.sets.forEach((set) => {
      const die = set.type || sidesToDieType(set.sides);
      (set.rolls || []).forEach((r) => {
        rolls.push({ die, value: r.value });
      });
    });
  } else if (Array.isArray(results)) {
    results.forEach((r) => {
      rolls.push({
        die: r.type || sidesToDieType(r.sides),
        value: r.value,
      });
    });
  }

  const modifier = rollData.modifier || 0;
  const sum = rolls.reduce((acc, r) => acc + r.value, 0);

  return {
    ...rollData,
    rolls,
    total: sum + modifier,
    status: 'complete',
  };
}

function DiceResultCard({ rollData, onClose, compact = false }) {
  return (
    <div className={`dice-result-content fade-in-scale ${compact ? 'dice-result-compact' : ''}`.trim()}>
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
        <span className="calc-label">SOMA: {rollData.rolls.reduce((a, b) => a + b.value, 0)}</span>
        <span className="calc-mod">
          MOD: {rollData.modifier >= 0 ? `+${rollData.modifier}` : rollData.modifier}
        </span>
      </div>

      <div className="dr-total">
        <span className="total-label">RESULTADO</span>
        <span className="total-value">{rollData.total}</span>
      </div>

      <button type="button" className="dr-close-btn" onClick={onClose}>
        FECHAR
      </button>
    </div>
  );
}

export const Dice3DResult = ({ rollData, onClose, sessaoId, isRoller = false }) => {
  const reactId = useId().replace(/:/g, '');
  const containerId = `dice-3d-${reactId}`;
  const boxRef = useRef(null);
  const closingRef = useRef(false);
  const rollId = rollData?.id || rollData?.timestamp;

  const isStoredComplete = isRollComplete(rollData);
  const shouldReplay = isStoredComplete;

  const [phase, setPhase] = useState('rolling');
  const [displayData, setDisplayData] = useState(null);

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose();
  };

  useEffect(() => {
    if (!rollData) return undefined;

    const rollId = rollData.id || rollData.timestamp;
    let cancelled = false;
    closingRef.current = false;

    const runRoll = async () => {
      setPhase('rolling');

      const rollList = buildRollList(rollData.rolls, rollData.diceCounts);
      const notation = shouldReplay
        ? buildDeterministicNotation(rollData.rolls)
        : buildPlainNotation(rollList);

      if (!notation) {
        if (!cancelled) {
          setDisplayData(rollData);
          setPhase('result');
        }
        return;
      }

      try {
        const container = document.getElementById(containerId);
        if (!container || cancelled) return;

        const DiceBox = (await import('@3d-dice/dice-box-threejs')).default;
        const box = new DiceBox(`#${containerId}`, DICE_BOX_CONFIG);
        boxRef.current = box;

        await box.initialize();
        if (cancelled) return;

        const results = await box.roll(notation);
        if (cancelled) return;

        let resolved;
        if (isStoredComplete) {
          resolved = rollData;
        } else {
          resolved = mapThreeJsResultsToRollData(results, rollData);

          if (sessaoId && isRoller) {
            try {
              await updateDoc(doc(db, 'sessoes', sessaoId), {
                latest_roll: { ...resolved, status: 'complete' },
              });
            } catch (error) {
              console.error('Erro ao sincronizar rolagem:', error);
            }
          }
        }

        setDisplayData(resolved);
        setPhase('result');
      } catch (error) {
        console.error('Erro na animação 3D de dados:', error);
        if (!cancelled) {
          setDisplayData(rollData.rolls?.length ? rollData : null);
          setPhase('fallback');
        }
      }
    };

    runRoll();

    return () => {
      cancelled = true;
      boxRef.current = null;
    };
  }, [rollId, shouldReplay, isRoller, sessaoId, containerId, isStoredComplete]);

  if (!rollData) return null;

  const cardData = displayData || (phase === 'fallback' ? rollData : null);
  const showResultCard = (phase === 'result' || phase === 'fallback') && cardData?.rolls?.length;
  const showStage = phase !== 'fallback';

  return (
    <div className="dice-result-overlay dice-3d-overlay">
      <div className="dice-3d-panel">
        {showStage && (
          <div className={`dice-3d-stage ${showResultCard ? 'is-settled' : ''}`}>
            <div id={containerId} className="dice-3d-canvas-host" />
            {phase === 'rolling' && (
              <div className="dice-3d-rolling-label">
                <span className="dr-player-name">{rollData.playerName}</span>
                <span className="dr-action">ROLOU OS DADOS</span>
              </div>
            )}
          </div>
        )}

        {showResultCard && (
          <div className="dice-result-layer">
            <DiceResultCard
              rollData={cardData}
              onClose={handleClose}
              compact={showStage}
            />
          </div>
        )}
      </div>

      <style>{`
        .dice-3d-overlay {
          position: fixed;
          inset: 0;
          z-index: 19000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(12px, 3vw, 24px);
          box-sizing: border-box;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(6px);
        }

        .dice-3d-panel {
          position: relative;
          width: min(820px, 94vw);
          height: min(640px, 88vh);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dice-3d-stage {
          position: absolute;
          inset: 0;
          border: 2px solid rgba(255, 204, 0, 0.35);
          border-radius: 14px;
          overflow: hidden;
          background: radial-gradient(ellipse at center, rgba(255, 204, 0, 0.08) 0%, #0d0d15 70%);
          box-shadow: 0 0 40px rgba(255, 204, 0, 0.15);
          transition: opacity 0.35s ease, transform 0.35s ease;
        }

        .dice-3d-stage.is-settled {
          opacity: 0.22;
          transform: scale(0.96);
          pointer-events: none;
        }

        .dice-3d-canvas-host {
          width: 100%;
          height: 100%;
        }

        .dice-3d-canvas-host canvas {
          width: 100% !important;
          height: 100% !important;
          display: block;
        }

        .dice-3d-rolling-label {
          position: absolute;
          top: 16px;
          left: 0;
          right: 0;
          text-align: center;
          pointer-events: none;
          z-index: 2;
        }

        .dice-result-layer {
          position: relative;
          z-index: 5;
          width: 100%;
          max-height: 100%;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          box-sizing: border-box;
        }

        .dice-result-content {
          text-align: center;
          color: #fff;
          width: 100%;
          max-width: min(560px, 100%);
        }

        .dice-result-compact .dr-title { margin-bottom: 16px; }
        .dice-result-compact .dr-dice-list { margin-bottom: 16px; gap: 12px; }
        .dice-result-compact .dr-total { margin-bottom: 16px; }
        .dice-result-compact .total-value { font-size: clamp(40px, 10vw, 56px); }

        .fade-in-scale {
          animation: dicePopIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        @keyframes dicePopIn {
          from { opacity: 0; transform: scale(0.88); }
          to { opacity: 1; transform: scale(1); }
        }

        .dr-title { margin-bottom: 24px; }
        .dr-player-name {
          display: block;
          font-size: clamp(22px, 4vw, 32px);
          color: #ffcc00;
          font-family: 'Cinzel', serif;
          font-weight: bold;
          text-shadow: 0 0 10px #ffcc00;
        }
        .dr-action { font-size: 13px; color: #aaa; letter-spacing: 2px; }

        .dr-dice-list {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }
        .dr-die {
          position: relative;
          width: 72px;
          height: 72px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .die-icon-bg {
          font-size: 72px;
          position: absolute;
          color: rgba(255, 255, 255, 0.1);
          z-index: 0;
        }
        .die-val {
          font-size: 32px;
          font-weight: bold;
          color: #fff;
          z-index: 1;
          text-shadow: 0 2px 4px #000;
        }
        .die-type {
          font-size: 11px;
          color: #00f2ff;
          z-index: 1;
          margin-top: -4px;
          text-transform: uppercase;
          font-weight: bold;
        }
        .die-d20 .die-val { color: #ffcc00; }

        .dr-calculation {
          font-family: monospace;
          color: #aaa;
          font-size: 16px;
          margin-bottom: 8px;
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .dr-total {
          margin-bottom: 20px;
          background: linear-gradient(90deg, transparent, rgba(255, 204, 0, 0.2), transparent);
          padding: 8px;
        }
        .total-label {
          display: block;
          font-size: 13px;
          color: #ffcc00;
          letter-spacing: 3px;
          margin-bottom: 4px;
        }
        .total-value {
          font-size: clamp(48px, 12vw, 64px);
          font-weight: bold;
          color: #fff;
          line-height: 1;
          text-shadow: 0 0 20px #ffcc00;
        }

        .dr-close-btn {
          background: transparent;
          border: 2px solid #555;
          color: #aaa;
          padding: 10px 36px;
          cursor: pointer;
          border-radius: 30px;
          font-weight: bold;
          transition: 0.3s;
        }
        .dr-close-btn:hover {
          border-color: #ffcc00;
          color: #ffcc00;
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .dice-3d-panel {
            height: min(580px, 90vh);
          }
          .dr-die {
            width: 60px;
            height: 60px;
          }
          .die-icon-bg { font-size: 60px; }
          .die-val { font-size: 26px; }
        }

        @media (max-height: 640px) {
          .dice-3d-panel {
            height: 92vh;
          }
          .dice-result-compact .dr-title { margin-bottom: 10px; }
          .dice-result-compact .dr-dice-list { margin-bottom: 10px; }
        }
      `}</style>
    </div>
  );
};
