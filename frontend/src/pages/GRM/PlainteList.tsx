// frontend/src/pages/GRM/PlainteList.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
  Card,
  CardContent,
  Tabs,
  Tab,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import { useNavigate } from 'react-router-dom';
import { grmService } from '../../services/grm.service';
import type { Plainte, PlainteFilters } from '../../services/grm.service';
import GoogleIcon from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { useNotifications } from '../../context/NotificationsContext';

// Composant de statistiques
const StatsCard: React.FC<{ title: string; value: number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <Card sx={{ bgcolor: `${color}10`, borderLeft: `4px solid ${color}` }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="caption" color="text.secondary">{title}</Typography>
          <Typography variant="h5" fontWeight={600}>{value.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ color, display: 'flex', alignItems: 'center' }}>{icon}</Box>
      </Box>
    </CardContent>
  </Card>
);

const getStatusChip = (statut: string) => {
  switch (statut) {
    case 'recue':
      return <Chip label="Reçue" size="small" sx={{ bgcolor: '#E3F2FD', color: '#1976D2' }} />;
    case 'en_cours':
      return <Chip label="En cours" size="small" sx={{ bgcolor: '#FFF8E1', color: '#FF8F00' }} />;
    case 'referee':
      return <Chip label="Référée" size="small" sx={{ bgcolor: '#F3E5F5', color: '#7B1FA2' }} />;
    case 'traitee':
      return <Chip label="Traitée" size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }} />;
    case 'cloturee':
      return <Chip label="Clôturée" size="small" sx={{ bgcolor: '#ECEFF1', color: '#546E7A' }} />;
    default:
      return <Chip label={statut} size="small" />;
  }
};

const getTypeChip = (type: string) => {
  const isSensible = ['VBG', 'EAS', 'HS'].includes(type);
  return (
    <Chip 
      label={type} 
      size="small" 
      color={isSensible ? 'error' : 'default'}
      variant={isSensible ? 'filled' : 'outlined'}
    />
  );
};

export const PlainteList: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead } = useNotifications();
  const [plaintes, setPlaintes] = useState<Plainte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filters, setFilters] = useState<PlainteFilters>({
    search: '',
    type: '',
    province: '',
    statut: '',
    page: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedPlainte, setSelectedPlainte] = useState<Plainte | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [nouveauOpen, setNouveauOpen] = useState(false);
  const [nouveauData, setNouveauData] = useState<Pick<Plainte, 'type' | 'description' | 'province' | 'territoire' | 'village' | 'beneficiaire_nom' | 'beneficiaire_rna' | 'est_confidentiel'>>({
    type: 'Technique',
    description: '',
    province: 'Kwilu',
    territoire: '',
    village: '',
    beneficiaire_nom: '',
    beneficiaire_rna: '',
    est_confidentiel: false,
  });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [tabValue, setTabValue] = useState(0);

  const provinces = ['Kinshasa', 'Kongo Central', 'Kwilu', 'Kasaï', 'Haut-Lomami', 'Tanganyika'];
  const types = ['Technique', 'Administratif', 'Financier', 'VBG', 'EAS', 'HS', 'Environnemental'];
  const statuses = ['recue', 'en_cours', 'referee', 'traitee', 'cloturee'];

  const complaintNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 'complaint'),
    [notifications],
  );
  const unreadComplaintNotifications = complaintNotifications.filter((notification) => !notification.read);
  const sensitiveComplaintNotifications = complaintNotifications.filter((notification) => notification.severity === 'danger');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [plaintesRes, statsRes] = await Promise.all([
        grmService.getAll(filters),
        grmService.getStats(),
      ]);
      setPlaintes(plaintesRes.data.data);
      setTotal(plaintesRes.data.total);
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

  const handleFilterChange = (key: keyof PlainteFilters, value: any) => {
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
      type: '',
      province: '',
      statut: '',
      page: 0,
      limit: 10,
    });
  };

  const exportToCSV = () => {
    const headers = ['N° Plainte', 'Type', 'Province', 'Statut', 'Date réception', 'Délai (jours)', 'Résolution'];
    const rows = plaintes.map(p => [
      p.numero_plainte,
      p.type,
      p.province,
      p.statut,
      new Date(p.date_reception).toLocaleDateString(),
      p.delai_traite || '-',
      p.resolution?.substring(0, 50) || '-',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `plaintes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const openDetailDialog = (plainte: Plainte) => {
    setSelectedPlainte(plainte);
    setDetailDialogOpen(true);
  };

  const handleMarkComplaintNotificationsRead = async () => {
    await Promise.allSettled(
      unreadComplaintNotifications.map((notification) => markAsRead(notification.id)),
    );
  };

  if (loading && plaintes.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Gestion des Plaintes (GRM)
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Suivi et traitement des plaintes, y compris les cas VBG/EAS/HS
        </Typography>
      </Box>

      {complaintNotifications.length > 0 && (
        <Alert
          severity={sensitiveComplaintNotifications.length > 0 ? 'error' : 'info'}
          sx={{ mb: 3, alignItems: 'center' }}
          action={
            <Stack direction="row" spacing={1}>
              {unreadComplaintNotifications.length > 0 && (
                <Button color="inherit" size="small" onClick={() => void handleMarkComplaintNotificationsRead()}>
                  Marquer lues
                </Button>
              )}
              <Button color="inherit" size="small" onClick={() => navigate('/notifications')}>
                Ouvrir le centre
              </Button>
            </Stack>
          }
        >
          {unreadComplaintNotifications.length > 0
            ? `${unreadComplaintNotifications.length} notification(s) plainte non lue(s), dont ${sensitiveComplaintNotifications.length} cas sensible(s).`
            : `${complaintNotifications.length} notification(s) plainte historisée(s) dans le centre unifié.`}
        </Alert>
      )}

      {/* Onglets */}
      <Tabs value={tabValue} onChange={(_event, value) => setTabValue(value)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Toutes les plaintes" />
        <Tab 
          label={
            <Badge badgeContent={Math.max(stats?.sensibles || 0, sensitiveComplaintNotifications.length)} color="error">
              Cas sensibles (VBG/EAS/HS)
            </Badge>
          } 
        />
        <Tab label="En attente" />
        <Tab label="Traitée" />
      </Tabs>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard title="Total plaintes" value={stats.total || 24} icon={<GoogleIcon name="assignment" size={28} />} color="#2E7D32" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard title="En cours" value={stats.en_cours || 8} icon={<GoogleIcon name="pending_actions" size={28} />} color="#FF8F00" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard title="Traitée" value={stats.traitees || 14} icon={<GoogleIcon name="check_circle" size={28} />} color="#4CAF50" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatsCard title="Cas VBG/EAS/HS" value={Math.max(stats.sensibles || 0, sensitiveComplaintNotifications.length)} icon={<GoogleIcon name="warning" size={28} />} color="#D32F2F" />
          </Grid>
        </Grid>
      )}

      {/* Barre de recherche */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: '10px' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par numéro, bénéficiaire, description..."
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
              <Button
                variant="outlined"
                startIcon={<GoogleIcon name="filter_alt" size={22} />}
                onClick={() => setFilterDrawerOpen(true)}
              >
                Filtres
              </Button>
              <Button variant="outlined" startIcon={<GoogleIcon name="download" size={22} />} onClick={exportToCSV}>
                Exporter
              </Button>
              <Button variant="contained" startIcon={<GoogleIcon name="add" size={22} />} sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }} onClick={() => setNouveauOpen(true)}>
                Nouvelle plainte
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

      {/* Tableau des plaintes */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <ExportToolbar
        title="Mécanisme de Plaintes — GRM"
        subtitle="Suivi des plaintes et réclamations du projet"
        columns={[
          { header: 'N° Plainte', key: 'numero_plainte', width: 16 },
          { header: 'Type', key: 'type', width: 22 },
          { header: 'Bénéficiaire', key: 'beneficiaire_nom', width: 24 },
          { header: 'RNA', key: 'beneficiaire_rna', width: 14 },
          { header: 'Province', key: 'province', width: 18 },
          { header: 'Date réception', key: 'date_reception', width: 16,
            formatter: (v) => v ? new Date(String(v)).toLocaleDateString('fr-FR') : '' },
          { header: 'Statut', key: 'statut', width: 16 },
          { header: 'Délai (jours)', key: 'delai_traite', width: 14 },
          { header: 'Confidentiel', key: 'est_confidentiel', width: 14,
            formatter: (v) => v ? 'Oui' : 'Non' },
        ]}
        getData={() => plaintes.map((p) => ({
          numero_plainte: p.numero_plainte,
          type: p.type,
          beneficiaire_nom: p.beneficiaire_nom ?? '',
          beneficiaire_rna: p.beneficiaire_rna ?? '',
          province: p.province,
          date_reception: p.date_reception,
          statut: p.statut,
          delai_traite: p.delai_traite ?? '',
          est_confidentiel: p.est_confidentiel,
        }))}
        filename="plaintes_grm"
        landscape
      />
      <TableContainer component={Paper} sx={{ borderRadius: '10px', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F1F8E9' }}>
            <TableRow>
              <TableCell>N° Plainte</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Bénéficiaire</TableCell>
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
                  <Typography variant="body2" fontWeight={500}>
                    {plainte.numero_plainte}
                  </Typography>
                </TableCell>
                <TableCell>{getTypeChip(plainte.type)}</TableCell>
                <TableCell>
                  {plainte.beneficiaire_nom || '-'}
                  {plainte.beneficiaire_rna && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {plainte.beneficiaire_rna}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{plainte.province}</TableCell>
                <TableCell>{new Date(plainte.date_reception).toLocaleDateString()}</TableCell>
                <TableCell>{getStatusChip(plainte.statut)}</TableCell>
                <TableCell>
                  {plainte.delai_traite ? (
                    <Typography variant="body2" color={plainte.delai_traite > 30 ? 'error.main' : 'success.main'}>
                      {plainte.delai_traite} jours
                    </Typography>
                  ) : '-'}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Voir détails">
                    <IconButton size="small" onClick={() => openDetailDialog(plainte)}>
                      <GoogleIcon name="visibility" size={22} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier">
                    <IconButton size="small">
                      <GoogleIcon name="edit" size={22} />
                    </IconButton>
                  </Tooltip>
                  {plainte.est_confidentiel && (
                    <Tooltip title="Plainte confidentielle">
                      <GoogleIcon name="warning" size={22} sx={{ ml: 0.5, verticalAlign: 'middle', color: 'error.main' }} />
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={total || plaintes.length}
          page={filters.page || 0}
          onPageChange={handlePageChange}
          rowsPerPage={filters.limit || 10}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Lignes par page"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </TableContainer>

      {/* Drawer des filtres */}
      <Drawer anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Filtres avancés
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type de plainte</InputLabel>
            <Select
              value={filters.type || ''}
              label="Type de plainte"
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Province</InputLabel>
            <Select
              value={filters.province || ''}
              label="Province"
              onChange={(e) => handleFilterChange('province', e.target.value)}
            >
              <MenuItem value="">Toutes</MenuItem>
              {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.statut || ''}
              label="Statut"
              onChange={(e) => handleFilterChange('statut', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{getStatusChip(s).props.label}</MenuItem>)}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button variant="outlined" fullWidth onClick={resetFilters}>
              Réinitialiser
            </Button>
            <Button variant="contained" fullWidth onClick={() => setFilterDrawerOpen(false)} sx={{ bgcolor: '#2E7D32' }}>
              Appliquer
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Dialog de détail */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedPlainte && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                  Plainte {selectedPlainte.numero_plainte}
                </Typography>
                {getStatusChip(selectedPlainte.statut)}
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                  <Typography variant="body1" gutterBottom>{getTypeChip(selectedPlainte.type)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Date de réception</Typography>
                  <Typography variant="body1" gutterBottom>{new Date(selectedPlainte.date_reception).toLocaleString()}</Typography>
                </Grid>
                <Grid size={12}>
                  <Typography variant="subtitle2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" gutterBottom>{selectedPlainte.description}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary">Province</Typography>
                  <Typography variant="body1" gutterBottom>{selectedPlainte.province}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary">Territoire</Typography>
                  <Typography variant="body1" gutterBottom>{selectedPlainte.territoire}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" color="text.secondary">Village</Typography>
                  <Typography variant="body1" gutterBottom>{selectedPlainte.village}</Typography>
                </Grid>
                {selectedPlainte.beneficiaire_nom && (
                  <Grid size={12}>
                    <Typography variant="subtitle2" color="text.secondary">Bénéficiaire</Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedPlainte.beneficiaire_nom} ({selectedPlainte.beneficiaire_rna})
                    </Typography>
                  </Grid>
                )}
                {selectedPlainte.prise_en_charge && (
                  <Grid size={12}>
                    <Typography variant="subtitle2" color="text.secondary">Prise en charge par</Typography>
                    <Typography variant="body1" gutterBottom>{selectedPlainte.prise_en_charge}</Typography>
                  </Grid>
                )}
                {selectedPlainte.resolution && (
                  <Grid size={12}>
                    <Typography variant="subtitle2" color="text.secondary">Résolution</Typography>
                    <Typography variant="body1" gutterBottom>{selectedPlainte.resolution}</Typography>
                  </Grid>
                )}
                {selectedPlainte.est_confidentiel && (
                  <Grid size={12}>
                    <Alert severity="warning" icon={<GoogleIcon name="warning" size={22} sx={{ color: 'warning.main' }} />}>
                      Cette plainte est confidentielle (cas sensible). L'accès est restreint.
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" sx={{ bgcolor: '#2E7D32' }}>Modifier</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog Nouvelle plainte */}
      <Dialog open={nouveauOpen} onClose={() => setNouveauOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouvelle plainte</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Type de plainte</InputLabel>
                <Select value={nouveauData.type} label="Type de plainte"
                  onChange={e => setNouveauData(p => ({ ...p, type: e.target.value as Plainte['type'] }))}>
                  {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Province</InputLabel>
                <Select value={nouveauData.province} label="Province"
                  onChange={e => setNouveauData(p => ({ ...p, province: e.target.value }))}>
                  {provinces.map(pr => <MenuItem key={pr} value={pr}>{pr}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Territoire" required
                value={nouveauData.territoire} onChange={e => setNouveauData(p => ({ ...p, territoire: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Village"
                value={nouveauData.village} onChange={e => setNouveauData(p => ({ ...p, village: e.target.value }))} />
            </Grid>
            <Grid size={12}>
              <TextField fullWidth size="small" label="Description" required multiline rows={3}
                value={nouveauData.description} onChange={e => setNouveauData(p => ({ ...p, description: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Nom bénéficiaire"
                value={nouveauData.beneficiaire_nom} onChange={e => setNouveauData(p => ({ ...p, beneficiaire_nom: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="RNA bénéficiaire"
                value={nouveauData.beneficiaire_rna} onChange={e => setNouveauData(p => ({ ...p, beneficiaire_rna: e.target.value }))} />
            </Grid>
            <Grid size={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Confidentialité</InputLabel>
                <Select value={nouveauData.est_confidentiel ? 'oui' : 'non'} label="Confidentialité"
                  onChange={e => setNouveauData(p => ({ ...p, est_confidentiel: e.target.value === 'oui' }))}>
                  <MenuItem value="non">Non confidentielle</MenuItem>
                  <MenuItem value="oui">Confidentielle (VBG/EAS/HS)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNouveauOpen(false)} disabled={saving}>Annuler</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#2E7D32' }}
            disabled={saving || !nouveauData.description || !nouveauData.territoire}
            onClick={async () => {
              setSaving(true);
              try {
                await grmService.create({ ...nouveauData, statut: 'recue', date_reception: new Date().toISOString().split('T')[0] });
                setSnackbar({ open: true, message: 'Plainte enregistrée avec succès', severity: 'success' });
                setNouveauOpen(false);
                setNouveauData({ type: 'Technique', description: '', province: 'Kwilu', territoire: '', village: '', beneficiaire_nom: '', beneficiaire_rna: '', est_confidentiel: false });
                loadData();
              } catch {
                setSnackbar({ open: true, message: 'Erreur lors de l\'enregistrement', severity: 'error' });
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};