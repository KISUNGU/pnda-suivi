// frontend/src/pages/Outils/Calculateur/IndicateurCalculator.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  FormControl,
  Select,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer,
} from 'recharts';
import GoogleIcon from '../../../components/common/GoogleIcon';
import { calculateurService } from '../../../services/calculateur.service';
import type { IndicateurDefinition, CalculResult, HistoriqueCalculEntry } from '../../../services/calculateur.service';

interface HistoriqueEntry {
  date: string;
  code: string;
  nom: string;
  valeur: number;
  unite: string;
  interpretation: string;
}

const formatHistoriqueDate = (value: string) => {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString('fr-FR');
};

const mapHistoriqueEntry = (entry: HistoriqueCalculEntry): HistoriqueEntry => ({
  date: formatHistoriqueDate(entry.date),
  code: entry.indicateur_code,
  nom: entry.indicateur_nom,
  valeur: Number(entry.valeur),
  unite: entry.unite,
  interpretation: entry.interpretation,
});

const getCategorieColor = (type: string) => type === 'iodp' ? '#2E7D32' : '#1976D2';

const getStatutLabel = (progression: number) => {
  if (progression >= 100) return { label: 'Atteint', color: '#2E7D32', icon: 'check_circle' };
  if (progression >= 70)  return { label: 'En bonne voie', color: '#4CAF50', icon: 'trending_up' };
  if (progression >= 40)  return { label: 'Effort requis', color: '#FF9800', icon: 'warning' };
  return { label: 'Critique', color: '#F44336', icon: 'error' };
};

// ---------------------------------------------------------------------------
export const IndicateurCalculator: React.FC = () => {
  const [indicateurs, setIndicateurs] = useState<IndicateurDefinition[]>([]);
  const [selectedIndicateur, setSelectedIndicateur] = useState<IndicateurDefinition | null>(null);
  const [donnees, setDonnees] = useState<Record<string, number | undefined>>({});
  const [resultat, setResultat] = useState<CalculResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historique, setHistorique] = useState<HistoriqueEntry[]>([]);
  const [historiqueOpen, setHistoriqueOpen] = useState(false);
  const [filtreType, setFiltreType] = useState<'tous' | 'iodp' | 'ir'>('tous');
  const [filtreRecherche, setFiltreRecherche] = useState('');

  useEffect(() => {
    const loadCalculateurData = async () => {
      try {
        const [indicateursRes, historiqueRes] = await Promise.all([
          calculateurService.getIndicateurs(),
          calculateurService.getHistorique(),
        ]);

        setIndicateurs(indicateursRes.data);
        setHistorique(historiqueRes.data.map(mapHistoriqueEntry));
      } catch {
        setError('Impossible de charger les indicateurs du calculateur.');
      } finally {
        setLoading(false);
      }
    };

    loadCalculateurData();
  }, []);

  const handleSelectIndicateur = (ind: IndicateurDefinition) => {
    setSelectedIndicateur(ind);
    setDonnees({});
    setResultat(null);
    setError(null);
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setDonnees((prev) => ({
      ...prev,
      [fieldId]: value === '' ? undefined : Number.parseFloat(value),
    }));
  };

  const handleExport = async () => {
    try {
      const response = await calculateurService.exporter('excel');
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = `calculs_indicateurs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Impossible d’exporter l’historique des calculs.');
    }
  };

  const handleCalculer = async () => {
    if (!selectedIndicateur) return;

    const champsManquants = selectedIndicateur.champs
      .filter((champ) => champ.required && (donnees[champ.id] === undefined || Number.isNaN(donnees[champ.id] ?? NaN)))
      .map(c => c.label);
    if (champsManquants.length > 0) {
      setError(`Veuillez renseigner : ${champsManquants.join(', ')}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiRes = await calculateurService.calculer(selectedIndicateur.code, donnees);
      setResultat(apiRes.data);

      const historiqueRes = await calculateurService.getHistorique();
      setHistorique(historiqueRes.data.map(mapHistoriqueEntry));
    } catch {
      setError('Impossible de calculer cet indicateur avec les données de la base.');
    } finally {
      setLoading(false);
    }
  };

  const filteredIndicateurs = indicateurs.filter(ind => {
    const matchType = filtreType === 'tous' || ind.type === filtreType;
    const matchSearch = ind.nom.toLowerCase().includes(filtreRecherche.toLowerCase()) ||
      ind.code.toLowerCase().includes(filtreRecherche.toLowerCase());
    return matchType && matchSearch;
  });

  // Données pour le mini-graphique de comparaison
  const cibleCourante = resultat?.cible ?? selectedIndicateur?.cible ?? null;

  const chartData = selectedIndicateur && resultat && typeof cibleCourante === 'number'
    ? [
        { name: 'Réalisé', valeur: resultat.valeur, fill: '#2E7D32' },
        { name: 'Cible', valeur: cibleCourante, fill: 'rgba(148, 163, 184, 0.45)' },
      ]
    : [];

  if (loading && indicateurs.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
          Calculateur d'indicateurs
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Calcul automatique des indicateurs IODP et IR selon les formules du manuel de suivi-évaluation
        </Typography>
      </Box>

      {error && indicateurs.length === 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {/* Cartes résumé */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Indicateurs disponibles', value: indicateurs.length, icon: 'bar_chart', color: '#2E7D32' },
          { label: 'Indicateurs IODP', value: indicateurs.filter(i => i.type === 'iodp').length, icon: 'trending_up', color: '#1976D2' },
          { label: 'Indicateurs IR', value: indicateurs.filter(i => i.type === 'ir').length, icon: 'assessment', color: '#7B1FA2' },
          { label: 'Calculs effectués', value: historique.length, icon: 'history', color: '#FF9800' },
        ].map((kpi) => (
          <Grid size={{ xs: 6, md: 3 }} key={kpi.label}>
            <Paper sx={{ p: 2, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ bgcolor: `${kpi.color}15`, borderRadius: '50%', p: 1.2, display: 'flex' }}>
                <GoogleIcon name={kpi.icon} size={24} sx={{ color: kpi.color }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700} color={kpi.color}>{kpi.value}</Typography>
                <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* ── Liste des indicateurs ── */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Rechercher…"
                value={filtreRecherche}
                onChange={(e) => setFiltreRecherche(e.target.value)}
                InputProps={{
                  startAdornment: <GoogleIcon name="search" size={18} sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select value={filtreType} onChange={(e) => setFiltreType(e.target.value as typeof filtreType)}>
                  <MenuItem value="tous">Tous</MenuItem>
                  <MenuItem value="iodp">IODP</MenuItem>
                  <MenuItem value="ir">IR</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            <Box sx={{ maxHeight: 520, overflowY: 'auto', pr: 0.5 }}>
              {filteredIndicateurs.map((ind) => {
                const isSelected = selectedIndicateur?.id === ind.id;
                return (
                  <Card
                    key={ind.id}
                    sx={{
                      mb: 1, cursor: 'pointer',
                      borderLeft: `4px solid ${isSelected ? getCategorieColor(ind.type) : 'transparent'}`,
                      bgcolor: isSelected ? '#F1F8E9' : 'white',
                      boxShadow: isSelected ? 2 : 0,
                      '&:hover': { bgcolor: isSelected ? '#F1F8E9' : '#F9F9F9' },
                      transition: 'all .15s',
                    }}
                    onClick={() => handleSelectIndicateur(ind)}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {ind.code}
                          </Typography>
                          <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3 }}>
                            {ind.nom}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">{ind.composante}</Typography>
                        </Box>
                        <Chip
                          label={ind.type.toUpperCase()}
                          size="small"
                          sx={{ bgcolor: getCategorieColor(ind.type) + '15', color: getCategorieColor(ind.type), fontSize: '0.68rem', flexShrink: 0 }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* ── Panneau principal ── */}
        <Grid size={{ xs: 12, md: 8 }}>
          {selectedIndicateur ? (
            <Stack spacing={2}>
              {/* Détails de l'indicateur */}
              <Paper sx={{ p: 3, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                      <Chip
                        label={selectedIndicateur.type.toUpperCase()}
                        size="small"
                        sx={{ bgcolor: getCategorieColor(selectedIndicateur.type) + '15', color: getCategorieColor(selectedIndicateur.type) }}
                      />
                      <Chip label={selectedIndicateur.composante} size="small" variant="outlined" />
                      <Chip label={`Fréquence : ${selectedIndicateur.frequence}`} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedIndicateur.code} — {selectedIndicateur.nom}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {selectedIndicateur.description}
                    </Typography>
                  </Box>
                  <Tooltip title="Historique des calculs">
                    <IconButton onClick={() => setHistoriqueOpen(true)} sx={{ ml: 1 }}>
                      <GoogleIcon name="history" size={22} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Formule */}
                <Accordion disableGutters elevation={0} sx={{ bgcolor: 'action.hover', borderRadius: 2, border: '1px solid #DCE775', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<GoogleIcon name="expand_more" size={20} />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <GoogleIcon name="functions" size={18} sx={{ color: '#2E7D32' }} />
                      <Typography variant="subtitle2" fontWeight={600} color="#2E7D32">Formule de calcul</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      sx={{ fontFamily: 'monospace', fontSize: '0.9rem', bgcolor: 'background.paper', borderRadius: 1, p: 1.5 }}
                    >
                      {selectedIndicateur.formule}
                    </Typography>
                    {typeof selectedIndicateur.cible === 'number' && (
                      <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                        <Chip size="small" label={`Cible : ${selectedIndicateur.cible} ${selectedIndicateur.unite}`} color="success" variant="outlined" />
                      </Stack>
                    )}
                  </AccordionDetails>
                </Accordion>

                <Divider sx={{ my: 2 }} />

                {/* Champs de saisie */}
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Données à saisir
                </Typography>
                <Grid container spacing={2} sx={{ mb: 2 }}>
                  {selectedIndicateur.champs.map((champ) => (
                    <Grid size={{ xs: 12, md: 6 }} key={champ.id}>
                      <TextField
                        fullWidth
                        label={champ.label}
                        type="number"
                        value={donnees[champ.id] ?? ''}
                        onChange={(e) => handleFieldChange(champ.id, e.target.value)}
                        required={champ.required}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  ))}
                </Grid>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    onClick={handleCalculer}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <GoogleIcon name="calculate" size={18} />}
                    sx={{ bgcolor: '#2E7D32' }}
                  >
                    {loading ? 'Calcul…' : 'Calculer'}
                  </Button>
                  {resultat && (
                    <Button variant="outlined" startIcon={<GoogleIcon name="cloud_done" size={18} />} disabled>
                      Sauvegardé automatiquement
                    </Button>
                  )}
                  <Button
                    variant="text"
                    startIcon={<GoogleIcon name="restart_alt" size={18} />}
                    onClick={() => { setDonnees({}); setResultat(null); setError(null); }}
                  >
                    Réinitialiser
                  </Button>
                </Stack>
              </Paper>

              {/* ── Résultat ── */}
              {resultat && (() => {
                const cible = resultat.cible ?? selectedIndicateur.cible ?? null;
                const prog = resultat.progression ?? (typeof cible === 'number' && cible > 0 ? (resultat.valeur / cible) * 100 : 0);
                const statut = getStatutLabel(prog);
                return (
                  <Paper sx={{ p: 3, borderRadius: 2, border: `2px solid ${statut.color}20` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>Résultat du calcul</Typography>
                      <Chip
                        label={statut.label}
                        icon={<GoogleIcon name={statut.icon} size={16} sx={{ color: statut.color }} />}
                        sx={{ bgcolor: `${statut.color}15`, color: statut.color, fontWeight: 700 }}
                      />
                    </Stack>

                    <Grid container spacing={3}>
                      {/* Valeur principale */}
                      <Grid size={{ xs: 12, md: typeof cible === 'number' ? 6 : 12 }}>
                        <Box sx={{ bgcolor: `${statut.color}08`, borderRadius: 2, p: 2.5, height: '100%' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>VALEUR CALCULÉE</Typography>
                          <Typography variant="h2" fontWeight={800} sx={{ color: statut.color, lineHeight: 1.1, my: 1 }}>
                            {resultat.valeur.toLocaleString()}
                            <Typography component="span" variant="h5" fontWeight={400} sx={{ ml: 0.5, color: 'text.secondary' }}>
                              {resultat.unite}
                            </Typography>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">{resultat.interpretation}</Typography>
                        </Box>
                      </Grid>

                      {/* Progression vers cible */}
                      {typeof cible === 'number' && (
                        <Grid size={{ xs: 12, md: 6 }}>
                          <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2.5, height: '100%' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>PROGRESSION VERS LA CIBLE</Typography>
                            <Typography variant="h3" fontWeight={800} sx={{ color: statut.color, lineHeight: 1.1, my: 1 }}>
                              {Math.min(prog, 100).toFixed(1)}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(prog, 100)}
                              sx={{
                                height: 10, borderRadius: 5, mb: 1,
                                bgcolor: 'action.selected',
                                '& .MuiLinearProgress-bar': { bgcolor: statut.color, borderRadius: 5 },
                              }}
                            />
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">0</Typography>
                              <Typography variant="caption" color="text.secondary">
                                Cible : {cible} {resultat.unite}
                              </Typography>
                            </Stack>
                          </Box>
                        </Grid>
                      )}
                    </Grid>

                    {/* Mini graphique comparatif */}
                    {chartData.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                          Comparaison réalisé / seuils
                        </Typography>
                        <ResponsiveContainer width="100%" height={160}>
                          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tickFormatter={(v) => v.toLocaleString()} />
                            <YAxis type="category" dataKey="name" width={70} />
                            <RechartTooltip formatter={(v) => `${Number(v ?? 0).toLocaleString()} ${resultat.unite}`} />
                            <Bar dataKey="valeur" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    )}

                    {/* Recommandations */}
                    {resultat.recommandations && resultat.recommandations.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Accordion disableGutters elevation={0} sx={{ bgcolor: 'rgba(250, 178, 25, 0.14)', borderRadius: 2, border: '1px solid #FFE082', '&:before': { display: 'none' } }} defaultExpanded>
                          <AccordionSummary expandIcon={<GoogleIcon name="expand_more" size={20} />}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <GoogleIcon name="lightbulb" size={18} sx={{ color: '#F9A825' }} />
                              <Typography variant="subtitle2" fontWeight={600} color="#F57F17">
                                Recommandations ({resultat.recommandations.length})
                              </Typography>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Stack spacing={1}>
                              {resultat.recommandations.map((rec, idx) => (
                                <Stack key={idx} direction="row" spacing={1} alignItems="center">
                                  <GoogleIcon name="arrow_right" size={18} sx={{ color: '#F9A825', flexShrink: 0 }} />
                                  <Typography variant="body2">{rec}</Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      </>
                    )}
                  </Paper>
                );
              })()}
            </Stack>
          ) : (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
              <GoogleIcon name="calculate" size={72} sx={{ color: 'text.disabled' }} />
              <Typography variant="h6" color="text.secondary">Sélectionnez un indicateur</Typography>
              <Typography variant="body2" color="text.disabled">
                Choisissez un indicateur dans la liste de gauche pour saisir vos données et obtenir le calcul automatique.
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* ── Dialog historique ── */}
      <Dialog open={historiqueOpen} onClose={() => setHistoriqueOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GoogleIcon name="history" size={22} />
            <Typography variant="h6">Historique des calculs</Typography>
            <Chip label={`${historique.length} calculs`} size="small" sx={{ ml: 'auto' }} />
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {historique.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">Aucun calcul enregistré</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell><strong>Date</strong></TableCell>
                    <TableCell><strong>Indicateur</strong></TableCell>
                    <TableCell align="right"><strong>Valeur</strong></TableCell>
                    <TableCell><strong>Interprétation</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historique.map((h, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{h.date}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" display="block">{h.code}</Typography>
                        <Typography variant="body2">{h.nom}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>{h.valeur.toLocaleString()} {h.unite}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{h.interpretation}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoriqueOpen(false)}>Fermer</Button>
          <Button variant="contained" sx={{ bgcolor: '#2E7D32' }} startIcon={<GoogleIcon name="download" size={18} />} onClick={handleExport}>
            Exporter
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default IndicateurCalculator;