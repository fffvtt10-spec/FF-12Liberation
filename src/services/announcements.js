import { db, auth } from '../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';

const COLLECTION = 'anuncios';

export function subscribeAllAnnouncements(callback) {
  const q = query(collection(db, COLLECTION), orderBy('ordem', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export function subscribeActiveAnnouncements(callback) {
  return subscribeAllAnnouncements((items) => callback(items.filter((i) => i.ativo)));
}

export async function addAnnouncement(texto) {
  const payload = {
    texto,
    ativo: true,
    ordem: Date.now(),
    criadoPor: auth.currentUser?.uid || null,
    criadoEm: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  return { id: ref.id, ...payload };
}

export async function updateAnnouncement(id, updates) {
  await updateDoc(doc(db, COLLECTION, id), updates);
}

export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function reorderAnnouncement(list, index, direction) {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= list.length) return;
  const a = list[index];
  const b = list[targetIndex];
  await Promise.all([
    updateAnnouncement(a.id, { ordem: b.ordem }),
    updateAnnouncement(b.id, { ordem: a.ordem }),
  ]);
}
