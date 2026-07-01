export function createInitialRollTracker() {
  return {
    sessionId: null,
    rollId: null,
    rollStatus: null,
    initialized: false,
  };
}

export function syncRollTracker(trackerRef, sessaoId) {
  if (trackerRef.current.sessionId !== sessaoId) {
    trackerRef.current = {
      ...createInitialRollTracker(),
      sessionId: sessaoId,
    };
  }
}

export function readRollTrackerSnapshot(trackerRef) {
  const t = trackerRef.current;
  return {
    isInitialSnapshot: !t.initialized,
    previousRollId: t.rollId,
    previousRollStatus: t.rollStatus,
  };
}

export function commitRollTracker(trackerRef, roll) {
  trackerRef.current.initialized = true;
  trackerRef.current.rollId = roll?.id || roll?.timestamp || null;
  trackerRef.current.rollStatus = roll?.status ?? null;
}
