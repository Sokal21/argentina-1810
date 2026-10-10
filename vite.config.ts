import { defineConfig } from 'vitest/config';
import { claudeVoice } from './tools/claude_voice';

// The sprites live in assets/ (the Python tools write there), so that folder
// is served as the site root: assets/machi/x.png is loaded as machi/x.png.
// `base: './'` keeps the build working from any sub-path, e.g. GitHub Pages.
export default defineConfig({
  base: './',
  publicDir: 'assets',
  build: { chunkSizeWarningLimit: 2000 },
  // And by Claude, through the command-line program on this machine: /claude.
  plugins: [claudeVoice()],
  // While developing, the characters one can talk to are voiced by a model
  // running on this machine: /ollama is passed on to it.
  server: { proxy: { '/ollama': { target: 'http://127.0.0.1:11434', changeOrigin: true, rewrite: path => path.replace(/^\/ollama/, '') } } },
  test: { include: ['tests/**/*.test.ts'] },
});
