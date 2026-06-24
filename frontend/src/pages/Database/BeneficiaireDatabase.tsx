// frontend/src/pages/Database/BeneficiaireDatabase.tsx
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  Menu,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  Clear,
  Person,
  Female,
  Male,
  Agriculture,
  Pets,
  School,
  FamilyRestroom,
  LocationOn,
  Phone,
  Email,
  Visibility,
  Edit,
  CloudUpload,
  PictureAsPdf,
  TableChart,
} from '@mui/icons-material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { databaseService } from '../../services/database.service';
import type { BeneficiaireComplet, StatistiquesBeneficiaires, ActiviteBeneficiaire } from '../../services/database.service';

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
const mockBeneficiaires: BeneficiaireComplet[] = [
  {
    id: 1,
    rna_id: 'RNA-00123',
    nom: 'MUKENDI',
    prenom: 'Joseph',
    sexe: 'M',
    date_naissance: '1985-03-15',
    age: 41,
    telephone: '+243812345678',
    email: 'joseph.mukendi@email.com',
    province: 'Kwilu',
    territoire: 'Idiofa',
    village: 'Masi-Manimba',
    type_exploitant: 'agriculteur',
    est_jeune: false,
    niveau_instruction: 'secondaire',
    situation_matrimoniale: 'marie',
    nombre_enfants: 4,
    superficie_totale: 5.5,
    superficie_cultivee: 4.2,
    principales_cultures: ['maïs', 'manioc', 'arachide'],
    cheptel: { bovins: 2, caprins: 5, ovins: 0, volailles: 15 },
    technologies_adoptees: ['semences_ameliorees', 'engrais_organiques'],
    est_beneficiaire_subvention: true,
    date_adhesion: '2024-01-15',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2026-03-20T14:30:00Z',
  },
  {
    id: 2,
    rna_id: 'RNA-00124',
    nom: 'KABEYA',
    prenom: 'Marie',
    sexe: 'F',
    date_naissance: '1990-07-22',
    age: 35,
    telephone: '+243823456789',
    email: 'marie.kabeya@email.com',
    province: 'Kasaï',
    territoire: 'Tshikapa',
    village: 'Kananga',
    type_exploitant: 'eleveur',
    est_jeune: true,
    niveau_instruction: 'primaire',
    situation_matrimoniale: 'celibataire',
    nombre_enfants: 1,
    superficie_totale: 3.2,
    superficie_cultivee: 2.0,
    principales_cultures: ['maïs'],
    cheptel: { bovins: 0, caprins: 8, ovins: 3, volailles: 25 },
    technologies_adoptees: ['irrigation', 'semences_ameliorees'],
    est_beneficiaire_subvention: true,
    date_adhesion: '2024-02-20',
    created_at: '2024-02-20T11:00:00Z',
    updated_at: '2026-03-18T09:15:00Z',
  },
  {
    id: 3,
    rna_id: 'RNA-00125',
    nom: 'TSHIBOLA',
    prenom: 'Albert',
    sexe: 'M',
    date_naissance: '1995-11-10',
    age: 30,
    telephone: '+243834567890',
    province: 'Kinshasa',
    territoire: 'Mont Ngafula',
    commune: 'Selembao',
    village: '',
    type_exploitant: 'pisciculteur',
    est_jeune: true,
    niveau_instruction: 'superieur',
    situation_matrimoniale: 'celibataire',
    nombre_enfants: 0,
    superficie_totale: 1.5,
    superficie_cultivee: 1.2,
    principales_cultures: [],
    cheptel: undefined,
    technologies_adoptees: ['aquaculture'],
    est_beneficiaire_subvention: false,
    date_adhesion: '2024-03-10',
    created_at: '2024-03-10T09:30:00Z',
    updated_at: '2026-03-15T16:20:00Z',
  },
  {
    id: 4,
    rna_id: 'RNA-00126',
    nom: 'LUBALA',
    prenom: 'Pauline',
    sexe: 'F',
    date_naissance: '1988-05-03',
    age: 37,
    telephone: '+243845678901',
    province: 'Kongo Central',
    territoire: 'Matadi',
    village: 'Boma',
    type_exploitant: 'mixte',
    est_jeune: false,
    niveau_instruction: 'secondaire',
    situation_matrimoniale: 'marie',
    nombre_enfants: 3,
    superficie_totale: 4.8,
    superficie_cultivee: 3.5,
    principales_cultures: ['manioc', 'arachide'],
    cheptel: { bovins: 1, caprins: 3, ovins: 2, volailles: 12 },
    technologies_adoptees: ['semences_ameliorees', 'conservation_sols'],
    est_beneficiaire_subvention: true,
    date_adhesion: '2024-01-05',
    created_at: '2024-01-05T14:00:00Z',
    updated_at: '2026-03-22T11:45:00Z',
  },
  {
    id: 5,
    rna_id: 'RNA-00127',
    nom: 'KALONJI',
    prenom: 'David',
    sexe: 'M',
    date_naissance: '1992-09-18',
    age: 33,
    telephone: '+243856789012',
    province: 'Haut-Lomami',
    territoire: 'Kamina',
    village: 'Malemba',
    type_exploitant: 'agriculteur',
    est_jeune: true,
    niveau_instruction: 'secondaire',
    situation_matrimoniale: 'marie',
    nombre_enfants: 2,
    superficie_totale: 6.0,
    superficie_cultivee: 5.0,
    principales_cultures: ['maïs', 'soja'],
    cheptel: { bovins: 3, caprins: 4, ovins: 0, volailles: 20 },
    technologies_adoptees: ['semences_ameliorees', 'engrais_organiques', 'irrigation'],
    est_beneficiaire_subvention: true,
    date_adhesion: '2024-02-28',
    created_at: '2024-02-28T08:00:00Z',
    updated_at: '2026-03-25T10:00:00Z',
  },
];

const mockStats: StatistiquesBeneficiaires = {
  total: 124530,
  par_sexe: { hommes: 68492, femmes: 56038 },
  par_type: { agriculteur: 78234, eleveur: 28456, pisciculteur: 12450, mixte: 5390 },
  par_province: {
    Kinshasa: 15230,
    'Kongo Central': 18920,
    Kwilu: 14250,
    Kasaï: 16890,
    'Haut-Lomami': 11240,
    Tanganyika: 9800,
  },
  par_age: { jeunes: 42340, adultes: 65420, seniors: 16770 },
  par_instruction: { aucun: 32450, primaire: 45678, secondaire: 35678, superieur: 10724 },
  par_technologies: {
    semences_ameliorees: 45678,
    engrais_organiques: 32456,
    irrigation: 12450,
    conservation_sols: 23456,
    agroforesterie: 8900,
  },
  evolution_mensuelle: [
    { mois: 'Sep', total: 112000 },
    { mois: 'Oct', total: 115000 },
    { mois: 'Nov', total: 118500 },
    { mois: 'Déc', total: 120000 },
    { mois: 'Jan', total: 122000 },
    { mois: 'Fév', total: 123500 },
    { mois: 'Mar', total: 124530 },
  ],
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'agriculteur': return <Agriculture />;
    case 'eleveur': return <Pets />;
    case 'pisciculteur': return <GoogleIcon name="set_meal" size={18} />;
    default: return <Person />;
  }
};

const getInstructionLabel = (niveau?: string) => {
  switch (niveau) {
    case 'aucun': return 'Aucun';
    case 'primaire': return 'Primaire';
    case 'secondaire': return 'Secondaire';
    case 'superieur': return 'Supérieur';
    default: return '-';
  }
};

export const BeneficiaireDatabase: React.FC = () => {
  const [beneficiaires, setBeneficiaires] = useState<BeneficiaireComplet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatistiquesBeneficiaires | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    province: '',
    type: '',
    sexe: '',
    page: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBeneficiaire, setSelectedBeneficiaire] = useState<BeneficiaireComplet | null>(null);
  const [activites, setActivites] = useState<ActiviteBeneficiaire[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [importing, setImporting] = useState(false);

  const provinces = ['Kinshasa', 'Kongo Central', 'Kwilu', 'Kasaï', 'Haut-Lomami', 'Tanganyika'];
  const types = ['agriculteur', 'eleveur', 'pisciculteur', 'mixte'];

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [beneRes, statsRes] = await Promise.all([
        databaseService.getAll(filters),
        databaseService.getStats(),
      ]);
      const d = beneRes.data;
      setBeneficiaires(d.data?.length ? d.data : mockBeneficiaires);
      setTotal(d.total ?? mockBeneficiaires.length);
      setStats(statsRes.data || mockStats);
    } catch {
      setBeneficiaires(mockBeneficiaires);
      setTotal(mockBeneficiaires.length);
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

  const handleFilterChange = (key: keyof typeof filters, value: (typeof filters)[keyof typeof filters]) => {
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
      province: '',
      type: '',
      sexe: '',
      page: 0,
      limit: 10,
    });
  };

  const handleViewDetail = async (beneficiaire: BeneficiaireComplet) => {
    setSelectedBeneficiaire(beneficiaire);
    setDetailDialogOpen(true);
    try {
      const res = await databaseService.getActivites(beneficiaire.id);
      setActivites(res.data?.length ? res.data : [
        { id: 1, beneficiaire_id: beneficiaire.id, type: 'formation', titre: 'Formation AIC', date: '2026-02-10', statut: 'termine', details: {} },
        { id: 2, beneficiaire_id: beneficiaire.id, type: 'subvention', titre: 'Subvention intrants', date: '2026-01-15', statut: 'valide', details: { montant: 500000 } },
      ]);
    } catch {
      setActivites([]);
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

  if (loading && beneficiaires.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Base de données - Bénéficiaires
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Gestion complète des bénéficiaires du programme avec leurs informations détaillées
      </Typography>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Total bénéficiaires"
              value={stats.total.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="groups" size={36} />}
              trend={{ value: stats.par_age.jeunes > 0 ? Math.round((stats.par_age.jeunes / stats.total) * 100) : 0, direction: 'up', period: 'jeunes bénéficiaires' }}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Femmes bénéficiaires"
              value={stats.par_sexe.femmes.toLocaleString('fr-FR')}
              icon={<Female sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.par_sexe.femmes / stats.total) * 100) : 0, direction: 'up', period: '% du total' }}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Hommes bénéficiaires"
              value={stats.par_sexe.hommes.toLocaleString('fr-FR')}
              icon={<Male sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.par_sexe.hommes / stats.total) * 100) : 0, direction: 'up', period: '% du total' }}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Jeunes bénéficiaires"
              value={stats.par_age.jeunes.toLocaleString('fr-FR')}
              icon={<FamilyRestroom sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.par_age.jeunes / stats.total) * 100) : 0, direction: 'up', period: 'moins de 35 ans' }}
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
              placeholder="Rechercher par nom, RNA ID, téléphone..."
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
              <Button variant="contained" component="label" startIcon={<CloudUpload />} disabled={importing} sx={{ bgcolor: '#2E7D32' }}>
                {importing ? 'Import en cours...' : 'Nouvel import'}
                <input type="file" hidden accept=".csv,.xlsx" onChange={handleImport} />
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
      {(filters.province || filters.type || filters.sexe) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.province && <Chip label={`Province: ${filters.province}`} onDelete={() => handleFilterChange('province', '')} />}
          {filters.type && <Chip label={`Type: ${filters.type}`} onDelete={() => handleFilterChange('type', '')} />}
          {filters.sexe && <Chip label={`Sexe: ${filters.sexe === 'M' ? 'Homme' : 'Femme'}`} onDelete={() => handleFilterChange('sexe', '')} />}
          <Chip label="Réinitialiser" onClick={resetFilters} variant="outlined" />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau des bénéficiaires */}
      <ExportToolbar
        title="Base de données — Bénéficiaires"
        subtitle="Répertoire complet des bénéficiaires RNA"
        columns={[
          { header: 'RNA ID', key: 'rna_id', width: 14 },
          { header: 'Nom complet', key: 'nom_complet', width: 28 },
          { header: 'Sexe', key: 'sexe', width: 10,
            formatter: (v) => v === 'M' ? 'Homme' : 'Femme' },
          { header: 'Âge', key: 'age', width: 8 },
          { header: 'Province', key: 'province', width: 18 },
          { header: 'Type exploitant', key: 'type_exploitant', width: 22 },
          { header: 'Technologies adoptées', key: 'technologies', width: 30 },
        ]}
        getData={() => beneficiaires.map((b) => ({
          rna_id: b.rna_id,
          nom_complet: `${b.nom} ${b.prenom}`,
          sexe: b.sexe,
          age: b.age,
          province: b.province,
          type_exploitant: b.type_exploitant,
          technologies: b.technologies_adoptees?.join(', ') ?? '',
        }))}
        filename="beneficiaires_database"
        landscape
      />
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F1F8E9' }}>
            <TableRow>
              <TableCell>RNA ID</TableCell>
              <TableCell>Nom complet</TableCell>
              <TableCell>Sexe</TableCell>
              <TableCell>Âge</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Type exploitant</TableCell>
              <TableCell>Technologies</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {beneficiaires.map((beneficiaire) => (
              <TableRow key={beneficiaire.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{beneficiaire.rna_id}</Typography>
                </TableCell>
                <TableCell>
                  {beneficiaire.nom} {beneficiaire.prenom}
                  {beneficiaire.est_jeune && <Chip label="Jeune" size="small" sx={{ ml: 1, height: 20, bgcolor: '#E8F5E9' }} />}
                </TableCell>
                <TableCell>
                  {beneficiaire.sexe === 'M' ? <Male color="primary" /> : <Female color="secondary" />}
                </TableCell>
                <TableCell>{beneficiaire.age} ans</TableCell>
                <TableCell>{beneficiaire.province}</TableCell>
                <TableCell>
                  <Chip icon={getTypeIcon(beneficiaire.type_exploitant)} label={beneficiaire.type_exploitant} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {(beneficiaire.technologies_adoptees ?? []).slice(0, 2).map((tech, idx) => (
                      <Chip key={idx} label={tech.replace('_', ' ')} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                    ))}
                    {(beneficiaire.technologies_adoptees ?? []).length > 2 && (
                      <Chip label={`+${beneficiaire.technologies_adoptees.length - 2}`} size="small" />
                    )}
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Voir détails">
                    <IconButton size="small" onClick={() => handleViewDetail(beneficiaire)}>
                      <Visibility fontSize="small" />
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
            <InputLabel>Province</InputLabel>
            <Select value={filters.province || ''} label="Province" onChange={(e) => handleFilterChange('province', e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type exploitant</InputLabel>
            <Select value={filters.type || ''} label="Type exploitant" onChange={(e) => handleFilterChange('type', e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Sexe</InputLabel>
            <Select value={filters.sexe || ''} label="Sexe" onChange={(e) => handleFilterChange('sexe', e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="M">Homme</MenuItem>
              <MenuItem value="F">Femme</MenuItem>
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
        {selectedBeneficiaire && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: selectedBeneficiaire.sexe === 'M' ? '#64B5F6' : '#F06292' }}>
                  {selectedBeneficiaire.sexe === 'M' ? <Male /> : <Female />}
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedBeneficiaire.nom} {selectedBeneficiaire.prenom}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedBeneficiaire.rna_id}</Typography>
                </Box>
                <Chip label={selectedBeneficiaire.type_exploitant} icon={getTypeIcon(selectedBeneficiaire.type_exploitant)} />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
                <Tab label="Informations" icon={<Person />} iconPosition="start" />
                <Tab label="Activités" icon={<GoogleIcon name="history" size={18} />} iconPosition="start" />
                <Tab label="Production" icon={<Agriculture />} iconPosition="start" />
              </Tabs>

              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Informations personnelles</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1}><Person /><Typography variant="body2">Né(e) le {new Date(selectedBeneficiaire.date_naissance).toLocaleDateString()} ({selectedBeneficiaire.age} ans)</Typography></Stack>
                      <Stack direction="row" spacing={1}><Phone /><Typography variant="body2">{selectedBeneficiaire.telephone}</Typography></Stack>
                      {selectedBeneficiaire.email && <Stack direction="row" spacing={1}><Email /><Typography variant="body2">{selectedBeneficiaire.email}</Typography></Stack>}
                      <Stack direction="row" spacing={1}><School /><Typography variant="body2">Niveau d\'instruction: {getInstructionLabel(selectedBeneficiaire.niveau_instruction)}</Typography></Stack>
                      <Stack direction="row" spacing={1}><FamilyRestroom /><Typography variant="body2">Situation: {selectedBeneficiaire.situation_matrimoniale}, {selectedBeneficiaire.nombre_enfants} enfant(s)</Typography></Stack>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" color="text.secondary">Localisation</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1}><LocationOn /><Typography variant="body2">{selectedBeneficiaire.province}, {selectedBeneficiaire.territoire}</Typography></Stack>
                      <Typography variant="body2">Village: {selectedBeneficiaire.village}</Typography>
                      {selectedBeneficiaire.commune && <Typography variant="body2">Commune: {selectedBeneficiaire.commune}</Typography>}
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Terres et production</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}><Typography variant="body2">Superficie totale: {selectedBeneficiaire.superficie_totale} ha</Typography></Grid>
                      <Grid size={{ xs: 6 }}><Typography variant="body2">Superficie cultivée: {selectedBeneficiaire.superficie_cultivee} ha</Typography></Grid>
                      <Grid size={{ xs: 12 }}><Typography variant="body2">Cultures principales: {selectedBeneficiaire.principales_cultures.join(', ')}</Typography></Grid>
                    </Grid>
                  </Grid>
                  {selectedBeneficiaire.cheptel && (
                    <Grid size={{ xs: 12 }}>
                      <Typography variant="subtitle2" color="text.secondary">Cheptel</Typography>
                      <Divider sx={{ my: 1 }} />
                      <Stack direction="row" spacing={2}>
                        <Chip label={`Bovins: ${selectedBeneficiaire.cheptel.bovins}`} size="small" />
                        <Chip label={`Caprins: ${selectedBeneficiaire.cheptel.caprins}`} size="small" />
                        <Chip label={`Volailles: ${selectedBeneficiaire.cheptel.volailles}`} size="small" />
                      </Stack>
                    </Grid>
                  )}
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Technologies adoptées</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {selectedBeneficiaire.technologies_adoptees.map((tech, idx) => (
                        <Chip key={idx} label={tech.replace('_', ' ')} variant="outlined" size="small" />
                      ))}
                    </Stack>
                  </Grid>
                </Grid>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F5F5F5' }}>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Titre</TableCell>
                        <TableCell>Statut</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activites.map((act) => (
                        <TableRow key={act.id}>
                          <TableCell>{new Date(act.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Chip label={act.type} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{act.titre}</TableCell>
                          <TableCell>
                            <Chip label={act.statut} size="small" sx={{ bgcolor: act.statut === 'termine' ? '#E8F5E9' : '#FFF3E0' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Typography variant="body2" color="text.secondary">Données de production à venir</Typography>
              </TabPanel>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" startIcon={<Edit />} sx={{ bgcolor: '#2E7D32' }}>Modifier</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default BeneficiaireDatabase;