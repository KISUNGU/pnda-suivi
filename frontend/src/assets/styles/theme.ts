// frontend/src/assets/styles/theme.ts
//
// Thème PNDA S&E — transposition du système visuel ArchivÉo (glassmorphisme
// sur fond dégradé sombre) dans MUI. Les jetons ci-dessous sont ceux du
// modèle ASSURANCE-PAY/web/src/index.css : ils restent la source de vérité,
// et sont exposés en variables CSS par global.css pour les rares cas où une
// page a besoin de la couleur brute.
//
// Deux modes sont produits par la même fonction : le sombre porte l'identité,
// le clair sert la lecture des tableaux denses et les captures destinées aux
// bailleurs. Aucune couleur ne doit être écrite en dur dans les pages —
// passer par palette.module.*, palette.serie[] ou palette.etat.*.

import { createTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

export type ModeTheme = 'dark' | 'light';

/** Identité des modules — habillage uniquement, jamais les marques de données. */
export const COULEURS_MODULE = {
  scan: '#D91B5C',
  impression: '#92278F',
  acquisition: '#008B8B',
  base: '#7AC143',
  statistiques: '#F5A623',
  partage: '#F26522',
} as const;

/**
 * Série catégorielle validée sur la surface sombre #0f172a :
 * écarts CVD >= 8, écart vision normale >= 15, contraste >= 3:1.
 * À utiliser dans cet ordre pour les graphiques Recharts.
 */
export const COULEURS_SERIE = [
  '#3987E5',
  '#D95926',
  '#199E70',
  '#C98500',
  '#D55181',
  '#008300',
] as const;

/** Statuts — jamais réutilisés comme couleur de série. */
export const COULEURS_ETAT = {
  bon: '#0CA30C',
  vigilance: '#FAB219',
  serieux: '#EC835A',
  critique: '#D03B3B',
} as const;

/** Fonds de page, appliqués au body par global.css via [data-theme]. */
export const FONDS = {
  dark: [
    'radial-gradient(1200px 700px at 12% -8%, rgba(245, 166, 35, 0.10), transparent 60%)',
    'radial-gradient(900px 600px at 92% 4%, rgba(122, 193, 67, 0.09), transparent 62%)',
    'linear-gradient(160deg, #0F172A 0%, #1E293B 46%, #1E1B4B 100%)',
  ].join(', '),
  light: [
    'radial-gradient(1200px 700px at 12% -8%, rgba(245, 166, 35, 0.16), transparent 60%)',
    'radial-gradient(900px 600px at 92% 4%, rgba(122, 193, 67, 0.18), transparent 62%)',
    'linear-gradient(160deg, #F7FAF3 0%, #EEF3F7 46%, #F1F0FA 100%)',
  ].join(', '),
} as const;

interface JetonsSurface {
  /** Fond des surfaces vitrées. */
  verre: string;
  verreFort: string;
  /** Liseré des surfaces vitrées. */
  bordure: string;
  bordureFort: string;
  /** Ombre portée + reflet intérieur. */
  ombre: string;
  ombreFort: string;
  /** Fond du rail de navigation — opaque, sert de repère fixe. */
  rail: string;
  /** Fond des champs de saisie. */
  champ: string;
  texte: string;
  texteSecondaire: string;
  texteDesactive: string;
  separateur: string;
  survol: string;
}

const SURFACES: Record<ModeTheme, JetonsSurface> = {
  dark: {
    verre: 'rgba(255, 255, 255, 0.03)',
    verreFort: 'rgba(255, 255, 255, 0.06)',
    bordure: 'rgba(255, 255, 255, 0.10)',
    bordureFort: 'rgba(255, 255, 255, 0.15)',
    ombre: '0 0 44px rgba(15, 23, 42, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    ombreFort: '0 0 60px rgba(15, 23, 42, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    rail: 'linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(23, 20, 60, 0.92))',
    champ: 'rgba(2, 6, 23, 0.60)',
    texte: '#FFFFFF',
    texteSecondaire: '#94A3B8',
    texteDesactive: '#64748B',
    separateur: 'rgba(255, 255, 255, 0.10)',
    survol: 'rgba(255, 255, 255, 0.07)',
  },
  light: {
    verre: 'rgba(255, 255, 255, 0.72)',
    verreFort: 'rgba(255, 255, 255, 0.88)',
    bordure: 'rgba(15, 23, 42, 0.10)',
    bordureFort: 'rgba(15, 23, 42, 0.16)',
    ombre: '0 10px 34px -20px rgba(15, 23, 42, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.65)',
    ombreFort: '0 16px 44px -22px rgba(15, 23, 42, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.80)',
    // En clair, le rail doit rester plus froid et plus dense que la page,
    // sinon il s'y fond et la navigation perd son ancrage.
    rail: 'linear-gradient(180deg, rgba(233, 238, 245, 0.96), rgba(222, 229, 240, 0.94))',
    champ: 'rgba(255, 255, 255, 0.85)',
    texte: '#0F172A',
    texteSecondaire: '#475569',
    texteDesactive: '#94A3B8',
    separateur: 'rgba(15, 23, 42, 0.10)',
    survol: 'rgba(15, 23, 42, 0.05)',
  },
};

/**
 * Jetons de surface du thème courant. Une page qui a besoin de composer une
 * surface vitrée à la main les lit ici plutôt que de réécrire les valeurs :
 *   const { verre, bordure } = jetonsSurface(theme);
 */
export const jetonsSurface = (theme: Theme): JetonsSurface =>
  SURFACES[theme.palette.mode === 'light' ? 'light' : 'dark'];

/** Raccourci pour composer une surface vitrée dans un `sx`. */
export const surfaceVerre = (theme: Theme, fort = false) => {
  const s = jetonsSurface(theme);
  return {
    background: fort ? s.verreFort : s.verre,
    border: `1px solid ${fort ? s.bordureFort : s.bordure}`,
    backdropFilter: fort ? 'blur(28px)' : 'blur(20px)',
    WebkitBackdropFilter: fort ? 'blur(28px)' : 'blur(20px)',
    boxShadow: fort ? s.ombreFort : s.ombre,
  };
};

/**
 * Surface vitrée teintée par la couleur d'un module. Transpose les cartes de
 * couleur pleine du modèle : la teinte porte l'identité, le flou et le liseré
 * intérieur conservent la matière vitrée.
 */
export const surfaceTeintee = (teinte: string) => ({
  border: `1px solid color-mix(in oklab, ${teinte} 40%, transparent)`,
  background: `linear-gradient(152deg,
    color-mix(in oklab, ${teinte} 30%, transparent) 0%,
    color-mix(in oklab, ${teinte} 11%, transparent) 58%,
    color-mix(in oklab, ${teinte} 6%, transparent) 100%)`,
  backdropFilter: 'blur(26px)',
  WebkitBackdropFilter: 'blur(26px)',
  boxShadow: `0 14px 38px -18px color-mix(in oklab, ${teinte} 55%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.14)`,
});

export const createAppTheme = (mode: ModeTheme) => {
  const s = SURFACES[mode];
  const sombre = mode === 'dark';

  const base = createTheme({
    palette: {
      mode,
      primary: {
        main: COULEURS_MODULE.base,
        light: '#9BD46F',
        dark: '#5A9A2E',
        contrastText: sombre ? '#0B1220' : '#0B1220',
      },
      secondary: {
        main: COULEURS_MODULE.statistiques,
        light: '#FFC15C',
        dark: '#C9820D',
        contrastText: '#1A1206',
      },
      success: { main: COULEURS_ETAT.bon },
      warning: { main: COULEURS_ETAT.vigilance },
      error: { main: COULEURS_ETAT.critique },
      info: { main: COULEURS_SERIE[0] },
      background: {
        // Le fond de page est peint sur <body> par global.css : laisser le
        // conteneur transparent évite de recouvrir le dégradé et les blobs.
        default: 'transparent',
        paper: s.verre,
      },
      text: {
        primary: s.texte,
        secondary: s.texteSecondaire,
        disabled: s.texteDesactive,
      },
      divider: s.separateur,
      action: {
        hover: s.survol,
        selected: sombre ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.07)',
      },
    },

    typography: {
      fontFamily: '"Inter", -apple-system, "Segoe UI", Roboto, sans-serif',
      h1: { fontFamily: '"Poppins", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: '"Poppins", "Inter", sans-serif', fontWeight: 600, letterSpacing: '-0.018em' },
      h3: { fontFamily: '"Poppins", "Inter", sans-serif', fontWeight: 600, letterSpacing: '-0.015em' },
      h4: { fontFamily: '"Poppins", "Inter", sans-serif', fontWeight: 600, letterSpacing: '-0.012em' },
      h5: { fontFamily: '"Poppins", "Inter", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Poppins", "Inter", sans-serif', fontWeight: 600 },
      overline: { fontWeight: 700, letterSpacing: '0.06em', fontSize: 11 },
      button: { textTransform: 'none', fontWeight: 600 },
    },

    shape: { borderRadius: 8 },
  });

  return createTheme(base, {
    components: {
      // --- Surfaces ---------------------------------------------------------
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: s.verre,
            border: `1px solid ${s.bordure}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: s.ombre,
            borderRadius: 10,
          },
        },
      },

      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 11,
            transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              borderColor: s.bordureFort,
              boxShadow: s.ombreFort,
            },
          },
        },
      },

      // Menus, popovers et boîtes de dialogue flottent au-dessus du contenu :
      // une surface trop transparente y rend le texte illisible.
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: sombre ? 'rgba(17, 24, 44, 0.94)' : 'rgba(255, 255, 255, 0.97)',
            border: `1px solid ${s.bordureFort}`,
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            boxShadow: s.ombreFort,
          },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: sombre ? 'rgba(17, 24, 44, 0.94)' : 'rgba(255, 255, 255, 0.97)',
            border: `1px solid ${s.bordureFort}`,
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: sombre ? 'rgba(17, 24, 44, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${s.bordureFort}`,
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            boxShadow: s.ombreFort,
            borderRadius: 13,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: sombre ? 'rgba(17, 24, 44, 0.96)' : 'rgba(15, 23, 42, 0.94)',
            border: `1px solid ${s.bordureFort}`,
            color: '#FFFFFF',
            fontSize: 12,
            borderRadius: 6,
          },
        },
      },

      // Le rail de navigation est le seul panneau opaque : repère fixe pendant
      // que le contenu, lui, reste vitré.
      MuiDrawer: {
        styleOverrides: {
          paper: {
            background: s.rail,
            backgroundColor: 'transparent',
            border: 'none',
            backdropFilter: 'blur(22px)',
            WebkitBackdropFilter: 'blur(22px)',
            boxShadow: `1px 0 0 ${s.separateur}`,
            borderRadius: 0,
          },
        },
      },

      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'transparent' },
        styleOverrides: {
          root: {
            backgroundColor: sombre ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.62)',
            backgroundImage: 'none',
            borderBottom: `1px solid ${s.separateur}`,
            backdropFilter: 'blur(22px) saturate(140%)',
            WebkitBackdropFilter: 'blur(22px) saturate(140%)',
            boxShadow: 'none',
            borderRadius: 0,
            color: s.texte,
          },
        },
      },

      // --- Contrôles --------------------------------------------------------
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '9px 18px',
            transition: 'transform 140ms ease, background-color 140ms ease, border-color 140ms ease',
            '&:active': { transform: 'scale(0.98)' },
          },
          outlined: {
            borderColor: s.bordureFort,
            '&:hover': { borderColor: s.bordureFort, backgroundColor: s.survol, transform: 'translateY(-1px)' },
          },
          text: { '&:hover': { backgroundColor: s.survol } },
          contained: {
            border: `1px solid ${s.bordure}`,
            backgroundColor: s.verreFort,
            color: s.texte,
            '&:hover': { backgroundColor: s.survol, transform: 'translateY(-1px)' },
          },
          containedPrimary: {
            border: `1px solid ${COULEURS_MODULE.statistiques}66`,
            background: `linear-gradient(135deg, ${COULEURS_MODULE.statistiques}40, ${COULEURS_MODULE.base}33)`,
            color: s.texte,
            '&:hover': {
              background: `linear-gradient(135deg, ${COULEURS_MODULE.statistiques}59, ${COULEURS_MODULE.base}4D)`,
              transform: 'translateY(-1px)',
            },
          },
          containedError: {
            border: `1px solid ${COULEURS_ETAT.critique}73`,
            background: `${COULEURS_ETAT.critique}26`,
            color: sombre ? '#FFC9C4' : '#8A1710',
            '&:hover': { background: `${COULEURS_ETAT.critique}3D` },
          },
        },
      },

      MuiIconButton: {
        styleOverrides: {
          root: { color: s.texteSecondaire, '&:hover': { backgroundColor: s.survol, color: s.texte } },
        },
      },

      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: s.champ,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: s.bordure },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: s.bordureFort },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: COULEURS_SERIE[0],
              borderWidth: 1,
            },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${COULEURS_SERIE[0]}33` },
          },
          input: { '&::placeholder': { color: s.texteDesactive, opacity: 1 } },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { color: s.texteSecondaire, '&.Mui-focused': { color: COULEURS_SERIE[0] } } },
      },
      MuiSelect: { styleOverrides: { icon: { color: s.texteSecondaire } } },

      // --- Données ----------------------------------------------------------
      MuiTableContainer: {
        styleOverrides: { root: { backgroundColor: 'transparent', border: 'none', boxShadow: 'none' } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${s.separateur}`, color: s.texte },
          head: {
            backgroundColor: sombre ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.035)',
            color: s.texteSecondaire,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          },
          // Les colonnes de chiffres doivent s'aligner : rappel visuel utile
          // dès qu'une page pose align="right".
          alignRight: { fontVariantNumeric: 'tabular-nums' },
        },
      },
      MuiTableRow: {
        styleOverrides: { root: { '&:hover': { backgroundColor: s.survol } } },
      },

      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 600 },
          outlined: { borderColor: s.bordureFort },
          filled: { backgroundColor: s.verreFort, color: s.texte },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: s.separateur } } },
      MuiLinearProgress: {
        styleOverrides: {
          root: { borderRadius: 999, height: 8, backgroundColor: s.survol },
          bar: { borderRadius: 999 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, border: `1px solid ${s.bordure}`, backdropFilter: 'blur(18px)' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: { borderRadius: 7, '&:hover': { backgroundColor: s.survol } },
        },
      },
      MuiTabs: {
        styleOverrides: { indicator: { height: 3, borderRadius: 3, backgroundColor: COULEURS_MODULE.statistiques } },
      },
      MuiTab: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600, color: s.texteSecondaire, '&.Mui-selected': { color: s.texte } },
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          // Le fond de page vit dans global.css (dégradé + blobs) : CssBaseline
          // ne doit pas le recouvrir d'un aplat.
          body: { backgroundColor: 'transparent' },
        },
      },
    },
  });
};

/** Thème par défaut, conservé pour les imports existants. */
export const theme = createAppTheme('dark');
