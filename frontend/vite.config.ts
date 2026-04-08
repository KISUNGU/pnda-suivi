// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      'react-router-dom',
      'axios',
      'recharts',
      'leaflet',
      'react-leaflet',
      'exceljs',
    ],
  },
  server: {
    port: 5173,
    hmr: {
      overlay: true,
    },
  },
});