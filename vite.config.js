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
});
