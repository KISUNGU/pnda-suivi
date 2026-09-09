// frontend/src/pages/Beneficiaires/FournisseurList.tsx
import React, { useState, useEffect } from 'react';
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
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { fournisseurService, type Fournisseur } from '../../services/api';

type NewFournisseurFormData = {
  nom: string;
  sigle: string;
  type: Fournisseur['type'];
  province: string;
  territoire: string;
  responsable: string;
  telephone: string;
  email: string;
  statut: Fournisseur['statut'];
  montant_contrat: string;
  intrants: string;
};

const typeColors: Record<string, string> = {
  'Semences': '#2E7D32',
  'Engrais': '#1565C0',
  'Pesticides': '#E65100',
  'Équipements': '#6A1B9A',
  'Mixte': '#00695C',
};

const statutColors: Record<string, 'success' | 'warning' | 'error'> = {
  'Agréé': 'success',
  'En cours': 'warning',
  'Suspendu': 'error',
};

const formatMontant = (val: number) =>
  val >= 1000000 ? `${(val / 1000000).toFixed(1)}M$` : `${(val / 1000).toFixed(0)}K$`;

const provinces = ['Toutes', 'Kinshasa', 'Kongo Central', 'Kasaï', 'Kwilu', 'Haut-Lomami', 'Tanganyika'];
const types = ['Tous', 'Semences', 'Engrais', 'Pesticides', 'Équipements', 'Mixte'];
const statuts = ['Tous', 'Agréé', 'En cours', 'Suspendu'];

export const FournisseurList: React.FC = () => {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterProvince, setFilterProvince] = useState('Toutes');
  const [filterType, setFilterType] = useState('Tous');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState<Fournisseur | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nouveauOpen, setNouveauOpen] = useState(false);
  const [nouveauData, setNouveauData] = useState<NewFournisseurFormData>({
    nom: '', sigle: '', type: 'Semences', province: 'Kinshasa', territoire: '',
    responsable: '', telephone: '', email: '', statut: 'En cours',
    montant_contrat: '', intrants: '',
  });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fournisseurService.getAll();
      setFournisseurs(result.data.data ?? []);
    } catch {
      setError('Erreur lors du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = fournisseurs.filter(f => {
    const matchSearch = f.nom.toLowerCase().includes(search.toLowerCase()) ||
      f.responsable.toLowerCase().includes(search.toLowerCase()) ||
      f.territoire.toLowerCase().includes(search.toLowerCase());
    const matchProvince = filterProvince === 'Toutes' || f.province === filterProvince;
    const matchType = filterType === 'Tous' || f.type === filterType;
    const matchStatut = filterStatut === 'Tous' || f.statut === filterStatut;
    return matchSearch && matchProvince && matchType && matchStatut;
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalContrats = fournisseurs.reduce((s, f) => s + f.montant_contrat, 0);
  const totalBenef = fournisseurs.reduce((s, f) => s + f.beneficiaires_servis, 0);
  const agrees = fournisseurs.filter(f => f.statut === 'Agréé').length;
  const tauxMoyen = fournisseurs.length
    ? Math.round(fournisseurs.reduce((s, f) => s + f.taux_livraison, 0) / fournisseurs.length)
    : 0;

  const handleOpenDetail = (f: Fournisseur) => {
    setSelected(f);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Fournisseurs d'intrants
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Gestion et suivi des fournisseurs d'intrants agricoles agréés par le PNDA-SE
      </Typography>

      {/* KPI */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Fournisseurs agréés', value: agrees.toLocaleString('fr-FR'), icon: 'verified', color: 'primary' as const, trend: fournisseurs.length > 0 ? Math.round((agrees / fournisseurs.length) * 100) : 0, period: 'du total' },
          { label: 'Valeur des contrats', value: formatMontant(totalContrats), icon: 'account_balance_wallet', color: 'info' as const, trend: tauxMoyen, period: 'livraison moyenne' },
          { label: 'Bénéficiaires servis', value: totalBenef.toLocaleString('fr-FR'), icon: 'groups', color: 'warning' as const, trend: fournisseurs.length > 0 ? Math.round(totalBenef / fournisseurs.length) : 0, period: 'moyenne / fournisseur' },
          { label: 'Taux de livraison moy.', value: `${tauxMoyen}%`, icon: 'local_shipping', color: 'success' as const, trend: tauxMoyen, period: 'de performance' },
        ].map(kpi => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={kpi.label}>
            <GradientWidget
              title={kpi.label}
              value={kpi.value}
              icon={<GoogleIcon name={kpi.icon} size={36} />}
              trend={{ value: kpi.trend, direction: 'up', period: kpi.period }}
              color={kpi.color}
            />
          </Grid>
        ))}
      </Grid>

      {/* Filtres */}
      <Paper sx={moduleGridStyles.filterPanel}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Rechercher par nom, responsable, territoire…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <GoogleIcon name="search" size={20} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Province</InputLabel>
              <Select value={filterProvince} label="Province" onChange={e => { setFilterProvince(e.target.value); setPage(0); }}>
                {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type d'intrant</InputLabel>
              <Select value={filterType} label="Type d'intrant" onChange={e => { setFilterType(e.target.value); setPage(0); }}>
                {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, sm: 4, md: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Statut</InputLabel>
              <Select value={filterStatut} label="Statut" onChange={e => { setFilterStatut(e.target.value); setPage(0); }}>
                {statuts.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 1 }}>
            <Button
              fullWidth
              variant="outlined"
              size="small"
              onClick={() => { setSearch(''); setFilterProvince('Toutes'); setFilterType('Tous'); setFilterStatut('Tous'); setPage(0); }}
            >
              Réinitialiser
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <ExportToolbar
        title="Fournisseurs d'Intrants"
        subtitle="Fournisseurs d'intrants agricoles agréés par le PNDA-SE"
        columns={[
          { header: 'Nom', key: 'nom', width: 28 },
          { header: 'Type', key: 'type', width: 18 },
          { header: 'Province', key: 'province', width: 18 },
          { header: 'Territoire', key: 'territoire', width: 20 },
          { header: 'Responsable', key: 'responsable', width: 24 },
          { header: 'Téléphone', key: 'telephone', width: 16 },
          { header: 'Taux livraison (%)', key: 'taux_livraison', width: 18 },
          { header: 'Bénéficiaires servis', key: 'beneficiaires_servis', width: 20 },
          { header: 'Contrat (USD)', key: 'montant_contrat', width: 18 },
          { header: 'Statut', key: 'statut', width: 14 },
        ]}
        getData={() => filtered.map((f) => ({
          nom: f.nom,
          type: f.type,
          province: f.province,
          territoire: f.territoire,
          responsable: f.responsable,
          telephone: f.telephone,
          taux_livraison: f.taux_livraison,
          beneficiaires_servis: f.beneficiaires_servis,
          montant_contrat: f.montant_contrat,
          statut: f.statut,
        }))}
        filename="fournisseurs_intrants"
        landscape
      />

      {/* Tableau */}
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {filtered.length} fournisseur{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
              startIcon={<GoogleIcon name="add" size={18} />}
              onClick={() => setNouveauOpen(true)}
            >
              Nouveau fournisseur
            </Button>
          </Stack>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'action.hover' }}>
              <TableRow>
                <TableCell>Fournisseur</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Province / Territoire</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell align="center">Taux livraison</TableCell>
                <TableCell align="right">Bénéf. servis</TableCell>
                <TableCell align="right">Contrat</TableCell>
                <TableCell align="center">Statut</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Aucun fournisseur ne correspond aux critères de recherche
                  </TableCell>
                </TableRow>
              ) : paginated.map(f => (
                <TableRow key={f.id} hover sx={{ cursor: 'pointer' }} onClick={() => handleOpenDetail(f)}>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: typeColors[f.type] + '22', color: typeColors[f.type], fontWeight: 700, width: 36, height: 36, fontSize: 13 }}>
                        {(f.sigle || f.nom.slice(0, 2)).toUpperCase()}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{f.nom}</Typography>
                        {f.sigle && <Typography variant="caption" color="text.secondary">{f.sigle}</Typography>}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={f.type} size="small" sx={{ bgcolor: typeColors[f.type] + '22', color: typeColors[f.type], fontWeight: 500 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{f.province}</Typography>
                    <Typography variant="caption" color="text.secondary">{f.territoire}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{f.responsable}</Typography>
                    <Typography variant="caption" color="text.secondary">{f.telephone}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={f.taux_livraison}
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 2,
                          '& .MuiLinearProgress-bar': {
                            bgcolor: f.taux_livraison >= 70 ? '#2E7D32' : f.taux_livraison >= 50 ? '#FFC107' : '#F44336',
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ minWidth: 30 }}>{f.taux_livraison}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>{f.beneficiaires_servis.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>{formatMontant(f.montant_contrat)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={f.statut} size="small" color={statutColors[f.statut]} />
                  </TableCell>
                  <TableCell align="center" onClick={e => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Voir le détail">
                        <IconButton size="small" onClick={() => handleOpenDetail(f)}>
                          <GoogleIcon name="visibility" size={18} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Modifier">
                        <IconButton size="small">
                          <GoogleIcon name="edit" size={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Lignes par page :"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} sur ${count}`}
        />
      </Paper>

      {/* Drawer détail */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 420, p: 3 } }}>
        {selected && (
          <>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Détail fournisseur</Typography>
              <IconButton onClick={() => setDrawerOpen(false)}>
                <GoogleIcon name="close" size={22} />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Avatar sx={{ bgcolor: typeColors[selected.type], width: 52, height: 52, fontSize: 18, fontWeight: 700 }}>
                {(selected.sigle || selected.nom.slice(0, 2)).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>{selected.nom}</Typography>
                <Chip label={selected.statut} size="small" color={statutColors[selected.statut]} sx={{ mt: 0.5 }} />
              </Box>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            {[
              { label: 'Type d\'intrant', value: selected.type },
              { label: 'Province', value: selected.province },
              { label: 'Territoire', value: selected.territoire },
              { label: 'Responsable', value: selected.responsable },
              { label: 'Téléphone', value: selected.telephone },
              { label: 'Email', value: selected.email || '—' },
              { label: 'Date de contrat', value: new Date(selected.date_contrat).toLocaleDateString('fr-FR') },
              { label: 'Montant du contrat', value: formatMontant(selected.montant_contrat) },
              { label: 'Bénéficiaires servis', value: selected.beneficiaires_servis.toLocaleString() },
            ].map(row => (
              <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.8, borderBottom: '1px solid #f0f0f0' }}>
                <Typography variant="body2" color="text.secondary">{row.label}</Typography>
                <Typography variant="body2" fontWeight={500}>{row.value}</Typography>
              </Box>
            ))}

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Taux de livraison</Typography>
                <Typography variant="body2" fontWeight={600}>{selected.taux_livraison}%</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={selected.taux_livraison}
                sx={{
                  height: 8,
                  borderRadius: 2,
                  '& .MuiLinearProgress-bar': {
                    bgcolor: selected.taux_livraison >= 70 ? '#2E7D32' : selected.taux_livraison >= 50 ? '#FFC107' : '#F44336',
                  },
                }}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2" color="text.secondary">Stock disponible</Typography>
                <Typography variant="body2" fontWeight={600}>{selected.stock_disponible.toLocaleString()} / {selected.stock_total.toLocaleString()} unités</Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(selected.stock_disponible / selected.stock_total) * 100}
                sx={{ height: 8, borderRadius: 2 }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Intrants fournis</Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {selected.intrants.map(i => (
                <Chip key={i} label={i} size="small" variant="outlined" sx={{ borderColor: typeColors[selected.type], color: typeColors[selected.type] }} />
              ))}
            </Stack>

            <Box sx={{ mt: 3 }}>
              <Button fullWidth variant="contained" sx={{ bgcolor: '#2E7D32', mb: 1 }} startIcon={<GoogleIcon name="edit" size={18} />}>
                Modifier le fournisseur
              </Button>
              <Button fullWidth variant="outlined" startIcon={<GoogleIcon name="description" size={18} />}>
                Voir le contrat
              </Button>
            </Box>
          </>
        )}
      </Drawer>

      {/* Dialog Nouveau fournisseur */}
      <Dialog open={nouveauOpen} onClose={() => setNouveauOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nouveau fournisseur</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField fullWidth size="small" label="Nom du fournisseur" required
                value={nouveauData.nom} onChange={e => setNouveauData(p => ({ ...p, nom: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth size="small" label="Sigle"
                value={nouveauData.sigle} onChange={e => setNouveauData(p => ({ ...p, sigle: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Type d'intrant</InputLabel>
                <Select value={nouveauData.type} label="Type d'intrant"
                  onChange={e => setNouveauData(p => ({ ...p, type: e.target.value as Fournisseur['type'] }))}>
                  {['Semences','Engrais','Pesticides','Équipements','Mixte'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Statut</InputLabel>
                <Select value={nouveauData.statut} label="Statut"
                  onChange={e => setNouveauData(p => ({ ...p, statut: e.target.value as Fournisseur['statut'] }))}>
                  {['Agréé','En cours','Suspendu'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel>Province</InputLabel>
                <Select value={nouveauData.province} label="Province"
                  onChange={e => setNouveauData(p => ({ ...p, province: e.target.value }))}>
                  {['Kinshasa','Kongo Central','Kasaï','Kwilu','Haut-Lomami','Tanganyika'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Territoire" required
                value={nouveauData.territoire} onChange={e => setNouveauData(p => ({ ...p, territoire: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Responsable" required
                value={nouveauData.responsable} onChange={e => setNouveauData(p => ({ ...p, responsable: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Téléphone"
                value={nouveauData.telephone} onChange={e => setNouveauData(p => ({ ...p, telephone: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Email" type="email"
                value={nouveauData.email} onChange={e => setNouveauData(p => ({ ...p, email: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Montant contrat (USD)" type="number"
                value={nouveauData.montant_contrat} onChange={e => setNouveauData(p => ({ ...p, montant_contrat: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label="Intrants fournis (séparés par virgule)"
                placeholder="Ex: Maïs hybride, NPK 17-17-17"
                value={nouveauData.intrants} onChange={e => setNouveauData(p => ({ ...p, intrants: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNouveauOpen(false)} disabled={saving}>Annuler</Button>
          <Button
            variant="contained"
            sx={{ bgcolor: '#2E7D32' }}
            disabled={saving || !nouveauData.nom || !nouveauData.territoire || !nouveauData.responsable}
            onClick={async () => {
              setSaving(true);
              try {
                await fournisseurService.create({
                  ...nouveauData,
                  montant_contrat: Number(nouveauData.montant_contrat) || 0,
                  intrants: nouveauData.intrants ? nouveauData.intrants.split(',').map(s => s.trim()).filter(Boolean) : [],
                });
                setSnackbar({ open: true, message: 'Fournisseur créé avec succès', severity: 'success' });
                setNouveauOpen(false);
                setNouveauData({ nom: '', sigle: '', type: 'Semences', province: 'Kinshasa', territoire: '', responsable: '', telephone: '', email: '', statut: 'En cours', montant_contrat: '', intrants: '' });
                loadData();
              } catch {
                setSnackbar({ open: true, message: 'Erreur lors de la création du fournisseur', severity: 'error' });
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

export default FournisseurList;
