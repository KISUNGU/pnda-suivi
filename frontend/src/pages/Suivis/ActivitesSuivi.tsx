// frontend/src/pages/Suivi/ActivitesSuivi.tsx
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
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  Clear,
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Pending,
  Cancel,
  Schedule,
  LocationOn,
  Person,
  CalendarToday,
  Group,
  Description,
  CloudUpload,
  PictureAsPdf,
  TableChart,
} from '@mui/icons-material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import type { ActiviteSuivi, ActiviteFilters, ActiviteStats } from '../../services/suiviActivites.service';

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
const mockActivites: ActiviteSuivi[] = [
  {
    id: 1,
    code: 'ACT-2026-001',
    titre: 'Enquête de production agricole - Kwilu',
    description: 'Collecte des données de production dans la zone de Idiofa',
    type: 'enquete',
    statut: 'terminee',
    priorite: 'haute',
    date_debut: '2026-03-01',
    date_fin: '2026-03-15',
    lieu: 'Masi-Manimba',
    province: 'Kwilu',
    territoire: 'Idiofa',
    responsable: 'Marie KABEYA',
    equipe: ['Joseph MUKENDI', 'Albert TSHIBOLA'],
    participants_prevus: 150,
    participants_reels: 145,
    objectifs: ['Collecter les données de production', 'Identifier les besoins des agriculteurs'],
    resultats_attendus: ['Base de données actualisée', 'Rapport d\'analyse'],
    resultats_obtenus: '145 exploitants enquêtés, données collectées avec succès',
    photos: [],
    documents: [{ nom: 'Rapport_enquete.pdf', url: '#' }],
    created_at: '2026-02-20T10:00:00Z',
    updated_at: '2026-03-16T14:30:00Z',
    created_by: 'UNCP',
  },
  {
    id: 2,
    code: 'ACT-2026-002',
    titre: 'Formation AIC - Kasaï',
    description: 'Formation aux techniques agricoles intelligentes face au climat',
    type: 'formation',
    statut: 'en_cours',
    priorite: 'haute',
    date_debut: '2026-03-20',
    date_fin: '2026-03-25',
    lieu: 'Kananga',
    province: 'Kasaï',
    territoire: 'Tshikapa',
    responsable: 'Albert TSHIBOLA',
    equipe: ['Marie KABEYA', 'Joseph MUKENDI'],
    participants_prevus: 50,
    participants_reels: 48,
    objectifs: ['Former aux techniques AIC', 'Sensibiliser à l\'adaptation climatique'],
    resultats_attendus: ['50 agriculteurs formés', 'Adoption des techniques'],
    photos: [],
    documents: [],
    created_at: '2026-03-05T09:00:00Z',
    updated_at: '2026-03-22T11:00:00Z',
    created_by: 'SENASEM',
  },
  {
    id: 3,
    code: 'ACT-2026-003',
    titre: 'Distribution d\'intrants - Kongo Central',
    description: 'Distribution de semences améliorées et engrais',
    type: 'distribution',
    statut: 'planifiee',
    priorite: 'haute',
    date_debut: '2026-04-05',
    date_fin: '2026-04-10',
    lieu: 'Matadi',
    province: 'Kongo Central',
    territoire: 'Matadi',
    responsable: 'Pauline LUBALA',
    equipe: ['David KALONJI'],
    participants_prevus: 200,
    objectifs: ['Distribuer les intrants', 'Appuyer la campagne agricole'],
    resultats_attendus: ['200 exploitants servis', 'Amélioration des rendements'],
    photos: [],
    documents: [],
    created_at: '2026-03-10T14:00:00Z',
    updated_at: '2026-03-10T14:00:00Z',
    created_by: 'UNCP',
  },
  {
    id: 4,
    code: 'ACT-2026-004',
    titre: 'Suivi technique post-formation',
    description: 'Évaluation de l\'adoption des techniques après formation',
    type: 'suivi_technique',
    statut: 'planifiee',
    priorite: 'moyenne',
    date_debut: '2026-04-15',
    date_fin: '2026-04-20',
    lieu: 'Kinshasa',
    province: 'Kinshasa',
    territoire: 'Mont Ngafula',
    responsable: 'Joseph MUKENDI',
    equipe: ['Marie KABEYA'],
    participants_prevus: 80,
    objectifs: ['Évaluer le niveau d\'adoption', 'Identifier les difficultés'],
    resultats_attendus: ['Rapport d\'évaluation', 'Recommandations'],
    photos: [],
    documents: [],
    created_at: '2026-03-12T11:30:00Z',
    updated_at: '2026-03-12T11:30:00Z',
    created_by: 'SENASEM',
  },
  {
    id: 5,
    code: 'ACT-2026-005',
    titre: 'Réunion de coordination provinciale',
    description: 'Réunion mensuelle des partenaires de la province',
    type: 'reunion',
    statut: 'terminee',
    priorite: 'moyenne',
    date_debut: '2026-03-18',
    date_fin: '2026-03-18',
    lieu: 'Kinshasa',
    province: 'Kinshasa',
    territoire: 'Gombe',
    responsable: 'Jean MUKENDI',
    equipe: ['Toute l\'équipe'],
    participants_prevus: 25,
    participants_reels: 22,
    objectifs: ['Faire le point des activités', 'Planifier le trimestre suivant'],
    resultats_attendus: ['Compte-rendu', 'Plan d\'action'],
    resultats_obtenus: '22 participants, plan validé',
    photos: [],
    documents: [{ nom: 'CR_reunion.pdf', url: '#' }],
    created_at: '2026-03-05T08:00:00Z',
    updated_at: '2026-03-19T16:00:00Z',
    created_by: 'UNCP',
  },
];

const mockStats: ActiviteStats = {
  total: 28,
  par_type: {
    enquete: 12,
    formation: 8,
    distribution: 4,
    reunion: 3,
    suivi_technique: 1,
    autre: 0,
  },
  par_statut: {
    planifiee: 10,
    en_cours: 6,
    terminee: 10,
    reportee: 1,
    annulee: 1,
  },
  par_province: {
    Kinshasa: 8,
    'Kongo Central': 6,
    Kwilu: 7,
    Kasaï: 5,
    'Haut-Lomami': 2,
  },
  par_mois: [
    { mois: 'Jan', total: 5 },
    { mois: 'Fév', total: 7 },
    { mois: 'Mar', total: 9 },
    { mois: 'Avr', total: 7 },
  ],
  taux_realisation: 71.4,
  participants_total: 245,
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'enquete': return <GoogleIcon name="assignment" size={18} />;
    case 'formation': return <GoogleIcon name="school" size={18} />;
    case 'distribution': return <GoogleIcon name="local_shipping" size={18} />;
    case 'reunion': return <GoogleIcon name="group" size={18} />;
    case 'suivi_technique': return <GoogleIcon name="track_changes" size={18} />;
    default: return <GoogleIcon name="event_note" size={18} />;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'enquete': return 'Enquête';
    case 'formation': return 'Formation';
    case 'distribution': return 'Distribution';
    case 'reunion': return 'Réunion';
    case 'suivi_technique': return 'Suivi technique';
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

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'terminee': return 'Terminée';
    case 'en_cours': return 'En cours';
    case 'planifiee': return 'Planifiée';
    case 'annulee': return 'Annulée';
    case 'reportee': return 'Reportée';
    default: return statut;
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

export const ActivitesSuivi: React.FC = () => {
  const [activites, setActivites] = useState<ActiviteSuivi[]>([]);
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
  const [selectedActivite, setSelectedActivite] = useState<ActiviteSuivi | null>(null);
  const [formData, setFormData] = useState<Partial<ActiviteSuivi>>({});
  const [tabValue, setTabValue] = useState(0);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [importing, setImporting] = useState(false);

  const provinces = ['Kinshasa', 'Kongo Central', 'Kwilu', 'Kasaï', 'Haut-Lomami', 'Tanganyika'];
  const types = ['enquete', 'formation', 'distribution', 'reunion', 'suivi_technique', 'autre'];
  const statuses = ['planifiee', 'en_cours', 'terminee', 'reportee', 'annulee'];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setActivites(mockActivites);
      setTotal(mockActivites.length);
      setStats(mockStats);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData, filters]);

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

  const handleViewDetail = (activite: ActiviteSuivi) => {
    setSelectedActivite(activite);
    setDetailDialogOpen(true);
  };

  const handleEdit = (activite: ActiviteSuivi) => {
    setSelectedActivite(activite);
    setFormData(activite);
    setFormDialogOpen(true);
  };

  const handleDelete = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette activité ?')) {
      await new Promise(resolve => setTimeout(resolve, 500));
      loadData();
    }
  };

  const handleSave = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setFormDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
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

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Importation terminée avec succès');
      loadData();
    } catch {
      setError('Erreur lors de l\'importation');
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
        Suivi des activités
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Planification, suivi et évaluation des activités terrain du programme
      </Typography>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2, borderLeft: '4px solid #2E7D32' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total activités</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.total}</Typography>
                <LinearProgress variant="determinate" value={stats.taux_realisation} sx={{ mt: 1, height: 6, borderRadius: 2 }} />
                <Typography variant="caption" color="text.secondary">Taux de réalisation: {stats.taux_realisation}%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Group sx={{ color: '#2196F3' }} />
                  <Typography variant="caption" color="text.secondary">Participants</Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700}>{stats.participants_total.toLocaleString()}</Typography>
                <Typography variant="caption" color="text.secondary">bénéficiaires touchés</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CheckCircle sx={{ color: '#4CAF50' }} />
                  <Typography variant="caption" color="text.secondary">Activités terminées</Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700} color="success.main">{stats.par_statut.terminee}</Typography>
                <Typography variant="caption" color="text.secondary">sur {stats.total} activités</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Pending sx={{ color: '#FFC107' }} />
                  <Typography variant="caption" color="text.secondary">En cours</Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700} color="warning.main">{stats.par_statut.en_cours}</Typography>
                <Typography variant="caption" color="text.secondary">activités en cours</Typography>
              </CardContent>
            </Card>
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
                <MenuItem onClick={() => handleExport('pdf')}><PictureAsPdf sx={{ mr: 1 }} /> Exporter en PDF</MenuItem>
                <MenuItem onClick={() => handleExport('excel')}><TableChart sx={{ mr: 1 }} /> Exporter en Excel</MenuItem>
              </Menu>
              <Button variant="outlined" component="label" startIcon={<CloudUpload />} disabled={importing}>
                Importer
                <input type="file" hidden accept=".csv,.xlsx" onChange={handleImport} />
              </Button>
              <Button variant="contained" startIcon={<Add />} onClick={() => { setSelectedActivite(null); setFormData({}); setFormDialogOpen(true); }} sx={{ bgcolor: '#2E7D32' }}>
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

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau des activités */}
      <ExportToolbar
        title="Suivi des Activités"
        subtitle="Tableau de bord opérationnel des activités terrain"
        columns={[
          { header: 'Code', key: 'code', width: 14 },
          { header: 'Titre', key: 'titre', width: 35 },
          { header: 'Type', key: 'type', width: 20 },
          { header: 'Statut', key: 'statut', width: 16 },
          { header: 'Province', key: 'province', width: 18 },
          { header: 'Date début', key: 'date_debut', width: 14,
            formatter: (v) => v ? new Date(String(v)).toLocaleDateString('fr-FR') : '' },
          { header: 'Date fin', key: 'date_fin', width: 14,
            formatter: (v) => v ? new Date(String(v)).toLocaleDateString('fr-FR') : '' },
          { header: 'Responsable', key: 'responsable', width: 22 },
        ]}
        getData={() => activites.map((a) => ({
          code: a.code,
          titre: a.titre,
          type: a.type,
          statut: a.statut,
          province: a.province,
          date_debut: a.date_debut,
          date_fin: a.date_fin,
          responsable: a.responsable,
        }))}
        filename="activites_suivi"
        landscape
      />
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F1F8E9' }}>
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
            {activites.map((activite) => (
              <TableRow key={activite.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{activite.code}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{activite.titre}</Typography>
                  <Typography variant="caption" color="text.secondary">{activite.description.substring(0, 50)}...</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={getTypeIcon(activite.type)} 
                    label={getTypeLabel(activite.type)} 
                    size="small" 
                    variant="outlined" 
                  />
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
                    <IconButton size="small" color="error" onClick={() => handleDelete()}>
                      <Delete fontSize="small" />
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                <Tab label="Informations" icon={<Description />} iconPosition="start" />
                <Tab label="Objectifs & Résultats" icon={<GoogleIcon name="target" size={18} />} iconPosition="start" />
                <Tab label="Participants" icon={<Group />} iconPosition="start" />
                <Tab label="Documents" icon={<GoogleIcon name="folder" size={18} />} iconPosition="start" />
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
                    <Typography variant="body2" sx={{ ml: 3 }}>{selectedActivite.territoire}</Typography>
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
                    
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }} gutterBottom>Équipe</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {selectedActivite.equipe.map((m, idx) => (
                        <Chip key={idx} label={m} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Objectifs</Typography>
                    <List dense>
                      {selectedActivite.objectifs.map((obj, idx) => (
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
                      {selectedActivite.resultats_attendus.map((res, idx) => (
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
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Participants</Typography>
                    <Card variant="outlined">
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="body2">Prévus:</Typography>
                          <Typography variant="body2" fontWeight={600}>{selectedActivite.participants_prevus}</Typography>
                        </Stack>
                        {selectedActivite.participants_reels && (
                          <>
                            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                              <Typography variant="body2">Réels:</Typography>
                              <Typography variant="body2" fontWeight={600} color="success.main">
                                {selectedActivite.participants_reels}
                              </Typography>
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
                {selectedActivite.documents?.length === 0 ? (
                  <Alert severity="info">Aucun document joint</Alert>
                ) : (
                  <List>
                    {selectedActivite.documents?.map((doc, idx) => (
                      <ListItem key={idx} disablePadding>
                        <ListItemButton component="a" href={doc.url} target="_blank">
                          <ListItemIcon><Description /></ListItemIcon>
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

      {/* Dialog formulaire (simplifié) */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedActivite ? 'Modifier l\'activité' : 'Nouvelle activité'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Titre" value={formData.titre || ''} onChange={(e) => setFormData({ ...formData, titre: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Description" multiline rows={3} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={formData.type || 'enquete'} label="Type" onChange={(e) => setFormData({ ...formData, type: e.target.value as ActiviteSuivi['type'] })}>
                  {types.map(t => <MenuItem key={t} value={t}>{getTypeLabel(t)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select value={formData.statut || 'planifiee'} label="Statut" onChange={(e) => setFormData({ ...formData, statut: e.target.value as ActiviteSuivi['statut'] })}>
                  {statuses.map(s => <MenuItem key={s} value={s}>{getStatutLabel(s)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" label="Date début" value={formData.date_debut || ''} onChange={(e) => setFormData({ ...formData, date_debut: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth type="date" label="Date fin" value={formData.date_fin || ''} onChange={(e) => setFormData({ ...formData, date_fin: e.target.value })} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Province" value={formData.province || ''} onChange={(e) => setFormData({ ...formData, province: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Responsable" value={formData.responsable || ''} onChange={(e) => setFormData({ ...formData, responsable: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth type="number" label="Participants prévus" value={formData.participants_prevus || ''} onChange={(e) => setFormData({ ...formData, participants_prevus: parseInt(e.target.value) })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#2E7D32' }}>
            {selectedActivite ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActivitesSuivi;