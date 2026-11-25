import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: { host: true },
  preview: { host: true },
  test: { environment: 'node' },
  build: {
    // 古い index.html が残っている端末でも 404 にならないよう、ファイル名にハッシュを付けない
    // (GitHub Pages は公開のたびに旧ファイルを消すため、ハッシュ付きだと旧 index が真っ白になる)
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/app[extname]',
      },
    },
  },
});
