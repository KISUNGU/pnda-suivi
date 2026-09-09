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
} from '../../components/common/PageIcons';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
  const [updateIndicateurId, setUpdateIndicateurId] = useState('');
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
      setIndicateurs(d.data ?? []);
      setTotal(d.total ?? 0);
      setStats(statsRes.data ?? null);
    } catch (err) {
      console.error('Erreur chargement indicateurs:', err);
      setError('Impossible de charger la base des indicateurs');
      setIndicateurs([]);
      setTotal(0);
      setStats(null);
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

  const handleOpenUpdate = (indicateur: IndicateurComplet) => {
    setSelectedIndicateur(indicateur);
    setUpdateIndicateurId(String(indicateur.id));
    setNewValeur(indicateur.valeurs.actuelle.toString());
    setNewPeriode('');
    setUpdateDialogOpen(true);
  };

  const handleOpenNewValue = () => {
    setSelectedIndicateur(null);
    setUpdateIndicateurId('');
    setNewValeur('');
    setNewPeriode('');
    setUpdateDialogOpen(true);
  };

  const handleUpdateIndicateurChange = (indicateurId: string) => {
    setUpdateIndicateurId(indicateurId);

    const indicateur = indicateurs.find((item) => item.id === Number(indicateurId)) ?? null;
    setSelectedIndicateur(indicateur);

    if (indicateur) {
      setNewValeur(indicateur.valeurs.actuelle.toString());
    }
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
              onClick={() => navigate('/indicateurs/cadre')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Progression moyenne"
              value={`${stats.progression_moyenne}%`}
              icon={<GoogleIcon name="trending_up" size={36} />}
              trend={{ value: Math.round(stats.progression_moyenne), direction: 'up', period: 'de la cible' }}
              onClick={() => navigate('/indicateurs/ir')}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Indicateurs atteints"
              value={stats.indicateurs_atteints.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="check_circle" size={36} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.indicateurs_atteints / stats.total) * 100) : 0, direction: 'up', period: 'du total' }}
              onClick={() => navigate('/indicateurs/iodp')}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Indicateurs en alerte"
              value={stats.indicateurs_en_alerte.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="warning" size={36} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.indicateurs_en_alerte / stats.total) * 100) : 0, direction: 'down', period: 'progression < 50%' }}
              onClick={() => navigate('/outils/collecte')}
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
              <Button variant="contained" startIcon={<GoogleIcon name="add" size={18} />} onClick={handleOpenNewValue} sx={{ bgcolor: '#2E7D32' }}>
                Nouvelle valeur
              </Button>
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
          <TableHead sx={{ bgcolor: 'action.hover' }}>
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
              <TableRow
                key={ind.id}
                hover
                onClick={() => navigate(`/indicateurs/${ind.id}`)}
                sx={{ cursor: 'pointer' }}
              >
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
                      <Chip label={(ind.valeurs.cible_annuelle ?? ind.valeurs.cible).toLocaleString()} size="small" variant="outlined" sx={{ bgcolor: 'rgba(57, 135, 229, 0.14)' }} />
                    </Tooltip>
                    <Tooltip title="Cible finale">
                      <Chip label={ind.valeurs.cible.toLocaleString()} size="small" sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)' }} />
                    </Tooltip>
                    <Tooltip title="Actuelle">
                      <Chip label={ind.valeurs.actuelle.toLocaleString()} size="small" sx={{ bgcolor: 'action.hover' }} />
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
                <TableCell align="center" onClick={(event) => event.stopPropagation()}>
                  <Tooltip title="Voir détails">
                    <IconButton size="small" onClick={() => navigate(`/indicateurs/${ind.id}`)}>
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
                    <Paper sx={{ p: 2, bgcolor: 'action.hover', fontFamily: 'monospace', borderRadius: 2 }}>
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
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
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
                    <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="caption" color="text.secondary">Valeur actuelle</Typography>
                      <Typography variant="h5" color="primary.main">{selectedIndicateur.valeurs.actuelle.toLocaleString()} {selectedIndicateur.unite}</Typography>
                    </Card>
                  </Grid>
                  {selectedIndicateur.valeurs.final_realise !== undefined && selectedIndicateur.valeurs.final_realise !== null && (
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(250, 178, 25, 0.14)' }}>
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
          {selectedIndicateur ? `Mettre à jour - ${selectedIndicateur.code}` : 'Nouvelle valeur indicateur'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Indicateur</InputLabel>
              <Select
                value={updateIndicateurId}
                label="Indicateur"
                onChange={(e) => handleUpdateIndicateurChange(String(e.target.value))}
              >
                {indicateurs.map((indicateur) => (
                  <MenuItem key={indicateur.id} value={String(indicateur.id)}>
                    {indicateur.code} - {indicateur.nom}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedIndicateur ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                <strong>Indicateur:</strong> {selectedIndicateur.nom}<br />
                <strong>Unité:</strong> {selectedIndicateur.unite}<br />
                <strong>Cible annuelle:</strong> {(selectedIndicateur.valeurs.cible_annuelle ?? selectedIndicateur.valeurs.cible).toLocaleString()} {selectedIndicateur.unite}<br />
                <strong>Cible finale:</strong> {selectedIndicateur.valeurs.cible.toLocaleString()} {selectedIndicateur.unite}
              </Alert>
            ) : (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Sélectionnez d'abord un indicateur à mettre à jour.
              </Alert>
            )}
            <TextField
              fullWidth
              label="Nouvelle valeur"
              type="number"
              value={newValeur}
              onChange={(e) => setNewValeur(e.target.value)}
              sx={{ mb: 2 }}
              disabled={!selectedIndicateur}
            />
            <FormControl fullWidth>
              <InputLabel>Période</InputLabel>
              <Select
                value={newPeriode}
                label="Période"
                onChange={(e) => setNewPeriode(e.target.value)}
                disabled={!selectedIndicateur}
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
          <Button variant="contained" onClick={handleUpdateValeur} disabled={!selectedIndicateur || !newValeur} sx={{ bgcolor: '#2E7D32' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IndicateursDatabase;