// frontend/src/pages/Risques/RisqueList.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import risqueService from '../../services/risque.service';
import type { Risque, ActionAtténuation, AlerteRisque, RisqueStats, CategorieRisque, StatutRisque } from '../../services/risque.service';

const categorieConfig: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  gestion: { label: 'Gestion', icon: 'settings', color: '#1976D2', bg: '#E3F2FD' },
  technique: { label: 'Technique', icon: 'engineering', color: '#FF8F00', bg: '#FFF8E1' },
  politique: { label: 'Politique', icon: 'gavel', color: '#7B1FA2', bg: '#F3E5F5' },
  socio_economique: { label: 'Socio-économique', icon: 'trending_up', color: '#388E3C', bg: '#E8F5E9' },
  environnemental: { label: 'Environnemental', icon: 'eco', color: '#2E7D32', bg: '#E8F5E9' },
  sante_securite: { label: 'Santé & Sécurité', icon: 'health_and_safety', color: '#D32F2F', bg: '#FFEBEE' },
};

const niveauConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  Faible: { label: 'Faible', color: '#4CAF50', bg: '#E8F5E9', icon: 'check_circle' },
  Modéré: { label: 'Modéré', color: '#FFC107', bg: '#FFF8E1', icon: 'warning' },
  Élevé: { label: 'Élevé', color: '#FF9800', bg: '#FFF3E0', icon: 'priority_high' },
  Critique: { label: 'Critique', color: '#F44336', bg: '#FFEBEE', icon: 'error' },
};

const statutConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  identifie: { label: 'Identifié', color: '#9E9E9E', bg: '#F5F5F5', icon: 'info' },
  en_cours: { label: 'En cours', color: '#FF9800', bg: '#FFF3E0', icon: 'pending' },
  atténue: { label: 'Atténué', color: '#4CAF50', bg: '#E8F5E9', icon: 'check_circle' },
  cloture: { label: 'Clôturé', color: '#607D8B', bg: '#ECEFF1', icon: 'done_all' },
};

export const RisqueList: React.FC = () => {
  const [risques, setRisques] = useState<Risque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<RisqueStats | null>(null);
  const [alertes, setAlertes] = useState<AlerteRisque[]>([]);
  const [actions, setActions] = useState<Record<number, ActionAtténuation[]>>({});
  const [tabValue, setTabValue] = useState(0);
  const [selectedRisque, setSelectedRisque] = useState<Risque | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Risque>>({});
  const [expandedAccordion, setExpandedAccordion] = useState<number | false>(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [risquesRes, statsRes, alertesRes] = await Promise.all([
        risqueService.getAll(),
        risqueService.getStats(),
        risqueService.getAlertes(),
      ]);
      setRisques(risquesRes.data);
      setStats(statsRes.data);
      setAlertes(alertesRes.data);
    } catch (err) {
      console.error('Erreur chargement risques:', err);
      setError('Impossible de charger les données des risques');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActions = useCallback(async (risqueId: number) => {
    try {
      const res = await risqueService.getActions(risqueId);
      setActions(prev => ({ ...prev, [risqueId]: res.data }));
    } catch (err) {
      console.error('Erreur chargement actions:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDialog = (risque?: Risque) => {
    if (risque) {
      setSelectedRisque(risque);
      setFormData(risque);
      loadActions(risque.id);
    } else {
      setSelectedRisque(null);
      setFormData({
        categorie: 'gestion',
        probabilite: 3,
        impact: 3,
        statut: 'identifie',
        date_identification: new Date().toISOString().split('T')[0],
      });
    }
    setDialogOpen(true);
  };

  const handleOpenDetail = (risque: Risque) => {
    setSelectedRisque(risque);
    loadActions(risque.id);
    setDetailDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedRisque) {
        await risqueService.update(selectedRisque.id, formData);
        setSnackbar({ open: true, message: 'Risque mis à jour avec succès', severity: 'success' });
      } else {
        await risqueService.create(formData);
        setSnackbar({ open: true, message: 'Risque créé avec succès', severity: 'success' });
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erreur lors de l\'enregistrement', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce risque ?')) {
      try {
        await risqueService.delete(id);
        setSnackbar({ open: true, message: 'Risque supprimé avec succès', severity: 'success' });
        loadData();
      } catch (err) {
        console.error(err);
        setSnackbar({ open: true, message: 'Erreur lors de la suppression', severity: 'error' });
      }
    }
  };

  const handleMarquerLue = async (id: number) => {
    try {
      await risqueService.marquerAlerteLue(id);
      setAlertes(prev => prev.map(a => a.id === id ? { ...a, est_lue: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  const getFilteredRisques = () => {
    if (tabValue === 0) return risques;
    if (tabValue === 1) return risques.filter(r => r.niveau === 'Critique');
    if (tabValue === 2) return risques.filter(r => r.niveau === 'Élevé');
    if (tabValue === 3) return risques.filter(r => r.niveau === 'Modéré');
    if (tabValue === 4) return risques.filter(r => r.statut === 'en_cours');
    if (tabValue === 5) return risques.filter(r => r.statut === 'atténue' || r.statut === 'cloture');
    return risques;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  const filteredRisques = getFilteredRisques();
  const alertesNonLues = alertes.filter(a => !a.est_lue);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Gestion des risques
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Identification, évaluation, suivi et atténuation des risques du programme
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Alertes actives */}
      {alertesNonLues.length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<GoogleIcon name="notifications_active" size={20} />}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2">
              <strong>{alertesNonLues.length} alerte(s) non lue(s)</strong> - Des risques critiques nécessitent votre attention
            </Typography>
            <Button size="small" variant="outlined" sx={{ borderRadius: 2 }} onClick={() => setTabValue(7)}>
              Voir les alertes
            </Button>
          </Box>
        </Alert>
      )}

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Total risques"
              value={stats.total.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="warning" size={36} />}
              trend={{ value: stats.critiques, direction: 'up', period: 'risques critiques' }}
              color="primary"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Critiques"
              value={stats.critiques.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="error" size={36} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.critiques / stats.total) * 100) : 0, direction: 'down', period: 'du portefeuille' }}
              color="danger"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Élevés"
              value={stats.eleves.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="priority_high" size={36} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.eleves / stats.total) * 100) : 0, direction: 'up', period: 'du portefeuille' }}
              color="warning"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <GradientWidget
              title="Atténués/Clôturés"
              value={stats.attenues.toLocaleString('fr-FR')}
              icon={<GoogleIcon name="check_circle" size={36} />}
              trend={{ value: stats.total > 0 ? Math.round((stats.attenues / stats.total) * 100) : 0, direction: 'up', period: 'du portefeuille' }}
              color="success"
            />
          </Grid>
        </Grid>
      )}

      {/* Matrice d'évaluation */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <GoogleIcon name="grid_view" size={24} sx={{ color: '#2E7D32' }} />
          <Typography variant="h6" fontWeight={600}>
            Matrice d'évaluation des risques
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5', fontWeight: 600 }}>Impact \ Probabilité</th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>1<br/><span style={{ fontSize: 11 }}>Très faible</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>2<br/><span style={{ fontSize: 11 }}>Faible</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>3<br/><span style={{ fontSize: 11 }}>Moyenne</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>4<br/><span style={{ fontSize: 11 }}>Élevée</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>5<br/><span style={{ fontSize: 11 }}>Très élevée</span></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((impact) => (
                <tr key={impact}>
                  <td style={{ padding: 12, fontWeight: 500, backgroundColor: '#FAFAFA' }}>
                    {impact}<br/><span style={{ fontSize: 11 }}>
                      {impact === 1 ? 'Très faible' : impact === 2 ? 'Faible' : impact === 3 ? 'Moyen' : impact === 4 ? 'Élevé' : 'Très élevé'}
                    </span>
                  </td>
                  {[1, 2, 3, 4, 5].map((prob) => {
                    const score = impact * prob;
                    let bgColor = '#E8F5E9';
                    let textColor = '#2E7D32';
                    let label = 'Faible';
                    if (score >= 20) { bgColor = '#FFEBEE'; textColor = '#C62828'; label = 'Critique'; }
                    else if (score >= 12) { bgColor = '#FFF3E0'; textColor = '#EF6C00'; label = 'Élevé'; }
                    else if (score >= 6) { bgColor = '#FFF8E1'; textColor = '#F9A825'; label = 'Modéré'; }
                    
                    return (
                      <td key={prob} style={{ padding: 12, backgroundColor: bgColor, color: textColor, fontWeight: 500 }}>
                        {label}<br/>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>({score})</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Onglets */}
      <Tabs 
        value={tabValue} 
        onChange={(_, v) => setTabValue(v)} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Tous" icon={<GoogleIcon name="list" size={18} />} iconPosition="start" />
        <Tab label="Critiques" icon={<GoogleIcon name="error" size={18} />} iconPosition="start" />
        <Tab label="Élevés" icon={<GoogleIcon name="priority_high" size={18} />} iconPosition="start" />
        <Tab label="Modérés" icon={<GoogleIcon name="warning" size={18} />} iconPosition="start" />
        <Tab label="En cours" icon={<GoogleIcon name="pending" size={18} />} iconPosition="start" />
        <Tab label="Atténués" icon={<GoogleIcon name="check_circle" size={18} />} iconPosition="start" />
        <Tab label="Plans d'atténuation" icon={<GoogleIcon name="security" size={18} />} iconPosition="start" />
        <Tab label="Alertes" icon={<GoogleIcon name="notifications_active" size={18} />} iconPosition="start" />
      </Tabs>

      {/* Export pour les onglets de liste */}
      {tabValue < 6 && risques.length > 0 && (
        <ExportToolbar
          title="Registre des Risques"
          subtitle="Identification et suivi des risques du projet"
          columns={[
            { header: 'Code', key: 'code', width: 12 },
            { header: 'Nom', key: 'nom', width: 40 },
            { header: 'Catégorie', key: 'categorie', width: 18 },
            { header: 'Niveau', key: 'niveau', width: 12 },
            { header: 'Probabilité', key: 'probabilite', width: 14 },
            { header: 'Impact', key: 'impact', width: 10 },
            { header: 'Score (P×I)', key: 'score', width: 12 },
            { header: 'Statut', key: 'statut', width: 14 },
            { header: 'Responsable', key: 'responsable', width: 26 },
            { header: 'Province', key: 'province', width: 22 },
          ]}
          getData={() => filteredRisques.map((r) => ({
            code: r.code,
            nom: r.nom,
            categorie: r.categorie,
            niveau: r.niveau,
            probabilite: r.probabilite,
            impact: r.impact,
            score: r.probabilite * r.impact,
            statut: r.statut,
            responsable: r.responsable,
            province: r.province || '',
          }))}
          filename="risques"
          landscape
        />
      )}

      {/* Plans d'atténuation */}
      {tabValue === 6 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, mt: 1 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#2E7D32' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Risque</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Niveau</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 260 }}>Plan d'atténuation</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Actions prévues</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Responsable</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {risques.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">Aucun risque enregistré</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                risques.map((risque, idx) => (
                  <TableRow key={risque.id} sx={{ bgcolor: idx % 2 === 0 ? 'white' : '#F9FBF9' }}>
                    <TableCell>
                      <Chip label={risque.code} size="small" sx={{ bgcolor: '#2E7D32', color: 'white', borderRadius: 1 }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500, maxWidth: 180 }}>
                      <Typography variant="body2">{risque.nom}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={niveauConfig[risque.niveau]?.label || risque.niveau} size="small" sx={{ bgcolor: niveauConfig[risque.niveau]?.bg, color: niveauConfig[risque.niveau]?.color }} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{risque.plan_atténuation}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220 }}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {(risque.actions_prevues ?? []).slice(0, 2).map((a, i) => (
                          <Chip key={i} label={a} size="small" variant="outlined" sx={{ fontSize: '0.7rem', m: 0.25 }} />
                        ))}
                        {(risque.actions_prevues ?? []).length > 2 && (
                          <Chip label={`+${(risque.actions_prevues ?? []).length - 2}`} size="small" sx={{ m: 0.25 }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{risque.responsable}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={statutConfig[risque.statut]?.label || risque.statut} size="small" sx={{ bgcolor: statutConfig[risque.statut]?.bg, color: statutConfig[risque.statut]?.color }} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Alertes */}
      {tabValue === 7 && (
        <Stack spacing={2} sx={{ mt: 1 }}>
          {alertes.length === 0 ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>Aucune alerte active</Alert>
          ) : (
            alertes.map((alerte) => (
              <Alert
                key={alerte.id}
                severity={alerte.niveau === 'danger' ? 'error' : alerte.niveau === 'warning' ? 'warning' : 'info'}
                sx={{ borderRadius: 2, opacity: alerte.est_lue ? 0.55 : 1 }}
                action={
                  !alerte.est_lue ? (
                    <Button size="small" onClick={() => handleMarquerLue(alerte.id)}>
                      Marquer lue
                    </Button>
                  ) : undefined
                }
              >
                <Box>
                  <Typography variant="body2" fontWeight={alerte.est_lue ? 400 : 600}>
                    [{alerte.risque_code}] {alerte.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alerte.date_alerte).toLocaleString()}
                    {alerte.est_lue && ' • Lue'}
                  </Typography>
                </Box>
              </Alert>
            ))
          )}
        </Stack>
      )}

      {/* Liste des risques */}
      {tabValue < 6 && (
        <Grid container spacing={3}>
          {filteredRisques.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">Aucun risque ne correspond aux critères sélectionnés</Alert>
            </Grid>
          ) : (
            filteredRisques.map((risque) => (
              <Grid size={{ xs: 12 }} key={risque.id}>
                <Accordion 
                  expanded={expandedAccordion === risque.id}
                  onChange={() => setExpandedAccordion(expandedAccordion === risque.id ? false : risque.id)}
                  sx={{ borderRadius: 2, '&:before': { display: 'none' }, mb: 1 }}
                >
                  <AccordionSummary expandIcon={<GoogleIcon name="expand_more" />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: '100%' }}>
                      <Chip 
                        label={risque.code} 
                        size="small" 
                        sx={{ bgcolor: '#2E7D32', color: 'white', borderRadius: 1 }}
                      />
                      <Chip 
                        label={categorieConfig[risque.categorie]?.label || risque.categorie}
                        size="small"
                        sx={{ bgcolor: categorieConfig[risque.categorie]?.bg, color: categorieConfig[risque.categorie]?.color }}
                      />
                      <Chip 
                        label={niveauConfig[risque.niveau]?.label || risque.niveau}
                        size="small"
                        icon={<GoogleIcon name={niveauConfig[risque.niveau]?.icon || 'warning'} size={14} />}
                        sx={{ bgcolor: niveauConfig[risque.niveau]?.bg, color: niveauConfig[risque.niveau]?.color }}
                      />
                      <Typography variant="body1" fontWeight={500} sx={{ flex: 1 }}>
                        {risque.nom}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 100 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={(risque.probabilite * risque.impact) / 25 * 100} 
                            sx={{ height: 6, borderRadius: 2 }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          Score: {risque.probabilite * risque.impact}/25
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 12, md: 8 }}>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Description
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {risque.description}
                          </Typography>
                          
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Plan d'atténuation
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, mb: 2 }}>
                            <Typography variant="body2">{risque.plan_atténuation}</Typography>
                          </Paper>
                          
                          {risque.actions_prevues && risque.actions_prevues.length > 0 && (
                            <>
                              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                Actions prévues
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                                {risque.actions_prevues.map((action, idx) => (
                                  <Chip key={idx} label={action} size="small" variant="outlined" />
                                ))}
                              </Stack>
                            </>
                          )}
                        </Grid>
                        
                        <Grid size={{ xs: 12, md: 4 }}>
                          <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Informations clés</Typography>
                            <Divider sx={{ my: 1 }} />
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">Responsable</Typography>
                              <Typography variant="caption" fontWeight={500}>{risque.responsable}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">Date d'identification</Typography>
                              <Typography variant="caption">{new Date(risque.date_identification).toLocaleDateString()}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">Dernier suivi</Typography>
                              <Typography variant="caption">{risque.dernier_suivi ? new Date(risque.dernier_suivi).toLocaleDateString() : '-'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">Province(s)</Typography>
                              <Typography variant="caption">{risque.province || '-'}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Typography variant="caption" color="text.secondary">Statut</Typography>
                              <Chip label={statutConfig[risque.statut]?.label || risque.statut} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button 
                          size="small" 
                          startIcon={<GoogleIcon name="visibility" size={16} />}
                          onClick={() => handleOpenDetail(risque)}
                        >
                          Voir détails
                        </Button>
                        <Button 
                          size="small" 
                          startIcon={<GoogleIcon name="edit" size={16} />}
                          onClick={() => handleOpenDialog(risque)}
                        >
                          Modifier
                        </Button>
                        <Button 
                          size="small" 
                          color="error"
                          startIcon={<GoogleIcon name="delete" size={16} />}
                          onClick={() => handleDelete(risque.id)}
                        >
                          Supprimer
                        </Button>
                      </Box>
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Bouton d'ajout flottant */}
      <Button
        variant="contained"
        startIcon={<GoogleIcon name="add" size={20} />}
        onClick={() => handleOpenDialog()}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: '#2E7D32',
          borderRadius: 2,
          boxShadow: 3,
          '&:hover': { bgcolor: '#1B5E20' }
        }}
      >
        Nouveau risque
      </Button>

      {/* Dialog d'ajout/modification */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRisque ? 'Modifier le risque' : 'Nouveau risque'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Nom du risque"
                value={formData.nom || ''}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={formData.categorie || 'gestion'}
                  label="Catégorie"
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value as CategorieRisque })}
                >
                  {Object.entries(categorieConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Probabilité (1-5)"
                value={formData.probabilite || 3}
                onChange={(e) => setFormData({ ...formData, probabilite: parseInt(e.target.value) as 1|2|3|4|5 })}
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Impact (1-5)"
                value={formData.impact || 3}
                onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) as 1|2|3|4|5 })}
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Plan d'atténuation"
                multiline
                rows={3}
                value={formData.plan_atténuation || ''}
                onChange={(e) => setFormData({ ...formData, plan_atténuation: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Responsable"
                value={formData.responsable || ''}
                onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.statut || 'identifie'}
                  label="Statut"
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value as StatutRisque })}
                >
                  {Object.entries(statutConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Province(s) concernée(s)"
                value={formData.province || ''}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Ex: Kinshasa, Kwilu, Kasaï"
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Date d'identification"
                value={formData.date_identification || new Date().toISOString().split('T')[0]}
                onChange={(e) => setFormData({ ...formData, date_identification: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button 
            variant="contained" 
            onClick={handleSave} 
            disabled={saving || !formData.nom}
            sx={{ bgcolor: '#2E7D32', borderRadius: 2 }}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de détail */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        {selectedRisque && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GoogleIcon name="warning" size={24} sx={{ color: '#2E7D32' }} />
                  <Typography variant="h6">{selectedRisque.code} - {selectedRisque.nom}</Typography>
                </Box>
                <Chip 
                  label={niveauConfig[selectedRisque.niveau]?.label || selectedRisque.niveau}
                  icon={<GoogleIcon name={niveauConfig[selectedRisque.niveau]?.icon || 'warning'} size={14} />}
                  sx={{ bgcolor: niveauConfig[selectedRisque.niveau]?.bg, color: niveauConfig[selectedRisque.niveau]?.color }}
                />
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description détaillée
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedRisque.description}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Plan d'atténuation
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, mb: 3 }}>
                    <Typography variant="body2">{selectedRisque.plan_atténuation}</Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Actions de suivi
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F5F5F5' }}>
                        <TableRow>
                          <TableCell>Action</TableCell>
                          <TableCell>Responsable</TableCell>
                          <TableCell>Date début</TableCell>
                          <TableCell>Date fin</TableCell>
                          <TableCell>Statut</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(actions[selectedRisque.id] || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} align="center">
                              <Typography variant="caption" color="text.secondary">Aucune action enregistrée</Typography>
                            </TableCell>
                          </TableRow>
                        ) : (
                          (actions[selectedRisque.id] || []).map((action) => (
                            <TableRow key={action.id}>
                              <TableCell>{action.action}</TableCell>
                              <TableCell>{action.responsable}</TableCell>
                              <TableCell>{new Date(action.date_debut).toLocaleDateString()}</TableCell>
                              <TableCell>{new Date(action.date_fin).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={action.statut === 'prevue' ? 'Prévue' : action.statut === 'en_cours' ? 'En cours' : action.statut === 'realisee' ? 'Réalisée' : 'Abandonnée'}
                                  size="small"
                                  sx={{ 
                                    bgcolor: action.statut === 'realisee' ? '#E8F5E9' : action.statut === 'en_cours' ? '#FFF8E1' : '#F5F5F5',
                                    color: action.statut === 'realisee' ? '#2E7D32' : action.statut === 'en_cours' ? '#FF8F00' : '#757575'
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Informations</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Score (P×I)</Typography>
                      <Typography variant="body2" fontWeight={500}>{selectedRisque.probabilite * selectedRisque.impact}/25</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Probabilité</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={selectedRisque.probabilite * 20} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                        <Typography variant="caption">{selectedRisque.probabilite}/5</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Impact</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={selectedRisque.impact * 20} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                        <Typography variant="caption">{selectedRisque.impact}/5</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Responsable</Typography>
                      <Typography variant="body2">{selectedRisque.responsable}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Date identification</Typography>
                      <Typography variant="body2">{new Date(selectedRisque.date_identification).toLocaleDateString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Statut</Typography>
                      <Chip label={statutConfig[selectedRisque.statut]?.label || selectedRisque.statut} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Province(s)</Typography>
                      <Typography variant="body2">{selectedRisque.province || '-'}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" onClick={() => { setDetailDialogOpen(false); handleOpenDialog(selectedRisque); }} sx={{ bgcolor: '#2E7D32' }}>
                Modifier
              </Button>
            </DialogActions>
          </>
        )}
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

export default RisqueList;