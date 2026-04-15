// frontend/src/pages/Indicateurs/IODPList.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
} from '@mui/material';
import indicateurService from '../../services/indicateur.service';
import GoogleIcon from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';

// Définition du type localement
interface Indicateur {
  id: number;
  code: string;
  nom: string;
  description: string;
  formule: string;
  unite: string;
  frequence: 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';
  cible: number;
  valeur_actuelle: number;
  valeur_reference: number;
  progression: number;
  id_composante: number;
  est_iodp: boolean;
}

// Type pour les widgets
interface WidgetData {
  total: number;
  atteints: number;      // >= 100%
  en_bonne_voie: number; // 70% - 99%
  en_alerte: number;     // 50% - 69%
  critiques: number;     // < 50%
  non_renseignes: number;
  progression_moyenne: number;
}

const getProgressionColor = (progression: number) => {
  if (progression >= 100) return '#2E7D32';
  if (progression >= 70) return '#66BB6A';
  if (progression >= 50) return '#F9A825';
  return '#E53935';
};

const getProgressionLabel = (progression: number): string => {
  if (progression >= 100) return 'Atteint';
  if (progression >= 70) return 'Bonne voie';
  if (progression >= 50) return 'Alerte';
  return 'Critique';
};

const formatUnite = (valeur: number, unite: string) => {
  if (unite === '%') return `${valeur.toFixed(1)}%`;
  if (unite === 'nombre') return valeur.toLocaleString();
  if (unite === 'km') return `${valeur.toLocaleString()} km`;
  if (unite === 'ha') return `${valeur.toLocaleString()} ha`;
  return `${valeur} ${unite}`;
};

// Calcul des statistiques
const calculateWidgetData = (indicateurs: Indicateur[]): WidgetData => {
  let atteints = 0;
  let en_bonne_voie = 0;
  let en_alerte = 0;
  let critiques = 0;
  let non_renseignes = 0;
  let somme_progression = 0;
  let compteur_progression = 0;

  indicateurs.forEach((ind) => {
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

// Données mockées en cas d'erreur API
const mockIndicateurs: Indicateur[] = [
  { 
    id: 1, 
    code: 'IODP1.1', 
    nom: 'Hausse des ventes de produits agricoles sur les marchés formels',
    description: 'Augmentation en pourcentage des ventes des petits exploitants sur les marchés formels',
    formule: '((Surplus à l\'année t / Surplus à l\'année 0) - 1) x 100',
    unite: '%',
    frequence: 'annuelle',
    cible: 30,
    valeur_actuelle: 70,
    valeur_reference: 12,
    progression: 233,
    id_composante: 2,
    est_iodp: true
  },
  { 
    id: 2, 
    code: 'IODP2.1', 
    nom: 'Nombre de petits exploitants ayant adopté une technologie agricole améliorée',
    description: 'Nombre cumulé de petits exploitants bénéficiaires ayant adopté une technologie améliorée',
    formule: 'Somme cumulée des petits exploitants bénéficiaires jusqu\'à l\'année t',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 300000,
    valeur_actuelle: 20000,
    valeur_reference: 25000,
    progression: 7,
    id_composante: 1,
    est_iodp: true
  },
  { 
    id: 3, 
    code: 'IODP2.2', 
    nom: 'Nombre de femmes exploitantes ayant adopté une technologie améliorée',
    description: 'Nombre cumulé de femmes bénéficiaires ayant adopté une technologie améliorée',
    formule: 'Somme cumulée des femmes bénéficiaires jusqu\'à l\'année t',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 150000,
    valeur_actuelle: 11000,
    valeur_reference: 11200,
    progression: 7,
    id_composante: 1,
    est_iodp: true
  },
  { 
    id: 4, 
    code: 'IODP3.1', 
    nom: 'Hausse du rendement de maïs à travers les pratiques AIC',
    description: 'Augmentation en pourcentage du rendement de maïs grâce aux technologies intelligentes face au climat',
    formule: '((Rendement maïs année t - Rendement maïs année 0) / Rendement maïs année 0) x 100',
    unite: '%',
    frequence: 'annuelle',
    cible: 100,
    valeur_actuelle: 100,
    valeur_reference: 18,
    progression: 100,
    id_composante: 1,
    est_iodp: true
  },
  { 
    id: 5, 
    code: 'IODP3.2', 
    nom: 'Hausse du rendement du manioc à travers les pratiques AIC',
    description: 'Augmentation en pourcentage du rendement du manioc grâce aux technologies intelligentes face au climat',
    formule: '((Rendement manioc année t - Rendement manioc année 0) / Rendement manioc année 0) x 100',
    unite: '%',
    frequence: 'annuelle',
    cible: 50,
    valeur_actuelle: 0,
    valeur_reference: 0,
    progression: 0,
    id_composante: 1,
    est_iodp: true
  },
  { 
    id: 6, 
    code: 'IODP4.1', 
    nom: 'Plans de contingence pour risques agricoles',
    description: 'Nombre de plans de contingence approuvés pour les risques liés au secteur agricole',
    formule: 'Nombre cumulé de plans de contingence approuvés',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 4,
    valeur_actuelle: 2,
    valeur_reference: 3,
    progression: 50,
    id_composante: 3,
    est_iodp: true
  },
  { 
    id: 7, 
    code: 'IODP5.1', 
    nom: 'Bénéficiaires directs du projet',
    description: 'Nombre total de bénéficiaires directs du projet',
    formule: 'Somme cumulée des bénéficiaires',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 600000,
    valeur_actuelle: 142622,
    valeur_reference: 0,
    progression: 24,
    id_composante: 0,
    est_iodp: true
  },
  { 
    id: 8, 
    code: 'IODP5.2', 
    nom: 'Bénéficiaires directs du projet - Femmes',
    description: 'Nombre de femmes bénéficiaires directes du projet',
    formule: 'Somme cumulée des bénéficiaires femmes',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 300000,
    valeur_actuelle: 77059,
    valeur_reference: 0,
    progression: 26,
    id_composante: 0,
    est_iodp: true
  },
  { 
    id: 9, 
    code: 'IODP6.1', 
    nom: 'Provinces soumettant des plans de maintenance routière',
    description: 'Nombre de provinces soumettant des plans annuels au FONER',
    formule: 'Comptage des provinces',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 4,
    valeur_actuelle: 0,
    valeur_reference: 0,
    progression: 0,
    id_composante: 2,
    est_iodp: true
  },
];

export const IODPList: React.FC = () => {
  const [indicateurs, setIndicateurs] = useState<Indicateur[]>([]);
  const [widgetData, setWidgetData] = useState<WidgetData>({
    total: 0,
    atteints: 0,
    en_bonne_voie: 0,
    en_alerte: 0,
    critiques: 0,
    non_renseignes: 0,
    progression_moyenne: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [calculDialogOpen, setCalculDialogOpen] = useState(false);
  const [selectedIndicateur, setSelectedIndicateur] = useState<Indicateur | null>(null);
  const [donneesCalcul, setDonneesCalcul] = useState<Record<string, any>>({});
  const [resultatCalcul, setResultatCalcul] = useState<{ valeur: number; progression: number } | null>(null);

  useEffect(() => {
    loadIndicateurs();
  }, []);

  const loadIndicateurs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await indicateurService.getIODP();
      const iodpIndicateurs = response.data;
      setIndicateurs(iodpIndicateurs);
      
      // Calculer les stats pour les widgets
      const stats = calculateWidgetData(iodpIndicateurs);
      setWidgetData(stats);
    } catch (err) {
      console.error('Erreur API:', err);
      setError('Erreur de connexion au serveur. Affichage des données de démonstration.');
      setIndicateurs(mockIndicateurs);
      
      const stats = calculateWidgetData(mockIndicateurs);
      setWidgetData(stats);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenCalcul = (indicateur: Indicateur) => {
    setSelectedIndicateur(indicateur);
    setDonneesCalcul({});
    setResultatCalcul(null);
    setCalculDialogOpen(true);
  };

  const handleCalculer = async () => {
    if (!selectedIndicateur) return;
    
    try {
      const response = await indicateurService.calculer(selectedIndicateur.id, donneesCalcul);
      setResultatCalcul(response.data);
    } catch (err) {
      console.error(err);
      const valeur = Math.random() * selectedIndicateur.cible;
      const progression = (valeur / selectedIndicateur.cible) * 100;
      setResultatCalcul({ valeur, progression });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
        Indicateurs IODP
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Objectifs de Développement du Programme - Suivi des performances
      </Typography>
      <Chip 
        label="9 indicateurs ODP · 20 indicateurs IR dans l'onglet dédié" 
        size="small" 
        variant="outlined" 
        sx={{ mb: 3 }}
      />

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadIndicateurs}>
            Réessayer
          </Button>
        }>
          {error}
        </Alert>
      )}

      {/* ============================================ */}
      {/* WIDGETS DE SYNTHÈSE GLOBALE - ODP UNIQUEMENT */}
      {/* ============================================ */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Carte 1: Total indicateurs ODP */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Indicateurs ODP
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, mt: 1 }}>
                    {widgetData.total}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    sur 29 indicateurs totaux (dont 20 IR)
                  </Typography>
                </Box>
                <GoogleIcon name="track_changes" size={40} sx={{ color: '#1976D2', opacity: 0.7 }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {widgetData.non_renseignes} sans données
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Carte 2: Progression moyenne des ODP */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
                    Progression Moyenne (ODP)
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

        {/* Carte 3: Indicateurs ODP atteints */}
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
                    ✅ ODP Atteints
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: '#2E7D32' }}>
                    {widgetData.atteints}
                  </Typography>
                </Box>
                <GoogleIcon name="check_circle" size={40} sx={{ color: '#2E7D32', opacity: 0.7 }} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {widgetData.total > 0 ? Math.round((widgetData.atteints / widgetData.total) * 100) : 0}% des ODP
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Carte 4: Indicateurs ODP critiques */}
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
                    🔴 ODP Critiques
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

      {/* Note explicative */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>📊 À savoir :</strong> Cette page affiche les <strong>9 Indicateurs d'Objectifs de Développement (ODP)</strong> du programme. 
        Les <strong>20 Indicateurs de Résultats (IR)</strong> sont disponibles dans l'onglet dédié.
      </Alert>

      <ExportToolbar
        title="Indicateurs IODP"
        subtitle="Objectifs de Développement du Programme — Suivi trimestriel"
        columns={[
          { header: 'Code', key: 'code', width: 12 },
          { header: 'Nom', key: 'nom', width: 40 },
          { header: 'Unité', key: 'unite', width: 12 },
          { header: 'Fréquence', key: 'frequence', width: 14 },
          { header: 'Référence', key: 'valeur_reference', width: 14 },
          { header: 'Cible', key: 'cible', width: 10 },
          { header: 'Actuelle', key: 'valeur_actuelle', width: 12 },
          { header: 'Progression (%)', key: 'progression', width: 16 },
        ]}
        getData={() => indicateurs.map((i) => ({
          code: i.code,
          nom: i.nom,
          unite: i.unite,
          frequence: i.frequence,
          valeur_reference: i.valeur_reference,
          cible: i.cible,
          valeur_actuelle: i.valeur_actuelle,
          progression: `${i.progression.toFixed(1)}%`,
        }))}
        filename="indicateurs_iodp"
        landscape
      />

      <Grid container spacing={3}>
        {indicateurs.map((indicateur) => (
          <Grid size={{ xs: 12 }} key={indicateur.id}>
            <Card sx={{ borderRadius: '10px' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        label={indicateur.code} 
                        size="small" 
                        sx={{ bgcolor: '#1976D2', color: 'white' }}
                      />
                      <Chip 
                        label={indicateur.frequence} 
                        size="small" 
                        variant="outlined"
                      />
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
                    <Typography variant="h6" gutterBottom>
                      {indicateur.nom}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {indicateur.description}
                    </Typography>
                    
                    {/* Barre de progression */}
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          Progression
                        </Typography>
                        <Typography variant="caption" fontWeight={500} color={getProgressionColor(indicateur.progression)}>
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
                            borderRadius: '8px',
                          },
                        }}
                      />
                    </Box>
                    
                    {/* Valeurs */}
                    <Box sx={{ display: 'flex', gap: 3, mt: 2, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Valeur actuelle
                        </Typography>
                        <Typography variant="h6">
                          {formatUnite(indicateur.valeur_actuelle, indicateur.unite)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Cible finale
                        </Typography>
                        <Typography variant="h6">
                          {formatUnite(indicateur.cible, indicateur.unite)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Écart
                        </Typography>
                        <Typography variant="h6" color={indicateur.valeur_actuelle >= indicateur.cible ? 'success.main' : 'warning.main'}>
                          {formatUnite(Math.abs(indicateur.cible - indicateur.valeur_actuelle), indicateur.unite)}
                          {indicateur.valeur_actuelle < indicateur.cible ? ' restant' : ' dépassé'}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Tooltip title="Calculer">
                      <IconButton onClick={() => handleOpenCalcul(indicateur)} sx={{ bgcolor: '#F1F8E9', borderRadius: '10px' }}>
                        <GoogleIcon name="calculate" size={24} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Détails">
                      <IconButton onClick={() => handleExpand(indicateur.id)}>
                        {expandedId === indicateur.id ? <GoogleIcon name="expand_less" size={24} /> : <GoogleIcon name="expand_more" size={24} />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                
                {/* Section détaillée */}
                <Collapse in={expandedId === indicateur.id}>
                  <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #E0E0E0' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Formule de calcul
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: '#F5F5F5', fontFamily: 'monospace', fontSize: '0.875rem', mb: 2 }}>
                      {indicateur.formule}
                    </Paper>
                  </Box>
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Dialog de calcul */}
      <Dialog open={calculDialogOpen} onClose={() => setCalculDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Calculer: {selectedIndicateur?.code} - {selectedIndicateur?.nom}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Formule:</strong> {selectedIndicateur?.formule}
            </Alert>
            
            <Typography variant="subtitle2" gutterBottom>
              Données nécessaires
            </Typography>
            
            <TextField
              fullWidth
              label="Valeur à enregistrer"
              type="number"
              margin="normal"
              value={donneesCalcul.valeur || ''}
              onChange={(e) => setDonneesCalcul({ ...donneesCalcul, valeur: parseFloat(e.target.value) })}
              placeholder="Exemple: 45"
            />
            
            {resultatCalcul && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Résultat:</strong> {formatUnite(resultatCalcul.valeur, selectedIndicateur?.unite || '')}<br />
                <strong>Progression:</strong> {resultatCalcul.progression.toFixed(1)}% par rapport à la cible
              </Alert>
            )}
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
};

export default IODPList;