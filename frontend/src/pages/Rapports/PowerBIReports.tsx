// frontend/src/pages/Rapports/PowerBIReports.tsx
//
// Rapports & analyses — entièrement alimentés par les services du programme.
// Règle appliquée : aucune valeur n'est écrite en dur dans cette page. Quand un
// service ne répond pas ou ne renvoie rien, la section concernée affiche un état
// vide explicite au lieu de présenter des chiffres de démonstration.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Avatar,
  Divider,
  Stack,
  Alert,
  CircularProgress,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import {
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import GoogleIcon from '../../components/common/GoogleIcon';
import cadreResultatsService, {
  type IndicateurCadre,
  type CadreStats,
} from '../../services/cadreResultats.service';
import provincialService, { type ProvinceData } from '../../services/provincial.service';
import beneficiaireService, { type AdvancedStats } from '../../services/beneficiaire.service';
import { risqueService, type Risque, type RisqueStats } from '../../services/risque.service';
import grmService, { type Plainte } from '../../services/grm.service';

const fmtNum = (v: ValueType | undefined) =>
  typeof v === 'number' ? v.toLocaleString('fr-FR') : String(v ?? '');
const fmtPct = (v: ValueType | undefined) => (typeof v === 'number' ? `${v} %` : String(v ?? ''));
const nombre = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('fr-FR'));
const pourcent = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

// ---------------------------------------------------------------------------
// Catalogue (métadonnées de navigation, pas des résultats)
// ---------------------------------------------------------------------------
type Categorie = 'dashboard' | 'indicateurs' | 'beneficiaires' | 'risques' | 'grm';

interface Rapport {
  id: string;
  name: string;
  description: string;
  category: Categorie;
}

const COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9'];
const PALETTE: Record<Categorie, { bg: string; fg: string }> = {
  dashboard:     { bg: '#E8F5E9', fg: '#2E7D32' },
  indicateurs:   { bg: '#E3F2FD', fg: '#1976D2' },
  beneficiaires: { bg: '#F3E5F5', fg: '#7B1FA2' },
  risques:       { bg: '#FFF3E0', fg: '#F9A825' },
  grm:           { bg: '#FFEBEE', fg: '#D32F2F' },
};

const categories = [
  { value: 'all',           label: 'Tous',             icon: 'dashboard' },
  { value: 'dashboard',     label: 'Tableaux de bord', icon: 'dashboard' },
  { value: 'indicateurs',   label: 'Indicateurs',      icon: 'bar_chart' },
  { value: 'beneficiaires', label: 'Bénéficiaires',    icon: 'people' },
  { value: 'risques',       label: 'Risques',          icon: 'warning' },
  { value: 'grm',           label: 'GRM',              icon: 'chat' },
];

const rapports: Rapport[] = [
  { id: 'executif', name: 'Tableau de bord exécutif',
    description: "Synthèse du cadre de résultats : atteinte des IODP, couverture provinciale, répartition par composante",
    category: 'dashboard' },
  { id: 'iodp', name: 'Suivi des indicateurs IODP',
    description: "Réalisé et prévu des indicateurs d'objectif de développement, issus du cadre de résultats",
    category: 'indicateurs' },
  { id: 'beneficiaires', name: 'Analyse des bénéficiaires',
    description: 'Répartition démographique et géographique des producteurs enregistrés au RNA',
    category: 'beneficiaires' },
  { id: 'risques', name: 'Matrice des risques',
    description: "Répartition par niveau, profil par catégorie et registre des risques critiques et élevés",
    category: 'risques' },
  { id: 'grm', name: 'Gestion des plaintes GRM',
    description: 'Volumes reçus et traités, typologie des plaintes et délais de traitement',
    category: 'grm' },
  { id: 'provinces', name: 'Performance par province',
    description: 'Comparaison des provinces sur les effectifs enregistrés et le score de performance',
    category: 'dashboard' },
];

// ---------------------------------------------------------------------------
// Chargement des données réelles
// ---------------------------------------------------------------------------
interface DonneesRapports {
  cadre: IndicateurCadre[];
  cadreStats: CadreStats | null;
  provinces: ProvinceData[];
  beneficiaires: AdvancedStats | null;
  risques: Risque[];
  risqueStats: RisqueStats | null;
  plaintes: Plainte[];
  chargeLe: Date | null;
  echecs: string[];
}

const DONNEES_VIDES: DonneesRapports = {
  cadre: [], cadreStats: null, provinces: [], beneficiaires: null,
  risques: [], risqueStats: null, plaintes: [], chargeLe: null, echecs: [],
};

const tableau = <T,>(valeur: unknown): T[] => (Array.isArray(valeur) ? (valeur as T[]) : []);

const useDonneesRapports = () => {
  const [donnees, setDonnees] = useState<DonneesRapports>(DONNEES_VIDES);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    setChargement(true);
    const [cadreRes, statsRes, provRes, benefRes, risquesRes, risqueStatsRes, plaintesRes] =
      await Promise.allSettled([
        cadreResultatsService.getAll(),
        cadreResultatsService.getStats(),
        provincialService.getAllProvinces(),
        beneficiaireService.getAdvancedStats({}),
        risqueService.getAll(),
        risqueService.getStats(),
        grmService.getAll({ limit: 2000 }),
      ]);

    const echecs: string[] = [];
    const marquer = (r: PromiseSettledResult<unknown>, nom: string) => {
      if (r.status === 'rejected') echecs.push(nom);
      return r.status === 'fulfilled' ? (r.value as { data: unknown }).data : null;
    };

    const plaintesData = marquer(plaintesRes, 'plaintes GRM') as { data?: Plainte[] } | null;

    setDonnees({
      cadre: tableau<IndicateurCadre>(marquer(cadreRes, 'cadre de résultats')),
      cadreStats: marquer(statsRes, 'statistiques du cadre') as CadreStats | null,
      provinces: tableau<ProvinceData>(marquer(provRes, 'provinces')),
      beneficiaires: marquer(benefRes, 'bénéficiaires') as AdvancedStats | null,
      risques: tableau<Risque>(marquer(risquesRes, 'risques')),
      risqueStats: marquer(risqueStatsRes, 'statistiques des risques') as RisqueStats | null,
      plaintes: tableau<Plainte>(plaintesData?.data),
      chargeLe: new Date(),
      echecs,
    });
    setChargement(false);
  }, []);

  useEffect(() => {
    // Chargement initial : synchronisation avec les services du programme.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  return { donnees, chargement, recharger: charger };
};

// ---------------------------------------------------------------------------
// Lecture du cadre de résultats
// ---------------------------------------------------------------------------
const ANNEES = ['2023', '2024', '2025', '2026', '2027'] as const;
type CleAnnee = (typeof ANNEES)[number];

/** Dernier couple réalisé/prévu disponible pour un indicateur, et son taux d'atteinte. */
const atteinte = (ind: IndicateurCadre) => {
  for (let i = ANNEES.length - 1; i >= 0; i -= 1) {
    const entree = ind.annees?.[ANNEES[i] as CleAnnee];
    if (entree && entree.realise != null) {
      const prevu = entree.prevu ?? ind.final_prevu;
      return {
        annee: ANNEES[i],
        realise: entree.realise,
        prevu,
        taux: prevu && prevu !== 0 ? Math.round((entree.realise / prevu) * 1000) / 10 : null,
      };
    }
  }
  return { annee: null, realise: null, prevu: ind.final_prevu, taux: null };
};

// ---------------------------------------------------------------------------
// Éléments d'interface partagés
// ---------------------------------------------------------------------------
const EtatVide: React.FC<{ titre: string; detail?: string; hauteur?: number }> = ({
  titre, detail, hauteur = 200,
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 3, textAlign: 'center', borderStyle: 'dashed', borderRadius: 2,
      minHeight: hauteur, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}
  >
    <GoogleIcon name="query_stats" size={34} sx={{ color: 'text.disabled', mb: 1 }} />
    <Typography variant="subtitle2" color="text.secondary">{titre}</Typography>
    {detail && (
      <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, maxWidth: 420 }}>
        {detail}
      </Typography>
    )}
  </Paper>
);

const KPICard: React.FC<{ label: string; value: string; icon: string; color: string }> = ({
  label, value, icon, color,
}) => (
  <GradientWidget
    title={label}
    value={value}
    icon={<GoogleIcon name={icon} size={36} />}
    color={
      color === '#4CAF50' ? 'success'
        : color === '#FF9800' ? 'warning'
        : color === '#1976D2' ? 'info'
        : color === '#D32F2F' || color === '#E91E63' ? 'danger'
        : 'primary'
    }
  />
);

const Bloc: React.FC<{ titre: string; children: React.ReactNode }> = ({ titre, children }) => (
  <Paper sx={{ p: 2, borderRadius: 2, height: '100%' }}>
    <Typography variant="subtitle2" gutterBottom>{titre}</Typography>
    {children}
  </Paper>
);

// ---------------------------------------------------------------------------
// Rapports
// ---------------------------------------------------------------------------
type PropsRapport = { d: DonneesRapports };

const RapportExecutif: React.FC<PropsRapport> = ({ d }) => {
  const odp = d.cadre.filter((i) => i.est_odp);
  const totalBenef = d.provinces.reduce((s, p) => s + (p.beneficiaires?.total ?? 0), 0);
  const totalFemmes = d.provinces.reduce((s, p) => s + (p.beneficiaires?.femmes ?? 0), 0);

  /** Taux moyen d'atteinte des IODP, année par année, calculé sur le cadre. */
  const serieAnnuelle = ANNEES.map((annee) => {
    const taux = odp
      .map((ind) => {
        const e = ind.annees?.[annee as CleAnnee];
        if (!e || e.realise == null || !e.prevu) return null;
        return (e.realise / e.prevu) * 100;
      })
      .filter((v): v is number => v !== null);
    return {
      annee,
      taux: taux.length ? Math.round(taux.reduce((a, b) => a + b, 0) / taux.length) : null,
      renseignes: taux.length,
    };
  }).filter((p) => p.renseignes > 0);

  const composantes = d.cadreStats?.composantes ?? [];

  if (!d.cadreStats && d.provinces.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <EtatVide
          titre="Synthèse indisponible"
          detail="Ni le cadre de résultats ni les données provinciales n'ont pu être chargés."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Exploitants inscrits" value={nombre(totalBenef)} icon="people" color="#2E7D32" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            label="Part des femmes"
            value={totalBenef > 0 ? `${pourcent(totalFemmes, totalBenef)} %` : '—'}
            icon="female" color="#E91E63"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            label="Performance moyenne"
            value={d.cadreStats ? `${Math.round(d.cadreStats.moyenne_performance)} %` : '—'}
            icon="assessment" color="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            label="Indicateurs atteints"
            value={d.cadreStats ? `${d.cadreStats.atteint} / ${d.cadreStats.total}` : '—'}
            icon="flag" color="#FF9800"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Bloc titre="Taux moyen d'atteinte des IODP, par année">
            {serieAnnuelle.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={serieAnnuelle}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis dataKey="annee" />
                  <YAxis tickFormatter={(v) => `${v}%`} />
                  <RechartTooltip formatter={fmtPct} />
                  <Legend />
                  <Bar dataKey="taux" name="Taux moyen d'atteinte" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="taux" name="Tendance" stroke="#FF9800" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EtatVide
                titre="Aucune année renseignée"
                detail="Le cadre de résultats ne contient encore ni réalisé ni prévu exploitable pour les IODP."
              />
            )}
          </Bloc>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Bloc titre="Indicateurs par composante">
            {composantes.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={composantes} cx="50%" cy="50%" outerRadius={80}
                    dataKey="count" nameKey="nom" labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {composantes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RechartTooltip formatter={fmtNum} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EtatVide titre="Composantes non renseignées" />
            )}
          </Bloc>
        </Grid>
      </Grid>
    </Box>
  );
};

const RapportIODP: React.FC<PropsRapport> = ({ d }) => {
  const odp = d.cadre.filter((i) => i.est_odp).map((ind) => ({ ind, a: atteinte(ind) }));
  const mesures = odp.filter((o) => o.a.taux != null);

  if (odp.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <EtatVide
          titre="Aucun indicateur d'objectif de développement"
          detail="Le service du cadre de résultats n'a renvoyé aucun IODP."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {odp.map(({ ind, a }) => (
          <Grid size={{ xs: 12 }} key={ind.id}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>
                  {ind.code} – {ind.libelle_court ?? ind.nom}
                </Typography>
                <Typography
                  variant="body2" fontWeight={700}
                  color={a.taux == null ? 'text.disabled' : a.taux >= 75 ? 'success.main' : a.taux >= 50 ? 'warning.main' : 'error.main'}
                >
                  {a.taux == null ? 'Non mesuré' : `${a.taux} %`}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={a.taux == null ? 0 : Math.min(a.taux, 100)}
                sx={{
                  height: 10, borderRadius: 5, bgcolor: 'action.selected',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: a.taux == null ? '#BDBDBD' : a.taux >= 75 ? '#4CAF50' : a.taux >= 50 ? '#FF9800' : '#F44336',
                    borderRadius: 5,
                  },
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {a.annee
                  ? `${nombre(a.realise)} / ${nombre(a.prevu)} ${ind.unite} — exercice ${a.annee}`
                  : 'Aucune valeur réalisée saisie'}
                {ind.source_donnees ? ` · source : ${ind.source_donnees}` : ''}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Bloc titre="Réalisé et prévu par indicateur">
        {mesures.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(220, mesures.length * 42)}>
            <BarChart
              data={mesures.map(({ ind, a }) => ({ code: ind.code, realise: a.realise, prevu: a.prevu }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="code" width={90} />
              <RechartTooltip formatter={fmtNum} />
              <Legend />
              <Bar dataKey="realise" name="Réalisé" fill="#2E7D32" radius={[0, 4, 4, 0]} />
              <Bar dataKey="prevu" name="Prévu" fill="#C8E6C9" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EtatVide
            titre="Aucune valeur mesurée"
            detail="Les IODP sont définis mais aucun réalisé n'a encore été saisi."
          />
        )}
      </Bloc>
    </Box>
  );
};

const RapportBeneficiaires: React.FC<PropsRapport> = ({ d }) => {
  const s = d.beneficiaires?.stats;
  const total = s?.total_producteurs ?? 0;
  const femmes = s?.total_femmes ?? 0;
  const ages = d.beneficiaires?.age_distribution ?? [];
  const provinces = [...d.provinces].sort(
    (a, b) => (b.beneficiaires?.total ?? 0) - (a.beneficiaires?.total ?? 0),
  );
  const maxProv = provinces[0]?.beneficiaires?.total ?? 0;

  if (!d.beneficiaires && provinces.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <EtatVide
          titre="Aucune donnée bénéficiaire"
          detail="Les services /beneficiaires et /provinces n'ont renvoyé aucun enregistrement."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Producteurs enregistrés" value={nombre(s?.total_producteurs)} icon="people" color="#2E7D32" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Femmes" value={nombre(s?.total_femmes)} icon="female" color="#E91E63" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Hommes" value={total > 0 ? nombre(total - femmes) : '—'} icon="male" color="#1976D2" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            label="Âge moyen"
            value={s?.age_moyen != null ? `${Math.round(s.age_moyen)} ans` : '—'}
            icon="cake" color="#FF9800"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Bloc titre="Répartition par sexe">
            {total > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[{ name: 'Femmes', value: femmes }, { name: 'Hommes', value: total - femmes }]}
                    cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, percent }) => `${name as string} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#E91E63" />
                    <Cell fill="#1976D2" />
                  </Pie>
                  <RechartTooltip formatter={fmtNum} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EtatVide titre="Effectifs non disponibles" />
            )}
          </Bloc>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Bloc titre="Répartition par tranche d'âge">
            {ages.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ages}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tranche_age" />
                  <YAxis />
                  <RechartTooltip formatter={fmtNum} />
                  <Bar dataKey="nombre" name="Producteurs" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EtatVide titre="Distribution par âge non disponible" />
            )}
          </Bloc>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Bloc titre="Provinces les plus couvertes">
            {provinces.length > 0 ? (
              <Stack spacing={1} sx={{ mt: 1 }}>
                {provinces.slice(0, 6).map((p) => (
                  <Box key={p.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">{p.name}</Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {nombre(p.beneficiaires?.total)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={maxProv > 0 ? ((p.beneficiaires?.total ?? 0) / maxProv) * 100 : 0}
                      sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <EtatVide titre="Aucune province servie" />
            )}
          </Bloc>
        </Grid>
      </Grid>
    </Box>
  );
};

const LIBELLES_CATEGORIE_RISQUE: Record<string, string> = {
  gestion: 'Gestion',
  technique: 'Technique',
  politique: 'Politique',
  socio_economique: 'Socio-économique',
  environnemental: 'Environnemental',
  sante_securite: 'Santé & sécurité',
};

const RapportRisques: React.FC<PropsRapport> = ({ d }) => {
  const stats = d.risqueStats;
  const niveaux = stats
    ? [
        { niveau: 'Critique', count: stats.critiques, color: '#F44336' },
        { niveau: 'Élevé',    count: stats.eleves,    color: '#FF9800' },
        { niveau: 'Modéré',   count: stats.moderes,   color: '#FFC107' },
        { niveau: 'Faible',   count: stats.faibles,   color: '#4CAF50' },
      ]
    : [];

  /** Profil par catégorie : criticité moyenne observée (probabilité × impact). */
  const radar = useMemo(() => {
    const parCategorie = new Map<string, number[]>();
    d.risques.forEach((r) => {
      const liste = parCategorie.get(r.categorie) ?? [];
      liste.push(r.probabilite * r.impact);
      parCategorie.set(r.categorie, liste);
    });
    return [...parCategorie.entries()].map(([cat, scores]) => ({
      axe: LIBELLES_CATEGORIE_RISQUE[cat] ?? cat,
      score: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }));
  }, [d.risques]);

  const majeurs = d.risques
    .filter((r) => r.niveau === 'Critique' || r.niveau === 'Élevé')
    .sort((a, b) => b.probabilite * b.impact - a.probabilite * a.impact)
    .slice(0, 8);

  if (!stats && d.risques.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <EtatVide titre="Registre des risques vide" detail="Le service /risques n'a renvoyé aucun enregistrement." />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {niveaux.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {niveaux.map((r) => (
            <Grid size={{ xs: 6, md: 3 }} key={r.niveau}>
              <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: `${r.color}15` }}>
                <Typography variant="caption" color="text.secondary">{r.niveau}</Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: r.color }}>{r.count}</Typography>
                <Typography variant="caption" color="text.secondary">risques</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Bloc titre="Criticité moyenne par catégorie (probabilité × impact)">
            {radar.length >= 3 ? (
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="axe" />
                  <PolarRadiusAxis domain={[0, 25]} />
                  <Radar name="Criticité" dataKey="score" stroke="#F44336" fill="#F44336" fillOpacity={0.3} />
                  <RechartTooltip />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EtatVide
                titre="Profil non traçable"
                detail="Au moins trois catégories de risques renseignées sont nécessaires pour tracer le radar."
              />
            )}
          </Bloc>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Bloc titre="Risques critiques et élevés">
            {majeurs.length > 0 ? (
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {majeurs.map((r) => (
                  <Alert
                    key={r.id}
                    severity={r.niveau === 'Critique' ? 'error' : 'warning'}
                    icon={<GoogleIcon name={r.niveau === 'Critique' ? 'warning' : 'gpp_maybe'} size={16} />}
                    sx={{ borderRadius: 2, py: 0.5 }}
                  >
                    <Typography variant="caption" fontWeight={600} display="block">
                      {r.code} — {r.nom}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {LIBELLES_CATEGORIE_RISQUE[r.categorie] ?? r.categorie}
                      {r.province ? ` · ${r.province}` : ''} · responsable : {r.responsable}
                    </Typography>
                  </Alert>
                ))}
              </Stack>
            ) : (
              <EtatVide titre="Aucun risque critique ou élevé enregistré" />
            )}
          </Bloc>
        </Grid>
      </Grid>
    </Box>
  );
};

const MOIS_COURTS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const COULEURS_TYPE_PLAINTE: Record<string, string> = {
  VBG: '#D32F2F', EAS: '#F44336', HS: '#EF5350',
  Technique: '#FF9800', Administratif: '#FFC107',
  Financier: '#8E24AA', Environnemental: '#2E7D32',
};

/** Répartition des plaintes par type, dans l'ordre décroissant des volumes. */
const compterParType = (plaintes: Plainte[]) => {
  const compte = new Map<string, number>();
  plaintes.forEach((p) => compte.set(p.type, (compte.get(p.type) ?? 0) + 1));
  return [...compte.entries()]
    .map(([type, count]) => ({ type, count, color: COULEURS_TYPE_PLAINTE[type] ?? '#9E9E9E' }))
    .sort((a, b) => b.count - a.count);
};

const RapportGRM: React.FC<PropsRapport> = ({ d }) => {
  const plaintes = d.plaintes;
  const estResolue = (p: Plainte) => p.statut === 'traitee' || p.statut === 'cloturee';
  const resolues = plaintes.filter(estResolue).length;
  const enCours = plaintes.filter((p) => p.statut === 'en_cours' || p.statut === 'recue' || p.statut === 'referee').length;
  const delais = plaintes.map((p) => p.delai_traite).filter((v): v is number => typeof v === 'number');
  const delaiMoyen = delais.length ? Math.round((delais.reduce((a, b) => a + b, 0) / delais.length) * 10) / 10 : null;

  /** Série mensuelle reconstituée à partir des dates de réception réelles. */
  const serie = useMemo(() => {
    const buckets = new Map<string, { mois: string; recues: number; resolues: number; tri: number }>();
    plaintes.forEach((p) => {
      const date = new Date(p.date_reception);
      if (Number.isNaN(date.getTime())) return;
      const cle = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      const entree = buckets.get(cle) ?? {
        mois: `${MOIS_COURTS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
        recues: 0, resolues: 0,
        tri: date.getFullYear() * 12 + date.getMonth(),
      };
      entree.recues += 1;
      if (estResolue(p)) entree.resolues += 1;
      buckets.set(cle, entree);
    });
    return [...buckets.values()].sort((a, b) => a.tri - b.tri).slice(-12);
  }, [plaintes]);

  const parType = compterParType(plaintes);

  if (plaintes.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <EtatVide
          titre="Aucune plainte enregistrée"
          detail="Le mécanisme de gestion des plaintes ne contient aucun enregistrement pour la période servie."
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Plaintes reçues" value={nombre(plaintes.length)} icon="inbox" color="#D32F2F" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            label="Traitées ou clôturées"
            value={`${nombre(resolues)} (${pourcent(resolues, plaintes.length)} %)`}
            icon="check_circle" color="#2E7D32"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="En cours" value={nombre(enCours)} icon="pending" color="#FF9800" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            label="Délai moyen"
            value={delaiMoyen != null ? `${delaiMoyen} j` : '—'}
            icon="schedule" color="#1976D2"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Bloc titre="Plaintes reçues et traitées, par mois de réception">
            {serie.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mois" />
                  <YAxis allowDecimals={false} />
                  <RechartTooltip formatter={fmtNum} />
                  <Legend />
                  <Bar dataKey="recues" name="Reçues" fill="#EF9A9A" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolues" name="Traitées" fill="#2E7D32" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EtatVide titre="Dates de réception non exploitables" />
            )}
          </Bloc>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Bloc titre="Typologie des plaintes">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={parType} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="type"
                  labelLine={false}
                  label={({ name, percent }) => `${name as string} ${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {parType.map((t, i) => <Cell key={i} fill={t.color} />)}
                </Pie>
                <RechartTooltip formatter={fmtNum} />
              </PieChart>
            </ResponsiveContainer>
          </Bloc>
        </Grid>
      </Grid>
    </Box>
  );
};

const RapportParProvince: React.FC<PropsRapport> = ({ d }) => {
  const provinces = [...d.provinces].sort(
    (a, b) => (b.beneficiaires?.total ?? 0) - (a.beneficiaires?.total ?? 0),
  );
  const avecScore = provinces.filter((p) => p.performance_score != null);
  const totaux = provinces.map((p) => p.beneficiaires?.total ?? 0);
  const ecart = totaux.length > 1 ? Math.max(...totaux) - Math.min(...totaux) : null;

  if (provinces.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <EtatVide titre="Aucune province servie" detail="Le service /provinces n'a renvoyé aucun enregistrement." />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Provinces servies" value={nombre(provinces.length)} icon="map" color="#2E7D32" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Effectif le plus élevé" value={provinces[0]?.name ?? '—'} icon="emoji_events" color="#FF9800" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard
            label="Meilleur score"
            value={
              avecScore.length
                ? `${Math.max(...avecScore.map((p) => p.performance_score ?? 0))} %`
                : '—'
            }
            icon="bar_chart" color="#4CAF50"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <KPICard label="Écart min–max" value={nombre(ecart)} icon="compare_arrows" color="#1976D2" />
        </Grid>
      </Grid>

      <Bloc titre="Exploitants inscrits par province">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={provinces.map((p) => ({ province: p.name, value: p.beneficiaires?.total ?? 0 }))}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="province" angle={-20} textAnchor="end" interval={0} height={60} />
            <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
            <RechartTooltip formatter={fmtNum} />
            <Bar dataKey="value" name="Exploitants" radius={[4, 4, 0, 0]}>
              {provinces.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Bloc>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export const PowerBIReports: React.FC = () => {
  const { donnees, chargement, recharger } = useDonneesRapports();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRapport, setSelectedRapport] = useState<Rapport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = rapports.filter((r) => {
    const matchCat = selectedCategory === 'all' || r.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    return matchCat && (r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
  });

  const rendu = (id: string) => {
    switch (id) {
      case 'executif': return <RapportExecutif d={donnees} />;
      case 'iodp': return <RapportIODP d={donnees} />;
      case 'beneficiaires': return <RapportBeneficiaires d={donnees} />;
      case 'risques': return <RapportRisques d={donnees} />;
      case 'grm': return <RapportGRM d={donnees} />;
      case 'provinces': return <RapportParProvince d={donnees} />;
      default:
        return <Box sx={{ p: 3 }}><EtatVide titre="Rapport non disponible" /></Box>;
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
            Rapports &amp; Analyses
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tableaux de bord construits sur les données du cadre de résultats, du RNA, du registre
            des risques et du mécanisme de gestion des plaintes.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<GoogleIcon name="refresh" size={18} />}
          onClick={recharger}
          disabled={chargement}
        >
          Actualiser
        </Button>
      </Stack>

      {chargement && <LinearProgress sx={{ mb: 2 }} />}

      {!chargement && donnees.echecs.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Sources indisponibles : {donnees.echecs.join(', ')}. Les rapports concernés restent vides.
        </Alert>
      )}

      {!chargement && donnees.chargeLe && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Données extraites le {donnees.chargeLe.toLocaleString('fr-FR')} — {donnees.cadre.length} indicateurs
          du cadre, {donnees.provinces.length} provinces, {donnees.risques.length} risques,{' '}
          {donnees.plaintes.length} plaintes.
        </Typography>
      )}

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          placeholder="Rechercher un rapport…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <GoogleIcon name="search" size={20} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <GoogleIcon name="close" size={16} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Paper>

      <Tabs
        value={selectedCategory}
        onChange={(_, v) => setSelectedCategory(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {categories.map((cat) => (
          <Tab key={cat.value} value={cat.value} label={cat.label}
               icon={<GoogleIcon name={cat.icon} size={18} />} iconPosition="start" />
        ))}
      </Tabs>

      <Grid container spacing={3}>
        {filtered.map((rapport) => {
          const pal = PALETTE[rapport.category];
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={rapport.id}>
              <Card
                sx={{
                  borderRadius: 2, cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  border: `1px solid ${pal.bg}`,
                }}
                onClick={() => { setSelectedRapport(rapport); setDialogOpen(true); }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: pal.bg, color: pal.fg, width: 44, height: 44 }}>
                      <GoogleIcon
                        name={categories.find((c) => c.value === rapport.category)?.icon ?? 'bar_chart'}
                        size={24}
                      />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>{rapport.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {donnees.chargeLe
                          ? `Données du ${donnees.chargeLe.toLocaleDateString('fr-FR')}`
                          : 'Données non chargées'}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {rapport.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={categories.find((c) => c.value === rapport.category)?.label}
                      size="small"
                      sx={{ bgcolor: pal.bg, color: pal.fg }}
                    />
                    <Tooltip title="Ouvrir le rapport">
                      <IconButton size="small" sx={{ color: pal.fg }}>
                        <GoogleIcon name="open_in_new" size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filtered.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, mt: 2 }}>
          <GoogleIcon name="search_off" size={48} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">Aucun rapport trouvé</Typography>
          <Typography variant="body2" color="text.secondary">Modifiez vos critères de recherche</Typography>
        </Paper>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { maxHeight: '92vh', borderRadius: 3 } }}
      >
        {selectedRapport && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GoogleIcon name="analytics" size={24} sx={{ color: PALETTE[selectedRapport.category].fg }} />
                <Typography variant="h6" fontWeight={600}>{selectedRapport.name}</Typography>
                <Chip
                  label={categories.find((c) => c.value === selectedRapport.category)?.label}
                  size="small"
                  sx={{
                    bgcolor: PALETTE[selectedRapport.category].bg,
                    color: PALETTE[selectedRapport.category].fg,
                  }}
                />
              </Box>
              <IconButton onClick={() => setDialogOpen(false)}>
                <GoogleIcon name="close" size={20} />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
              {chargement ? (
                <Box sx={{ p: 6, display: 'flex', justifyContent: 'center' }}>
                  <CircularProgress sx={{ color: '#2E7D32' }} />
                </Box>
              ) : (
                rendu(selectedRapport.id)
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">
                {donnees.chargeLe
                  ? `Source : services du programme — extraction du ${donnees.chargeLe.toLocaleString('fr-FR')}`
                  : 'Aucune extraction disponible'}
              </Typography>
              <Button onClick={() => setDialogOpen(false)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PowerBIReports;
