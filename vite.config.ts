import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'chrome-extension-build',
      closeBundle() {
        const distDir = resolve(__dirname, 'dist');

        // Copy manifest.json
        copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'));

        // Copy icons
        const iconsDir = resolve(distDir, 'icons');
        if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
        for (const icon of ['icon16.png', 'icon48.png', 'icon128.png']) {
          const src = resolve(__dirname, 'public/icons', icon);
          if (existsSync(src)) copyFileSync(src, resolve(iconsDir, icon));
        }

        // Create empty content.css
        writeFileSync(resolve(distDir, 'content.css'), '/* styles injected via shadow DOM */');
      },
    },
  ],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext',
    modulePreload: false,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        format: 'es',
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background.js';
          if (chunkInfo.name === 'content') return 'content.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
