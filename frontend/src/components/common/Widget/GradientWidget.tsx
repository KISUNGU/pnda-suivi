// frontend/src/components/common/Widget/GradientWidget.tsx
//
// Tuile de synthèse. C'est l'élément le plus répété du logiciel : on la
// retrouve en haut de chaque tableau de bord, cinq ou six fois par écran.
//
// Elle reprend la carte de couleur pleine du modèle transposée en verre
// teinté : la couleur porte la nature de l'indicateur (bon, vigilance,
// critique…), le flou et le liseré intérieur conservent la matière. Le chiffre
// rejoint sa valeur au lieu de s'afficher d'un coup, ce qui désigne à l'œil
// ce qui a bougé depuis la dernière visite.

import React from 'react';
import { Box, Typography, Paper, useTheme } from '@mui/material';
import GoogleIcon from '../GoogleIcon';
import { COULEURS_ETAT, COULEURS_MODULE, COULEURS_SERIE } from '../../../assets/styles/theme';
import { Interactive, NombreAnime, RESSORT, creerMotion, motion, useReducedMotion } from '../Motion/motion';

type TonWidget = 'primary' | 'success' | 'warning' | 'info' | 'danger';

interface GradientWidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  detail?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period?: string;
  };
  color?: TonWidget;
  onClick?: () => void;
  /** Rang dans une grille : sert uniquement à échelonner l'entrée. */
  index?: number;
  /** Progression 0–100 affichée en soubassement de la tuile. */
  progression?: number;
}

/** Une teinte par nature d'indicateur — jamais réutilisée comme couleur de série. */
const TEINTES: Record<TonWidget, string> = {
  primary: COULEURS_MODULE.base,
  success: COULEURS_ETAT.bon,
  warning: COULEURS_ETAT.vigilance,
  info: COULEURS_SERIE[0],
  danger: COULEURS_ETAT.critique,
};

const MotionPaper = creerMotion(Paper);

export const GradientWidget: React.FC<GradientWidgetProps> = ({
  title,
  value,
  icon,
  detail,
  trend,
  color = 'primary',
  onClick,
  index = 0,
  progression,
}) => {
  const theme = useTheme();
  const reduit = useReducedMotion();
  const teinte = TEINTES[color];
  const sombre = theme.palette.mode === 'dark';

  // Les valeurs numériques sont animées ; les valeurs déjà formatées
  // (« 64 % », « N/D ») sont affichées telles quelles.
  const numerique = typeof value === 'number' ? value : null;
  const pourcentage = typeof value === 'string' && /^\d+(?:[.,]\d+)?\s*%$/.test(value)
    ? Number(value.replace(/\s*%$/, '').replace(',', '.'))
    : null;

  return (
    <Interactive actif={Boolean(onClick)} sx={{ width: '100%', height: '100%' }}>
      <MotionPaper
        onClick={onClick}
        initial={reduit ? false : { opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...RESSORT.doux, delay: reduit ? 0 : index * 0.06 }}
        sx={{
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          height: 168,
          p: 2.25,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2.1,
          cursor: onClick ? 'pointer' : 'default',
          // Verre teinté : la couleur ne remplit pas, elle imprègne.
          border: `1px solid color-mix(in oklab, ${teinte} ${sombre ? 40 : 46}%, transparent)`,
          background: `linear-gradient(152deg,
            color-mix(in oklab, ${teinte} ${sombre ? 30 : 26}%, transparent) 0%,
            color-mix(in oklab, ${teinte} ${sombre ? 11 : 13}%, transparent) 58%,
            color-mix(in oklab, ${teinte} ${sombre ? 6 : 8}%, transparent) 100%)`,
          backdropFilter: 'blur(26px) saturate(140%)',
          WebkitBackdropFilter: 'blur(26px) saturate(140%)',
          boxShadow: `0 14px 38px -18px color-mix(in oklab, ${teinte} 55%, transparent),
            inset 0 1px 0 rgba(255, 255, 255, ${sombre ? 0.14 : 0.55})`,
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          '&:hover': {
            borderColor: `color-mix(in oklab, ${teinte} 68%, transparent)`,
            boxShadow: `0 22px 48px -20px color-mix(in oklab, ${teinte} 68%, transparent),
              inset 0 1px 0 rgba(255, 255, 255, ${sombre ? 0.2 : 0.7})`,
          },
        }}
      >
        {/* Halo d'angle : rappelle le blob d'arrière-plan à l'échelle de la tuile. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: -70,
            right: -50,
            width: 190,
            height: 190,
            borderRadius: '50%',
            background: teinte,
            opacity: sombre ? 0.16 : 0.2,
            filter: 'blur(46px)',
            pointerEvents: 'none',
          }}
        />

        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 2, height: '100%' }}>
          <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                mb: 0.75,
                minHeight: 20,
                fontSize: '0.78rem',
                lineHeight: 1.25,
                pr: 0.5,
              }}
            >
              {title}
            </Typography>

            <Typography
              component="div"
              sx={{
                fontWeight: 700,
                mb: 0.75,
                lineHeight: 1.05,
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                fontVariantNumeric: 'tabular-nums',
                color: 'text.primary',
                letterSpacing: '-0.03em',
                // À 100 % de zoom, h4 déborde dans une tuile de 168 px (100 %, milliers).
                fontSize: (() => {
                  const brut = numerique ?? pourcentage ?? String(value);
                  const longueur = String(brut).replace(/\s/g, '').length;
                  if (longueur >= 7) return 'clamp(1.05rem, 2.1vw, 1.35rem)';
                  if (longueur >= 5 || (pourcentage !== null && pourcentage >= 100)) {
                    return 'clamp(1.2rem, 2.4vw, 1.55rem)';
                  }
                  return 'clamp(1.35rem, 2.8vw, 1.75rem)';
                })(),
              }}
            >
              {numerique !== null ? (
                <NombreAnime valeur={numerique} />
              ) : pourcentage !== null ? (
                <NombreAnime valeur={pourcentage} suffixe="%" />
              ) : (
                value
              )}
            </Typography>

            {detail && !trend && (
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2, mt: 'auto' }}>
                {detail}
              </Typography>
            )}

            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 'auto' }}>
                <GoogleIcon
                  name={trend.direction === 'up' ? 'trending_up' : 'trending_down'}
                  size={16}
                  sx={{ color: trend.direction === 'up' ? COULEURS_ETAT.bon : COULEURS_ETAT.critique }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.2 }}>
                  {trend.value} % {trend.period ? `vs ${trend.period}` : ''}
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            className="gw-icon"
            sx={{
              width: 52,
              height: 52,
              borderRadius: 1.75,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: teinte,
              border: `1px solid color-mix(in oklab, ${teinte} 45%, transparent)`,
              background: `color-mix(in oklab, ${teinte} ${sombre ? 18 : 16}%, transparent)`,
              backdropFilter: 'blur(10px)',
              boxShadow: `inset 0 1px 0 rgba(255,255,255,${sombre ? 0.16 : 0.5})`,
              '& .material-symbols-rounded': { fontSize: '36px' },
            }}
          >
            {icon}
          </Box>
        </Box>

        {/* Soubassement de progression — la tuile porte alors sa propre jauge. */}
        {progression !== undefined && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 4,
              bgcolor: 'action.hover',
            }}
          >
            <motion.div
              initial={reduit ? false : { scaleX: 0 }}
              animate={{ scaleX: Math.min(Math.max(progression, 0), 100) / 100 }}
              transition={{ ...RESSORT.ample, delay: reduit ? 0 : 0.15 + index * 0.06 }}
              style={{ height: '100%', originX: 0, background: teinte }}
            />
          </Box>
        )}
      </MotionPaper>
    </Interactive>
  );
};
