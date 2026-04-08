// frontend/src/pages/Dashboard/ProvincialDashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Stack,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { IndicatorChart } from '../../components/common/Charts/IndicatorChart';
import { ProvinceMap } from '../../components/common/Map/ProvinceMap';
import provincialService from '../../services/provincial.service';
import type { ProvinceData, PerformanceEvolution, ClassementProvincial } from '../../services/provincial.service';
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

// Données mockées pour les provinces
const mockProvinces: ProvinceData[] = [
  {
    id: 'kinshasa',
    name: 'Kinshasa',
    code: 'KN',
    region: 'Centre',
    population: 15000000,
    beneficiaires: { total: 15230, femmes: 6853, hommes: 8377, jeunes: 4230, cible: 20000 },
    production: {
      maïs: { actuel: 1250, cible: 2000, unite: 'tonnes' },
      manioc: { actuel: 890, cible: 1500, unite: 'tonnes' },
      arachide: { actuel: 450, cible: 800, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 45, prevues: 80, unite: 'km' },
      cler: { fonctionnels: 3, total: 5 },
      marches: { construits: 2, prevus: 4 },
    },
    indicateurs: {
      iodp1: { actuel: 18, cible: 30, trend: 2.5 },
      iodp2: { actuel: 25, cible: 40, trend: 3.2 },
      iodp3: { actuel: 70, cible: 100, trend: 5.1 },
    },
    risques: { critiques: 1, eleves: 2, moderes: 3, faibles: 4 },
    plaintes: { total: 12, traitees: 8, en_cours: 4, vbg: 2 },
    dernier_suivi: '2026-03-28',
  },
  {
    id: 'kongocentral',
    name: 'Kongo Central',
    code: 'KC',
    region: 'Ouest',
    population: 8000000,
    beneficiaires: { total: 18920, femmes: 8514, hommes: 10406, jeunes: 5670, cible: 25000 },
    production: {
      maïs: { actuel: 2100, cible: 3000, unite: 'tonnes' },
      manioc: { actuel: 1560, cible: 2500, unite: 'tonnes' },
      arachide: { actuel: 780, cible: 1200, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 78, prevues: 120, unite: 'km' },
      cler: { fonctionnels: 5, total: 7 },
      marches: { construits: 3, prevus: 5 },
    },
    indicateurs: {
      iodp1: { actuel: 22, cible: 30, trend: 3.1 },
      iodp2: { actuel: 32, cible: 40, trend: 4.2 },
      iodp3: { actuel: 78, cible: 100, trend: 6.3 },
    },
    risques: { critiques: 0, eleves: 1, moderes: 4, faibles: 6 },
    plaintes: { total: 8, traitees: 6, en_cours: 2, vbg: 1 },
    dernier_suivi: '2026-03-27',
  },
  {
    id: 'kwilu',
    name: 'Kwilu',
    code: 'KW',
    region: 'Ouest',
    population: 5000000,
    beneficiaires: { total: 14250, femmes: 6412, hommes: 7838, jeunes: 3980, cible: 18000 },
    production: {
      maïs: { actuel: 1850, cible: 2500, unite: 'tonnes' },
      manioc: { actuel: 1250, cible: 2000, unite: 'tonnes' },
      arachide: { actuel: 620, cible: 1000, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 52, prevues: 90, unite: 'km' },
      cler: { fonctionnels: 4, total: 6 },
      marches: { construits: 2, prevus: 4 },
    },
    indicateurs: {
      iodp1: { actuel: 16, cible: 30, trend: 2.0 },
      iodp2: { actuel: 28, cible: 40, trend: 3.5 },
      iodp3: { actuel: 65, cible: 100, trend: 4.8 },
    },
    risques: { critiques: 1, eleves: 3, moderes: 3, faibles: 4 },
    plaintes: { total: 15, traitees: 10, en_cours: 5, vbg: 3 },
    dernier_suivi: '2026-03-29',
  },
  {
    id: 'kasai',
    name: 'Kasaï',
    code: 'KS',
    region: 'Centre',
    population: 6000000,
    beneficiaires: { total: 16890, femmes: 7600, hommes: 9290, jeunes: 4850, cible: 22000 },
    production: {
      maïs: { actuel: 2450, cible: 3500, unite: 'tonnes' },
      manioc: { actuel: 1980, cible: 2800, unite: 'tonnes' },
      arachide: { actuel: 890, cible: 1400, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 63, prevues: 100, unite: 'km' },
      cler: { fonctionnels: 5, total: 7 },
      marches: { construits: 3, prevus: 5 },
    },
    indicateurs: {
      iodp1: { actuel: 20, cible: 30, trend: 2.8 },
      iodp2: { actuel: 35, cible: 40, trend: 4.5 },
      iodp3: { actuel: 72, cible: 100, trend: 5.5 },
    },
    risques: { critiques: 2, eleves: 4, moderes: 2, faibles: 3 },
    plaintes: { total: 22, traitees: 14, en_cours: 8, vbg: 5 },
    dernier_suivi: '2026-03-26',
  },
  {
    id: 'hautlomami',
    name: 'Haut-Lomami',
    code: 'HL',
    region: 'Est',
    population: 4000000,
    beneficiaires: { total: 11240, femmes: 5058, hommes: 6182, jeunes: 3120, cible: 15000 },
    production: {
      maïs: { actuel: 980, cible: 1500, unite: 'tonnes' },
      manioc: { actuel: 720, cible: 1200, unite: 'tonnes' },
      arachide: { actuel: 380, cible: 600, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 34, prevues: 60, unite: 'km' },
      cler: { fonctionnels: 2, total: 4 },
      marches: { construits: 1, prevus: 3 },
    },
    indicateurs: {
      iodp1: { actuel: 14, cible: 30, trend: 1.8 },
      iodp2: { actuel: 22, cible: 40, trend: 2.8 },
      iodp3: { actuel: 58, cible: 100, trend: 4.2 },
    },
    risques: { critiques: 0, eleves: 2, moderes: 4, faibles: 5 },
    plaintes: { total: 6, traitees: 5, en_cours: 1, vbg: 0 },
    dernier_suivi: '2026-03-25',
  },
  {
    id: 'tanganyika',
    name: 'Tanganyika',
    code: 'TN',
    region: 'Est',
    population: 3500000,
    beneficiaires: { total: 9800, femmes: 4410, hommes: 5390, jeunes: 2750, cible: 12000 },
    production: {
      maïs: { actuel: 720, cible: 1200, unite: 'tonnes' },
      manioc: { actuel: 580, cible: 1000, unite: 'tonnes' },
      arachide: { actuel: 290, cible: 500, unite: 'tonnes' },
    },
    infrastructures: {
      routes: { rehabilitees: 28, prevues: 50, unite: 'km' },
      cler: { fonctionnels: 2, total: 4 },
      marches: { construits: 1, prevus: 2 },
    },
    indicateurs: {
      iodp1: { actuel: 12, cible: 30, trend: 1.5 },
      iodp2: { actuel: 20, cible: 40, trend: 2.5 },
      iodp3: { actuel: 55, cible: 100, trend: 4.0 },
    },
    risques: { critiques: 0, eleves: 1, moderes: 3, faibles: 6 },
    plaintes: { total: 4, traitees: 3, en_cours: 1, vbg: 0 },
    dernier_suivi: '2026-03-24',
  },
];

const mockClassement: ClassementProvincial[] = [
  { province: 'Kongo Central', score: 85, rang: 1, progression: 12 },
  { province: 'Kasaï', score: 82, rang: 2, progression: 8 },
  { province: 'Kinshasa', score: 78, rang: 3, progression: 5 },
  { province: 'Kwilu', score: 72, rang: 4, progression: 3 },
  { province: 'Haut-Lomami', score: 65, rang: 5, progression: -2 },
  { province: 'Tanganyika', score: 58, rang: 6, progression: -4 },
];

const mockEvolution: PerformanceEvolution[] = [
  { mois: 'Jan', beneficiaires: 8500, production: 3200, routes: 45 },
  { mois: 'Fév', beneficiaires: 9800, production: 3800, routes: 58 },
  { mois: 'Mar', beneficiaires: 11200, production: 4200, routes: 72 },
  { mois: 'Avr', beneficiaires: 12800, production: 4800, routes: 85 },
  { mois: 'Mai', beneficiaires: 14200, production: 5200, routes: 95 },
  { mois: 'Juin', beneficiaires: 15230, production: 5800, routes: 110 },
];

export const ProvincialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [classement, setClassement] = useState<ClassementProvincial[]>([]);
  const [evolution, setEvolution] = useState<PerformanceEvolution[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (provinces.length > 0 && !selectedProvince) {
      setSelectedProvince(provinces[0]);
    }
  }, [provinces, selectedProvince]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [provincesRes, classementRes] = await Promise.all([
        provincialService.getAllProvinces(),
        provincialService.getClassement(),
      ]);
      const loadedProvinces = provincesRes.data?.length ? provincesRes.data : mockProvinces;
      const loadedClassement = classementRes.data?.length ? classementRes.data : mockClassement;
      setProvinces(loadedProvinces);
      setClassement(loadedClassement);
      setEvolution(mockEvolution);
    } catch (err) {
      // Fallback sur les données mock si l'API n'est pas encore disponible
      setProvinces(mockProvinces);
      setClassement(mockClassement);
      setEvolution(mockEvolution);
      console.warn('API provinces non disponible, utilisation des données mock:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProvinceSelect = (province: any) => {
    const found = provinces.find(p => p.name === province.name);
    if (found) {
      setSelectedProvince(found);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedProvince) return;
    
    setExporting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnchorEl(null);
      alert(`Export ${format.toUpperCase()} de ${selectedProvince.name} démarré`);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
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

  const evolutionChartData = evolution.map(({ mois, ...rest }) => ({
    name: mois,
    ...rest,
  }));
  const selectedClassement = classement.find(c => c.province === selectedProvince?.name);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Tableau de bord provincial
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Suivi des performances par province du Programme National de Développement Agricole
      </Typography>

      {/* Sélecteur de province et export */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {provinces.map((province) => (
                <Chip
                  key={province.id}
                  label={province.name}
                  onClick={() => setSelectedProvince(province)}
                  color={selectedProvince?.id === province.id ? 'primary' : 'default'}
                  sx={{
                    bgcolor: selectedProvince?.id === province.id ? '#2E7D32' : undefined,
                    color: selectedProvince?.id === province.id ? 'white' : undefined,
                    '&:hover': { bgcolor: selectedProvince?.id === province.id ? '#1B5E20' : undefined },
                  }}
                />
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
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
          </Grid>
        </Grid>
      </Paper>

      {selectedProvince && (
        <>
          {/* En-tête de la province */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2, bgcolor: '#F1F8E9' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h5" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GoogleIcon name="location_city" size={32} sx={{ color: '#2E7D32' }} />
                  {selectedProvince.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Dernier suivi: {new Date(selectedProvince.dernier_suivi).toLocaleDateString()}
                </Typography>
              </Box>
              <Chip 
                label={`Score de performance: ${classement.find(c => c.province === selectedProvince.name)?.score || 0}%`}
                sx={{ 
                  bgcolor: '#2E7D32', 
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '1rem',
                  py: 2,
                }}
              />
            </Stack>
          </Paper>

          {/* Widgets KPI */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                title="Bénéficiaires"
                value={selectedProvince.beneficiaires.total.toLocaleString()}
                icon={<GoogleIcon name="groups" size={32} />}
                trend={{ value: 12, direction: 'up', period: 'vs cible' }}
                color="primary"
                onClick={() => navigate('/beneficiaires/rna')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                title="Femmes bénéficiaires"
                value={selectedProvince.beneficiaires.femmes.toLocaleString()}
                icon={<GoogleIcon name="female" size={32} />}
                trend={{ value: Math.round((selectedProvince.beneficiaires.femmes / selectedProvince.beneficiaires.total) * 100), direction: 'up', period: '% du total' }}
                color="success"
                onClick={() => navigate('/beneficiaires/rna')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                title="Routes réhabilitées"
                value={`${selectedProvince.infrastructures.routes.rehabilitees} km`}
                icon={<GoogleIcon name="road" size={32} />}
                trend={{ value: Math.round((selectedProvince.infrastructures.routes.rehabilitees / selectedProvince.infrastructures.routes.prevues) * 100), direction: 'up', period: 'de la cible' }}
                color="info"
                onClick={() => { setTabValue(1); }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                title="Taux de réalisation"
                value={`${Math.round((selectedProvince.beneficiaires.total / selectedProvince.beneficiaires.cible) * 100)}%`}
                icon={<GoogleIcon name="target" size={32} />}
                color="warning"
                onClick={() => navigate('/indicateurs/ir')}
              />
            </Grid>
          </Grid>

          {/* Carte et indicateurs */}
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GoogleIcon name="map" size={24} />
                  Carte de la province
                </Typography>
                <ProvinceMap 
                  provinces={provinces}
                  onProvinceSelect={handleProvinceSelect}
                  selectedProvince={selectedProvince.id}
                  height={400}
                />
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GoogleIcon name="bar_chart" size={24} />
                  Indicateurs de performance
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">IODP1 - Accès au marché</Typography>
                      <Typography variant="caption" fontWeight={500}>{selectedProvince.indicateurs.iodp1.actuel}% / {selectedProvince.indicateurs.iodp1.cible}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedProvince.indicateurs.iodp1.actuel / selectedProvince.indicateurs.iodp1.cible) * 100}
                      sx={{ height: 8, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      ▲ {selectedProvince.indicateurs.iodp1.trend}% vs trimestre précédent
                    </Typography>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">IODP2 - Productivité agricole</Typography>
                      <Typography variant="caption" fontWeight={500}>{selectedProvince.indicateurs.iodp2.actuel}% / {selectedProvince.indicateurs.iodp2.cible}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedProvince.indicateurs.iodp2.actuel / selectedProvince.indicateurs.iodp2.cible) * 100}
                      sx={{ height: 8, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      ▲ {selectedProvince.indicateurs.iodp2.trend}% vs trimestre précédent
                    </Typography>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">IODP3 - Capacité publique</Typography>
                      <Typography variant="caption" fontWeight={500}>{selectedProvince.indicateurs.iodp3.actuel}% / {selectedProvince.indicateurs.iodp3.cible}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedProvince.indicateurs.iodp3.actuel / selectedProvince.indicateurs.iodp3.cible) * 100}
                      sx={{ height: 8, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      ▲ {selectedProvince.indicateurs.iodp3.trend}% vs trimestre précédent
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Onglets de détails */}
          <Paper sx={{ mt: 3, borderRadius: 2 }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Production agricole" icon={<GoogleIcon name="agriculture" size={18} />} iconPosition="start" />
              <Tab label="Infrastructures" icon={<GoogleIcon name="construction" size={18} />} iconPosition="start" />
              <Tab label="Risques & Plaintes" icon={<GoogleIcon name="warning" size={18} />} iconPosition="start" />
              <Tab label="Classement" icon={<GoogleIcon name="leaderboard" size={18} />} iconPosition="start" />
            </Tabs>

            {/* Onglet Production agricole */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Production par culture</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                        <TableRow>
                          <TableCell>Culture</TableCell>
                          <TableCell align="right">Actuel</TableCell>
                          <TableCell align="right">Cible</TableCell>
                          <TableCell align="right">Progression</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(selectedProvince.production).map(([key, value]) => (
                          <TableRow key={key}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GoogleIcon name={key === 'maïs' ? 'grass' : key === 'manioc' ? 'yard' : 'local_florist'} size={20} />
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{value.actuel.toLocaleString()} {value.unite}</TableCell>
                            <TableCell align="right">{value.cible.toLocaleString()} {value.unite}</TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={`${Math.round((value.actuel / value.cible) * 100)}%`}
                                size="small"
                                sx={{ bgcolor: (value.actuel / value.cible) >= 0.7 ? '#E8F5E9' : '#FFF3E0', color: (value.actuel / value.cible) >= 0.7 ? '#2E7D32' : '#FF8F00' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Évolution de la production</Typography>
                  <IndicatorChart
                    title=""
                    data={evolutionChartData}
                    lines={[
                      { key: 'production', name: 'Production (tonnes)', color: '#2E7D32' },
                    ]}
                    type="line"
                    unit="t"
                    height={250}
                    showToggle={false}
                  />
                </Grid>
              </Grid>
            </TabPanel>

            {/* Onglet Infrastructures */}
            <TabPanel value={tabValue} index={1}>
              <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Routes réhabilitées</Typography>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h2" fontWeight={700} color="primary.main">
                      {selectedProvince.infrastructures.routes.rehabilitees}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">km sur {selectedProvince.infrastructures.routes.prevues} km prévus</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedProvince.infrastructures.routes.rehabilitees / selectedProvince.infrastructures.routes.prevues) * 100}
                      sx={{ mt: 2, height: 10, borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>CLER et Marchés</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Card sx={{ textAlign: 'center', p: 2 }}>
                        <GoogleIcon name="groups" size={32} sx={{ color: '#2E7D32' }} />
                        <Typography variant="h4" fontWeight={700}>{selectedProvince.infrastructures.cler.fonctionnels}</Typography>
                        <Typography variant="caption" color="text.secondary">CLER fonctionnels / {selectedProvince.infrastructures.cler.total}</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Card sx={{ textAlign: 'center', p: 2 }}>
                        <GoogleIcon name="store" size={32} sx={{ color: '#2E7D32' }} />
                        <Typography variant="h4" fontWeight={700}>{selectedProvince.infrastructures.marches.construits}</Typography>
                        <Typography variant="caption" color="text.secondary">Marchés construits / {selectedProvince.infrastructures.marches.prevus}</Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Onglet Risques & Plaintes */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Matrice des risques</Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: '#FFEBEE' }}>
                        <Typography variant="h5" fontWeight={700} color="error.main">{selectedProvince.risques.critiques}</Typography>
                        <Typography variant="caption">Critiques</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: '#FFF3E0' }}>
                        <Typography variant="h5" fontWeight={700} color="warning.main">{selectedProvince.risques.eleves}</Typography>
                        <Typography variant="caption">Élevés</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: '#FFF8E1' }}>
                        <Typography variant="h5" fontWeight={700} color="#F9A825">{selectedProvince.risques.moderes}</Typography>
                        <Typography variant="caption">Modérés</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: '#E8F5E9' }}>
                        <Typography variant="h5" fontWeight={700} color="success.main">{selectedProvince.risques.faibles}</Typography>
                        <Typography variant="caption">Faibles</Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Gestion des plaintes GRM</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>Total plaintes</TableCell>
                          <TableCell align="right"><strong>{selectedProvince.plaintes.total}</strong></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Plaintes traitées</TableCell>
                          <TableCell align="right" sx={{ color: '#2E7D32' }}>{selectedProvince.plaintes.traitees}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>En cours</TableCell>
                          <TableCell align="right" sx={{ color: '#FF8F00' }}>{selectedProvince.plaintes.en_cours}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Cas VBG/EAS/HS</TableCell>
                          <TableCell align="right" sx={{ color: '#D32F2F' }}>{selectedProvince.plaintes.vbg}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Onglet Classement */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Classement des provinces</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                        <TableRow>
                          <TableCell>Rang</TableCell>
                          <TableCell>Province</TableCell>
                          <TableCell align="right">Score</TableCell>
                          <TableCell align="right">Progression</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {classement.map((item) => (
                          <TableRow key={item.province} sx={{ bgcolor: selectedProvince.name === item.province ? '#F1F8E9' : 'inherit' }}>
                            <TableCell>
                              {item.rang === 1 && <GoogleIcon name="emoji_events" size={20} sx={{ color: '#FFD700' }} />}
                              {item.rang === 2 && <GoogleIcon name="emoji_events" size={20} sx={{ color: '#C0C0C0' }} />}
                              {item.rang === 3 && <GoogleIcon name="emoji_events" size={20} sx={{ color: '#CD7F32' }} />}
                              {item.rang > 3 && item.rang}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {item.province}
                                {selectedProvince.name === item.province && <Chip label="Sélectionné" size="small" sx={{ bgcolor: '#2E7D32', color: 'white', height: 20 }} />}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <strong>{item.score}%</strong>
                            </TableCell>
                            <TableCell align="right">
                              <Chip 
                                icon={(item.progression ?? 0) >= 0 ? <GoogleIcon name="trending_up" size={14} /> : <GoogleIcon name="trending_down" size={14} />}
                                label={`${(item.progression ?? 0) >= 0 ? '+' : ''}${item.progression ?? 0}%`}
                                size="small"
                                sx={{ bgcolor: (item.progression ?? 0) >= 0 ? '#E8F5E9' : '#FFEBEE', color: (item.progression ?? 0) >= 0 ? '#2E7D32' : '#D32F2F' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Card sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>Position de {selectedProvince.name}</Typography>
                    <Typography variant="h2" fontWeight={700} color="primary.main">
                      #{selectedClassement?.rang || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      sur {classement.length} provinces
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" justifyContent="space-around">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Score</Typography>
                        <Typography variant="h6">{selectedClassement?.score ?? 0}%</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Progression</Typography>
                        <Typography variant="h6" color={(selectedClassement?.progression ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                          {(selectedClassement?.progression ?? 0) >= 0 ? '+' : ''}
                          {selectedClassement?.progression ?? 0}%
                        </Typography>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default ProvincialDashboard;