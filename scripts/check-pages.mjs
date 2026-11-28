// Deploy gate for the generated pages. Translation bugs have twice reached production
// because nothing compared what the generator wrote against the English source; this
// does, and it fails the build instead of shipping a page with broken figures.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const DOCS = [
  'work/dither-studio/index.html',
  'work/cortex/index.html',
  'work/w3plan/index.html',
  'work/papersplease/index.html',
  'writing/school-planner-distribution/index.html',
  'writing/dithering-the-hero/index.html',
  'writing/plain-files/index.html',
];
const LANGS = ['nl', 'de'];

let failed = false;
const fail = (message) => {
  failed = true;
  console.error(`✗ ${message}`);
};
const ok = (message) => console.log(`✓ ${message}`);

// Inline formatting is translation-dependent (a translator may drop a bold or keep a
// span), so it is not compared. Blocks, links, images and headings are.
const INLINE = new Set(['strong', 'em', 'b', 'i', 'span', 'code', 'mark', 'sup', 'sub', 'small', 'abbr']);

// Element structure with attribute names kept and every value dropped: a translated
// page may say different things, but it must be built from the same parts.
function skeleton(html) {
  const start = html.indexOf('<article>');
  const end = html.lastIndexOf('</article>');
  const article = html
    .slice(start, end)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<p class="article__lang-note"[\s\S]*?<\/p>/g, '');
  const parts = [];
  for (const match of article.matchAll(/<([a-z][a-z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)\/?>/gi)) {
    const name = match[1].toLowerCase();
    if (INLINE.has(name)) continue;
    const attrs = [...match[2].matchAll(/([a-z-]+)\s*=/gi)].map((attr) => attr[1].toLowerCase()).sort();
    parts.push(`${name}${attrs.length ? `[${attrs.join(' ')}]` : ''}`);
  }
  return parts;
}

function compare(lang, doc) {
  const english = skeleton(readFileSync(doc, 'utf8'));
  const translated = skeleton(readFileSync(`${lang}/${doc}`, 'utf8'));
  if (english.length !== translated.length) {
    fail(`${lang}/${doc}: ${translated.length} elements vs ${english.length} in ${doc}`);
    return;
  }
  for (let i = 0; i < english.length; i += 1) {
    if (english[i] !== translated[i]) {
      const from = Math.max(0, i - 2);
      fail(`${lang}/${doc}: structure drifts at element ${i}`);
      console.error(`    en: ${english.slice(from, i + 2).join(' ')}`);
      console.error(`    ${lang}:  ${translated.slice(from, i + 2).join(' ')}`);
      return;
    }
  }
  ok(`${lang}/${doc}: structure matches`);
}

// 1. The generator runs cleanly and every page it writes is already committed.
execFileSync(process.execPath, ['scripts/build-translated-pages.mjs'], { stdio: 'inherit' });
try {
  execFileSync('git', ['diff', '--exit-code', '--quiet', '--', 'nl', 'de', 'work', 'writing', 'public/sitemap.xml'], {
    stdio: 'inherit',
  });
  ok('generated pages match the translation files');
} catch {
  fail('generated pages are stale: commit the output of scripts/build-translated-pages.mjs');
}

// 2. Structure parity with the English pages.
for (const lang of LANGS) {
  for (const doc of DOCS) compare(lang, doc);
}

// 3. Translation markers still line up, and nothing is left in the wrong language.
for (const [lang, file] of [['nl', 'translate/case-studies-and-essays.nl.md'], ['de', 'translate/case-studies-and-essays.de.md']]) {
  try {
    execFileSync(process.execPath, ['scripts/check-translations.mjs', file, lang], { stdio: 'pipe' });
    ok(`${file}: markers align, no leftover language`);
  } catch (error) {
    fail(`${file}: check-translations failed`);
    console.error(String(error.stdout || error.message));
  }
}

// 4. The feed and sitemap dates still describe the pages.
try {
  execFileSync(process.execPath, ['scripts/build-feed.mjs', '--check'], { stdio: 'inherit' });
} catch {
  fail('feed or sitemap dates are stale');
}

if (failed) process.exit(1);
console.log('all generated-page checks passed');
