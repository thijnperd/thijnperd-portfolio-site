import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base keeps the static build portable (root domain, GitHub Pages subpath,
  // or opened from a static file server) without rewriting references.
  base: './',
});
