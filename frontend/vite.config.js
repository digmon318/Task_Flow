import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// En desarrollo (npm run dev) las llamadas a /api se envían al backend en localhost:3000,
// igual que hace nginx dentro de Docker.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_BACKEND || 'http://localhost:3000', rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
});
