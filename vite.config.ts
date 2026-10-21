import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: { outDir: 'dist/client', target: 'es2022', cssCodeSplit: true },
  server: { proxy: { '/api': 'http://localhost:8080' } },
});
