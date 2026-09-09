// frontend/src/pages/Beneficiaires/OrganisationList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Typography, Paper, Card, Chip, Stack, Divider,
  TextField, InputAdornment, IconButton, Button, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  FormControl, InputLabel, Select, MenuItem,
  Drawer, Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, Alert, CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Business as BusinessIcon,
  Groups as GroupsIcon,
  Female as FemaleIcon,
  Male as MaleIcon,
  Agriculture as AgricultureIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  ChildCare as ChildCareIcon,
} from '../../components/common/PageIcons';
import { organisationService } from '../../services/organisation.service';
import type { Organisation, OrganisationFilters, OrganisationStats } from '../../services/organisation.service';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'cooperative': return 'Coopérative';
    case 'groupement': return 'Groupement';
    case 'association': return 'Association';
    case 'union': return 'Union';
    case 'federation': return 'Fédération';
    default: return type;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'cooperative': return '#2E7D32';
    case 'groupement': return '#1976D2';
    case 'association': return '#FF8F00';
    case 'union': return '#7B1FA2';
    case 'federation': return '#D32F2F';
    default: return '#757575';
  }
};

const getStatutLabel = (statut: string) => {
  switch (statut) {
    case 'active': return 'Active';
    case 'inactive': return 'Inactive';
    case 'sous_supervision': return 'Sous supervision';
    default: return statut;
  }
};

const getStatutColor = (statut: string) => {
  switch (statut) {
    case 'active': return '#4CAF50';
    case 'inactive': return '#F44336';
    case 'sous_supervision': return '#FF9800';
    default: return '#9E9E9E';
  }
};

export const OrganisationList: React.FC = () => {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrganisationStats | null>(null);
  const [filters, setFilters] = useState<OrganisationFilters>({
    search: '',
    type: '',
    province: '',
    statut: '',
    page: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedOrganisation, setSelectedOrganisation] = useState<Organisation | null>(null);
  const [formData, setFormData] = useState<Partial<Organisation>>({});

  const provinces = ['Kinshasa', 'Kongo Central', 'Kwilu', 'Kasaï', 'Haut-Lomami', 'Tanganyika'];
  const types = ['cooperative', 'groupement', 'association', 'union', 'federation'];
  const statuses = ['active', 'inactive', 'sous_supervision'];

  const getFormContacts = () => ({
    responsable: formData.contacts?.responsable || '',
    telephone: formData.contacts?.telephone || '',
    email: formData.contacts?.email || '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orgsRes, statsRes] = await Promise.all([
        organisationService.getAll(filters),
        organisationService.getStats(),
      ]);
      setOrganisations(orgsRes.data.data || []);
      setTotal(orgsRes.data.total || 0);
      setStats(statsRes.data);
    } catch (err) {
      setError('Erreur lors du chargement des organisations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: event.target.value, page: 0 });
  };

  const handleFilterChange = (key: keyof OrganisationFilters, value: OrganisationFilters[keyof OrganisationFilters]) => {
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

  const handleViewDetail = (org: Organisation) => {
    setSelectedOrganisation(org);
    setDetailDialogOpen(true);
  };

  const handleEdit = (org: Organisation) => {
    setSelectedOrganisation(org);
    setFormData(org);
    setFormDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette organisation ?')) {
      try {
        await organisationService.delete(id);
        loadData();
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
      }
    }
  };

  const handleSave = async () => {
    try {
      if (selectedOrganisation?.id) {
        await organisationService.update(selectedOrganisation.id, formData);
      } else {
        await organisationService.create(formData);
      }
      setFormDialogOpen(false);
      loadData();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
    }
  };

  const exportToCSV = () => {
    const headers = ['Code', 'Nom', 'Sigle', 'Type', 'Province', 'Membres', 'Femmes', 'Hommes', 'Jeunes', 'Statut'];
    const rows = organisations.map(o => [
      o.code,
      o.nom,
      o.sigle,
      getTypeLabel(o.type),
      o.province,
      o.membres.total,
      o.membres.femmes,
      o.membres.hommes,
      o.membres.jeunes,
      getStatutLabel(o.statut),
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `organisations_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading && organisations.length === 0) {
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
          Organisations Paysannes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestion des coopératives, groupements, associations et unions bénéficiaires du programme
        </Typography>
      </Box>

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Total organisations"
              value={stats.total.toLocaleString('fr-FR')}
              icon={<BusinessIcon sx={{ fontSize: 36 }} />}
              trend={{ value: stats.par_statut?.active ?? 0, direction: 'up', period: 'organisations actives' }}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Membres"
              value={stats.total_membres.toLocaleString('fr-FR')}
              icon={<GroupsIcon sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total_membres > 0 ? Math.round((stats.femmes_membres / stats.total_membres) * 100) : 0, direction: 'up', period: 'part des femmes' }}
              color="info"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Organisations actives"
              value={(stats.par_statut?.active ?? 0).toLocaleString('fr-FR')}
              icon={<CheckCircleIcon sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total > 0 ? Math.round(((stats.par_statut?.active ?? 0) / stats.total) * 100) : 0, direction: 'up', period: 'du total' }}
              color="success"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Jeunes membres"
              value={stats.jeunes_membres.toLocaleString('fr-FR')}
              icon={<ChildCareIcon sx={{ fontSize: 36 }} />}
              trend={{ value: stats.total_membres > 0 ? Math.round((stats.jeunes_membres / stats.total_membres) * 100) : 0, direction: 'up', period: 'du total' }}
              color="warning"
            />
          </Grid>
        </Grid>
      )}

      {/* Barre de recherche et actions */}
      <Paper sx={moduleGridStyles.filterPanel}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par nom, sigle, code..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setFilterDrawerOpen(true)}>
                Filtres
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportToCSV}>
                Exporter
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelectedOrganisation(null); setFormData({}); setFormDialogOpen(true); }} sx={{ bgcolor: '#2E7D32' }}>
                Nouvelle organisation
              </Button>
              <Tooltip title="Rafraîchir">
                <IconButton onClick={loadData}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Filtres actifs */}
      {(filters.type || filters.province || filters.statut) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.type && <Chip label={`Type: ${getTypeLabel(filters.type)}`} onDelete={() => handleFilterChange('type', '')} />}
          {filters.province && <Chip label={`Province: ${filters.province}`} onDelete={() => handleFilterChange('province', '')} />}
          {filters.statut && <Chip label={`Statut: ${getStatutLabel(filters.statut)}`} onDelete={() => handleFilterChange('statut', '')} />}
          <Chip label="Réinitialiser" onClick={resetFilters} variant="outlined" />
        </Box>
      )}

      {/* Tableau des organisations */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <ExportToolbar
        title="Organisations Partenaires"
        subtitle="Réseau des organisations bénéficiaires du PNDA-SE"
        columns={[
          { header: 'Code', key: 'code', width: 14 },
          { header: 'Nom', key: 'nom', width: 30 },
          { header: 'Sigle', key: 'sigle', width: 14 },
          { header: 'Type', key: 'type', width: 20 },
          { header: 'Province', key: 'province', width: 18 },
          { header: 'Total membres', key: 'membres_total', width: 16 },
          { header: 'Femmes', key: 'membres_femmes', width: 12 },
          { header: 'Hommes', key: 'membres_hommes', width: 12 },
          { header: 'Jeunes', key: 'membres_jeunes', width: 12 },
          { header: 'Statut', key: 'statut', width: 16 },
        ]}
        getData={() => organisations.map((o) => ({
          code: o.code,
          nom: o.nom,
          sigle: o.sigle ?? '',
          type: o.type,
          province: o.province,
          membres_total: o.membres?.total ?? 0,
          membres_femmes: o.membres?.femmes ?? 0,
          membres_hommes: o.membres?.hommes ?? 0,
          membres_jeunes: o.membres?.jeunes ?? 0,
          statut: o.statut,
        }))}
        filename="organisations_partenaires"
        landscape
      />
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Nom / Sigle</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Membres</TableCell>
              <TableCell>F/H/J</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organisations.map((org) => (
              <TableRow key={org.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{org.code}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>{org.nom}</Typography>
                  <Typography variant="caption" color="text.secondary">{org.sigle}</Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getTypeLabel(org.type)} 
                    size="small"
                    sx={{ bgcolor: `${getTypeColor(org.type)}20`, color: getTypeColor(org.type) }}
                  />
                </TableCell>
                <TableCell>{org.province}</TableCell>
                <TableCell>{org.membres?.total ?? 0}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Femmes">
                      <Chip size="small" icon={<FemaleIcon sx={{ fontSize: 14 }} />} label={org.membres?.femmes ?? 0} sx={{ height: 24 }} />
                    </Tooltip>
                    <Tooltip title="Hommes">
                      <Chip size="small" icon={<MaleIcon sx={{ fontSize: 14 }} />} label={org.membres?.hommes ?? 0} sx={{ height: 24 }} />
                    </Tooltip>
                    <Tooltip title="Jeunes">
                      <Chip size="small" label={org.membres?.jeunes ?? 0} sx={{ height: 24 }} />
                    </Tooltip>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={getStatutLabel(org.statut)} 
                    size="small"
                    sx={{ bgcolor: `${getStatutColor(org.statut)}20`, color: getStatutColor(org.statut) }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Voir détails">
                    <IconButton size="small" onClick={() => handleViewDetail(org)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => handleEdit(org)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" color="error" onClick={() => handleDelete(org.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
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

      {/* Drawer des filtres */}
      <Drawer anchor="right" open={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)}>
        <Box sx={{ width: 320, p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Filtres avancés
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Type d'organisation</InputLabel>
            <Select
              value={filters.type || ''}
              label="Type d'organisation"
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              {types.map(t => <MenuItem key={t} value={t}>{getTypeLabel(t)}</MenuItem>)}
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
              {statuses.map(s => <MenuItem key={s} value={s}>{getStatutLabel(s)}</MenuItem>)}
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
        {selectedOrganisation && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: getTypeColor(selectedOrganisation.type) }}>
                  <BusinessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedOrganisation.nom}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedOrganisation.sigle} • {selectedOrganisation.code}</Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Type</Typography>
                  <Chip label={getTypeLabel(selectedOrganisation.type)} size="small" sx={{ mt: 0.5 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Statut</Typography>
                  <Chip label={getStatutLabel(selectedOrganisation.statut)} size="small" sx={{ mt: 0.5, bgcolor: `${getStatutColor(selectedOrganisation.statut)}20`, color: getStatutColor(selectedOrganisation.statut) }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Date de création</Typography>
                  <Typography variant="body2">{new Date(selectedOrganisation.date_creation).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Date d'agrément</Typography>
                  <Typography variant="body2">{selectedOrganisation.date_agrement ? new Date(selectedOrganisation.date_agrement).toLocaleDateString() : '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Localisation</Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LocationOnIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedOrganisation.province}, {selectedOrganisation.territoire}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{selectedOrganisation.adresse}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Contact</Typography>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedOrganisation.contacts.responsable}</Typography>
                  </Stack>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">{selectedOrganisation.contacts.telephone}</Typography>
                  </Stack>
                  {selectedOrganisation.contacts.email && (
                    <Stack direction="row" spacing={2} alignItems="center">
                      <EmailIcon fontSize="small" color="action" />
                      <Typography variant="body2">{selectedOrganisation.contacts.email}</Typography>
                    </Stack>
                  )}
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Membres</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h5">{selectedOrganisation.membres.total}</Typography>
                        <Typography variant="caption">Total</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h5">{selectedOrganisation.membres.femmes}</Typography>
                        <Typography variant="caption">Femmes</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h5">{selectedOrganisation.membres.hommes}</Typography>
                        <Typography variant="caption">Hommes</Typography>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                        <Typography variant="h5">{selectedOrganisation.membres.jeunes}</Typography>
                        <Typography variant="caption">Jeunes</Typography>
                      </Card>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>Productions</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {selectedOrganisation.productions.map((prod, idx) => (
                      <Chip key={idx} icon={<AgricultureIcon />} label={prod} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" onClick={() => { setDetailDialogOpen(false); handleEdit(selectedOrganisation); }} sx={{ bgcolor: '#2E7D32' }}>
                Modifier
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog formulaire */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedOrganisation ? 'Modifier l\'organisation' : 'Nouvelle organisation paysanne'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Nom de l'organisation"
                value={formData.nom || ''}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Sigle"
                value={formData.sigle || ''}
                onChange={(e) => setFormData({ ...formData, sigle: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type || 'cooperative'}
                  label="Type"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Organisation['type'] })}
                >
                  {types.map(t => <MenuItem key={t} value={t}>{getTypeLabel(t)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Date de création"
                value={formData.date_creation || ''}
                onChange={(e) => setFormData({ ...formData, date_creation: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Province</InputLabel>
                <Select
                  value={formData.province || ''}
                  label="Province"
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                >
                  {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Territoire"
                value={formData.territoire || ''}
                onChange={(e) => setFormData({ ...formData, territoire: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Adresse"
                value={formData.adresse || ''}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Responsable"
                value={formData.contacts?.responsable || ''}
                onChange={(e) => setFormData({ ...formData, contacts: { ...getFormContacts(), responsable: e.target.value } })}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Téléphone"
                value={formData.contacts?.telephone || ''}
                onChange={(e) => setFormData({ ...formData, contacts: { ...getFormContacts(), telephone: e.target.value } })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.statut || 'active'}
                  label="Statut"
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value as Organisation['statut'] })}
                >
                  {statuses.map(s => <MenuItem key={s} value={s}>{getStatutLabel(s)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#2E7D32' }}>
            {selectedOrganisation ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrganisationList;