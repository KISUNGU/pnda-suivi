// frontend/src/pages/Dashboard/NationalDashboard.tsx (version complète)
import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { IndicatorChart } from '../../components/common/Charts/IndicatorChart';
import { PerformanceGauge } from '../../components/common/Charts/PerformanceGauge';
import { InteractiveMap } from '../../components/common/Map/InteractiveMap';
import { dashboardService, type RnaOverview } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const NationalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<RnaOverview | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await dashboardService.getRnaOverview();
        setDashboardData(response.data);
      } catch (err) {
        setError('Erreur lors du chargement des données');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const evolutionData = (dashboardData?.evolution ?? []).map((item) => ({
    name: item.month,
    total: item.total,
  }));
  const femmes = dashboardData?.femmes ?? 0;
  const hommes = dashboardData?.hommes ?? 0;
  const total = dashboardData?.total ?? 0;
  const provinces = dashboardData?.provinces ?? 0;
  const femmesPct = total > 0 ? Math.round((femmes / total) * 100) : 0;
  const hommesPct = total > 0 ? Math.round((hommes / total) * 100) : 0;
  const coveragePct = Math.round((provinces / 26) * 100);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
        Tableau de bord national
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        Vue d'ensemble nationale issue du registre RNA des agriculteurs
      </Typography>

      {/* Widgets KPI */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Bénéficiaires"
            value={total.toLocaleString('fr-FR')}
            icon={<Box component="span" sx={{ fontSize: 40 }}>🌾</Box>}
            trend={{ value: coveragePct, direction: 'up', period: 'couverture nationale' }}
            color="primary"
            onClick={() => navigate('/beneficiaires/rna')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Femmes bénéficiaires"
            value={femmes.toLocaleString('fr-FR')}
            icon={<Box component="span" sx={{ fontSize: 40 }}>👩</Box>}
            trend={{ value: femmesPct, direction: 'up', period: '% du total' }}
            color="success"
            onClick={() => navigate('/beneficiaires/rna')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Hommes bénéficiaires"
            value={hommes.toLocaleString('fr-FR')}
            icon={<Box component="span" sx={{ fontSize: 40 }}>👨</Box>}
            trend={{ value: hommesPct, direction: 'up', period: '% du total' }}
            color="info"
            onClick={() => navigate('/beneficiaires/rna')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Provinces couvertes"
            value={provinces}
            icon={<Box component="span" sx={{ fontSize: 40 }}>🗺️</Box>}
            trend={{ value: coveragePct, direction: 'up', period: 'sur 26 provinces' }}
            color="warning"
            onClick={() => navigate('/dashboard/provincial')}
          />
        </Grid>
      </Grid>

      {/* Cartes et graphiques */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Carte de couverture provinciale
            </Typography>
            <InteractiveMap height={400} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <IndicatorChart
            title="Évolution des enregistrements RNA"
            data={evolutionData}
            lines={[
              { key: 'total', name: 'Bénéficiaires RNA', color: '#2E7D32' },
            ]}
            type="line"
            unit="pers."
            showToggle={false}
          />
        </Grid>
      </Grid>

      {/* Indicateurs de performance */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge
            title="Part des femmes"
            current={femmesPct}
            target={50}
            unit="%"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge
            title="Part des hommes"
            current={hommesPct}
            target={50}
            unit="%"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge
            title="Couverture provinciale"
            current={coveragePct}
            target={100}
            unit="%"
          />
        </Grid>
      </Grid>
    </Box>
  );
};