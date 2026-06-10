import { getCharacterClass, getCharacterRace } from './characterHelpers';

function formatClassFields(sheet, displayClass) {
  const primary = sheet?.job_system?.primary_class?.name?.trim() || null;
  const secondary = sheet?.job_system?.secondary_class?.name?.trim() || null;

  if (primary && secondary) {
    return { primaria: primary, secundaria: secondary };
  }
  if (primary) {
    return { primaria: primary, secundaria: null };
  }
  return { primaria: displayClass || null, secundaria: null };
}

function skillHasXpProgression(skill) {
  return skill?.xp != null && typeof skill.xp === 'object';
}

function buildSkillXpFields(skill, includeXp) {
  const masterizada = !!skill.master;

  if (masterizada) {
    return { masterizada: true, xp: null };
  }

  if (!includeXp || !skillHasXpProgression(skill)) {
    return { masterizada: false, xp: null };
  }

  const current = skill.xp?.current ?? 0;
  const max = skill.xp?.max ?? 100;
  return { masterizada: false, xp: `${current}/${max}` };
}

function mapNamedSkills(skills, includeXp = true) {
  return (skills || [])
    .filter((skill) => skill?.name?.trim())
    .map((skill) => ({
      nome: skill.name.trim(),
      efeito: skill.effect?.trim() || '',
      ...buildSkillXpFields(skill, includeXp),
    }));
}

export function characterToExportJson(character) {
  const sheet = character?.character_sheet || {};
  const info = sheet.basic_info || {};
  const name = info.character_name || character.name || 'Sem Nome';
  const race = getCharacterRace(character);
  const displayClass = getCharacterClass({ ...character, character_sheet: sheet });

  return {
    nome: name,
    raca: race,
    classe: formatClassFields(sheet, displayClass),
    foto_url: sheet.imgUrl?.trim() || null,
    grimorio: {
      coluna_esquerda: {
        titulo: sheet.job_system?.primary_class?.name?.trim() || 'Classe Primária',
        habilidades: mapNamedSkills(sheet.job_system?.primary_class?.skills, true),
      },
      coluna_centro: {
        titulo: sheet.job_system?.secondary_class?.name?.trim() || 'Classe Secundária',
        habilidades: mapNamedSkills(sheet.job_system?.secondary_class?.skills, true),
      },
      coluna_direita: {
        passivas: mapNamedSkills(sheet.job_system?.passives, false),
        reacoes: mapNamedSkills(sheet.job_system?.reactions, false),
      },
    },
  };
}

export function charactersToExportJson(characters) {
  return {
    exportado_em: new Date().toISOString(),
    total: characters.length,
    personagens: characters.map(characterToExportJson),
  };
}

export function downloadJson(data, filename) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCharactersAsJson(characters) {
  if (!characters.length) return;
  const payload = charactersToExportJson(characters);
  const dateSlug = new Date().toISOString().slice(0, 10);
  const count = characters.length;
  downloadJson(payload, `personagens-${count}-${dateSlug}.json`);
}
