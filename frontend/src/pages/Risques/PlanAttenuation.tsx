// frontend/src/pages/Risques/PlanAttenuation.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import planAttenuationService from '../../services/planAttenuation.service';
import type { PlanAtténuationRisque, ActionAtténuation, PlanStats } from '../../services/planAttenuation.service';

const niveauConfig: Record<string, { label: string; color: string; bg: string }> = {
  Faible: { label: 'Faible', color: '#4CAF50', bg: '#E8F5E9' },
  Modéré: { label: 'Modéré', color: '#FFC107', bg: '#FFF8E1' },
  Élevé: { label: 'Élevé', color: '#FF9800', bg: '#FFF3E0' },
  Critique: { label: 'Critique', color: '#F44336', bg: '#FFEBEE' },
};

const statutActionConfig: Record<string, { label: string; color: string; bg: string }> = {
  prevue: { label: 'Prévue', color: '#757575', bg: '#F5F5F5' },
  en_cours: { label: 'En cours', color: '#FF8F00', bg: '#FFF8E1' },
  realisee: { label: 'Réalisée', color: '#2E7D32', bg: '#E8F5E9' },
  abandonnee: { label: 'Abandonnée', color: '#C62828', bg: '#FFEBEE' },
};

export const PlanAttenuation: React.FC = () => {
  const [risques, setRisques] = useState<PlanAtténuationRisque[]>([]);
  const [stats, setStats] = useState<PlanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | false>(false);
  
  // Dialog pour ajouter/modifier une action
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedRisque, setSelectedRisque] = useState<PlanAtténuationRisque | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionAtténuation | null>(null);
  const [actionForm, setActionForm] = useState<Partial<ActionAtténuation>>({
    action: '',
    responsable: '',
    date_debut: new Date().toISOString().split('T')[0],
    date_fin: '',
    statut: 'prevue',
    resultat: '',
  });
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [plansRes, statsRes] = await Promise.all([
        planAttenuationService.getAll(),
        planAttenuationService.getStats(),
      ]);
      setRisques(plansRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Erreur chargement plans:', err);
      setError('Impossible de charger les plans d\'atténuation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenActionDialog = (risque: PlanAtténuationRisque, action?: ActionAtténuation) => {
    setSelectedRisque(risque);
    if (action) {
      setSelectedAction(action);
      setActionForm({
        action: action.action,
        responsable: action.responsable,
        date_debut: action.date_debut,
        date_fin: action.date_fin,
        statut: action.statut,
        resultat: action.resultat || '',
      });
    } else {
      setSelectedAction(null);
      setActionForm({
        action: '',
        responsable: '',
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: '',
        statut: 'prevue',
        resultat: '',
      });
    }
    setActionDialogOpen(true);
  };

  const handleSaveAction = async () => {
    if (!selectedRisque) return;
    setSaving(true);
    try {
      if (selectedAction) {
        await planAttenuationService.updateAction(selectedAction.id, actionForm);
        setSnackbar({ open: true, message: 'Action mise à jour avec succès', severity: 'success' });
      } else {
        await planAttenuationService.addAction(selectedRisque.id, actionForm);
        setSnackbar({ open: true, message: 'Action ajoutée avec succès', severity: 'success' });
      }
      setActionDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erreur lors de l\'enregistrement', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette action ?')) {
      try {
        await planAttenuationService.deleteAction(actionId);
        setSnackbar({ open: true, message: 'Action supprimée avec succès', severity: 'success' });
        loadData();
      } catch (err) {
        console.error(err);
        setSnackbar({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  const totalActions = risques.reduce((acc, r) => acc + (r.actions?.length || 0), 0);
  const realisees = risques.reduce((acc, r) => acc + (r.actions?.filter(a => a.statut === 'realisee').length || 0), 0);
  const enCours = risques.reduce((acc, r) => acc + (r.actions?.filter(a => a.statut === 'en_cours').length || 0), 0);
  const prevues = risques.reduce((acc, r) => acc + (r.actions?.filter(a => a.statut === 'prevue').length || 0), 0);

  const exportData = risques.map(r => ({
    code: r.code,
    nom: r.nom,
    niveau: r.niveau,
    statut: r.statut,
    plan: r.plan_attenuation,
    responsable: r.responsable,
    actions_count: r.actions?.length || 0,
    actions_realisees: r.actions?.filter(a => a.statut === 'realisee').length || 0,
    dernier_suivi: r.dernier_suivi || '-',
  }));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Plans d'atténuation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Suivi des mesures d'atténuation et des actions par risque identifié
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Statistiques des actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Total actions"
            value={totalActions.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="task" size={36} />}
            trend={{ value: stats?.risques_avec_plan || 0, direction: 'up', period: 'risques suivis' }}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Réalisées"
            value={realisees.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="check_circle" size={36} />}
            trend={{ value: totalActions > 0 ? Math.round((realisees / totalActions) * 100) : 0, direction: 'up', period: 'des actions' }}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="En cours"
            value={enCours.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="pending" size={36} />}
            trend={{ value: totalActions > 0 ? Math.round((enCours / totalActions) * 100) : 0, direction: 'up', period: 'des actions' }}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Prévues"
            value={prevues.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="schedule" size={36} />}
            trend={{ value: totalActions > 0 ? Math.round((prevues / totalActions) * 100) : 0, direction: 'up', period: 'des actions' }}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Progression globale */}
      {totalActions > 0 && (
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Progression globale des actions d'atténuation</Typography>
            <Typography variant="body2" fontWeight={600} color="success.main">
              {Math.round((realisees / totalActions) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(realisees / totalActions) * 100}
            sx={{ height: 10, borderRadius: 2, bgcolor: '#E8F5E9', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {realisees} actions réalisées sur {totalActions}
          </Typography>
        </Paper>
      )}

      {/* Export */}
      <ExportToolbar
        title="Plans d'atténuation des risques"
        subtitle="Suivi des mesures d'atténuation par risque — PNDA-SE"
        columns={[
          { header: 'Code', key: 'code', width: 12 },
          { header: 'Risque', key: 'nom', width: 40 },
          { header: 'Niveau', key: 'niveau', width: 12 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: "Plan d'atténuation", key: 'plan', width: 50 },
          { header: 'Responsable', key: 'responsable', width: 26 },
          { header: 'Actions', key: 'actions_count', width: 10 },
          { header: 'Réalisées', key: 'actions_realisees', width: 12 },
          { header: 'Dernier suivi', key: 'dernier_suivi', width: 16 },
        ]}
        getData={() => exportData}
        filename="plans_attenuation"
        landscape
      />

      {/* Accordions par risque */}
      {risques.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Aucun plan d'atténuation n'a été défini pour le moment.
        </Alert>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {risques.map((risque) => {
            const risqueActions = risque.actions || [];
            const done = risqueActions.filter(a => a.statut === 'realisee').length;
            const pct = risqueActions.length > 0 ? Math.round((done / risqueActions.length) * 100) : 0;
            const cfg = niveauConfig[risque.niveau] || niveauConfig['Modéré'];

            return (
              <Accordion
                key={risque.id}
                expanded={expanded === risque.id}
                onChange={() => setExpanded(expanded === risque.id ? false : risque.id)}
                sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: 1 }}
              >
                <AccordionSummary expandIcon={<GoogleIcon name="expand_more" />}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: '100%', pr: 2 }}>
                    <Chip label={risque.code} size="small" sx={{ bgcolor: '#2E7D32', color: 'white', borderRadius: 1 }} />
                    <Chip
                      label={cfg.label}
                      size="small"
                      sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600 }}
                    />
                    <Typography variant="body1" fontWeight={500} sx={{ flex: 1 }}>
                      {risque.nom}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 160 }}>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ flex: 1, height: 6, borderRadius: 2, bgcolor: '#E8F5E9', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {done}/{risqueActions.length} actions
                      </Typography>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Plan d'atténuation
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: '#F1F8F1', borderRadius: 2, mb: 3, borderLeft: '3px solid #2E7D32' }}>
                        <Typography variant="body2">{risque.plan_attenuation || 'Aucun plan défini'}</Typography>
                      </Paper>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Actions de mitigation
                        </Typography>
                        <Button
                          size="small"
                          startIcon={<GoogleIcon name="add" size={16} />}
                          onClick={() => handleOpenActionDialog(risque)}
                          sx={{ color: '#2E7D32' }}
                        >
                          Ajouter une action
                        </Button>
                      </Box>

                      {risqueActions.length === 0 ? (
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Aucune action définie pour ce risque
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Responsable</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Échéance</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Résultat</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {risqueActions.map((action) => {
                                const sCfg = statutActionConfig[action.statut] || statutActionConfig['prevue'];
                                return (
                                  <TableRow key={action.id} sx={{ '&:hover': { bgcolor: '#F9FBF9' } }}>
                                    <TableCell sx={{ maxWidth: 200 }}>
                                      <Typography variant="body2">{action.action}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption">{action.responsable}</Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption">
                                        {new Date(action.date_fin).toLocaleDateString('fr-FR')}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        label={sCfg.label}
                                        size="small"
                                        sx={{ bgcolor: sCfg.bg, color: sCfg.color, fontSize: '0.7rem' }}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      <Typography variant="caption" color="text.secondary">
                                        {action.resultat || '—'}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Tooltip title="Modifier">
                                        <IconButton size="small" onClick={() => handleOpenActionDialog(risque, action)}>
                                          <GoogleIcon name="edit" size={16} />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Supprimer">
                                        <IconButton size="small" color="error" onClick={() => handleDeleteAction(action.id)}>
                                          <GoogleIcon name="delete" size={16} />
                                        </IconButton>
                                      </Tooltip>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Paper sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Informations</Typography>
                        <Divider sx={{ mb: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">Responsable</Typography>
                          <Typography variant="body2" fontWeight={500}>{risque.responsable}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">Province(s)</Typography>
                          <Typography variant="body2">{risque.province || '—'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">Identification</Typography>
                          <Typography variant="body2">
                            {new Date(risque.date_identification).toLocaleDateString('fr-FR')}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">Dernier suivi</Typography>
                          <Typography variant="body2">
                            {risque.dernier_suivi
                              ? new Date(risque.dernier_suivi).toLocaleDateString('fr-FR')
                              : '—'}
                          </Typography>
                        </Box>
                        <Divider sx={{ my: 1.5 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">Progression</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ width: 70, height: 6, borderRadius: 2 }}
                            />
                            <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
                          </Box>
                        </Box>
                      </Paper>

                      {(risque.indicateurs_surveillance || []).length > 0 && (
                        <Paper sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2, mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Indicateurs de surveillance</Typography>
                          <Stack spacing={0.5}>
                            {(risque.indicateurs_surveillance || []).map((ind, i) => (
                              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <GoogleIcon name="fiber_manual_record" size={8} sx={{ color: '#2E7D32' }} />
                                <Typography variant="caption">{ind}</Typography>
                              </Box>
                            ))}
                          </Stack>
                        </Paper>
                      )}
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Stack>
      )}

      {/* Dialog pour ajouter/modifier une action */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedAction ? 'Modifier l\'action' : 'Ajouter une action'}
          {selectedRisque && (
            <Typography variant="caption" display="block" color="text.secondary">
              Pour le risque: {selectedRisque.code} - {selectedRisque.nom}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Action"
                multiline
                rows={2}
                value={actionForm.action}
                onChange={(e) => setActionForm({ ...actionForm, action: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Responsable"
                value={actionForm.responsable}
                onChange={(e) => setActionForm({ ...actionForm, responsable: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={actionForm.statut}
                  label="Statut"
                  onChange={(e) => setActionForm({ ...actionForm, statut: e.target.value as any })}
                >
                  <MenuItem value="prevue">Prévue</MenuItem>
                  <MenuItem value="en_cours">En cours</MenuItem>
                  <MenuItem value="realisee">Réalisée</MenuItem>
                  <MenuItem value="abandonnee">Abandonnée</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Date de début"
                value={actionForm.date_debut}
                onChange={(e) => setActionForm({ ...actionForm, date_debut: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Date de fin"
                value={actionForm.date_fin}
                onChange={(e) => setActionForm({ ...actionForm, date_fin: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Résultat / Observations"
                multiline
                rows={2}
                value={actionForm.resultat}
                onChange={(e) => setActionForm({ ...actionForm, resultat: e.target.value })}
                placeholder="Décrire le résultat obtenu (si réalisée)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleSaveAction} 
            disabled={saving || !actionForm.action || !actionForm.responsable || !actionForm.date_fin}
            sx={{ bgcolor: '#2E7D32', borderRadius: 2 }}
          >
            {saving ? 'Enregistrement...' : (selectedAction ? 'Mettre à jour' : 'Ajouter')}
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

export default PlanAttenuation;