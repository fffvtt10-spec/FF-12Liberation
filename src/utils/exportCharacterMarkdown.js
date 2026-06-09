import { getCharacterClass, getCharacterRace } from './characterHelpers';

const STAT_KEYS = ['FOR', 'INT', 'SOR', 'CAR', 'VEL', 'CONS'];

const EQUIP_SLOT_LABELS = [
  'Cabeça',
  'Acessório 2',
  'Mão Direita',
  'Mão Esquerda',
  'Acessório 1',
  'Corpo',
  'Pés',
];

function formatClassInfo(sheet, displayClass) {
  const primary = sheet?.job_system?.primary_class?.name;
  const secondary = sheet?.job_system?.secondary_class?.name;

  if (primary && secondary && secondary.trim()) {
    return `${primary} (multiclasse: ${secondary})`;
  }
  return displayClass || primary || '—';
}

function formatSkillsSection(title, skills) {
  const filled = (skills || []).filter(s => s?.name?.trim());
  if (filled.length === 0) return '';

  let section = `#### ${title}\n\n`;
  filled.forEach(skill => {
    section += `- **${skill.name}**`;
    if (skill.master) section += ' *(Masterizada)*';
    section += '\n';
    if (skill.effect?.trim()) {
      section += `  ${skill.effect.trim().split('\n').join('\n  ')}\n`;
    }
    section += '\n';
  });
  return section;
}

export function characterToMarkdown(character) {
  const sheet = character?.character_sheet || {};
  const info = sheet.basic_info || {};
  const name = info.character_name || character.name || 'Sem Nome';
  const race = getCharacterRace(character);
  const displayClass = getCharacterClass({ ...character, character_sheet: sheet });
  const level = info.level ?? character.level ?? 1;

  let md = `## ${name}\n\n`;

  md += `### Informações Básicas\n\n`;
  md += `- **Raça:** ${race}\n`;
  md += `- **Classe:** ${formatClassInfo(sheet, displayClass)}\n`;
  md += `- **Nível:** ${level}\n\n`;

  md += `### Atributos\n\n`;
  md += `| Atributo | Valor |\n|----------|-------|\n`;
  STAT_KEYS.forEach(stat => {
    const val = sheet.attributes?.[stat]?.value ?? 0;
    md += `| ${stat} | ${val} |\n`;
  });
  md += '\n';

  const arm = sheet.status?.arm?.value ?? 0;
  const mr = sheet.status?.res?.value ?? 0;
  const mov = sheet.status?.mov?.value ?? 3;

  md += `### Combate\n\n`;
  md += `- **ARM:** ${arm}\n`;
  md += `- **MR:** ${mr}\n`;
  md += `- **MOV:** ${mov}\n\n`;

  const equipped = (sheet.equipment?.slots || [])
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot?.item_name?.trim());

  md += `### Equipamentos\n\n`;
  if (equipped.length === 0) {
    md += `_Nenhum item equipado._\n\n`;
  } else {
    equipped.forEach(({ slot, idx }) => {
      md += `- **${EQUIP_SLOT_LABELS[idx] || `Slot ${idx + 1}`}:** ${slot.item_name}`;
      if (slot.description?.trim()) md += ` — ${slot.description.trim()}`;
      if (slot.effect?.trim()) md += ` | *Efeito:* ${slot.effect.trim()}`;
      md += '\n';
    });
    md += '\n';
  }

  md += `### Grimório\n\n`;

  const primaryName = sheet.job_system?.primary_class?.name || 'Classe Primária';
  const secondaryName = sheet.job_system?.secondary_class?.name || 'Classe Secundária';

  const primarySkills = formatSkillsSection(primaryName, sheet.job_system?.primary_class?.skills);
  const secondarySkills = formatSkillsSection(secondaryName, sheet.job_system?.secondary_class?.skills);
  const passives = formatSkillsSection('Passivas', sheet.job_system?.passives);
  const reactions = formatSkillsSection('Reações', sheet.job_system?.reactions);

  if (primarySkills) md += primarySkills;
  if (secondarySkills) md += secondarySkills;
  if (passives) md += passives;
  if (reactions) md += reactions;

  const classBonus = sheet.job_system?.class_bonus?.value?.trim();
  md += `#### Bônus de Classe\n\n`;
  md += classBonus ? `${classBonus}\n\n` : `_Nenhum._\n\n`;

  return md;
}

export function charactersToMarkdown(characters) {
  const dateStr = new Date().toLocaleString('pt-BR');
  let md = `# Exportação de Personagens\n\n`;
  md += `> Gerado em ${dateStr} — ${characters.length} personagem(ns)\n\n`;
  md += `---\n\n`;

  characters.forEach((char, i) => {
    md += characterToMarkdown(char);
    if (i < characters.length - 1) md += `---\n\n`;
  });

  return md;
}

export function downloadMarkdown(markdown, filename) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportCharactersAsMarkdown(characters) {
  if (!characters.length) return;
  const markdown = charactersToMarkdown(characters);
  const dateSlug = new Date().toISOString().slice(0, 10);
  const count = characters.length;
  downloadMarkdown(markdown, `personagens-${count}-${dateSlug}.md`);
}
