// frontend/src/pages/Beneficiaires/BeneficiaireList.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  InputAdornment,
  Button,
  Grid,
  Stack,
  Drawer,
  Divider,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import type { Beneficiaire, BeneficiaireFilters } from '../../services/api';
import { beneficiaireService } from '../../services/api';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';

interface BeneficiaireStats {
  total: number;
  femmes: number;
  hommes: number;
  provinces: number;
}

export const BeneficiaireList: React.FC = () => {
  const navigate = useNavigate();
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<BeneficiaireStats | null>(null);
  const [filters, setFilters] = useState<BeneficiaireFilters>({
    search: '',
    province: '',
    sexe: undefined,
    page: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const provinces = ['Kinshasa', 'Kongo Central', 'Kwilu', 'Kasaï', 'Haut-Lomami', 'Tanganyika'];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, statsRes] = await Promise.all([
        beneficiaireService.getAll(filters),
        beneficiaireService.getStats(),
      ]);
      setBeneficiaires(listRes.data.data);
      setTotal(listRes.data.total);
      setStats(statsRes.data);
    } catch (err) {
      setError('Erreur lors du chargement des données');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: event.target.value, page: 0 });
  };

  const handleFilterChange = (key: keyof BeneficiaireFilters, value: any) => {
    setFilters({ ...filters, [key]: value, page: 0 });
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, limit: parseInt(event.target.value, 10), page: 0 });
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      province: '',
      sexe: undefined,
      page: 0,
      limit: 10,
    });
  };

  const exportToCSV = () => {
    const headers = ['ID RNA', 'Nom complet', 'Sexe', 'Province', 'Territoire', 'Secteur', 'Groupement', 'Village', 'Saison', 'Technique'];
    const rows = beneficiaires.map(b => [
      b.rna_id,
      b.nom_complet,
      b.sexe === 'M' ? 'Homme' : 'Femme',
      b.province,
      b.territoire,
      b.secteur,
      b.groupement,
      b.village,
      b.saison,
      b.ptech,
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `beneficiaires_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading && beneficiaires.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Registre National des Agriculteurs (RNA)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestion et suivi des petits exploitants agricoles bénéficiaires du programme
        </Typography>
      </Box>

      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Total bénéficiaires"
              value={(stats.total || 0).toLocaleString('fr-FR')}
              icon={<GoogleIcon name="groups" size={36} />}
              trend={{ value: stats.provinces || 0, direction: 'up', period: 'provinces couvertes' }}
              onClick={() => navigate('/beneficiaires/dashboard')}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Femmes"
              value={(stats.femmes || 0).toLocaleString('fr-FR')}
              icon={<GoogleIcon name="female" size={36} />}
              trend={{ value: (stats.total || 0) > 0 ? Math.round(((stats.femmes || 0) / (stats.total || 1)) * 100) : 0, direction: 'up', period: '% du total' }}
              onClick={() => setFilters({ ...filters, sexe: 'F', page: 0 })}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Hommes"
              value={(stats.hommes || 0).toLocaleString('fr-FR')}
              icon={<GoogleIcon name="male" size={36} />}
              onClick={() => setFilters({ ...filters, sexe: 'M', page: 0 })}
              trend={{ value: (stats.total || 0) > 0 ? Math.round(((stats.hommes || 0) / (stats.total || 1)) * 100) : 0, direction: 'up', period: '% du total' }}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Provinces couvertes"
              value={stats.provinces || 0}
              icon={<GoogleIcon name="map" size={36} />}
              onClick={() => navigate('/outils/cartographie')}
              trend={{ value: Math.round(((stats.provinces || 0) / 26) * 100), direction: 'up', period: 'sur 26 provinces' }}
              color="warning"
            />
          </Grid>
        </Grid>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        Les données RNA proviennent directement de la table SQL FAO <strong>agriculteurs</strong>. Cet écran est accessible en lecture seule.
      </Alert>

      <Paper sx={moduleGridStyles.filterPanel}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par nom, RNA ID, province, territoire ou village..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <GoogleIcon name="search" size={24} />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                      <GoogleIcon name="close" size={22} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button variant="outlined" startIcon={<GoogleIcon name="filter_alt" size={22} />} onClick={() => setFilterDrawerOpen(true)}>
                Filtres
              </Button>
              <Button variant="outlined" startIcon={<GoogleIcon name="download" size={22} />} onClick={exportToCSV}>
                Exporter
              </Button>
              <Tooltip title="Rafraîchir">
                <IconButton onClick={loadData}>
                  <GoogleIcon name="refresh" size={24} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {(filters.province || filters.sexe) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.province && <Chip label={`Province: ${filters.province}`} onDelete={() => handleFilterChange('province', '')} />}
          {filters.sexe && <Chip label={`Sexe: ${filters.sexe === 'M' ? 'Homme' : 'Femme'}`} onDelete={() => handleFilterChange('sexe', undefined)} />}
          <Chip label="Réinitialiser" onClick={resetFilters} variant="outlined" />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <ExportToolbar
        title="Liste des Bénéficiaires RNA"
        subtitle="Registre national des agriculteurs bénéficiaires"
        columns={[
          { header: 'RNA ID', key: 'rna_id', width: 14 },
          { header: 'Nom complet', key: 'nom_complet', width: 28 },
          { header: 'Sexe', key: 'sexe', width: 10, formatter: (v) => v === 'M' ? 'Homme' : 'Femme' },
          { header: 'Province', key: 'province', width: 20 },
          { header: 'Territoire', key: 'territoire', width: 20 },
          { header: 'Village', key: 'village', width: 22 },
          { header: 'Saison', key: 'saison', width: 18 },
        ]}
        getData={() => beneficiaires.map((b) => ({
          rna_id: b.rna_id,
          nom_complet: b.nom_complet,
          sexe: b.sexe,
          province: b.province,
          territoire: b.territoire,
          village: b.village,
          saison: b.saison,
        }))}
        filename="beneficiaires_rna"
      />
      <TableContainer component={Paper} sx={{ borderRadius: '10px', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>RNA ID</TableCell>
              <TableCell>Nom complet</TableCell>
              <TableCell>Sexe</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Territoire</TableCell>
              <TableCell>Localisation</TableCell>
              <TableCell>Saison</TableCell>
              <TableCell>Technique</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {beneficiaires.map((beneficiaire) => (
              <TableRow key={beneficiaire.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{beneficiaire.rna_id}</Typography>
                </TableCell>
                <TableCell>
                  {beneficiaire.nom_complet}
                </TableCell>
                <TableCell>
                  {beneficiaire.sexe === 'M' ? (
                    <Chip icon={<GoogleIcon name="male" size={20} />} label="Homme" size="small" sx={{ bgcolor: 'rgba(57, 135, 229, 0.14)' }} />
                  ) : (
                    <Chip icon={<GoogleIcon name="female" size={20} />} label="Femme" size="small" sx={{ bgcolor: 'rgba(217, 27, 92, 0.14)' }} />
                  )}
                </TableCell>
                <TableCell>{beneficiaire.province}</TableCell>
                <TableCell>{beneficiaire.territoire || '-'}</TableCell>
                <TableCell>
                  <Typography variant="body2">{beneficiaire.village || '-'}</Typography>
                  {(beneficiaire.secteur || beneficiaire.groupement) && (
                    <Typography variant="caption" color="text.secondary">
                      {[beneficiaire.secteur, beneficiaire.groupement].filter(Boolean).join(' / ')}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{beneficiaire.saison || '-'}</TableCell>
                <TableCell>{beneficiaire.ptech || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={filters.page || 0}
          onPageChange={handlePageChange}
          rowsPerPage={filters.limit || 10}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </TableContainer>

      <Drawer anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>Filtres avancés</Typography>
          <Divider sx={{ mb: 2 }} />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Province</InputLabel>
            <Select value={filters.province || ''} label="Province" onChange={(e) => handleFilterChange('province', e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Sexe</InputLabel>
            <Select value={filters.sexe || ''} label="Sexe" onChange={(e) => handleFilterChange('sexe', e.target.value || undefined)}>
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="M">Homme</MenuItem>
              <MenuItem value="F">Femme</MenuItem>
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button variant="outlined" fullWidth onClick={resetFilters}>Réinitialiser</Button>
            <Button variant="contained" fullWidth onClick={() => setFilterDrawerOpen(false)} sx={{ bgcolor: '#2E7D32' }}>Appliquer</Button>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  );
};