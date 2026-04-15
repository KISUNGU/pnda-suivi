// frontend/src/pages/Indicateurs/IRList.tsx

import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import indicateurService from '../../services/indicateur.service';
import type { Indicateur } from '../../services/indicateur.service';
import GoogleIcon from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';

type ComposanteGroup = {
  id: number;
  nom: string;
  indicateurs: Indicateur[];
};

type WidgetData = {
  total: number;
  atteints: number;      // >= 100%
  en_bonne_voie: number; // 70% - 99%
  en_alerte: number;     // 50% - 69%
  critiques: number;     // < 50%
  non_renseignes: number; // pas de données
  progression_moyenne: number;
};

type ComposanteWidgetData = {
  id: number;
  nom: string;
  progression_moyenne: number;
  atteints: number;
  critiques: number;
  total: number;
};

const composanteNames: Record<number, string> = {
  1: 'Productivité agricole',
  2: 'Accès au marché',
  3: 'Services publics agricoles',
  4: 'Intervention d\'urgence',
};

const composanteIcons: Record<number, ReactElement> = {
  1: <GoogleIcon name="agriculture" size={26} sx={{ color: '#2E7D32' }} />,
  2: <GoogleIcon name="storefront" size={26} sx={{ color: '#1976D2' }} />,
  3: <GoogleIcon name="public" size={26} sx={{ color: '#FF8F00' }} />,
  4: <GoogleIcon name="emergency" size={26} sx={{ color: '#D32F2F' }} />,
};

const getProgressionColor = (progression: number) => {
  if (progression >= 100) return '#2E7D32';      // Vert foncé - Atteint
  if (progression >= 70) return '#66BB6A';       // Vert clair - Bonne voie
  if (progression >= 50) return '#F9A825';       // Orange - Alerte
  return '#E53935';                               // Rouge - Critique
};

const getProgressionLabel = (progression: number): string => {
  if (progression >= 100) return 'Atteint';
  if (progression >= 70) return 'Bonne voie';
  if (progression >= 50) return 'Alerte';
  return 'Critique';
};

const formatUnite = (valeur: number, unite: string) => {
  if (unite === '%') return `${valeur.toFixed(1)}%`;
  if (unite === 'nombre') return valeur.toLocaleString('fr-FR');
  if (unite === 'km' || unite === 'ha') return `${valeur.toLocaleString('fr-FR')} ${unite}`;
  return `${valeur} ${unite}`;
};

const groupByComposante = (indicateurs: Indicateur[]): ComposanteGroup[] => {
  const groups = new Map<number, ComposanteGroup>();
  
  indicateurs.forEach((indicateur) => {
    const compId = indicateur.id_composante;
    if (!groups.has(compId)) {
      groups.set(compId, {
        id: compId,
        nom: composanteNames[compId] || `Composante ${compId}`,
        indicateurs: [],
      });
    }
    groups.get(compId)!.indicateurs.push(indicateur);
  });
  
  return Array.from(groups.values()).sort((a, b) => a.id - b.id);
};

// Calcul des statistiques globales
const calculateWidgetData = (indicateurs: Indicateur[]): WidgetData => {
  let atteints = 0;
  let en_bonne_voie = 0;
  let en_alerte = 0;
  let critiques = 0;
  let non_renseignes = 0;
  let somme_progression = 0;
  let compteur_progression = 0;

  indicateurs.forEach((ind) => {
    // Vérifier si l'indicateur a des données
    const aDesDonnees = ind.valeur_actuelle !== undefined && ind.valeur_actuelle > 0;
    
    if (!aDesDonnees) {
      non_renseignes++;
      return;
    }

    const progression = ind.progression;
    somme_progression += progression;
    compteur_progression++;

    if (progression >= 100) {
      atteints++;
    } else if (progression >= 70) {
      en_bonne_voie++;
    } else if (progression >= 50) {
      en_alerte++;
    } else {
      critiques++;
    }
  });

  return {
    total: indicateurs.length,
    atteints,
    en_bonne_voie,
    en_alerte,
    critiques,
    non_renseignes,
    progression_moyenne: compteur_progression > 0 ? Math.round(somme_progression / compteur_progression) : 0,
  };
};

// Calcul des stats par composante
const calculateComposanteWidgetData = (groups: ComposanteGroup[]): ComposanteWidgetData[] => {
  return groups.map((group) => {
    let somme_progression = 0;
    let compteur = 0;
    let atteints = 0;
    let critiques = 0;

    group.indicateurs.forEach((ind) => {
      if (ind.valeur_actuelle && ind.valeur_actuelle > 0) {
        somme_progression += ind.progression;
        compteur++;
        if (ind.progression >= 100) atteints++;
        if (ind.progression < 50) critiques++;
      }
    });

    return {
      id: group.id,
      nom: group.nom,
      progression_moyenne: compteur > 0 ? Math.round(somme_progression / compteur) : 0,
      atteints,
      critiques,
      total: group.indicateurs.length,
    };
  });
};

export function IRList() {
  const [groupedIndicateurs, setGroupedIndicateurs] = useState<ComposanteGroup[]>([]);
  const [widgetData, setWidgetData] = useState<WidgetData>({
    total: 0,
    atteints: 0,
    en_bonne_voie: 0,
    en_alerte: 0,
    critiques: 0,
    non_renseignes: 0,
    progression_moyenne: 0,
  });
  const [composanteWidgets, setComposanteWidgets] = useState<ComposanteWidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedComposante, setExpandedComposante] = useState<number | null>(1);
  const [tabValue, setTabValue] = useState(0);
  const [calculDialogOpen, setCalculDialogOpen] = useState(false);
  const [selectedIndicateur, setSelectedIndicateur] = useState<Indicateur | null>(null);
  const [valeurSaisie, setValeurSaisie] = useState('');
  const [resultatCalcul, setResultatCalcul] = useState<{ valeur: number; progression: number } | null>(null);

  useEffect(() => {
    const loadIndicateurs = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await indicateurService.getIR();
        const irIndicateurs = response.data;
        
        const groups = groupByComposante(irIndicateurs);
        setGroupedIndicateurs(groups);
        
        // Calculer les stats pour les widgets
        const stats = calculateWidgetData(irIndicateurs);
        setWidgetData(stats);
        
        const compStats = calculateComposanteWidgetData(groups);
        setComposanteWidgets(compStats);
      } catch (err) {
        console.error('Erreur API IR:', err);
        setError('Erreur de connexion au serveur.');
        setGroupedIndicateurs([]);
      } finally {
        setLoading(false);
      }
    };

    void loadIndicateurs();
  }, []);

  const visibleGroups = groupedIndicateurs.filter((group) => {
    if (tabValue === 0) return true;
    return group.id === tabValue;
  });

  const handleExpand = (id: number) => {
    setExpandedId((currentId) => (currentId === id ? null : id));
  };

  const handleToggleComposante = (composanteId: number) => {
    setExpandedComposante((currentId) => (currentId === composanteId ? null : composanteId));
  };

  const handleOpenCalcul = (indicateur: Indicateur) => {
    setSelectedIndicateur(indicateur);
    setValeurSaisie('');
    setResultatCalcul(null);
    setCalculDialogOpen(true);
  };

  const handleCalculer = async () => {
    if (!selectedIndicateur || valeurSaisie.trim() === '') {
      return;
    }

    try {
      const response = await indicateurService.calculer(selectedIndicateur.id, {
        valeur: Number.parseFloat(valeurSaisie),
      });
      setResultatCalcul(response.data);
    } catch (err) {
      console.error('Erreur calcul IR:', err);
      const valeur = Number.parseFloat(valeurSaisie);
      setResultatCalcul({
        valeur,
        progression: (valeur / selectedIndicateur.cible) * 100,
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
        Indicateurs de Résultats Intermédiaires
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Suivi des performances par composante du programme.
      </Typography>

      {error && <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert>}

      {/* ============================================ */}
      {/* WIDGETS DE SYNTHÈSE GLOBALE */}
      {/* ============================================ */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
  {/* Carte 1: Total indicateurs IR */}
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
              Indicateurs de Résultats (IR)
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
              {widgetData.total}
            </Typography>
            {/* <Typography variant="caption" color="text.secondary">
              sur 29 indicateurs totaux (dont 9 ODP)
            </Typography> */}
          </Box>
          <GoogleIcon name="analytics" size={40} sx={{ color: '#1976D2', opacity: 0.7 }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {widgetData.non_renseignes} sans données
        </Typography>
      </CardContent>
    </Card>
  </Grid>

  {/* Carte 2: Progression moyenne des IR */}
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
    <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
              Progression Moyenne (IR)
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: getProgressionColor(widgetData.progression_moyenne) }}>
              {widgetData.progression_moyenne}%
            </Typography>
          </Box>
          <GoogleIcon name="trending_up" size={40} sx={{ color: getProgressionColor(widgetData.progression_moyenne), opacity: 0.7 }} />
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(widgetData.progression_moyenne, 100)}
          sx={{ mt: 1.5, height: 6, borderRadius: '8px', bgcolor: '#E0E0E0' }}
        />
      </CardContent>
    </Card>
  </Grid>

  {/* Carte 3: Indicateurs atteints */}
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
    <Card 
      sx={{ 
        borderRadius: '16px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderLeft: '4px solid #2E7D32'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
              ✅ IR Atteints
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#2E7D32' }}>
              {widgetData.atteints}
            </Typography>
          </Box>
          <GoogleIcon name="check_circle" size={40} sx={{ color: '#2E7D32', opacity: 0.7 }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {widgetData.total > 0 ? Math.round((widgetData.atteints / widgetData.total) * 100) : 0}% des IR
        </Typography>
      </CardContent>
    </Card>
  </Grid>

  {/* Carte 4: Indicateurs critiques */}
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
    <Card 
      sx={{ 
        borderRadius: '16px', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        borderLeft: '4px solid #E53935'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
              🔴 IR Critiques
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, color: '#E53935' }}>
              {widgetData.critiques}
            </Typography>
          </Box>
          <GoogleIcon name="warning" size={40} sx={{ color: '#E53935', opacity: 0.7 }} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {widgetData.en_alerte} en alerte · {widgetData.en_bonne_voie} bonne voie
        </Typography>
      </CardContent>
    </Card>
  </Grid>
</Grid>

{/* Ajouter une note explicative */}
<Alert severity="info" sx={{ mb: 3 }}>
  <strong>📊 À savoir :</strong> Cette page affiche les <strong>20 Indicateurs de Résultats (IR)</strong> du programme. 
  Les <strong>9 Indicateurs d'Objectifs de Développement (ODP)</strong> sont disponibles dans l'onglet dédié.
</Alert>

      {/* ============================================ */}
      {/* WIDGETS PAR COMPOSANTE */}
      {/* ============================================ */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#555' }}>
        Performance par composante
      </Typography>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {composanteWidgets.map((comp) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={comp.id}>
            <Card 
              sx={{ 
                borderRadius: '16px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': { transform: 'translateY(-4px)' }
              }}
              onClick={() => setTabValue(comp.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {composanteIcons[comp.id]}
                  <Typography variant="subtitle2" fontWeight={600} noWrap>
                    Composante {comp.id}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} color={getProgressionColor(comp.progression_moyenne)}>
                  {comp.progression_moyenne}%
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    ✅ {comp.atteints} atteints
                  </Typography>
                  <Typography variant="caption" color="error.main">
                    🔴 {comp.critiques} critiques
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(comp.progression_moyenne, 100)}
                  sx={{ mt: 1.5, height: 6, borderRadius: '8px', bgcolor: '#E0E0E0' }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {comp.total} indicateurs
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Barre d'export */}
      <ExportToolbar
        title="Indicateurs de Résultats Intermédiaires"
        subtitle="Suivi des performances par composante du programme"
        columns={[
          { header: 'Code', key: 'code', width: 12 },
          { header: 'Nom', key: 'nom', width: 40 },
          { header: 'Composante', key: 'composante', width: 24 },
          { header: 'Unité', key: 'unite', width: 12 },
          { header: 'Référence', key: 'valeur_reference', width: 14 },
          { header: 'Cible', key: 'cible', width: 10 },
          { header: 'Actuelle', key: 'valeur_actuelle', width: 12 },
          { header: 'Progression (%)', key: 'progression', width: 16 },
        ]}
        getData={() => groupedIndicateurs.flatMap((g) =>
          g.indicateurs.map((i) => ({
            code: i.code,
            nom: i.nom,
            composante: composanteNames[g.id] ?? `Composante ${g.id}`,
            unite: i.unite,
            valeur_reference: i.valeur_reference,
            cible: i.cible,
            valeur_actuelle: i.valeur_actuelle,
            progression: `${i.progression}%`,
          }))
        )}
        filename="indicateurs_ir"
        landscape
      />

      {/* Onglets */}
      <Tabs
        value={tabValue}
        onChange={(_event, value: number) => setTabValue(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="📊 Tous" value={0} />
        {groupedIndicateurs.map((group) => (
          <Tab key={group.id} label={`Composante ${group.id}`} value={group.id} />
        ))}
      </Tabs>

      {/* Liste des indicateurs */}
      {visibleGroups.map((group) => (
        <Card key={group.id} sx={{ mb: 3, borderRadius: '10px' }}>
          <CardContent>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => handleToggleComposante(group.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {composanteIcons[group.id]}
                <Typography variant="h6" fontWeight={700}>
                  Composante {group.id} - {group.nom}
                </Typography>
                <Chip label={`${group.indicateurs.length} indicateurs`} size="small" variant="outlined" />
              </Box>
              {expandedComposante === group.id ? <GoogleIcon name="expand_less" size={24} /> : <GoogleIcon name="expand_more" size={24} />}
            </Box>

            <Collapse in={expandedComposante === group.id}>
              <Box sx={{ mt: 3 }}>
                {group.indicateurs.map((indicateur) => (
                  <Paper key={indicateur.id} variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '10px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={indicateur.code} 
                            size="small" 
                            sx={{ 
                              bgcolor: indicateur.progression >= 100 ? '#E8F5E9' : indicateur.progression >= 70 ? '#E8F5E9' : '#FFEBEE',
                              color: indicateur.progression >= 70 ? '#2E7D32' : '#E53935'
                            }} 
                          />
                          <Chip label={indicateur.frequence} size="small" variant="outlined" />
                          <Chip 
                            label={getProgressionLabel(indicateur.progression)} 
                            size="small" 
                            sx={{ 
                              bgcolor: getProgressionColor(indicateur.progression),
                              color: 'white',
                              fontSize: '0.7rem'
                            }} 
                          />
                        </Box>

                        <Typography variant="body1" fontWeight={600} gutterBottom>
                          {indicateur.nom}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                          {indicateur.description}
                        </Typography>

                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Progression
                            </Typography>
                            <Typography variant="caption" fontWeight={700} color={getProgressionColor(indicateur.progression)}>
                              {indicateur.progression.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(indicateur.progression, 100)}
                            sx={{
                              height: 8,
                              borderRadius: '8px',
                              bgcolor: '#E0E0E0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getProgressionColor(indicateur.progression),
                              },
                            }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Actuel</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatUnite(indicateur.valeur_actuelle, indicateur.unite)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Cible</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatUnite(indicateur.cible, indicateur.unite)}
                            </Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">Référence</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {formatUnite(indicateur.valeur_reference, indicateur.unite)}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Tooltip title="Calculer">
                        <IconButton onClick={() => handleOpenCalcul(indicateur)} sx={{ bgcolor: '#F1F8E9', borderRadius: '10px' }}>
                          <GoogleIcon name="calculate" size={24} />
                        </IconButton>
                      </Tooltip>
                    </Box>

                    <Collapse in={expandedId === indicateur.id}>
                      <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #E0E0E0' }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Formule de calcul
                        </Typography>
                        <Paper sx={{ p: 2, bgcolor: '#F5F5F5', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                          {indicateur.formule}
                        </Paper>
                      </Box>
                    </Collapse>

                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        onClick={() => handleExpand(indicateur.id)}
                        endIcon={expandedId === indicateur.id ? <GoogleIcon name="expand_less" size={24} /> : <GoogleIcon name="expand_more" size={24} />}
                      >
                        {expandedId === indicateur.id ? 'Masquer formule' : 'Voir formule'}
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </Collapse>
          </CardContent>
        </Card>
      ))}

      {/* Dialogue de calcul */}
      <Dialog open={calculDialogOpen} onClose={() => setCalculDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Calculer : {selectedIndicateur?.code} - {selectedIndicateur?.nom}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Formule :</strong> {selectedIndicateur?.formule}
            </Alert>
            <TextField
              fullWidth
              label="Valeur à enregistrer"
              type="number"
              margin="normal"
              value={valeurSaisie}
              onChange={(event) => setValeurSaisie(event.target.value)}
            />
            {resultatCalcul ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Résultat :</strong> {formatUnite(resultatCalcul.valeur, selectedIndicateur?.unite || '')}
                <br />
                <strong>Progression :</strong> {resultatCalcul.progression.toFixed(1)}%
              </Alert>
            ) : null}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCalculDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCalculer} sx={{ bgcolor: '#2E7D32' }}>
            Calculer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default IRList;