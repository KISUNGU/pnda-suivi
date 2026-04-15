// frontend/src/pages/Beneficiaires/DistributionCartesPage.tsx

import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  Snackbar,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import {
  cartesAgriculteurService,
  type CarteAgriculteur,
  type CarteAgriculteurFilters,
  type CarteAgriculteurStats,
  type StatutCarte,
} from '../../services/cartesAgriculteur.service';

const provinces = ['Toutes', 'Kwilu', 'Kongo Central', 'Kasaï', 'Haut-Lomami', 'Tanganyika', 'Kinshasa'];
const statuts: Array<'Toutes' | StatutCarte> = ['Toutes', 'distribuee', 'en_attente', 'a_imprimer'];

const statutLabel: Record<StatutCarte, string> = {
  distribuee: 'Distribuée',
  en_attente: 'En attente',
  a_imprimer: 'À imprimer',
};

const statutColor: Record<StatutCarte, { bgcolor: string; color: string }> = {
  distribuee: { bgcolor: '#E8F5E9', color: '#2E7D32' },
  en_attente: { bgcolor: '#FFF3E0', color: '#E65100' },
  a_imprimer: { bgcolor: '#E3F2FD', color: '#1565C0' },
};

export const DistributionCartesPage: React.FC = () => {
  const [rows, setRows] = useState<CarteAgriculteur[]>([]);
  const [stats, setStats] = useState<CarteAgriculteurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<CarteAgriculteurFilters>({
    search: '',
    province: '',
    statut: undefined,
    page: 0,
    limit: 10,
  });
  
  // Dialog d'édition
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<CarteAgriculteur | null>(null);
  const [editForm, setEditForm] = useState({
    numero_carte: '',
    date_distribution: '',
    agent_distribution: '',
    statut: 'a_imprimer' as StatutCarte,
    observations: '',
  });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = {
        search: filters.search || undefined,
        province: filters.province === 'Toutes' ? undefined : filters.province,
        statut: filters.statut,
      };
      const [listRes, statsRes] = await Promise.all([
        cartesAgriculteurService.getAll({
          ...query,
          page: filters.page,
          limit: filters.limit,
        }),
        cartesAgriculteurService.getStats(query),
      ]);

      setRows(listRes.data.data);
      setTotal(listRes.data.total);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des cartes agriculteurs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEdit = (row: CarteAgriculteur) => {
    setSelectedRow(row);
    setEditForm({
      numero_carte: row.numero_carte || '',
      date_distribution: row.date_distribution || '',
      agent_distribution: row.agent_distribution || '',
      statut: row.statut_carte,
      observations: row.observations || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRow) return;
    setSaving(true);
    try {
      await cartesAgriculteurService.update(selectedRow.id, editForm);
      setSnackbar({ open: true, message: 'Carte mise à jour avec succès', severity: 'success' });
      setEditDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erreur lors de la mise à jour', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && rows.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Distribution des cartes agriculteurs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Suivi des cartes distribuées aux agriculteurs enregistrés
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Les données sont lues depuis la table <strong>agriculteurs</strong> et enrichies par la table <strong>distribution_cartes</strong>.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Widgets */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Cartes distribuées"
            value={(stats?.distribuees ?? 0).toLocaleString('fr-FR')}
            icon={<Box component="span" sx={{ fontSize: 40 }}>🪪</Box>}
            trend={{ value: (stats?.total ?? 0) > 0 ? Math.round(((stats?.distribuees ?? 0) / (stats?.total ?? 1)) * 100) : 0, direction: 'up', period: 'du total' }}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Producteurs enregistrés"
            value={(stats?.producteurs_enregistres ?? 0).toLocaleString('fr-FR')}
            icon={<Box component="span" sx={{ fontSize: 40 }}>🌾</Box>}
            trend={{ value: stats?.provinces ?? 0, direction: 'up', period: 'provinces couvertes' }}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="En attente"
            value={(stats?.en_attente ?? 0).toLocaleString('fr-FR')}
            icon={<Box component="span" sx={{ fontSize: 40 }}>⏳</Box>}
            trend={{ value: stats?.en_attente ?? 0, direction: (stats?.en_attente ?? 0) > 0 ? 'down' : 'up', period: (stats?.en_attente ?? 0) > 0 ? 'cartes à remettre' : 'aucun retard' }}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="À imprimer"
            value={(stats?.a_imprimer ?? 0).toLocaleString('fr-FR')}
            icon={<Box component="span" sx={{ fontSize: 40 }}>🖨️</Box>}
            trend={{ value: stats?.a_imprimer ?? 0, direction: (stats?.a_imprimer ?? 0) > 0 ? 'down' : 'up', period: (stats?.a_imprimer ?? 0) > 0 ? 'cartes à produire' : 'stock prêt' }}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Filtres */}
      <Paper sx={moduleGridStyles.filterPanel}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 5 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par agriculteur, RNA ou numéro de carte..."
              value={filters.search ?? ''}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 0 }))}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <GoogleIcon name="search" size={22} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <FormControl fullWidth>
              <InputLabel>Province</InputLabel>
              <Select
                value={filters.province || 'Toutes'}
                label="Province"
                onChange={(event) => setFilters((prev) => ({ ...prev, province: event.target.value === 'Toutes' ? '' : event.target.value, page: 0 }))}
              >
                {provinces.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Statut</InputLabel>
              <Select
                value={filters.statut ?? 'Toutes'}
                label="Statut"
                onChange={(event) => setFilters((prev) => ({ ...prev, statut: event.target.value === 'Toutes' ? undefined : event.target.value as StatutCarte, page: 0 }))}
              >
                {statuts.map((item) => <MenuItem key={item} value={item}>{item === 'Toutes' ? item : statutLabel[item]}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button variant="outlined" onClick={() => setFilters({ search: '', province: '', statut: undefined, page: 0, limit: filters.limit ?? 10 })}>
                Réinitialiser
              </Button>
              <Tooltip title="Rafraîchir les données">
                <IconButton onClick={loadData}>
                  <GoogleIcon name="refresh" size={22} />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Export Toolbar */}
      <ExportToolbar
        title="Distribution des cartes agriculteurs"
        subtitle="Données RNA enrichies par la table de distribution"
        columns={[
          { header: 'RNA', key: 'rna_id', width: 16 },
          { header: 'Nom complet', key: 'nom_complet', width: 28 },
          { header: 'Province', key: 'province', width: 16 },
          { header: 'Territoire', key: 'territoire', width: 16 },
          { header: 'Statut carte', key: 'statut_carte', width: 16 },
          { header: 'Numéro carte', key: 'numero_carte', width: 18 },
          { header: 'Date distribution', key: 'date_distribution', width: 18 },
        ]}
        getData={() => rows.map((row) => ({
          rna_id: row.rna_id,
          nom_complet: row.nom_complet,
          province: row.province,
          territoire: row.territoire,
          statut_carte: statutLabel[row.statut_carte],
          numero_carte: row.numero_carte ?? '',
          date_distribution: row.date_distribution ?? '',
        }))}
        filename="distribution_cartes_agriculteurs"
      />

      {/* Tableau */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F1F8E9' }}>
            <TableRow>
              <TableCell>Agriculteur</TableCell>
              <TableCell>Localisation</TableCell>
              <TableCell>Statut carte</TableCell>
              <TableCell>Numéro carte</TableCell>
              <TableCell>Date distribution</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">Aucune donnée trouvée</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{row.nom_complet}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.rna_id}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.province}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.territoire}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={statutLabel[row.statut_carte]} size="small" sx={statutColor[row.statut_carte]} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">{row.numero_carte ?? '-'}</Typography>
                  </TableCell>
                  <TableCell>{row.date_distribution ? new Date(row.date_distribution).toLocaleDateString('fr-FR') : '-'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Modifier la carte">
                      <IconButton size="small" onClick={() => handleOpenEdit(row)}>
                        <GoogleIcon name="edit" size={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total}
          page={filters.page ?? 0}
          onPageChange={(_event, newPage) => setFilters((prev) => ({ ...prev, page: newPage }))}
          rowsPerPage={filters.limit ?? 10}
          onRowsPerPageChange={(event) => setFilters((prev) => ({ ...prev, limit: parseInt(event.target.value, 10), page: 0 }))}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </TableContainer>

      {/* Dialog d'édition */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GoogleIcon name="credit_card" size={24} sx={{ color: '#2E7D32' }} />
            <Typography variant="h6">Gérer la carte</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>{selectedRow?.nom_complet}</strong> - RNA: {selectedRow?.rna_id}
            </Alert>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Numéro de carte"
                  value={editForm.numero_carte}
                  onChange={(e) => setEditForm({ ...editForm, numero_carte: e.target.value })}
                  placeholder="Ex: CARD-2024-00123"
                  helperText="Numéro unique de la carte"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Date de distribution"
                  value={editForm.date_distribution}
                  onChange={(e) => setEditForm({ ...editForm, date_distribution: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Agent distributeur"
                  value={editForm.agent_distribution}
                  onChange={(e) => setEditForm({ ...editForm, agent_distribution: e.target.value })}
                  placeholder="Nom de l'agent"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={editForm.statut}
                    label="Statut"
                    onChange={(e) => setEditForm({ ...editForm, statut: e.target.value as StatutCarte })}
                  >
                    <MenuItem value="a_imprimer">À imprimer</MenuItem>
                    <MenuItem value="en_attente">En attente</MenuItem>
                    <MenuItem value="distribuee">Distribuée</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Observations"
                  value={editForm.observations}
                  onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                  placeholder="Informations complémentaires..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={saving} sx={{ bgcolor: '#2E7D32' }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default DistributionCartesPage;