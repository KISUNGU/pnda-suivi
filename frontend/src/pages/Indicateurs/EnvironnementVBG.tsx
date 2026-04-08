// frontend/src/pages/Indicateurs/EnvironnementVBG.tsx
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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Avatar,
  Stack,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Rating,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import type { IndicateurEnvironnemental, PlainteSensible, FormationSensibilisation, StatsEnvironnement } from '../../services/environnement.service';

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
const mockIndicateurs: IndicateurEnvironnemental[] = [
  {
    id: 1,
    code: 'ENV-01',
    nom: 'Entreprises respectant les dispositions environnementales',
    description: 'Pourcentage d\'entreprises conformes aux clauses environnementales sur leurs chantiers',
    categorie: 'environnement',
    unite: '%',
    valeur_actuelle: 78,
    valeur_cible: 100,
    progression: 78,
    tendance: 'hausse',
    periode: 'T1 2026',
    observations: 'Progression significative depuis le dernier trimestre',
  },
  {
    id: 2,
    code: 'ENV-02',
    nom: 'Études d\'impact environnemental réalisées',
    description: 'Nombre de sous-projets ayant fait l\'objet d\'une ÉIES avec PGES mis en œuvre',
    categorie: 'environnement',
    unite: 'nombre',
    valeur_actuelle: 12,
    valeur_cible: 20,
    progression: 60,
    tendance: 'hausse',
    periode: 'T1 2026',
  },
  {
    id: 3,
    code: 'VBG-01',
    nom: 'Plaintes VBG reçues',
    description: 'Nombre de plaintes liées aux Violences Basées sur le Genre',
    categorie: 'vbg',
    unite: 'nombre',
    valeur_actuelle: 18,
    valeur_cible: 0,
    progression: 0,
    tendance: 'hausse',
    periode: 'T1 2026',
    observations: 'Augmentation due à la sensibilisation',
  },
  {
    id: 4,
    code: 'VBG-02',
    nom: 'Plaintes VBG traitées',
    description: 'Pourcentage de plaintes VBG traitées dans les délais',
    categorie: 'vbg',
    unite: '%',
    valeur_actuelle: 72,
    valeur_cible: 100,
    progression: 72,
    tendance: 'hausse',
    periode: 'T1 2026',
  },
  {
    id: 5,
    code: 'EAS-01',
    nom: 'Cas d\'Exploitation et Abus Sexuels',
    description: 'Nombre de cas d\'EAS signalés',
    categorie: 'eas',
    unite: 'nombre',
    valeur_actuelle: 5,
    valeur_cible: 0,
    progression: 0,
    tendance: 'stable',
    periode: 'T1 2026',
  },
  {
    id: 6,
    code: 'HS-01',
    nom: 'Cas de Harcèlement Sexuel',
    description: 'Nombre de cas de harcèlement sexuel signalés',
    categorie: 'hs',
    unite: 'nombre',
    valeur_actuelle: 3,
    valeur_cible: 0,
    progression: 0,
    tendance: 'stable',
    periode: 'T1 2026',
  },
  {
    id: 7,
    code: 'SENS-01',
    nom: 'Personnes formées/sensibilisées',
    description: 'Nombre de personnes formées et sensibilisées aux VBG/EAS/HS',
    categorie: 'environnement',
    unite: 'nombre',
    valeur_actuelle: 245,
    valeur_cible: 500,
    progression: 49,
    tendance: 'hausse',
    periode: 'T1 2026',
  },
  {
    id: 8,
    code: 'CODE-01',
    nom: 'Code de conduite signé',
    description: 'Pourcentage du personnel ayant signé le code de conduite',
    categorie: 'environnement',
    unite: '%',
    valeur_actuelle: 92,
    valeur_cible: 100,
    progression: 92,
    tendance: 'hausse',
    periode: 'T1 2026',
  },
];

const mockPlaintes: PlainteSensible[] = [
  {
    id: 1,
    numero: 'PL-VBG-001',
    type: 'VBG',
    description: 'Cas de violence conjugale au sein du ménage bénéficiaire',
    date_reception: '2026-03-15',
    statut: 'en_cours',
    delai_traitement: 12,
    province: 'Kwilu',
    territoire: 'Idiofa',
    est_confidentiel: true,
    prise_en_charge: 'Centre de santé de Masi-Manimba',
  },
  {
    id: 2,
    numero: 'PL-EAS-001',
    type: 'EAS',
    description: 'Exploitation sexuelle par un agent de terrain',
    date_reception: '2026-03-18',
    statut: 'en_cours',
    delai_traitement: 10,
    province: 'Kasaï',
    territoire: 'Tshikapa',
    est_confidentiel: true,
    prise_en_charge: 'Commission VBG provinciale',
  },
  {
    id: 3,
    numero: 'PL-VBG-002',
    type: 'VBG',
    description: 'Violence psychologique lors d\'une distribution d\'intrants',
    date_reception: '2026-03-20',
    statut: 'traitee',
    delai_traitement: 8,
    province: 'Kongo Central',
    territoire: 'Matadi',
    est_confidentiel: false,
    resolution: 'Médiation effectuée, agent sanctionné',
  },
  {
    id: 4,
    numero: 'PL-HS-001',
    type: 'HS',
    description: 'Harcèlement sexuel lors d\'une formation',
    date_reception: '2026-03-22',
    statut: 'referee',
    delai_traitement: 5,
    province: 'Kinshasa',
    territoire: 'Mont Ngafula',
    est_confidentiel: true,
    prise_en_charge: 'Commission disciplinaire',
  },
];

const mockFormations: FormationSensibilisation[] = [
  {
    id: 1,
    titre: 'Formation sur les VBG et le Code de Conduite',
    type: 'formation',
    date: '2026-02-10',
    lieu: 'Kinshasa',
    participants: 45,
    participants_femmes: 28,
    participants_hommes: 17,
    province: 'Kinshasa',
    formateur: 'Expert Genre',
    evaluation: 85,
  },
  {
    id: 2,
    titre: 'Sensibilisation communautaire VBG',
    type: 'sensibilisation',
    date: '2026-02-20',
    lieu: 'Masi-Manimba',
    participants: 120,
    participants_femmes: 78,
    participants_hommes: 42,
    province: 'Kwilu',
    formateur: 'Animateur local',
    evaluation: 90,
  },
  {
    id: 3,
    titre: 'Formation EAS/HS pour agents terrain',
    type: 'formation',
    date: '2026-03-05',
    lieu: 'Tshikapa',
    participants: 35,
    participants_femmes: 18,
    participants_hommes: 17,
    province: 'Kasaï',
    formateur: 'Consultant',
    evaluation: 88,
  },
  {
    id: 4,
    titre: 'Sensibilisation mécanismes de plainte',
    type: 'sensibilisation',
    date: '2026-03-15',
    lieu: 'Matadi',
    participants: 85,
    participants_femmes: 52,
    participants_hommes: 33,
    province: 'Kongo Central',
    formateur: 'GRM',
  },
];

const mockStats: StatsEnvironnement = {
  entreprises_conformes: 42,
  total_entreprises: 54,
  taux_conformite: 77.8,
  eies_realisees: 12,
  eies_prevues: 20,
  personnes_formees: 180,
  personnes_sensibilisees: 325,
  plaintes_vbg: 12,
  plaintes_eas: 3,
  plaintes_hs: 2,
  plaintes_traitees: 11,
  delai_moyen_traitement: 10.5,
  code_conduite_signes: 156,
  total_personnel: 170,
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'VBG': return '#D32F2F';
    case 'EAS': return '#F44336';
    case 'HS': return '#FF9800';
    default: return '#9E9E9E';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'recue': return 'Reçue';
    case 'en_cours': return 'En cours';
    case 'referee': return 'Référée';
    case 'traitee': return 'Traitée';
    case 'cloturee': return 'Clôturée';
    default: return statut;
  }
};

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'recue': return '#FFC107';
    case 'en_cours': return '#2196F3';
    case 'referee': return '#9C27B0';
    case 'traitee': return '#4CAF50';
    case 'cloturee': return '#757575';
    default: return '#9E9E9E';
  }
};

export const EnvironnementVBG: React.FC = () => {
  const [indicateurs, setIndicateurs] = useState<IndicateurEnvironnemental[]>([]);
  const [plaintes, setPlaintes] = useState<PlainteSensible[]>([]);
  const [formations, setFormations] = useState<FormationSensibilisation[]>([]);
  const [stats, setStats] = useState<StatsEnvironnement | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedPlainte, setSelectedPlainte] = useState<PlainteSensible | null>(null);
  const [formationDialogOpen, setFormationDialogOpen] = useState(false);
  const [newFormation, setNewFormation] = useState<Partial<FormationSensibilisation>>({ type: 'formation' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setIndicateurs(mockIndicateurs);
      setPlaintes(mockPlaintes);
      setFormations(mockFormations);
      setStats(mockStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlainte = (plainte: PlainteSensible) => {
    setSelectedPlainte(plainte);
    setDetailDialogOpen(true);
  };

  const handleAddFormation = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setFormationDialogOpen(false);
      setNewFormation({ type: 'formation' });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Environnement & VBG/EAS/HS
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Suivi des indicateurs environnementaux et de la protection sociale (Violences Basées sur le Genre, Exploitation et Abus Sexuels, Harcèlement Sexuel)
      </Typography>

      {/* Statistiques clés */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2, borderLeft: '4px solid #2E7D32' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Conformité environnementale</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.taux_conformite}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.entreprises_conformes}/{stats.total_entreprises} entreprises
                </Typography>
                <LinearProgress variant="determinate" value={stats.taux_conformite} sx={{ mt: 1, height: 6, borderRadius: 2 }} />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2, borderLeft: '4px solid #F44336' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Plaintes VBG/EAS/HS</Typography>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {stats.plaintes_vbg + stats.plaintes_eas + stats.plaintes_hs}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  VBG: {stats.plaintes_vbg} | EAS: {stats.plaintes_eas} | HS: {stats.plaintes_hs}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Traitement des plaintes</Typography>
                <Typography variant="h4" fontWeight={700} color="success.main">{stats.plaintes_traitees}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Délai moyen: {stats.delai_moyen_traitement} jours
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={(stats.plaintes_traitees / (stats.plaintes_vbg + stats.plaintes_eas + stats.plaintes_hs)) * 100} 
                  sx={{ mt: 1, height: 6, borderRadius: 2 }} 
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Personnes sensibilisées</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.personnes_formees + stats.personnes_sensibilisees}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Formations: {stats.personnes_formees} | Sensibilisations: {stats.personnes_sensibilisees}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Indicateurs */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <GoogleIcon name="eco" size={24} sx={{ color: '#2E7D32' }} />
          Indicateurs de suivi
        </Typography>
        <Grid container spacing={2}>
          {indicateurs.map((ind) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={ind.id}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip 
                      label={ind.categorie === 'environnement' ? 'Environnement' : ind.categorie === 'vbg' ? 'VBG' : ind.categorie === 'eas' ? 'EAS' : 'HS'}
                      size="small"
                      sx={{ 
                        bgcolor: ind.categorie === 'environnement' ? '#E8F5E9' : '#FFEBEE',
                        color: ind.categorie === 'environnement' ? '#2E7D32' : '#D32F2F'
                      }}
                    />
                    <Tooltip title={ind.tendance === 'hausse' ? 'En hausse' : ind.tendance === 'baisse' ? 'En baisse' : 'Stable'}>
                      <GoogleIcon 
                        name={ind.tendance === 'hausse' ? 'trending_up' : ind.tendance === 'baisse' ? 'trending_down' : 'trending_flat'} 
                        size={20}
                        sx={{ color: ind.tendance === 'hausse' ? '#4CAF50' : ind.tendance === 'baisse' ? '#F44336' : '#FFC107' }}
                      />
                    </Tooltip>
                  </Stack>
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                    {ind.nom}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {ind.description}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {ind.valeur_actuelle}{ind.unite}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cible: {ind.valeur_cible}{ind.unite}
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={Math.min(ind.progression, 100)} 
                      sx={{ mt: 1, height: 6, borderRadius: 2 }}
                    />
                  </Box>
                  {ind.observations && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      📝 {ind.observations}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Onglets */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Plaintes sensibles" icon={<GoogleIcon name="warning" size={18} />} iconPosition="start" />
          <Tab label="Formations & Sensibilisations" icon={<GoogleIcon name="school" size={18} />} iconPosition="start" />
          <Tab label="Code de conduite" icon={<GoogleIcon name="assignment" size={18} />} iconPosition="start" />
        </Tabs>

        {/* Onglet Plaintes */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              <strong>Confidentialité:</strong> Les cas sensibles sont traités avec discrétion. L'accès est restreint au personnel autorisé.
            </Alert>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                  <TableRow>
                    <TableCell>N° Plainte</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Province</TableCell>
                    <TableCell>Date réception</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell>Délai</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plaintes.map((plainte) => (
                    <TableRow key={plainte.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{plainte.numero}</Typography>
                        {plainte.est_confidentiel && (
                          <Chip label="Confidentiel" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#FFEBEE', color: '#F44336' }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={plainte.type} 
                          size="small"
                          sx={{ bgcolor: `${getTypeColor(plainte.type)}20`, color: getTypeColor(plainte.type) }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{plainte.description.substring(0, 60)}...</Typography>
                      </TableCell>
                      <TableCell>{plainte.province}</TableCell>
                      <TableCell>{new Date(plainte.date_reception).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatutLabel(plainte.statut)} 
                          size="small"
                          sx={{ bgcolor: `${getStatutColor(plainte.statut)}20`, color: getStatutColor(plainte.statut) }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color={plainte.delai_traitement > 30 ? 'error.main' : 'success.main'}>
                          {plainte.delai_traitement} jours
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Voir détails">
                          <IconButton size="small" onClick={() => handleViewPlainte(plainte)}>
                            <GoogleIcon name="visibility" size={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Onglet Formations */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Sessions de formation et sensibilisation
              </Typography>
              <Button
                variant="contained"
                startIcon={<GoogleIcon name="add" size={18} />}
                onClick={() => setFormationDialogOpen(true)}
                size="small"
                sx={{ bgcolor: '#2E7D32' }}
              >
                Ajouter une session
              </Button>
            </Stack>
            <Grid container spacing={2}>
              {formations.map((formation) => (
                <Grid size={{ xs: 12, md: 6 }} key={formation.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Chip 
                          label={formation.type === 'formation' ? 'Formation' : 'Sensibilisation'} 
                          size="small"
                          sx={{ bgcolor: formation.type === 'formation' ? '#E3F2FD' : '#FFF3E0' }}
                        />
                        {formation.evaluation && (
                          <Rating value={formation.evaluation / 20} readOnly size="small" />
                        )}
                      </Stack>
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {formation.titre}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {formation.lieu} - {new Date(formation.date).toLocaleDateString()}
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Participants</Typography>
                          <Typography variant="h6">{formation.participants}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Femmes</Typography>
                          <Typography variant="h6" color="#F06292">{formation.participants_femmes}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Hommes</Typography>
                          <Typography variant="h6" color="#64B5F6">{formation.participants_hommes}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Formateur</Typography>
                          <Typography variant="body2">{formation.formateur}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        {/* Onglet Code de conduite */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ textAlign: 'center', p: 3 }}>
                  <GoogleIcon name="assignment_turned_in" size={48} sx={{ color: '#2E7D32' }} />
                  <Typography variant="h2" fontWeight={700}>
                    {stats?.code_conduite_signes}/{stats?.total_personnel}
                  </Typography>
                  <Typography variant="h6">{stats?.taux_conformite}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    du personnel a signé le code de conduite
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={stats?.taux_conformite || 0} 
                    sx={{ mt: 2, height: 8, borderRadius: 2 }}
                  />
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, bgcolor: '#F1F8E9', borderRadius: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    Engagement du personnel
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><GoogleIcon name="check_circle" size={20} sx={{ color: '#2E7D32' }} /></ListItemIcon>
                      <ListItemText primary="Zéro tolérance contre les VBG/EAS/HS" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><GoogleIcon name="check_circle" size={20} sx={{ color: '#2E7D32' }} /></ListItemIcon>
                      <ListItemText primary="Mécanismes de signalement confidentiels" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><GoogleIcon name="check_circle" size={20} sx={{ color: '#2E7D32' }} /></ListItemIcon>
                      <ListItemText primary="Prise en charge des victimes" />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><GoogleIcon name="check_circle" size={20} sx={{ color: '#2E7D32' }} /></ListItemIcon>
                      <ListItemText primary="Sanctions disciplinaires en cas de manquement" />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Dialog détail plainte */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedPlainte && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: getTypeColor(selectedPlainte.type) }}>
                  <GoogleIcon name="warning" size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedPlainte.numero}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {selectedPlainte.type} - {new Date(selectedPlainte.date_reception).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body2" paragraph>{selectedPlainte.description}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Province/Territoire</Typography>
                  <Typography variant="body2">{selectedPlainte.province} - {selectedPlainte.territoire}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Statut</Typography>
                  <Chip label={getStatutLabel(selectedPlainte.statut)} size="small" />
                </Grid>
                {selectedPlainte.prise_en_charge && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Prise en charge</Typography>
                    <Typography variant="body2">{selectedPlainte.prise_en_charge}</Typography>
                  </Grid>
                )}
                {selectedPlainte.resolution && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="subtitle2" color="text.secondary">Résolution</Typography>
                    <Alert severity="success" sx={{ mt: 1 }}>{selectedPlainte.resolution}</Alert>
                  </Grid>
                )}
                {selectedPlainte.est_confidentiel && (
                  <Grid size={{ xs: 12 }}>
                    <Alert severity="warning" icon={<GoogleIcon name="lock" size={18} />}>
                      Cette plainte est confidentielle. L'accès est restreint.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" sx={{ bgcolor: '#2E7D32' }}>Mettre à jour</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog ajout formation */}
      <Dialog open={formationDialogOpen} onClose={() => setFormationDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Ajouter une session</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newFormation.type}
                  label="Type"
                  onChange={(e) => setNewFormation({ ...newFormation, type: e.target.value as 'formation' | 'sensibilisation' })}
                >
                  <MenuItem value="formation">Formation</MenuItem>
                  <MenuItem value="sensibilisation">Sensibilisation</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Titre"
                value={newFormation.titre || ''}
                onChange={(e) => setNewFormation({ ...newFormation, titre: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Date"
                value={newFormation.date || ''}
                onChange={(e) => setNewFormation({ ...newFormation, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Lieu"
                value={newFormation.lieu || ''}
                onChange={(e) => setNewFormation({ ...newFormation, lieu: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Participants"
                value={newFormation.participants || ''}
                onChange={(e) => setNewFormation({ ...newFormation, participants: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Formateur"
                value={newFormation.formateur || ''}
                onChange={(e) => setNewFormation({ ...newFormation, formateur: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormationDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleAddFormation} sx={{ bgcolor: '#2E7D32' }}>
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnvironnementVBG;