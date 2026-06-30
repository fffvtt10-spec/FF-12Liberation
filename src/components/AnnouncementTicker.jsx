import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { subscribeActiveAnnouncements } from '../services/announcements';

const DISPLAY_MS = 8000;
const FADE_MS = 500;

export default function AnnouncementTicker() {
  const [items, setItems] = useState([]);
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const hideTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);
  const lastSignatureRef = useRef('');

  useEffect(() => {
    const unsub = subscribeActiveAnnouncements(setItems);
    return () => unsub();
  }, []);

  const signature = useMemo(
    () => items.map((i) => `${i.id}:${i.texto}`).join('|'),
    [items]
  );

  const displayText = useMemo(
    () => items.map((i) => i.texto).filter(Boolean).join('   ★   '),
    [items]
  );

  useEffect(() => {
    if (!displayText) {
      setVisible(false);
      setLeaving(false);
      lastSignatureRef.current = '';
      return undefined;
    }

    if (signature === lastSignatureRef.current) return undefined;
    lastSignatureRef.current = signature;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    setLeaving(false);
    setVisible(true);

    hideTimerRef.current = setTimeout(() => {
      setLeaving(true);
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
        setLeaving(false);
      }, FADE_MS);
    }, DISPLAY_MS);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [displayText, signature]);

  if (!visible || !displayText) return null;

  return createPortal(
    <div className={`announcement-alert ${leaving ? 'is-leaving' : 'is-entering'}`} role="status" aria-live="polite">
      <div className="announcement-alert-backdrop" />
      <div className="announcement-alert-card">
        <span className="announcement-alert-badge">ANÚNCIO</span>
        <p className="announcement-alert-text">{displayText}</p>
      </div>

      <style>{`
        .announcement-alert {
          position: fixed;
          inset: 0;
          z-index: 6000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          pointer-events: none;
        }
        .announcement-alert-backdrop {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.82) 100%);
        }
        .announcement-alert-card {
          position: relative;
          z-index: 1;
          width: min(720px, 92vw);
          padding: clamp(28px, 5vw, 48px) clamp(24px, 4vw, 56px);
          border-radius: 16px;
          border: 2px solid #ffcc00;
          background: linear-gradient(160deg, rgba(18, 18, 28, 0.98) 0%, rgba(8, 8, 12, 0.98) 100%);
          box-shadow:
            0 0 60px rgba(255, 204, 0, 0.25),
            0 24px 80px rgba(0, 0, 0, 0.65),
            inset 0 0 40px rgba(255, 204, 0, 0.06);
          text-align: center;
        }
        .announcement-alert-badge {
          display: inline-block;
          margin-bottom: 16px;
          padding: 6px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 204, 0, 0.45);
          color: #ffcc00;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 3px;
        }
        .announcement-alert-text {
          margin: 0;
          color: #fff;
          font-family: 'Cinzel', serif;
          font-size: clamp(18px, 3.2vw, 28px);
          font-weight: bold;
          line-height: 1.45;
          letter-spacing: 0.5px;
          text-shadow: 0 0 20px rgba(255, 204, 0, 0.35);
          word-break: break-word;
        }
        .announcement-alert.is-entering .announcement-alert-card {
          animation: announcementPopIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .announcement-alert.is-leaving .announcement-alert-card {
          animation: announcementPopOut 0.5s ease forwards;
        }
        @keyframes announcementPopIn {
          from { opacity: 0; transform: scale(0.85) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes announcementPopOut {
          from { opacity: 1; transform: scale(1) translateY(0); }
          to { opacity: 0; transform: scale(0.92) translateY(-8px); }
        }
        @media (max-width: 768px) {
          .announcement-alert-card {
            padding: 24px 20px;
          }
        }
      `}</style>
    </div>,
    document.body
  );
}
