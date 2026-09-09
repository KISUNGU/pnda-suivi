// frontend/src/pages/Collecte/CollecteMobile.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Badge,
  Snackbar,
  LinearProgress,
  IconButton,
  Tab,
  Tabs,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  FormHelperText,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { offlineService } from '../../services/offlineDb.service';
import type { FormData } from '../../services/offlineDb.service';
import { getActiveForms } from '../../config/collecteForms';
import type { CollecteForm, FormField } from '../../config/collecteForms';

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

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'production': return '#2E7D32';
    case 'adoption': return '#1976D2';
    case 'plainte': return '#D32F2F';
    case 'satisfaction': return '#FF8F00';
    case 'suivi': return '#7B1FA2';
    default: return '#757575';
  }
};

const getCategoryLabel = (category: string) => {
  switch (category) {
    case 'production': return 'Production';
    case 'adoption': return 'Adoption';
    case 'plainte': return 'Plainte';
    case 'satisfaction': return 'Satisfaction';
    case 'suivi': return 'Suivi';
    default: return category;
  }
};

export const CollecteMobile: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [selectedForm, setSelectedForm] = useState<CollecteForm | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [savedForms, setSavedForms] = useState<FormData[]>([]);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedSavedForm, setSelectedSavedForm] = useState<FormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({  
    open: false,
    message: '',
    severity: 'success',
  });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadData();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    const formId = searchParams.get('form');
    if (!formId) return;
    const form = getActiveForms().find((item) => item.id === formId);
    if (form) {
      handleOpenForm(form);
    }
  }, [searchParams]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        }
      );
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const forms = await offlineService.getAllForms();
      setSavedForms(forms);
      const count = await offlineService.countUnsynced();
      setUnsyncedCount(count);
    } catch (_error) {
      console.error('Error loading data:', _error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (form: CollecteForm) => {
    setSelectedForm(form);
    setFormData({});
    setPhotos([]);
    setErrors({});
    setFormDialogOpen(true);
  };

  const validateField = (field: FormField, value: unknown): string => {
    if (field.required && (!value || value === '')) {
      return `${field.label} est requis`;
    }
    if (field.validation && value !== undefined && value !== null) {
      const numValue = Number(value);
      if (field.validation.min !== undefined && numValue < field.validation.min) {
        return `${field.label} doit être ≥ ${field.validation.min}`;
      }
      if (field.validation.max !== undefined && numValue > field.validation.max) {
        return `${field.label} doit être ≤ ${field.validation.max}`;
      }
    }
    return '';
  };

  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    const field = selectedForm?.fields.find(f => f.id === fieldId);
    if (field) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [fieldId]: error }));
    }
  };

  const handlePhotoCapture = () => {
    const fakePhoto = `data:image/jpeg;base64,photo_${Date.now()}_${Math.random().toString(36)}`;
    setPhotos(prev => [...prev, fakePhoto]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!selectedForm) return false;
    
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    for (const field of selectedForm.fields) {
      const value = formData[field.id];
      const error = validateField(field, value);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmitForm = async () => {
    if (!selectedForm) return;
    
    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: 'Veuillez corriger les erreurs dans le formulaire',
        severity: 'error',
      });
      return;
    }
    
    setSaving(true);
    try {
      await offlineService.saveFormData(
        selectedForm.id,
        selectedForm.name,
        formData,
        photos,
        location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : undefined
      );
      
      setSnackbar({
        open: true,
        message: 'Formulaire enregistré localement avec succès !',
        severity: 'success',
      });
      
      setFormDialogOpen(false);
      setSelectedForm(null);
      await loadData();
    } catch {
      setSnackbar({
        open: true,
        message: 'Erreur lors de l\'enregistrement',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await offlineService.syncWithServer();
      setSnackbar({
        open: true,
        message: `Synchronisation terminée: ${result.synced} succès, ${result.failed} échecs`,
        severity: result.failed === 0 ? 'success' : 'warning',
      });
      await loadData();
    } catch {
      setSnackbar({
        open: true,
        message: 'Erreur lors de la synchronisation',
        severity: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleViewDetail = (form: FormData) => {
    setSelectedSavedForm(form);
    setDetailDialogOpen(true);
  };

  const handleDeleteForm = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce formulaire ?')) {
      await offlineService.deleteForm(id);
      await loadData();
      setSnackbar({
        open: true,
        message: 'Formulaire supprimé',
        severity: 'info',
      });
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id];
    const error = errors[field.id];

    switch (field.type) {
      case 'textarea':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            label={field.label}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            placeholder={field.placeholder}
          />
        );
        
      case 'select':
        return (
          <FormControl fullWidth error={!!error} required={field.required}>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              label={field.label}
            >
              <MenuItem value="">Sélectionner...</MenuItem>
              {field.options?.map((opt: { value: string; label: string }) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
        
      case 'radio':
        return (
          <FormControl error={!!error} required={field.required}>
            <FormLabel>{field.label}</FormLabel>
            <RadioGroup
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            >
              {field.options?.map((opt: { value: string; label: string }) => (
                <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
              ))}
            </RadioGroup>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
        
      case 'checkbox':
        return (
          <FormControlLabel
            control={
              <Checkbox
                checked={!!value}
                onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              />
            }
            label={field.label}
          />
        );
        
      case 'date':
        return (
          <TextField
            fullWidth
            type="date"
            label={field.label}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            InputLabelProps={{ shrink: true }}
          />
        );
        
      case 'photo':
        return (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {field.label}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              {photos.map((_, index) => (
                <Box key={index} sx={{ position: 'relative' }}>
                  <Box 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: 'action.hover', 
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 1, borderColor: 'divider',
                    }}
                  >
                    <GoogleIcon name="photo_camera" size={32} sx={{ color: '#9E9E9E' }} />
                  </Box>
                  <IconButton 
                    size="small" 
                    sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper' }}
                    onClick={() => handleRemovePhoto(index)}
                  >
                    <GoogleIcon name="close" size={14} />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                startIcon={<GoogleIcon name="add_a_photo" size={18} />}
                onClick={handlePhotoCapture}
                sx={{ height: 80, minWidth: 80 }}
              >
                Prendre<br />photo
              </Button>
            </Box>
          </Box>
        );
        
      default:
        return (
          <TextField
            fullWidth
            type={field.type}
            label={field.label}
            value={value || ''}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            error={!!error}
            helperText={error}
            required={field.required}
            placeholder={field.placeholder}
            InputProps={{
              inputProps: field.validation ? {
                min: field.validation.min,
                max: field.validation.max,
              } : {},
            }}
          />
        );
    }
  };

  const activeForms = getActiveForms();
  const pendingForms = savedForms.filter(f => !f.synced);
  const syncedForms = savedForms.filter(f => f.synced);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Collecte mobile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Formulaire de collecte de données terrain - Fonctionne hors ligne
      </Typography>

      {/* État de synchronisation */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Badge badgeContent={unsyncedCount} color="error">
              <GoogleIcon name="cloud_off" size={32} sx={{ color: unsyncedCount > 0 ? '#F44336' : '#4CAF50' }} />
            </Badge>
            <Box>
              <Typography variant="body2" fontWeight={500}>
                Données hors ligne
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {unsyncedCount} formulaire(s) en attente de synchronisation
              </Typography>
            </Box>
          </Stack>
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={20} /> : <GoogleIcon name="sync" size={18} />}
            onClick={handleSync}
            disabled={syncing || unsyncedCount === 0}
            sx={{ bgcolor: '#2E7D32' }}
          >
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </Button>
        </Stack>
        {syncing && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
      </Paper>

      {/* Localisation */}
      {location && (
        <Alert severity="info" icon={<GoogleIcon name="location_on" size={18} />} sx={{ mb: 2, borderRadius: 2 }}>
          Position GPS actuelle: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
        </Alert>
      )}

      {/* Onglets */}
      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Formulaires" icon={<GoogleIcon name="edit" size={18} />} iconPosition="start" />
        <Tab 
          label="En attente" 
          icon={<Badge badgeContent={pendingForms.length} color="error"><GoogleIcon name="pending" size={18} /></Badge>}
          iconPosition="start" 
        />
        <Tab label="Historique" icon={<GoogleIcon name="history" size={18} />} iconPosition="start" />
      </Tabs>

      {/* Onglet Formulaires */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          {activeForms.map((form) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={form.id}>
              <Card 
                sx={{ 
                  borderRadius: 2, 
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                }}
                onClick={() => handleOpenForm(form)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box 
                      sx={{ 
                        width: 48, 
                        height: 48, 
                        borderRadius: 2, 
                        bgcolor: `${getCategoryColor(form.category)}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <GoogleIcon name={form.icon} size={28} sx={{ color: getCategoryColor(form.category) }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={600}>{form.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {form.fields.length} champs
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {form.description}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip 
                      label={getCategoryLabel(form.category)} 
                      size="small"
                      sx={{ bgcolor: `${getCategoryColor(form.category)}20`, color: getCategoryColor(form.category) }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Onglet En attente */}
      <TabPanel value={tabValue} index={1}>
        {pendingForms.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <GoogleIcon name="check_circle" size={48} sx={{ color: '#4CAF50' }} />
            <Typography variant="h6" sx={{ mt: 2 }}>Aucune donnée en attente</Typography>
            <Typography variant="body2" color="text.secondary">
              Toutes vos données ont été synchronisées
            </Typography>
          </Paper>
        ) : (
          <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
            {pendingForms.map((form) => (
              <React.Fragment key={form.id}>
                <ListItem
                  secondaryAction={
                    <Stack direction="row" spacing={1}>
                      <IconButton edge="end" onClick={() => handleViewDetail(form)}>
                        <GoogleIcon name="visibility" size={20} />
                      </IconButton>
                      <IconButton edge="end" color="error" onClick={() => handleDeleteForm(form.id!)}>
                        <GoogleIcon name="delete" size={20} />
                      </IconButton>
                    </Stack>
                  }
                >
                  <ListItemIcon>
                    <GoogleIcon name="description" size={24} sx={{ color: '#FF8F00' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={form.formName}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" component="span">
                          📅 {new Date(form.createdAt).toLocaleString()}
                        </Typography>
                        {form.latitude && (
                          <Typography variant="caption" component="span">
                            📍 {form.latitude.toFixed(4)}, {form.longitude?.toFixed(4)}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Chip label="En attente" size="small" sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)', color: '#FF8F00', ml: 2 }} />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </TabPanel>

      {/* Onglet Historique */}
      <TabPanel value={tabValue} index={2}>
        {syncedForms.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
            <GoogleIcon name="history" size={48} sx={{ color: '#9E9E9E' }} />
            <Typography variant="h6" sx={{ mt: 2 }}>Aucun historique</Typography>
            <Typography variant="body2" color="text.secondary">
              Les formulaires synchronisés apparaîtront ici
            </Typography>
          </Paper>
        ) : (
          <List sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
            {syncedForms.slice(0, 20).map((form) => (
              <React.Fragment key={form.id}>
                <ListItem
                  secondaryAction={
                    <IconButton edge="end" onClick={() => handleViewDetail(form)}>
                      <GoogleIcon name="visibility" size={20} />
                    </IconButton>
                  }
                >
                  <ListItemIcon>
                    <GoogleIcon name="description" size={24} sx={{ color: '#4CAF50' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={form.formName}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                        <Typography variant="caption" component="span">
                          📅 {new Date(form.createdAt).toLocaleString()}
                        </Typography>
                        {form.syncedAt && (
                          <Typography variant="caption" component="span" color="success.main">
                            ✅ Synchro: {new Date(form.syncedAt).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <Chip label="Synchronisé" size="small" sx={{ bgcolor: 'action.hover', color: '#2E7D32', ml: 2 }} />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        )}
      </TabPanel>

      {/* Dialog du formulaire */}
      <Dialog open={formDialogOpen} onClose={() => setFormDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GoogleIcon name={selectedForm?.icon || 'edit'} size={24} sx={{ color: '#2E7D32' }} />
            <Typography variant="h6">{selectedForm?.name}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {selectedForm?.description}
          </Typography>
          
          <Grid container spacing={2}>
            {selectedForm?.fields.map((field) => (
              <Grid size={{ xs: 12, md: field.type === 'textarea' || field.type === 'photo' ? 12 : 6 }} key={field.id}>
                {renderField(field)}
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitForm} 
            disabled={saving}
            sx={{ bgcolor: '#2E7D32' }}
          >
            {saving ? <CircularProgress size={24} /> : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de détail */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GoogleIcon name="description" size={24} sx={{ color: '#2E7D32' }} />
            <Typography variant="h6">{selectedSavedForm?.formName}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedSavedForm && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Date de collecte
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {new Date(selectedSavedForm.createdAt).toLocaleString()}
              </Typography>
              
              {selectedSavedForm.latitude && selectedSavedForm.longitude && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Position GPS
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    📍 {selectedSavedForm.latitude.toFixed(6)}, {selectedSavedForm.longitude.toFixed(6)}
                  </Typography>
                </>
              )}
              
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Données collectées
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                {Object.entries(selectedSavedForm.data).map(([key, value]) => (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">{key}</Typography>
                    <Typography variant="caption" fontWeight={500}>{String(value)}</Typography>
                  </Box>
                ))}
              </Paper>
              
              {selectedSavedForm.photos.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Photos ({selectedSavedForm.photos.length})
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {selectedSavedForm.photos.map((_, idx) => (
                      <Box 
                        key={idx}
                        sx={{ 
                          width: 80, 
                          height: 80, 
                          bgcolor: 'action.hover', 
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: 1, borderColor: 'divider',
                        }}
                      >
                        <GoogleIcon name="photo" size={32} sx={{ color: '#9E9E9E' }} />
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CollecteMobile;