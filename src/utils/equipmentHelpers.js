import { collection, query, where, getDocs } from 'firebase/firestore';

const DEFAULT_RARIDADE = 'comum';

const SLOT_COUNT = 7;

export function normalizeEquipmentSlots(slots) {
  const empty = () => ({ item_name: '', item_img: '', effect: '' });
  const result = Array.from({ length: SLOT_COUNT }, () => empty());

  if (!slots) return result;

  if (Array.isArray(slots)) {
    slots.forEach((slot, i) => {
      if (i < SLOT_COUNT && slot && typeof slot === 'object') {
        result[i] = { ...empty(), ...slot };
      }
    });
    return result;
  }

  if (typeof slots === 'object') {
    for (let i = 0; i < SLOT_COUNT; i++) {
      const slot = slots[i] ?? slots[String(i)];
      if (slot && typeof slot === 'object') {
        result[i] = { ...empty(), ...slot };
      }
    }
  }

  return result;
}

export function slotHasItem(slot) {
  if (!slot || typeof slot !== 'object') return false;
  return !!(slot.item_id || slot.item_name?.trim() || slot.item_img?.trim());
}

function buildSlotFromGameItem(item, existing = {}) {
  return {
    item_id: item.id,
    item_name: item.nome || existing.item_name || '',
    item_img: item.imagem || existing.item_img || '',
    description: item.descricao || existing.description || '',
    raridade: item.raridade || existing.raridade || DEFAULT_RARIDADE,
    effect: existing.effect || '',
  };
}

function slotNeedsRestore(slot, item) {
  if (!slotHasItem(slot)) return true;
  if (item.id && slot.item_id === item.id) {
    return !slot.item_name?.trim() || !slot.item_img?.trim();
  }
  return false;
}

export async function restoreEquippedItemsFromDb(db, characterId, sheet) {
  const charId = characterId;
  if (!charId) return null;

  const q = query(
    collection(db, 'game_items'),
    where('status', '==', 'equipped'),
    where('ownerId', '==', charId)
  );

  const snap = await getDocs(q);
  const newSheet = JSON.parse(JSON.stringify(sheet));
  if (!newSheet.equipment) newSheet.equipment = { slots: [] };

  const slots = normalizeEquipmentSlots(newSheet.equipment.slots);
  let changed = JSON.stringify(slots) !== JSON.stringify(normalizeEquipmentSlots(sheet.equipment?.slots));

  snap.docs.forEach((docSnap) => {
    const item = { id: docSnap.id, ...docSnap.data() };
    const slotIdx = item.slotIndex;
    if (slotIdx == null || slotIdx < 0 || slotIdx >= SLOT_COUNT) return;

    const current = slots[slotIdx];
    if (slotNeedsRestore(current, item)) {
      slots[slotIdx] = buildSlotFromGameItem(item, current);
      changed = true;
    } else if (item.id && current.item_id === item.id && !current.raridade) {
      slots[slotIdx] = { ...current, raridade: item.raridade || DEFAULT_RARIDADE };
      changed = true;
    }
  });

  if (!changed) return null;

  newSheet.equipment.slots = slots;
  return newSheet;
}
