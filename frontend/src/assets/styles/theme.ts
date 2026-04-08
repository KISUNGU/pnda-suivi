// frontend/src/assets/styles/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32',      // Vert forêt
      light: '#81C784',     // Vert tendre
      dark: '#1B5E20',      // Vert foncé
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#4CAF50',      // Vert prairie
      light: '#C8E6C9',
      dark: '#388E3C',
    },
    success: {
      main: '#00C853',
    },
    warning: {
      main: '#FFD600',
    },
    error: {
      main: '#D32F2F',
    },
    background: {
      default: '#F1F8E9',   // Vert clair
      paper: '#FFFFFF',
    },
    text: {
      primary: '#212121',
      secondary: '#616161',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Poppins", "Inter", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Poppins", "Inter", sans-serif',
      fontWeight: 600,
    },
    h3: {
      fontFamily: '"Poppins", "Inter", sans-serif',
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '10px 20px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2E7D32, #81C784)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1B5E20, #66BB6A)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          border: '1px solid rgba(46,125,50,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
  },
});