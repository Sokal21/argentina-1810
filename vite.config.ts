import { defineConfig } from 'vitest/config';

// The sprites live in assets/ (the Python tools write there), so that folder
// is served as the site root: assets/machi/x.png is loaded as machi/x.png.
// `base: './'` keeps the build working from any sub-path, e.g. GitHub Pages.
export default defineConfig({
  base: './',
  publicDir: 'assets',
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/**/*.test.ts'] },
});
