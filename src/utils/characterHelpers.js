export function getCharacterClass(data) {
  if (!data) return '?';
  return (
    data.character_sheet?.job_system?.primary_class?.name ||
    data.class ||
    data.classe ||
    data.character_sheet?.basic_info?.class ||
    '?'
  );
}

const RACE_ALIASES = { 'No Muo': 'Nu Mou' };

export function normalizeRaceName(race) {
  if (!race) return race;
  return RACE_ALIASES[race] || race;
}

export function getCharacterRace(data) {
  if (!data) return '?';
  const race = data.race || data.character_sheet?.basic_info?.race || '?';
  return normalizeRaceName(race);
}

export function hasClassMismatch(data) {
  if (!data) return false;
  const primary = data.character_sheet?.job_system?.primary_class?.name;
  if (!primary) return false;
  const root = data.class || data.classe;
  return !!root && root !== primary;
}

export function buildCharacterSheetSavePayload(sheet) {
  const primaryClass = sheet?.job_system?.primary_class?.name;
  const syncedSheet = { ...sheet };
  if (primaryClass && syncedSheet.basic_info) {
    syncedSheet.basic_info = { ...syncedSheet.basic_info, class: primaryClass };
  }
  const payload = { character_sheet: syncedSheet };
  if (primaryClass) payload.class = primaryClass;
  return payload;
}
