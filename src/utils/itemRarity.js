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

// Comum→Raro: aura contida e suave. Super Raro+: salto de tamanho e brilho.
const INTENSITY_SCALE = [
  { glowMin: 1, glowMax: 2, spreadMin: 0, spreadMax: 0, opacityMin: 0.08, opacityMax: 0.14 },
  { glowMin: 2, glowMax: 3, spreadMin: 0, spreadMax: 1, opacityMin: 0.12, opacityMax: 0.20 },
  { glowMin: 3, glowMax: 5, spreadMin: 1, spreadMax: 2, opacityMin: 0.18, opacityMax: 0.28 },
  { glowMin: 6, glowMax: 12, spreadMin: 4, spreadMax: 10, opacityMin: 0.45, opacityMax: 0.65 },
  { glowMin: 8, glowMax: 16, spreadMin: 6, spreadMax: 14, opacityMin: 0.52, opacityMax: 0.74 },
  { glowMin: 10, glowMax: 20, spreadMin: 8, spreadMax: 18, opacityMin: 0.58, opacityMax: 0.82 },
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
  const id = resolveRaridadeId(raridadeId);
  if (id === 'unico' || id === 'amaldicoada') return null;
  const index = RARIDADES.findIndex((r) => r.id === id);
  return INTENSITY_SCALE[Math.min(index, INTENSITY_SCALE.length - 1)];
}

function buildStandardShadow(color, glow, spread, opacity) {
  const layers = [
    `0 0 ${glow}px ${hexToRgba(color, opacity)}`,
    `0 0 ${glow + spread}px ${hexToRgba(color, opacity * 0.55)}`,
  ];
  if (spread > 2) {
    layers.push(`0 0 ${glow + spread * 1.8}px ${hexToRgba(color, opacity * 0.28)}`);
  }
  layers.push(`inset 0 0 ${Math.max(2, glow * 0.35)}px ${hexToRgba(color, opacity * 0.35)}`);
  return layers.join(', ');
}

function getUnicoAuraStyle() {
  const crimson = '#ff2222';
  const deepRed = '#cc0000';
  const gold = '#ffcc00';

  return {
    '--rarity-color': crimson,
    '--rarity-shadow-min': [
      `0 0 4px ${hexToRgba(crimson, 0.9)}`,
      `0 0 10px ${hexToRgba(deepRed, 0.7)}`,
      `0 0 18px ${hexToRgba(gold, 0.4)}`,
      `inset 0 0 5px ${hexToRgba(crimson, 0.5)}`,
    ].join(', '),
    '--rarity-shadow-max': [
      `0 0 8px ${hexToRgba(crimson, 1)}`,
      `0 0 20px ${hexToRgba(deepRed, 0.95)}`,
      `0 0 36px ${hexToRgba(gold, 0.65)}`,
      `0 0 52px ${hexToRgba(crimson, 0.4)}`,
      `0 0 68px ${hexToRgba(gold, 0.25)}`,
      `inset 0 0 10px ${hexToRgba(gold, 0.45)}`,
    ].join(', '),
  };
}

function getCursedAuraStyle() {
  return {
    '--rarity-color': '#0d0d0d',
    '--rarity-shadow-min': [
      '0 0 2px rgba(0, 0, 0, 1)',
      '0 0 6px rgba(15, 5, 20, 0.9)',
      'inset 0 0 10px rgba(0, 0, 0, 0.95)',
      'inset 0 0 4px rgba(50, 0, 40, 0.35)',
    ].join(', '),
    '--rarity-shadow-max': [
      '0 0 4px rgba(0, 0, 0, 1)',
      '0 0 10px rgba(30, 0, 25, 0.75)',
      '0 0 16px rgba(10, 0, 15, 0.8)',
      'inset 0 0 14px rgba(0, 0, 0, 1)',
      'inset 0 0 6px rgba(90, 0, 70, 0.45)',
    ].join(', '),
  };
}

export function getSlotAuraClass(raridadeId) {
  return `rarity-aura-${resolveRaridadeId(raridadeId)}`;
}

export function getSlotAuraStyle(raridadeId) {
  const id = resolveRaridadeId(raridadeId);

  if (id === 'unico') return getUnicoAuraStyle();
  if (id === 'amaldicoada') return getCursedAuraStyle();

  const raridade = getRaridadeById(id);
  const intensity = getIntensityForRaridade(id);
  const { glowMin, glowMax, spreadMin, spreadMax, opacityMin, opacityMax } = intensity;

  return {
    '--rarity-color': raridade.cor,
    '--rarity-shadow-min': buildStandardShadow(raridade.cor, glowMin, spreadMin, opacityMin),
    '--rarity-shadow-max': buildStandardShadow(raridade.cor, glowMax, spreadMax, opacityMax),
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
