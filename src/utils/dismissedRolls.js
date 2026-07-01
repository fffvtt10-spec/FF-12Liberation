const STORAGE_PREFIX = 'vtt_dismissed_rolls_';
const MAX_STORED = 80;

export function getRollId(roll) {
  if (!roll) return null;
  return String(roll.id || roll.timestamp || '');
}

export function rollHasValues(roll) {
  return Boolean(
    roll?.rolls?.length && roll.rolls.every((r) => r.value != null && r.value !== undefined)
  );
}

export function isRollComplete(roll) {
  return roll?.status === 'complete' || rollHasValues(roll);
}

function readDismissed(sessaoId) {
  if (!sessaoId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessaoId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isRollDismissed(sessaoId, rollId) {
  const id = rollId != null ? String(rollId) : '';
  if (!sessaoId || !id) return false;
  return readDismissed(sessaoId).includes(id);
}

export function dismissRoll(sessaoId, rollId) {
  const id = rollId != null ? String(rollId) : '';
  if (!sessaoId || !id) return;

  const current = readDismissed(sessaoId);
  if (current.includes(id)) return;

  const next = [...current, id].slice(-MAX_STORED);
  localStorage.setItem(`${STORAGE_PREFIX}${sessaoId}`, JSON.stringify(next));
}

/**
 * Define se o overlay de dados deve abrir neste snapshot.
 */
export function shouldOpenRollOverlay({
  roll,
  sessaoId,
  uid,
  isInitialSnapshot,
  previousRollId,
  previousRollStatus,
}) {
  const rollId = getRollId(roll);
  if (!rollId || isRollDismissed(sessaoId, rollId)) return false;

  const complete = isRollComplete(roll);

  if (isInitialSnapshot) {
    // Ao entrar/recarregar: nunca reexibir rolagem já finalizada
    if (complete) {
      dismissRoll(sessaoId, rollId);
      return false;
    }
    // Pending interrompido: só quem rolou termina
    if (roll.status === 'pending') {
      return roll.rolledBy === uid;
    }
    return false;
  }

  // Mesma rolagem ficou complete (observadores)
  if (rollId === previousRollId) {
    return previousRollStatus === 'pending' && complete && roll.rolledBy !== uid;
  }

  // Nova rolagem ao vivo
  if (roll.status === 'pending') {
    return roll.rolledBy === uid;
  }

  return true;
}
