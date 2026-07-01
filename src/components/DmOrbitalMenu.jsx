import React, { useEffect, useMemo, useState } from 'react';

const FAB_SIZE = 56;
const FAB_INSET = 24;
const BUTTON_SIZE = 48;
const MIN_GAP = 10;

/** Ângulos seguros: arco só para cima/esquerda a partir do canto inferior direito (π → 1.47π). */
const ANGLE_START = Math.PI * 1.03;
const ANGLE_END = Math.PI * 1.465;
const MAX_ARC = ANGLE_END - ANGLE_START;

function useViewportSize() {
  const [size, setSize] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}

function getLayoutMetrics(viewport, comfortable) {
  const compact = viewport.w < 480;
  const btnSize = compact ? 42 : comfortable ? 46 : BUTTON_SIZE;
  const spacing = btnSize + MIN_GAP + (comfortable && !compact ? 4 : 0);
  const btnHalf = btnSize / 2;
  const inset = compact ? 14 : FAB_INSET;
  const edgePad = compact ? 8 : 12;

  const maxRadiusX = viewport.w - inset - FAB_SIZE / 2 - btnHalf - edgePad;
  const maxRadiusY = viewport.h - inset - FAB_SIZE / 2 - btnHalf - edgePad;
  const maxRadius = Math.max(72, Math.min(comfortable ? 148 : 132, maxRadiusX, maxRadiusY));

  return { compact, btnSize, spacing, btnHalf, inset, edgePad, maxRadiusX, maxRadiusY, maxRadius };
}

/**
 * Distribui itens em anéis concêntricos dentro do arco seguro e da viewport.
 */
function computeOrbitalLayout(count, comfortable, viewport) {
  if (count <= 0) return { positions: [], metrics: getLayoutMetrics(viewport, comfortable) };

  const metrics = getLayoutMetrics(viewport, comfortable);
  const { spacing, maxRadius, maxRadiusX, maxRadiusY } = metrics;

  if (count === 1) {
    const r = Math.min(88, maxRadius);
    const angle = Math.PI * 1.22;
    return {
      metrics,
      positions: [clampPosition(Math.cos(angle) * r, Math.sin(angle) * r, maxRadiusX, maxRadiusY, 0)],
    };
  }

  const rings = [];
  let remaining = count;
  let ringIdx = 0;
  const minRadius = metrics.compact ? 64 : comfortable ? 76 : 70;
  const radiusStep = Math.max(32, (maxRadius - minRadius) / 3);

  while (remaining > 0 && ringIdx < 4) {
    const radius = Math.min(minRadius + ringIdx * radiusStep, maxRadius);
    const capacity = Math.max(
      1,
      Math.min(remaining, Math.floor((MAX_ARC * radius) / spacing) + 1)
    );
    rings.push({ radius, count: capacity, ringIdx });
    remaining -= capacity;
    ringIdx += 1;
  }

  const positions = [];
  let delay = 0;

  rings.forEach(({ radius, count: ringCount, ringIdx: ring }) => {
    const arcNeeded = ringCount <= 1 ? 0 : ((ringCount - 1) * spacing) / radius;
    const arcSpan = Math.min(MAX_ARC, arcNeeded);
    const ringOffset = ring * 0.035;
    const start = ANGLE_START + ringOffset;

    for (let i = 0; i < ringCount; i += 1) {
      const t = ringCount <= 1 ? 0.5 : i / (ringCount - 1);
      const angle = start + arcSpan * t;
      const rawX = Math.cos(angle) * radius;
      const rawY = Math.sin(angle) * radius;
      positions.push({
        ...clampPosition(rawX, rawY, maxRadiusX, maxRadiusY, ring),
        delay: delay * 30,
      });
      delay += 1;
    }
  });

  return { positions, metrics };
}

/** Mantém satélites à esquerda/acima do FAB, nunca para fora da tela. */
function clampPosition(x, y, maxRadiusX, maxRadiusY, ring) {
  const minX = -maxRadiusX;
  const minY = -maxRadiusY;
  const maxX = -10;
  const maxY = -10;

  const clampedX = Math.max(minX, Math.min(maxX, x));
  const clampedY = Math.max(minY, Math.min(maxY, y));

  return {
    x: clampedX,
    y: clampedY,
    ring,
    flipLabel: clampedX < -maxRadiusX * 0.55,
  };
}

/**
 * Menu orbital — FAB no canto inferior direito expande os atalhos em arco.
 * @param {boolean} comfortable — mais espaçamento (ideal para jogador em sessão)
 */
export default function DmOrbitalMenu({ open, onToggle, items = [], comfortable = false }) {
  const viewport = useViewportSize();
  const { positions, metrics } = useMemo(
    () => computeOrbitalLayout(items.length, comfortable, viewport),
    [items.length, comfortable, viewport.w, viewport.h]
  );

  const { compact, btnSize, inset } = metrics;

  return (
    <div
      className={`dm-orbital-menu ${open ? 'is-open' : ''} ${comfortable ? 'is-comfortable' : ''} ${compact ? 'is-compact' : ''}`}
      style={{ '--orbital-inset': `${inset}px`, '--sat-size': `${btnSize}px` }}
    >
      {open && (
        <button
          type="button"
          className="orbital-backdrop"
          aria-label="Fechar menu"
          onClick={() => onToggle(false)}
        />
      )}

      {items.map((item, i) => {
        const pos = positions[i] || { x: 0, y: 0, delay: 0, ring: 0, flipLabel: false };

        return (
          <button
            key={item.id}
            type="button"
            className={`orbital-satellite ${pos.flipLabel ? 'label-right' : ''}`}
            title={item.label}
            aria-label={item.label}
            style={{
              '--sat-x': `${pos.x}px`,
              '--sat-y': `${pos.y}px`,
              '--sat-delay': `${pos.delay ?? i * 30}ms`,
              '--sat-z': (pos.ring ?? 0) + 1,
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
          right: var(--orbital-inset, 24px);
          bottom: var(--orbital-inset, 24px);
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
        .orbital-fab:hover { transform: scale(1.05); box-shadow: 0 0 32px rgba(255, 204, 0, 0.45); }
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
          width: var(--sat-size, 48px);
          height: var(--sat-size, 48px);
          margin-right: calc(var(--sat-size, 48px) / -2);
          margin-bottom: calc(var(--sat-size, 48px) / -2);
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
          touch-action: manipulation;
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
          transform: translate(var(--sat-x), var(--sat-y)) scale(1.05);
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
        .dm-orbital-menu.is-compact .orbital-sat-icon { font-size: 16px; }
        .orbital-sat-icon svg { width: 20px; height: 20px; }
        .dm-orbital-menu.is-compact .orbital-sat-icon svg { width: 18px; height: 18px; }

        .orbital-sat-label {
          position: absolute;
          right: calc(100% + 10px);
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
        .orbital-satellite.label-right .orbital-sat-label {
          right: auto;
          left: calc(100% + 10px);
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
      `}</style>
    </div>
  );
}
