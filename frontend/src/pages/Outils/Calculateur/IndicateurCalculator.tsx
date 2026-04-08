// frontend/src/pages/Outils/Calculateur/IndicateurCalculator.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  FormControl,
  Select,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import GoogleIcon from '../../../components/common/GoogleIcon';
import { calculateurService } from '../../../services/calculateur.service';
import type { IndicateurDefinition, CalculResult } from '../../../services/calculateur.service';

// ---------------------------------------------------------------------------
// Données mockées des indicateurs
// ---------------------------------------------------------------------------
const mockIndicateurs: IndicateurDefinition[] = [
  {
    id: 1,
    code: 'IODP1.1',
    nom: 'Hausse des ventes sur les marchés formels',
    description: 'Augmentation en pourcentage des ventes des petits exploitants sur les marchés formels',
    formule: '((Surplus vendu année t / Surplus vendu année 0) − 1) × 100',
    unite: '%',
    frequence: 'annuelle',
    type: 'iodp',
    composante: 'Accès au marché',
    champs: [
      { id: 'surplus_t',  label: 'Surplus vendu année t (kg)',            type: 'number', required: true },
      { id: 'surplus_t0', label: 'Surplus vendu année de référence (kg)', type: 'number', required: true },
    ],
  },
  {
    id: 2,
    code: 'IODP2.1',
    nom: "Nombre d'exploitants ayant adopté une technologie améliorée",
    description: "Nombre cumulé de petits exploitants ayant adopté une technologie agricole améliorée",
    formule: 'Nouveaux adoptants + Cumul années précédentes',
    unite: 'exploitants',
    frequence: 'annuelle',
    type: 'iodp',
    composante: 'Productivité agricole',
    champs: [
      { id: 'nouveaux',         label: 'Nouveaux adoptants cette année',   type: 'number', required: true },
      { id: 'cumul_anterieur',  label: 'Cumul des années précédentes',     type: 'number', required: true },
    ],
  },
  {
    id: 3,
    code: 'IODP2.3',
    nom: 'Hausse du rendement de maïs (AIC)',
    description: "Augmentation en pourcentage du rendement de maïs grâce aux pratiques AIC",
    formule: '((Rendement t − Rendement t0) / Rendement t0) × 100',
    unite: '%',
    frequence: 'annuelle',
    type: 'iodp',
    composante: 'Productivité agricole',
    champs: [
      { id: 'rendement_t',  label: 'Rendement maïs année t (kg/ha)',        type: 'number', required: true },
      { id: 'rendement_t0', label: 'Rendement maïs année référence (kg/ha)', type: 'number', required: true },
    ],
  },
  {
    id: 4,
    code: 'IODP2.6',
    nom: 'Réduction du taux de mortalité animale',
    description: 'Réduction en pourcentage du taux de mortalité animale',
    formule: '(1 − (Taux mort. t / Taux mort. t0)) × 100',
    unite: '%',
    frequence: 'annuelle',
    type: 'iodp',
    composante: 'Productivité agricole',
    champs: [
      { id: 'taux_t',  label: 'Taux mortalité année t (%)',         type: 'number', required: true },
      { id: 'taux_t0', label: 'Taux mortalité année référence (%)', type: 'number', required: true },
    ],
  },
  {
    id: 5,
    code: 'IR1.1.1',
    nom: 'Petits exploitants atteints par des actifs agricoles',
    description: "Nombre de petits exploitants ayant reçu des actifs ou services agricoles",
    formule: 'Nouveaux bénéficiaires + Cumul périodes précédentes',
    unite: 'personnes',
    frequence: 'semestrielle',
    type: 'ir',
    composante: 'Productivité agricole',
    champs: [
      { id: 'nouveaux',        label: 'Nouveaux bénéficiaires cette période', type: 'number', required: true },
      { id: 'cumul_anterieur', label: 'Cumul des périodes précédentes',        type: 'number', required: true },
    ],
  },
  {
    id: 6,
    code: 'IR2.1.1',
    nom: 'Kilomètres de routes réhabilitées',
    description: 'Total des routes réhabilitées par le programme',
    formule: 'Routes nationales + Routes provinciales + Routes de desserte',
    unite: 'km',
    frequence: 'annuelle',
    type: 'ir',
    composante: 'Accès au marché',
    champs: [
      { id: 'routes_nationales',  label: 'Routes nationales (km)',           type: 'number', required: true },
      { id: 'routes_provinciales', label: 'Routes provinciales (km)',        type: 'number', required: true },
      { id: 'routes_desserte',    label: 'Routes de desserte agricole (km)', type: 'number', required: true },
    ],
  },
  {
    id: 7,
    code: 'IR3.1.4',
    nom: 'Traitement des réclamations GRM',
    description: 'Pourcentage des plaintes traitées dans les délais',
    formule: '(Plaintes traitées dans délai / Plaintes reçues) × 100',
    unite: '%',
    frequence: 'annuelle',
    type: 'ir',
    composante: 'Services publics agricoles',
    champs: [
      { id: 'traitees_delai', label: 'Plaintes traitées dans les délais', type: 'number', required: true },
      { id: 'recues',         label: 'Plaintes reçues',                   type: 'number', required: true },
    ],
  },
  {
    id: 8,
    code: 'IR3.1.7',
    nom: 'Fermiers satisfaits des technologies',
    description: "Pourcentage de fermiers satisfaits des technologies adoptées",
    formule: '(Fermiers satisfaits / Total fermiers ayant adopté) × 100',
    unite: '%',
    frequence: 'annuelle',
    type: 'ir',
    composante: 'Services publics agricoles',
    champs: [
      { id: 'satisfaits',       label: 'Fermiers satisfaits',           type: 'number', required: true },
      { id: 'total_adoptants',  label: "Total fermiers ayant adopté",   type: 'number', required: true },
    ],
  },
];

// Cibles par indicateur
const CIBLES: Record<string, { cible: number; seuil_ok: number }> = {
  'IODP1.1': { cible: 30, seuil_ok: 20 },
  'IODP2.1': { cible: 50000, seuil_ok: 35000 },
  'IODP2.3': { cible: 30, seuil_ok: 20 },
  'IODP2.6': { cible: 20, seuil_ok: 10 },
  'IR1.1.1': { cible: 80000, seuil_ok: 60000 },
  'IR2.1.1': { cible: 500, seuil_ok: 300 },
  'IR3.1.4': { cible: 90, seuil_ok: 75 },
  'IR3.1.7': { cible: 80, seuil_ok: 65 },
};

interface HistoriqueEntry {
  date: string;
  code: string;
  nom: string;
  valeur: number;
  unite: string;
  interpretation: string;
}

const getCategorieColor = (type: string) => type === 'iodp' ? '#2E7D32' : '#1976D2';

const getStatutLabel = (progression: number) => {
  if (progression >= 100) return { label: 'Atteint', color: '#2E7D32', icon: 'check_circle' };
  if (progression >= 70)  return { label: 'En bonne voie', color: '#4CAF50', icon: 'trending_up' };
  if (progression >= 40)  return { label: 'Effort requis', color: '#FF9800', icon: 'warning' };
  return { label: 'Critique', color: '#F44336', icon: 'error' };
};

// ---------------------------------------------------------------------------
export const IndicateurCalculator: React.FC = () => {
  const [indicateurs, setIndicateurs] = useState<IndicateurDefinition[]>([]);
  const [selectedIndicateur, setSelectedIndicateur] = useState<IndicateurDefinition | null>(null);
  const [donnees, setDonnees] = useState<Record<string, number>>({});
  const [resultat, setResultat] = useState<CalculResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([
    { date: '29/03/2026 14:30', code: 'IODP1.1', nom: 'Hausse des ventes', valeur: 15, unite: '%', interpretation: 'Hausse positive des ventes' },
    { date: '28/03/2026 10:15', code: 'IODP2.3', nom: 'Hausse rendement maïs', valeur: 23, unite: '%', interpretation: 'Augmentation du rendement' },
    { date: '27/03/2026 09:00', code: 'IR2.1.1', nom: 'Routes réhabilitées', valeur: 300, unite: 'km', interpretation: '300 km de routes réhabilitées' },
  ]);
  const [historiqueOpen, setHistoriqueOpen] = useState(false);
  const [filtreType, setFiltreType] = useState<'tous' | 'iodp' | 'ir'>('tous');
  const [filtreRecherche, setFiltreRecherche] = useState('');

  useEffect(() => {
    calculateurService.getIndicateurs()
      .then(res => setIndicateurs(res.data?.length ? res.data : mockIndicateurs))
      .catch(() => setIndicateurs(mockIndicateurs))
      .finally(() => setLoading(false));
  }, []);

  const handleSelectIndicateur = (ind: IndicateurDefinition) => {
    setSelectedIndicateur(ind);
    setDonnees({});
    setResultat(null);
    setError(null);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setDonnees(prev => ({ ...prev, [fieldId]: parseFloat(value) || 0 }));
  };

  const handleCalculer = async () => {
    if (!selectedIndicateur) return;

    const champsManquants = selectedIndicateur.champs
      .filter(c => c.required && !donnees[c.id])
      .map(c => c.label);
    if (champsManquants.length > 0) {
      setError(`Veuillez renseigner : ${champsManquants.join(', ')}`);
      return;
    }

    setLoading(true);
    setError(null);

    let res: CalculResult;
    try {
      const apiRes = await calculateurService.calculer(selectedIndicateur.code, donnees);
      res = apiRes.data;
    } catch {
      // Calcul local en fallback
      let valeur = 0;
      let interpretation = '';
      const recommandations: string[] = [];

      switch (selectedIndicateur.code) {
        case 'IODP1.1':
          valeur = ((donnees.surplus_t / donnees.surplus_t0) - 1) * 100;
          interpretation = valeur > 0 ? `Hausse de ${valeur.toFixed(1)}% des ventes` : `Baisse de ${Math.abs(valeur).toFixed(1)}% des ventes`;
          if (valeur < 10) recommandations.push("Renforcer l'accès aux marchés", 'Améliorer la qualité des produits');
          break;
        case 'IODP2.1':
          valeur = donnees.nouveaux + donnees.cumul_anterieur;
          interpretation = `Total cumulé de ${valeur.toLocaleString()} exploitants ayant adopté les technologies`;
          break;
        case 'IODP2.3':
          valeur = ((donnees.rendement_t - donnees.rendement_t0) / donnees.rendement_t0) * 100;
          interpretation = valeur > 0 ? `Augmentation de ${valeur.toFixed(1)}% du rendement` : `Baisse de ${Math.abs(valeur).toFixed(1)}% du rendement`;
          break;
        case 'IODP2.6':
          valeur = (1 - (donnees.taux_t / donnees.taux_t0)) * 100;
          interpretation = valeur > 0 ? `Réduction de ${valeur.toFixed(1)}% de la mortalité` : 'Augmentation de la mortalité';
          break;
        case 'IR1.1.1':
          valeur = donnees.nouveaux + donnees.cumul_anterieur;
          interpretation = `${valeur.toLocaleString()} petits exploitants atteints au total`;
          break;
        case 'IR2.1.1':
          valeur = donnees.routes_nationales + donnees.routes_provinciales + donnees.routes_desserte;
          interpretation = `${valeur.toLocaleString()} km de routes réhabilitées`;
          break;
        case 'IR3.1.4':
          valeur = (donnees.traitees_delai / donnees.recues) * 100;
          interpretation = `${valeur.toFixed(1)}% des plaintes traitées dans les délais`;
          if (valeur < 80) recommandations.push("Renforcer l'équipe GRM", 'Améliorer les procédures de traitement');
          break;
        case 'IR3.1.7':
          valeur = (donnees.satisfaits / donnees.total_adoptants) * 100;
          interpretation = `${valeur.toFixed(1)}% des fermiers sont satisfaits`;
          break;
        default:
          valeur = 0;
          interpretation = 'Calcul non disponible';
      }

      valeur = Math.round(valeur * 10) / 10;
      const cibleInfo = CIBLES[selectedIndicateur.code];
      res = {
        valeur,
        unite: selectedIndicateur.unite,
        progression: cibleInfo ? Math.min((valeur / cibleInfo.cible) * 100, 150) : undefined,
        cible: cibleInfo?.cible,
        interpretation,
        recommandations,
      };
    }

    setResultat(res);
    setHistorique(prev => [{
      date: new Date().toLocaleString('fr-FR'),
      code: selectedIndicateur.code,
      nom: selectedIndicateur.nom,
      valeur: res.valeur,
      unite: res.unite,
      interpretation: res.interpretation,
    }, ...prev]);
    setLoading(false);
  };

  const filteredIndicateurs = indicateurs.filter(ind => {
    const matchType = filtreType === 'tous' || ind.type === filtreType;
    const matchSearch = ind.nom.toLowerCase().includes(filtreRecherche.toLowerCase()) ||
      ind.code.toLowerCase().includes(filtreRecherche.toLowerCase());
    return matchType && matchSearch;
  });

  // Données pour le mini-graphique de comparaison
  const chartData = selectedIndicateur && resultat && CIBLES[selectedIndicateur.code]
    ? [
        { name: 'Réalisé', valeur: resultat.valeur, fill: '#2E7D32' },
        { name: 'Cible', valeur: CIBLES[selectedIndicateur.code].cible, fill: '#E0E0E0' },
        { name: 'Seuil OK', valeur: CIBLES[selectedIndicateur.code].seuil_ok, fill: '#81C784' },
      ]
    : [];

  if (loading && indicateurs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
          Calculateur d'indicateurs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Calcul automatique des indicateurs IODP et IR selon les formules du manuel de suivi-évaluation
        </Typography>
      </Box>

      {/* Cartes résumé */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Indicateurs disponibles', value: indicateurs.length, icon: 'bar_chart', color: '#2E7D32' },
          { label: 'Indicateurs IODP', value: indicateurs.filter(i => i.type === 'iodp').length, icon: 'trending_up', color: '#1976D2' },
          { label: 'Indicateurs IR', value: indicateurs.filter(i => i.type === 'ir').length, icon: 'assessment', color: '#7B1FA2' },
          { label: 'Calculs effectués', value: historique.length, icon: 'history', color: '#FF9800' },
        ].map((kpi) => (
          <Grid size={{ xs: 6, md: 3 }} key={kpi.label}>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: `${kpi.color}15`, borderRadius: '50%', p: 1.2, display: 'flex' }}>
                <GoogleIcon name={kpi.icon} size={24} sx={{ color: kpi.color }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* ── Liste des indicateurs ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Rechercher…"
                value={filtreRecherche}
                onChange={(e) => setFiltreRecherche(e.target.value)}
                InputProps={{
                  startAdornment: <GoogleIcon name="search" size={18} sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select value={filtreType} onChange={(e) => setFiltreType(e.target.value as typeof filtreType)}>
                  <MenuItem value="tous">Tous</MenuItem>
                  <MenuItem value="iodp">IODP</MenuItem>
                  <MenuItem value="ir">IR</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ maxHeight: 520, overflowY: 'auto', pr: 0.5 }}>
              {filteredIndicateurs.map((ind) => {
                const isSelected = selectedIndicateur?.id === ind.id;
                return (
                  <Card
                    key={ind.id}
                    sx={{
                      mb: 1, cursor: 'pointer',
                      borderLeft: `4px solid ${isSelected ? getCategorieColor(ind.type) : 'transparent'}`,
                      bgcolor: isSelected ? '#F1F8E9' : 'white',
                      boxShadow: isSelected ? 2 : 0,
                      '&:hover': { bgcolor: isSelected ? '#F1F8E9' : '#F9F9F9' },
                      transition: 'all .15s',
                    }}
                    onClick={() => handleSelectIndicateur(ind)}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {ind.code}
                          </Typography>
                          <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3 }}>
                            {ind.nom}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">{ind.composante}</Typography>
                        </Box>
                        <Chip
                          label={ind.type.toUpperCase()}
                          size="small"
                          sx={{ bgcolor: getCategorieColor(ind.type) + '15', color: getCategorieColor(ind.type), fontSize: '0.68rem', flexShrink: 0 }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* ── Panneau principal ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedIndicateur ? (
            <Stack spacing={2}>
              {/* Détails de l'indicateur */}
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip
                        label={selectedIndicateur.type.toUpperCase()}
                        size="small"
                        sx={{ bgcolor: getCategorieColor(selectedIndicateur.type) + '15', color: getCategorieColor(selectedIndicateur.type) }}
                      />
                      <Chip label={selectedIndicateur.composante} size="small" variant="outlined" />
                      <Chip label={`Fréquence : ${selectedIndicateur.frequence}`} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedIndicateur.code} — {selectedIndicateur.nom}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {selectedIndicateur.description}
                    </Typography>
                  </Box>
                  <Tooltip title="Historique des calculs">
                    <IconButton onClick={() => setHistoriqueOpen(true)} sx={{ ml: 1 }}>
                      <GoogleIcon name="history" size={22} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Formule */}
                <Accordion disableGutters elevation={0} sx={{ bgcolor: '#F9FBE7', borderRadius: 2, border: '1px solid #DCE775', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<GoogleIcon name="expand_more" size={20} />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <GoogleIcon name="functions" size={18} sx={{ color: '#2E7D32' }} />
                      <Typography variant="subtitle2" fontWeight={600} color="#2E7D32">Formule de calcul</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      sx={{ fontFamily: 'monospace', fontSize: '0.9rem', bgcolor: 'white', borderRadius: 1, p: 1.5 }}
                    >
                      {selectedIndicateur.formule}
                    </Typography>
                    {CIBLES[selectedIndicateur.code] && (
                      <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                        <Chip size="small" label={`Cible : ${CIBLES[selectedIndicateur.code].cible} ${selectedIndicateur.unite}`} color="success" variant="outlined" />
                        <Chip size="small" label={`Seuil acceptable : ${CIBLES[selectedIndicateur.code].seuil_ok} ${selectedIndicateur.unite}`} color="warning" variant="outlined" />
                      </Stack>
                    )}
                  </AccordionDetails>
                </Accordion>

                <Divider sx={{ my: 2 }} />

                {/* Champs de saisie */}
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Données à saisir
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {selectedIndicateur.champs.map((champ) => (
                    <Grid size={{ xs: 12, md: 6 }} key={champ.id}>
                      <TextField
                        fullWidth
                        label={champ.label}
                        type="number"
                        value={donnees[champ.id] ?? ''}
                        onChange={(e) => handleFieldChange(champ.id, e.target.value)}
                        required={champ.required}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  ))}
                </Grid>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={handleCalculer}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon name="calculate" size={18} />}
                    sx={{ bgcolor: '#2E7D32' }}
                  >
                    {loading ? 'Calcul…' : 'Calculer'}
                  </Button>
                  {resultat && (
                    <Button variant="outlined" startIcon={<GoogleIcon name="save" size={18} />}>
                      Sauvegarder
                    </Button>
                  )}
                  <Button
                    variant="text"
                    startIcon={<GoogleIcon name="restart_alt" size={18} />}
                    onClick={() => { setDonnees({}); setResultat(null); setError(null); }}
                  >
                    Réinitialiser
                  </Button>
                </Stack>
              </Paper>

              {/* ── Résultat ── */}
              {resultat && (() => {
                const cibleInfo = CIBLES[selectedIndicateur.code];
                const prog = resultat.progression ?? 0;
                const statut = getStatutLabel(prog);
                return (
                  <Paper sx={{ p: 3, borderRadius: 2, border: `2px solid ${statut.color}20` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>Résultat du calcul</Typography>
                      <Chip
                        label={statut.label}
                        icon={<GoogleIcon name={statut.icon} size={16} sx={{ color: statut.color }} />}
                        sx={{ bgcolor: `${statut.color}15`, color: statut.color, fontWeight: 700 }}
                      />
                    </Stack>

                    <Grid container spacing={3}>
                      {/* Valeur principale */}
                      <Grid size={{ xs: 12, md: cibleInfo ? 6 : 12 }}>
                        <Box sx={{ bgcolor: `${statut.color}08`, borderRadius: 2, p: 2.5, height: '100%' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>VALEUR CALCULÉE</Typography>
                          <Typography variant="h2" fontWeight={800} sx={{ color: statut.color, lineHeight: 1.1, my: 1 }}>
                            {resultat.valeur.toLocaleString()}
                            <Typography component="span" variant="h5" fontWeight={400} sx={{ ml: 0.5, color: 'text.secondary' }}>
                              {resultat.unite}
                            </Typography>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">{resultat.interpretation}</Typography>
                        </Box>
                      </Grid>

                      {/* Progression vers cible */}
                      {cibleInfo && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ bgcolor: '#F5F5F5', borderRadius: 2, p: 2.5, height: '100%' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>PROGRESSION VERS LA CIBLE</Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ color: statut.color, lineHeight: 1.1, my: 1 }}>
                              {Math.min(prog, 100).toFixed(1)}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(prog, 100)}
                              sx={{
                                height: 10, borderRadius: 5, mb: 1,
                                bgcolor: '#E0E0E0',
                                '& .MuiLinearProgress-bar': { bgcolor: statut.color, borderRadius: 5 },
                              }}
                            />
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">0</Typography>
                              <Typography variant="caption" sx={{ color: '#81C784' }}>
                                Seuil : {cibleInfo.seuil_ok} {resultat.unite}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Cible : {cibleInfo.cible} {resultat.unite}
                              </Typography>
                            </Stack>
                          </Box>
                        </Grid>
                      )}
                    </Grid>

                    {/* Mini graphique comparatif */}
                    {chartData.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          Comparaison réalisé / seuils
                        </Typography>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
                            <YAxis type="category" dataKey="name" width={70} />
                            <RechartTooltip formatter={(v) => `${Number(v ?? 0).toLocaleString()} ${resultat.unite}`} />
                            <Bar dataKey="valeur" radius={[0, 4, 4, 0]}>
                              {chartData.map((entry, i) => (
                                <rect key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                            <ReferenceLine x={cibleInfo?.seuil_ok} stroke="#FF9800" strokeDasharray="4 2" label={{ value: 'Seuil', position: 'insideTopRight', fontSize: 11 }} />
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    )}

                    {/* Recommandations */}
                    {resultat.recommandations && resultat.recommandations.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Accordion disableGutters elevation={0} sx={{ bgcolor: '#FFF8E1', borderRadius: 2, border: '1px solid #FFE082', '&:before': { display: 'none' } }} defaultExpanded>
                          <AccordionSummary expandIcon={<GoogleIcon name="expand_more" size={20} />}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <GoogleIcon name="lightbulb" size={18} sx={{ color: '#F9A825' }} />
                              <Typography variant="subtitle2" fontWeight={600} color="#F57F17">
                                Recommandations ({resultat.recommandations.length})
                              </Typography>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Stack spacing={1}>
                              {resultat.recommandations.map((rec, idx) => (
                                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                                  <GoogleIcon name="arrow_right" size={18} sx={{ color: '#F9A825', flexShrink: 0 }} />
                                  <Typography variant="body2">{rec}</Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      </>
                    )}
                  </Paper>
                );
              })()}
            </Stack>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <GoogleIcon name="calculate" size={72} sx={{ color: 'text.disabled' }} />
              <Typography variant="h6" color="text.secondary">Sélectionnez un indicateur</Typography>
              <Typography variant="body2" color="text.disabled">
                Choisissez un indicateur dans la liste de gauche pour saisir vos données et obtenir le calcul automatique.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ── Dialog historique ── */}
      <Dialog open={historiqueOpen} onClose={() => setHistoriqueOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GoogleIcon name="history" size={22} />
            <Typography variant="h6">Historique des calculs</Typography>
            <Chip label={`${historique.length} calculs`} size="small" sx={{ ml: 'auto' }} />
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {historique.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Aucun calcul effectué dans cette session</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Indicateur</strong></TableCell>
                    <TableCell align="right"><strong>Valeur</strong></TableCell>
                    <TableCell><strong>Interprétation</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historique.map((h, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{h.date}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" display="block">{h.code}</Typography>
                        <Typography variant="body2">{h.nom}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>{h.valeur.toLocaleString()} {h.unite}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{h.interpretation}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoriqueOpen(false)}>Fermer</Button>
          <Button variant="contained" sx={{ bgcolor: '#2E7D32' }} startIcon={<GoogleIcon name="download" size={18} />}>
            Exporter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IndicateurCalculator;
