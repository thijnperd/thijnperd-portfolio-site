// Builds /writing/feed.xml from the essay pages themselves, so a published date or a
// description can never disagree with what the page says.

import { readFileSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://thijnperd.github.io';
const FEED = 'public/writing/feed.xml';
const SITEMAP = 'public/sitemap.xml';

const ESSAYS = [
  'writing/school-planner-distribution/index.html',
  'writing/dithering-the-hero/index.html',
  'writing/plain-files/index.html',
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function readEssay(file) {
  const html = readFileSync(file, 'utf8');
  const title = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1];
  const description = (html.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1];
  const date = (html.match(/data-i18n="article\.published">[^<]*<\/dt>\s*<dd>([^<]*)<\/dd>/) || [])[1];
  if (!title || !description || !date) {
    throw new Error(`${file}: could not read title, description or published date`);
  }
  const parsed = new Date(`${date.trim()} 00:00:00 UTC`);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${file}: unreadable date "${date}"`);
  return {
    url: `${ORIGIN}/${file.replace(/index\.html$/, '')}`,
    title: title.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    description: description.trim(),
    date: parsed,
  };
}

const rfc822 = (date) => {
  const pad = (value) => String(value).padStart(2, '0');
  return (
    `${DAYS[date.getUTCDay()]}, ${pad(date.getUTCDate())} ${MONTHS[date.getUTCMonth()]} ` +
    `${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:00 +0000`
  );
};

const iso = (date) => date.toISOString().slice(0, 10);

const entries = ESSAYS.map(readEssay).sort((a, b) => b.date - a.date);

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Thijn Köhne — writing</title>
    <link>${ORIGIN}/writing/</link>
    <description>Notes on rendering, local-first software and how the projects are built.</description>
    <language>en</language>
    <lastBuildDate>${rfc822(entries[0].date)}</lastBuildDate>
    <atom:link href="${ORIGIN}/writing/feed.xml" rel="self" type="application/rss+xml" />
${entries
  .map(
    (entry) => `    <item>
      <title>${escape(entry.title)}</title>
      <link>${entry.url}</link>
      <guid isPermaLink="true">${entry.url}</guid>
      <pubDate>${rfc822(entry.date)}</pubDate>
      <description>${escape(entry.description)}</description>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>
`;

// The sitemap can carry the same dates, so search engines see the essays' freshness.
let sitemap = readFileSync(SITEMAP, 'utf8');
for (const entry of entries) {
  const block = new RegExp(`(<url>\\s*<loc>${entry.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>)(\\s*<lastmod>[^<]*</lastmod>)?`);
  sitemap = sitemap.replace(block, `$1\n    <lastmod>${iso(entry.date)}</lastmod>`);
}

const check = process.argv.includes('--check');
const feedNow = readFileSync(FEED, 'utf8');
const sitemapNow = readFileSync(SITEMAP, 'utf8');

if (feedNow === feed && sitemapNow === sitemap) {
  console.log(`feed and sitemap are current (${entries.length} essays)`);
  process.exit(0);
}

if (check) {
  console.error('feed or sitemap is out of date: run node scripts/build-feed.mjs');
  process.exit(1);
}

writeFileSync(FEED, feed);
writeFileSync(SITEMAP, sitemap);
console.log(`wrote ${FEED} (${entries.length} essays) and updated sitemap dates`);
