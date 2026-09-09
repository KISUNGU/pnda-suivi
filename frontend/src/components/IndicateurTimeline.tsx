// frontend/src/components/IndicateurTimeline.tsx
import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, Chip, LinearProgress, Tooltip } from '@mui/material';
import type { Indicateur } from '../services/indicateur.service';

type Props = {
  indicateur: Indicateur;
};

const YEARS = [2023, 2024, 2025, 2026];

const formatValue = (value: number | null, unite: string): string => {
  if (value === null || value === undefined) return '—';
  if (unite === '%') return `${value.toFixed(1)}%`;
  if (unite === 'nombre') return value.toLocaleString('fr-FR');
  if (unite === 'Km' || unite === 'Ha' || unite === 'kg') return `${value.toLocaleString('fr-FR')} ${unite}`;
  if (unite === 'USD') return `${value.toLocaleString('fr-FR')} $`;
  return `${value} ${unite}`;
};

const getProgressColor = (realise: number | null, cible: number | null) => {
  if (realise === null || cible === null || cible === 0) return '#9E9E9E';
  const ratio = (realise / cible) * 100;
  if (ratio >= 90) return '#2E7D32';
  if (ratio >= 70) return '#66BB6A';
  if (ratio >= 50) return '#F9A825';
  return '#E53935';
};

const getPerformanceIcon = (realise: number | null, cible: number | null) => {
  if (realise === null || cible === null || cible === 0) return '⚪';
  const ratio = (realise / cible) * 100;
  if (ratio >= 100) return '✅';
  if (ratio >= 70) return '🟢';
  if (ratio >= 50) return '🟡';
  return '🔴';
};

export function IndicateurTimeline({ indicateur }: Props) {
  // Calculer la progression globale
  const finalCible = indicateur.cible_2026 || indicateur.cible_2025 || indicateur.cible_2024;
  const lastRealise = indicateur.realise_2025 || indicateur.realise_2024 || indicateur.realise_2023;
  const progressionGlobale = finalCible && lastRealise ? (lastRealise / finalCible) * 100 : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '10px' }}>
      {/* En-tête avec code et nom */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          <Chip 
            label={indicateur.code} 
            size="small" 
            sx={{ bgcolor: indicateur.est_iodp ? '#1976D2' : '#2E7D32', color: 'white' }} 
          />
          <Chip 
            label={indicateur.frequence} 
            size="small" 
            variant="outlined" 
          />
          {indicateur.est_iodp ? (
            <Chip label="ODP" size="small" color="primary" variant="outlined" />
          ) : (
            <Chip label={`Composante ${indicateur.id_composante}`} size="small" variant="outlined" />
          )}
        </Box>
        <Typography variant="body1" fontWeight={600}>
          {indicateur.nom}
        </Typography>
        {indicateur.description && (
          <Typography variant="caption" color="text.secondary" display="block">
            {indicateur.description}
          </Typography>
        )}
      </Box>

      {/* Barre de progression globale */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Progression globale</Typography>
          <Typography variant="caption" fontWeight={700}>
            {progressionGlobale.toFixed(1)}% vers la cible finale
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(progressionGlobale, 100)}
          sx={{
            height: 8,
            borderRadius: '8px',
            bgcolor: 'action.selected',
            '& .MuiLinearProgress-bar': { bgcolor: getProgressColor(lastRealise, finalCible) },
          }}
        />
      </Box>

      {/* Tableau des évolutions annuelles */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell rowSpan={2} sx={{ fontWeight: 700 }}>Année</TableCell>
              <TableCell colSpan={2} align="center" sx={{ fontWeight: 700 }}>Cible</TableCell>
              <TableCell colSpan={2} align="center" sx={{ fontWeight: 700 }}>Réalisé</TableCell>
              <TableCell rowSpan={2} align="center" sx={{ fontWeight: 700 }}>Performance</TableCell>
            </TableRow>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell align="right" sx={{ fontSize: '0.75rem' }}>Valeur</TableCell>
              <TableCell align="center" sx={{ fontSize: '0.75rem' }}>Statut</TableCell>
              <TableCell align="right" sx={{ fontSize: '0.75rem' }}>Valeur</TableCell>
              <TableCell align="center" sx={{ fontSize: '0.75rem' }}>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {YEARS.map((year) => {
              const cible = indicateur[`cible_${year}` as keyof Indicateur] as number | null;
              const realise = indicateur[`realise_${year}` as keyof Indicateur] as number | null;
              const performance = cible && realise ? (realise / cible) * 100 : null;
              
              // Ne pas afficher si aucune donnée
              if (cible === null && realise === null) return null;
              
              return (
                <TableRow key={year} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{year}</TableCell>
                  
                  {/* Cible */}
                  <TableCell align="right">
                    {cible !== null ? formatValue(cible, indicateur.unite) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {cible !== null ? (
                      <Tooltip title="Cible définie">
                        <span>🎯</span>
                      </Tooltip>
                    ) : '—'}
                  </TableCell>
                  
                  {/* Réalisé */}
                  <TableCell align="right" sx={{ 
                    color: realise !== null && cible !== null && realise >= cible ? '#2E7D32' : 'inherit',
                    fontWeight: realise !== null && cible !== null && realise >= cible ? 700 : 400
                  }}>
                    {realise !== null ? formatValue(realise, indicateur.unite) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {realise !== null ? (
                      <Tooltip title={`Réalisé: ${formatValue(realise, indicateur.unite)}`}>
                        <span>{getPerformanceIcon(realise, cible)}</span>
                      </Tooltip>
                    ) : '—'}
                  </TableCell>
                  
                  {/* Performance */}
                  <TableCell align="center">
                    {performance !== null ? (
                      <Chip 
                        label={`${performance.toFixed(0)}%`}
                        size="small"
                        sx={{
                          bgcolor: getProgressColor(realise, cible),
                          color: 'white',
                          fontWeight: 600,
                          minWidth: '60px'
                        }}
                      />
                    ) : '—'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Métadonnées (source, méthodologie, responsable) */}
      {(indicateur.source_donnees || indicateur.methodologie_collecte || indicateur.responsable_collecte) && (
        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: '8px' }}>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>📁 Source :</strong> {indicateur.source_donnees || 'Non spécifiée'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>📋 Méthodologie :</strong> {indicateur.methodologie_collecte || 'Non spécifiée'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <strong>👤 Responsable :</strong> {indicateur.responsable_collecte || 'Non spécifié'}
          </Typography>
        </Box>
      )}

      {/* Formule de calcul */}
      {indicateur.formule && (
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'action.hover', borderRadius: '8px' }}>
          <Typography variant="caption" fontWeight={600}>📐 Formule :</Typography>
          <Typography variant="caption" fontFamily="monospace" display="block">
            {indicateur.formule}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}