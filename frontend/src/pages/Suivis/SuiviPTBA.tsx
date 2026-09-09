// frontend/src/pages/Suivis/SuiviPTBA.tsx
//
// Suivi du Plan de Travail et Budget Annuel. La page répond d'abord à trois
// questions — où en est-on globalement, quelles sous-composantes décrochent,
// quelles activités bloquent — avant de donner accès au détail ligne à ligne.
// Le tableau existe toujours, mais il passe derrière : c'est une pièce
// justificative, pas la vue de travail.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import ptbaService, { type PtbaSuivi, type PtbaActivite } from '../../services/ptba.service';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { COULEURS_ETAT, COULEURS_MODULE } from '../../assets/styles/theme';
import { Apparition, Echelonne, Element, NombreAnime, RESSORT, motion, useReducedMotion } from '../../components/common/Motion/motion';

// ─── Bandes d'exécution ───────────────────────────────────────
//
// Quatre bandes, alignées sur la lecture qu'en fait la Coordination : au-delà
// de 85 % l'activité est tenue, sous 25 % elle est en souffrance. Les couleurs
// viennent des jetons d'état — jamais de la série catégorielle.

type Bande = 'tenu' | 'correct' | 'vigilance' | 'souffrance' | 'inconnu';

const BANDES: Record<Bande, { libelle: string; couleur: string }> = {
  tenu: { libelle: 'Tenu (≥ 85 %)', couleur: COULEURS_ETAT.bon },
  correct: { libelle: 'Correct (50–85 %)', couleur: '#8BC34A' },
  vigilance: { libelle: 'À surveiller (25–50 %)', couleur: COULEURS_ETAT.vigilance },
  souffrance: { libelle: 'En souffrance (< 25 %)', couleur: COULEURS_ETAT.critique },
  inconnu: { libelle: 'Non renseigné', couleur: '#8B93A7' },
};

const bande = (taux: number | null): Bande => {
  if (taux === null) return 'inconnu';
  if (taux >= 85) return 'tenu';
  if (taux >= 50) return 'correct';
  if (taux >= 25) return 'vigilance';
  return 'souffrance';
};

const couleurTaux = (taux: number | null) => BANDES[bande(taux)].couleur;

const fmt = (v: number | null) => (v === null ? '—' : v.toLocaleString('fr-FR'));

/** Abrège « Sous-composante 1.1 — Appui direct… » en « 1.1 Appui direct… ». */
const abrege = (libelle: string, max = 34) => {
  const sansPrefixe = libelle.replace(/^Sous-composante\s*/i, '').replace(/\s*—\s*/, ' ');
  return sansPrefixe.length > max ? `${sansPrefixe.slice(0, max - 1)}…` : sansPrefixe;
};

// ─── Carte ────────────────────────────────────────────────────

const Carte: React.FC<{ children: React.ReactNode; titre?: string; indication?: string; sx?: object }> = ({
  children,
  titre,
  indication,
  sx,
}) => (
  <Paper sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', ...sx }}>
    {titre && (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
          {titre}
        </Typography>
        {indication && (
          <Typography variant="caption" color="text.secondary">
            {indication}
          </Typography>
        )}
      </Box>
    )}
    <Box sx={{ flex: 1, minHeight: 0 }}>{children}</Box>
  </Paper>
);

// ─── Jauge globale ────────────────────────────────────────────

const JaugeGlobale: React.FC<{ taux: number | null; annee: number }> = ({ taux, annee }) => {
  const theme = useTheme();
  const reduit = useReducedMotion();
  const valeur = taux ?? 0;
  const couleur = couleurTaux(taux);

  return (
    <Carte titre="Taux global d'exécution" indication={`Moyenne des taux d'activité du PTBA ${annee}`}>
      <Box sx={{ position: 'relative', height: 230 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={[{ nom: 'taux', valeur: Math.min(valeur, 100), fill: couleur }]}
            startAngle={220}
            endAngle={-40}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: theme.palette.action.hover }}
              dataKey="valeur"
              cornerRadius={999}
              isAnimationActive={!reduit}
              animationDuration={1100}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Typography
            sx={{
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(1.6rem, 4vw, 2rem)',
              lineHeight: 1,
              color: couleur,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.03em',
            }}
          >
            {taux === null ? 'N/D' : <NombreAnime valeur={Math.round(valeur)} suffixe="%" />}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            {BANDES[bande(taux)].libelle}
          </Typography>
        </Box>
      </Box>
    </Carte>
  );
};

// ─── Répartition ──────────────────────────────────────────────

const Repartition: React.FC<{ suivi: PtbaSuivi }> = ({ suivi }) => {
  const reduit = useReducedMotion();
  const total = suivi.total_activites || 1;

  const segments = [
    { libelle: 'Réalisées', valeur: suivi.realisees, couleur: COULEURS_ETAT.bon, icone: 'task_alt' },
    { libelle: 'En cours', valeur: suivi.en_cours, couleur: COULEURS_ETAT.vigilance, icone: 'pending' },
    { libelle: 'Non démarrées', valeur: suivi.non_demarrees, couleur: COULEURS_ETAT.critique, icone: 'block' },
  ];

  return (
    <Carte
      titre="Où en sont les activités"
      indication={`${suivi.total_activites} activités programmées au PTBA ${suivi.annee}`}
    >
      {/* Une seule barre empilée : la proportion se lit d'un coup d'œil,
          là où trois compteurs séparés obligent à faire le calcul. */}
      <Box sx={{ display: 'flex', height: 34, borderRadius: 2, overflow: 'hidden', mb: 2.5 }}>
        {segments.map((s, i) => (
          <Tooltip key={s.libelle} title={`${s.libelle} : ${s.valeur} sur ${suivi.total_activites}`} arrow>
            <motion.div
              initial={reduit ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ ...RESSORT.ample, delay: reduit ? 0 : 0.1 + i * 0.09 }}
              style={{
                width: `${(s.valeur / total) * 100}%`,
                background: s.couleur,
                originX: 0,
                cursor: 'default',
              }}
            />
          </Tooltip>
        ))}
      </Box>

      <Stack spacing={1.5}>
        {segments.map((s) => (
          <Box key={s.libelle} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: s.couleur,
                bgcolor: `color-mix(in oklab, ${s.couleur} 16%, transparent)`,
                border: `1px solid color-mix(in oklab, ${s.couleur} 40%, transparent)`,
              }}
            >
              <GoogleIcon name={s.icone} size={20} />
            </Box>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {s.libelle}
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              <NombreAnime valeur={s.valeur} />
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ width: 46, textAlign: 'right' }}>
              {Math.round((s.valeur / total) * 100)} %
            </Typography>
          </Box>
        ))}
      </Stack>
    </Carte>
  );
};

// ─── Classement des sous-composantes ──────────────────────────

interface LigneSousComposante {
  libelle: string;
  complet: string;
  composante: string;
  taux: number;
  activites: number;
}

const ClassementSousComposantes: React.FC<{ lignes: LigneSousComposante[] }> = ({ lignes }) => {
  const theme = useTheme();
  const reduit = useReducedMotion();

  return (
    <Carte
      titre="Exécution par sous-composante"
      indication="Taux moyen des activités. La ligne à 100 % marque la cible annuelle."
    >
      <Box sx={{ height: Math.max(260, lignes.length * 42) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={lignes} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 4 }} barCategoryGap={10}>
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: theme.palette.text.secondary, fontSize: 11 }}
              tickFormatter={(v) => `${v} %`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="libelle"
              width={186}
              interval={0}
              tick={{ fill: theme.palette.text.secondary, fontSize: 11.5 }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              cursor={{ fill: theme.palette.action.hover }}
              contentStyle={{
                background: theme.palette.mode === 'dark' ? 'rgba(17,24,44,0.96)' : 'rgba(255,255,255,0.98)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 10,
                color: theme.palette.text.primary,
                fontSize: 12,
              }}
              formatter={(valeur, _nom, entree) => {
                const ligne = (entree as { payload?: LigneSousComposante }).payload;
                return [
                  `${Math.round(Number(valeur ?? 0))} % · ${ligne?.activites ?? 0} activités`,
                  ligne?.complet ?? '',
                ];
              }}
              labelFormatter={() => ''}
            />
            <ReferenceLine x={100} stroke={theme.palette.divider} strokeDasharray="4 4" />
            <Bar dataKey="taux" radius={[0, 6, 6, 0]} isAnimationActive={!reduit} animationDuration={900}>
              {lignes.map((l) => (
                <Cell key={l.complet} fill={couleurTaux(l.taux)} />
              ))}
              <LabelList
                dataKey="taux"
                position="right"
                offset={8}
                formatter={(v: unknown) => `${Math.round(Number(v ?? 0))} %`}
                style={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Carte>
  );
};

// ─── Composantes ──────────────────────────────────────────────

const TEINTES_COMPOSANTE = [COULEURS_MODULE.base, COULEURS_MODULE.acquisition, COULEURS_MODULE.statistiques];

const CarteComposante: React.FC<{
  nom: string;
  taux: number | null;
  activites: number;
  achevees: number;
  teinte: string;
}> = ({ nom, taux, activites, achevees, teinte }) => {
  const reduit = useReducedMotion();
  const valeur = Math.min(taux ?? 0, 100);
  const rayon = 34;
  const circonference = 2 * Math.PI * rayon;

  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 2.5,
        border: `1px solid color-mix(in oklab, ${teinte} 38%, transparent)`,
        background: `linear-gradient(152deg,
          color-mix(in oklab, ${teinte} 22%, transparent) 0%,
          color-mix(in oklab, ${teinte} 8%, transparent) 60%,
          color-mix(in oklab, ${teinte} 4%, transparent) 100%)`,
      }}
    >
      <Box sx={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
        <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden>
          <circle cx="42" cy="42" r={rayon} fill="none" stroke={`color-mix(in oklab, ${teinte} 22%, transparent)`} strokeWidth="8" />
          <motion.circle
            cx="42"
            cy="42"
            r={rayon}
            fill="none"
            stroke={couleurTaux(taux)}
            strokeWidth="8"
            strokeLinecap="round"
            transform="rotate(-90 42 42)"
            strokeDasharray={circonference}
            initial={reduit ? false : { strokeDashoffset: circonference }}
            animate={{ strokeDashoffset: circonference * (1 - valeur / 100) }}
            transition={{ ...RESSORT.ample, delay: reduit ? 0 : 0.2 }}
          />
        </svg>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 17,
            fontVariantNumeric: 'tabular-nums',
            color: couleurTaux(taux),
          }}
        >
          {taux === null ? 'N/D' : <NombreAnime valeur={Math.round(taux)} suffixe="%" />}
        </Box>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.25 }}>
          {nom}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {activites} activités · {achevees} achevées
        </Typography>
      </Box>
    </Paper>
  );
};

// ─── Activités en souffrance ──────────────────────────────────

const EnSouffrance: React.FC<{ activites: Array<PtbaActivite & { sousComposante: string }> }> = ({ activites }) => (
  <Carte
    titre="Activités les plus en retard"
    indication="Classées par écart entre le prévu et le réalisé — à arbitrer en priorité."
  >
    {activites.length === 0 ? (
      <Typography variant="body2" color="text.secondary">
        Aucune activité en retard significatif.
      </Typography>
    ) : (
      <Echelonne sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
        {activites.map((a) => (
          <Element key={a.id}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.35 }}>
                  {a.activite}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {abrege(a.sousComposante, 46)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(a.taux ?? 0, 100)}
                    sx={{
                      flex: 1,
                      height: 5,
                      '& .MuiLinearProgress-bar': { bgcolor: couleurTaux(a.taux) },
                    }}
                  />
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{ color: couleurTaux(a.taux), minWidth: 34, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {a.taux === null ? '—' : `${Math.round(a.taux)} %`}
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={`${fmt(a.realise)} / ${fmt(a.prevu)}`}
                size="small"
                sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0, mt: 0.25 }}
              />
            </Box>
          </Element>
        ))}
      </Echelonne>
    )}
  </Carte>
);

// ─── Détail ligne à ligne ─────────────────────────────────────

const LigneActivite: React.FC<{ activite: PtbaActivite }> = ({ activite }) => (
  <TableRow hover>
    <TableCell sx={{ whiteSpace: 'nowrap' }}>
      {activite.code ? (
        <Chip label={activite.code} size="small" sx={{ fontWeight: 700, fontSize: '0.7rem' }} />
      ) : (
        <Typography variant="caption" color="text.disabled">—</Typography>
      )}
    </TableCell>
    <TableCell sx={{ minWidth: 280 }}>
      <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
        {activite.activite}
      </Typography>
      {activite.indicateur_realisation && (
        <Typography variant="caption" color="text.secondary">
          {activite.indicateur_realisation}
        </Typography>
      )}
    </TableCell>
    <TableCell align="right">{fmt(activite.prevu)}</TableCell>
    <TableCell align="right">
      <Typography variant="body2" fontWeight={700} sx={{ color: couleurTaux(activite.taux) }}>
        {fmt(activite.realise)}
      </Typography>
    </TableCell>
    <TableCell align="center" sx={{ minWidth: 130 }}>
      {activite.taux !== null ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(activite.taux, 100)}
            sx={{ flex: 1, height: 6, '& .MuiLinearProgress-bar': { bgcolor: couleurTaux(activite.taux) } }}
          />
          <Typography variant="caption" fontWeight={700} sx={{ color: couleurTaux(activite.taux), minWidth: 40 }}>
            {Math.round(activite.taux)} %
          </Typography>
        </Box>
      ) : (
        <Typography variant="caption" color="text.disabled">N/D</Typography>
      )}
    </TableCell>
    <TableCell align="right">
      <Typography variant="body2" sx={{ color: (activite.ecart ?? 0) < 0 ? COULEURS_ETAT.critique : 'text.secondary' }}>
        {activite.ecart === null ? '—' : activite.ecart.toLocaleString('fr-FR')}
      </Typography>
    </TableCell>
    <TableCell sx={{ maxWidth: 220 }}>
      <Typography variant="caption" color="text.secondary">
        {activite.commentaire || '—'}
      </Typography>
    </TableCell>
  </TableRow>
);

const Detail: React.FC<{ suivi: PtbaSuivi }> = ({ suivi }) => (
  <Box>
    {suivi.composantes.map((composante) => (
      <Accordion
        key={composante.composante}
        defaultExpanded
        disableGutters
        sx={{ mb: 1.5, '&:before': { display: 'none' } }}
      >
        <AccordionSummary expandIcon={<GoogleIcon name="expand_more" size={22} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', pr: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
              {composante.composante}
            </Typography>
            <Chip
              label={composante.taux_moyen !== null ? `${Math.round(composante.taux_moyen)} %` : 'N/D'}
              size="small"
              sx={{
                bgcolor: `color-mix(in oklab, ${couleurTaux(composante.taux_moyen)} 18%, transparent)`,
                color: couleurTaux(composante.taux_moyen),
                fontWeight: 700,
              }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          {composante.sous_composantes.map((sc) => (
            <Box key={sc.sous_composante} sx={{ mb: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  {sc.sous_composante}
                </Typography>
                <Chip
                  label={sc.taux_moyen !== null ? `${Math.round(sc.taux_moyen)} %` : 'N/D'}
                  size="small"
                  sx={{
                    bgcolor: `color-mix(in oklab, ${couleurTaux(sc.taux_moyen)} 18%, transparent)`,
                    color: couleurTaux(sc.taux_moyen),
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                />
              </Box>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Rubrique</TableCell>
                      <TableCell>Activité / Indicateur de réalisation</TableCell>
                      <TableCell align="right">Prévu</TableCell>
                      <TableCell align="right">Réalisé</TableCell>
                      <TableCell align="center" sx={{ minWidth: 130 }}>Taux</TableCell>
                      <TableCell align="right">Écart</TableCell>
                      <TableCell>Commentaires</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sc.activites.map((a) => (
                      <LigneActivite key={a.id} activite={a} />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>
    ))}
  </Box>
);

// ─── Page ─────────────────────────────────────────────────────

export const SuiviPTBA: React.FC = () => {
  const [suivi, setSuivi] = useState<PtbaSuivi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vue, setVue] = useState<'synthese' | 'detail'>('synthese');

  useEffect(() => {
    const charger = async () => {
      try {
        const { data } = await ptbaService.getSuivi(2026);
        setSuivi(data);
      } catch {
        setError("Impossible de charger le suivi du PTBA. Vérifiez la connexion au serveur.");
      } finally {
        setLoading(false);
      }
    };
    void charger();
  }, []);

  const sousComposantes = useMemo<LigneSousComposante[]>(() => {
    if (!suivi) return [];
    return suivi.composantes
      .flatMap((c) =>
        c.sous_composantes.map((sc) => ({
          libelle: abrege(sc.sous_composante, 22),
          complet: sc.sous_composante,
          composante: c.composante,
          taux: Math.round(sc.taux_moyen ?? 0),
          activites: sc.activites.length,
        })),
      )
      .sort((a, b) => b.taux - a.taux);
  }, [suivi]);

  const parComposante = useMemo(() => {
    if (!suivi) return [];
    return suivi.composantes.map((c) => {
      const activites = c.sous_composantes.flatMap((sc) => sc.activites);
      return {
        nom: c.composante,
        taux: c.taux_moyen,
        activites: activites.length,
        achevees: activites.filter((a) => (a.taux ?? 0) >= 100).length,
      };
    });
  }, [suivi]);

  const enRetard = useMemo(() => {
    if (!suivi) return [];
    return suivi.composantes
      .flatMap((c) =>
        c.sous_composantes.flatMap((sc) =>
          sc.activites.map((a) => ({ ...a, sousComposante: sc.sous_composante })),
        ),
      )
      .filter((a) => a.prevu !== null && a.prevu > 0 && (a.taux ?? 0) < 100)
      .sort((a, b) => (a.ecart ?? 0) - (b.ecart ?? 0))
      .slice(0, 6);
  }, [suivi]);

  if (loading) {
    return (
      <Box>
        <Skeleton variant="text" width={280} height={44} />
        <Skeleton variant="text" width={460} sx={{ mb: 3 }} />
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={168} />
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 5 }}><Skeleton variant="rounded" height={330} /></Grid>
          <Grid size={{ xs: 12, md: 7 }}><Skeleton variant="rounded" height={330} /></Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress size={22} />
        </Box>
      </Box>
    );
  }

  if (error || !suivi) {
    return <Alert severity="error">{error ?? 'Aucune donnée PTBA disponible.'}</Alert>;
  }

  const tenues = sousComposantes.filter((s) => s.taux >= 85).length;

  return (
    <Box>
      <Apparition>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <GoogleIcon name="event_note" size={30} sx={{ color: 'primary.main' }} filled />
              <Typography variant="h5" fontWeight={700}>
                Suivi du PTBA {suivi.annee}
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Plan de Travail et Budget Annuel — état d&apos;exécution physique des activités par composante
            </Typography>
          </Box>

          <Tabs
            value={vue}
            onChange={(_, v) => setVue(v)}
            sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
          >
            <Tab value="synthese" label="Synthèse" icon={<GoogleIcon name="insights" size={18} />} iconPosition="start" />
            <Tab value="detail" label="Détail" icon={<GoogleIcon name="table_rows" size={18} />} iconPosition="start" />
          </Tabs>
        </Box>
      </Apparition>

      {vue === 'synthese' ? (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                index={0}
                title="Activités programmées"
                value={suivi.total_activites}
                icon={<GoogleIcon name="checklist" size={36} filled />}
                color="info"
                detail={`${suivi.composantes.length} composantes, ${sousComposantes.length} sous-composantes`}
                onClick={() => setVue('detail')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                index={1}
                title="Réalisées"
                value={suivi.realisees}
                icon={<GoogleIcon name="task_alt" size={36} filled />}
                color="success"
                progression={(suivi.realisees / (suivi.total_activites || 1)) * 100}
                detail={`${Math.round((suivi.realisees / (suivi.total_activites || 1)) * 100)} % du plan`}
                onClick={() => setVue('detail')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                index={2}
                title="Non démarrées"
                value={suivi.non_demarrees}
                icon={<GoogleIcon name="block" size={36} filled />}
                color="danger"
                progression={(suivi.non_demarrees / (suivi.total_activites || 1)) * 100}
                onClick={() => setVue('detail')}
                detail="Aucune réalisation enregistrée"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                index={3}
                title="Sous-composantes tenues"
                value={`${tenues} / ${sousComposantes.length}`}
                icon={<GoogleIcon name="verified" size={36} filled />}
                color="warning"
                detail="Taux moyen supérieur à 85 %"
                onClick={() => setVue('detail')}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Apparition retard={0.1}>
                <JaugeGlobale taux={suivi.taux_global} annee={suivi.annee} />
              </Apparition>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Apparition retard={0.16}>
                <Repartition suivi={suivi} />
              </Apparition>
            </Grid>
          </Grid>

          <Echelonne
            retard={0.1}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 2,
              mb: 2,
            }}
          >
            {parComposante.map((c, i) => (
              <Element key={c.nom}>
                <CarteComposante
                  nom={c.nom}
                  taux={c.taux}
                  activites={c.activites}
                  achevees={c.achevees}
                  teinte={TEINTES_COMPOSANTE[i % TEINTES_COMPOSANTE.length]}
                />
              </Element>
            ))}
          </Echelonne>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Apparition retard={0.2}>
                <ClassementSousComposantes lignes={sousComposantes} />
              </Apparition>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Apparition retard={0.26}>
                <EnSouffrance activites={enRetard} />
              </Apparition>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Apparition>
          <Detail suivi={suivi} />
        </Apparition>
      )}
    </Box>
  );
};

export default SuiviPTBA;
