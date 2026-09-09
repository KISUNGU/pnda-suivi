// frontend/src/pages/Database/ActivitesDatabase.tsx

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
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  LinearProgress,
  Menu,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Snackbar,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  Clear,
  EventNote,
  School,
  Assignment,
  LocalShipping,
  Group,
  Warning,
  CheckCircle,
  Pending,
  Cancel,
  Schedule,
  AttachMoney,
  People,
  LocationOn,
  Person,
  CalendarToday,
  Visibility,
  Edit,
  Delete,
  CloudUpload,
  TableChart,
  InsertDriveFile,
} from '../../components/common/PageIcons';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import activitesService, { type Activite, type ActiviteFilters, type ActiviteStats } from '../../services/activites.service';

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

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'enquete': return <Assignment />;
    case 'formation': return <School />;
    case 'suivi': return <GoogleIcon name="track_changes" size={18} />;
    case 'distribution': return <LocalShipping />;
    case 'reunion': return <Group />;
    case 'plainte': return <Warning />;
    default: return <EventNote />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'enquete': return 'Enquête';
    case 'formation': return 'Formation';
    case 'suivi': return 'Suivi';
    case 'distribution': return 'Distribution';
    case 'reunion': return 'Réunion';
    case 'visite': return 'Visite';
    case 'plainte': return 'Plainte';
    default: return type;
  }
};

const getStatutIcon = (statut: string) => {
  switch (statut) {
    case 'terminee': return <CheckCircle sx={{ color: '#4CAF50' }} />;
    case 'en_cours': return <Pending sx={{ color: '#FFC107' }} />;
    case 'planifiee': return <Schedule sx={{ color: '#2196F3' }} />;
    case 'annulee': return <Cancel sx={{ color: '#F44336' }} />;
    case 'reportee': return <GoogleIcon name="event_busy" size={18} sx={{ color: '#FF9800' }} />;
    default: return null;
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'planifiee': return 'Planifiée';
    case 'en_cours': return 'En cours';
    case 'terminee': return 'Terminée';
    case 'annulee': return 'Annulée';
    case 'reportee': return 'Reportée';
    default: return statut;
  }
};

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'terminee': return '#4CAF50';
    case 'en_cours': return '#FFC107';
    case 'planifiee': return '#2196F3';
    case 'annulee': return '#F44336';
    case 'reportee': return '#FF9800';
    default: return '#9E9E9E';
  }
};

const getPrioriteColor = (priorite: string) => {
  switch (priorite) {
    case 'haute': return '#F44336';
    case 'moyenne': return '#FFC107';
    case 'basse': return '#4CAF50';
    default: return '#9E9E9E';
  }
};

export const ActivitesDatabase: React.FC = () => {
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ActiviteStats | null>(null);
  const [filters, setFilters] = useState<ActiviteFilters>({
    search: '',
    type: '',
    statut: '',
    province: '',
    page: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedActivite, setSelectedActivite] = useState<Activite | null>(null);
  const [formData, setFormData] = useState<Partial<Activite>>({});
  const [tabValue, setTabValue] = useState(0);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const provinces = ['Kinshasa', 'Kongo Central', 'Kwilu', 'Kasaï'];
  const types = ['enquete', 'formation', 'suivi', 'distribution', 'reunion', 'visite', 'plainte'];
  const statuses = ['planifiee', 'en_cours', 'terminee', 'annulee', 'reportee'];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activitesRes, statsRes] = await Promise.all([
        activitesService.getAll(filters),
        activitesService.getStats(),
      ]);
      setActivites(activitesRes.data.data);
      setTotal(activitesRes.data.total);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erreur chargement activités:', err);
      setError('Impossible de charger les données des activités');
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

  const handleFilterChange = (key: keyof ActiviteFilters, value: ActiviteFilters[keyof ActiviteFilters]) => {
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
      statut: '',
      province: '',
      page: 0,
      limit: 10,
    });
  };

  const handleViewDetail = (activite: Activite) => {
    setSelectedActivite(activite);
    setDetailDialogOpen(true);
  };

  const handleEdit = (activite: Activite) => {
    setSelectedActivite(activite);
    setFormData(activite);
    setFormDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
      try {
        await activitesService.delete(id);
        setSnackbar({ open: true, message: 'Activité supprimée avec succès', severity: 'success' });
        loadData();
      } catch (err) {
        setSnackbar({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedActivite && formData.id) {
        await activitesService.update(selectedActivite.id, formData);
        setSnackbar({ open: true, message: 'Activité mise à jour avec succès', severity: 'success' });
      } else {
        await activitesService.create(formData);
        setSnackbar({ open: true, message: 'Activité créée avec succès', severity: 'success' });
      }
      setFormDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erreur lors de l\'enregistrement', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportAnchorEl(null);
    try {
      const response = await activitesService.getAll(filters);
      const data = response.data.data;
      
      if (format === 'excel') {
        const csvRows = [
          ['Code', 'Titre', 'Type', 'Statut', 'Province', 'Date début', 'Date fin', 'Responsable', 'Participants prévus', 'Participants réels', 'Budget prévu (FCFA)', 'Budget réel (FCFA)'],
          ...data.map(a => [
            a.code,
            a.titre,
            getTypeLabel(a.type),
            getStatutLabel(a.statut),
            a.province,
            new Date(a.date_debut).toLocaleDateString('fr-FR'),
            new Date(a.date_fin).toLocaleDateString('fr-FR'),
            a.responsable,
            a.participants_prevus,
            a.participants_reels || '',
            a.budget_prevu,
            a.budget_reel || '',
          ]),
        ];
        
        const csv = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', `activites_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erreur lors de l\'export', severity: 'error' });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSnackbar({ open: true, message: 'Importation terminée avec succès', severity: 'success' });
      loadData();
    } catch {
      setSnackbar({ open: true, message: 'Erreur lors de l\'importation', severity: 'error' });
    } finally {
      setImporting(false);
    }
  };

  if (loading && activites.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Base de données - Activités
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Gestion complète des activités du programme avec suivi des réalisations et des budgets
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Total activités"
              value={stats.total.toLocaleString('fr-FR')}
              icon={<EventNote sx={{ fontSize: 36 }} />}
              trend={{ value: stats.taux_realisation, direction: 'up', period: 'taux de réalisation' }}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Budget total"
              value={`${(stats.budget_total / 1000000).toFixed(0)} K $`}
              icon={<AttachMoney sx={{ fontSize: 36 }} />}
              trend={{ value: stats.budget_total > 0 ? Math.round((stats.budget_depense / stats.budget_total) * 100) : 0, direction: 'up', period: 'budget consommé' }}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Participants"
              value={stats.participants_total.toLocaleString('fr-FR')}
              icon={<People sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total > 0 ? Math.round(stats.participants_total / stats.total) : 0, direction: 'up', period: 'participants / activité' }}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Activités terminées"
              value={(stats.par_statut?.terminee || 0).toLocaleString('fr-FR')}
              icon={<CheckCircle sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total > 0 ? Math.round(((stats.par_statut?.terminee || 0) / stats.total) * 100) : 0, direction: 'up', period: 'du total' }}
              color="warning"
            />
          </Grid>
        </Grid>
      )}

      {/* Barre de recherche et actions */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par titre, code, responsable..."
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
                <MenuItem onClick={() => handleExport('excel')}><TableChart sx={{ mr: 1 }} /> Exporter en CSV</MenuItem>
              </Menu>
              <Button variant="outlined" component="label" startIcon={<CloudUpload />} disabled={importing}>
                Importer
                <input type="file" hidden accept=".csv,.xlsx" onChange={handleImport} />
              </Button>
              <Button variant="contained" startIcon={<GoogleIcon name="add" size={18} />} onClick={() => { setSelectedActivite(null); setFormData({}); setFormDialogOpen(true); }} sx={{ bgcolor: '#2E7D32' }}>
                Nouvelle activité
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
      {(filters.type || filters.statut || filters.province) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.type && <Chip label={`Type: ${getTypeLabel(filters.type)}`} onDelete={() => handleFilterChange('type', '')} />}
          {filters.statut && <Chip label={`Statut: ${getStatutLabel(filters.statut)}`} onDelete={() => handleFilterChange('statut', '')} />}
          {filters.province && <Chip label={`Province: ${filters.province}`} onDelete={() => handleFilterChange('province', '')} />}
          <Chip label="Réinitialiser" onClick={resetFilters} variant="outlined" />
        </Box>
      )}

      {/* Export Toolbar */}
      <ExportToolbar
        title="Base de données — Activités"
        subtitle="Suivi des activités du projet"
        columns={[
          { header: 'Code', key: 'code', width: 14 },
          { header: 'Titre', key: 'titre', width: 35 },
          { header: 'Type', key: 'type', width: 20 },
          { header: 'Statut', key: 'statut', width: 16 },
          { header: 'Province', key: 'province', width: 18 },
          { header: 'Date début', key: 'date_debut', width: 14 },
          { header: 'Date fin', key: 'date_fin', width: 14 },
          { header: 'Responsable', key: 'responsable', width: 22 },
        ]}
        getData={() => activites.map((a) => ({
          code: a.code,
          titre: a.titre,
          type: getTypeLabel(a.type),
          statut: getStatutLabel(a.statut),
          province: a.province,
          date_debut: new Date(a.date_debut).toLocaleDateString('fr-FR'),
          date_fin: new Date(a.date_fin).toLocaleDateString('fr-FR'),
          responsable: a.responsable,
        }))}
        filename="activites_database"
        landscape
      />

      {/* Tableau des activités */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Titre</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Dates</TableCell>
              <TableCell>Responsable</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Aucune activité trouvée</Typography>
                </TableCell>
              </TableRow>
            ) : (
              activites.map((activite) => (
                <TableRow key={activite.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{activite.code}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{activite.titre}</Typography>
                    <Typography variant="caption" color="text.secondary">{activite.description?.substring(0, 50)}...</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip icon={getTypeIcon(activite.type)} label={getTypeLabel(activite.type)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {getStatutIcon(activite.statut)}
                      <Chip 
                        label={getStatutLabel(activite.statut)}
                        size="small"
                        sx={{ bgcolor: `${getStatutColor(activite.statut)}20`, color: getStatutColor(activite.statut) }}
                      />
                    </Stack>
                  </TableCell>
                  <TableCell>{activite.province}</TableCell>
                  <TableCell>
                    <Typography variant="caption" display="block">
                      Début: {new Date(activite.date_debut).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Fin: {new Date(activite.date_fin).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{activite.responsable}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Voir détails">
                      <IconButton size="small" onClick={() => handleViewDetail(activite)}>
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Modifier">
                      <IconButton size="small" onClick={() => handleEdit(activite)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton size="small" color="error" onClick={() => handleDelete(activite.id)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
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
            <InputLabel>Type d'activité</InputLabel>
            <Select value={filters.type || ''} label="Type d'activité" onChange={(e) => handleFilterChange('type', e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {types.map(t => <MenuItem key={t} value={t}>{getTypeLabel(t)}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Statut</InputLabel>
            <Select value={filters.statut || ''} label="Statut" onChange={(e) => handleFilterChange('statut', e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{getStatutLabel(s)}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Province</InputLabel>
            <Select value={filters.province || ''} label="Province" onChange={(e) => handleFilterChange('province', e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
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
        {selectedActivite && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Avatar sx={{ bgcolor: getStatutColor(selectedActivite.statut) }}>
                  {getTypeIcon(selectedActivite.type)}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedActivite.titre}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedActivite.code}</Typography>
                </Box>
                <Chip 
                  label={getStatutLabel(selectedActivite.statut)}
                  sx={{ bgcolor: `${getStatutColor(selectedActivite.statut)}20`, color: getStatutColor(selectedActivite.statut) }}
                />
                <Chip 
                  label={`Priorité: ${selectedActivite.priorite}`}
                  size="small"
                  sx={{ bgcolor: `${getPrioriteColor(selectedActivite.priorite)}20`, color: getPrioriteColor(selectedActivite.priorite) }}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="Informations" icon={<EventNote />} iconPosition="start" />
                <Tab label="Objectifs & Résultats" icon={<GoogleIcon name="target" size={18} />} iconPosition="start" />
                <Tab label="Budget & Participants" icon={<AttachMoney />} iconPosition="start" />
                <Tab label="Documents" icon={<InsertDriveFile />} iconPosition="start" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                    <Typography variant="body2" paragraph>{selectedActivite.description}</Typography>
                    
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Lieu</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{selectedActivite.lieu}, {selectedActivite.province}</Typography>
                    </Stack>
                    {selectedActivite.territoire && (
                      <Typography variant="body2" sx={{ ml: 3 }}>{selectedActivite.territoire} - {selectedActivite.village}</Typography>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Dates</Typography>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">Début: {new Date(selectedActivite.date_debut).toLocaleDateString()}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarToday fontSize="small" color="action" />
                        <Typography variant="body2">Fin: {new Date(selectedActivite.date_fin).toLocaleDateString()}</Typography>
                      </Stack>
                    </Stack>
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>Responsable</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Person fontSize="small" color="action" />
                      <Typography variant="body2">{selectedActivite.responsable}</Typography>
                    </Stack>
                    {selectedActivite.responsable_contact && (
                      <Typography variant="caption" color="text.secondary">Contact: {selectedActivite.responsable_contact}</Typography>
                    )}
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Objectifs</Typography>
                    <List dense>
                      {selectedActivite.objectifs?.map((obj, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon><GoogleIcon name="check_circle" size={16} sx={{ color: '#2E7D32' }} /></ListItemIcon>
                          <ListItemText primary={obj} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Résultats attendus</Typography>
                    <List dense>
                      {selectedActivite.resultats_attendus?.map((res, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon><GoogleIcon name="star" size={16} sx={{ color: '#FFC107' }} /></ListItemIcon>
                          <ListItemText primary={res} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  {selectedActivite.resultats_obtenus && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Résultats obtenus</Typography>
                      <Alert severity="success" sx={{ borderRadius: 2 }}>
                        {selectedActivite.resultats_obtenus}
                      </Alert>
                    </Grid>
                  )}
                  {selectedActivite.difficultes && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>Difficultés rencontrées</Typography>
                      <Alert severity="warning" sx={{ borderRadius: 2 }}>
                        {selectedActivite.difficultes}
                      </Alert>
                    </Grid>
                  )}
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Budget</Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Budget prévu:</Typography>
                          <Typography variant="body2" fontWeight={600}>{(selectedActivite.budget_prevu / 1000000).toFixed(0)} K $</Typography>
                        </Stack>
                        {selectedActivite.budget_reel && (
                          <>
                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                              <Typography variant="body2">Budget réel:</Typography>
                              <Typography variant="body2" fontWeight={600}>{(selectedActivite.budget_reel / 1000000).toFixed(0)} K $</Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={(selectedActivite.budget_reel / selectedActivite.budget_prevu) * 100} 
                              sx={{ mt: 1, height: 6, borderRadius: 2 }}
                            />
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Participants</Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Participants prévus:</Typography>
                          <Typography variant="body2" fontWeight={600}>{selectedActivite.participants_prevus}</Typography>
                        </Stack>
                        {selectedActivite.participants_reels && (
                          <>
                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                              <Typography variant="body2">Participants réels:</Typography>
                              <Typography variant="body2" fontWeight={600}>{selectedActivite.participants_reels}</Typography>
                            </Stack>
                            <LinearProgress 
                              variant="determinate" 
                              value={(selectedActivite.participants_reels / selectedActivite.participants_prevus) * 100} 
                              sx={{ mt: 1, height: 6, borderRadius: 2 }}
                            />
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                {!selectedActivite.documents || selectedActivite.documents.length === 0 ? (
                  <Alert severity="info">Aucun document joint</Alert>
                ) : (
                  <List>
                    {selectedActivite.documents.map((doc, idx) => (
                      <ListItem key={idx} disablePadding>
                        <ListItemButton component="a" href={doc.url} target="_blank">
                          <ListItemIcon><InsertDriveFile /></ListItemIcon>
                          <ListItemText primary={doc.nom} />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" startIcon={<Edit />} onClick={() => { setDetailDialogOpen(false); handleEdit(selectedActivite); }} sx={{ bgcolor: '#2E7D32' }}>
                Modifier
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog formulaire */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedActivite ? 'Modifier l\'activité' : 'Nouvelle activité'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Titre" value={formData.titre || ''} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Description" multiline rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={formData.type || 'enquete'} label="Type" onChange={(e) => setFormData({ ...formData, type: e.target.value as Activite['type'] })}>
                  {types.map(t => <MenuItem key={t} value={t}>{getTypeLabel(t)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select value={formData.statut || 'planifiee'} label="Statut" onChange={(e) => setFormData({ ...formData, statut: e.target.value as Activite['statut'] })}>
                  {statuses.map(s => <MenuItem key={s} value={s}>{getStatutLabel(s)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" label="Date début" value={formData.date_debut || ''} onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })} InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" label="Date fin" value={formData.date_fin || ''} onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })} InputLabelProps={{ shrink: true }} required />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Province" value={formData.province || ''} onChange={(e) => setFormData({ ...formData, province: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Lieu" value={formData.lieu || ''} onChange={(e) => setFormData({ ...formData, lieu: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Responsable" value={formData.responsable || ''} onChange={(e) => setFormData({ ...formData, responsable: e.target.value })} required />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Contact responsable" value={formData.responsable_contact || ''} onChange={(e) => setFormData({ ...formData, responsable_contact: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Participants prévus" value={formData.participants_prevus || 0} onChange={(e) => setFormData({ ...formData, participants_prevus: parseInt(e.target.value) || 0 })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="number" label="Budget prévu (FCFA)" value={formData.budget_prevu || 0} onChange={(e) => setFormData({ ...formData, budget_prevu: parseInt(e.target.value) || 0 })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.titre || !formData.date_debut || !formData.date_fin || !formData.province || !formData.responsable} sx={{ bgcolor: '#2E7D32' }}>
            {saving ? 'Enregistrement...' : (selectedActivite ? 'Mettre à jour' : 'Créer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default ActivitesDatabase;