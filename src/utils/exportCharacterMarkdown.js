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

const COMBAT_SYSTEM_APPENDIX = `---

## Sistema de Combate

O combate é narrativo e fluido: o Mestre define os requisitos de cada rolagem com base na situação. O acerto é resolvido com **D20**; o número necessário depende de posição, condições e contexto da cena.

### Rolagem de Ataque

1. Jogador declara a ação e o alvo.
2. Mestre define o valor mínimo no D20 para sucesso (ex.: posição favorável = >5; alvo protegido com linha de visão difícil = >10).
3. Jogador rola D20. Resultado **maior** que o valor definido = acerto.

### Cálculo de Dano

**Ataque físico** (armas corpo a corpo, arcos, bestas, pistolas):

\`\`\`
Dano Bruto = FOR + Bônus de Classe + Bônus da Arma
Dano Final = Dano Bruto - DEF do alvo
\`\`\`

**Ataque mágico** (habilidades, feitiços):

\`\`\`
Dano Bruto = INT + Bônus de Classe + Bônus do Equipamento
Dano Final = Dano Bruto - RES do alvo
\`\`\`

- **Arqueiros, Pistoleiros e Exilados** usam armas de longo alcance e calculam dano com **FOR**.
- Habilidades podem alterar o tipo elemental do dano (fogo, gelo, raio, veneno etc.) ou aplicar buffs/debuffs.
- Nos personagens jogadores, defesa física aparece como **ARM** e resistência mágica como **MR**. Em criaturas, use **DEF** e **RES** com a mesma função.

### Regras Especiais

| Resultado D20 | Efeito |
|---------------|--------|
| 20 | Sucesso crítico — o dano bruto é **dobrado** |
| 1 | Falha crítica — consequência narrativa negativa (tropeço, arma danificada, exposição ao inimigo etc.) |

### Referência Rápida

| Tipo | Atributo de Dano | Mitigação do Alvo |
|------|------------------|-------------------|
| Físico | FOR | DEF |
| Mágico | INT | RES |

---

## Instruções para IA — Geração de Encontros

Você recebeu acima as fichas completas do grupo (atributos, ARM, MR, MOV, equipamentos, habilidades e bônus de classe). Use **exclusivamente** esses dados para calibrar encontros de combate.

### O que gerar

Para cada proposta de encontro, entregue **três variantes de dificuldade** (Fácil, Balanceado, Difícil) no mesmo mapa ou cenário. Em cada variante, inclua:

1. **Composição do encontro** — quantidade e tipos de criaturas por mapa; justifique se há diversidade de espécies ou horda homogênea.
2. **Ficha de cada criatura** — nome, HP, DEF, RES, atributos relevantes (FOR/INT conforme o tipo de ataque), bônus de ataque/dano, MOV e valor sugerido de D20 para acertar o grupo (considere posição e condições típicas do mapa).
3. **Dificuldade de acerto contra o grupo** — para cada criatura, indique faixas de D20 que o Mestre pode usar conforme a situação tática.
4. **Mini lore** — 2–4 frases de ambientação inspiradas em *Final Fantasy Tactics*, Ivalice e criaturas clássicas de RPG (goblins, flan, chocobos corrompidos, soldados de guilda, elementais, undead etc.). Tom de fantasia medieval política, não cópia literal de nomes protegidos.
5. **Dicas táticas** — 1–2 observações por encontro, em tom **sarcástico ou irônico**, sem entregar a solução de bandeja. Sugira caminhos possíveis (flanquear, focar alvo frágil, explorar fraqueza elemental, usar terreno) de forma velada.

### Como balancear

- **Fácil:** o grupo deve vencer gastando poucos recursos; erros de rolagem não devem ser fatais.
- **Balanceado:** vitória provável com tática e uso de habilidades; 1–2 momentos de tensão real.
- **Difícil:** exige coordenação, posicionamento e priorização de alvos; derrota é possível se o grupo jogar mal.

Compare o dano médio estimado do grupo (FOR/INT + bônus de classe + equipamento) contra o HP e DEF/RES das criaturas. Considere quantos personagens estão no export e o MOV do mapa.

### Formato de saída sugerido

\`\`\`
### [Nome do Mapa / Cenário]

#### Variante Fácil
- Criaturas: ...
- Lore: ...
- Dicas: ...

#### Variante Balanceada
...

#### Variante Difícil
...
\`\`\`

Priorize encontros jogáveis, variados e coerentes com o poder médio do grupo exportado acima.
`;

export function charactersToMarkdown(characters) {
  const dateStr = new Date().toLocaleString('pt-BR');
  let md = `# Exportação de Personagens\n\n`;
  md += `> Gerado em ${dateStr} — ${characters.length} personagem(ns)\n\n`;
  md += `---\n\n`;

  characters.forEach((char, i) => {
    md += characterToMarkdown(char);
    if (i < characters.length - 1) md += `---\n\n`;
  });

  md += `\n${COMBAT_SYSTEM_APPENDIX}`;

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
