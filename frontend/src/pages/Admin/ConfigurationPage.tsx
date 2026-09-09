// frontend/src/pages/Admin/ConfigurationPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Grid,
  Stack,
  Divider,
  TextField,
  Button,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  Alert,
  Tabs,
  Tab,
  Slider,
  IconButton,
  Tooltip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Snackbar,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import configurationService from '../../services/configuration.service';

// ─── Sous-composant onglet ───────────────────────────────────────────
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== index} sx={{ pt: 3 }}>
      {value === index && children}
    </Box>
  );
}

// ─── Types ─────────────────────────────────────────────────────────
interface ConfigGenerale {
  nomProjet: string;
  sigle: string;
  anneeDebut: string;
  anneeFin: string;
  devise: string;
  langueInterface: string;
  fuseau: string;
  budgetTotal: number;
  tauxChangeUSD: number;
}

interface ConfigAlertes {
  seuilRisqueFaible: number;
  seuilRisqueMoyen: number;
  seuilRisqueEleve: number;
  emailNotifications: boolean;
  seuilTauxRealisation: number;
  alertesBudget: boolean;
  alertesEcheances: boolean;
  delaiRappelJours: number;
}

type ConfigIntegration = {
  apiBackendUrl: string;
  timeoutRequetes: number;
  modehorsLigne: boolean;
  syncAutoActivee: boolean;
  intervalSyncMinutes: number;
  powerbiWorkspaceId: string;
  powerbiReportId: string;
};

// ─── Données initiales ─────────────────────────────────────────────
const defaultGenerale: ConfigGenerale = {
  nomProjet: 'Programme National de Développement Agricole',
  sigle: 'PNDA-SE',
  anneeDebut: '2023',
  anneeFin: '2028',
  devise: 'USD',
  langueInterface: 'fr',
  fuseau: 'Africa/Kinshasa',
  budgetTotal: 500000000,
  tauxChangeUSD: 2800,
};

const defaultAlertes: ConfigAlertes = {
  seuilRisqueFaible: 25,
  seuilRisqueMoyen: 50,
  seuilRisqueEleve: 75,
  emailNotifications: true,
  seuilTauxRealisation: 70,
  alertesBudget: true,
  alertesEcheances: true,
  delaiRappelJours: 7,
};

const defaultIntegration: ConfigIntegration = {
  apiBackendUrl: 'http://localhost:3000/api',
  timeoutRequetes: 30,
  modehorsLigne: true,
  syncAutoActivee: true,
  intervalSyncMinutes: 60,
  powerbiWorkspaceId: '',
  powerbiReportId: '',
};

const provinces = [
  'Kwilu', 'Kongo Central', 'Kasaï', 'Kasaï-Central', 'Kasaï-Oriental',
  'Lomami', 'Haut-Lomami', 'Tanganyika', 'Maniema', 'Sud-Kivu',
  'Kwango', 'Maï-Ndombe', 'Sankuru',
];

const composantes = [
  { code: 'C1', nom: 'Développement des marchés agricoles', couleur: '#2E7D32' },
  { code: 'C2', nom: 'Amélioration de la production agricole', couleur: '#1565C0' },
  { code: 'C3', nom: 'Infrastructures de marchés', couleur: '#E65100' },
  { code: 'C4', nom: 'Développement institutionnel', couleur: '#6A1B9A' },
];

// ─── Composant principal ────────────────────────────────────────────
export function ConfigurationPage() {
  const [tab, setTab] = useState(0);
  const [generale, setGenerale] = useState(defaultGenerale);
  const [alertes, setAlertes] = useState(defaultAlertes);
  const [integration, setIntegration] = useState(defaultIntegration);
  const [provincesActives, setProvincesActives] = useState<string[]>(
    ['Kwilu', 'Kongo Central', 'Kasaï', 'Haut-Lomami', 'Tanganyika', 'Maniema']
  );
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const { data } = await configurationService.getConfiguration();
        setGenerale(data.generale);
        setAlertes(data.alertes);
        setIntegration(data.integration);
        setProvincesActives(data.provincesActives);
      } catch (error) {
        console.error('Erreur chargement configuration:', error);
      }
    };
    loadConfiguration();
  }, []);

  const SECTION_KEYS: Record<string, 'generale' | 'alertes' | 'integration' | 'provincesActives'> = {
    'Général': 'generale',
    'Alertes & Seuils': 'alertes',
    'Intégrations': 'integration',
    'Provinces': 'provincesActives',
  };

  const SECTION_VALUES: Record<string, unknown> = {
    'Général': generale,
    'Alertes & Seuils': alertes,
    'Intégrations': integration,
    'Provinces': provincesActives,
  };

  const handleSave = async (section: string) => {
    try {
      await configurationService.updateSection(SECTION_KEYS[section], SECTION_VALUES[section]);
      setSnackMessage(`Configuration "${section}" sauvegardée avec succès.`);
      setSnackOpen(true);
    } catch (error) {
      console.error('Erreur sauvegarde configuration:', error);
      setSnackMessage(`Erreur lors de la sauvegarde de "${section}".`);
      setSnackOpen(true);
    }
  };

  const toggleProvince = (p: string) => {
    setProvincesActives(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
          <GoogleIcon name="settings" size={28} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary.dark">
            Configurations système
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Paramètres généraux, alertes, provinces et intégrations du PNDA-SE
          </Typography>
        </Box>
      </Stack>

      {/* Onglets */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            '& .MuiTab-root': { minHeight: 56, textTransform: 'none', fontWeight: 600 },
          }}
        >
          <Tab icon={<GoogleIcon name="tune" size={18} />} iconPosition="start" label="Général" />
          <Tab icon={<GoogleIcon name="map" size={18} />} iconPosition="start" label="Provinces" />
          <Tab icon={<GoogleIcon name="notifications" size={18} />} iconPosition="start" label="Alertes & Seuils" />
          <Tab icon={<GoogleIcon name="hub" size={18} />} iconPosition="start" label="Intégrations" />
          <Tab icon={<GoogleIcon name="palette" size={18} />} iconPosition="start" label="Composantes" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ── Onglet Général ── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Informations du projet
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  label="Nom complet du projet"
                  value={generale.nomProjet}
                  onChange={e => setGenerale({ ...generale, nomProjet: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Sigle"
                  value={generale.sigle}
                  onChange={e => setGenerale({ ...generale, sigle: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Année de début"
                  type="number"
                  value={generale.anneeDebut}
                  onChange={e => setGenerale({ ...generale, anneeDebut: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Année de fin"
                  type="number"
                  value={generale.anneeFin}
                  onChange={e => setGenerale({ ...generale, anneeFin: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Devise</InputLabel>
                  <Select
                    value={generale.devise}
                    label="Devise"
                    onChange={e => setGenerale({ ...generale, devise: e.target.value })}
                  >
                    <MenuItem value="USD">USD – Dollar américain</MenuItem>
                    <MenuItem value="CDF">CDF – Franc congolais</MenuItem>
                    <MenuItem value="EUR">EUR – Euro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Taux USD → CDF"
                  type="number"
                  value={generale.tauxChangeUSD}
                  onChange={e => setGenerale({ ...generale, tauxChangeUSD: Number(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Langue de l'interface</InputLabel>
                  <Select
                    value={generale.langueInterface}
                    label="Langue de l'interface"
                    onChange={e => setGenerale({ ...generale, langueInterface: e.target.value })}
                  >
                    <MenuItem value="fr">Français</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="sw">Kiswahili</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Fuseau horaire</InputLabel>
                  <Select
                    value={generale.fuseau}
                    label="Fuseau horaire"
                    onChange={e => setGenerale({ ...generale, fuseau: e.target.value })}
                  >
                    <MenuItem value="Africa/Kinshasa">Africa/Kinshasa (UTC+1)</MenuItem>
                    <MenuItem value="Africa/Lubumbashi">Africa/Lubumbashi (UTC+2)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Budget total du projet (USD)"
                  type="number"
                  value={generale.budgetTotal}
                  onChange={e => setGenerale({ ...generale, budgetTotal: Number(e.target.value) })}
                  InputProps={{ inputProps: { min: 0 } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<GoogleIcon name="save" size={18} />}
                    onClick={() => handleSave('Général')}
                  >
                    Sauvegarder
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Onglet Provinces ── */}
          <TabPanel value={tab} index={1}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Provinces actives dans le programme
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Sélectionnez les provinces couvertes par le PNDA-SE. Seules ces provinces
              apparaîtront dans les filtres et tableaux de bord.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {provinces.map(p => {
                const active = provincesActives.includes(p);
                return (
                  <Chip
                    key={p}
                    label={p}
                    onClick={() => toggleProvince(p)}
                    color={active ? 'primary' : 'default'}
                    variant={active ? 'filled' : 'outlined'}
                    icon={active
                      ? <GoogleIcon name="check_circle" size={16} />
                      : <GoogleIcon name="add_circle" size={16} />
                    }
                    sx={{ cursor: 'pointer' }}
                  />
                );
              })}
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              {provincesActives.length} province(s) active(s) : {provincesActives.join(', ')}
            </Alert>
            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<GoogleIcon name="save" size={18} />}
                onClick={() => handleSave('Provinces')}
              >
                Sauvegarder
              </Button>
            </Stack>
          </TabPanel>

          {/* ── Onglet Alertes & Seuils ── */}
          <TabPanel value={tab} index={2}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Seuils de risque
                </Typography>
              </Grid>
              {[
                { label: 'Seuil risque faible (%)', key: 'seuilRisqueFaible', color: '#4CAF50' },
                { label: 'Seuil risque moyen (%)', key: 'seuilRisqueMoyen', color: '#FF9800' },
                { label: 'Seuil risque élevé (%)', key: 'seuilRisqueEleve', color: '#F44336' },
                { label: 'Seuil alerte taux de réalisation (%)', key: 'seuilTauxRealisation', color: '#2196F3' },
              ].map(({ label, key, color }) => (
                <Grid size={{ xs: 12, md: 6 }} key={key}>
                  <Typography variant="body2" fontWeight={600} mb={1}>
                    {label} : <Box component="span" sx={{ color }}>{alertes[key as keyof ConfigAlertes] as number}%</Box>
                  </Typography>
                  <Slider
                    value={alertes[key as keyof ConfigAlertes] as number}
                    min={0}
                    max={100}
                    step={5}
                    marks
                    valueLabelDisplay="auto"
                    sx={{ color }}
                    onChange={(_, v) => setAlertes({ ...alertes, [key]: v as number })}
                  />
                </Grid>
              ))}

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Notifications
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <List disablePadding>
                    {[
                      { key: 'emailNotifications', label: 'Notifications par e-mail', icon: 'mail' },
                      { key: 'alertesBudget', label: 'Alertes dépassement budget', icon: 'account_balance_wallet' },
                      { key: 'alertesEcheances', label: 'Alertes échéances', icon: 'event' },
                    ].map(({ key, label, icon }) => (
                      <ListItem key={key} disableGutters>
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <GoogleIcon name={icon} size={20} />
                        </ListItemIcon>
                        <ListItemText primary={label} />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={alertes[key as keyof ConfigAlertes] as boolean}
                            onChange={e => setAlertes({ ...alertes, [key]: e.target.checked })}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Délai de rappel (jours avant échéance)"
                  type="number"
                  value={alertes.delaiRappelJours}
                  onChange={e => setAlertes({ ...alertes, delaiRappelJours: Number(e.target.value) })}
                  InputProps={{ inputProps: { min: 1, max: 30 } }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<GoogleIcon name="save" size={18} />}
                    onClick={() => handleSave('Alertes & Seuils')}
                  >
                    Sauvegarder
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Onglet Intégrations ── */}
          <TabPanel value={tab} index={3}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  API Backend
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 8 }}>
                <TextField
                  fullWidth
                  label="URL de l'API backend"
                  value={integration.apiBackendUrl}
                  onChange={e => setIntegration({ ...integration, apiBackendUrl: e.target.value })}
                  InputProps={{
                    endAdornment: (
                      <Tooltip title="Tester la connexion">
                        <IconButton size="small">
                          <GoogleIcon name="wifi_tethering" size={18} />
                        </IconButton>
                      </Tooltip>
                    ),
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Timeout requêtes (secondes)"
                  type="number"
                  value={integration.timeoutRequetes}
                  onChange={e => setIntegration({ ...integration, timeoutRequetes: Number(e.target.value) })}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Mode hors ligne & synchronisation
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <List disablePadding>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <GoogleIcon name="wifi_off" size={20} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Mode hors ligne (PWA)"
                        secondary="Stockage local via IndexedDB"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={integration.modehorsLigne}
                          onChange={e => setIntegration({ ...integration, modehorsLigne: e.target.checked })}
                          color="primary"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem disableGutters>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <GoogleIcon name="sync" size={20} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Synchronisation automatique"
                        secondary="Sync des données offline vers le serveur"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={integration.syncAutoActivee}
                          onChange={e => setIntegration({ ...integration, syncAutoActivee: e.target.checked })}
                          color="primary"
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Intervalle de synchronisation (minutes)"
                  type="number"
                  value={integration.intervalSyncMinutes}
                  onChange={e => setIntegration({ ...integration, intervalSyncMinutes: Number(e.target.value) })}
                  disabled={!integration.syncAutoActivee}
                  InputProps={{ inputProps: { min: 5, max: 1440 } }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Intégration Power BI
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Workspace ID Power BI"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={integration.powerbiWorkspaceId}
                  onChange={e => setIntegration({ ...integration, powerbiWorkspaceId: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Report ID Power BI"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={integration.powerbiReportId}
                  onChange={e => setIntegration({ ...integration, powerbiReportId: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="flex-end">
                  <Button
                    variant="contained"
                    startIcon={<GoogleIcon name="save" size={18} />}
                    onClick={() => handleSave('Intégrations')}
                  >
                    Sauvegarder
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Onglet Composantes ── */}
          <TabPanel value={tab} index={4}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Composantes du programme
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Les composantes structurelles du PNDA-SE utilisées pour le suivi des indicateurs.
            </Typography>
            <Stack spacing={2}>
              {composantes.map(c => (
                <Card key={c.code} variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: '12px !important' }}>
                    <Avatar sx={{ bgcolor: c.couleur, width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
                      {c.code}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body1" fontWeight={600}>{c.nom}</Typography>
                      <Typography variant="caption" color="text.secondary">Code : {c.code}</Typography>
                    </Box>
                    <Chip
                      label="Active"
                      size="small"
                      color="success"
                      variant="outlined"
                      icon={<GoogleIcon name="check_circle" size={14} />}
                    />
                  </CardContent>
                </Card>
              ))}
            </Stack>
            <Alert severity="info" sx={{ mt: 3 }}>
              La modification des composantes nécessite une intervention de l'administrateur système.
              Contactez le support PNDA-SE pour toute modification.
            </Alert>
          </TabPanel>
        </Box>
      </Paper>

      {/* Snackbar confirmation */}
      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackOpen(false)} severity="success" variant="filled">
          {snackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default ConfigurationPage;
