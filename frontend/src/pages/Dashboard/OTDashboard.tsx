// frontend/src/pages/Dashboard/OTDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Button,
  Avatar,
  Stack,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CheckCircle,
  Pending,
  Warning,
  CloudUpload,
  Assignment,
  ReportProblem,
  VerifiedUser,
  Sync,
  Refresh,
  Visibility,
} from '../../components/common/PageIcons';
import GoogleIcon from '../../components/common/GoogleIcon';
import otService, { type OTData, type ActiviteTerrain } from '../../services/ot.service';

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

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'enquete': return 'Enquête';
    case 'formation': return 'Formation';
    case 'suivi': return 'Suivi';
    case 'plainte': return 'Plainte';
    default: return type;
  }
};

export const OTDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otData, setOtData] = useState<OTData | null>(null);
  const [activites, setActivites] = useState<ActiviteTerrain[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [otRes, activitesRes] = await Promise.all([
        otService.getOTData(),
        otService.getActivites(),
      ]);
      setOtData(otRes.data);
      setActivites(activitesRes.data);
    } catch (err) {
      console.error('Erreur chargement tableau de bord OT:', err);
      setError('Impossible de charger les données du tableau de bord OT');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const collectesAttente = activites.filter((a) => a.statut === 'planifiee' || a.statut === 'en_cours');
  const collectesValidees = activites.filter((a) => a.statut === 'terminee');
  const activitesEnRetard = activites.filter(
    (a) => a.statut !== 'terminee' && a.statut !== 'annulee' && new Date(a.date) < new Date()
  );

  const handleValidate = async (id: number) => {
    try {
      await otService.updateActivite(id, { statut: 'terminee' });
      loadData();
    } catch (err) {
      console.error('Erreur validation activité:', err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await otService.updateActivite(id, { statut: 'annulee' });
      loadData();
    } catch (err) {
      console.error('Erreur rejet activité:', err);
    }
  };

  const handleSync = () => {
    console.log('Synchronisation des données');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <LinearProgress sx={{ width: '50%', borderRadius: 2 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Tableau de bord - Opérateur Technique (OT)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Validation des données terrain, suivi des collectes et supervision des enquêteurs
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

      {/* Alertes retard */}
      {activitesEnRetard.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Stack direction="row" spacing={1} alignItems="center">
              <Warning />
              <Typography variant="body2">
                <strong>{activitesEnRetard.length} activité(s) en retard</strong> nécessitent votre attention
              </Typography>
            </Stack>
            <Button size="small" variant="outlined" sx={{ borderRadius: 2 }} onClick={() => setTabValue(2)}>
              Voir les alertes
            </Button>
          </Stack>
        </Alert>
      )}

      {/* Cartes KPI */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #2E7D32' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Activités en attente</Typography>
                  <Typography variant="h3" fontWeight={700} color="warning.main">{collectesAttente.length}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)' }}><Pending sx={{ color: '#FF8F00' }} /></Avatar>
              </Stack>
              <LinearProgress variant="determinate" value={otData?.performances.taux_realisation ?? 0} sx={{ mt: 2, height: 6, borderRadius: 2 }} />
              <Typography variant="caption" color="text.secondary">Taux de réalisation: {otData?.performances.taux_realisation ?? 0}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #1976D2' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Total activités</Typography>
                  <Typography variant="h3" fontWeight={700}>{activites.length}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(57, 135, 229, 0.14)' }}><Assignment sx={{ color: '#1976D2' }} /></Avatar>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {collectesValidees.length} terminées • {collectesAttente.length} en attente
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #FF8F00' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Plaintes traitées</Typography>
                  <Typography variant="h3" fontWeight={700}>{otData?.activites.plaintes_traitees ?? 0}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)' }}><ReportProblem sx={{ color: '#FF8F00' }} /></Avatar>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {otData?.activites.enquetes_realisees ?? 0} enquêtes réalisées
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #9C27B0' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Qualité des données</Typography>
                  <Typography variant="h3" fontWeight={700}>{otData?.performances.qualite_donnees ?? 0}%</Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(146, 39, 143, 0.16)' }}><VerifiedUser sx={{ color: '#9C27B0' }} /></Avatar>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {otData?.equipes.enqueteurs ?? 0} enquêteurs actifs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Onglets */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="À valider" icon={<Pending />} iconPosition="start" />
          <Tab label="Validées récemment" icon={<CheckCircle />} iconPosition="start" />
          <Tab label="Alertes" icon={<Warning />} iconPosition="start" />
        </Tabs>

        {/* Onglet À valider */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell>Province</TableCell>
                  <TableCell>Statut</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {collectesAttente.map((activite) => (
                  <TableRow key={activite.id} hover>
                    <TableCell>{new Date(activite.date).toLocaleDateString()}</TableCell>
                    <TableCell>{getTypeLabel(activite.type)} - {activite.titre}</TableCell>
                    <TableCell>{activite.responsable}</TableCell>
                    <TableCell>{activite.province}</TableCell>
                    <TableCell>
                      <Chip
                        label={activite.statut === 'en_cours' ? 'En cours' : 'Planifiée'}
                        size="small"
                        sx={{ bgcolor: activite.statut === 'en_cours' ? '#FFF8E1' : '#E3F2FD', color: activite.statut === 'en_cours' ? '#FF8F00' : '#1976D2' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Valider">
                        <IconButton size="small" onClick={() => handleValidate(activite.id)} sx={{ color: '#4CAF50' }}>
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rejeter">
                        <IconButton size="small" onClick={() => handleReject(activite.id)} sx={{ color: '#F44336' }}>
                          <Warning />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Voir détails">
                        <IconButton size="small">
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Onglet Validées récemment */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell>Province</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {collectesValidees.map((activite) => (
                  <TableRow key={activite.id} hover>
                    <TableCell>{new Date(activite.date).toLocaleDateString()}</TableCell>
                    <TableCell>{getTypeLabel(activite.type)} - {activite.titre}</TableCell>
                    <TableCell>{activite.responsable}</TableCell>
                    <TableCell>{activite.province}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Onglet Alertes */}
        <TabPanel value={tabValue} index={2}>
          <List>
            {activitesEnRetard.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Aucune activité en retard.</Typography>
            )}
            {activitesEnRetard.map((activite) => (
              <ListItem key={activite.id} sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)', borderRadius: 2, mb: 1 }}>
                <ListItemIcon>
                  <Warning sx={{ color: '#FF8F00' }} />
                </ListItemIcon>
                <ListItemText
                  primary={`${getTypeLabel(activite.type)} - ${activite.titre}`}
                  secondary={`En retard depuis le ${new Date(activite.date).toLocaleDateString()} • ${activite.responsable}`}
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>
      </Paper>

      {/* Section rapide - Raccourcis OT */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Accès rapide - Opérations OT
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#2E7D32', bgcolor: 'action.hover' },
                    }}
                    onClick={() => window.location.href = '/suivi/activites'}
                  >
                    <GoogleIcon name="assignment" size={24} sx={{ color: '#2E7D32' }} />
                    <Typography variant="body2" fontWeight={500}>Activités terrain</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#2E7D32', bgcolor: 'action.hover' },
                    }}
                    onClick={() => window.location.href = '/database/plaintes'}
                  >
                    <GoogleIcon name="chat" size={24} sx={{ color: '#D32F2F' }} />
                    <Typography variant="body2" fontWeight={500}>Gestion des plaintes</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#2E7D32', bgcolor: 'action.hover' },
                    }}
                    onClick={() => window.location.href = '/beneficiaires/rna'}
                  >
                    <GoogleIcon name="people" size={24} sx={{ color: '#1976D2' }} />
                    <Typography variant="body2" fontWeight={500}>Bénéficiaires RNA</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#2E7D32', bgcolor: 'action.hover' },
                    }}
                    onClick={() => window.location.href = '/outils/collecte'}
                  >
                    <GoogleIcon name="phone_android" size={24} sx={{ color: '#FF8F00' }} />
                    <Typography variant="body2" fontWeight={500}>Collecte mobile</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#2E7D32', bgcolor: 'action.hover' },
                    }}
                    onClick={() => window.location.href = '/indicateurs/iodp'}
                  >
                    <GoogleIcon name="bar_chart" size={24} sx={{ color: '#00695C' }} />
                    <Typography variant="body2" fontWeight={500}>Indicateurs IODP</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      cursor: 'pointer',
                      '&:hover': { borderColor: '#2E7D32', bgcolor: 'action.hover' },
                    }}
                    onClick={() => window.location.href = '/suivi/missions'}
                  >
                    <GoogleIcon name="map" size={24} sx={{ color: '#37474F' }} />
                    <Typography variant="body2" fontWeight={500}>Suivi des missions</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Section - Actions rapides */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Actions rapides
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Button
                  variant="outlined"
                  startIcon={<Sync />}
                  fullWidth
                  onClick={handleSync}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Synchroniser les données terrain
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  fullWidth
                  onClick={() => window.location.reload()}
                  sx={{ borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Rafraîchir le tableau de bord
                </Button>
                <Button
                  variant="contained"
                  startIcon={<CloudUpload />}
                  fullWidth
                  sx={{ bgcolor: '#2E7D32', borderRadius: 2, justifyContent: 'flex-start' }}
                >
                  Soumettre rapport mensuel
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Responsabilités OT */}
          <Paper sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <GoogleIcon name="info" size={20} sx={{ color: '#2E7D32' }} />
              <Typography variant="subtitle2" fontWeight={600}>Vos responsabilités (OT)</Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block">
              • Collecte et validation des données terrain (Tableau 4)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • Enregistrement des bénéficiaires dans le RNA (IR1.1.4, IR1.1.5)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • Suivi des subventions et services financiers (IR2.2.1 à IR2.2.3)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • Gestion des plaintes GRM (IR3.1.4, IR3.1.5)
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              • Supervision des enquêteurs terrain
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OTDashboard;