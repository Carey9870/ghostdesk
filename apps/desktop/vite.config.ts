// path: apps/desktop/vite.config.ts
// purpose: Vite build configuration for the Tauri webview (fixed dev port, React, Tailwind v4, "@" alias).
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 1420, strictPort: true, host: false },
  build: { target: 'es2022', sourcemap: false },
});
