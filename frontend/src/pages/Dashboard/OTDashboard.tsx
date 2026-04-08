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
} from '@mui/icons-material';
import GoogleIcon from '../../components/common/GoogleIcon';

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

// Données mockées - Collectes en attente de validation
const mockCollectesAttente = [
  { id: 1, type: 'Enquête production', date: '2026-04-01', enqueteur: 'Joseph MUKENDI', village: 'Masi-Manimba', statut: 'en_attente', qualite: 85 },
  { id: 2, type: 'Adoption technologie', date: '2026-04-01', enqueteur: 'Marie KABEYA', village: 'Kikwit', statut: 'en_attente', qualite: 72 },
  { id: 3, type: 'Plainte GRM', date: '2026-03-31', enqueteur: 'Albert TSHIBOLA', village: 'Kananga', statut: 'en_attente', qualite: 90 },
  { id: 4, type: 'Suivi subvention', date: '2026-03-30', enqueteur: 'Pauline LUBALA', village: 'Boma', statut: 'en_attente', qualite: 68 },
];

// Données mockées - Collectes validées récemment
const mockCollectesValidees = [
  { id: 5, type: 'Enquête production', date: '2026-03-30', enqueteur: 'David KALONJI', village: 'Tshikapa', valide_le: '2026-03-31', valide_par: 'OT' },
  { id: 6, type: 'Formation AIC', date: '2026-03-28', enqueteur: 'Béatrice NGOMA', village: 'Matadi', valide_le: '2026-03-29', valide_par: 'OT' },
];

// Données mockées - Statistiques
const mockStats = {
  total_collectes: 156,
  collectes_attente: 12,
  collectes_validees: 144,
  taux_validation: 92.3,
  plaintes_recues: 8,
  plaintes_traitees: 6,
  beneficiaires_couverts: 1245,
  enqueteurs_actifs: 8,
  qualite_moyenne: 82.5,
};

// Données mockées - Alertes qualité
const mockAlertesQualite = [
  { id: 1, message: 'Taux de complétude faible (68%) - Enquête #1234', niveau: 'warning' },
  { id: 2, message: 'Données GPS manquantes - Collecte #5678', niveau: 'error' },
  { id: 3, message: 'Incohérence superficie/production - Bénéficiaire RNA-00123', niveau: 'warning' },
];

export const OTDashboard: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const handleValidate = (id: number) => {
    console.log('Valider collecte:', id);
    // Logique de validation
  };

  const handleReject = (id: number) => {
    console.log('Rejeter collecte:', id);
    // Logique de rejet
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

      {/* Alertes qualité */}
      {mockAlertesQualite.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap">
            <Stack direction="row" spacing={1} alignItems="center">
              <Warning />
              <Typography variant="body2">
                <strong>{mockAlertesQualite.length} alerte(s) qualité</strong> nécessitent votre attention
              </Typography>
            </Stack>
            <Button size="small" variant="outlined" sx={{ borderRadius: 2 }}>
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
                  <Typography variant="caption" color="text.secondary">Collectes en attente</Typography>
                  <Typography variant="h3" fontWeight={700} color="warning.main">{mockStats.collectes_attente}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FFF3E0' }}><Pending sx={{ color: '#FF8F00' }} /></Avatar>
              </Stack>
              <LinearProgress variant="determinate" value={mockStats.taux_validation} sx={{ mt: 2, height: 6, borderRadius: 2 }} />
              <Typography variant="caption" color="text.secondary">Taux validation: {mockStats.taux_validation}%</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #1976D2' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Total collectes</Typography>
                  <Typography variant="h3" fontWeight={700}>{mockStats.total_collectes}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#E3F2FD' }}><Assignment sx={{ color: '#1976D2' }} /></Avatar>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {mockStats.collectes_validees} validées • {mockStats.collectes_attente} en attente
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #FF8F00' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">Plaintes GRM</Typography>
                  <Typography variant="h3" fontWeight={700}>{mockStats.plaintes_recues}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#FFF3E0' }}><ReportProblem sx={{ color: '#FF8F00' }} /></Avatar>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {mockStats.plaintes_traitees} traitées • {mockStats.plaintes_recues - mockStats.plaintes_traitees} en cours
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
                  <Typography variant="h3" fontWeight={700}>{mockStats.qualite_moyenne}%</Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#F3E5F5' }}><VerifiedUser sx={{ color: '#9C27B0' }} /></Avatar>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {mockStats.enqueteurs_actifs} enquêteurs actifs
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
          <Tab label="Alertes qualité" icon={<Warning />} iconPosition="start" />
        </Tabs>

        {/* Onglet À valider */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Enquêteur</TableCell>
                  <TableCell>Village</TableCell>
                  <TableCell>Qualité</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockCollectesAttente.map((collecte) => (
                  <TableRow key={collecte.id} hover>
                    <TableCell>{new Date(collecte.date).toLocaleDateString()}</TableCell>
                    <TableCell>{collecte.type}</TableCell>
                    <TableCell>{collecte.enqueteur}</TableCell>
                    <TableCell>{collecte.village}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${collecte.qualite}%`} 
                        size="small"
                        sx={{ 
                          bgcolor: collecte.qualite >= 80 ? '#E8F5E9' : collecte.qualite >= 60 ? '#FFF3E0' : '#FFEBEE',
                          color: collecte.qualite >= 80 ? '#2E7D32' : collecte.qualite >= 60 ? '#FF8F00' : '#F44336'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Valider">
                        <IconButton size="small" onClick={() => handleValidate(collecte.id)} sx={{ color: '#4CAF50' }}>
                          <CheckCircle />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Rejeter">
                        <IconButton size="small" onClick={() => handleReject(collecte.id)} sx={{ color: '#F44336' }}>
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
              <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                <TableRow>
                  <TableCell>Date collecte</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Enquêteur</TableCell>
                  <TableCell>Village</TableCell>
                  <TableCell>Validée le</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockCollectesValidees.map((collecte) => (
                  <TableRow key={collecte.id} hover>
                    <TableCell>{new Date(collecte.date).toLocaleDateString()}</TableCell>
                    <TableCell>{collecte.type}</TableCell>
                    <TableCell>{collecte.enqueteur}</TableCell>
                    <TableCell>{collecte.village}</TableCell>
                    <TableCell>
                      <Chip label={new Date(collecte.valide_le).toLocaleDateString()} size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Onglet Alertes qualité */}
        <TabPanel value={tabValue} index={2}>
          <List>
            {mockAlertesQualite.map((alerte) => (
              <ListItem key={alerte.id} sx={{ bgcolor: alerte.niveau === 'error' ? '#FFEBEE' : '#FFF3E0', borderRadius: 2, mb: 1 }}>
                <ListItemIcon>
                  {alerte.niveau === 'error' ? <Warning sx={{ color: '#F44336' }} /> : <Warning sx={{ color: '#FF8F00' }} />}
                </ListItemIcon>
                <ListItemText primary={alerte.message} />
                <Button size="small" variant="outlined" sx={{ borderRadius: 2 }}>
                  Corriger
                </Button>
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
                      '&:hover': { borderColor: '#2E7D32', bgcolor: '#F1F8E9' },
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
                      '&:hover': { borderColor: '#2E7D32', bgcolor: '#F1F8E9' },
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
                      '&:hover': { borderColor: '#2E7D32', bgcolor: '#F1F8E9' },
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
                      '&:hover': { borderColor: '#2E7D32', bgcolor: '#F1F8E9' },
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
                      '&:hover': { borderColor: '#2E7D32', bgcolor: '#F1F8E9' },
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
                      '&:hover': { borderColor: '#2E7D32', bgcolor: '#F1F8E9' },
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
          <Paper sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: '#F1F8E9' }}>
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