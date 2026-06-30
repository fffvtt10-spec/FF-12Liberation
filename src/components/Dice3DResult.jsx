import React, { useEffect, useRef, useState } from 'react';
import '@3d-dice/dice-box/dist/style.css';

const DICE_CANVAS_ID = 'dice-3d-canvas';

const DICE_BOX_CONFIG = {
  assetPath: '/assets/dice-box/',
  scale: 9,
  throwForce: 9,
  spinForce: 6,
  startingHeight: 12,
  theme: 'default',
  themeColor: '#ffcc00',
  enableShadows: false,
  offscreen: false,
};

let diceBoxInstance = null;
let diceBoxInitPromise = null;

/**
 * Monta notação determinística para o dice-box.
 * Valores após @ são aplicados na ordem em que os dados são processados (esquerda → direita).
 * Ex.: [{d20,17}] → "1d20@17" — todos os clientes veem o mesmo resultado visual.
 */
export function buildNotation(rolls) {
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

async function getDiceBox() {
  if (diceBoxInstance) return diceBoxInstance;

  if (!diceBoxInitPromise) {
    diceBoxInitPromise = (async () => {
      const DiceBox = (await import('@3d-dice/dice-box')).default;
      diceBoxInstance = new DiceBox(`#${DICE_CANVAS_ID}`, DICE_BOX_CONFIG);
      await diceBoxInstance.init();
    })();
  }

  await diceBoxInitPromise;
  return diceBoxInstance;
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

export const Dice3DResult = ({ rollData, onClose }) => {
  const [phase, setPhase] = useState('rolling');
  const rollIdRef = useRef(null);
  const rollingRef = useRef(false);

  const handleClose = async () => {
    if (diceBoxInstance) {
      try {
        await diceBoxInstance.clear();
      } catch (error) {
        console.warn('Erro ao limpar dados 3D:', error);
      }
    }
    onClose();
  };

  useEffect(() => {
    if (!rollData) return undefined;

    const rollId = rollData.id || rollData.timestamp;
    if (rollIdRef.current === rollId || rollingRef.current) return undefined;
    rollIdRef.current = rollId;

    let cancelled = false;

    const runRoll = async () => {
      rollingRef.current = true;
      setPhase('rolling');

      const notation = buildNotation(rollData.rolls || []);
      if (!notation) {
        if (!cancelled) setPhase('result');
        rollingRef.current = false;
        return;
      }

      try {
        const box = await getDiceBox();
        if (cancelled) return;

        await box.clear();
        await box.roll(notation);
        if (!cancelled) setPhase('result');
      } catch (error) {
        console.error('Erro na animação 3D de dados:', error);
        if (!cancelled) setPhase('fallback');
      } finally {
        rollingRef.current = false;
      }
    };

    runRoll();

    return () => {
      cancelled = true;
    };
  }, [rollData]);

  useEffect(() => {
    return () => {
      rollingRef.current = false;
      rollIdRef.current = null;
      if (diceBoxInstance) {
        diceBoxInstance.clear().catch(() => {});
        diceBoxInstance = null;
        diceBoxInitPromise = null;
      }
    };
  }, []);

  if (!rollData) return null;

  const showResultCard = phase === 'result' || phase === 'fallback';
  const showStage = phase !== 'fallback';

  return (
    <div className="dice-result-overlay dice-3d-overlay">
      <div className="dice-3d-panel">
        {showStage && (
          <div className={`dice-3d-stage ${showResultCard ? 'is-settled' : ''}`}>
            <div id={DICE_CANVAS_ID} className="dice-3d-canvas-host" />
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
              rollData={rollData}
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
