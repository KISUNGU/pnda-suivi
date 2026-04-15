// frontend/src/pages/Database/IndicateursDatabase.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  InputAdornment,
  Button,
  Grid,
  Stack,
  Drawer,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  LinearProgress,
  Menu,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  Clear,
  TrendingUp,
  Info,
  Edit,
  History,
  Calculate,
  ShowChart,
  Assessment,
  Visibility,
} from '@mui/icons-material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { indicateursDatabaseService, type IndicateurComplet, type IndicateurFilters, type IndicateurStats } from '../../services/indicateursDatabase.service';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// Données mockées
const mockIndicateurs: IndicateurComplet[] = [
  // IODP
  {
    id: 1,
    code: 'IODP1.1',
    nom: 'Hausse des ventes sur les marchés formels',
    description: 'Augmentation en pourcentage des ventes des petits exploitants sur les marchés formels',
    type: 'iodp',
    composante: 'Accès au marché',
    sous_composante: 'Appui à l\'inclusion dans les chaînes de valeur',
    formule: '((Surplus à l\'année t / Surplus à l\'année 0) - 1) x 100',
    unite: '%',
    frequence: 'annuelle',
    source_donnees: 'Enquêtes sur la production des bénéficiaires',
    responsable_collecte: 'UNCP',
    valeurs: { reference: 12, cible: 30, actuelle: 15, progression: 50 },
    historique: [
      { periode: 'T1 2025', valeur: 12, source: 'Enquête baseline' },
      { periode: 'T2 2025', valeur: 13, source: 'Enquête mi-parcours' },
      { periode: 'T3 2025', valeur: 14, source: 'Enquête trimestrielle' },
      { periode: 'T4 2025', valeur: 14.5, source: 'Enquête trimestrielle' },
      { periode: 'T1 2026', valeur: 15, source: 'Enquête trimestrielle' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
  {
    id: 2,
    code: 'IODP2.1',
    nom: 'Nombre d\'exploitants ayant adopté une technologie améliorée',
    description: 'Nombre cumulé de petits exploitants ayant adopté une technologie agricole améliorée',
    type: 'iodp',
    composante: 'Productivité agricole',
    sous_composante: 'Appui aux petits exploitants',
    formule: 'Somme cumulée des petits exploitants bénéficiaires',
    unite: 'nombre',
    frequence: 'annuelle',
    source_donnees: 'Enregistrement des petits exploitants',
    responsable_collecte: 'UNCP',
    valeurs: { reference: 25000, cible: 50000, actuelle: 32450, progression: 64.9 },
    historique: [
      { periode: 'T1 2025', valeur: 25000, source: 'RNA' },
      { periode: 'T2 2025', valeur: 28000, source: 'RNA' },
      { periode: 'T3 2025', valeur: 29500, source: 'RNA' },
      { periode: 'T4 2025', valeur: 31000, source: 'RNA' },
      { periode: 'T1 2026', valeur: 32450, source: 'RNA' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
  {
    id: 3,
    code: 'IODP2.3',
    nom: 'Hausse du rendement de maïs (AIC)',
    description: 'Augmentation en pourcentage du rendement de maïs grâce aux pratiques AIC',
    type: 'iodp',
    composante: 'Productivité agricole',
    sous_composante: 'Appui aux petits exploitants',
    formule: '((Rendement maïs année t - Rendement maïs année 0) / Rendement maïs année 0) x 100',
    unite: '%',
    frequence: 'annuelle',
    source_donnees: 'Enquêtes sur la production des bénéficiaires',
    responsable_collecte: 'UNCP',
    valeurs: { reference: 18, cible: 30, actuelle: 23, progression: 76.7 },
    historique: [
      { periode: 'T1 2025', valeur: 18, source: 'Enquête baseline' },
      { periode: 'T2 2025', valeur: 19, source: 'Enquête mi-parcours' },
      { periode: 'T3 2025', valeur: 21, source: 'Enquête trimestrielle' },
      { periode: 'T4 2025', valeur: 22, source: 'Enquête trimestrielle' },
      { periode: 'T1 2026', valeur: 23, source: 'Enquête trimestrielle' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
  {
    id: 4,
    code: 'IODP3.1',
    nom: 'Plans de contingence pour risques agricoles',
    description: 'Nombre de plans de contingence approuvés pour les risques liés au secteur agricole',
    type: 'iodp',
    composante: 'Capacité du secteur public',
    sous_composante: 'Renforcement des capacités',
    formule: 'Nombre cumulé de plans de contingence approuvés',
    unite: 'nombre',
    frequence: 'annuelle',
    source_donnees: 'Rapport d\'activités du Programme',
    responsable_collecte: 'UNCP',
    valeurs: { reference: 3, cible: 8, actuelle: 5, progression: 62.5 },
    historique: [
      { periode: 'T1 2025', valeur: 3, source: 'Rapport annuel' },
      { periode: 'T2 2025', valeur: 3, source: 'Rapport trimestriel' },
      { periode: 'T3 2025', valeur: 4, source: 'Rapport trimestriel' },
      { periode: 'T4 2025', valeur: 4, source: 'Rapport trimestriel' },
      { periode: 'T1 2026', valeur: 5, source: 'Rapport trimestriel' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
  // IR
  {
    id: 5,
    code: 'IR1.1.1',
    nom: 'Petits exploitants atteints par des actifs agricoles',
    description: 'Nombre de petits exploitants ayant reçu des actifs ou services agricoles',
    type: 'ir',
    composante: 'Productivité agricole',
    sous_composante: 'Appui aux petits exploitants',
    formule: 'Somme cumulée des bénéficiaires',
    unite: 'nombre',
    frequence: 'semestrielle',
    source_donnees: 'Données collectées par l\'OT',
    responsable_collecte: 'UNCP',
    valeurs: { reference: 98000, cible: 150000, actuelle: 124530, progression: 83 },
    historique: [
      { periode: 'S1 2025', valeur: 98000, source: 'OT' },
      { periode: 'S2 2025', valeur: 112000, source: 'OT' },
      { periode: 'S1 2026', valeur: 124530, source: 'OT' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
  {
    id: 6,
    code: 'IR2.1.1',
    nom: 'Kilomètres de routes réhabilitées',
    description: 'Total des routes réhabilitées par le programme',
    type: 'ir',
    composante: 'Accès au marché',
    sous_composante: 'Infrastructures rurales',
    formule: 'Somme des km de routes',
    unite: 'km',
    frequence: 'annuelle',
    source_donnees: 'Les missions de contrôle, Ingénieurs du programme',
    responsable_collecte: 'OVDA/UNCP',
    valeurs: { reference: 150, cible: 500, actuelle: 300, progression: 60 },
    historique: [
      { periode: 'T1 2025', valeur: 150, source: 'OVDA' },
      { periode: 'T2 2025', valeur: 180, source: 'OVDA' },
      { periode: 'T3 2025', valeur: 220, source: 'OVDA' },
      { periode: 'T4 2025', valeur: 260, source: 'OVDA' },
      { periode: 'T1 2026', valeur: 300, source: 'OVDA' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
  {
    id: 7,
    code: 'IR3.1.4',
    nom: 'Traitement des réclamations GRM',
    description: 'Pourcentage des plaintes traitées dans les délais',
    type: 'ir',
    composante: 'Services publics agricoles',
    sous_composante: 'Renforcement des capacités',
    formule: '(Plaintes traitées / Plaintes reçues) x 100',
    unite: '%',
    frequence: 'annuelle',
    source_donnees: 'GRM Système d\'information',
    responsable_collecte: 'OT/UNCP/UEP',
    valeurs: { reference: 65, cible: 90, actuelle: 78, progression: 86.7 },
    historique: [
      { periode: 'T1 2025', valeur: 65, source: 'GRM' },
      { periode: 'T2 2025', valeur: 68, source: 'GRM' },
      { periode: 'T3 2025', valeur: 72, source: 'GRM' },
      { periode: 'T4 2025', valeur: 75, source: 'GRM' },
      { periode: 'T1 2026', valeur: 78, source: 'GRM' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
  {
    id: 8,
    code: 'IR4.1',
    nom: 'Plans de contingence préparés',
    description: 'Plans de réponse aux urgences agricoles approuvés',
    type: 'ir',
    composante: 'Intervention d\'urgence agricole',
    formule: 'Nombre de plans approuvés',
    unite: 'nombre',
    frequence: 'annuelle',
    source_donnees: 'Rapport Final du Manuel d\'Intervention d\'Urgence',
    responsable_collecte: 'UNCP/UEP',
    valeurs: { reference: 2, cible: 8, actuelle: 5, progression: 62.5 },
    historique: [
      { periode: 'T1 2025', valeur: 2, source: 'Rapport' },
      { periode: 'T2 2025', valeur: 2, source: 'Rapport' },
      { periode: 'T3 2025', valeur: 3, source: 'Rapport' },
      { periode: 'T4 2025', valeur: 4, source: 'Rapport' },
      { periode: 'T1 2026', valeur: 5, source: 'Rapport' },
    ],
    statut: 'actif',
    created_at: '2024-01-01',
    updated_at: '2026-03-28',
  },
];

const mockStats: IndicateurStats = {
  total: 28,
  par_type: { iodp: 11, ir: 17 },
  par_composante: {
    'Productivité agricole': 12,
    'Accès au marché': 8,
    'Services publics agricoles': 5,
    'Intervention d\'urgence agricole': 3,
  },
  par_frequence: {
    mensuelle: 4,
    trimestrielle: 8,
    semestrielle: 6,
    annuelle: 10,
  },
  progression_moyenne: 72.5,
  indicateurs_atteints: 8,
  indicateurs_en_alerte: 5,
};

const getTypeColor = (type: string) => {
  return type === 'iodp' ? '#2E7D32' : '#1976D2';
};

const getFrequenceLabel = (freq: string) => {
  switch (freq) {
    case 'mensuelle': return 'Mensuelle';
    case 'trimestrielle': return 'Trimestrielle';
    case 'semestrielle': return 'Semestrielle';
    case 'annuelle': return 'Annuelle';
    default: return freq;
  }
};

const getProgressionColor = (progression: number) => {
  if (progression >= 90) return '#4CAF50';
  if (progression >= 70) return '#81C784';
  if (progression >= 50) return '#FFC107';
  return '#F44336';
};

export const IndicateursDatabase: React.FC = () => {
  const [indicateurs, setIndicateurs] = useState<IndicateurComplet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<IndicateurStats | null>(null);
  const [filters, setFilters] = useState<IndicateurFilters>({
    search: '',
    type: '',
    composante: '',
    frequence: '',
    statut: '',
    page: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedIndicateur, setSelectedIndicateur] = useState<IndicateurComplet | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [newValeur, setNewValeur] = useState('');
  const [newPeriode, setNewPeriode] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  const composantes = ['Productivité agricole', 'Accès au marché', 'Services publics agricoles', "Intervention d'urgence agricole"];
  const frequences = ['mensuelle', 'trimestrielle', 'semestrielle', 'annuelle'];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [indRes, statsRes] = await Promise.all([
        indicateursDatabaseService.getAll(filters),
        indicateursDatabaseService.getStats(),
      ]);
      const d = indRes.data;
      setIndicateurs(d.data?.length ? d.data : mockIndicateurs);
      setTotal(d.total ?? mockIndicateurs.length);
      setStats(statsRes.data || mockStats);
    } catch {
      setIndicateurs(mockIndicateurs);
      setTotal(mockIndicateurs.length);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: event.target.value, page: 0 });
  };

  const handleFilterChange = (key: keyof IndicateurFilters, value: IndicateurFilters[keyof IndicateurFilters]) => {
    setFilters({ ...filters, [key]: value, page: 0 });
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, limit: parseInt(event.target.value, 10), page: 0 });
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      type: '',
      composante: '',
      frequence: '',
      statut: '',
      page: 0,
      limit: 10,
    });
  };

  const handleViewDetail = (indicateur: IndicateurComplet) => {
    setSelectedIndicateur(indicateur);
    setDetailDialogOpen(true);
  };

  const handleOpenUpdate = (indicateur: IndicateurComplet) => {
    setSelectedIndicateur(indicateur);
    setNewValeur(indicateur.valeurs.actuelle.toString());
    setNewPeriode('');
    setUpdateDialogOpen(true);
  };

  const handleUpdateValeur = async () => {
    if (!selectedIndicateur || !newValeur) return;
    try {
      await indicateursDatabaseService.updateValeur(selectedIndicateur.id, Number(newValeur), newPeriode);
      setUpdateDialogOpen(false);
      loadData();
    } catch {
      setUpdateDialogOpen(false);
      loadData();
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportAnchorEl(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Export ${format.toUpperCase()} démarré`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && indicateurs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Base de données - Indicateurs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Gestion complète des indicateurs IODP et IR du programme avec suivi des valeurs et historique
      </Typography>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Total indicateurs"
              value={stats.total.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="analytics" size={36} />}
              trend={{ value: stats.par_type.iodp, direction: 'up', period: 'IODP' }}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Progression moyenne"
              value={`${stats.progression_moyenne}%`}
              icon={<GoogleIcon name="trending_up" size={36} />}
              trend={{ value: Math.round(stats.progression_moyenne), direction: 'up', period: 'de la cible' }}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Indicateurs atteints"
              value={stats.indicateurs_atteints.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="check_circle" size={36} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.indicateurs_atteints / stats.total) * 100) : 0, direction: 'up', period: 'du total' }}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Indicateurs en alerte"
              value={stats.indicateurs_en_alerte.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="warning" size={36} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.indicateurs_en_alerte / stats.total) * 100) : 0, direction: 'down', period: 'progression < 50%' }}
              color="danger"
            />
          </Grid>
        </Grid>
      )}

      {/* Barre de recherche et actions */}
      <Paper sx={moduleGridStyles.filterPanel}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par code, nom, description..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button variant="outlined" startIcon={<FilterList />} onClick={() => setFilterDrawerOpen(true)}>
                Filtres
              </Button>
              <Button variant="outlined" startIcon={<Download />} onClick={(e) => setExportAnchorEl(e.currentTarget)}>
                Exporter
              </Button>
              <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={() => setExportAnchorEl(null)}>
                <MenuItem onClick={() => handleExport('pdf')}><GoogleIcon name="picture_as_pdf" size={18} sx={{ mr: 1 }} /> Exporter en PDF</MenuItem>
                <MenuItem onClick={() => handleExport('excel')}><GoogleIcon name="table_chart" size={18} sx={{ mr: 1 }} /> Exporter en Excel</MenuItem>
              </Menu>
              <Tooltip title="Rafraîchir">
                <IconButton onClick={loadData}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Filtres actifs */}
      {(filters.type || filters.composante || filters.frequence) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.type && <Chip label={`Type: ${filters.type.toUpperCase()}`} onDelete={() => handleFilterChange('type', '')} />}
          {filters.composante && <Chip label={`Composante: ${filters.composante}`} onDelete={() => handleFilterChange('composante', '')} />}
          {filters.frequence && <Chip label={`Fréquence: ${getFrequenceLabel(filters.frequence)}`} onDelete={() => handleFilterChange('frequence', '')} />}
          <Chip label="Réinitialiser" onClick={resetFilters} variant="outlined" />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau des indicateurs */}
      <ExportToolbar
        title="Base de données — Indicateurs"
        subtitle="Référentiel des indicateurs de performance du projet"
        columns={[
          { header: 'Code', key: 'code', width: 12 },
          { header: 'Nom', key: 'nom', width: 35 },
          { header: 'Type', key: 'type', width: 10 },
          { header: 'Composante', key: 'composante', width: 22 },
          { header: 'Fréquence', key: 'frequence', width: 14 },
          { header: 'Référence', key: 'val_reference', width: 12 },
          { header: 'Cible', key: 'val_cible', width: 10 },
          { header: 'Actuelle', key: 'val_actuelle', width: 12 },
          { header: 'Progression (%)', key: 'progression', width: 16 },
        ]}
        getData={() => indicateurs.map((i) => ({
          code: i.code,
          nom: i.nom,
          type: i.type,
          composante: i.composante,
          frequence: i.frequence,
          val_reference: i.valeurs?.reference ?? 0,
          val_cible: i.valeurs?.cible ?? 0,
          val_actuelle: i.valeurs?.actuelle ?? 0,
          progression: `${i.valeurs?.progression ?? 0}%`,
        }))}
        filename="indicateurs_database"
        landscape
      />
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F1F8E9' }}>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Nom</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Composante</TableCell>
              <TableCell>Fréquence</TableCell>
              <TableCell>Valeurs (Ref/Cible/Actuelle)</TableCell>
              <TableCell>Progression</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {indicateurs.map((ind) => (
              <TableRow key={ind.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{ind.code}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{ind.nom}</Typography>
                  <Typography variant="caption" color="text.secondary">{ind.description.substring(0, 60)}...</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={ind.type.toUpperCase()} 
                    size="small"
                    sx={{ bgcolor: `${getTypeColor(ind.type)}20`, color: getTypeColor(ind.type) }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{ind.composante}</Typography>
                  {ind.sous_composante && (
                    <Typography variant="caption" color="text.secondary" display="block">{ind.sous_composante}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={getFrequenceLabel(ind.frequence)} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Tooltip title="Référence">
                      <Chip label={ind.valeurs.reference.toLocaleString()} size="small" variant="outlined" />
                    </Tooltip>
                    <Tooltip title="Cible annuelle">
                      <Chip label={(ind.valeurs.cible_annuelle ?? ind.valeurs.cible).toLocaleString()} size="small" variant="outlined" sx={{ bgcolor: '#E3F2FD' }} />
                    </Tooltip>
                    <Tooltip title="Cible finale">
                      <Chip label={ind.valeurs.cible.toLocaleString()} size="small" sx={{ bgcolor: '#FFF3E0' }} />
                    </Tooltip>
                    <Tooltip title="Actuelle">
                      <Chip label={ind.valeurs.actuelle.toLocaleString()} size="small" sx={{ bgcolor: '#E8F5E9' }} />
                    </Tooltip>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(ind.valeurs.progression, 100)} 
                      sx={{ width: 60, height: 6, borderRadius: 2 }}
                    />
                    <Typography variant="caption" fontWeight={500} color={getProgressionColor(ind.valeurs.progression)}>
                      {ind.valeurs.progression}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Voir détails">
                    <IconButton size="small" onClick={() => handleViewDetail(ind)}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Mettre à jour la valeur">
                    <IconButton size="small" onClick={() => handleOpenUpdate(ind)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={filters.page || 0}
          onPageChange={handlePageChange}
          rowsPerPage={filters.limit || 10}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </TableContainer>

      {/* Drawer des filtres */}
      <Drawer anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Filtres avancés</Typography>
          <Divider sx={{ mb: 2 }} />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type</InputLabel>
            <Select value={filters.type || ''} label="Type" onChange={(e) => handleFilterChange('type', e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="iodp">IODP</MenuItem>
              <MenuItem value="ir">IR</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Composante</InputLabel>
            <Select value={filters.composante || ''} label="Composante" onChange={(e) => handleFilterChange('composante', e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {composantes.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Fréquence</InputLabel>
            <Select value={filters.frequence || ''} label="Fréquence" onChange={(e) => handleFilterChange('frequence', e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {frequences.map(f => <MenuItem key={f} value={f}>{getFrequenceLabel(f)}</MenuItem>)}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button variant="outlined" fullWidth onClick={resetFilters}>Réinitialiser</Button>
            <Button variant="contained" fullWidth onClick={() => setFilterDrawerOpen(false)} sx={{ bgcolor: '#2E7D32' }}>Appliquer</Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Dialog de détail */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        {selectedIndicateur && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: getTypeColor(selectedIndicateur.type) }}>
                  {selectedIndicateur.type === 'iodp' ? <TrendingUp /> : <Assessment />}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedIndicateur.code} - {selectedIndicateur.nom}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedIndicateur.type.toUpperCase()} • {selectedIndicateur.composante}</Typography>
                </Box>
                <Chip label={selectedIndicateur.statut === 'actif' ? 'Actif' : 'Inactif'} size="small" sx={{ bgcolor: selectedIndicateur.statut === 'actif' ? '#E8F5E9' : '#FFEBEE' }} />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="Informations" icon={<Info />} iconPosition="start" />
                <Tab label="Formule & Sources" icon={<Calculate />} iconPosition="start" />
                <Tab label="Historique" icon={<History />} iconPosition="start" />
                <Tab label="Performance" icon={<ShowChart />} iconPosition="start" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography variant="body2" paragraph>{selectedIndicateur.description}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Composante</Typography>
                    <Typography variant="body2">{selectedIndicateur.composante}</Typography>
                    {selectedIndicateur.sous_composante && (
                      <Typography variant="caption" color="text.secondary">{selectedIndicateur.sous_composante}</Typography>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Fréquence</Typography>
                    <Typography variant="body2">{getFrequenceLabel(selectedIndicateur.frequence)}</Typography>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Formule de calcul</Typography>
                    <Paper sx={{ p: 2, bgcolor: '#F5F5F5', fontFamily: 'monospace', borderRadius: 2 }}>
                      {selectedIndicateur.formule}
                    </Paper>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Méthodologie de collecte</Typography>
                    <Typography variant="body2">{selectedIndicateur.methodologie_collecte || '—'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Source des données</Typography>
                    <Typography variant="body2">{selectedIndicateur.source_donnees}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Responsable de la collecte</Typography>
                    <Typography variant="body2">{selectedIndicateur.responsable_collecte}</Typography>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F5F5F5' }}>
                      <TableRow>
                        <TableCell>Période</TableCell>
                        <TableCell align="right">Valeur</TableCell>
                        <TableCell>Source</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedIndicateur.historique.map((h, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{h.periode}</TableCell>
                          <TableCell align="right">
                            <strong>{h.valeur.toLocaleString()}</strong> {selectedIndicateur.unite}
                          </TableCell>
                          <TableCell>{h.source}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Valeur référence</Typography>
                      <Typography variant="h5">{selectedIndicateur.valeurs.reference.toLocaleString()} {selectedIndicateur.unite}</Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Cible annuelle</Typography>
                      <Typography variant="h5">{(selectedIndicateur.valeurs.cible_annuelle ?? selectedIndicateur.valeurs.cible).toLocaleString()} {selectedIndicateur.unite}</Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="caption" color="text.secondary">Cible finale</Typography>
                      <Typography variant="h5">{selectedIndicateur.valeurs.cible.toLocaleString()} {selectedIndicateur.unite}</Typography>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Card sx={{ textAlign: 'center', p: 2, bgcolor: '#E8F5E9' }}>
                      <Typography variant="caption" color="text.secondary">Valeur actuelle</Typography>
                      <Typography variant="h5" color="primary.main">{selectedIndicateur.valeurs.actuelle.toLocaleString()} {selectedIndicateur.unite}</Typography>
                    </Card>
                  </Grid>
                  {selectedIndicateur.valeurs.final_realise !== undefined && selectedIndicateur.valeurs.final_realise !== null && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: '#FFF8E1' }}>
                        <Typography variant="caption" color="text.secondary">Réalisé final</Typography>
                        <Typography variant="h5" color="#E65100">{selectedIndicateur.valeurs.final_realise.toLocaleString()} {selectedIndicateur.unite}</Typography>
                      </Card>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Progression vers la cible finale</Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(selectedIndicateur.valeurs.progression, 100)} 
                        sx={{ height: 10, borderRadius: 2 }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        {selectedIndicateur.valeurs.progression}% de la cible finale atteinte
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" startIcon={<Edit />} onClick={() => { setDetailDialogOpen(false); handleOpenUpdate(selectedIndicateur); }} sx={{ bgcolor: '#2E7D32' }}>
                Mettre à jour la valeur
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog mise à jour valeur */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Mettre à jour - {selectedIndicateur?.code}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Indicateur:</strong> {selectedIndicateur?.nom}<br />
              <strong>Unité:</strong> {selectedIndicateur?.unite}<br />
              <strong>Cible annuelle:</strong> {(selectedIndicateur?.valeurs.cible_annuelle ?? selectedIndicateur?.valeurs.cible)?.toLocaleString()} {selectedIndicateur?.unite}<br />
              <strong>Cible finale:</strong> {selectedIndicateur?.valeurs.cible.toLocaleString()} {selectedIndicateur?.unite}
            </Alert>
            <TextField
              fullWidth
              label="Nouvelle valeur"
              type="number"
              value={newValeur}
              onChange={(e) => setNewValeur(e.target.value)}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Période</InputLabel>
              <Select
                value={newPeriode}
                label="Période"
                onChange={(e) => setNewPeriode(e.target.value)}
              >
                <MenuItem value="T1 2026">T1 2026 (Janvier-Mars)</MenuItem>
                <MenuItem value="T2 2026">T2 2026 (Avril-Juin)</MenuItem>
                <MenuItem value="S1 2026">S1 2026 (Premier semestre)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleUpdateValeur} sx={{ bgcolor: '#2E7D32' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IndicateursDatabase;