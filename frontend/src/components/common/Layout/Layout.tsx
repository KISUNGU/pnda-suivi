// frontend/src/components/common/Layout/Layout.tsx
import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { COULEURS_MODULE } from '../../../assets/styles/theme';
import { TransitionEcran } from '../Motion/motion';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Blobs morphiques d'arrière-plan. Purement décoratifs : masqués aux lecteurs
 * d'écran, sans interception de clic, et animés en CSS (voir global.css) pour
 * n'ajouter ni dépendance ni travail de mise en page.
 */
const Fond: React.FC = () => (
  <Box
    aria-hidden
    sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
    }}
  >
    <Box
      className="blob"
      sx={{
        top: -160,
        left: -128,
        width: 520,
        height: 520,
        backgroundColor: COULEURS_MODULE.statistiques,
      }}
    />
    <Box
      className="blob"
      sx={{
        right: -144,
        bottom: -176,
        width: 460,
        height: 460,
        backgroundColor: COULEURS_MODULE.base,
        animationDelay: '1.4s',
      }}
    />
    <Box
      className="blob"
      sx={{
        top: '44%',
        left: '52%',
        width: 380,
        height: 380,
        backgroundColor: COULEURS_MODULE.acquisition,
        animationDelay: '2.6s',
      }}
    />
  </Box>
);

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => setSidebarOpen((ouvert) => !ouvert);

  return (
    <Box sx={{ position: 'relative', display: 'flex', minHeight: '100vh' }}>
      <Fond />

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isMobile ? 'temporary' : 'permanent'}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          width: { md: sidebarOpen ? 'calc(100% - 280px)' : '100%' },
          transition: 'width 0.3s',
        }}
      >
        <Header onMenuClick={toggleSidebar} />

        <Box
          component="main"
          sx={{
            flex: 1,
            px: { xs: 2, sm: 3 },
            py: { xs: 2.5, sm: 3.5 },
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {/* Le contenu est borné : au-delà, les tableaux s'étirent sur toute
              la largeur de l'écran et deviennent pénibles à parcourir.
              Seul le contenu est animé — le rail et l'en-tête restent montés,
              donc l'état du menu survit à la navigation. */}
          <Box sx={{ mx: 'auto', maxWidth: 1320 }}>
            <TransitionEcran cle={location.pathname}>{children}</TransitionEcran>
          </Box>
        </Box>

        <Box
          component="footer"
          className="sans-impression"
          sx={{
            px: { xs: 2, sm: 3.5 },
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
            fontSize: 11,
            lineHeight: 1.7,
            color: 'text.disabled',
          }}
        >
          PNDA — Système de Suivi &amp; Évaluation · Version 2.0 © SAMANTOR 2026. Les droits affichés sont indicatifs :
          l&apos;API revalide chaque opération.
        </Box>
      </Box>
    </Box>
  );
};
