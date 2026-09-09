// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    /**
     * Une seule copie de React dans l'application, quoi qu'il arrive.
     *
     * La racine du dépôt porte un node_modules résiduel avec React 18 ; une
     * dépendance qui n'est pas installée dans frontend/ y est résolue en
     * remontant l'arborescence, et embarque alors ce React 18 avec elle. Deux
     * React dans la même page font échouer tous les hooks de cette dépendance
     * (« Invalid hook call », resolveDispatcher renvoie null).
     *
     * `dedupe` force la résolution vers le React de frontend/ ; `alias` fige
     * le chemin pour que même une résolution remontante y aboutisse.
     */
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },

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
      'framer-motion',
    ],
  },

  server: {
    port: 5173,
    hmr: {
      overlay: true,
    },
  },
});
