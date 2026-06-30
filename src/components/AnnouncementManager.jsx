import React, { useEffect, useState } from 'react';
import {
  subscribeAllAnnouncements,
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  reorderAnnouncement,
} from '../services/announcements';

export default function AnnouncementManager({ onClose }) {
  const [items, setItems] = useState([]);
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    const unsub = subscribeAllAnnouncements(setItems);
    return () => unsub();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const trimmed = newText.trim();
    if (!trimmed) return;
    await addAnnouncement(trimmed);
    setNewText('');
  };

  const handleToggleActive = (item) => updateAnnouncement(item.id, { ativo: !item.ativo });

  const handleDelete = (item) => {
    if (window.confirm('Excluir este anúncio?')) deleteAnnouncement(item.id);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingText(item.texto);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = async () => {
    const trimmed = editingText.trim();
    if (!trimmed) return;
    await updateAnnouncement(editingId, { texto: trimmed });
    cancelEdit();
  };

  return (
    <div className="announcement-mgr-overlay" onClick={onClose}>
      <div className="announcement-mgr-box" onClick={(e) => e.stopPropagation()}>
        <div className="announcement-mgr-header">
          <h3>📢 ANÚNCIOS DA MESA</h3>
          <button type="button" className="announcement-mgr-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleAdd} className="announcement-mgr-form">
          <input
            placeholder="Escreva um novo anúncio..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          <button type="submit">CRIAR</button>
        </form>

        <div className="announcement-mgr-list">
          {items.length === 0 && <p className="announcement-mgr-empty">Nenhum anúncio cadastrado.</p>}
          {items.map((item, idx) => (
            <div key={item.id} className={`announcement-mgr-row ${item.ativo ? 'active' : 'inactive'}`}>
              {editingId === item.id ? (
                <input
                  className="announcement-mgr-edit-input"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  autoFocus
                />
              ) : (
                <span className="announcement-mgr-text">{item.texto}</span>
              )}

              <div className="announcement-mgr-actions">
                <button type="button" title="Mover para cima" onClick={() => reorderAnnouncement(items, idx, -1)} disabled={idx === 0}>↑</button>
                <button type="button" title="Mover para baixo" onClick={() => reorderAnnouncement(items, idx, 1)} disabled={idx === items.length - 1}>↓</button>
                <button
                  type="button"
                  title={item.ativo ? 'Desativar' : 'Ativar'}
                  className={`announcement-mgr-toggle ${item.ativo ? 'on' : 'off'}`}
                  onClick={() => handleToggleActive(item)}
                >
                  {item.ativo ? 'ATIVO' : 'INATIVO'}
                </button>
                {editingId === item.id ? (
                  <>
                    <button type="button" title="Salvar" onClick={saveEdit}>💾</button>
                    <button type="button" title="Cancelar" onClick={cancelEdit}>✕</button>
                  </>
                ) : (
                  <button type="button" title="Editar" onClick={() => startEdit(item)}>✏️</button>
                )}
                <button type="button" title="Excluir" className="announcement-mgr-delete" onClick={() => handleDelete(item)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .announcement-mgr-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.85); z-index: 30000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .announcement-mgr-box { background: #0d0d15; border: 2px solid #ffcc00; padding: 20px; border-radius: 8px; width: 520px; max-width: 92vw; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 0 0 30px rgba(255,204,0,0.2); font-family: 'Cinzel', serif; color: #fff; }
        .announcement-mgr-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
        .announcement-mgr-header h3 { margin: 0; color: #ffcc00; font-size: 16px; }
        .announcement-mgr-close { background: none; border: none; color: #fff; font-size: 18px; cursor: pointer; }

        .announcement-mgr-form { display: flex; gap: 8px; margin-bottom: 18px; }
        .announcement-mgr-form input { flex: 1; background: #000; border: 1px solid #444; color: #fff; padding: 10px; border-radius: 4px; outline: none; font-family: sans-serif; font-size: 13px; }
        .announcement-mgr-form input:focus { border-color: #ffcc00; }
        .announcement-mgr-form button { background: linear-gradient(45deg, #ffcc00, #d4a000); border: none; color: #000; font-weight: bold; padding: 0 18px; border-radius: 4px; cursor: pointer; font-family: 'Cinzel', serif; }
        .announcement-mgr-form button:hover { filter: brightness(1.1); }

        .announcement-mgr-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .announcement-mgr-empty { color: #666; text-align: center; font-style: italic; font-family: sans-serif; font-size: 13px; }
        .announcement-mgr-row { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid #333; border-radius: 4px; padding: 8px 10px; }
        .announcement-mgr-row.inactive { opacity: 0.5; }
        .announcement-mgr-text { flex: 1; font-family: sans-serif; font-size: 12px; color: #ddd; }
        .announcement-mgr-edit-input { flex: 1; background: #000; border: 1px solid #ffcc00; color: #fff; padding: 6px; border-radius: 4px; font-family: sans-serif; font-size: 12px; outline: none; }

        .announcement-mgr-actions { display: flex; gap: 4px; flex-shrink: 0; }
        .announcement-mgr-actions button { background: #222; border: 1px solid #444; color: #ccc; width: 26px; height: 26px; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; }
        .announcement-mgr-actions button:hover:not(:disabled) { border-color: #ffcc00; color: #ffcc00; }
        .announcement-mgr-actions button:disabled { opacity: 0.3; cursor: not-allowed; }
        .announcement-mgr-toggle { width: auto !important; padding: 0 8px; font-size: 9px !important; font-weight: bold; letter-spacing: 0.5px; }
        .announcement-mgr-toggle.on { color: #0f0; border-color: #0f0; }
        .announcement-mgr-toggle.off { color: #888; }
        .announcement-mgr-delete { color: #f44 !important; }
        .announcement-mgr-delete:hover { border-color: #f44 !important; }
      `}</style>
    </div>
  );
}
