// frontend/src/pages/Dashboard/ProvincialDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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
import type { ProvinceData, PerformanceEvolution } from '../../services/provincial.service';
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

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string } | undefined;
    return responseData?.message || error.message || fallback;
  }

  return fallback;
};

export function ProvincialDashboard() {
  const navigate = useNavigate();
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<ProvinceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [evolution, setEvolution] = useState<PerformanceEvolution[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provincesRes = await provincialService.getAllProvinces();
      const loadedProvinces = provincesRes.data ?? [];

      setProvinces(loadedProvinces);
      setSelectedProvince((currentSelection) => {
        if (!loadedProvinces.length) {
          return null;
        }

        if (!currentSelection) {
          return loadedProvinces[0];
        }

        return loadedProvinces.find((province) => province.id === currentSelection.id) ?? loadedProvinces[0];
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Erreur lors du chargement des données provinciales'));
      setProvinces([]);
      setEvolution([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedProvince) {
      setEvolution([]);
      return;
    }

    const loadEvolution = async () => {
      try {
        const response = await provincialService.getPerformanceEvolution(selectedProvince.id);
        setEvolution(response.data ?? []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Erreur lors du chargement de l\'évolution provinciale'));
        setEvolution([]);
      }
    };

    void loadEvolution();
  }, [selectedProvince]);

  const handleProvinceSelect = (province: { name: string }) => {
    const found = provinces.find(p => p.name === province.name);
    if (found) {
      setSelectedProvince(found);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!selectedProvince) return;
    
    setExporting(true);
    try {
      const response = await provincialService.exportProvinceData(selectedProvince.id);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `province-${selectedProvince.id}.${format === 'pdf' ? 'pdf' : 'json'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setAnchorEl(null);
    } catch (err) {
      setError(getApiErrorMessage(err, `Erreur lors de l'export ${format.toUpperCase()}`));
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
  const comparaison = provinces.map((province) => {
    const total = province.beneficiaires.total;
    const femmes = province.beneficiaires.femmes;
    const jeunes = province.beneficiaires.jeunes;
    return {
      id: province.id,
      name: province.name,
      total,
      femmes,
      jeunes,
      femmesPct: total > 0 ? Math.round((femmes / total) * 100) : 0,
      jeunesPct: total > 0 ? Math.round((jeunes / total) * 100) : 0,
    };
  });
  const comparaisonTaux = comparaison.map((ligne) => ({
    name: ligne.name,
    femmes: ligne.femmesPct,
    jeunes: ligne.jeunesPct,
  }));
  const comparaisonVolumes = comparaison.map((ligne) => ({
    name: ligne.name,
    beneficiaires: ligne.total,
  }));
  const classementRna = [...comparaison]
    .sort((a, b) => b.femmesPct - a.femmesPct || b.total - a.total)
    .map((ligne, index) => ({ ...ligne, rang: index + 1 }));
  const selectedRang = classementRna.find((ligne) => ligne.id === selectedProvince?.id);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Tableau de bord provincial
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Comparaison RNA province par province (bénéficiaires, part des femmes, part des jeunes).
        Les taux d’exécution PTBA et cadre ne sont pas disponibles à cette échelle.
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

      {comparaison.length > 0 && (
        <Paper sx={{ p: 2.25, mb: 3, borderRadius: 2.1 }}>
          <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 600 }}>
            Comparaison par province
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Taux calculés sur le registre RNA réel. Cliquez une ligne pour ouvrir le détail.
          </Typography>
          <TableContainer sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Province</TableCell>
                  <TableCell align="right">Bénéficiaires</TableCell>
                  <TableCell align="right">Femmes</TableCell>
                  <TableCell align="right">Part femmes</TableCell>
                  <TableCell align="right">Jeunes</TableCell>
                  <TableCell align="right">Part jeunes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {comparaison.map((ligne) => {
                  const selectionnee = selectedProvince?.id === ligne.id;
                  return (
                    <TableRow
                      key={ligne.id}
                      hover
                      onClick={() => {
                        const found = provinces.find((p) => p.id === ligne.id);
                        if (found) setSelectedProvince(found);
                      }}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectionnee ? 'action.selected' : undefined,
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={selectionnee ? 700 : 500}>
                          {ligne.name}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {ligne.total.toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {ligne.femmes.toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${ligne.femmesPct}%`}
                          color={ligne.femmesPct >= 50 ? 'success' : 'warning'}
                          sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {ligne.jeunes.toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${ligne.jeunesPct}%`}
                          color={ligne.jeunesPct >= 30 ? 'success' : 'warning'}
                          sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <IndicatorChart
                title="Part des femmes et des jeunes"
                data={comparaisonTaux}
                lines={[
                  { key: 'femmes', name: 'Femmes', color: '#2E7D32' },
                  { key: 'jeunes', name: 'Jeunes', color: '#3987E5' },
                ]}
                type="bar"
                unit="%"
                height={280}
                showToggle={false}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <IndicatorChart
                title="Bénéficiaires RNA"
                data={comparaisonVolumes}
                lines={[{ key: 'beneficiaires', name: 'Bénéficiaires', color: '#F5A623' }]}
                type="bar"
                unit=""
                height={280}
                showToggle={false}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {selectedProvince && (
        <>
          <Paper sx={{ p: 2.25, mb: 3, borderRadius: 2.1 }}>
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
                label={`Part des femmes: ${selectedProvince.beneficiaires.total > 0 ? Math.round((selectedProvince.beneficiaires.femmes / selectedProvince.beneficiaires.total) * 100) : 0}%`}
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
                value={selectedProvince.beneficiaires.total.toLocaleString('fr-FR')}
                icon={<GoogleIcon name="groups" size={32} />}
                detail="Effectif RNA de la province"
                color="primary"
                onClick={() => navigate('/beneficiaires/rna')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                title="Femmes bénéficiaires"
                value={selectedProvince.beneficiaires.femmes.toLocaleString('fr-FR')}
                icon={<GoogleIcon name="female" size={32} />}
                trend={{ value: selectedProvince.beneficiaires.total > 0 ? Math.round((selectedProvince.beneficiaires.femmes / selectedProvince.beneficiaires.total) * 100) : 0, direction: 'up', period: '% du total' }}
                color="success"
                onClick={() => navigate('/beneficiaires/rna')}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                title="Territoires couverts"
                value={selectedProvince.infrastructures.routes.rehabilitees}
                icon={<GoogleIcon name="road" size={32} />}
                detail="Territoires avec au moins un enregistrement RNA"
                color="info"
                onClick={() => { setTabValue(1); }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <GradientWidget
                title="Part des jeunes"
                value={`${selectedProvince.beneficiaires.total > 0 ? Math.round((selectedProvince.beneficiaires.jeunes / selectedProvince.beneficiaires.total) * 100) : 0}%`}
                icon={<GoogleIcon name="groups" size={32} />}
                detail={`${selectedProvince.beneficiaires.jeunes.toLocaleString('fr-FR')} jeunes RNA`}
                color="warning"
                onClick={() => navigate('/beneficiaires/rna')}
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
                  Indicateurs RNA
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">Part des femmes</Typography>
                      <Typography variant="caption" fontWeight={500}>{selectedProvince.indicateurs.iodp2.actuel}% / {selectedProvince.indicateurs.iodp2.cible}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedProvince.indicateurs.iodp2.actuel / selectedProvince.indicateurs.iodp2.cible) * 100}
                      sx={{ height: 8, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      Répartition observée dans le RNA provincial
                    </Typography>
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">Part des jeunes</Typography>
                      <Typography variant="caption" fontWeight={500}>{selectedProvince.indicateurs.iodp3.actuel}% / {selectedProvince.indicateurs.iodp3.cible}%</Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={(selectedProvince.indicateurs.iodp3.actuel / selectedProvince.indicateurs.iodp3.cible) * 100}
                      sx={{ height: 8, borderRadius: 2 }}
                    />
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                      Répartition observée dans le RNA provincial
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          {/* Onglets de détails */}
          <Paper sx={{ mt: 3, borderRadius: 2 }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
              <Tab label="Profils culturaux" icon={<GoogleIcon name="agriculture" size={18} />} iconPosition="start" />
              <Tab label="Couverture territoriale" icon={<GoogleIcon name="construction" size={18} />} iconPosition="start" />
              <Tab label="Suivi RNA" icon={<GoogleIcon name="warning" size={18} />} iconPosition="start" />
              <Tab label="Classement" icon={<GoogleIcon name="leaderboard" size={18} />} iconPosition="start" />
            </Tabs>

            {/* Onglet Production agricole */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3} sx={{ p: 3 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Profils culturaux déclarés</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
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
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Évolution des enregistrements RNA</Typography>
                  <IndicatorChart
                    title=""
                    data={evolutionChartData}
                    lines={[
                      { key: 'beneficiaires', name: 'Bénéficiaires RNA', color: '#2E7D32' },
                    ]}
                    type="line"
                    unit="pers."
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
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Territoires couverts</Typography>
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h2" fontWeight={700} color="primary.main">
                      {selectedProvince.infrastructures.routes.rehabilitees}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">territoires suivis</Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={selectedProvince.infrastructures.routes.prevues > 0 ? (selectedProvince.infrastructures.routes.rehabilitees / selectedProvince.infrastructures.routes.prevues) * 100 : 0}
                      sx={{ mt: 2, height: 10, borderRadius: 2 }}
                    />
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Secteurs et groupements couverts</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Card sx={{ textAlign: 'center', p: 2 }}>
                        <GoogleIcon name="groups" size={32} sx={{ color: '#2E7D32' }} />
                        <Typography variant="h4" fontWeight={700}>{selectedProvince.infrastructures.cler.fonctionnels}</Typography>
                        <Typography variant="caption" color="text.secondary">Secteurs avec bénéficiaires</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Card sx={{ textAlign: 'center', p: 2 }}>
                        <GoogleIcon name="store" size={32} sx={{ color: '#2E7D32' }} />
                        <Typography variant="h4" fontWeight={700}>{selectedProvince.infrastructures.marches.construits}</Typography>
                        <Typography variant="caption" color="text.secondary">Groupements identifiés</Typography>
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
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Répartition des bénéficiaires</Typography>
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(208, 59, 59, 0.14)' }}>
                        <Typography variant="h5" fontWeight={700} color="error.main">{selectedProvince.beneficiaires.total}</Typography>
                        <Typography variant="caption">Total</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(250, 178, 25, 0.14)' }}>
                        <Typography variant="h5" fontWeight={700} color="warning.main">{selectedProvince.beneficiaires.femmes}</Typography>
                        <Typography variant="caption">Femmes</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(250, 178, 25, 0.14)' }}>
                        <Typography variant="h5" fontWeight={700} color="#F9A825">{selectedProvince.beneficiaires.hommes}</Typography>
                        <Typography variant="caption">Hommes</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 3 }}>
                      <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover' }}>
                        <Typography variant="h5" fontWeight={700} color="success.main">{selectedProvince.beneficiaires.jeunes}</Typography>
                        <Typography variant="caption">Jeunes</Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Dernier suivi RNA</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>Province</TableCell>
                          <TableCell align="right"><strong>{selectedProvince.name}</strong></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Code</TableCell>
                          <TableCell align="right" sx={{ color: '#2E7D32' }}>{selectedProvince.code}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Région</TableCell>
                          <TableCell align="right" sx={{ color: '#FF8F00' }}>{selectedProvince.region}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Dernière mise à jour</TableCell>
                          <TableCell align="right" sx={{ color: '#D32F2F' }}>{new Date(selectedProvince.dernier_suivi).toLocaleDateString()}</TableCell>
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
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>Classement RNA — part des femmes</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead sx={{ bgcolor: 'action.hover' }}>
                        <TableRow>
                          <TableCell>Rang</TableCell>
                          <TableCell>Province</TableCell>
                          <TableCell align="right">Part femmes</TableCell>
                          <TableCell align="right">Bénéficiaires</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {classementRna.map((item) => (
                          <TableRow key={item.id} sx={{ bgcolor: selectedProvince.name === item.name ? 'action.selected' : 'inherit' }}>
                            <TableCell>
                              {item.rang === 1 && <GoogleIcon name="emoji_events" size={20} sx={{ color: '#FFD700' }} />}
                              {item.rang === 2 && <GoogleIcon name="emoji_events" size={20} sx={{ color: '#C0C0C0' }} />}
                              {item.rang === 3 && <GoogleIcon name="emoji_events" size={20} sx={{ color: '#CD7F32' }} />}
                              {item.rang > 3 && item.rang}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {item.name}
                                {selectedProvince.name === item.name && <Chip label="Sélectionné" size="small" sx={{ bgcolor: '#2E7D32', color: 'white', height: 20 }} />}
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <strong>{item.femmesPct}%</strong>
                            </TableCell>
                            <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                              {item.total.toLocaleString('fr-FR')}
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
                      #{selectedRang?.rang || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      sur {classementRna.length} provinces (part des femmes)
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Stack direction="row" justifyContent="space-around">
                      <Box>
                        <Typography variant="caption" color="text.secondary">Femmes</Typography>
                        <Typography variant="h6">{selectedRang?.femmesPct ?? 0}%</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Jeunes</Typography>
                        <Typography variant="h6">
                          {selectedRang?.jeunesPct ?? 0}%
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
}

export default ProvincialDashboard;