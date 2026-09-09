// frontend/src/pages/Suivis/SuiviMissions.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Grid,
  Chip,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
} from '@mui/material';
import GoogleIcon from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { suiviService } from '../../services/suivi.service';
import type { SuiviMission, SuiviStats } from '../../services/suivi.service';

const PROVINCES = ['Kasaï', 'Kasaï Central', 'Kwilu', 'UNCP'];

const SECTION_BG: Record<number, string> = {
  1: '#1565c0',
  2: '#2e7d32',
  3: '#e65100',
};

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  icon: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon }) => (
  <GradientWidget
    title={label}
    value={value}
    icon={<GoogleIcon name={icon} size={36} />}
    color={color === '#388e3c' ? 'success' : color === '#f57c00' ? 'warning' : color === '#7b1fa2' ? 'info' : 'primary'}
    onClick={() => window.scrollTo({ top: 420, behavior: 'smooth' })}
  />
);

const fmtUSD = (v: number) =>
  v === 0 ? '–' : `$${v.toLocaleString('fr-FR')}`;

export const SuiviMissions: React.FC = () => {
  const [missions, setMissions] = useState<SuiviMission[]>([]);
  const [stats, setStats] = useState<SuiviStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          suiviService.getMissions(),
          suiviService.getStats(),
        ]);
        setMissions(mRes.data);
        setStats(sRes.data);
      } catch {
        setError('Erreur lors du chargement des données de suivi');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentProvince = PROVINCES[tabValue];
  const q = search.toLowerCase();

  const provinceMissions = missions.filter(
    (m) =>
      m.province === currentProvince &&
      (!q ||
        m.natureMission.toLowerCase().includes(q) ||
        m.objectif.toLowerCase().includes(q) ||
        m.num.includes(q)),
  );

  const sections = [...new Set(provinceMissions.map((m) => m.section))].sort();

  const getMissionsForSection = (sec: number) =>
    provinceMissions.filter((m) => m.section === sec);

  const getSectionLabel = (sec: number) =>
    provinceMissions.find((m) => m.section === sec)?.sectionLabel ?? '';

  const totalMontant = provinceMissions.reduce((s, m) => s + m.montantUSD, 0);
  const totalAvances = provinceMissions.reduce((s, m) => s + m.avanceUSD, 0);
  const totalSolde = provinceMissions.reduce((s, m) => s + m.solde, 0);

  const provinceStats = stats?.parProvince[currentProvince];
  const soldeLabel = currentProvince === 'Kasaï' ? 'Solde' : 'Avance non documentée';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          Tableau de Suivi Mission T4 2025
        </Typography>
        <Typography variant="subtitle2" color="text.secondary">
          RNSE GLOBAL — Trimestre 4 (Oct–Déc 2025)
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Global stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Total missions"
              value={stats.totalMissions.toString()}
              color="#1976d2"
              icon="flight_takeoff"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Montant total"
              value={`$${stats.totalMontant.toLocaleString('fr-FR')}`}
              color="#7b1fa2"
              icon="payments"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Total avances payées"
              value={`$${stats.totalAvances.toLocaleString('fr-FR')}`}
              color="#388e3c"
              icon="account_balance_wallet"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <StatCard
              label="Solde global"
              value={`$${stats.totalSolde.toLocaleString('fr-FR')}`}
              color="#f57c00"
              icon="balance"
            />
          </Grid>
        </Grid>
      )}

      {/* Province Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v: number) => { setTabValue(v); setSearch(''); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          {PROVINCES.map((p, i) => (
            <Tab
              key={p}
              value={i}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{p}</span>
                  {stats && (
                    <Chip
                      size="small"
                      label={stats.parProvince[p]?.missions ?? 0}
                      sx={{ height: 18, fontSize: 11, fontWeight: 600 }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Province-level stats */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                label={`Missions — ${currentProvince}`}
                value={(provinceStats?.missions ?? 0).toString()}
                color="#1976d2"
                icon="assignment"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                label="Montant (USD)"
                value={fmtUSD(provinceStats?.montant ?? 0)}
                color="#7b1fa2"
                icon="attach_money"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                label="Avances payées"
                value={fmtUSD(provinceStats?.avances ?? 0)}
                color="#388e3c"
                icon="payments"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <StatCard
                label={soldeLabel}
                value={fmtUSD(provinceStats?.solde ?? 0)}
                color="#f57c00"
                icon="receipt_long"
              />
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Search bar */}
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Rechercher une mission..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <GoogleIcon name="search" size={20} />
              </InputAdornment>
            ),
          }}
          sx={{ width: 340 }}
        />
      </Box>

      {/* Table */}
      <ExportToolbar
        title={`Suivi des Missions T4 2025 — ${currentProvince}`}
        subtitle="Tableau de suivi missions RNSE GLOBAL"
        columns={[
          { header: 'N°', key: 'num', width: 8 },
          { header: 'Section', key: 'section', width: 10 },
          { header: 'Nature de la mission', key: 'natureMission', width: 40 },
          { header: 'Objectif', key: 'objectif', width: 30 },
          { header: 'Hors projet', key: 'horsProjet', width: 12 },
          { header: 'Projet', key: 'projet', width: 10 },
          { header: 'Montant (USD)', key: 'montantUSD', width: 16 },
          { header: 'Dates', key: 'dates', width: 20 },
          { header: 'Avance (USD)', key: 'avanceUSD', width: 16 },
          { header: 'Solde (USD)', key: 'solde', width: 14 },
        ]}
        getData={() => provinceMissions.map((m) => ({
          num: m.num,
          section: m.section,
          natureMission: m.natureMission,
          objectif: m.objectif ?? '',
          horsProjet: m.horsProjet || 0,
          projet: m.projet || 0,
          montantUSD: m.montantUSD,
          dates: m.dates ?? '',
          avanceUSD: m.avanceUSD,
          solde: m.solde,
        }))}
        filename="suivi_missions_t4_2025"
        landscape
      />
      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#263238' }}>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 56 }}>N°</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 220 }}>
                  Nature de la mission
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 200 }}>Objectif</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 88 }} align="center">
                  Hors projet
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 72 }} align="center">
                  Projet
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 110 }} align="right">
                  Montant USD
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 160 }}>Dates</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 110 }} align="right">
                  Avance USD
                </TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, width: 130 }} align="right">
                  {soldeLabel}
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {sections.map((sec) => {
                const rows = getMissionsForSection(sec);
                return (
                  <React.Fragment key={sec}>
                    {/* Section header */}
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        sx={{
                          bgcolor: SECTION_BG[sec] ?? '#455a64',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.82rem',
                          py: 0.75,
                          letterSpacing: 0.3,
                        }}
                      >
                        {sec}. {getSectionLabel(sec)}
                      </TableCell>
                    </TableRow>

                    {/* Mission rows */}
                    {rows.map((m, i) => (
                      <TableRow
                        key={m.id}
                        sx={{ bgcolor: i % 2 === 0 ? 'inherit' : 'action.hover' }}
                      >
                        <TableCell
                          sx={{ fontWeight: 600, color: 'text.secondary', fontSize: '0.8rem' }}
                        >
                          {m.num}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.82rem' }}>
                          {m.natureMission}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {m.objectif || '–'}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.82rem' }}>
                          {m.horsProjet > 0 ? m.horsProjet : '–'}
                        </TableCell>
                        <TableCell align="center" sx={{ fontSize: '0.82rem' }}>
                          {m.projet > 0 ? m.projet : '–'}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontWeight: 500, fontSize: '0.82rem' }}
                        >
                          {m.montantUSD > 0
                            ? `$${m.montantUSD.toLocaleString('fr-FR')}`
                            : '–'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                          {m.dates || '–'}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 500,
                            fontSize: '0.82rem',
                            color: m.avanceUSD > 0 ? '#2e7d32' : 'text.disabled',
                          }}
                        >
                          {m.avanceUSD > 0
                            ? `$${m.avanceUSD.toLocaleString('fr-FR')}`
                            : '–'}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 500,
                            fontSize: '0.82rem',
                            color: m.solde > 0 ? '#d32f2f' : 'text.disabled',
                          }}
                        >
                          {m.solde > 0
                            ? `$${m.solde.toLocaleString('fr-FR')}`
                            : '–'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Totals footer */}
              <TableRow sx={{ bgcolor: 'action.selected' }}>
                <TableCell
                  colSpan={5}
                  sx={{ fontWeight: 700, fontSize: '0.85rem', py: 1 }}
                >
                  TOTAL AVANCES PAYÉES
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                  {totalMontant > 0 ? `$${totalMontant.toLocaleString('fr-FR')}` : '–'}
                </TableCell>
                <TableCell />
                <TableCell
                  align="right"
                  sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#2e7d32' }}
                >
                  {totalAvances > 0 ? `$${totalAvances.toLocaleString('fr-FR')}` : '–'}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#d32f2f' }}
                >
                  {totalSolde > 0 ? `$${totalSolde.toLocaleString('fr-FR')}` : '–'}
                </TableCell>
              </TableRow>

              {provinceMissions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    Aucune mission trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};
