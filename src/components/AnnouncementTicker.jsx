import React, { useEffect, useMemo, useState } from 'react';
import { subscribeActiveAnnouncements } from '../services/announcements';

export default function AnnouncementTicker() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = subscribeActiveAnnouncements(setItems);
    return () => unsub();
  }, []);

  const text = useMemo(() => items.map((i) => i.texto).filter(Boolean).join('   ★   '), [items]);

  const duration = useMemo(() => `${Math.max(18, text.length * 0.18)}s`, [text]);

  if (!text) return null;

  return (
    <div className="announcement-ticker">
      <div className="announcement-ticker-track" style={{ animationDuration: duration }}>
        <span className="announcement-ticker-text">{text}</span>
        <span className="announcement-ticker-text" aria-hidden="true">{text}</span>
      </div>

      <style>{`
        .announcement-ticker {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 34px;
          background: linear-gradient(90deg, rgba(13,13,21,0.95), rgba(13,13,21,0.85));
          border-bottom: 2px solid #ffcc00;
          box-shadow: 0 2px 15px rgba(255, 204, 0, 0.15);
          z-index: 5000;
          overflow: hidden;
          display: flex;
          align-items: center;
          pointer-events: none;
        }
        .announcement-ticker-track {
          display: flex;
          white-space: nowrap;
          animation-name: announcementTickerScroll;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .announcement-ticker-text {
          padding: 0 40px;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: bold;
          color: #ffcc00;
          letter-spacing: 1px;
          text-shadow: 0 0 8px rgba(255, 204, 0, 0.4);
        }
        @keyframes announcementTickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .announcement-ticker { height: 28px; }
          .announcement-ticker-text { font-size: 11px; padding: 0 24px; }
        }
      `}</style>
    </div>
  );
}
