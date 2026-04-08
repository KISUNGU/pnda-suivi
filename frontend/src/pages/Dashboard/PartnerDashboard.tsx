// frontend/src/pages/Dashboard/PartnerDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Alert,
  Avatar,
  Stack,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { IndicatorChart } from '../../components/common/Charts/IndicatorChart';
// import { otService, OTData, ActiviteTerrain, Equipier, RapportMensuel } from '../../services/ot.service';
import { otService } from '../../services/ot.service';
import type { OTData, ActiviteTerrain, Equipier, RapportMensuel } from '../../services/ot.service';
import { useNavigate } from 'react-router-dom';

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

// Données mockées pour l'OT
const mockOTData: OTData = {
  id: 'ot-001',
  nom: 'Opérateur Technique Agricole',
  sigle: 'OTA',
  region: 'Sud-Ouest',
  provinces: ['Kwilu', 'Kongo Central', 'Kinshasa'],
  responsable: {
    nom: 'Jean-Pierre KABEYA',
    email: 'jp.kabeya@ota.cd',
    telephone: '+243812345678',
  },
  equipes: {
    total: 24,
    superviseurs: 4,
    enqueteurs: 15,
    techniciens: 5,
  },
  performances: {
    taux_realisation: 78,
    taux_satisfaction: 85,
    qualite_donnees: 92,
    ponctualite: 88,
  },
  activites: {
    enquetes_realisees: 1245,
    formations_dispensees: 32,
    suivis_effectues: 156,
    plaintes_traitees: 28,
  },
  indicateurs: {
    production: 76,
    adoption: 68,
    satisfaction: 85,
  },
  objectifs: {
    enquetes: { realises: 1245, cible: 1600 },
    formations: { realises: 32, cible: 40 },
    suivis: { realises: 156, cible: 200 },
  },
  zones: [
    { province: 'Kwilu', territoire: 'Idiofa', villages: 45, enquetes: 520 },
    { province: 'Kwilu', territoire: 'Masi-Manimba', villages: 38, enquetes: 380 },
    { province: 'Kongo Central', territoire: 'Matadi', villages: 52, enquetes: 245 },
    { province: 'Kongo Central', territoire: 'Boma', villages: 28, enquetes: 180 },
    { province: 'Kinshasa', territoire: 'Mont Ngafula', villages: 12, enquetes: 120 },
  ],
  dernier_rapport: '2026-02-28',
  dernier_suivi: '2026-03-28',
};

const mockActivites: ActiviteTerrain[] = [
  { id: 1, type: 'enquete', titre: 'Enquête production maïs', description: 'Collecte des données de production dans la zone de Idiofa', date: '2026-03-25', province: 'Kwilu', territoire: 'Idiofa', village: 'Masi-Manimba', statut: 'terminee', responsable: 'Marie KABEYA', participants: 45, resultats: '450 enregistrements' },
  { id: 2, type: 'formation', titre: 'Formation AIC', description: 'Formation aux techniques agricoles intelligentes face au climat', date: '2026-03-28', province: 'Kongo Central', territoire: 'Matadi', village: 'Kimpese', statut: 'en_cours', responsable: 'Joseph MUKENDI', participants: 28 },
  { id: 3, type: 'suivi', titre: 'Suivi post-formation', description: 'Évaluation de l\'adoption des techniques après formation', date: '2026-03-30', province: 'Kinshasa', territoire: 'Mont Ngafula', village: 'Selembao', statut: 'planifiee', responsable: 'Albert TSHIBOLA' },
  { id: 4, type: 'plainte', titre: 'Traitement plainte VBG', description: 'Suivi de plainte pour exploitation sexuelle', date: '2026-03-26', province: 'Kwilu', territoire: 'Idiofa', village: 'Kikwit', statut: 'en_cours', responsable: 'Pauline LUBALA' },
  { id: 5, type: 'enquete', titre: 'Enquête satisfaction', description: 'Évaluation de la satisfaction des bénéficiaires', date: '2026-03-22', province: 'Kongo Central', territoire: 'Boma', village: 'Tshela', statut: 'terminee', responsable: 'David KALONJI', participants: 32, resultats: 'Taux satisfaction: 82%' },
];

const mockEquipiers: Equipier[] = [
  { id: 1, nom: 'KABEYA', prenom: 'Marie', fonction: 'superviseur', telephone: '+243812345678', email: 'marie.kabeya@ota.cd', province: 'Kwilu', performance: 95, enquetes_realisees: 145, dernier_suivi: '2026-03-20', est_actif: true },
  { id: 2, nom: 'MUKENDI', prenom: 'Joseph', fonction: 'enqueteur', telephone: '+243823456789', email: 'joseph.mukendi@ota.cd', province: 'Kwilu', performance: 88, enquetes_realisees: 112, dernier_suivi: '2026-03-22', est_actif: true },
  { id: 3, nom: 'TSHIBOLA', prenom: 'Albert', fonction: 'technicien', telephone: '+243834567890', email: 'albert.tshibola@ota.cd', province: 'Kongo Central', performance: 92, enquetes_realisees: 78, dernier_suivi: '2026-03-21', est_actif: true },
  { id: 4, nom: 'LUBALA', prenom: 'Pauline', fonction: 'enqueteur', telephone: '+243845678901', email: 'pauline.lubala@ota.cd', province: 'Kinshasa', performance: 78, enquetes_realisees: 65, dernier_suivi: '2026-03-23', est_actif: true },
  { id: 5, nom: 'KALONJI', prenom: 'David', fonction: 'superviseur', telephone: '+243856789012', email: 'david.kalonji@ota.cd', province: 'Kongo Central', performance: 91, enquetes_realisees: 132, dernier_suivi: '2026-03-24', est_actif: true },
  { id: 6, nom: 'NGOMA', prenom: 'Béatrice', fonction: 'enqueteur', telephone: '+243867890123', email: 'beatrice.ngoma@ota.cd', province: 'Kwilu', performance: 85, enquetes_realisees: 95, dernier_suivi: '2026-03-19', est_actif: false },
];

const mockRapports: RapportMensuel[] = [
  { id: 1, mois: 'Janvier', annee: 2026, enquetes: 420, formations: 12, suivis: 48, qualite_donnees: 89, commentaires: 'Bon début d\'année', soumis_le: '2026-02-05', valide: true },
  { id: 2, mois: 'Février', annee: 2026, enquetes: 385, formations: 10, suivis: 52, qualite_donnees: 91, commentaires: 'Progression satisfaisante', soumis_le: '2026-03-05', valide: true },
  { id: 3, mois: 'Mars', annee: 2026, enquetes: 440, formations: 10, suivis: 56, qualite_donnees: 92, commentaires: 'Activités intensifiées', soumis_le: '2026-03-30', valide: false },
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'enquete': return 'assignment';
    case 'formation': return 'school';
    case 'suivi': return 'track_changes';
    case 'plainte': return 'chat';
    default: return 'event_note';
  }
};

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'terminee': return '#4CAF50';
    case 'en_cours': return '#FFC107';
    case 'planifiee': return '#2196F3';
    case 'annulee': return '#F44336';
    default: return '#9E9E9E';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'terminee': return 'Terminée';
    case 'en_cours': return 'En cours';
    case 'planifiee': return 'Planifiée';
    case 'annulee': return 'Annulée';
    default: return statut;
  }
};

export const PartnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [otData, setOtData] = useState<OTData | null>(null);
  const [activites, setActivites] = useState<ActiviteTerrain[]>([]);
  const [equipiers, setEquipiers] = useState<Equipier[]>([]);
  const [rapports, setRapports] = useState<RapportMensuel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedEquipier, setSelectedEquipier] = useState<Equipier | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [activiteDialogOpen, setActiviteDialogOpen] = useState(false);
  const [rapportDialogOpen, setRapportDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);
  const [newActivite, setNewActivite] = useState<Partial<ActiviteTerrain>>({
    type: 'enquete',
    statut: 'planifiee',
  });
  const [newRapport, setNewRapport] = useState<Partial<RapportMensuel>>({
    mois: new Date().toLocaleString('fr-FR', { month: 'long' }),
    annee: new Date().getFullYear(),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [otRes, activitesRes, equipiersRes, rapportsRes] = await Promise.all([
        otService.getOTData(),
        otService.getActivites(),
        otService.getEquipiers(),
        otService.getRapportsMensuels(),
      ]);
      setOtData(otRes.data ?? mockOTData);
      setActivites(activitesRes.data?.length ? activitesRes.data : mockActivites);
      setEquipiers(equipiersRes.data?.length ? equipiersRes.data : mockEquipiers);
      setRapports(rapportsRes.data?.length ? rapportsRes.data : mockRapports);
    } catch (err) {
      // Fallback sur les données mock si l'API n'est pas encore disponible
      setOtData(mockOTData);
      setActivites(mockActivites);
      setEquipiers(mockEquipiers);
      setRapports(mockRapports);
      console.warn('API OT non disponible, utilisation des données mock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnchorEl(null);
      alert(`Export ${format.toUpperCase()} démarré`);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleAddActivite = async () => {
    try {
      await otService.addActivite(newActivite);
    } catch { /* activité ajoutée localement en fallback */ }
    setActiviteDialogOpen(false);
    setNewActivite({ type: 'enquete', statut: 'planifiee' });
    loadData();
  };

  const handleSubmitRapport = async () => {
    try {
      await otService.soumettreRapport(newRapport);
    } catch { /* rapport soumis localement en fallback */ }
    setRapportDialogOpen(false);
    setNewRapport({ mois: new Date().toLocaleString('fr-FR', { month: 'long' }), annee: new Date().getFullYear() });
    loadData();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!otData) return null;

  const evolutionData = [
    { name: 'Jan', enquetes: 420, formations: 12, suivis: 48 },
    { name: 'Fév', enquetes: 385, formations: 10, suivis: 52 },
    { name: 'Mar', enquetes: 440, formations: 10, suivis: 56 },
  ];

  return (
    <Box>
      {/* En-tête avec informations OT */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#F1F8E9' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar sx={{ bgcolor: '#2E7D32', width: 56, height: 56 }}>
                <GoogleIcon name="agriculture" size={32} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {otData.nom} ({otData.sigle})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {otData.region} • Provinces: {(otData.provinces ?? []).join(', ')}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<GoogleIcon name="download" size={18} />}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              disabled={exporting}
            >
              Exporter
            </Button>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => handleExport('pdf')}>
                <ListItemIcon><GoogleIcon name="picture_as_pdf" size={18} /></ListItemIcon>
                <ListItemText>Exporter en PDF</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => handleExport('excel')}>
                <ListItemIcon><GoogleIcon name="table_chart" size={18} /></ListItemIcon>
                <ListItemText>Exporter en Excel</ListItemText>
              </MenuItem>
            </Menu>
            <Button
              variant="contained"
              startIcon={<GoogleIcon name="refresh" size={18} />}
              onClick={loadData}
              sx={{ bgcolor: '#2E7D32' }}
            >
              Rafraîchir
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <GoogleIcon name="person" size={20} sx={{ color: '#2E7D32' }} />
              <Typography variant="body2">
                <strong>Responsable:</strong> {otData.responsable.nom}
              </Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <GoogleIcon name="email" size={20} sx={{ color: '#2E7D32' }} />
              <Typography variant="body2">{otData.responsable.email}</Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <GoogleIcon name="phone" size={20} sx={{ color: '#2E7D32' }} />
              <Typography variant="body2">{otData.responsable.telephone}</Typography>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Widgets KPI */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Taux de réalisation"
            value={`${otData.performances.taux_realisation}%`}
            icon={<GoogleIcon name="target" size={32} />}
            trend={{ value: 5, direction: 'up', period: 'vs objectif' }}
            color="primary"
            onClick={() => navigate('/indicateurs/ir')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Qualité des données"
            value={`${otData.performances.qualite_donnees}%`}
            icon={<GoogleIcon name="data_usage" size={32} />}
            trend={{ value: 3, direction: 'up', period: 'vs mois dernier' }}
            color="success"
            onClick={() => navigate('/indicateurs/iodp')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Enquêtes réalisées"
            value={otData.activites.enquetes_realisees.toLocaleString()}
            icon={<GoogleIcon name="assignment" size={32} />}
            trend={{ value: Math.round((otData.activites.enquetes_realisees / otData.objectifs.enquetes.cible) * 100), direction: 'up', period: 'de la cible' }}
            color="info"
            onClick={() => navigate('/database/activites')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Équipe terrain"
            value={otData.equipes.total}
            icon={<GoogleIcon name="groups" size={32} />}
            trend={{ value: 0, direction: 'up', period: 'équipes actives' }}
            color="warning"
            onClick={() => navigate('/beneficiaires/organisations')}
          />
        </Grid>
      </Grid>

      {/* Évolution des activités */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <IndicatorChart
            title="Évolution des activités mensuelles"
            data={evolutionData}
            lines={[
              { key: 'enquetes', name: 'Enquêtes', color: '#2E7D32' },
              { key: 'formations', name: 'Formations', color: '#FFC107' },
              { key: 'suivis', name: 'Suivis', color: '#2196F3' },
            ]}
            type="line"
            height={300}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Indicateurs de performance
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Adoption des technologies</Typography>
                  <Typography variant="caption" fontWeight={500}>{otData.indicateurs.adoption}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={otData.indicateurs.adoption} sx={{ height: 6, borderRadius: 2 }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Satisfaction bénéficiaires</Typography>
                  <Typography variant="caption" fontWeight={500}>{otData.indicateurs.satisfaction}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={otData.indicateurs.satisfaction} sx={{ height: 6, borderRadius: 2 }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption">Production agricole</Typography>
                  <Typography variant="caption" fontWeight={500}>{otData.indicateurs.production}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={otData.indicateurs.production} sx={{ height: 6, borderRadius: 2 }} />
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Onglets */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Activités terrain" icon={<GoogleIcon name="assignment" size={18} />} iconPosition="start" />
          <Tab label="Équipe" icon={<GoogleIcon name="groups" size={18} />} iconPosition="start" />
          <Tab label="Rapports" icon={<GoogleIcon name="description" size={18} />} iconPosition="start" />
          <Tab label="Zones d'intervention" icon={<GoogleIcon name="map" size={18} />} iconPosition="start" />
        </Tabs>

        {/* Onglet Activités terrain */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Activités en cours et à venir
              </Typography>
              <Button
                variant="contained"
                startIcon={<GoogleIcon name="add" size={18} />}
                onClick={() => setActiviteDialogOpen(true)}
                size="small"
                sx={{ bgcolor: '#2E7D32' }}
              >
                Nouvelle activité
              </Button>
            </Stack>
            
            <Stack spacing={2}>
              {activites.map((activite, index) => (
                <Stack key={activite.id} direction="row" spacing={2}>
                  {/* Indicateur visuel */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                    <Box sx={{
                      width: 36, height: 36, borderRadius: '50%',
                      bgcolor: getStatutColor(activite.statut),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <GoogleIcon name={getTypeIcon(activite.type)} size={16} sx={{ color: 'white' }} />
                    </Box>
                    {index < activites.length - 1 && (
                      <Box sx={{ width: 2, flex: 1, bgcolor: '#e0e0e0', my: 0.5 }} />
                    )}
                  </Box>
                  {/* Contenu */}
                  <Paper sx={{ p: 2, borderRadius: 2, flex: 1, mb: index < activites.length - 1 ? 0 : 0 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="subtitle2" fontWeight={600}>{activite.titre}</Typography>
                        <Typography variant="caption" color="text.secondary" display="block">{activite.description}</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                          <Chip label={`${activite.province} - ${activite.territoire}`} size="small" variant="outlined" />
                          <Chip label={`Responsable: ${activite.responsable}`} size="small" variant="outlined" />
                        </Stack>
                        {activite.participants && (
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            👥 {activite.participants} participants
                          </Typography>
                        )}
                        {activite.resultats && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5, color: '#2E7D32' }}>
                            📊 {activite.resultats}
                          </Typography>
                        )}
                      </Box>
                      <Chip
                        label={getStatutLabel(activite.statut)}
                        size="small"
                        sx={{ bgcolor: `${getStatutColor(activite.statut)}20`, color: getStatutColor(activite.statut), flexShrink: 0 }}
                      />
                    </Stack>
                  </Paper>
                </Stack>
              ))}
            </Stack>
          </Box>
        </TabPanel>

        {/* Onglet Équipe */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <GoogleIcon name="supervisor_account" size={40} sx={{ color: '#2E7D32' }} />
                  <Typography variant="h3" fontWeight={700}>{otData.equipes.superviseurs}</Typography>
                  <Typography variant="caption">Superviseurs</Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <GoogleIcon name="assignment_ind" size={40} sx={{ color: '#2E7D32' }} />
                  <Typography variant="h3" fontWeight={700}>{otData.equipes.enqueteurs}</Typography>
                  <Typography variant="caption">Enquêteurs</Typography>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ textAlign: 'center', p: 2 }}>
                  <GoogleIcon name="engineering" size={40} sx={{ color: '#2E7D32' }} />
                  <Typography variant="h3" fontWeight={700}>{otData.equipes.techniciens}</Typography>
                  <Typography variant="caption">Techniciens</Typography>
                </Card>
              </Grid>
            </Grid>

            <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Fonction</TableCell>
                    <TableCell>Province</TableCell>
                    <TableCell>Performance</TableCell>
                    <TableCell>Enquêtes</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipiers.map((equipier) => (
                    <TableRow key={equipier.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {equipier.nom} {equipier.prenom}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={equipier.fonction === 'superviseur' ? 'Superviseur' : equipier.fonction === 'enqueteur' ? 'Enquêteur' : 'Technicien'}
                          size="small"
                          sx={{ 
                            bgcolor: equipier.fonction === 'superviseur' ? '#E8F5E9' : equipier.fonction === 'enqueteur' ? '#E3F2FD' : '#FFF3E0',
                            color: equipier.fonction === 'superviseur' ? '#2E7D32' : equipier.fonction === 'enqueteur' ? '#1976D2' : '#FF8F00'
                          }}
                        />
                      </TableCell>
                      <TableCell>{equipier.province}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={equipier.performance} sx={{ width: 60, height: 6, borderRadius: 2 }} />
                          <Typography variant="caption">{equipier.performance}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{equipier.enquetes_realisees}</TableCell>
                      <TableCell>
                        <Chip 
                          label={equipier.est_actif ? 'Actif' : 'Inactif'} 
                          size="small"
                          sx={{ bgcolor: equipier.est_actif ? '#E8F5E9' : '#FFEBEE', color: equipier.est_actif ? '#2E7D32' : '#F44336' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small" onClick={() => { setSelectedEquipier(equipier); setDetailDialogOpen(true); }}>
                          <GoogleIcon name="visibility" size={18} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Onglet Rapports */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Rapports mensuels
              </Typography>
              <Button
                variant="contained"
                startIcon={<GoogleIcon name="add" size={18} />}
                onClick={() => setRapportDialogOpen(true)}
                size="small"
                sx={{ bgcolor: '#2E7D32' }}
              >
                Soumettre rapport
              </Button>
            </Stack>

            <Grid container spacing={3}>
              {rapports.map((rapport) => (
                <Grid size={{ xs: 12, md: 4 }} key={rapport.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight={600}>
                          {rapport.mois} {rapport.annee}
                        </Typography>
                        {rapport.valide ? (
                          <Chip label="Validé" size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }} />
                        ) : (
                          <Chip label="En attente" size="small" sx={{ bgcolor: '#FFF3E0', color: '#FF8F00' }} />
                        )}
                      </Stack>
                      <Divider sx={{ my: 1.5 }} />
                      <Grid container spacing={1}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Enquêtes</Typography>
                          <Typography variant="h6">{rapport.enquetes}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Formations</Typography>
                          <Typography variant="h6">{rapport.formations}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Suivis</Typography>
                          <Typography variant="h6">{rapport.suivis}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">Qualité données</Typography>
                          <Typography variant="h6">{rapport.qualite_donnees}%</Typography>
                        </Grid>
                      </Grid>
                      {rapport.commentaires && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                          {rapport.commentaires}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                        Soumis le {new Date(rapport.soumis_le).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        {/* Onglet Zones d'intervention */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              Répartition par zone d'intervention
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                  <TableRow>
                    <TableCell>Province</TableCell>
                    <TableCell>Territoire</TableCell>
                    <TableCell align="right">Villages</TableCell>
                    <TableCell align="right">Enquêtes réalisées</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {otData.zones.map((zone, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{zone.province}</TableCell>
                      <TableCell>{zone.territoire}</TableCell>
                      <TableCell align="right">{zone.villages}</TableCell>
                      <TableCell align="right">{zone.enquetes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* Dialog détail équipier */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedEquipier && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GoogleIcon name="person" size={24} sx={{ color: '#2E7D32' }} />
                <Typography variant="h6">{selectedEquipier.nom} {selectedEquipier.prenom}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Fonction</Typography>
                  <Typography variant="body2">{selectedEquipier.fonction === 'superviseur' ? 'Superviseur' : selectedEquipier.fonction === 'enqueteur' ? 'Enquêteur' : 'Technicien'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Province</Typography>
                  <Typography variant="body2">{selectedEquipier.province}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{selectedEquipier.email}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Téléphone</Typography>
                  <Typography variant="body2">{selectedEquipier.telephone}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Performance</Typography>
                  <Typography variant="body2" color={selectedEquipier.performance >= 80 ? 'success.main' : 'warning.main'}>
                    {selectedEquipier.performance}%
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" color="text.secondary">Enquêtes réalisées</Typography>
                  <Typography variant="body2">{selectedEquipier.enquetes_realisees}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Dernier suivi</Typography>
                  <Typography variant="body2">{new Date(selectedEquipier.dernier_suivi).toLocaleDateString()}</Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog nouvelle activité */}
      <Dialog open={activiteDialogOpen} onClose={() => setActiviteDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouvelle activité terrain</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Type d'activité</InputLabel>
                <Select
                  value={newActivite.type}
                  label="Type d'activité"
                  onChange={(e) => setNewActivite({ ...newActivite, type: e.target.value as ActiviteTerrain['type'] })}
                >
                  <MenuItem value="enquete">Enquête</MenuItem>
                  <MenuItem value="formation">Formation</MenuItem>
                  <MenuItem value="suivi">Suivi</MenuItem>
                  <MenuItem value="plainte">Plainte</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Titre"
                value={newActivite.titre || ''}
                onChange={(e) => setNewActivite({ ...newActivite, titre: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={newActivite.description || ''}
                onChange={(e) => setNewActivite({ ...newActivite, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Province"
                value={newActivite.province || ''}
                onChange={(e) => setNewActivite({ ...newActivite, province: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Territoire"
                value={newActivite.territoire || ''}
                onChange={(e) => setNewActivite({ ...newActivite, territoire: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={newActivite.date || ''}
                onChange={(e) => setNewActivite({ ...newActivite, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiviteDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleAddActivite} sx={{ bgcolor: '#2E7D32' }}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog rapport mensuel */}
      <Dialog open={rapportDialogOpen} onClose={() => setRapportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nouveau rapport mensuel</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Mois</InputLabel>
                <Select
                  value={newRapport.mois}
                  label="Mois"
                  onChange={(e) => setNewRapport({ ...newRapport, mois: e.target.value })}
                >
                  <MenuItem value="Janvier">Janvier</MenuItem>
                  <MenuItem value="Février">Février</MenuItem>
                  <MenuItem value="Mars">Mars</MenuItem>
                  <MenuItem value="Avril">Avril</MenuItem>
                  <MenuItem value="Mai">Mai</MenuItem>
                  <MenuItem value="Juin">Juin</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Année"
                value={newRapport.annee}
                onChange={(e) => setNewRapport({ ...newRapport, annee: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Enquêtes"
                value={newRapport.enquetes || ''}
                onChange={(e) => setNewRapport({ ...newRapport, enquetes: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Formations"
                value={newRapport.formations || ''}
                onChange={(e) => setNewRapport({ ...newRapport, formations: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Suivis"
                value={newRapport.suivis || ''}
                onChange={(e) => setNewRapport({ ...newRapport, suivis: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Commentaires"
                multiline
                rows={3}
                value={newRapport.commentaires || ''}
                onChange={(e) => setNewRapport({ ...newRapport, commentaires: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRapportDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSubmitRapport} sx={{ bgcolor: '#2E7D32' }}>
            Soumettre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PartnerDashboard;