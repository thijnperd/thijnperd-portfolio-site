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
        nlWorkDither: page('./nl/work/dither-studio/index.html'),
        nlWorkCortex: page('./nl/work/cortex/index.html'),
        nlWorkW3Plan: page('./nl/work/w3plan/index.html'),
        nlWorkPapersPlease: page('./nl/work/papersplease/index.html'),
        nlWritingDither: page('./nl/writing/dithering-the-hero/index.html'),
        nlWritingPlanner: page('./nl/writing/school-planner-distribution/index.html'),
        nlWritingPlainFiles: page('./nl/writing/plain-files/index.html'),
        deWorkDither: page('./de/work/dither-studio/index.html'),
        deWorkCortex: page('./de/work/cortex/index.html'),
        deWorkW3Plan: page('./de/work/w3plan/index.html'),
        deWorkPapersPlease: page('./de/work/papersplease/index.html'),
        deWritingDither: page('./de/writing/dithering-the-hero/index.html'),
        deWritingPlanner: page('./de/writing/school-planner-distribution/index.html'),
        deWritingPlainFiles: page('./de/writing/plain-files/index.html'),
      },
    },
  },
});
