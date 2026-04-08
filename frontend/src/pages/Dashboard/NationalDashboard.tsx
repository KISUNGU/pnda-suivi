// frontend/src/pages/Dashboard/NationalDashboard.tsx (version complète)
import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { IndicatorChart } from '../../components/common/Charts/IndicatorChart';
import { PerformanceGauge } from '../../components/common/Charts/PerformanceGauge';
import { InteractiveMap } from '../../components/common/Map/InteractiveMap';
import { dashboardService, indicateurService } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const NationalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [beneficiairesTotal, setBeneficiairesTotal] = useState<number | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashboardResult, beneficiairesResult] = await Promise.allSettled([
          indicateurService.getDashboard(),
          dashboardService.getBeneficiairesSummary(),
        ]);

        if (dashboardResult.status === 'rejected') {
          throw dashboardResult.reason;
        }

        setDashboardData(dashboardResult.value.data);

        if (beneficiairesResult.status === 'fulfilled') {
          setBeneficiairesTotal(beneficiairesResult.value.data.total);
        } else {
          console.error('Erreur lors du chargement des bénéficiaires RNA', beneficiairesResult.reason);
        }
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

  const evolutionData = dashboardData?.evolution || [];

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
        Tableau de bord national
      </Typography>
      <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
        Vue d'ensemble des indicateurs clés du Programme National de Développement Agricole
      </Typography>

      {/* Widgets KPI */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Bénéficiaires"
            value={beneficiairesTotal !== null ? beneficiairesTotal.toLocaleString('fr-FR') : '--'}
            icon={<span style={{ fontSize: 40 }}>🌾</span>}
            trend={{ value: 8.2, direction: 'up', period: 'trimestre précédent' }}
            color="primary"
            onClick={() => navigate('/beneficiaires/rna')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Productivité (IODP2)"
            value={`+${dashboardData?.iodp2?.current || 0}%`}
            icon={<span style={{ fontSize: 40 }}>📈</span>}
            trend={{ value: dashboardData?.iodp2?.trend || 0, direction: 'up', period: 'trimestre précédent' }}
            color="success"
            onClick={() => navigate('/indicateurs/iodp')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Accès marché (IODP1)"
            value={`+${dashboardData?.iodp1?.current || 0}%`}
            icon={<span style={{ fontSize: 40 }}>💰</span>}
            trend={{ value: dashboardData?.iodp1?.trend || 0, direction: 'up', period: 'trimestre précédent' }}
            color="info"
            onClick={() => navigate('/indicateurs/iodp')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Risques actifs"
            value="12"
            icon={<span style={{ fontSize: 40 }}>⚠️</span>}
            trend={{ value: 3, direction: 'up', period: 'nouveaux' }}
            color="warning"
            onClick={() => navigate('/risques/registre')}
          />
        </Grid>
      </Grid>

      {/* Cartes et graphiques */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              🗺️ Carte des interventions par province
            </Typography>
            <InteractiveMap height={400} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <IndicatorChart
            title="Évolution des indicateurs clés"
            data={evolutionData}
            lines={[
              { key: 'iodp1', name: 'IODP1 - Accès marché', color: '#2E7D32' },
              { key: 'iodp2', name: 'IODP2 - Productivité', color: '#4CAF50' },
              { key: 'iodp3', name: 'IODP3 - Capacité publique', color: '#81C784' },
            ]}
            type="line"
            unit="%"
          />
        </Grid>
      </Grid>

      {/* Indicateurs de performance */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge
            title="IODP1 - Accès au marché"
            current={dashboardData?.iodp1?.current || 0}
            target={dashboardData?.iodp1?.target || 30}
            unit="%"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge
            title="IODP2 - Productivité agricole"
            current={dashboardData?.iodp2?.current || 0}
            target={dashboardData?.iodp2?.target || 40}
            unit="%"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge
            title="IODP3 - Capacité du secteur public"
            current={dashboardData?.iodp3?.current || 0}
            target={dashboardData?.iodp3?.target || 100}
            unit="%"
          />
        </Grid>
      </Grid>
    </Box>
  );
};