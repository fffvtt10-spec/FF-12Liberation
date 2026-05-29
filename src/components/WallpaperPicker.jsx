import React, { useState, useEffect, useRef } from 'react';

/**
 * WallpaperPicker – botão flutuante discreto para trocar o wallpaper da página.
 *
 * Props:
 *  - wallpapers: Array<{ label: string, src: string }> — lista de opções
 *  - current:   string — src atual
 *  - onChange:  (src: string) => void — callback ao selecionar
 *  - storageKey: string — chave do localStorage para persistência
 *  - side:      'left' | 'right' — lado onde fica (default 'right')
 *  - bottom:    number — posição bottom em px (default 22)
 *  - sideOffset: number — posição left/right em px (default 22)
 */
export default function WallpaperPicker({
  wallpapers = [],
  current,
  onChange,
  storageKey,
  side = 'right',
  bottom = 22,
  sideOffset = 22,
}) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const panelRef = useRef(null);

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
        setHovered(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (src) => {
    onChange(src);
    if (storageKey) localStorage.setItem(storageKey, src);
    setOpen(false);
    setHovered(null);
  };

  const previewSrc = hovered || current;

  // Inline styles para posicionamento dinâmico
  const btnStyle = {
    bottom: `${bottom}px`,
    [side]: `${sideOffset}px`,
  };
  const panelStyle = {
    bottom: `${bottom + 48}px`,
    [side]: `${sideOffset}px`,
  };

  return (
    <>
      {/* ── Botão flutuante ── */}
      <button
        id="wallpaper-picker-toggle"
        className="wp-toggle-btn"
        style={btnStyle}
        onClick={() => { setOpen(o => !o); setHovered(null); }}
        title="Trocar Wallpaper"
        aria-label="Abrir seletor de wallpaper"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </button>

      {/* ── Painel ── */}
      {open && (
        <div
          ref={panelRef}
          className="wp-panel"
          style={panelStyle}
          role="dialog"
          aria-label="Seletor de wallpaper"
        >
          {/* Mini-preview no topo */}
          <div className="wp-preview-strip" style={{ backgroundImage: `url(${previewSrc})` }}>
            <div className="wp-preview-label">
              {hovered
                ? (wallpapers.find(w => w.src === hovered)?.label || 'Preview')
                : 'Atual'}
            </div>
          </div>

          <div className="wp-panel-title">WALLPAPER</div>

          <div className="wp-grid">
            {wallpapers.map((wp) => {
              const isActive = wp.src === current;
              return (
                <button
                  key={wp.src}
                  className={`wp-thumb-btn${isActive ? ' wp-thumb-btn--active' : ''}`}
                  style={{ backgroundImage: `url(${wp.src})` }}
                  onMouseEnter={() => setHovered(wp.src)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => handleSelect(wp.src)}
                  title={wp.label}
                  aria-label={`Selecionar ${wp.label}`}
                >
                  <span className="wp-thumb-label">{wp.label}</span>
                  {isActive && <span className="wp-thumb-active-mark">✓</span>}
                </button>
              );
            })}
          </div>

          <button className="wp-close-btn" onClick={() => { setOpen(false); setHovered(null); }}>
            Fechar
          </button>
        </div>
      )}

      <style>{`
        /* ── Toggle Button ── */
        .wp-toggle-btn {
          position: fixed;
          z-index: 3000;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(8, 8, 16, 0.72);
          border: 1px solid rgba(255, 204, 0, 0.2);
          color: rgba(255, 204, 0, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(6px);
          transition: border-color 0.25s, color 0.25s, transform 0.2s, box-shadow 0.25s, opacity 0.25s;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          opacity: 0.55;
        }
        .wp-toggle-btn:hover {
          border-color: rgba(255, 204, 0, 0.75);
          color: #ffcc00;
          transform: scale(1.12);
          box-shadow: 0 0 12px rgba(255, 204, 0, 0.25);
          opacity: 1;
        }

        /* ── Panel ── */
        .wp-panel {
          position: fixed;
          z-index: 3000;
          width: 222px;
          background: rgba(8, 8, 14, 0.97);
          border: 1px solid rgba(255, 204, 0, 0.3);
          border-radius: 10px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.9);
          backdrop-filter: blur(14px);
          overflow: hidden;
          animation: wpSlideUp 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes wpSlideUp {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }

        /* ── Preview strip ── */
        .wp-preview-strip {
          width: 100%;
          height: 80px;
          background-size: cover;
          background-position: center;
          transition: background-image 0.2s ease;
          position: relative;
        }
        .wp-preview-strip::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 30%, rgba(8,8,14,0.92) 100%);
        }
        .wp-preview-label {
          position: absolute;
          bottom: 6px;
          left: 10px;
          font-size: 9px;
          color: rgba(255,204,0,0.65);
          font-family: 'Cinzel', serif;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          z-index: 1;
        }

        /* ── Title ── */
        .wp-panel-title {
          font-family: 'Cinzel', serif;
          font-size: 8px;
          letter-spacing: 3px;
          color: rgba(255,204,0,0.4);
          text-align: center;
          padding: 7px 10px 4px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        /* ── Grid de thumbs ── */
        .wp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          padding: 8px;
        }

        .wp-thumb-btn {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 4px;
          border: 2px solid transparent;
          background-size: cover;
          background-position: center;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s;
        }
        .wp-thumb-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.38);
          transition: background 0.18s;
        }
        .wp-thumb-btn:hover {
          border-color: #ffcc00;
          transform: scale(1.05);
          box-shadow: 0 0 8px rgba(255,204,0,0.4);
        }
        .wp-thumb-btn:hover::before {
          background: rgba(0,0,0,0.08);
        }
        .wp-thumb-btn--active {
          border-color: rgba(255,204,0,0.65);
          box-shadow: 0 0 6px rgba(255,204,0,0.25);
        }

        .wp-thumb-label {
          position: absolute;
          bottom: 3px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 7px;
          font-family: 'Cinzel', serif;
          color: #fff;
          text-shadow: 0 1px 4px rgba(0,0,0,0.9);
          letter-spacing: 0.3px;
          z-index: 1;
          pointer-events: none;
          text-transform: uppercase;
        }

        .wp-thumb-active-mark {
          position: absolute;
          top: 3px;
          right: 4px;
          font-size: 9px;
          color: #ffcc00;
          text-shadow: 0 0 4px rgba(0,0,0,0.9);
          z-index: 1;
          pointer-events: none;
        }

        /* ── Fechar ── */
        .wp-close-btn {
          width: 100%;
          padding: 7px;
          background: transparent;
          border: none;
          border-top: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.25);
          font-size: 9px;
          font-family: 'Cinzel', serif;
          letter-spacing: 1px;
          cursor: pointer;
          transition: color 0.2s;
          text-transform: uppercase;
        }
        .wp-close-btn:hover {
          color: rgba(255,255,255,0.6);
        }
      `}</style>
    </>
  );
}
