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

const mockIndicateursIR: Indicateur[] = [
  { id: 101, code: 'IR1.1.1', nom: 'Petits exploitants atteints par des actifs agricoles', description: 'Nombre de petits exploitants ayant reçu des actifs ou services agricoles', formule: 'Somme cumulee des beneficiaires', unite: 'nombre', frequence: 'semestrielle', cible: 150000, valeur_actuelle: 124530, valeur_reference: 98000, progression: 83, id_composante: 1, est_iodp: false },
  { id: 102, code: 'IR1.1.2', nom: 'Femmes exploitantes atteintes', description: 'Nombre de femmes petits exploitants ayant beneficie d\'actifs agricoles', formule: 'Somme cumulee des femmes beneficiaires', unite: 'nombre', frequence: 'semestrielle', cible: 67500, valeur_actuelle: 56038, valeur_reference: 44100, progression: 83, id_composante: 1, est_iodp: false },
  { id: 201, code: 'IR2.1.1', nom: 'Kilometres de routes rehabilitees', description: 'Total des routes rehabilitees par le programme', formule: 'Somme des km de routes', unite: 'km', frequence: 'annuelle', cible: 500, valeur_actuelle: 300, valeur_reference: 150, progression: 60, id_composante: 2, est_iodp: false },
  { id: 202, code: 'IR2.1.4', nom: 'CLER fonctionnels', description: 'Comites Locaux d\'Entretien des Routes operationnels', formule: 'Nombre de CLER fonctionnels', unite: 'nombre', frequence: 'annuelle', cible: 20, valeur_actuelle: 15, valeur_reference: 8, progression: 75, id_composante: 2, est_iodp: false },
  { id: 301, code: 'IR3.1.4', nom: 'Traitement des reclamations GRM', description: 'Pourcentage des plaintes traitees dans les delais', formule: '(Plaintes traitees / Plaintes recues) x 100', unite: '%', frequence: 'annuelle', cible: 90, valeur_actuelle: 78, valeur_reference: 65, progression: 86.7, id_composante: 3, est_iodp: false },
  { id: 401, code: 'IR4.1', nom: 'Plans de contingence prepares', description: 'Plans de reponse aux urgences agricoles approuves', formule: 'Nombre de plans approuves', unite: 'nombre', frequence: 'annuelle', cible: 8, valeur_actuelle: 5, valeur_reference: 2, progression: 62.5, id_composante: 4, est_iodp: false },
];

const composanteNames: Record<number, string> = {
  1: 'Productivite agricole',
  2: 'Acces au marche',
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
  if (progression >= 90) return '#2E7D32';
  if (progression >= 70) return '#66BB6A';
  if (progression >= 50) return '#F9A825';
  return '#E53935';
};

const formatUnite = (valeur: number, unite: string) => {
  if (unite === '%') return `${valeur.toFixed(1)}%`;
  if (unite === 'nombre') return valeur.toLocaleString('fr-FR');
  if (unite === 'km' || unite === 'ha') return `${valeur.toLocaleString('fr-FR')} ${unite}`;
  return `${valeur} ${unite}`;
};

const groupByComposante = (indicateurs: Indicateur[]): ComposanteGroup[] => {
  return [1, 2, 3, 4]
    .map((id) => ({
      id,
      nom: composanteNames[id],
      indicateurs: indicateurs.filter((indicateur) => indicateur.id_composante === id),
    }))
    .filter((group) => group.indicateurs.length > 0);
};

export function IRList() {
  const [groupedIndicateurs, setGroupedIndicateurs] = useState<ComposanteGroup[]>([]);
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
        setGroupedIndicateurs(groupByComposante(response.data));
      } catch (err) {
        console.error('Erreur API IR:', err);
        setError('Erreur de connexion au serveur. Affichage des donnees de demonstration.');
        setGroupedIndicateurs(groupByComposante(mockIndicateursIR));
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
        Indicateurs de Resultats Intermediaires
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Suivi des performances par composante du programme.
      </Typography>

      {error ? <Alert severity="warning" sx={{ mb: 3 }}>{error}</Alert> : null}

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

      <Tabs
        value={tabValue}
        onChange={(_event, value: number) => setTabValue(value)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="Tous" value={0} />
        <Tab label="Composante 1" value={1} />
        <Tab label="Composante 2" value={2} />
        <Tab label="Composante 3" value={3} />
        <Tab label="Composante 4" value={4} />
      </Tabs>

      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', mb: 4 }}>
        {visibleGroups.map((group) => {
          const avgProgression = group.indicateurs.reduce((total, indicateur) => total + indicateur.progression, 0) / group.indicateurs.length;
          return (
            <Card
              key={group.id}
              sx={{
                borderLeft: `4px solid ${getProgressionColor(avgProgression)}`,
                cursor: 'pointer',
              }}
              onClick={() => handleToggleComposante(group.id)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {composanteIcons[group.id]}
                  <Typography variant="subtitle2" fontWeight={700}>
                    {group.nom}
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={700} color={getProgressionColor(avgProgression)}>
                  {avgProgression.toFixed(0)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {group.indicateurs.length} indicateurs
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(avgProgression, 100)}
                  sx={{ mt: 1.5, height: 6, borderRadius: '8px', bgcolor: '#E0E0E0' }}
                />
              </CardContent>
            </Card>
          );
        })}
      </Box>

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
                          <Chip label={indicateur.code} size="small" sx={{ bgcolor: '#E8F5E9', color: '#2E7D32' }} />
                          <Chip label={indicateur.frequence} size="small" variant="outlined" />
                          {indicateur.progression >= 70 ? (
                            <GoogleIcon name="check_circle" size={24} sx={{ color: '#4CAF50' }} />
                          ) : (
                            <GoogleIcon name="warning" size={24} sx={{ color: getProgressionColor(indicateur.progression) }} />
                          )}
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
                            <Typography variant="caption" fontWeight={700}>
                              {indicateur.progression.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(indicateur.progression, 100)}
                            sx={{
                              height: 6,
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
                            <Typography variant="caption" color="text.secondary">Reference</Typography>
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
              label="Valeur a enregistrer"
              type="number"
              margin="normal"
              value={valeurSaisie}
              onChange={(event) => setValeurSaisie(event.target.value)}
            />
            {resultatCalcul ? (
              <Alert severity="success" sx={{ mt: 2 }}>
                <strong>Resultat :</strong> {formatUnite(resultatCalcul.valeur, selectedIndicateur?.unite || '')}
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
