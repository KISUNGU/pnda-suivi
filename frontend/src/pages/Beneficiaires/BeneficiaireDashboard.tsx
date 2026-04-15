// frontend/src/pages/Beneficiaires/BeneficiaireDashboard.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  TablePagination,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import beneficiaireService, {
  type BeneficiaireFilters,
  type AdvancedStats,
  type PtechStats,
  type CartesVentesStats,
  type FilterOptions,
} from '../../services/beneficiaire.service';

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

const typesActivite = [
  { label: 'Agriculture', icon: 'agriculture', color: '#2E7D32' },
  { label: 'Elevage', icon: 'pets', color: '#1976D2' },
  { label: 'Aquapisciculture', icon: 'waves', color: '#00ACC1' },
];

export const BeneficiaireDashboard: React.FC = () => {
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Données
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
  const [ptechStats, setPtechStats] = useState<PtechStats | null>(null);
  const [cartesVentesStats, setCartesVentesStats] = useState<CartesVentesStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  
  // Filtres
  const [filters, setFilters] = useState<BeneficiaireFilters>({
    saison: '',
    province: '',
    territoire: '',
    secteur: '',
    groupement: '',
    village: '',
    ptech: '',
  });
  
  // Pagination pour les tableaux
  const [villagePage, setVillagePage] = useState(0);
  const [villageRowsPerPage, setVillageRowsPerPage] = useState(5);
  const [fournisseurPage, setFournisseurPage] = useState(0);
  const [fournisseurRowsPerPage, setFournisseurRowsPerPage] = useState(5);

  // Chargement des données
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [advancedRes, ptechRes, cartesRes, filtersRes] = await Promise.all([
        beneficiaireService.getAdvancedStats(filters),
        beneficiaireService.getPtechStats(filters),
        beneficiaireService.getCartesVentesStats(filters),
        beneficiaireService.getFilterOptions(),
      ]);
      
      setAdvancedStats(advancedRes.data);
      setPtechStats(ptechRes.data);
      setCartesVentesStats(cartesRes.data);
      setFilterOptions(filtersRes.data);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Impossible de charger les données des bénéficiaires');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fonctions d'export
  const handleExportStats = async () => {
    try {
      const response = await beneficiaireService.exportStats('excel', filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statistiques_beneficiaires_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export stats:', err);
      setError('Erreur lors de l\'export des statistiques');
    }
  };

  const handleExportBeneficiaires = async () => {
    try {
      const response = await beneficiaireService.exportBeneficiaires('excel', filters);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `beneficiaires_detail_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erreur export bénéficiaires:', err);
      setError('Erreur lors de l\'export des bénéficiaires');
    }
  };

  // Mise à jour des filtres
  const handleFilterChange = (key: keyof BeneficiaireFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === '' ? undefined : value }));
    // Réinitialiser les filtres dépendants
    if (key === 'province') {
      setFilters(prev => ({ ...prev, territoire: undefined, secteur: undefined, groupement: undefined, village: undefined }));
    }
    if (key === 'territoire') {
      setFilters(prev => ({ ...prev, secteur: undefined, groupement: undefined, village: undefined }));
    }
    if (key === 'secteur') {
      setFilters(prev => ({ ...prev, groupement: undefined, village: undefined }));
    }
    if (key === 'groupement') {
      setFilters(prev => ({ ...prev, village: undefined }));
    }
  };

  const resetFilters = () => {
    setFilters({
      saison: '',
      province: '',
      territoire: '',
      secteur: '',
      groupement: '',
      village: '',
      ptech: '',
    });
  };

  // Composant de filtre
  const FilterPanel = () => (
    <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          <GoogleIcon name="filter_alt" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filtres
        </Typography>
        <Button size="small" onClick={resetFilters} startIcon={<GoogleIcon name="refresh" size={16} />}>
          Réinitialiser
        </Button>
      </Stack>
      
      <Grid container spacing={2}>
        {/* Saison */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Saison</InputLabel>
            <Select
              value={filters.saison || ''}
              label="Saison"
              onChange={(e) => handleFilterChange('saison', e.target.value)}
            >
              <MenuItem value="">Toutes</MenuItem>
              {filterOptions?.saisons?.map((s) => (
                <MenuItem key={s.saison} value={s.saison}>{s.saison}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Province */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Province</InputLabel>
            <Select
              value={filters.province || ''}
              label="Province"
              onChange={(e) => handleFilterChange('province', e.target.value)}
            >
              <MenuItem value="">Toutes</MenuItem>
              {filterOptions?.provinces?.map((p) => (
                <MenuItem key={p.province} value={p.province}>{p.province}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Territoire */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small" disabled={!filters.province}>
            <InputLabel>Territoire</InputLabel>
            <Select
              value={filters.territoire || ''}
              label="Territoire"
              onChange={(e) => handleFilterChange('territoire', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {filterOptions?.territoires
                ?.filter(t => !filters.province || t.province === filters.province)
                .map((t) => (
                  <MenuItem key={t.territoire} value={t.territoire}>{t.territoire}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Secteur/Chefferie */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small" disabled={!filters.territoire}>
            <InputLabel>Secteur/Chefferie</InputLabel>
            <Select
              value={filters.secteur || ''}
              label="Secteur/Chefferie"
              onChange={(e) => handleFilterChange('secteur', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {filterOptions?.secteurs
                ?.filter(s => (!filters.province || s.province === filters.province) && 
                              (!filters.territoire || s.territoire === filters.territoire))
                .map((s) => (
                  <MenuItem key={s.secteur} value={s.secteur}>{s.secteur}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Groupement */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small" disabled={!filters.secteur}>
            <InputLabel>Groupement</InputLabel>
            <Select
              value={filters.groupement || ''}
              label="Groupement"
              onChange={(e) => handleFilterChange('groupement', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {filterOptions?.groupements
                ?.filter(g => (!filters.province || g.province === filters.province) &&
                              (!filters.territoire || g.territoire === filters.territoire) &&
                              (!filters.secteur || g.secteur === filters.secteur))
                .map((g) => (
                  <MenuItem key={g.groupement} value={g.groupement}>{g.groupement}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Village */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small" disabled={!filters.groupement}>
            <InputLabel>Village</InputLabel>
            <Select
              value={filters.village || ''}
              label="Village"
              onChange={(e) => handleFilterChange('village', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {filterOptions?.villages
                ?.filter(v => (!filters.province || v.province === filters.province) &&
                              (!filters.territoire || v.territoire === filters.territoire) &&
                              (!filters.secteur || v.secteur === filters.secteur) &&
                              (!filters.groupement || v.groupement === filters.groupement))
                .map((v) => (
                  <MenuItem key={v.village} value={v.village}>{v.village}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* Paquet technique */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>Paquet technique</InputLabel>
            <Select
              value={filters.ptech || ''}
              label="Paquet technique"
              onChange={(e) => handleFilterChange('ptech', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {filterOptions?.ptechs?.map((p) => (
                <MenuItem key={p.ptech} value={p.ptech}>{p.ptech}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Paper>
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  const stats = advancedStats?.stats;

  return (
    <Box>
      {/* Header avec boutons d'export */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Bénéficiaires
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Suivi des producteurs agricoles, distribution des cartes et ventes de semences
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<GoogleIcon name="download" size={18} />}
            onClick={handleExportStats}
            size="medium"
          >
            Exporter les stats
          </Button>
          <Button
            variant="contained"
            startIcon={<GoogleIcon name="list_alt" size={18} />}
            onClick={handleExportBeneficiaires}
            size="medium"
            sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
          >
            Exporter la liste
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Filtres */}
      <FilterPanel />

      {/* ============================================ */}
      {/* SECTION A.1 - WIDGETS PRINCIPAUX */}
      {/* ============================================ */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        <GoogleIcon name="dashboard" size={22} sx={{ mr: 1, verticalAlign: 'middle' }} />
        Vue d'ensemble
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <GradientWidget
            title="Producteurs"
            value={stats?.total_producteurs?.toLocaleString('fr-FR') || '0'}
            icon={<GoogleIcon name="agriculture" size={36} />}
            trend={{ value: stats?.total_producteurs || 0, direction: 'up', period: 'producteurs enregistrés' }}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <GradientWidget
            title="% Productrices"
            value={stats?.total_producteurs ? `${Math.round((stats.total_femmes / stats.total_producteurs) * 100)}%` : '0%'}
            icon={<GoogleIcon name="female" size={36} />}
            trend={{ value: stats?.total_femmes || 0, direction: 'up', period: 'femmes productrices' }}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <GradientWidget
            title="Âge moyen"
            value={`${Math.round(stats?.age_moyen || 0)} ans`}
            icon={<GoogleIcon name="calendar_month" size={36} />}
            trend={{ value: stats?.age_moyen || 0, direction: 'up', period: 'moyenne d\'âge' }}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <GradientWidget
            title="Chefs de ménage"
            value={stats?.chefs_menage?.toLocaleString('fr-FR') || '0'}
            icon={<GoogleIcon name="home" size={36} />}
            trend={{ value: stats?.chefs_menage || 0, direction: 'up', period: 'chefs de ménage' }}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <GradientWidget
            title="Membres déjà enregistrés"
            value={stats?.membres_deja_enregistres?.toLocaleString('fr-FR') || '0'}
            icon={<GoogleIcon name="group" size={36} />}
            trend={{ value: stats?.membres_deja_enregistres || 0, direction: 'up', period: 'ayant un membre dans le programme' }}
            color="success"
          />
        </Grid>
      </Grid>

      {/* Onglets principaux */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="Enregistrement" icon={<GoogleIcon name="person_add" size={18} />} iconPosition="start" />
          <Tab label="Paquets Techniques" icon={<GoogleIcon name="inventory_2" size={18} />} iconPosition="start" />
          <Tab label="Cartes & Semences" icon={<GoogleIcon name="credit_card" size={18} />} iconPosition="start" />
        </Tabs>

        {/* ============================================ */}
        {/* ONGLET A - ENREGISTREMENT */}
        {/* ============================================ */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              {/* Distribution par âge */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="timeline" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Répartition par âge
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {advancedStats?.age_distribution?.map((item) => {
                        const total = stats?.total_producteurs || 1;
                        const percent = (item.nombre / total) * 100;
                        return (
                          <Box key={item.tranche_age} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">{item.tranche_age}</Typography>
                              <Typography variant="caption" fontWeight={600}>{percent.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Distribution par statut matrimonial */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="favorite" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Situation matrimoniale
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {advancedStats?.matrimonial_distribution?.map((item) => {
                        const total = stats?.total_producteurs || 1;
                        const percent = (item.nombre / total) * 100;
                        return (
                          <Box key={item.situation} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">{item.situation}</Typography>
                              <Typography variant="caption" fontWeight={600}>{percent.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Niveau d'éducation */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="school" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Niveau d'éducation
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {advancedStats?.education_distribution?.map((item) => {
                        const total = stats?.total_producteurs || 1;
                        const percent = (item.nombre / total) * 100;
                        return (
                          <Box key={item.niveau} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">{item.niveau}</Typography>
                              <Typography variant="caption" fontWeight={600}>{percent.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Type d'activité */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="work" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Type d'activité pratiquée
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {advancedStats?.activite_distribution?.map((item) => {
                        const total = stats?.total_producteurs || 1;
                        const percent = (item.nombre / total) * 100;
                        const typeInfo = typesActivite.find(t => t.label === item.type_activite);
                        return (
                          <Box key={item.type_activite} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GoogleIcon 
                                  name={typeInfo?.icon || 'agriculture'} 
                                  size={16} 
                                  sx={{ color: typeInfo?.color }} 
                                />
                                <Typography variant="caption">{item.type_activite}</Typography>
                              </Box>
                              <Typography variant="caption" fontWeight={600}>{percent.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Accès aux terres cultivables */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="terrain" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Accès aux terres cultivables
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {advancedStats?.superficie_distribution?.map((item) => {
                        const total = stats?.total_producteurs || 1;
                        const percent = (item.nombre / total) * 100;
                        return (
                          <Box key={item.tranche_superficie} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption">{item.tranche_superficie}</Typography>
                              <Typography variant="caption" fontWeight={600}>{percent.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top 5 cultures */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="grass" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Cinq cultures les plus importantes
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {advancedStats?.top_cultures?.map((item, idx) => {
                        const total = stats?.total_producteurs || 1;
                        const percent = (item.nombre / total) * 100;
                        return (
                          <Box key={item.nom} sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip label={`#${idx + 1}`} size="small" sx={{ minWidth: 32 }} />
                                <Typography variant="caption">{item.nom}</Typography>
                              </Box>
                              <Typography variant="caption" fontWeight={600}>{percent.toFixed(1)}%</Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={percent}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* ============================================ */}
        {/* ONGLET B - PAQUETS TECHNIQUES */}
        {/* ============================================ */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            {/* Widgets */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <GradientWidget
                  title="Producteurs ayant sélectionné un pTech"
                  value={cartesVentesStats?.widgets?.producteurs_avec_ptech?.toLocaleString('fr-FR') || '0'}
                  icon={<GoogleIcon name="inventory_2" size={36} />}
                  trend={{ value: ptechStats?.total_ptech_selectionnes || 0, direction: 'up', period: 'sélections totales' }}
                  color="primary"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <GradientWidget
                  title="Producteurs ayant reçu une carte"
                  value={cartesVentesStats?.widgets?.ont_recu_carte?.toLocaleString('fr-FR') || '0'}
                  icon={<GoogleIcon name="credit_card" size={36} />}
                  trend={{ value: cartesVentesStats?.widgets?.ont_recu_carte || 0, direction: 'up', period: 'cartes distribuées' }}
                  color="success"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <GradientWidget
                  title="Producteurs ayant acheté des semences"
                  value={cartesVentesStats?.widgets?.ont_achete_semences?.toLocaleString('fr-FR') || '0'}
                  icon={<GoogleIcon name="sell" size={36} />}
                  trend={{ value: cartesVentesStats?.widgets?.ont_achete_semences || 0, direction: 'up', period: 'acheteurs' }}
                  color="warning"
                />
              </Grid>
            </Grid>

            <Grid container spacing={3}>
              {/* Distribution des paquets techniques */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="pie_chart" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Distribution des paquets techniques
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F1F8E9' }}>
                            <TableCell>Paquet technique</TableCell>
                            <TableCell align="right">Producteurs</TableCell>
                            <TableCell align="center">Provinces</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ptechStats?.ptech_distribution?.map((item) => (
                            <TableRow key={item.ptech} hover>
                              <TableCell>
                                <Chip label={item.ptech} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell align="right">{item.nombre_producteurs.toLocaleString('fr-FR')}</TableCell>
                              <TableCell align="center">{item.provinces_concernees}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Distribution par province */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                      <GoogleIcon name="map" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Distribution par province
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F1F8E9' }}>
                            <TableCell>Province</TableCell>
                            <TableCell>Paquet technique</TableCell>
                            <TableCell align="right">Producteurs</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ptechStats?.ptech_by_province?.slice(0, 10).map((item) => (
                            <TableRow key={`${item.province}-${item.ptech}`} hover>
                              <TableCell>
                                <Chip label={item.province} size="small" variant="outlined" />
                              </TableCell>
                              <TableCell>{item.ptech}</TableCell>
                              <TableCell align="right">{item.nombre.toLocaleString('fr-FR')}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* ============================================ */}
        {/* ONGLET C - CARTES & SEMENCES */}
        {/* ============================================ */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            {/* Distribution des cartes par province */}
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 2 }}>
              <GoogleIcon name="card" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
              Distribution des cartes par province
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                  <TableRow>
                    <TableCell>Province</TableCell>
                    <TableCell align="right">Total producteurs</TableCell>
                    <TableCell align="right">Cartes distribuées</TableCell>
                    <TableCell align="right">En attente</TableCell>
                    <TableCell align="right">À imprimer</TableCell>
                    <TableCell align="center">Taux de couverture</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartesVentesStats?.distribution_cartes_par_province?.map((row) => {
                    const taux = row.total_producteurs > 0 
                      ? Math.round((row.cartes_distribuees / row.total_producteurs) * 100) 
                      : 0;
                    return (
                      <TableRow key={row.province} hover>
                        <TableCell>{row.province}</TableCell>
                        <TableCell align="right">{row.total_producteurs.toLocaleString('fr-FR')}</TableCell>
                        <TableCell align="right">{row.cartes_distribuees.toLocaleString('fr-FR')}</TableCell>
                        <TableCell align="right">{row.cartes_attente.toLocaleString('fr-FR')}</TableCell>
                        <TableCell align="right">{row.cartes_imprimer.toLocaleString('fr-FR')}</TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={taux}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">{taux}%</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Ventes de semences par province */}
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
              <GoogleIcon name="sell" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
              Ventes de semences par province
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                  <TableRow>
                    <TableCell>Province</TableCell>
                    <TableCell align="right">Producteurs acheteurs</TableCell>
                    <TableCell align="right">Quantité (kg)</TableCell>
                    <TableCell align="right">Montant (USD)</TableCell>
                    <TableCell align="right">Montant (CDF)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartesVentesStats?.ventes_semences_par_province?.map((row) => (
                    <TableRow key={row.province} hover>
                      <TableCell>{row.province}</TableCell>
                      <TableCell align="right">{row.producteurs_acheteurs.toLocaleString('fr-FR')}</TableCell>
                      <TableCell align="right">{row.total_kg.toLocaleString('fr-FR')}</TableCell>
                      <TableCell align="right">{row.total_usd.toLocaleString('fr-FR')} $</TableCell>
                      <TableCell align="right">{row.total_cdf?.toLocaleString('fr-FR') || '-'} Fc</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Suivi par village */}
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
              <GoogleIcon name="village" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
              Suivi par village
            </Typography>
            <TableContainer component={Paper} sx={{ mb: 4 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                  <TableRow>
                    <TableCell>Village</TableCell>
                    <TableCell align="right">Total producteurs</TableCell>
                    <TableCell align="right">Ont reçu des cartes</TableCell>
                    <TableCell align="right">Ont acheté des semences</TableCell>
                    <TableCell align="center">Taux carte</TableCell>
                    <TableCell align="center">Taux semences</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartesVentesStats?.suivi_par_village
                    ?.slice(villagePage * villageRowsPerPage, villagePage * villageRowsPerPage + villageRowsPerPage)
                    .map((row) => {
                      const tauxCarte = row.total_producteurs > 0 
                        ? Math.round((row.ont_recu_carte / row.total_producteurs) * 100) 
                        : 0;
                      const tauxSemences = row.total_producteurs > 0 
                        ? Math.round((row.ont_achete_semences / row.total_producteurs) * 100) 
                        : 0;
                      return (
                        <TableRow key={row.village} hover>
                          <TableCell>{row.village}</TableCell>
                          <TableCell align="right">{row.total_producteurs.toLocaleString('fr-FR')}</TableCell>
                          <TableCell align="right">{row.ont_recu_carte.toLocaleString('fr-FR')}</TableCell>
                          <TableCell align="right">{row.ont_achete_semences.toLocaleString('fr-FR')}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${tauxCarte}%`} 
                              size="small" 
                              color={tauxCarte >= 70 ? 'success' : tauxCarte >= 40 ? 'warning' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${tauxSemences}%`} 
                              size="small" 
                              color={tauxSemences >= 70 ? 'success' : tauxSemences >= 40 ? 'warning' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={cartesVentesStats?.suivi_par_village?.length || 0}
                page={villagePage}
                onPageChange={(_, p) => setVillagePage(p)}
                rowsPerPage={villageRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setVillageRowsPerPage(parseInt(e.target.value));
                  setVillagePage(0);
                }}
                labelRowsPerPage="Lignes par page"
              />
            </TableContainer>

            {/* Ventes par fournisseur */}
            <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ mt: 3 }}>
              <GoogleIcon name="business" size={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
              Ventes de semences par fournisseur
            </Typography>
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F8E9' }}>
                  <TableRow>
                    <TableCell>Fournisseur</TableCell>
                    <TableCell align="right">Kilogrammes vendus</TableCell>
                    <TableCell align="right">Valeur (CDF)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartesVentesStats?.ventes_par_fournisseur
                    ?.slice(fournisseurPage * fournisseurRowsPerPage, fournisseurPage * fournisseurRowsPerPage + fournisseurRowsPerPage)
                    .map((row) => (
                      <TableRow key={row.fournisseur} hover>
                        <TableCell>
                          <Chip label={row.fournisseur} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="right">{row.total_kg.toLocaleString('fr-FR')} kg</TableCell>
                        <TableCell align="right">{row.total_cdf?.toLocaleString('fr-FR') || '-'} Fc</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={cartesVentesStats?.ventes_par_fournisseur?.length || 0}
                page={fournisseurPage}
                onPageChange={(_, p) => setFournisseurPage(p)}
                rowsPerPage={fournisseurRowsPerPage}
                onRowsPerPageChange={(e) => {
                  setFournisseurRowsPerPage(parseInt(e.target.value));
                  setFournisseurPage(0);
                }}
                labelRowsPerPage="Lignes par page"
              />
            </TableContainer>
          </Box>
        </TabPanel>
      </Paper>

      {/* Export Toolbar */}
      <ExportToolbar
        title="Bénéficiaires"
        subtitle="Suivi des producteurs agricoles"
        columns={[
          { header: 'Indicateur', key: 'indicateur', width: 40 },
          { header: 'Valeur', key: 'valeur', width: 60 },
        ]}
        getData={() => [
          { indicateur: 'Total producteurs', valeur: stats?.total_producteurs || 0 },
          { indicateur: 'Productrices', valeur: `${Math.round((stats?.total_femmes || 0) / (stats?.total_producteurs || 1) * 100)}%` },
          { indicateur: 'Âge moyen', valeur: `${Math.round(stats?.age_moyen || 0)} ans` },
          { indicateur: 'Chefs de ménage', valeur: stats?.chefs_menage || 0 },
          { indicateur: 'Cartes distribuées', valeur: cartesVentesStats?.widgets?.ont_recu_carte || 0 },
          { indicateur: 'Achat de semences', valeur: cartesVentesStats?.widgets?.ont_achete_semences || 0 },
          { indicateur: 'Fournisseurs actifs', valeur: cartesVentesStats?.widgets?.fournisseurs_actifs || 0 },
          { indicateur: 'Kg semences vendues', valeur: cartesVentesStats?.widgets?.kg_semences_vendues || 0 },
        ]}
        filename="beneficiaires_suivi"
      />
    </Box>
  );
};

export default BeneficiaireDashboard;