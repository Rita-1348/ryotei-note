import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Artifact 用: JS と CSS を1本ずつにまとめる(scripts/make-artifact.mjs が1枚のHTMLに結合する)
export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: false,
  build: {
    outDir: 'dist-artifact',
    cssCodeSplit: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' } },
  },
});
