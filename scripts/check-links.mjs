/**
 * Internal link check for the built site.
 *
 * It verifies hrefs, image sources (including srcset), fragments and every
 * sitemap URL against dist/. External URLs are deliberately not fetched: the
 * deploy should not fail because a third-party site rate-limits CI.
 */
import { existsSync, statSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("dist");
const siteHost = "thijnperd.github.io";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

if (!existsSync(root)) {
  console.error("dist/ is missing. Run npm run build first.");
  process.exit(1);
}

const htmlFiles = (await walk(root)).filter((file) => file.endsWith(".html"));
if (htmlFiles.length === 0) {
  console.error("No HTML found in dist/.");
  process.exit(1);
}

const idsByFile = new Map();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const ids = new Set();
  for (const match of html.matchAll(/\b(?:id|name)="([^"]+)"/g)) ids.add(match[1]);
  idsByFile.set(file, ids);
}

const errors = [];
let checked = 0;

const relative = (file) => path.relative(root, file).replaceAll(path.sep, "/");
const isExternal = (url) => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url);

function resolveTarget(sourceFile, raw) {
  const hashIndex = raw.indexOf("#");
  const fragment = hashIndex >= 0 ? raw.slice(hashIndex + 1) : "";
  const pathPart = raw.split("#")[0].split("?")[0];
  if (!pathPart) return { fragment, target: sourceFile, sameFile: true };

  let target;
  if (pathPart.startsWith("/")) {
    target = path.join(root, pathPart.replace(/^\/+/, ""));
  } else {
    target = path.resolve(path.dirname(sourceFile), pathPart);
  }

  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    // Keep the raw path when it contains a malformed escape.
  }

  const candidates = decoded.endsWith("/") || decoded === root
    ? [path.join(decoded, "index.html")]
    : [decoded, `${decoded}.html`, path.join(decoded, "index.html")];

  const found = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return { fragment, target: found ?? decoded, sameFile: false };
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const urls = [];

  for (const match of html.matchAll(/\b(?:href|src)="([^"]*)"/g)) urls.push(match[1]);
  for (const match of html.matchAll(/\bsrcset="([^"]*)"/g)) {
    for (const part of match[1].split(",")) {
      const url = part.trim().split(/\s+/)[0];
      if (url) urls.push(url);
    }
  }

  for (const raw of urls) {
    if (!raw || isExternal(raw)) continue;
    const { fragment, target, sameFile } = resolveTarget(file, raw);

    if (!existsSync(target) || !statSync(target).isFile()) {
      errors.push(`${relative(file)} -> ${raw}`);
      continue;
    }

    checked += 1;

    if (fragment && target.endsWith(".html")) {
      const ids = idsByFile.get(target);
      if (ids && !ids.has(fragment)) {
        errors.push(`${relative(file)} -> ${raw} (missing #${fragment})`);
      }
    } else if (fragment && sameFile && !idsByFile.get(file)?.has(fragment)) {
      errors.push(`${relative(file)} -> ${raw} (missing #${fragment})`);
    }
  }
}

const sitemapFile = path.join(root, "sitemap.xml");
if (existsSync(sitemapFile)) {
  const sitemap = await readFile(sitemapFile, "utf8");
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(match[1]);
    if (url.hostname !== siteHost) continue;
    const target = url.pathname.endsWith("/")
      ? path.join(root, url.pathname.replace(/^\/+/, ""), "index.html")
      : path.join(root, url.pathname.replace(/^\/+/, ""));
    if (!existsSync(target)) errors.push(`sitemap.xml -> ${match[1]}`);
  }
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} broken internal link(s):`);
  for (const error of [...new Set(errors)]) console.error(`  ${error}`);
  process.exit(1);
}

console.log(`✓ ${checked} internal links across ${htmlFiles.length} pages resolve.`);
