// frontend/src/context/ThemeModeContext.tsx
//
// Bascule sombre / clair. Le sombre porte l'identité du logiciel et reste le
// défaut ; le clair sert la lecture des tableaux denses et les captures
// destinées aux bailleurs.
//
// Le mode est écrit sur <html data-theme="..."> pour que global.css puisse
// changer le fond de page, et mémorisé par poste dans localStorage. Aucun
// appel réseau : c'est un confort d'affichage, pas une préférence de compte.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme, type ModeTheme } from '../assets/styles/theme';

const CLE_STOCKAGE = 'pnda:theme';

interface ThemeModeContextType {
  mode: ModeTheme;
  basculer: () => void;
  definir: (mode: ModeTheme) => void;
}

const ThemeModeContext = createContext<ThemeModeContextType | undefined>(undefined);

const lireModeInitial = (): ModeTheme => {
  try {
    const stocke = localStorage.getItem(CLE_STOCKAGE);
    if (stocke === 'light' || stocke === 'dark') {
      return stocke;
    }
  } catch {
    // Navigation privée ou stockage bloqué : on retombe sur le défaut.
  }

  return 'dark';
};

export const ThemeModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ModeTheme>(lireModeInitial);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;

    try {
      localStorage.setItem(CLE_STOCKAGE, mode);
    } catch {
      // Sans persistance, la bascule reste valable pour la session en cours.
    }
  }, [mode]);

  const definir = useCallback((prochain: ModeTheme) => setMode(prochain), []);
  const basculer = useCallback(() => setMode((actuel) => (actuel === 'dark' ? 'light' : 'dark')), []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const valeur = useMemo(() => ({ mode, basculer, definir }), [mode, basculer, definir]);

  return (
    <ThemeModeContext.Provider value={valeur}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode doit être utilisé dans un ThemeModeProvider');
  }

  return context;
};
