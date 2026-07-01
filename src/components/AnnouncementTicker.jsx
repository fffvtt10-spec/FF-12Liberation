import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeActiveAnnouncements } from '../services/announcements';

export default function AnnouncementTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = subscribeActiveAnnouncements(setItems);
    return () => unsub();
  }, []);

  const text = useMemo(
    () => items.map((i) => i.texto).filter(Boolean).join('   ★   '),
    [items]
  );

  const duration = useMemo(
    () => `${Math.max(22, text.length * 0.22)}s`,
    [text]
  );

  if (!text) return null;

  return createPortal(
    <div className="announcement-ticker" role="marquee" aria-live="polite">
      <div className="announcement-ticker-viewport">
        <div
          className="announcement-ticker-track"
          style={{ animationDuration: duration }}
        >
          <span className="announcement-ticker-chunk">{text}</span>
          <span className="announcement-ticker-chunk" aria-hidden="true">
            {text}
          </span>
        </div>
      </div>

      <style>{`
        .announcement-ticker {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          width: 100vw;
          max-width: 100%;
          height: 36px;
          margin: 0;
          padding: 0;
          background: linear-gradient(90deg, rgba(13, 13, 21, 0.97), rgba(13, 13, 21, 0.88));
          border-bottom: 2px solid #ffcc00;
          box-shadow: 0 2px 15px rgba(255, 204, 0, 0.15);
          z-index: 5000;
          overflow: hidden;
          pointer-events: none;
          box-sizing: border-box;
        }
        .announcement-ticker-viewport {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .announcement-ticker-track {
          display: flex;
          flex-wrap: nowrap;
          width: max-content;
          height: 100%;
          align-items: center;
          animation-name: announcementTickerScroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform;
        }
        .announcement-ticker-chunk {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          height: 100%;
          padding-right: 100vw;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: bold;
          color: #ffcc00;
          letter-spacing: 1px;
          white-space: nowrap;
          text-shadow: 0 0 8px rgba(255, 204, 0, 0.4);
        }
        .announcement-ticker-chunk::before {
          content: '◆';
          margin-right: 20px;
          opacity: 0.7;
          font-size: 10px;
        }
        @keyframes announcementTickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .announcement-ticker { height: 30px; }
          .announcement-ticker-chunk { font-size: 11px; }
        }
      `}</style>
    </div>,
    document.body
  );
}
