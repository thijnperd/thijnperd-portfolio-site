import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
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
