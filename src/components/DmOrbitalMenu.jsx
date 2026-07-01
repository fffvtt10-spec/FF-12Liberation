import React, { useMemo } from 'react';

const BUTTON_SIZE = 48;
const MIN_GAP = 12;
const MIN_ARC_SPACING = BUTTON_SIZE + MIN_GAP;

/**
 * Calcula posições dos satélites com arco e raio adaptativos.
 * Acima de 6 itens usa dois anéis concêntricos para evitar sobreposição.
 */
function computeOrbitalLayout(count, comfortable = false) {
  if (count <= 0) return { positions: [] };

  const gapBoost = comfortable ? 6 : 0;
  const spacing = MIN_ARC_SPACING + gapBoost;
  const startAngle = Math.PI * 1.04;

  if (count === 1) {
    return {
      positions: [{ x: -92, y: -16, delay: 0 }],
    };
  }

  const useDualRing = count > 6;

  if (!useDualRing) {
    const radius = Math.min(comfortable ? 200 : 180, 86 + count * (comfortable ? 12 : 10));
    const arcSpan = Math.min(
      Math.PI * (comfortable ? 0.95 : 0.82),
      ((count - 1) * spacing) / radius
    );

    return {
      positions: Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        const angle = startAngle + arcSpan * t;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          delay: i * 38,
        };
      }),
    };
  }

  const innerCount = Math.ceil(count / 2);
  const outerCount = count - innerCount;
  const innerRadius = comfortable ? 108 : 98;
  const outerRadius = comfortable ? 182 : 168;

  const innerArc = Math.min(Math.PI * 0.92, ((innerCount - 1) * spacing) / innerRadius);
  const outerArc = Math.min(Math.PI * 0.78, ((outerCount - 1) * spacing) / outerRadius);
  const outerStart = startAngle + (innerArc - outerArc) / 2;

  const positions = [];

  for (let i = 0; i < innerCount; i += 1) {
    const t = innerCount === 1 ? 0.5 : i / (innerCount - 1);
    const angle = startAngle + innerArc * t;
    positions.push({
      x: Math.cos(angle) * innerRadius,
      y: Math.sin(angle) * innerRadius,
      delay: i * 32,
      ring: 0,
    });
  }

  for (let i = 0; i < outerCount; i += 1) {
    const t = outerCount === 1 ? 0.5 : i / (outerCount - 1);
    const angle = outerStart + outerArc * t;
    positions.push({
      x: Math.cos(angle) * outerRadius,
      y: Math.sin(angle) * outerRadius,
      delay: (innerCount + i) * 32,
      ring: 1,
    });
  }

  return { positions };
}

/**
 * Menu orbital — FAB no canto inferior direito expande os atalhos em arco.
 * @param {boolean} comfortable — mais espaçamento (ideal para jogador em sessão)
 */
export default function DmOrbitalMenu({ open, onToggle, items = [], comfortable = false }) {
  const { positions } = useMemo(
    () => computeOrbitalLayout(items.length, comfortable),
    [items.length, comfortable]
  );

  return (
    <div className={`dm-orbital-menu ${open ? 'is-open' : ''} ${comfortable ? 'is-comfortable' : ''}`}>
      {open && (
        <button
          type="button"
          className="orbital-backdrop"
          aria-label="Fechar menu"
          onClick={() => onToggle(false)}
        />
      )}

      {items.map((item, i) => {
        const pos = positions[i] || { x: 0, y: 0, delay: 0 };

        return (
          <button
            key={item.id}
            type="button"
            className="orbital-satellite"
            title={item.label}
            aria-label={item.label}
            style={{
              '--sat-x': `${pos.x}px`,
              '--sat-y': `${pos.y}px`,
              '--sat-delay': `${pos.delay ?? i * 38}ms`,
              '--sat-z': pos.ring === 1 ? 2 : 1,
            }}
            onClick={() => {
              item.onClick();
              onToggle(false);
            }}
          >
            <span className="orbital-sat-icon">{item.icon}</span>
            {item.badge > 0 && <span className="orbital-sat-badge">{item.badge}</span>}
            <span className="orbital-sat-label">{item.shortLabel || item.label}</span>
          </button>
        );
      })}

      <button
        type="button"
        className="orbital-fab"
        aria-label={open ? 'Fechar ferramentas' : 'Abrir ferramentas'}
        aria-expanded={open}
        onClick={() => onToggle(!open)}
      >
        <span className={`orbital-fab-icon ${open ? 'open' : ''}`}>{open ? '✕' : '✦'}</span>
      </button>

      <style>{`
        .dm-orbital-menu {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 2500;
          width: 56px;
          height: 56px;
          overflow: visible;
          pointer-events: none;
        }
        .dm-orbital-menu.is-open {
          pointer-events: auto;
        }
        .orbital-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          border: none;
          cursor: pointer;
          z-index: -1;
          animation: orbitalFadeIn 0.2s ease;
          pointer-events: auto;
        }
        @keyframes orbitalFadeIn { from { opacity: 0; } to { opacity: 1; } }

        .orbital-fab {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid #ffcc00;
          background: radial-gradient(circle at 30% 30%, #1a1a1a, #000);
          color: #ffcc00;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 24px rgba(255, 204, 0, 0.25), 0 4px 20px rgba(0,0,0,0.6);
          transition: transform 0.25s cubic-bezier(0.2, 2, 0.2, 1), box-shadow 0.25s;
          z-index: 10;
          pointer-events: auto;
        }
        .orbital-fab:hover { transform: scale(1.06); box-shadow: 0 0 32px rgba(255, 204, 0, 0.45); }
        .dm-orbital-menu.is-open .orbital-fab {
          border-color: #fff;
          color: #fff;
          transform: rotate(90deg);
        }
        .orbital-fab-icon {
          font-size: 22px;
          line-height: 1;
          font-family: 'Cinzel', serif;
          transition: transform 0.25s;
        }

        .orbital-satellite {
          position: absolute;
          right: 28px;
          bottom: 28px;
          width: 48px;
          height: 48px;
          margin-right: -24px;
          margin-bottom: -24px;
          border-radius: 50%;
          border: 2px solid #555;
          background: rgba(8, 8, 8, 0.95);
          color: #fff;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transform: translate(0, 0) scale(0);
          opacity: 0;
          pointer-events: none;
          transition:
            transform 0.35s cubic-bezier(0.2, 2, 0.2, 1),
            opacity 0.25s ease,
            border-color 0.2s,
            box-shadow 0.2s;
          transition-delay: var(--sat-delay, 0ms);
          z-index: var(--sat-z, 1);
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        }
        .dm-orbital-menu.is-open .orbital-satellite {
          transform: translate(var(--sat-x), var(--sat-y)) scale(1);
          opacity: 1;
          pointer-events: auto;
        }
        .orbital-satellite:hover,
        .orbital-satellite:focus-visible {
          border-color: #ffcc00;
          color: #ffcc00;
          transform: translate(var(--sat-x), var(--sat-y)) scale(1.06);
          z-index: 20;
          box-shadow: 0 0 18px rgba(255, 204, 0, 0.35), 0 4px 16px rgba(0,0,0,0.5);
        }
        .orbital-satellite:focus-visible {
          outline: 2px solid #ffcc00;
          outline-offset: 2px;
        }
        .orbital-sat-icon {
          font-size: 18px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .orbital-sat-icon svg { width: 20px; height: 20px; }
        .orbital-sat-label {
          position: absolute;
          right: calc(100% + 12px);
          top: 50%;
          transform: translateY(-50%);
          white-space: nowrap;
          background: rgba(0,0,0,0.92);
          border: 1px solid #333;
          color: #ffcc00;
          font-size: 9px;
          font-family: 'Cinzel', serif;
          letter-spacing: 0.5px;
          padding: 4px 8px;
          border-radius: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
          z-index: 30;
        }
        .orbital-satellite:hover .orbital-sat-label,
        .orbital-satellite:focus-visible .orbital-sat-label {
          opacity: 1;
        }
        .orbital-sat-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 50%;
          background: #f44;
          color: #fff;
          font-size: 10px;
          font-weight: bold;
          border: 1px solid #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .dm-orbital-menu.is-comfortable .orbital-satellite {
          width: 46px;
          height: 46px;
          margin-right: -23px;
          margin-bottom: -23px;
        }
      `}</style>
    </div>
  );
}
