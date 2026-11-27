import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// Build /nl/... and /de/... versions of the seven long-form pages by substituting
// the translated blocks into the English markup. Runs in check mode with --check,
// which regenerates nothing and only reports how the markup lines up.

const ORIGIN = 'https://thijnperd.github.io';
const DOCS = [
  'work/dither-studio/index.html',
  'work/cortex/index.html',
  'work/w3plan/index.html',
  'work/papersplease/index.html',
  'writing/school-planner-distribution/index.html',
  'writing/dithering-the-hero/index.html',
  'writing/plain-files/index.html',
];
const SOURCE = 'translate/case-studies-and-essays.md';
const LANGS = {
  nl: 'translate/case-studies-and-essays.nl.md',
  de: 'translate/case-studies-and-essays.de.md',
};

const check = process.argv.includes('--check');
const selftest = process.argv.includes('--selftest');

function parseMd(file) {
  const docs = new Map();
  const parts = readFileSync(file, 'utf8').split(/^## `(.+)`$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const path = parts[i].trim();
    const blocks = [];
    for (const line of (parts[i + 1] ?? '').split('\n')) {
      const match = line.match(/^\[([^\]]+)\]\s(.*)$/);
      if (match) blocks.push({ marker: match[1], text: match[2] });
    }
    docs.set(path, blocks);
  }
  return docs;
}

const decode = (value) =>
  value
    .replace(/<[a-z]+[^>]*\sdata-i18n(?:-attr)?="[^"]*"[^>]*>[\s\S]*?<\/[a-z]+>/gi, '')
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&times;/g, '×')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();

// Walks the article in the same order the translation source was generated in and
// returns every slot that carries translatable text.
function walk(html) {
  const slots = [];
  const articleStart = html.indexOf('<article>');
  const article = html.slice(articleStart, html.lastIndexOf('</article>'));

  const push = (regionOffset, match, kind, inner) => {
    const closeLength = kind === 'alt' ? 0 : 3 + (match[1] ?? '').length;
    const start = regionOffset + match.index + match[0].length - inner.length - closeLength;
    slots.push({ start, end: start + inner.length, kind, inner, match: match[0] });
  };

  const heroEnd = article.indexOf('</header>');
  const hero = article.slice(0, heroEnd);

  const crumb = hero.match(/<nav class="crumb"[\s\S]*?<\/nav>/);
  if (crumb) {
    const spans = [...crumb[0].matchAll(/<span([^>]*)>([^<]*)<\/span>/g)];
    const topic = spans.find((m) => {
      const value = m[2].trim();
      return value && value !== '/' && !/^\d+$/.test(value);
    });
    if (topic) {
      const offset = articleStart + hero.indexOf(crumb[0]) + crumb[0].indexOf(topic[0]);
      slots.push({
        start: offset + topic[0].indexOf('>') + 1,
        end: offset + topic[0].indexOf('>') + 1 + topic[2].length,
        kind: 'crumb topic',
        inner: topic[2],
        match: null,
      });
    }
  }

  const kindSpan = hero.match(/<span class="project__kind"([^>]*)>([\s\S]*?)<\/span>/);
  if (kindSpan && !/data-i18n/.test(kindSpan[1])) {
    const offset = articleStart + hero.indexOf(kindSpan[0]);
    slots.push({
      start: offset + kindSpan[0].indexOf('>') + 1,
      end: offset + kindSpan[0].indexOf('>') + 1 + kindSpan[2].length,
      kind: 'kind',
      inner: kindSpan[2],
      match: null,
    });
  }

  const h1 = hero.match(/<h1([^>]*)>([\s\S]*?)<\/h1>/);
  if (h1) {
    const offset = articleStart + hero.indexOf(h1[0]);
    slots.push({
      start: offset + h1[0].indexOf('>') + 1,
      end: offset + h1[0].indexOf('>') + 1 + h1[2].length,
      kind: 'h1',
      inner: h1[2],
      match: null,
    });
  }

  const lede = hero.match(/<p class="(?:case-hero|article)__lede"([^>]*)>([\s\S]*?)<\/p>/);
  if (lede) {
    const offset = articleStart + hero.indexOf(lede[0]);
    slots.push({
      start: offset + lede[0].indexOf('>') + 1,
      end: offset + lede[0].indexOf('>') + 1 + lede[2].length,
      kind: 'lede',
      inner: lede[2],
      match: null,
    });
  }

  for (const row of hero.matchAll(/<div class="case-spec__row">\s*<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g)) {
    const offset = articleStart + hero.indexOf(row[0]);
    const ddOpen = row[0].indexOf('<dd');
    const ddInner = ddOpen + row[0].slice(ddOpen).indexOf('>') + 1;
    slots.push({
      start: offset + ddInner,
      end: offset + ddInner + row[2].length,
      kind: `spec · ${decode(row[1])}`,
      inner: row[2],
      match: null,
    });
  }

  const outcome = hero.match(/<p class="article__outcome"([^>]*)>([\s\S]*?)<\/p>/);
  if (outcome) {
    const label = /<span[^>]*data-i18n[\s\S]*?<\/span>/.exec(outcome[2]);
    const inner = outcome[2].slice(label ? label.index + label[0].length : 0);
    const inside = outcome[2].indexOf(inner);
    const offset = articleStart + hero.indexOf(outcome[0]);
    slots.push({
      start: offset + outcome[0].indexOf('>') + 1 + inside,
      end: offset + outcome[0].indexOf('>') + 1 + inside + inner.length,
      kind: 'outcome',
      inner,
      match: null,
    });
  }

  const noteAt = hero.indexOf('article__lang-note');
  const heroBody = noteAt > -1 ? hero.slice(hero.indexOf('</p>', noteAt) + 4) : '';
  slots.push(...blockSlots(heroBody, articleStart + hero.length - heroBody.length));

  let cursor = article.indexOf('<div class="case-sections">');
  while (cursor > -1) {
    const sectionStart = article.indexOf('<section class="case-section">', cursor);
    if (sectionStart === -1) break;
    const section = article.slice(sectionStart, article.indexOf('</section>', sectionStart));

    const heading = section.match(/<h2 class="case-section__title"([^>]*)>([\s\S]*?)<\/h2>/);
    if (heading) {
      const offset = articleStart + sectionStart + section.indexOf(heading[0]);
      slots.push({
        start: offset + heading[0].indexOf('>') + 1,
        end: offset + heading[0].indexOf('>') + 1 + heading[2].length,
        kind: 'h2',
        inner: heading[2],
        match: null,
      });
    }

    const contentStart = section.indexOf('<div class="case-section__content">');
    if (contentStart > -1) {
      const body = section.slice(contentStart + '<div class="case-section__content">'.length, section.lastIndexOf('</div>'));
      slots.push(...blockSlots(body, articleStart + sectionStart + contentStart + '<div class="case-section__content">'.length));
    }

    cursor = sectionStart + section.length;
  }

  for (const pager of article.matchAll(/<span class="case-pager__title"([^>]*)>([\s\S]*?)<\/span>/g)) {
    const offset = articleStart + pager.index;
    slots.push({
      start: offset + pager[0].indexOf('>') + 1,
      end: offset + pager[0].indexOf('>') + 1 + pager[2].length,
      kind: 'pager',
      inner: pager[2],
      match: null,
    });
  }

  return slots;
}

// Blocks inside a hero/section region, mirroring the source generator.
function blockSlots(region, regionOffset) {
  const slots = [];
  const re = /<(pre|h3|p|li|figcaption|blockquote)([^>]*)>([\s\S]*?)<\/\1>|<img([^>]*?)\/?>/gi;
  let match;
  while ((match = re.exec(region))) {
    if (match[4] !== undefined) {
      const alt = /alt="([^"]*)"/.exec(match[4]);
      if (alt && !/data-i18n/.test(match[4])) {
        // Offset within the whole tag, not within the alt attribute alone: missing this
        // wrote the translated caption over src="…" and left the figure image broken.
        const altAt = match[0].indexOf(alt[0]);
        const offset = regionOffset + match.index + altAt + alt[0].indexOf('"') + 1;
        slots.push({ start: offset, end: offset + alt[1].length, kind: 'alt', inner: alt[1], match: null });
      }
      continue;
    }
    const tag = match[1].toLowerCase();
    if (/data-i18n/.test(match[2])) continue;
    if (/article__lang-note/.test(match[2])) continue;
    const value = decode(match[3]);
    if (!value) continue;
    if (tag === 'pre') {
      slots.push({ start: regionOffset + match.index, end: regionOffset + match.index, kind: 'code', inner: '', match: null });
      continue;
    }
    const openEnd = regionOffset + match.index + match[0].indexOf('>') + 1;
    slots.push({
      start: openEnd,
      end: openEnd + match[3].length,
      kind: tag === 'figcaption' ? 'caption' : tag,
      inner: match[3],
      match: null,
    });
  }
  return slots;
}

// The translations are plain text, so the anchors the English copy carries have to be
// put back around the translated equivalent of their link text. Keyed by href, since
// every one of them points somewhere different.
const LINK_TEXT = {
  nl: {
    'https://thijnperd.github.io/dither-studio/': 'De webapp',
    'https://github.com/thijnperd/dither-studio': 'De broncode',
    'https://thijnperd.github.io/Dither-studio_publicity/': 'de lanceringsfilm',
    '/writing/dithering-the-hero/': 'De hero is geditherd, niet vervaagd',
    '/writing/plain-files/': 'Platte bestanden, geen accounts',
    '/writing/school-planner-distribution/': 'Meer over waarom distributie het lastigste deel was',
    'https://thijnperd.github.io/obsidian-cortex/': 'Open de live demo',
    'https://github.com/thijnperd/obsidian-cortex': 'de broncode',
    'https://yannis-raijmakers.github.io/W3Plan-desktop/': 'de walkthrough',
    'https://github.com/Yannis-Raijmakers/W3Plan-desktop': 'de installers-repository',
    'https://github.com/thijnperd/PapersPlease': 'de repository',
    'https://github.com/thijnperd/thijnperd.github.io': 'GitHub',
    '/#work': 'sectie werk',
  },
  de: {
    'https://thijnperd.github.io/dither-studio/': 'Die Web-App',
    'https://github.com/thijnperd/dither-studio': 'Der Quellcode',
    'https://thijnperd.github.io/Dither-studio_publicity/': 'der Launch-Film',
    '/writing/dithering-the-hero/': 'Der Hero ist gedithert, nicht weichgezeichnet',
    '/writing/plain-files/': 'Einfache Dateien, keine Accounts',
    '/writing/school-planner-distribution/': 'Mehr dazu, warum die Verteilung der schwierige Teil war',
    'https://thijnperd.github.io/obsidian-cortex/': 'Öffne die Live-Demo',
    'https://github.com/thijnperd/obsidian-cortex': 'den Quellcode',
    'https://yannis-raijmakers.github.io/W3Plan-desktop/': 'das Walkthrough',
    'https://github.com/Yannis-Raijmakers/W3Plan-desktop': 'Installers-Repository',
    'https://github.com/thijnperd/PapersPlease': 'Im Repository',
    'https://github.com/thijnperd/thijnperd.github.io': 'GitHub',
    '/#work': 'Arbeitsbereich',
  },
};

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function renderText(text, englishInner, kind, lang) {
  let html = escapeHtml(text).replace(/`([^`]+)`/g, '<code>$1</code>');

  // Keep the emphasis the English block carries: either on a short lead-in before
  // an em dash, or on the first sentence.
  if (/^\s*<strong/i.test(englishInner)) {
    const dash = text.search(/\s[–—-]\s/);
    if (dash > 2 && dash < 60) {
      html = `<strong>${escapeHtml(text.slice(0, dash)).replace(/`([^`]+)`/g, '<code>$1</code>')}</strong>${escapeHtml(text.slice(dash)).replace(/`([^`]+)`/g, '<code>$1</code>')}`;
    } else {
      const stop = text.indexOf('. ');
      const sentence = stop > -1 && stop < 90 ? text.slice(0, stop + 1) : null;
      if (sentence) {
        const rest = text.slice(sentence.length);
        html = `<strong>${escapeHtml(sentence).replace(/`([^`]+)`/g, '<code>$1</code>')}</strong>${escapeHtml(rest).replace(/`([^`]+)`/g, '<code>$1</code>')}`;
      }
    }
  }

  const anchors = LINK_TEXT[lang] || {};
  const hrefs = [...englishInner.matchAll(/<a\s[^>]*href="([^"]+)"/g)].map((match) => match[1]);
  let placed = 0;
  for (const href of hrefs) {
    const phrase = anchors[href];
    if (!phrase) continue;
    const index = html.indexOf(phrase);
    if (index === -1) continue;
    html = `${html.slice(0, index)}<a href="${href}">${phrase}</a>${html.slice(index + phrase.length)}`;
    placed += 1;
  }

  // A spec value that is itself a link (the project name) keeps its anchor around
  // the whole value; those are single links, so wrapping the text is exact.
  if (placed === 0 && hrefs.length === 1) {
    html = `<a href="${hrefs[0]}">${html}</a>`;
  }

  return html;
}

function localizeHead(html, { lang, path, title, description }) {
  const localPath = `/${lang}/${path}`.replace(/index\.html$/, '');
  const localUrl = `${ORIGIN}${localPath}`;
  const enUrl = `${ORIGIN}/${path.replace(/index\.html$/, '')}`;

  html = html.replace(/<html lang="en"/, `<html lang="${lang}"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);
  html = html.replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${escapeHtml(title)}$2`);
  html = html.replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);
  html = html.replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${localUrl}$2`);
  html = html.replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${escapeHtml(title)}$2`);
  html = html.replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${escapeHtml(description)}$2`);
  html = html.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${localUrl}" />`);

  html = html.replace(/\n\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, '');
  const alternates = [
    `<link rel="alternate" hreflang="en" href="${enUrl}" />`,
    `<link rel="alternate" hreflang="nl" href="${ORIGIN}/nl/${path.replace(/index\.html$/, '')}" />`,
    `<link rel="alternate" hreflang="de" href="${ORIGIN}/de/${path.replace(/index\.html$/, '')}" />`,
    `<link rel="alternate" hreflang="x-default" href="${enUrl}" />`,
  ].join('\n    ');
  html = html.replace(/(<link rel="canonical"[^>]*\/>)/, `$1\n    ${alternates}`);

  // JSON-LD carries the page identity as well.
  html = html.replace(/"inLanguage":\s*"en"/g, `"inLanguage": "${lang}"`);
  html = html.replace(/"headline":\s*"[^"]*"/g, `"headline": ${JSON.stringify(title)}`);
  html = html.replace(/"url":\s*"https:\/\/thijnperd\.github\.io\/[^"]*"/g, `"url": ${JSON.stringify(localUrl)}`);

  // The note explaining that the page is English only has no place on a translation.
  html = html.replace(/\s*<p class="article__lang-note"[^>]*><\/p>/g, '');

  return html;
}

const report = [];
let failures = 0;
const englishSource = parseMd(SOURCE);

for (const [lang, mdFile] of Object.entries(LANGS)) {
  const md = parseMd(mdFile);
  for (const doc of DOCS) {
    const blocks = md.get(doc);
    if (!blocks) {
      report.push(`${lang} ${doc}: no blocks in ${mdFile}`);
      failures += 1;
      continue;
    }
    let html = readFileSync(doc, 'utf8');
    const slots = walk(html);

    if (slots.length !== blocks.length) {
      report.push(`${lang} ${doc}: ${slots.length} slots vs ${blocks.length} blocks`);
      failures += 1;
      const limit = Math.min(slots.length, blocks.length);
      for (let i = 0; i < limit; i += 1) {
        if (slots[i].kind !== blocks[i].marker) {
          report.push(`  first drift at #${i}: slot ${slots[i].kind} / block ${blocks[i].marker}`);
          break;
        }
      }
      continue;
    }

    let drift = 0;
    for (let i = 0; i < slots.length; i += 1) {
      if (slots[i].kind !== blocks[i].marker) {
        report.push(`${lang} ${doc}: #${i} slot ${slots[i].kind} vs block ${blocks[i].marker}`);
        drift += 1;
        if (drift > 2) break;
      }
    }
    if (drift) {
      failures += 1;
      continue;
    }

    if (selftest) {
      // Feed the English source back in: every slot must receive its own block, so
      // the normalised text of slot and block has to be identical.
      let diffs = 0;
      const english = englishSource.get(doc);
      for (let i = 0; i < slots.length; i += 1) {
        if (slots[i].kind === 'code') continue;
        const fromMarkup = decode(slots[i].inner);
        const fromBlock = english[i] ? english[i].text : '';
        if (fromMarkup !== fromBlock) {
          diffs += 1;
          if (diffs <= 3) {
            report.push(`  ${doc} #${i} [${slots[i].kind}]`);
            report.push(`    markup: ${fromMarkup.slice(0, 110)}`);
            report.push(`    block : ${fromBlock.slice(0, 110)}`);
          }
        }
      }
      if (diffs) {
        report.push(`${doc}: ${diffs} slot/block text differences`);
        failures += 1;
      }
      continue;
    }

    if (check) continue;

    for (let i = slots.length - 1; i >= 0; i -= 1) {
      const slot = slots[i];
      const block = blocks[i];
      if (slot.kind === 'code') continue;
      const replacement = renderText(block.text, slot.inner, slot.kind, lang);
      html = html.slice(0, slot.start) + replacement + html.slice(slot.end);
    }

    const title = `${blocks.find((b) => b.marker === 'h1')?.text ?? ''} · Thijn Köhne`;
    const lede = blocks.find((b) => b.marker === 'lede')?.text ?? '';
    const description = lede.length > 158 ? `${lede.slice(0, 155).replace(/[,;:]?\s+\S*$/, '')}…` : lede;

    html = localizeHead(html, { lang, path: doc, title, description });

    // Internal links inside the body and the pager point at the localized pages.
    for (const other of DOCS) {
      const url = `/${other.replace(/index\.html$/, '')}`;
      html = html.split(`href="${url}"`).join(`href="/${lang}${url}"`);
    }

    // An image tag must survive substitution with its src and a single alt.
    let brokenImages = 0;
    for (const tag of html.matchAll(/<img\b[^>]*>/g)) {
      const src = /\ssrc="/.test(tag[0]);
      const alts = tag[0].match(/\salt="/g)?.length ?? 0;
      if (!src || alts !== 1) brokenImages += 1;
    }
    if (brokenImages) {
      report.push(`${lang} ${doc}: ${brokenImages} image tag(s) lost src or gained a duplicate alt`);
      failures += 1;
      continue;
    }

    const out = `/${lang}/${doc}`;
    mkdirSync(dirname(out.slice(1)), { recursive: true });
    writeFileSync(out.slice(1), html);
  }
}

// The English pages advertise the same alternates, and the sitemap lists the new URLs.
if (!check && !selftest) {
  for (const doc of DOCS) {
    const p = doc.replace(/index\.html$/, '');
    const set = [
      ['en', `${ORIGIN}/${p}`],
      ['nl', `${ORIGIN}/nl/${p}`],
      ['de', `${ORIGIN}/de/${p}`],
      ['x-default', `${ORIGIN}/${p}`],
    ];
    const block = set
      .map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${href}" />`)
      .join('\n    ');
    let html = readFileSync(doc, 'utf8');
    html = html.replace(/\n\s*<link rel="alternate" hreflang="[^"]*"[^>]*>/g, '');
    html = html.replace(/(<link rel="canonical"[^>]*\/>)/, `$1\n    ${block}`);
    writeFileSync(doc, html);
  }

  const sitemapPath = 'public/sitemap.xml';
  let sitemap = readFileSync(sitemapPath, 'utf8');
  sitemap = sitemap.replace(/\s*<url>\s*<loc>[^<]*\/(?:nl|de)\/[^<]*<\/loc>[\s\S]*?<\/url>/g, '');
  const entries = [];
  for (const lang of ['nl', 'de']) {
    for (const doc of DOCS) {
      const url = `${ORIGIN}/${lang}/${doc.replace(/index\.html$/, '')}`;
      const priority = doc.startsWith('work/') ? '0.8' : '0.7';
      entries.push(
        `  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-11-27</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>${priority}</priority>\n  </url>`
      );
    }
  }
  sitemap = sitemap.replace('</urlset>', `${entries.join('\n')}\n</urlset>`);
  writeFileSync(sitemapPath, sitemap);
}

console.log(report.join('\n') || 'all documents align');
console.log(`${failures} document(s) with alignment problems`);
if (failures) process.exit(1);
