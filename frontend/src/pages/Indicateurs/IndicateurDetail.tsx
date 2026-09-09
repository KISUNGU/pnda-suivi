// frontend/src/pages/Indicateurs/IndicateurDetail.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import indicateurService from '../../services/indicateur.service';
import type { HistoriqueValeur, Indicateur } from '../../services/indicateur.service';
import { getActiveForms } from '../../config/collecteForms';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { IndicateurTimeline } from '../../components/IndicateurTimeline';

const anneesSaisie = ['2023', '2024', '2025', '2026', '2027'];

const formCollectePour = (indicateur: Indicateur) => {
  const texte = `${indicateur.code} ${indicateur.nom} ${indicateur.description}`.toLowerCase();
  if (texte.includes('adoption') || texte.includes('technolog')) return 'adoption_technologie';
  if (texte.includes('plainte') || texte.includes('vbg') || texte.includes('grm')) return 'plainte_grm';
  if (texte.includes('formation') || texte.includes('satisf')) return 'satisfaction_formation';
  if (texte.includes('subvention') || texte.includes('paiement')) return 'suivi_subvention';
  return 'enquete_production';
};

const formatUnite = (valeur: number | null | undefined, unite: string) => {
  if (valeur === null || valeur === undefined) return '—';
  if (unite === '%') return `${valeur.toLocaleString('fr-FR')} %`;
  if (unite === 'nombre') return valeur.toLocaleString('fr-FR');
  return `${valeur.toLocaleString('fr-FR')} ${unite}`;
};

const couleurProgression = (progression: number) => {
  if (progression >= 100) return 'success';
  if (progression >= 70) return 'primary';
  if (progression >= 50) return 'warning';
  return 'danger';
};

export function IndicateurDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const indicateurId = Number.parseInt(id ?? '', 10);

  const [indicateur, setIndicateur] = useState<Indicateur | null>(null);
  const [historique, setHistorique] = useState<HistoriqueValeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [valeur, setValeur] = useState('');
  const [periode, setPeriode] = useState('2025');

  const load = useCallback(async () => {
    if (!Number.isFinite(indicateurId)) {
      setError('Identifiant d’indicateur invalide.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [detailRes, histoRes] = await Promise.all([
        indicateurService.getById(indicateurId),
        indicateurService.getHistorique(indicateurId),
      ]);
      setIndicateur(detailRes.data);
      setHistorique(histoRes.data ?? []);
      setValeur(detailRes.data.valeur_actuelle?.toString() ?? '');
    } catch {
      setError('Impossible de charger cet indicateur.');
      setIndicateur(null);
    } finally {
      setLoading(false);
    }
  }, [indicateurId]);

  useEffect(() => {
    void load();
  }, [load]);

  const formulaires = useMemo(() => getActiveForms(), []);
  const formLie = indicateur ? formulaires.find((form) => form.id === formCollectePour(indicateur)) : undefined;

  const enregistrer = async () => {
    if (!indicateur || valeur.trim() === '') return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await indicateurService.updateValeur(indicateur.id, Number.parseFloat(valeur), periode);
      setSuccess(`Valeur ${valeur} enregistrée pour ${periode}.`);
      await load();
    } catch {
      setError('Enregistrement impossible. Vérifiez vos droits et la connexion.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  if (!indicateur) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error ?? 'Indicateur introuvable.'}</Alert>
        <Button startIcon={<GoogleIcon name="arrow_back" size={18} />} onClick={() => navigate('/indicateurs/cadre')}>
          Retour au cadre
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<GoogleIcon name="arrow_back" size={18} />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Retour
      </Button>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip label={indicateur.code} color={indicateur.est_iodp ? 'primary' : 'success'} />
        <Chip label={indicateur.frequence} variant="outlined" />
        <Chip label={indicateur.est_iodp ? 'ODP' : `IR · composante ${indicateur.id_composante}`} variant="outlined" />
      </Stack>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
        {indicateur.nom}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {indicateur.description}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Valeur actuelle"
            value={formatUnite(indicateur.valeur_actuelle, indicateur.unite)}
            icon={<GoogleIcon name="speed" size={32} />}
            color="primary"
            onClick={() => document.getElementById('saisie-indicateur')?.scrollIntoView({ behavior: 'smooth' })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Cible"
            value={formatUnite(indicateur.cible, indicateur.unite)}
            icon={<GoogleIcon name="flag" size={32} />}
            color="success"
            onClick={() => navigate('/indicateurs/cadre')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Progression"
            value={`${indicateur.progression.toFixed(1)}%`}
            icon={<GoogleIcon name="trending_up" size={32} />}
            color={couleurProgression(indicateur.progression)}
            progression={indicateur.progression}
            onClick={() => document.getElementById('saisie-indicateur')?.scrollIntoView({ behavior: 'smooth' })}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Collecte terrain"
            value={formLie?.name ?? 'Formulaires'}
            icon={<GoogleIcon name="assignment" size={32} />}
            color="warning"
            detail="Ouvrir la fiche de saisie"
            onClick={() => navigate(formLie ? `/outils/collecte?form=${formLie.id}` : '/outils/collecte')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper id="saisie-indicateur" sx={{ p: 2.25, mb: 3, borderRadius: 2.1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Renseigner la valeur
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enregistre le réalisé dans le cadre des résultats pour l’année choisie.
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                label="Période"
                value={periode}
                onChange={(event) => setPeriode(event.target.value)}
              >
                {anneesSaisie.map((annee) => (
                  <MenuItem key={annee} value={annee}>{annee}</MenuItem>
                ))}
              </TextField>
              <TextField
                label={`Valeur réalisée (${indicateur.unite})`}
                type="number"
                value={valeur}
                onChange={(event) => setValeur(event.target.value)}
              />
              <Button
                variant="contained"
                disabled={saving || valeur.trim() === ''}
                onClick={() => void enregistrer()}
                startIcon={<GoogleIcon name="save" size={18} />}
                sx={{ bgcolor: '#2E7D32', alignSelf: 'flex-start' }}
              >
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </Stack>
          </Paper>

          <IndicateurTimeline indicateur={indicateur} />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.25, mb: 3, borderRadius: 2.1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Méthode et source
            </Typography>
            <Typography variant="caption" color="text.secondary">Formule / méthodologie</Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>{indicateur.formule || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">Source</Typography>
            <Typography variant="body2" sx={{ mb: 1.5 }}>{indicateur.source_donnees || '—'}</Typography>
            <Typography variant="caption" color="text.secondary">Responsable</Typography>
            <Typography variant="body2">{indicateur.responsable_collecte || '—'}</Typography>
          </Paper>

          <Paper sx={{ p: 2.25, mb: 3, borderRadius: 2.1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Collecte de données
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Saisir une enquête terrain liée à cet indicateur, ou ouvrir le calculateur.
            </Typography>
            <Stack spacing={1}>
              {formulaires.map((form) => (
                <Button
                  key={form.id}
                  variant={form.id === formLie?.id ? 'contained' : 'outlined'}
                  onClick={() => navigate(`/outils/collecte?form=${form.id}`)}
                  startIcon={<GoogleIcon name={form.icon} size={18} />}
                  sx={form.id === formLie?.id ? { bgcolor: '#2E7D32' } : undefined}
                >
                  {form.name}
                </Button>
              ))}
              <Button
                variant="text"
                onClick={() => navigate(`/outils/calculateur`)}
                startIcon={<GoogleIcon name="calculate" size={18} />}
              >
                Calculateur d’indicateur
              </Button>
            </Stack>
          </Paper>

          <Paper sx={{ p: 2.25, borderRadius: 2.1 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
              Historique
            </Typography>
            {historique.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Aucune série annuelle.</Typography>
            ) : (
              historique.map((ligne) => (
                <Box key={ligne.periode} sx={{ mb: 1.25 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption">{ligne.periode}</Typography>
                    <Typography variant="caption" fontWeight={700}>
                      {formatUnite(ligne.valeur, indicateur.unite)}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={indicateur.cible > 0 ? Math.min((ligne.valeur / indicateur.cible) * 100, 100) : 0}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default IndicateurDetail;
