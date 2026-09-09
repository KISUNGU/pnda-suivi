import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { moduleGridStyles } from '../../components/common/Layout/moduleGridStyles';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import GoogleIcon from '../../components/common/GoogleIcon';
import {
  venteSemenceService,
  type VenteSemence,
  type VenteSemenceStats,
} from '../../services/api';

const provinces = ['Toutes', 'Kwilu', 'Kongo Central', 'Kasaï', 'Haut-Lomami', 'Tanganyika'];

export const VentesSemencesPage: React.FC = () => {
  const [province, setProvince] = useState('Toutes');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState<VenteSemence[]>([]);
  const [stats, setStats] = useState<VenteSemenceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        search: search || undefined,
        province: province === 'Toutes' ? undefined : province,
      };
      const [listRes, statsRes] = await Promise.all([
        venteSemenceService.getAll(params),
        venteSemenceService.getStats(params),
      ]);

      setRows(listRes.data.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
      setError('Erreur lors du chargement des ventes de semences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [province, search]);

  const ventesParProvince = useMemo(() => {
    return Object.values(rows.reduce<Record<string, { province: string; producteurs: Set<string>; quantite_kg: number; montant_usd: number }>>((acc, row) => {
      if (!acc[row.province]) {
        acc[row.province] = { province: row.province, producteurs: new Set<string>(), quantite_kg: 0, montant_usd: 0 };
      }
      acc[row.province].producteurs.add(row.producteur);
      acc[row.province].quantite_kg += row.quantite_kg;
      acc[row.province].montant_usd += row.montant_usd;
      return acc;
    }, {})).map((row) => ({
      province: row.province,
      producteurs_enregistres: row.producteurs.size,
      quantite_kg: row.quantite_kg,
      montant_usd: row.montant_usd,
    }));
  }, [rows]);

  const ventesParProducteur = useMemo(() => {
    return Object.values(rows.reduce<Record<string, { producteur: string; rna_id: string; province: string; quantite_kg: number; montant_usd: number; ventes: number }>>((acc, row) => {
      if (!acc[row.rna_id]) {
        acc[row.rna_id] = {
          producteur: row.producteur,
          rna_id: row.rna_id,
          province: row.province,
          quantite_kg: 0,
          montant_usd: 0,
          ventes: 0,
        };
      }
      acc[row.rna_id].quantite_kg += row.quantite_kg;
      acc[row.rna_id].montant_usd += row.montant_usd;
      acc[row.rna_id].ventes += 1;
      return acc;
    }, {}));
  }, [rows]);

  const totalProducteurs = new Set(rows.map((row) => row.rna_id)).size;
  const totalQuantite = rows.reduce((sum, row) => sum + row.quantite_kg, 0);
  const totalMontant = rows.reduce((sum, row) => sum + row.montant_usd, 0);

  if (loading && rows.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Vente des semences
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Lecture des ventes de semences par province et par producteur enregistré.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Les producteurs sont rapprochés de la table <strong>agriculteurs</strong> et les transactions sont lues depuis <strong>ventes_semences</strong>.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Provinces actives"
            value={(stats?.provinces_actives ?? ventesParProvince.length).toLocaleString('fr-FR')}
            icon={<GoogleIcon name="map" size={40} />}
            trend={{ value: ventesParProvince.length, direction: 'up', period: 'avec ventes' }}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Producteurs enregistrés"
            value={(stats?.producteurs_enregistres ?? totalProducteurs).toLocaleString('fr-FR')}
            icon={<GoogleIcon name="agriculture" size={40} />}
            trend={{ value: totalProducteurs, direction: 'up', period: 'dans le filtre actif' }}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Semences vendues"
            value={`${(stats?.semences_vendues_kg ?? totalQuantite).toLocaleString('fr-FR')} kg`}
            icon={<GoogleIcon name="eco" size={40} />}
            trend={{ value: totalProducteurs > 0 ? Math.round(totalQuantite / totalProducteurs) : 0, direction: 'up', period: 'moyenne / producteur' }}
            color="warning"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Montant total"
            value={`${(stats?.montant_total_usd ?? totalMontant).toLocaleString('fr-FR')} USD`}
            icon={<GoogleIcon name="payments" size={40} />}
            trend={{ value: totalQuantite > 0 ? Math.round(totalMontant / totalQuantite) : 0, direction: 'up', period: 'USD / kg' }}
            color="info"
          />
        </Grid>
      </Grid>

      <Paper sx={moduleGridStyles.filterPanel}>
        <Grid container spacing={2} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              placeholder="Rechercher par producteur, RNA ou type de semence..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Province</InputLabel>
              <Select value={province} label="Province" onChange={(event) => setProvince(event.target.value)}>
                {provinces.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 12, md: 2 }}>
            <Button fullWidth variant="outlined" onClick={() => { setProvince('Toutes'); setSearch(''); }}>
              Réinitialiser
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <ExportToolbar
        title="Ventes de semences"
        subtitle="Synthèse par province et par producteur"
        columns={[
          { header: 'Province', key: 'province', width: 16 },
          { header: 'Producteur', key: 'producteur', width: 24 },
          { header: 'RNA', key: 'rna_id', width: 16 },
          { header: 'Type semence', key: 'type_semence', width: 20 },
          { header: 'Quantité (kg)', key: 'quantite_kg', width: 16 },
          { header: 'Montant USD', key: 'montant_usd', width: 16 },
          { header: 'Date vente', key: 'date_vente', width: 16 },
        ]}
        getData={() => rows.map((row) => ({
          id: row.id,
          province: row.province,
          producteur: row.producteur,
          rna_id: row.rna_id,
          type_semence: row.type_semence,
          quantite_kg: row.quantite_kg,
          montant_usd: row.montant_usd,
          date_vente: row.date_vente,
        }))}
        filename="ventes_semences"
      />

      <Paper sx={{ borderRadius: 2.1, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Par province" />
          <Tab label="Par producteur" />
          <Tab label="Transactions" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tab === 0 && (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Province</TableCell>
                    <TableCell align="right">Producteurs enregistrés</TableCell>
                    <TableCell align="right">Quantité vendue (kg)</TableCell>
                    <TableCell align="right">Montant (USD)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ventesParProvince.map((row) => (
                    <TableRow key={row.province} hover>
                      <TableCell>{row.province}</TableCell>
                      <TableCell align="right">{row.producteurs_enregistres.toLocaleString('fr-FR')}</TableCell>
                      <TableCell align="right">{row.quantite_kg.toLocaleString('fr-FR')}</TableCell>
                      <TableCell align="right">{row.montant_usd.toLocaleString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 1 && (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Producteur</TableCell>
                    <TableCell>Province</TableCell>
                    <TableCell align="right">Ventes</TableCell>
                    <TableCell align="right">Quantité vendue (kg)</TableCell>
                    <TableCell align="right">Montant (USD)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ventesParProducteur.map((row) => (
                    <TableRow key={row.rna_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{row.producteur}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.rna_id}</Typography>
                      </TableCell>
                      <TableCell>{row.province}</TableCell>
                      <TableCell align="right">{row.ventes}</TableCell>
                      <TableCell align="right">{row.quantite_kg.toLocaleString('fr-FR')}</TableCell>
                      <TableCell align="right">{row.montant_usd.toLocaleString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 2 && (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Producteur</TableCell>
                    <TableCell>Province</TableCell>
                    <TableCell>Type semence</TableCell>
                    <TableCell align="right">Quantité (kg)</TableCell>
                    <TableCell align="right">Montant (USD)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{new Date(row.date_vente).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{row.producteur}</Typography>
                        <Typography variant="caption" color="text.secondary">{row.rna_id}</Typography>
                      </TableCell>
                      <TableCell>{row.province}</TableCell>
                      <TableCell>{row.type_semence}</TableCell>
                      <TableCell align="right">{row.quantite_kg.toLocaleString('fr-FR')}</TableCell>
                      <TableCell align="right">{row.montant_usd.toLocaleString('fr-FR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default VentesSemencesPage;