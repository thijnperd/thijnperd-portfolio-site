import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // The site is a GitHub Pages user site served from the domain root, and the
  // case-study pages live two levels deep. A root base keeps every asset URL
  // correct on all of them.
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
        writingPlainFiles: page('./writing/plain-files/index.html'),
        colophon: page('./colophon/index.html'),
      },
    },
  },
});
