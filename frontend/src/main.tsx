// frontend/src/main.tsx
import { Buffer } from 'buffer';
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Buffer = Buffer;
}
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './assets/styles/global.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);