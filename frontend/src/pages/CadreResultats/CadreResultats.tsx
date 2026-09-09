import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Collapse,
  LinearProgress,
  Grid,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import cadreResultatsService, {
  type IndicateurCadre,
  type CadreStats,
} from '../../services/cadreResultats.service';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';

// ─── helpers ──────────────────────────────────────────────────

const ANNEE_ACTUELLE = '2025' as const;

function calcPerf(realise: number | null, prevu: number | null): number | null {
  if (realise === null || prevu === null || prevu === 0) return null;
  return Math.round((realise / prevu) * 100);
}

function perfColor(p: number | null): string {
  if (p === null) return '#9E9E9E';
  if (p >= 100) return '#4CAF50';
  if (p >= 70) return '#8BC34A';
  if (p >= 50) return '#FFC107';
  return '#F44336';
}

function perfLabel(p: number | null): string {
  if (p === null) return 'N/D';
  if (p >= 100) return 'Atteint';
  if (p >= 70) return 'En cours';
  if (p >= 50) return 'Partiel';
  return 'En retard';
}

function fmtNum(v: number | null, unite: string): string {
  if (v === null) return '—';
  if (unite === '%') return `${v.toLocaleString('fr-FR')} %`;
  if (unite === 'USD') return `${(v / 1_000_000).toFixed(1)} M$`;
  return v.toLocaleString('fr-FR');
}

// ─── StatCard ─────────────────────────────────────────────────

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color = 'primary.main', sub }) => {
  const navigate = useNavigate();
  const versCollecte = label.includes('retard') || label.includes('cours');
  return (
    <GradientWidget
      title={label}
      value={value}
      icon={<GoogleIcon name={icon} size={36} filled />}
      detail={sub}
      color={color === '#2E7D32' ? 'success' : color === '#F9A825' ? 'warning' : color === '#C62828' ? 'danger' : color === '#00838F' ? 'info' : 'primary'}
      onClick={() => navigate(versCollecte ? '/outils/collecte' : '/database/indicateurs')}
    />
  );
};

// ─── IndicateurRow ────────────────────────────────────────────

interface RowProps {
  indicateur: IndicateurCadre;
}

const IndicateurRow: React.FC<RowProps> = ({ indicateur: ind }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const annee = ind.annees[ANNEE_ACTUELLE];
  const perf = calcPerf(annee.realise, annee.prevu);
  const perfFinal = calcPerf(annee.realise, ind.final_prevu);

  const ANNEES = ['2023', '2024', '2025', '2026'] as const;

  return (
    <>
      <TableRow
        hover
        onClick={() => navigate(`/indicateurs/${ind.id}`)}
        sx={{ cursor: 'pointer', '& > td': { borderBottom: open ? 'none' : undefined } }}
      >
        {/* expand */}
        <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            <GoogleIcon name={open ? 'expand_less' : 'expand_more'} size={20} />
          </IconButton>
        </TableCell>
        {/* code */}
        <TableCell>
          <Chip
            label={ind.code}
            size="small"
            sx={{
              bgcolor: ind.est_odp ? 'primary.main' : 'secondary.main',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.7rem',
              borderRadius: '6px',
            }}
          />
        </TableCell>
        {/* nom */}
        <TableCell>
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.4 }}>
            {ind.libelle_court || ind.nom}
          </Typography>
          {ind.libelle_court && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
              {ind.nom}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {ind.frequence} · {ind.responsable}
          </Typography>
        </TableCell>
        {/* unité */}
        <TableCell align="center">
          <Chip label={ind.unite} size="small" variant="outlined" sx={{ borderRadius: '6px' }} />
        </TableCell>
        {/* cible 2025 */}
        <TableCell align="right">
          <Typography variant="body2" fontWeight={600}>
            {fmtNum(annee.prevu, ind.unite)}
          </Typography>
        </TableCell>
        {/* réalisé 2025 */}
        <TableCell align="right">
          <Typography variant="body2" fontWeight={700} color={perfColor(perf)}>
            {fmtNum(annee.realise, ind.unite)}
          </Typography>
        </TableCell>
        {/* perf 2025 */}
        <TableCell align="center" sx={{ minWidth: 120 }}>
          {perf !== null ? (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(perf, 100)}
                  sx={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { bgcolor: perfColor(perf), borderRadius: 3 },
                  }}
                />
                <Typography variant="caption" fontWeight={700} sx={{ color: perfColor(perf), minWidth: 38 }}>
                  {perf}%
                </Typography>
              </Box>
              <Chip
                label={perfLabel(perf)}
                size="small"
                sx={{ bgcolor: `${perfColor(perf)}20`, color: perfColor(perf), fontWeight: 700, borderRadius: '6px', mt: 0.5, fontSize: '0.65rem' }}
              />
            </Box>
          ) : (
            <Typography variant="caption" color="text.disabled">N/D</Typography>
          )}
        </TableCell>
        {/* cible finale */}
        <TableCell align="right">
          <Typography variant="body2" color="text.secondary">
            {fmtNum(ind.final_prevu, ind.unite)}
          </Typography>
          {ind.final_realise !== null && ind.final_realise !== undefined && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Réalisé final: {fmtNum(ind.final_realise, ind.unite)}
            </Typography>
          )}
          {perfFinal !== null && (
            <Typography variant="caption" sx={{ color: perfColor(perfFinal) }}>
              {perfFinal}% atteint
            </Typography>
          )}
        </TableCell>
      </TableRow>
      {/* expanded: historical data */}
      <TableRow>
        <TableCell colSpan={8} sx={{ py: 0, px: 2, bgcolor: 'action.hover' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2 }}>
              {ind.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontStyle: 'italic' }}>
                  {ind.description}
                </Typography>
              )}
              <Grid container spacing={2} sx={{ mb: 1.5 }}>
                {([
                  ['Groupes cibles', ind.groupes_cibles],
                  ['Objectif', ind.objectif],
                  ['Justification', ind.justification],
                  ['Hypothèse critique', ind.hypothese_critique],
                  ['Désagrégé par', ind.desagrege_par],
                  ['Éléments de calcul', ind.elements_calcul],
                  ['Formule mathématique', ind.formule_mathematique],
                  ['Niveau de validation', ind.niveau_validation],
                  ['Outils de mesure', ind.outils_mesure],
                  ['Source des données', ind.source_donnees],
                  ['Méthode de collecte', ind.methodologie_collecte],
                  ['Sous-composante', ind.sous_composante],
                ] as Array<[string, string | null | undefined]>)
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <Grid key={label} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        {label}
                      </Typography>
                      <Typography variant="body2">{value}</Typography>
                    </Grid>
                  ))}
              </Grid>
              {ind.commentaires && (
                <Alert severity="info" icon={false} sx={{ mb: 1.5, py: 0.5 }}>
                  <Typography variant="caption">{ind.commentaires}</Typography>
                </Alert>
              )}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 700 }}>Année</TableCell>
                      {ANNEES.map((a) => (
                        <React.Fragment key={a}>
                          <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>
                            {a} — Prévu
                          </TableCell>
                          <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>
                            {a} — Réalisé
                          </TableCell>
                          <TableCell align="center" sx={{ color: 'white', fontWeight: 700 }}>
                            Perf.
                          </TableCell>
                        </React.Fragment>
                      ))}
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>
                        Cible finale
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white', fontWeight: 700 }}>
                        Réalisé final
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Valeurs</TableCell>
                      {ANNEES.map((a) => {
                        const an = ind.annees[a];
                        const p = calcPerf(an.realise, an.prevu);
                        return (
                          <React.Fragment key={a}>
                            <TableCell align="right">{fmtNum(an.prevu, ind.unite)}</TableCell>
                            <TableCell align="right" sx={{ color: perfColor(p), fontWeight: 600 }}>
                              {fmtNum(an.realise, ind.unite)}
                            </TableCell>
                            <TableCell align="center">
                              {p !== null ? (
                                <Chip
                                  label={`${p}%`}
                                  size="small"
                                  sx={{ bgcolor: `${perfColor(p)}20`, color: perfColor(p), fontWeight: 700, borderRadius: '6px', fontSize: '0.7rem' }}
                                />
                              ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                            </TableCell>
                          </React.Fragment>
                        );
                      })}
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {fmtNum(ind.final_prevu, ind.unite)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {fmtNum(ind.final_realise ?? null, ind.unite)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// ─── IndicateursTable ─────────────────────────────────────────

const IndicateursTable: React.FC<{ indicateurs: IndicateurCadre[] }> = ({ indicateurs }) => (
  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
    <Table size="small">
      <TableHead>
        <TableRow sx={{ bgcolor: 'action.hover' }}>
          <TableCell padding="checkbox" />
          <TableCell sx={{ fontWeight: 700, minWidth: 90 }}>Code</TableCell>
          <TableCell sx={{ fontWeight: 700, minWidth: 300 }}>Indicateur</TableCell>
          <TableCell align="center" sx={{ fontWeight: 700 }}>Unité</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Cible 2025</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Réalisé 2025</TableCell>
          <TableCell align="center" sx={{ fontWeight: 700, minWidth: 130 }}>Performance 2025</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700 }}>Objectif final</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {indicateurs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
              <Typography color="text.secondary">Aucun indicateur</Typography>
            </TableCell>
          </TableRow>
        ) : (
          indicateurs.map((ind) => <IndicateurRow key={ind.id} indicateur={ind} />)
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

// ─── SousComposanteSection ─────────────────────────────────────

const SousComposanteSection: React.FC<{ titre: string; indicateurs: IndicateurCadre[] }> = ({ titre, indicateurs }) => {
  if (indicateurs.length === 0) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, color: 'text.secondary', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {titre}
      </Typography>
      <IndicateursTable indicateurs={indicateurs} />
    </Box>
  );
};

// ─── TabContent ────────────────────────────────────────────────

const TAB_COMPOSANTE_LABELS = [
  'ODP',
  'Composante 1',
  'Composante 2',
  'Composante 3',
  'Composante 4',
];

const ComposanteDescriptions: Record<string, string> = {
  ODP: 'Indicateurs d\'Objectif de Développement de Projet',
  'Composante 1': 'Amélioration de la productivité agricole',
  'Composante 2': 'Accès des petits exploitants au marché',
  'Composante 3': 'Biens et services publics agricoles',
  'Composante 4': 'Intervention d\'urgence agricole',
};

const ComposanteIcons: Record<string, string> = {
  ODP: 'flag',
  'Composante 1': 'agriculture',
  'Composante 2': 'store',
  'Composante 3': 'public',
  'Composante 4': 'emergency',
};

interface TabContentProps {
  composante: string;
  indicateurs: IndicateurCadre[];
}

const TabContent: React.FC<TabContentProps> = ({ composante, indicateurs }) => {
  if (composante === 'ODP') {
    return (
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
          <GoogleIcon name="flag" size={28} sx={{ color: 'primary.main', mt: 0.3 }} filled />
          <Box>
            <Typography variant="h6" fontWeight={700}>Indicateurs ODP</Typography>
            <Typography variant="body2" color="text.secondary">
              Indicateurs d'Objectif de Développement de Projet — mesurent l'atteinte des objectifs globaux du programme
            </Typography>
          </Box>
        </Box>
        <IndicateursTable indicateurs={indicateurs} />
      </Box>
    );
  }

  const sousCategoryMap: Record<string, IndicateurCadre[]> = {};
  indicateurs.forEach((ind) => {
    const key = ind.sous_composante || 'Général';
    if (!sousCategoryMap[key]) sousCategoryMap[key] = [];
    sousCategoryMap[key].push(ind);
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <GoogleIcon name={ComposanteIcons[composante] || 'analytics'} size={28} sx={{ color: 'primary.main', mt: 0.3 }} filled />
        <Box>
          <Typography variant="h6" fontWeight={700}>{composante}</Typography>
          <Typography variant="body2" color="text.secondary">{ComposanteDescriptions[composante]}</Typography>
        </Box>
      </Box>
      {Object.entries(sousCategoryMap).map(([sc, inds]) => (
        <SousComposanteSection key={sc} titre={sc} indicateurs={inds} />
      ))}
    </Box>
  );
};

// ─── Main Component ────────────────────────────────────────────

export const CadreResultats: React.FC = () => {
  const [indicateurs, setIndicateurs] = useState<IndicateurCadre[]>([]);
  const [stats, setStats] = useState<CadreStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [indRes, statsRes] = await Promise.all([
          cadreResultatsService.getAll(),
          cadreResultatsService.getStats(),
        ]);
        setIndicateurs(indRes.data);
        setStats(statsRes.data);
      } catch {
        setError('Impossible de charger les données du cadre de résultats.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentComposante = TAB_COMPOSANTE_LABELS[tabIndex];
  const filtered = indicateurs.filter((ind) =>
    currentComposante === 'ODP' ? ind.est_odp : ind.composante === currentComposante
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <GoogleIcon name="assignment_turned_in" size={32} sx={{ color: 'primary.main' }} filled />
          <Box>
            <Typography variant="h4" fontWeight={800}>Cadre des Résultats</Typography>
            <Typography variant="body2" color="text.secondary">
              Programme National de Développement Agricole (PNDA) · Suivi 2025
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ mt: 2 }} />
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 3, borderRadius: '10px' }}>{error}</Alert>}

      {/* Stats cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="analytics" label="Total indicateurs" value={stats.total} color="#1565C0" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="flag" label="Indicateurs ODP" value={stats.odp_count} color="#6A1B9A" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="check_circle" label="Atteints" value={stats.atteint} color="#2E7D32" sub="≥ 100 %" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="pending" label="En cours" value={stats.en_cours} color="#F9A825" sub="70 – 99 %" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="warning" label="En retard" value={stats.en_retard} color="#C62828" sub="< 70 %" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="speed" label="Performance moy." value={`${stats.moyenne_performance}%`} color="#00838F" sub="2025" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="database" label="Données disponibles" value={stats.avec_donnees_2025} color="#1565C0" sub="en 2025" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard icon="account_tree" label="Composantes" value={stats.composantes.length} color="#2E7D32" sub="suivies" />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ borderRadius: '10px', overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
            '& .MuiTab-root': { fontWeight: 600, minHeight: 52 },
          }}
        >
          {TAB_COMPOSANTE_LABELS.map((label) => {
            const count = label === 'ODP'
              ? indicateurs.filter((i) => i.est_odp).length
              : indicateurs.filter((i) => i.composante === label).length;
            return (
              <Tab
                key={label}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <GoogleIcon name={ComposanteIcons[label] || 'analytics'} size={18} />
                    <span>{label}</span>
                    <Chip
                      label={count}
                      size="small"
                      sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, borderRadius: '6px' }}
                    />
                  </Box>
                }
              />
            );
          })}
        </Tabs>
        <Box sx={{ p: 3 }}>
          <TabContent composante={currentComposante} indicateurs={filtered} />
        </Box>
      </Paper>
    </Box>
  );
};

export default CadreResultats;
