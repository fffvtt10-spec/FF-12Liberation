export const DEFAULT_RARIDADE = 'comum';

export const RARIDADES = [
  { id: 'comum', nome: 'Comum', cor: '#9ca3af' },
  { id: 'incomum', nome: 'Incomum', cor: '#22c55e' },
  { id: 'raro', nome: 'Raro', cor: '#3b82f6' },
  { id: 'super_raro', nome: 'Super Raro', cor: '#f97316' },
  { id: 'epico', nome: 'Épico', cor: '#a855f7' },
  { id: 'lendario', nome: 'Lendário', cor: '#eab308' },
  { id: 'unico', nome: 'Único', cor: '#ef4444' },
  { id: 'amaldicoada', nome: 'Amaldiçoada', cor: '#0a0a0a' },
];

const INTENSITY_SCALE = [
  { glowMin: 2, glowMax: 4, opacityMin: 0.18, opacityMax: 0.32 },
  { glowMin: 3, glowMax: 5, opacityMin: 0.22, opacityMax: 0.38 },
  { glowMin: 4, glowMax: 7, opacityMin: 0.28, opacityMax: 0.45 },
  { glowMin: 5, glowMax: 9, opacityMin: 0.33, opacityMax: 0.52 },
  { glowMin: 6, glowMax: 11, opacityMin: 0.38, opacityMax: 0.58 },
  { glowMin: 7, glowMax: 13, opacityMin: 0.43, opacityMax: 0.64 },
  { glowMin: 8, glowMax: 14, opacityMin: 0.48, opacityMax: 0.7 },
  { glowMin: 8, glowMax: 14, opacityMin: 0.48, opacityMax: 0.7 },
];

export function getRaridadeById(id) {
  return RARIDADES.find((r) => r.id === id) || RARIDADES[0];
}

export function resolveRaridadeId(id) {
  return getRaridadeById(id).id;
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getIntensityForRaridade(raridadeId) {
  const index = RARIDADES.findIndex((r) => r.id === resolveRaridadeId(raridadeId));
  return INTENSITY_SCALE[Math.max(0, index)];
}

export function getSlotAuraStyle(raridadeId) {
  const raridade = getRaridadeById(raridadeId);
  const { glowMin, glowMax, opacityMin, opacityMax } = getIntensityForRaridade(raridade.id);
  const isCursed = raridade.id === 'amaldicoada';
  const color = isCursed ? '#1a1a1a' : raridade.cor;
  const edgeColor = isCursed ? 'rgba(180, 0, 0, 0.55)' : color;

  const minShadow = isCursed
    ? `0 0 ${glowMin}px ${edgeColor}, inset 0 0 ${glowMin}px rgba(120, 0, 0, ${opacityMin})`
    : `0 0 ${glowMin}px ${hexToRgba(color, opacityMin)}, inset 0 0 ${Math.max(1, glowMin / 2)}px ${hexToRgba(color, opacityMin * 0.45)}`;
  const maxShadow = isCursed
    ? `0 0 ${glowMax}px rgba(220, 20, 20, ${opacityMax}), inset 0 0 ${glowMax / 2}px rgba(80, 0, 0, ${opacityMax * 0.6})`
    : `0 0 ${glowMax}px ${hexToRgba(color, opacityMax)}, inset 0 0 ${glowMax / 2}px ${hexToRgba(color, opacityMax * 0.45)}`;

  return {
    '--rarity-color': edgeColor,
    '--rarity-shadow-min': minShadow,
    '--rarity-shadow-max': maxShadow,
  };
}

export async function syncRaridadeToEquippedSlots(db, updateDoc, getDocs, collection, itemId, raridade) {
  const charsSnap = await getDocs(collection(db, 'characters'));
  const updates = [];

  charsSnap.docs.forEach((charDoc) => {
    const sheet = charDoc.data().character_sheet;
    const slots = sheet?.equipment?.slots;
    if (!slots?.length) return;

    let changed = false;
    const newSlots = slots.map((slot) => {
      if (slot?.item_id === itemId) {
        changed = true;
        return { ...slot, raridade };
      }
      return slot;
    });

    if (changed) {
      updates.push(
        updateDoc(charDoc.ref, {
          'character_sheet.equipment.slots': newSlots,
        })
      );
    }
  });

  await Promise.all(updates);
}
