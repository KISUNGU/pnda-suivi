// frontend/src/pages/AgentCollecteur/DashboardAC.tsx
import React, { useState, useEffect } from 'react';
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
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Avatar,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  AppBar,
  Toolbar,
  BottomNavigation,
  BottomNavigationAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  Fab,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
  LinearProgress,
} from '@mui/material';
import {
  Search,
  CloudUpload,
  Person,
  LocationOn,
  Phone,
  Email,
  Assignment,
  CheckCircle,
  Pending,
  Add,
  Visibility,
  Dashboard,
  ListAlt,
  People,
  Settings,
  Menu as MenuIcon,
  Close as CloseIcon,
} from '../../components/common/PageIcons';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import agentCollecteurService, { type AgentCollecteur, type CollecteData, type StatistiquesAC } from '../../services/agentCollecteur.service';

interface BeneficiaireAC {
  id: number;
  nom: string;
  prenom: string;
  rna_id: string;
  sexe: string;
  village: string;
  telephone: string;
}

interface FormulaireAC {
  id: string;
  nom: string;
  version: string;
}

export const DashboardAC: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [agent, setAgent] = useState<AgentCollecteur | null>(null);
  const [stats, setStats] = useState<StatistiquesAC | null>(null);
  const [collectes, setCollectes] = useState<CollecteData[]>([]);
  const [beneficiaires, setBeneficiaires] = useState<BeneficiaireAC[]>([]);
  const [formulaires, setFormulaires] = useState<FormulaireAC[]>([]);
  const [loading, setLoading] = useState(true);
  const [bottomNavValue, setBottomNavValue] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [collecteDialogOpen, setCollecteDialogOpen] = useState(false);
  const [selectedFormulaire, setSelectedFormulaire] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCollecte, setSelectedCollecte] = useState<CollecteData | null>(null);

  useEffect(() => {
    loadData();
    getCurrentLocation();
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.warn('Geolocation error:', error)
      );
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profilRes, statsRes, collectesRes, beneficiairesRes, formulairesRes] = await Promise.all([
        agentCollecteurService.getProfil(),
        agentCollecteurService.getStats(),
        agentCollecteurService.getCollectes(),
        agentCollecteurService.getBeneficiaires(),
        agentCollecteurService.getFormulaires(),
      ]);
      setAgent(profilRes.data);
      setStats(statsRes.data);
      setCollectes(collectesRes.data.data);
      setBeneficiaires(beneficiairesRes.data.data);
      setFormulaires(formulairesRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await agentCollecteurService.synchroniser();
      setSyncDialogOpen(false);
      loadData();
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmitCollecte = async () => {
    try {
      await agentCollecteurService.sauvegarderCollecte({
        formulaire_id: selectedFormulaire,
        donnees: {},
        latitude: location?.lat,
        longitude: location?.lng,
      });
      setCollecteDialogOpen(false);
      setSelectedFormulaire('');
      loadData();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredBeneficiaires = beneficiaires.filter(b =>
    b.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.rna_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCollectes = collectes.filter(c => !c.synced).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  // Version Mobile
  if (isMobile) {
    return (
      <Box sx={{ pb: 7, height: '100vh', overflow: 'auto' }}>
        {/* Header Mobile */}
        <AppBar position="sticky" sx={{ bgcolor: '#2E7D32' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setMobileMenuOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flex: 1, textAlign: 'center' }}>
              Agent Collecteur
            </Typography>
            <Badge badgeContent={pendingCollectes} color="error">
              <IconButton color="inherit" onClick={() => setSyncDialogOpen(true)}>
                <CloudUpload />
              </IconButton>
            </Badge>
          </Toolbar>
        </AppBar>

        {/* Profil Agent */}
        <Paper sx={{ m: 2, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: '#2E7D32', width: 56, height: 56 }}>
              <Person />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={600}>
                {agent?.prenom} {agent?.nom}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {agent?.matricule}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip icon={<LocationOn />} label={agent?.province} size="small" />
                <Chip label={agent?.territoire} size="small" variant="outlined" />
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* Cartes stats */}
        <Grid container spacing={1.5} sx={{ px: 2 }}>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                <GoogleIcon name="assignment" size={24} sx={{ color: '#2E7D32' }} />
                <Typography variant="h5" fontWeight={700}>{stats?.total_collectes}</Typography>
                <Typography variant="caption">Collectes</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                <GoogleIcon name="people" size={24} sx={{ color: '#1976D2' }} />
                <Typography variant="h5" fontWeight={700}>{stats?.beneficiaires_couverts}</Typography>
                <Typography variant="caption">Bénéficiaires</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                <GoogleIcon name="sync" size={24} sx={{ color: '#FF8F00' }} />
                <Typography variant="h5" fontWeight={700}>{stats?.taux_synchronisation}%</Typography>
                <Typography variant="caption">Synchro</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                <GoogleIcon name="pending" size={24} sx={{ color: pendingCollectes > 0 ? '#F44336' : '#4CAF50' }} />
                <Typography variant="h5" fontWeight={700} color={pendingCollectes > 0 ? 'error.main' : 'success.main'}>
                  {pendingCollectes}
                </Typography>
                <Typography variant="caption">En attente</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Bottom Navigation */}
        <BottomNavigation
          value={bottomNavValue}
          onChange={(_, v) => setBottomNavValue(v)}
          sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}
        >
          <BottomNavigationAction label="Collectes" icon={<ListAlt />} />
          <BottomNavigationAction label="Bénéficiaires" icon={<People />} />
          <BottomNavigationAction label="Formulaires" icon={<Assignment />} />
          <BottomNavigationAction label="Profil" icon={<Person />} />
        </BottomNavigation>

        {/* Contenu selon l'onglet */}
        <Box sx={{ p: 2, mb: 7 }}>
          {bottomNavValue === 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Dernières collectes</Typography>
              {collectes.map((collecte) => (
                <Card key={collecte.id} sx={{ mb: 1, borderRadius: 2 }} onClick={() => { setSelectedCollecte(collecte); setDetailDialogOpen(true); }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{collecte.formulaire_nom}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(collecte.date_collecte).toLocaleDateString()}
                        </Typography>
                        {collecte.beneficiaire && (
                          <Typography variant="caption" display="block">{collecte.beneficiaire.nom} {collecte.beneficiaire.prenom}</Typography>
                        )}
                      </Box>
                      {collecte.synced ? (
                        <CheckCircle sx={{ color: '#4CAF50' }} fontSize="small" />
                      ) : (
                        <Pending sx={{ color: '#FFC107' }} fontSize="small" />
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {bottomNavValue === 1 && (
            <Box>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher un bénéficiaire..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                }}
              />
              {filteredBeneficiaires.map((b) => (
                <Card key={b.id} sx={{ mb: 1, borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{b.nom} {b.prenom}</Typography>
                        <Typography variant="caption" color="text.secondary">{b.rna_id}</Typography>
                        <Typography variant="caption" display="block">{b.village}</Typography>
                      </Box>
                      <IconButton size="small" sx={{ bgcolor: 'action.hover' }}>
                        <Add fontSize="small" />
                      </IconButton>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {bottomNavValue === 2 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>Formulaires disponibles</Typography>
              {formulaires.map((f) => (
                <Card key={f.id} sx={{ mb: 1, borderRadius: 2, cursor: 'pointer' }} onClick={() => { setSelectedFormulaire(f.id); setCollecteDialogOpen(true); }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Assignment sx={{ color: '#2E7D32' }} />
                      <Box>
                        <Typography variant="body2" fontWeight={500}>{f.nom}</Typography>
                        <Typography variant="caption" color="text.secondary">Version {f.version}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}

          {bottomNavValue === 3 && (
            <Box>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#2E7D32', width: 64, height: 64 }}>
                      <Person sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{agent?.prenom} {agent?.nom}</Typography>
                      <Typography variant="caption" color="text.secondary">{agent?.matricule}</Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Phone fontSize="small" color="action" />
                      <Typography variant="body2">{agent?.telephone}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2">{agent?.email}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{agent?.province} - {agent?.territoire}</Typography>
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2">Zones d'intervention</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                    {agent?.zones.map((zone, idx) => (
                      <Chip key={idx} label={zone} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Box>
          )}
        </Box>

        {/* Fab pour nouvelle collecte */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 70, right: 16, bgcolor: '#2E7D32' }}
          onClick={() => setCollecteDialogOpen(true)}
        >
          <Add />
        </Fab>

        {/* Drawer menu mobile */}
        <SwipeableDrawer anchor="left" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} onOpen={() => setMobileMenuOpen(true)}>
          <Box sx={{ width: 280, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" fontWeight={600}>Menu</Typography>
              <IconButton onClick={() => setMobileMenuOpen(false)}><CloseIcon /></IconButton>
            </Stack>
            <Divider sx={{ my: 2 }} />
            <List>
              <ListItem disablePadding>
                <ListItemButton>
                <ListItemIcon><Dashboard /></ListItemIcon>
                <ListItemText primary="Tableau de bord" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                <ListItemIcon><ListAlt /></ListItemIcon>
                <ListItemText primary="Mes collectes" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                <ListItemIcon><People /></ListItemIcon>
                <ListItemText primary="Bénéficiaires" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                <ListItemIcon><Assignment /></ListItemIcon>
                <ListItemText primary="Formulaires" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton>
                <ListItemIcon><Settings /></ListItemIcon>
                <ListItemText primary="Paramètres" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </SwipeableDrawer>
      </Box>
    );
  }

  // Version Desktop/Tablette
  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Agent Collecteur
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestion des collectes et suivi des bénéficiaires
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<CloudUpload />}
            onClick={() => setSyncDialogOpen(true)}
          >
            Synchroniser ({pendingCollectes})
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCollecteDialogOpen(true)}
            sx={{ bgcolor: '#2E7D32' }}
          >
            Nouvelle collecte
          </Button>
        </Stack>
      </Box>

      {/* Profil Agent */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Avatar sx={{ bgcolor: '#2E7D32', width: 100, height: 100 }}>
              <Person sx={{ fontSize: 60 }} />
            </Avatar>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h5" fontWeight={600}>{agent?.prenom} {agent?.nom}</Typography>
            <Typography variant="body2" color="text.secondary">{agent?.matricule}</Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              <Chip icon={<Phone />} label={agent?.telephone} size="small" />
              <Chip icon={<Email />} label={agent?.email} size="small" />
              <Chip icon={<LocationOn />} label={`${agent?.province} - ${agent?.territoire}`} size="small" />
            </Stack>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>Superviseur:</strong> {agent?.superviseur}
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">Zones d'intervention</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                {agent?.zones.map((zone, idx) => (
                  <Chip key={idx} label={zone} size="small" variant="outlined" />
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Total collectes"
            value={(stats?.total_collectes ?? 0).toLocaleString('fr-FR')}
            icon={<GoogleIcon name="assignment" size={36} />}
            trend={{ value: stats?.collectes_mois ?? 0, direction: 'up', period: 'ce mois' }}
            color="primary"
            onClick={() => setCollecteDialogOpen(true)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Bénéficiaires couverts"
            value={(stats?.beneficiaires_couverts ?? 0).toLocaleString('fr-FR')}
            icon={<GoogleIcon name="groups" size={36} />}
            trend={{ value: stats?.collectes_semaine ?? 0, direction: 'up', period: 'collectes cette semaine' }}
            color="info"
            onClick={() => setCollecteDialogOpen(true)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Taux synchronisation"
            value={`${stats?.taux_synchronisation ?? 0}%`}
            icon={<GoogleIcon name="sync" size={36} />}
            trend={{ value: stats?.taux_synchronisation ?? 0, direction: 'up', period: 'des collectes' }}
            color="warning"
            onClick={() => setSyncDialogOpen(true)}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="En attente de synchro"
            value={pendingCollectes.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="cloud_off" size={36} />}
            trend={{ value: pendingCollectes, direction: pendingCollectes > 0 ? 'down' : 'up', period: pendingCollectes > 0 ? 'à synchroniser' : 'tout est synchronisé' }}
            color={pendingCollectes > 0 ? 'danger' : 'success'}
            onClick={() => setSyncDialogOpen(true)}
          />
        </Grid>
      </Grid>

      {/* Formulaires disponibles */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Formulaires disponibles
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {formulaires.map((form) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={form.id}>
            <Card sx={{ ...moduleGridStyles.statCard, cursor: 'pointer' }} onClick={() => { setSelectedFormulaire(form.id); setCollecteDialogOpen(true); }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'action.hover' }}>
                    <Assignment sx={{ color: '#2E7D32' }} />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={600}>{form.nom}</Typography>
                    <Typography variant="caption" color="text.secondary">Version {form.version}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Bénéficiaires */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Bénéficiaires dans ma circonscription
      </Typography>
      <Paper sx={moduleGridStyles.filterPanel}>
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher un bénéficiaire..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
          }}
        />
        <Grid container spacing={2}>
          {filteredBeneficiaires.map((b) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={b.id}>
              <Card variant="outlined" sx={moduleGridStyles.statCard}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>{b.nom} {b.prenom}</Typography>
                      <Typography variant="caption" color="text.secondary">{b.rna_id}</Typography>
                      <Typography variant="caption" display="block">{b.village}</Typography>
                    </Box>
                    <IconButton size="small" sx={{ bgcolor: 'action.hover' }}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Dernières collectes */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Dernières collectes
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Formulaire</TableCell>
              <TableCell>Bénéficiaire</TableCell>
              <TableCell>Localisation</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {collectes.map((collecte) => (
              <TableRow key={collecte.id} hover>
                <TableCell>{new Date(collecte.date_collecte).toLocaleString()}</TableCell>
                <TableCell>{collecte.formulaire_nom}</TableCell>
                <TableCell>
                  {collecte.beneficiaire ? `${collecte.beneficiaire.nom} ${collecte.beneficiaire.prenom}` : '-'}
                </TableCell>
                <TableCell>
                  {collecte.latitude.toFixed(4)}, {collecte.longitude.toFixed(4)}
                </TableCell>
                <TableCell>
                  {collecte.synced ? (
                    <Chip label="Synchronisé" size="small" sx={{ bgcolor: 'action.hover', color: '#2E7D32' }} />
                  ) : (
                    <Chip label="En attente" size="small" sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)', color: '#FF8F00' }} />
                  )}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => { setSelectedCollecte(collecte); setDetailDialogOpen(true); }}>
                    <Visibility fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog synchronisation */}
      <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Synchronisation</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Vous avez {pendingCollectes} collecte(s) en attente de synchronisation.
          </Alert>
          {syncing && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSyncDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSync} disabled={syncing} sx={{ bgcolor: '#2E7D32' }}>
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog nouvelle collecte */}
      <Dialog open={collecteDialogOpen} onClose={() => setCollecteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouvelle collecte</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Formulaire</InputLabel>
            <Select
              value={selectedFormulaire}
              label="Formulaire"
              onChange={(e) => setSelectedFormulaire(e.target.value)}
            >
              {formulaires.map((f) => (
                <MenuItem key={f.id} value={f.id}>{f.nom}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedFormulaire === 'enquete_production' && (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="ID RNA" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Nom" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth label="Prénom" />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Culture</InputLabel>
                  <Select label="Culture">
                    <MenuItem value="mais">Maïs</MenuItem>
                    <MenuItem value="manioc">Manioc</MenuItem>
                    <MenuItem value="arachide">Arachide</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField fullWidth type="number" label="Superficie (ha)" />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth type="number" label="Production (kg)" />
              </Grid>
            </Grid>
          )}

          {location && (
            <Alert severity="info" sx={{ mt: 2 }}>
              📍 Position GPS: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCollecteDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmitCollecte} sx={{ bgcolor: '#2E7D32' }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog détail collecte */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedCollecte && (
          <>
            <DialogTitle>Détail de la collecte</DialogTitle>
            <DialogContent>
              <Typography variant="subtitle2" color="text.secondary">Formulaire</Typography>
              <Typography variant="body2" gutterBottom>{selectedCollecte.formulaire_nom}</Typography>
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Données</Typography>
              <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                {Object.entries(selectedCollecte.donnees).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption">{key}</Typography>
                    <Typography variant="caption" fontWeight={500}>{String(value)}</Typography>
                  </Box>
                ))}
              </Paper>
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Localisation</Typography>
              <Typography variant="body2">{selectedCollecte.latitude}, {selectedCollecte.longitude}</Typography>
              
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Date</Typography>
              <Typography variant="body2">{new Date(selectedCollecte.date_collecte).toLocaleString()}</Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default DashboardAC;