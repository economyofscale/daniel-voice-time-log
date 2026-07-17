import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the built app also works from file:// in Electron.
  base: './',
  server: {
    watch: {
      // Electron build output — watching it crashes the dev server.
      ignored: ['**/release/**'],
    },
  },
  optimizeDeps: {
    // transformers.js must not be pre-bundled (WASM/worker assets), but its
    // CJS runtime onnxruntime-web must be, or it crashes in dev.
    exclude: ['@xenova/transformers'],
    include: ['onnxruntime-web'],
  },
});
