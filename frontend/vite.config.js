import { defineConfig } from 'vite';

export default defineConfig({
  base: '/webapp_project/',
  build: {
    outDir: 'dist',
    minify: 'esbuild',
    sourcemap: false
  },
  server: {
    port: 5173,
    open: true
  }
});
