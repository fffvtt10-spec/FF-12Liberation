import React from 'react';

/**
 * Menu orbital do mestre — FAB no canto inferior direito expande os atalhos em arco.
 */
export default function DmOrbitalMenu({ open, onToggle, items = [] }) {
  const radius = 108;
  const startAngle = Math.PI;
  const endAngle = Math.PI * 1.55;

  return (
    <div className={`dm-orbital-menu ${open ? 'is-open' : ''}`}>
      {open && (
        <button
          type="button"
          className="orbital-backdrop"
          aria-label="Fechar menu"
          onClick={() => onToggle(false)}
        />
      )}

      {items.map((item, i) => {
        const t = items.length <= 1 ? 0.5 : i / (items.length - 1);
        const angle = startAngle + (endAngle - startAngle) * t;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <button
            key={item.id}
            type="button"
            className="orbital-satellite"
            title={item.label}
            style={{
              '--sat-x': `${x}px`,
              '--sat-y': `${y}px`,
              '--sat-delay': `${i * 45}ms`,
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
        aria-label={open ? 'Fechar ferramentas' : 'Abrir ferramentas do mestre'}
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
        }
        .orbital-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          border: none;
          cursor: pointer;
          z-index: -1;
          animation: orbitalFadeIn 0.2s ease;
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
          z-index: 2;
        }
        .orbital-fab:hover { transform: scale(1.08); box-shadow: 0 0 32px rgba(255, 204, 0, 0.45); }
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
            border-color 0.2s;
          transition-delay: var(--sat-delay, 0ms);
          z-index: 1;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        }
        .dm-orbital-menu.is-open .orbital-satellite {
          transform: translate(var(--sat-x), var(--sat-y)) scale(1);
          opacity: 1;
          pointer-events: auto;
        }
        .orbital-satellite:hover {
          border-color: #ffcc00;
          color: #ffcc00;
          transform: translate(var(--sat-x), var(--sat-y)) scale(1.12);
          z-index: 3;
        }
        .orbital-sat-icon {
          font-size: 18px;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .orbital-sat-icon svg { width: 20px; height: 20px; }
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
        }
        .orbital-satellite:hover .orbital-sat-label { opacity: 1; }
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
        }
      `}</style>
    </div>
  );
}
