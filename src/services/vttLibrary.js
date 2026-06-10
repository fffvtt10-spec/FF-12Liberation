import { db, auth } from '../firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';

export const VTT_TYPES = {
  MAP: 'map',
  SCENERY: 'scenery',
  NPC: 'npc',
  MONSTER: 'monster',
  OBJECT: 'object',
};

const COLLECTION = 'vtt_library';
const MIGRATION_KEY = 'vtt_library_migrated_v2';

const dedupeKey = (type, url) => `${type}::${url || ''}`;

export function subscribeVTTLibrary(callback) {
  return onSnapshot(collection(db, COLLECTION), (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    callback(items);
  });
}

export function filterLibraryByType(library, type) {
  return library.filter((item) => item.type === type);
}

export async function addLibraryItem(data) {
  const url = data.url || data.img || '';
  const payload = {
    ...data,
    url,
    img: url,
    name: data.name || 'Sem nome',
    createdAt: data.createdAt || new Date().toISOString(),
    createdBy: auth.currentUser?.uid || null,
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return { id: ref.id, ...payload };
}

export async function updateLibraryItem(id, updates) {
  const payload = { ...updates };
  if (payload.url && !payload.img) payload.img = payload.url;
  if (payload.img && !payload.url) payload.url = payload.img;
  await updateDoc(doc(db, COLLECTION, id), payload);
}

export async function deleteLibraryItem(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function migrateLegacyData() {
  if (localStorage.getItem(MIGRATION_KEY)) return;

  const existingKeys = new Set();
  const librarySnap = await getDocs(collection(db, COLLECTION));
  librarySnap.docs.forEach((d) => {
    const data = d.data();
    existingKeys.add(dedupeKey(data.type, data.url || data.img));
  });

  const importItem = async (item) => {
    const url = item.url || item.img || '';
    if (!url) return;
    const key = dedupeKey(item.type, url);
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    await addLibraryItem(item);
  };

  const bestiarySnap = await getDocs(collection(db, 'bestiary'));
  for (const d of bestiarySnap.docs) {
    const data = d.data();
    const type = data.category === 'object' ? VTT_TYPES.OBJECT : VTT_TYPES.MONSTER;
    await importItem({
      type,
      category: data.category || (type === VTT_TYPES.OBJECT ? 'object' : 'monster'),
      name: data.name || 'Sem nome',
      url: data.img || '',
      img: data.img || '',
      stars: data.stars,
      difficultyQ: data.difficultyQ,
      hpCurrent: data.hpCurrent,
      hpMax: data.hpMax,
      mpCurrent: data.mpCurrent,
      mpMax: data.mpMax,
      xp: data.xp,
      drops: data.drops,
      tips: data.tips,
      description: data.description,
      visibleBars: data.visibleBars,
      legacySource: 'bestiary',
      legacyId: d.id,
      createdAt: data.createdAt || new Date().toISOString(),
    });
  }

  const sessoesSnap = await getDocs(collection(db, 'sessoes'));
  for (const d of sessoesSnap.docs) {
    const s = d.data();

    for (const [index, mapItem] of (s.saved_maps || []).entries()) {
      await importItem({
        type: VTT_TYPES.MAP,
        name: mapItem.name || `Mapa ${index + 1}`,
        url: mapItem.url,
        legacySource: 'sessao',
        legacySessionId: d.id,
      });
    }

    for (const [index, url] of (s.mapas || []).entries()) {
      await importItem({
        type: VTT_TYPES.MAP,
        name: `Mapa Importado ${index + 1}`,
        url,
        legacySource: 'sessao',
        legacySessionId: d.id,
      });
    }

    for (const [index, url] of (s.cenarios || []).entries()) {
      await importItem({
        type: VTT_TYPES.SCENERY,
        name: `Cenário ${index + 1}`,
        url,
        legacySource: 'sessao',
        legacySessionId: d.id,
      });
    }

    for (const [index, url] of (s.npcs || []).entries()) {
      await importItem({
        type: VTT_TYPES.NPC,
        name: `NPC ${index + 1}`,
        url,
        legacySource: 'sessao',
        legacySessionId: d.id,
      });
    }

    for (const [index, url] of (s.monstros || []).entries()) {
      await importItem({
        type: VTT_TYPES.MONSTER,
        category: 'monster',
        name: `Monstro ${index + 1}`,
        url,
        img: url,
        hpCurrent: 10,
        hpMax: 10,
        mpCurrent: 10,
        mpMax: 10,
        visibleBars: false,
        legacySource: 'sessao',
        legacySessionId: d.id,
      });
    }
  }

  localStorage.setItem(MIGRATION_KEY, 'true');
}
