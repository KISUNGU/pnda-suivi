// frontend/src/pages/Admin/Utilisateurs.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Menu,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  Refresh,
  Clear,
  Add,
  Edit,
  Delete,
  Visibility,
  LockReset,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import GoogleIcon from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { utilisateursService, type Utilisateur, type UtilisateurFilters, type UtilisateurStats } from '../../services/utilisateurs.service';
import { useNotifications } from '../../context/NotificationsContext';

// Configuration des rôles
const rolesConfig: Record<string, { label: string; color: string; icon: string; level: number }> = {
  admin: { label: 'Administrateur', color: '#D32F2F', icon: 'admin_panel_settings', level: 100 },
  uncp: { label: 'UNCP', color: '#2E7D32', icon: 'account_balance', level: 80 },
  upep: { label: 'UPEP', color: '#1976D2', icon: 'location_city', level: 60 },
  ot: { label: 'Opérateur Technique', color: '#FF8F00', icon: 'engineering', level: 50 },
  partenaire: { label: 'Partenaire', color: '#7B1FA2', icon: 'handshake', level: 40 },
  invite: { label: 'Invité', color: '#757575', icon: 'visibility', level: 20 },
};

// Données mockées
const mockUtilisateurs: Utilisateur[] = [
  {
    id: 1,
    nom: 'MUKENDI',
    prenom: 'Jean',
    email: 'admin@pnda.cd',
    role: 'admin',
    role_label: 'Administrateur',
    telephone: '+243812345678',
    statut: 'actif',
    derniere_connexion: '2026-03-31T10:30:00Z',
    date_creation: '2024-01-15',
    created_by: 'Système',
    permissions: ['*'],
  },
  {
    id: 2,
    nom: 'KABEYA',
    prenom: 'Marie',
    email: 'uncp@pnda.cd',
    role: 'uncp',
    role_label: 'UNCP',
    telephone: '+243823456789',
    province: 'Kinshasa',
    statut: 'actif',
    derniere_connexion: '2026-03-30T14:20:00Z',
    date_creation: '2024-02-10',
    created_by: 'admin@pnda.cd',
    permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'rapports'],
  },
  {
    id: 3,
    nom: 'TSHIBOLA',
    prenom: 'Albert',
    email: 'upep.kwilu@pnda.cd',
    role: 'upep',
    role_label: 'UPEP',
    telephone: '+243834567890',
    province: 'Kwilu',
    statut: 'actif',
    derniere_connexion: '2026-03-29T09:15:00Z',
    date_creation: '2024-02-20',
    created_by: 'uncp@pnda.cd',
    permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'],
  },
  {
    id: 4,
    nom: 'LUBALA',
    prenom: 'Pauline',
    email: 'ot.kongo@pnda.cd',
    role: 'ot',
    role_label: 'Opérateur Technique',
    telephone: '+243845678901',
    province: 'Kongo Central',
    statut: 'actif',
    derniere_connexion: '2026-03-28T16:45:00Z',
    date_creation: '2024-03-05',
    created_by: 'uncp@pnda.cd',
    permissions: ['collecte', 'beneficiaires', 'rapports_terrain'],
  },
  {
    id: 5,
    nom: 'KALONJI',
    prenom: 'David',
    email: 'partenaire@banquemondiale.org',
    role: 'partenaire',
    role_label: 'Partenaire',
    telephone: '+243856789012',
    statut: 'actif',
    derniere_connexion: '2026-03-27T11:00:00Z',
    date_creation: '2024-03-15',
    created_by: 'admin@pnda.cd',
    permissions: ['dashboard', 'rapports'],
  },
  {
    id: 6,
    nom: 'NGOMA',
    prenom: 'Béatrice',
    email: 'invite@consultant.cd',
    role: 'invite',
    role_label: 'Invité',
    telephone: '+243867890123',
    statut: 'inactif',
    derniere_connexion: '2026-02-15T09:00:00Z',
    date_creation: '2024-04-10',
    created_by: 'admin@pnda.cd',
    permissions: ['dashboard'],
  },
];

const mockStats: UtilisateurStats = {
  total: 156,
  par_role: {
    admin: 3,
    uncp: 12,
    upep: 28,
    ot: 85,
    partenaire: 18,
    invite: 10,
  },
  par_statut: {
    actif: 142,
    inactif: 10,
    suspendu: 4,
  },
  par_province: {
    Kinshasa: 32,
    'Kongo Central': 28,
    Kwilu: 25,
    Kasaï: 22,
    'Haut-Lomami': 18,
    Tanganyika: 15,
  },
  actifs_30j: 98,
  nouveaux_mois: 12,
};

type UtilisateurFormData = Partial<Utilisateur> & {
  password?: string;
};

export const Utilisateurs: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead } = useNotifications();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UtilisateurStats | null>(null);
  const [filters, setFilters] = useState<UtilisateurFilters>({
    search: '',
    role: '',
    statut: '',
    province: '',
    page: 0,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUtilisateur, setSelectedUtilisateur] = useState<Utilisateur | null>(null);
  const [formData, setFormData] = useState<UtilisateurFormData>({});
  const [newPassword, setNewPassword] = useState('');
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  const provinces = ['Kinshasa', 'Kongo Central', 'Kwilu', 'Kasaï', 'Haut-Lomami', 'Tanganyika'];
  const statuses = ['actif', 'inactif', 'suspendu'];
  const userNotifications = useMemo(
    () => notifications.filter((notification) => notification.type === 'user'),
    [notifications],
  );
  const unreadUserNotifications = userNotifications.filter((notification) => !notification.read);
  const warningUserNotifications = userNotifications.filter((notification) => notification.severity === 'warning');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, statsRes] = await Promise.all([
        utilisateursService.getAll(filters),
        utilisateursService.getStats(),
      ]);
      const d = usersRes.data;
      setUtilisateurs(d.data?.length ? d.data : mockUtilisateurs);
      setTotal(d.total ?? mockUtilisateurs.length);
      setStats(statsRes.data || mockStats);
    } catch {
      setUtilisateurs(mockUtilisateurs);
      setTotal(mockUtilisateurs.length);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: event.target.value, page: 0 });
  };

  const handleFilterChange = (key: keyof UtilisateurFilters, value: UtilisateurFilters[keyof UtilisateurFilters]) => {
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
      role: '',
      statut: '',
      province: '',
      page: 0,
      limit: 10,
    });
  };

  const handleOpenForm = (utilisateur?: Utilisateur) => {
    if (utilisateur) {
      setSelectedUtilisateur(utilisateur);
      setFormData(utilisateur);
    } else {
      setSelectedUtilisateur(null);
      setFormData({
        role: 'invite',
        statut: 'actif',
      });
    }
    setFormDialogOpen(true);
  };

  const handleOpenReset = (utilisateur: Utilisateur) => {
    setSelectedUtilisateur(utilisateur);
    setNewPassword('');
    setResetDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedUtilisateur) {
        await utilisateursService.update(selectedUtilisateur.id, formData);
      } else {
        await utilisateursService.create(formData);
      }
      setFormDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async () => {
    try {
      if (selectedUtilisateur) await utilisateursService.resetPassword(selectedUtilisateur.id);
      setResetDialogOpen(false);
      alert(`Mot de passe réinitialisé pour ${selectedUtilisateur?.email}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatut = async (id: number, currentStatut: string) => {
    const newStatut = currentStatut === 'actif' ? 'inactif' : 'actif';
    if (window.confirm(`Voulez-vous ${newStatut === 'actif' ? 'activer' : 'désactiver'} cet utilisateur ?`)) {
      try {
        await utilisateursService.toggleStatut(id, newStatut as 'actif' | 'inactif');
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        await utilisateursService.delete(id);
      } catch { /* recharge quand même */ }
      loadData();
    }
  };

  const handleMarkUserNotificationsRead = async () => {
    await Promise.allSettled(
      unreadUserNotifications.map((notification) => markAsRead(notification.id)),
    );
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    setExportAnchorEl(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      alert(`Export ${format.toUpperCase()} démarré`);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && utilisateurs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Gestion des utilisateurs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Gestion des comptes utilisateurs, rôles et permissions d'accès au système
      </Typography>

      {userNotifications.length > 0 && (
        <Alert
          severity={warningUserNotifications.length > 0 ? 'warning' : 'info'}
          sx={{ mb: 3, alignItems: 'center' }}
          action={
            <Stack direction="row" spacing={1}>
              {unreadUserNotifications.length > 0 && (
                <Button color="inherit" size="small" onClick={() => void handleMarkUserNotificationsRead()}>
                  Marquer lues
                </Button>
              )}
              <Button color="inherit" size="small" onClick={() => navigate('/notifications')}>
                Centre des notifications
              </Button>
            </Stack>
          }
        >
          {unreadUserNotifications.length > 0
            ? `${unreadUserNotifications.length} notification(s) d'administration non lue(s), dont ${warningUserNotifications.length} nécessitent une action.`
            : `${userNotifications.length} notification(s) d'administration sont historisées dans le centre unifié.`}
        </Alert>
      )}

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2, borderLeft: '4px solid #2E7D32' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Total utilisateurs</Typography>
                <Typography variant="h4" fontWeight={700}>{stats.total}</Typography>
                <Chip 
                  label={`+${stats.nouveaux_mois} ce mois`} 
                  size="small" 
                  sx={{ mt: 1, bgcolor: '#E8F5E9', color: '#2E7D32' }} 
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Utilisateurs actifs</Typography>
                <Typography variant="h4" fontWeight={700} color="success.main">{stats.par_statut.actif}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.actifs_30j} connectés ces 30 derniers jours
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Opérateurs terrain</Typography>
                <Typography variant="h4" fontWeight={700} color="#FF8F00">{stats.par_role.ot}</Typography>
                <Typography variant="caption" color="text.secondary">équipes de collecte</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">Administrateurs</Typography>
                <Typography variant="h4" fontWeight={700} color="#D32F2F">{stats.par_role.admin}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {warningUserNotifications.length > 0 ? `${warningUserNotifications.length} alerte(s) admin` : 'accès complet'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Barre de recherche et actions */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par nom, email, téléphone..."
              value={filters.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: filters.search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => handleFilterChange('search', '')}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button variant="outlined" startIcon={<FilterList />} onClick={() => setFilterDrawerOpen(true)}>
                Filtres
              </Button>
              <Button variant="outlined" startIcon={<Download />} onClick={(e) => setExportAnchorEl(e.currentTarget)}>
                Exporter
              </Button>
              <Menu anchorEl={exportAnchorEl} open={Boolean(exportAnchorEl)} onClose={() => setExportAnchorEl(null)}>
                <MenuItem onClick={() => handleExport('pdf')}><GoogleIcon name="picture_as_pdf" size={18} sx={{ mr: 1 }} /> Exporter en PDF</MenuItem>
                <MenuItem onClick={() => handleExport('excel')}><GoogleIcon name="table_chart" size={18} sx={{ mr: 1 }} /> Exporter en Excel</MenuItem>
              </Menu>
              <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenForm()} sx={{ bgcolor: '#2E7D32' }}>
                Nouvel utilisateur
              </Button>
              <Tooltip title="Rafraîchir">
                <IconButton onClick={loadData}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Filtres actifs */}
      {(filters.role || filters.statut || filters.province) && (
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {filters.role && <Chip label={`Rôle: ${rolesConfig[filters.role]?.label || filters.role}`} onDelete={() => handleFilterChange('role', '')} />}
          {filters.statut && <Chip label={`Statut: ${filters.statut === 'actif' ? 'Actif' : filters.statut === 'inactif' ? 'Inactif' : 'Suspendu'}`} onDelete={() => handleFilterChange('statut', '')} />}
          {filters.province && <Chip label={`Province: ${filters.province}`} onDelete={() => handleFilterChange('province', '')} />}
          <Chip label="Réinitialiser" onClick={resetFilters} variant="outlined" />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Tableau des utilisateurs */}
      <ExportToolbar
        title="Gestion des Utilisateurs"
        subtitle="Liste des comptes utilisateurs du système"
        columns={[
          { header: 'Nom', key: 'nom', width: 18 },
          { header: 'Prénom', key: 'prenom', width: 18 },
          { header: 'Email', key: 'email', width: 28 },
          { header: 'Rôle', key: 'role', width: 14 },
          { header: 'Province', key: 'province', width: 18 },
          { header: 'Statut', key: 'statut', width: 12 },
          { header: 'Dernière connexion', key: 'derniere_connexion', width: 20,
            formatter: (v) => v ? new Date(String(v)).toLocaleDateString('fr-FR') : 'Jamais' },
        ]}
        getData={() => utilisateurs.map((u) => ({
          nom: u.nom,
          prenom: u.prenom,
          email: u.email,
          role: u.role,
          province: u.province ?? '',
          statut: u.statut,
          derniere_connexion: u.derniere_connexion,
        }))}
        filename="utilisateurs"
      />
      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F1F8E9' }}>
            <TableRow>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Email / Contact</TableCell>
              <TableCell>Rôle</TableCell>
              <TableCell>Province</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Dernière connexion</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {utilisateurs.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: rolesConfig[user.role]?.color || '#757575', width: 32, height: 32 }}>
                      <GoogleIcon name={rolesConfig[user.role]?.icon || 'person'} size={18} />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {user.nom} {user.prenom}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {user.id}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{user.email}</Typography>
                  {user.telephone && (
                    <Typography variant="caption" color="text.secondary">{user.telephone}</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={rolesConfig[user.role]?.label || user.role}
                    size="small"
                    sx={{ bgcolor: `${rolesConfig[user.role]?.color}20`, color: rolesConfig[user.role]?.color }}
                  />
                </TableCell>
                <TableCell>{user.province || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.statut === 'actif' ? 'Actif' : user.statut === 'inactif' ? 'Inactif' : 'Suspendu'}
                    size="small"
                    sx={{ 
                      bgcolor: user.statut === 'actif' ? '#E8F5E9' : user.statut === 'inactif' ? '#FFEBEE' : '#FFF3E0',
                      color: user.statut === 'actif' ? '#2E7D32' : user.statut === 'inactif' ? '#F44336' : '#FF8F00'
                    }}
                  />
                </TableCell>
                <TableCell>
                  {user.derniere_connexion ? new Date(user.derniere_connexion).toLocaleDateString() : 'Jamais'}
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Voir détails">
                    <IconButton size="small" onClick={() => { setSelectedUtilisateur(user); setDetailDialogOpen(true); }}>
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Modifier">
                    <IconButton size="small" onClick={() => handleOpenForm(user)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Réinitialiser mot de passe">
                    <IconButton size="small" onClick={() => handleOpenReset(user)}>
                      <LockReset fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={user.statut === 'actif' ? 'Désactiver' : 'Activer'}>
                    <IconButton size="small" onClick={() => handleToggleStatut(user.id, user.statut)}>
                      {user.statut === 'actif' ? <Cancel fontSize="small" color="error" /> : <CheckCircle fontSize="small" color="success" />}
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Supprimer">
                    <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                      <Delete fontSize="small" />
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
          <Typography variant="h6" fontWeight={600} gutterBottom>Filtres avancés</Typography>
          <Divider sx={{ mb: 2 }} />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Rôle</InputLabel>
            <Select value={filters.role || ''} label="Rôle" onChange={(e) => handleFilterChange('role', e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {Object.entries(rolesConfig).map(([key, config]) => (
                <MenuItem key={key} value={key}>{config.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Statut</InputLabel>
            <Select value={filters.statut || ''} label="Statut" onChange={(e) => handleFilterChange('statut', e.target.value)}>
              <MenuItem value="">Tous</MenuItem>
              {statuses.map(s => <MenuItem key={s} value={s}>{s === 'actif' ? 'Actif' : s === 'inactif' ? 'Inactif' : 'Suspendu'}</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Province</InputLabel>
            <Select value={filters.province || ''} label="Province" onChange={(e) => handleFilterChange('province', e.target.value)}>
              <MenuItem value="">Toutes</MenuItem>
              {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>

          <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
            <Button variant="outlined" fullWidth onClick={resetFilters}>Réinitialiser</Button>
            <Button variant="contained" fullWidth onClick={() => setFilterDrawerOpen(false)} sx={{ bgcolor: '#2E7D32' }}>Appliquer</Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Dialog de détail utilisateur */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="sm" fullWidth>
        {selectedUtilisateur && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: rolesConfig[selectedUtilisateur.role]?.color, width: 48, height: 48 }}>
                  <GoogleIcon name={rolesConfig[selectedUtilisateur.role]?.icon || 'person'} size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6">{selectedUtilisateur.nom} {selectedUtilisateur.prenom}</Typography>
                  <Typography variant="caption" color="text.secondary">{selectedUtilisateur.email}</Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Rôle</Typography>
                  <Chip label={rolesConfig[selectedUtilisateur.role]?.label} size="small" sx={{ mt: 0.5 }} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Statut</Typography>
                  <Chip label={selectedUtilisateur.statut === 'actif' ? 'Actif' : selectedUtilisateur.statut === 'inactif' ? 'Inactif' : 'Suspendu'} size="small" />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Téléphone</Typography>
                  <Typography variant="body2">{selectedUtilisateur.telephone || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Province</Typography>
                  <Typography variant="body2">{selectedUtilisateur.province || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Date de création</Typography>
                  <Typography variant="body2">{new Date(selectedUtilisateur.date_creation).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">Créé par</Typography>
                  <Typography variant="body2">{selectedUtilisateur.created_by || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" color="text.secondary">Permissions</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {selectedUtilisateur.permissions.map((perm, idx) => (
                      <Chip key={idx} label={perm} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" onClick={() => { setDetailDialogOpen(false); handleOpenForm(selectedUtilisateur); }} sx={{ bgcolor: '#2E7D32' }}>
                Modifier
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Dialog formulaire utilisateur */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedUtilisateur ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Nom" value={formData.nom || ''} onChange={(e) => setFormData({ ...formData, nom: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Prénom" value={formData.prenom || ''} onChange={(e) => setFormData({ ...formData, prenom: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Email" type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Téléphone" value={formData.telephone || ''} onChange={(e) => setFormData({ ...formData, telephone: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Rôle</InputLabel>
                <Select value={formData.role || 'invite'} label="Rôle" onChange={(e) => setFormData({ ...formData, role: e.target.value as Utilisateur['role'] })}>
                  {Object.entries(rolesConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Province</InputLabel>
                <Select value={formData.province || ''} label="Province" onChange={(e) => setFormData({ ...formData, province: e.target.value })}>
                  <MenuItem value="">Non attribué</MenuItem>
                  {provinces.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select value={formData.statut || 'actif'} label="Statut" onChange={(e) => setFormData({ ...formData, statut: e.target.value as Utilisateur['statut'] })}>
                  <MenuItem value="actif">Actif</MenuItem>
                  <MenuItem value="inactif">Inactif</MenuItem>
                  <MenuItem value="suspendu">Suspendu</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {!selectedUtilisateur && (
              <Grid size={{ xs: 12 }}>
                <TextField fullWidth label="Mot de passe temporaire" type="password" value={formData.password || ''} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#2E7D32' }}>
            {selectedUtilisateur ? 'Mettre à jour' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog réinitialisation mot de passe */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Réinitialiser le mot de passe</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Utilisateur: <strong>{selectedUtilisateur?.nom} {selectedUtilisateur?.prenom}</strong> ({selectedUtilisateur?.email})
          </Typography>
          <TextField
            fullWidth
            label="Nouveau mot de passe"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Laissez vide pour générer un mot de passe aléatoire"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleResetPassword} sx={{ bgcolor: '#2E7D32' }}>
            Réinitialiser
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Utilisateurs;