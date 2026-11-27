import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

// The writing index advertises how many essays there are and how long they take.
// Both are read back out of the page itself at build time, so adding a fourth
// essay cannot leave a stale count behind in the hero.
function writingIndexMeta() {
  return {
    name: 'writing-index-meta',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // Windows hands this over with backslashes, so normalise before matching.
        const filename = String(ctx.filename || '').replace(/\\/g, '/');
        if (!filename.endsWith('/writing/index.html')) return html;
        const count = (html.match(/<article class="writing-item">/g) || []).length;
        const minutes = [...html.matchAll(/class="writing-item__meta"[^>]*>([^<]*)</g)]
          .map((match) => Number((match[1].match(/(\d+)\s*min/) || [])[1] || 0))
          .reduce((total, value) => total + value, 0);
        return html
          .replace(/(<dd data-writing-count>)[^<]*(<\/dd>)/, `$1${String(count).padStart(2, '0')}$2`)
          .replace(/(<dd data-writing-minutes>)[^<]*(<\/dd>)/, `$1${minutes} min$2`);
      },
    },
  };
}

export default defineConfig({
  plugins: [writingIndexMeta()],
  // Root base keeps asset URLs valid on two-level case study routes.
  base: '/',
  build: {
    rollupOptions: {
      input: {
        home: page('./index.html'),
        notFound: page('./404.html'),
        workDither: page('./work/dither-studio/index.html'),
        workCortex: page('./work/cortex/index.html'),
        workW3Plan: page('./work/w3plan/index.html'),
        workPapersPlease: page('./work/papersplease/index.html'),
        writing: page('./writing/index.html'),
        writingDither: page('./writing/dithering-the-hero/index.html'),
        writingPlanner: page('./writing/school-planner-distribution/index.html'),
        writingPlainFiles: page('./writing/plain-files/index.html'),
        colophon: page('./colophon/index.html'),
        cv: page('./cv/index.html'),
      },
    },
  },
});
