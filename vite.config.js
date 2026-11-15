import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the shop runs on :5173 and talks to the API on :5000.
const api = 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': api,
      '/media': api,
      '/api-docs': api,
      '/socket.io': { target: api, ws: true },
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 900,
  },
});
