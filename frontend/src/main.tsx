// frontend/src/main.tsx
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Buffer = Buffer;
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/styles/global.css';
// Polices auto-hébergées : l'application ne dépend plus de fonts.googleapis.com
// (icônes et textes fonctionnent hors ligne / avec une connexion instable).
import 'material-symbols/rounded.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);