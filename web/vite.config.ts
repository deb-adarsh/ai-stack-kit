import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Web root only — do not widen to repo root (avoids accidentally bundling the CLI / shared TS). */
const webRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: webRoot,
  publicDir: 'public',
  base: './',
  server: {
    fs: {
      strict: true,
      allow: [webRoot],
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
