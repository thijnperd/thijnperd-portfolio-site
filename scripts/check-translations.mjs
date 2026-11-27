import { readFileSync } from 'node:fs';

// Marker-per-marker comparison against the English source, plus a scan for text
// that was left in the other language.

const SOURCE = 'translate/case-studies-and-essays.md';

const STRONG = {
  en: /\b(the|and|with|that|this|from|which|because|would|should|there|their|about|into|when|where|while|every|other|only|also|then|than|such|still|both|most|much|many|between|without|underneath|itself|themselves)\b/gi,
  // Dutch words that German does not share; German 'die'/'als'/'war' would false-positive.
  nlOnly: /\b(het|een|van|niet|maar|wordt|zijn|voor|ook|nog|naar|uit|bij|dit|dat|deze|kan|heeft|hebben|geen|door|tussen|zonder|omdat|wanneer|welke|hun|onze|jouw|wij|laatste|kans|bijvoorbeeld|ondertussen)\b/gi,
  de: /\b(der|die|das|und|nicht|auch|noch|von|mit|für|auf|aus|bei|als|dann|wenn|wie|nur|sich|werden|wird|hat|haben|mehr|kein|keine|über|zwischen|ohne|weil|welche|ihre|unsere|dein|euer|durch|immer|schon|jetzt|etwas|nichts)\b/gi,
};

function parseDocs(text) {
  const docs = new Map();
  const parts = text.split(/^## `(.+)`$/m);
  // parts: [preamble, path, body, path, body, ...]
  for (let i = 1; i < parts.length; i += 2) {
    const path = parts[i].trim();
    const body = parts[i + 1] ?? '';
    const blocks = [];
    for (const line of body.split('\n')) {
      const match = line.match(/^\[([^\]]+)\]\s(.*)$/);
      if (match) blocks.push({ marker: match[1], text: match[2] });
    }
    docs.set(path, blocks);
  }
  return docs;
}

const source = parseDocs(readFileSync(SOURCE, 'utf8'));
const file = process.argv[2];
const lang = process.argv[3];
if (!file || !lang) {
  console.error('usage: node scripts/check-translations.mjs <file.md> <nl|de>');
  process.exit(2);
}
const target = parseDocs(readFileSync(file, 'utf8'));

const patterns = lang === 'nl' ? [STRONG.en] : [STRONG.en, STRONG.nlOnly];

let mismatches = 0;
let leftoverBlocks = 0;

for (const [path, sourceBlocks] of source) {
  const blocks = target.get(path);
  if (!blocks) {
    console.log(`MISSING DOC  ${path}`);
    mismatches += 1;
    continue;
  }

  const problems = [];
  if (blocks.length !== sourceBlocks.length) {
    problems.push(`block count ${blocks.length} vs ${sourceBlocks.length}`);
  }
  const limit = Math.min(blocks.length, sourceBlocks.length);
  for (let i = 0; i < limit; i += 1) {
    if (blocks[i].marker !== sourceBlocks[i].marker) {
      problems.push(`#${i}: marker [${blocks[i].marker}] vs [${sourceBlocks[i].marker}]`);
    }
  }

  if (problems.length) {
    mismatches += 1;
    console.log(`\nMISMATCH  ${path}`);
    for (const problem of problems.slice(0, 8)) console.log(`  ${problem}`);
  }

  // Language leftovers: strip inline code and allow a couple of hits for names.
  for (let i = 0; i < blocks.length; i += 1) {
    const bare = blocks[i].text.replace(/`[^`]*`/g, ' ');
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const hits = bare.match(pattern) || [];
      if (hits.length >= 2) {
        leftoverBlocks += 1;
        const words = [...new Set(hits.map((hit) => hit.toLowerCase()))].join(', ');
        console.log(`\nLEFTOVER ${path} #${i} [${blocks[i].marker}] (${words})`);
        console.log(`  ${blocks[i].text.slice(0, 200)}`);
        break;
      }
    }
  }
}

const sourceTotal = [...source.values()].reduce((sum, blocks) => sum + blocks.length, 0);
const targetTotal = [...target.values()].reduce((sum, blocks) => sum + blocks.length, 0);

console.log(`\n${file}: ${target.size} docs, ${targetTotal} blocks (source: ${source.size} docs, ${sourceTotal} blocks)`);
console.log(`marker mismatches: ${mismatches} docs, leftover-language blocks: ${leftoverBlocks}`);
