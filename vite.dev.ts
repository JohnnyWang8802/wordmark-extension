import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Dev server config: serves popup as a regular web page for preview
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/popup'),
  publicDir: resolve(__dirname, 'public'),
  server: {
    port: 5173,
    open: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
