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

/** État vide explicite : on annonce l'absence de donnée au lieu de la combler. */
const EtatVide: React.FC<{ titre: string; detail?: string }> = ({ titre, detail }) => (
  <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed', borderRadius: 2 }}>
    <GoogleIcon name="inbox" size={36} sx={{ color: 'text.disabled', mb: 1 }} />
    <Typography variant="subtitle2" color="text.secondary">{titre}</Typography>
    {detail && (
      <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
        {detail}
      </Typography>
    )}
  </Paper>
);

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
  const [message, setMessage] = useState<string | null>(null);
  const [newActivite, setNewActivite] = useState<Partial<ActiviteTerrain>>({
    type: 'enquete',
    statut: 'planifiee',
  });
  const [newRapport, setNewRapport] = useState<Partial<RapportMensuel>>({
    mois: new Date().toLocaleString('fr-FR', { month: 'long' }),
    annee: new Date().getFullYear(),
  });

  /**
   * Charge les données de l'opérateur technique. Aucun jeu de démonstration
   * n'est fabriqué ici : si un service ne répond pas, la section concernée
   * reste vide et l'écran le dit. Les données de démonstration relèvent du
   * serveur (DEMO_DATA=1), pas de l'interface.
   */
  const loadData = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const [otRes, activitesRes, equipiersRes, rapportsRes] = await Promise.allSettled([
      otService.getOTData(),
      otService.getActivites(),
      otService.getEquipiers(),
      otService.getRapportsMensuels(),
    ]);

    setOtData(otRes.status === 'fulfilled' ? (otRes.value.data ?? null) : null);
    setActivites(activitesRes.status === 'fulfilled' && Array.isArray(activitesRes.value.data) ? activitesRes.value.data : []);
    setEquipiers(equipiersRes.status === 'fulfilled' && Array.isArray(equipiersRes.value.data) ? equipiersRes.value.data : []);
    setRapports(rapportsRes.status === 'fulfilled' && Array.isArray(rapportsRes.value.data) ? rapportsRes.value.data : []);

    const echecs = [otRes, activitesRes, equipiersRes, rapportsRes].filter((r) => r.status === 'rejected').length;
    if (echecs === 4) {
      setError("Aucun des services de l'opérateur technique n'a répondu. Les données ne peuvent pas être affichées.");
    } else if (echecs > 0) {
      setMessage(`${echecs} service(s) sur 4 n'ont pas répondu : les sections correspondantes sont vides.`);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Chargement initial depuis les services de l'opérateur technique.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  /** Export réel : le fichier vient du serveur, aucun succès n'est simulé. */
  const handleExport = async (format: 'pdf' | 'excel') => {
    setAnchorEl(null);
    setExporting(true);
    setMessage(null);
    try {
      const reponse = await otService.exportData(format);
      const url = URL.createObjectURL(new Blob([reponse.data as BlobPart]));
      const lien = document.createElement('a');
      lien.href = url;
      lien.download = `rapport-ot-${new Date().toISOString().slice(0, 10)}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMessage("L'export n'a pas abouti : le service n'a pas répondu.");
    } finally {
      setExporting(false);
    }
  };

  const handleAddActivite = async () => {
    try {
      await otService.addActivite(newActivite);
      setActiviteDialogOpen(false);
      setNewActivite({ type: 'enquete', statut: 'planifiee' });
      await loadData();
    } catch {
      setMessage("L'activité n'a pas pu être enregistrée : le service n'a pas répondu.");
    }
  };

  const handleSubmitRapport = async () => {
    try {
      await otService.soumettreRapport(newRapport);
      setRapportDialogOpen(false);
      setNewRapport({ mois: new Date().toLocaleString('fr-FR', { month: 'long' }), annee: new Date().getFullYear() });
      await loadData();
    } catch {
      setMessage("Le rapport n'a pas pu être soumis : le service n'a pas répondu.");
    }
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

  if (!otData) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert
          severity="info"
          action={<Button color="inherit" size="small" onClick={loadData}>Recharger</Button>}
        >
          Aucune donnée d'opérateur technique n'est disponible pour ce compte. Vérifiez que le
          service <code>/ot/data</code> est configuré et que l'opérateur est rattaché à votre profil.
        </Alert>
      </Box>
    );
  }

  /**
   * Évolution mensuelle reconstituée à partir des rapports réellement soumis.
   * Aucune série n'est inventée : sans rapport, le graphique n'est pas affiché.
   */
  const evolutionData = rapports
    .slice()
    .sort((a, b) => a.annee - b.annee)
    .slice(-12)
    .map((rapport) => ({
      name: `${rapport.mois.slice(0, 3)} ${String(rapport.annee).slice(2)}`,
      enquetes: rapport.enquetes,
      formations: rapport.formations,
      suivis: rapport.suivis,
    }));

  return (
    <Box>
      {message && (
        <Alert severity="warning" onClose={() => setMessage(null)} sx={{ mb: 2 }}>
          {message}
        </Alert>
      )}

      {/* En-tête avec informations OT */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: 'action.hover' }}>
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
            color="primary"
            onClick={() => navigate('/indicateurs/ir')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Qualité des données"
            value={`${otData.performances.qualite_donnees}%`}
            icon={<GoogleIcon name="data_usage" size={32} />}
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
            trend={
              equipiers.length > 0
                ? {
                    value: Math.round((equipiers.filter((e) => e.est_actif).length / equipiers.length) * 100),
                    direction: 'up',
                    period: 'de membres actifs',
                  }
                : undefined
            }
            color="warning"
            onClick={() => navigate('/beneficiaires/organisations')}
          />
        </Grid>
      </Grid>

      {/* Évolution des activités */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          {evolutionData.length > 0 ? (
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
          ) : (
            <EtatVide
              titre="Évolution des activités mensuelles"
              detail="Aucun rapport mensuel n'a encore été soumis : la série ne peut pas être tracée."
            />
          )}
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
            
            {activites.length === 0 && (
              <EtatVide
                titre="Aucune activité terrain enregistrée"
                detail="Les activités remontées par les équipes apparaîtront ici une fois saisies."
              />
            )}

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
                      <Box sx={{ width: 2, flex: 1, bgcolor: 'action.selected', my: 0.5 }} />
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
                <TableHead sx={{ bgcolor: 'action.hover' }}>
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
                  {equipiers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Aucun membre d'équipe enregistré pour cet opérateur.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
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
              {rapports.length === 0 && (
                <Grid size={{ xs: 12 }}>
                  <EtatVide
                    titre="Aucun rapport mensuel soumis"
                    detail="Utilisez « Soumettre rapport » pour transmettre le premier rapport."
                  />
                </Grid>
              )}
              {rapports.map((rapport) => (
                <Grid size={{ xs: 12, md: 4 }} key={rapport.id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6" fontWeight={600}>
                          {rapport.mois} {rapport.annee}
                        </Typography>
                        {rapport.valide ? (
                          <Chip label="Validé" size="small" sx={{ bgcolor: 'action.hover', color: '#2E7D32' }} />
                        ) : (
                          <Chip label="En attente" size="small" sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)', color: '#FF8F00' }} />
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
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Province</TableCell>
                    <TableCell>Territoire</TableCell>
                    <TableCell align="right">Villages</TableCell>
                    <TableCell align="right">Enquêtes réalisées</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(otData.zones ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Aucune zone d'intervention renseignée pour cet opérateur.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {(otData.zones ?? []).map((zone, idx) => (
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