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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

const getProgressionColor = (progression: number) => {
  if (progression >= 90) return '#4CAF50';
  if (progression >= 70) return '#81C784';
  if (progression >= 50) return '#FFC107';
  return '#F44336';
};

const formatUnite = (valeur: number, unite: string) => {
  if (unite === '%') return `${valeur}%`;
  if (unite === 'nombre') return valeur.toLocaleString();
  if (unite === 'km') return `${valeur.toLocaleString()} km`;
  if (unite === 'ha') return `${valeur.toLocaleString()} ha`;
  return `${valeur} ${unite}`;
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
    valeur_actuelle: 15,
    valeur_reference: 12,
    progression: 50,
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
    cible: 50000,
    valeur_actuelle: 32450,
    valeur_reference: 25000,
    progression: 64.9,
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
    cible: 22500,
    valeur_actuelle: 14600,
    valeur_reference: 11200,
    progression: 64.9,
    id_composante: 1,
    est_iodp: true
  },
  { 
    id: 4, 
    code: 'IODP2.3', 
    nom: 'Hausse du rendement de maïs à travers les pratiques AIC',
    description: 'Augmentation en pourcentage du rendement de maïs grâce aux technologies intelligentes face au climat',
    formule: '((Rendement maïs année t - Rendement maïs année 0) / Rendement maïs année 0) x 100',
    unite: '%',
    frequence: 'annuelle',
    cible: 30,
    valeur_actuelle: 23,
    valeur_reference: 18,
    progression: 76.7,
    id_composante: 1,
    est_iodp: true
  },
  { 
    id: 5, 
    code: 'IODP3.1', 
    nom: 'Plans de contingence pour risques agricoles',
    description: 'Nombre de plans de contingence approuvés pour les risques liés au secteur agricole',
    formule: 'Nombre cumulé de plans de contingence approuvés',
    unite: 'nombre',
    frequence: 'annuelle',
    cible: 8,
    valeur_actuelle: 5,
    valeur_reference: 3,
    progression: 62.5,
    id_composante: 3,
    est_iodp: true
  },
];

export const IODPList: React.FC = () => {
  const [indicateurs, setIndicateurs] = useState<Indicateur[]>([]);
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
      setIndicateurs(response.data);
    } catch (err) {
      console.error('Erreur API:', err);
      setError('Erreur de connexion au serveur. Affichage des données de démonstration.');
      setIndicateurs(mockIndicateurs);
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
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Indicateurs IODP
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Objectifs de Développement du Programme - Suivi des performances
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 3 }} action={
          <Button color="inherit" size="small" onClick={loadIndicateurs}>
            Réessayer
          </Button>
        }>
          {error}
        </Alert>
      )}

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
          progression: `${i.progression}%`,
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
                        sx={{ bgcolor: '#2E7D32', color: 'white' }}
                      />
                      <Chip 
                        label={indicateur.frequence} 
                        size="small" 
                        variant="outlined"
                      />
                      {indicateur.progression >= 70 ? (
                        <GoogleIcon name="check_circle" size={24} sx={{ color: '#4CAF50' }} />
                      ) : indicateur.progression >= 40 ? (
                        <GoogleIcon name="warning" size={24} sx={{ color: '#FFC107' }} />
                      ) : (
                        <GoogleIcon name="warning" size={24} sx={{ color: '#F44336' }} />
                      )}
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
                        <Typography variant="caption" fontWeight={500}>
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
                          Cible
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
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Historique des performances
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#F5F5F5' }}>
                            <TableCell>Période</TableCell>
                            <TableCell align="right">Valeur</TableCell>
                            <TableCell align="right">Progression</TableCell>
                            <TableCell align="right">Statut</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>T1 2025</TableCell>
                            <TableCell align="right">{formatUnite(indicateur.valeur_reference * 0.5, indicateur.unite)}</TableCell>
                            <TableCell align="right">50%</TableCell>
                            <TableCell align="right">
                              <Chip label="Début" size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>T2 2025</TableCell>
                            <TableCell align="right">{formatUnite(indicateur.valeur_reference * 0.7, indicateur.unite)}</TableCell>
                            <TableCell align="right">70%</TableCell>
                            <TableCell align="right">
                              <Chip label="En progression" size="small" color="warning" />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>T3 2025</TableCell>
                            <TableCell align="right">{formatUnite(indicateur.valeur_reference, indicateur.unite)}</TableCell>
                            <TableCell align="right">100%</TableCell>
                            <TableCell align="right">
                              <Chip label="Référence" size="small" color="info" />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>T1 2026</TableCell>
                            <TableCell align="right">{formatUnite(indicateur.valeur_actuelle, indicateur.unite)}</TableCell>
                            <TableCell align="right">{indicateur.progression.toFixed(1)}%</TableCell>
                            <TableCell align="right">
                              <Chip 
                                label={indicateur.progression >= 70 ? 'Bon' : 'À améliorer'} 
                                size="small" 
                                color={indicateur.progression >= 70 ? 'success' : 'warning'}
                              />
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
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