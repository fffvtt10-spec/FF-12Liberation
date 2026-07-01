import React, { useEffect, useMemo, useState } from 'react';

const FAB_SIZE = 56;
const FAB_INSET = 24;
const BUTTON_SIZE = 48;
const MIN_GAP = 12;

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
  const btnSize = compact ? 42 : comfortable ? 44 : BUTTON_SIZE;
  const spacing = btnSize + MIN_GAP;
  const btnHalf = btnSize / 2;
  const inset = compact ? 14 : FAB_INSET;
  const edgePad = compact ? 10 : 14;

  const maxRadiusX = viewport.w - inset - FAB_SIZE / 2 - btnHalf - edgePad;
  const maxRadiusY = viewport.h - inset - FAB_SIZE / 2 - btnHalf - edgePad;

  return { compact, btnSize, spacing, inset, maxRadiusX, maxRadiusY };
}

/**
 * Leque em colunas (2 colunas quando >4 itens): sobe e vai para a esquerda
 * a partir do FAB, com espaçamento fixo e previsível.
 */
function computeFanLayout(count, comfortable, viewport) {
  const metrics = getLayoutMetrics(viewport, comfortable);
  if (count <= 0) return { positions: [], metrics };

  const { spacing, maxRadiusX, maxRadiusY } = metrics;
  const cols = count <= 4 ? 1 : 2;
  const rows = Math.ceil(count / cols);
  const colGap = spacing + (comfortable ? 6 : 2);
  const rowGap = spacing + (comfortable ? 4 : 0);

  const rawHeight = (rows - 1) * rowGap + spacing;
  const rawWidth = cols === 1 ? spacing : colGap + spacing;
  const scaleY = rawHeight > maxRadiusY ? maxRadiusY / rawHeight : 1;
  const scaleX = rawWidth > maxRadiusX ? maxRadiusX / rawWidth : 1;
  const scale = Math.min(1, scaleX, scaleY);

  const startX = -spacing * 0.85;
  const startY = -spacing * 0.75;
  const positions = [];

  for (let i = 0; i < count; i += 1) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rowCurve = row * (comfortable ? 10 : 8);

    const x = (startX - col * colGap - rowCurve) * scale;
    const y = (startY - row * rowGap) * scale;

    positions.push({
      x: Math.max(-maxRadiusX, x),
      y: Math.max(-maxRadiusY, y),
      ring: col,
      flipLabel: x < -maxRadiusX * 0.55,
      delay: i * 26,
    });
  }

  return { positions, metrics };
}

/**
 * Menu orbital — FAB no canto inferior direito expande os atalhos em leque.
 */
export default function DmOrbitalMenu({ open, onToggle, items = [], comfortable = false }) {
  const viewport = useViewportSize();
  const { positions, metrics } = useMemo(
    () => computeFanLayout(items.length, comfortable, viewport),
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
              '--sat-delay': `${pos.delay ?? i * 26}ms`,
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
