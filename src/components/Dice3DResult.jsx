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

const VIEWPORT_MAX_W = 820;
const VIEWPORT_MAX_H = 480;
const VIEWPORT_TOP = '42%';

let diceBoxInstance = null;
let diceBoxInitPromise = null;

export function buildNotation(rolls) {
  const counts = {};
  rolls.forEach((r) => {
    counts[r.die] = (counts[r.die] || 0) + 1;
  });
  return Object.entries(counts).map(([die, qty]) => {
    const sides = die.substring(1);
    return `${qty}d${sides}`;
  });
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

function DiceResultCard({ rollData, onClose, className = '' }) {
  return (
    <div className={`dice-result-content fade-in-scale ${className}`.trim()}>
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

      <button className="dr-close-btn" onClick={onClose}>
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
      if (notation.length === 0) {
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

  return (
    <div className="dice-result-overlay dice-3d-overlay">
      <div className="dice-3d-layout">
        {phase !== 'fallback' && (
          <div className="dice-3d-stage">
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
          <DiceResultCard
            rollData={rollData}
            onClose={handleClose}
            className={phase === 'fallback' ? 'dice-result-fallback' : 'dice-result-over-3d'}
          />
        )}
      </div>

      <style>{`
        .dice-3d-overlay { flex-direction: column; }
        .dice-3d-layout {
          position: relative;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
        }
        .dice-3d-stage {
          position: absolute;
          top: ${VIEWPORT_TOP};
          left: 50%;
          transform: translate(-50%, -50%);
          width: min(${VIEWPORT_MAX_W}px, 92vw);
          height: min(${VIEWPORT_MAX_H}px, 45vh);
          max-width: ${VIEWPORT_MAX_W}px;
          max-height: ${VIEWPORT_MAX_H}px;
          border: 2px solid rgba(255, 204, 0, 0.35);
          border-radius: 12px;
          overflow: hidden;
          background: radial-gradient(ellipse at center, rgba(255, 204, 0, 0.08) 0%, #0d0d15 70%);
          box-shadow: 0 0 40px rgba(255, 204, 0, 0.15);
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
        .dice-result-over-3d {
          position: absolute;
          top: calc(${VIEWPORT_TOP} + min(${VIEWPORT_MAX_H / 2}px, 22.5vh) + 24px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          max-width: min(${VIEWPORT_MAX_W}px, 92vw);
          width: 100%;
        }
        .dice-result-fallback {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          max-width: 80%;
        }

        .dice-result-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, 0.85);
          z-index: 19000;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(5px);
        }
        .dice-result-content { text-align: center; color: #fff; }
        .fade-in-scale { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }

        .dr-title { margin-bottom: 30px; }
        .dr-player-name {
          display: block;
          font-size: 32px;
          color: #ffcc00;
          font-family: 'Cinzel', serif;
          font-weight: bold;
          text-shadow: 0 0 10px #ffcc00;
        }
        .dr-action { font-size: 14px; color: #aaa; letter-spacing: 2px; }

        .dr-dice-list {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 30px;
        }
        .dr-die {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .die-icon-bg {
          font-size: 80px;
          position: absolute;
          color: rgba(255, 255, 255, 0.1);
          z-index: 0;
        }
        .die-val {
          font-size: 36px;
          font-weight: bold;
          color: #fff;
          z-index: 1;
          text-shadow: 0 2px 4px #000;
        }
        .die-type {
          font-size: 12px;
          color: #00f2ff;
          z-index: 1;
          margin-top: -5px;
          text-transform: uppercase;
          font-weight: bold;
        }
        .die-d20 .die-val { color: #ffcc00; }

        .dr-calculation {
          font-family: monospace;
          color: #aaa;
          font-size: 18px;
          margin-bottom: 10px;
          display: flex;
          gap: 20px;
          justify-content: center;
        }

        .dr-total {
          margin-bottom: 30px;
          background: linear-gradient(90deg, transparent, rgba(255, 204, 0, 0.2), transparent);
          padding: 10px;
        }
        .total-label {
          display: block;
          font-size: 14px;
          color: #ffcc00;
          letter-spacing: 3px;
          margin-bottom: 5px;
        }
        .total-value {
          font-size: 64px;
          font-weight: bold;
          color: #fff;
          line-height: 1;
          text-shadow: 0 0 20px #ffcc00;
        }

        .dr-close-btn {
          background: transparent;
          border: 2px solid #555;
          color: #aaa;
          padding: 10px 40px;
          cursor: pointer;
          border-radius: 30px;
          font-weight: bold;
          transition: 0.3s;
          pointer-events: auto;
        }
        .dr-close-btn:hover {
          border-color: #ffcc00;
          color: #ffcc00;
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .dice-3d-stage {
            width: 92vw;
            height: min(320px, 40vh);
          }
          .dr-player-name { font-size: 24px; }
          .total-value { font-size: 48px; }
        }
      `}</style>
    </div>
  );
};
