// frontend/src/pages/Rapports/PowerBIReports.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Avatar,
  Divider,
  Stack,
  Alert,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  BarChart, Bar,
  LineChart, Line,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent';
import GoogleIcon from '../../components/common/GoogleIcon';

const fmtNum = (v: ValueType | undefined) => (typeof v === 'number' ? v.toLocaleString() : String(v ?? ''));
const fmtPct = (v: ValueType | undefined) => (typeof v === 'number' ? `${v}%` : String(v ?? ''));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Rapport {
  id: string;
  name: string;
  description: string;
  category: 'dashboard' | 'indicateurs' | 'beneficiaires' | 'risques' | 'grm';
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
const COLORS = ['#2E7D32', '#4CAF50', '#81C784', '#A5D6A7', '#C8E6C9'];
const PALETTE = {
  dashboard:     { bg: '#E8F5E9', fg: '#2E7D32' },
  indicateurs:   { bg: '#E3F2FD', fg: '#1976D2' },
  beneficiaires: { bg: '#F3E5F5', fg: '#7B1FA2' },
  risques:       { bg: '#FFF3E0', fg: '#F9A825' },
  grm:           { bg: '#FFEBEE', fg: '#D32F2F' },
};

// ---------------------------------------------------------------------------
// Catalogue des rapports
// ---------------------------------------------------------------------------
const categories = [
  { value: 'all',           label: 'Tous',             icon: 'dashboard' },
  { value: 'dashboard',     label: 'Tableaux de bord', icon: 'dashboard' },
  { value: 'indicateurs',   label: 'Indicateurs',      icon: 'bar_chart' },
  { value: 'beneficiaires', label: 'Bénéficiaires',    icon: 'people' },
  { value: 'risques',       label: 'Risques',          icon: 'warning' },
  { value: 'grm',           label: 'GRM',              icon: 'chat' },
];

const rapports: Rapport[] = [
  {
    id: '1', name: 'Tableau de bord exécutif',
    description: 'KPIs clés du programme : bénéficiaires, productivité, accès marché, taux de réalisation',
    category: 'dashboard', updated_at: '2026-03-28',
  },
  {
    id: '2', name: 'Suivi des indicateurs IODP',
    description: 'Performance des objectifs de développement vs cibles avec graphiques d\'évolution',
    category: 'indicateurs', updated_at: '2026-03-25',
  },
  {
    id: '3', name: 'Analyse des bénéficiaires',
    description: 'Distribution géographique et démographique – sexe, âge, province',
    category: 'beneficiaires', updated_at: '2026-03-20',
  },
  {
    id: '4', name: 'Matrice des risques',
    description: 'Évaluation et suivi des risques du programme avec plan d\'atténuation',
    category: 'risques', updated_at: '2026-03-22',
  },
  {
    id: '5', name: 'Gestion des plaintes GRM',
    description: 'Suivi des plaintes VBG/EAS/HS, délais de traitement et taux de résolution',
    category: 'grm', updated_at: '2026-03-28',
  },
  {
    id: '6', name: 'Performance par province',
    description: 'Analyse comparative des performances provinciales (bénéficiaires, productions)',
    category: 'dashboard', updated_at: '2026-03-18',
  },
  {
    id: '7', name: 'Rapport trimestriel T1 2026',
    description: 'Synthèse complète des performances du premier trimestre 2026',
    category: 'dashboard', updated_at: '2026-03-30',
  },
];

// ---------------------------------------------------------------------------
// Données des graphiques
// ---------------------------------------------------------------------------
const dataEvolution = [
  { mois: 'Oct', beneficiaires: 98000, cible: 110000 },
  { mois: 'Nov', beneficiaires: 104000, cible: 112000 },
  { mois: 'Déc', beneficiaires: 109000, cible: 114000 },
  { mois: 'Jan', beneficiaires: 113500, cible: 116000 },
  { mois: 'Fév', beneficiaires: 119000, cible: 120000 },
  { mois: 'Mar', beneficiaires: 124530, cible: 124000 },
];

const dataIODP = [
  { indicateur: 'IODP1.1', realise: 50, cible: 100, label: 'Ventes agri.' },
  { indicateur: 'IODP2.1', realise: 64.9, cible: 100, label: 'Adoption tech.' },
  { indicateur: 'IODP2.3', realise: 76.7, cible: 100, label: 'Rendement maïs' },
  { indicateur: 'IODP3.1', realise: 62.5, cible: 100, label: 'Plans conting.' },
  { indicateur: 'IODP4.1', realise: 81, cible: 100, label: 'Accès marché' },
];

const dataBenefSexe = [
  { name: 'Femmes', value: 56038 },
  { name: 'Hommes', value: 68492 },
];

const dataBenefAge = [
  { tranche: '18–25', valeur: 18450 },
  { tranche: '26–35', valeur: 32200 },
  { tranche: '36–45', valeur: 28900 },
  { tranche: '46–55', valeur: 27680 },
  { tranche: '56+',   valeur: 17300 },
];

const dataProvinces = [
  { province: 'Kinshasa',       value: 15230 },
  { province: 'Kongo Central',  value: 18920 },
  { province: 'Kwilu',          value: 14250 },
  { province: 'Kasaï',          value: 16890 },
  { province: 'Haut-Katanga',   value: 22340 },
  { province: 'Tanganyika',     value: 19800 },
  { province: 'Sud-Kivu',       value: 17100 },
];

const dataRisques = [
  { axe: 'Sécurité', score: 3 },
  { axe: 'Climatique', score: 4 },
  { axe: 'Financier', score: 2 },
  { axe: 'Opérationnel', score: 3 },
  { axe: 'Social', score: 2 },
  { axe: 'Institutionnel', score: 1 },
];

const dataRisqueMatrice = [
  { niveau: 'Critique', count: 2, color: '#F44336' },
  { niveau: 'Élevé',    count: 4, color: '#FF9800' },
  { niveau: 'Modéré',   count: 3, color: '#FFC107' },
  { niveau: 'Faible',   count: 6, color: '#4CAF50' },
];

const dataGRM = [
  { mois: 'Oct', plaintes: 12, resolues: 10 },
  { mois: 'Nov', plaintes: 18, resolues: 15 },
  { mois: 'Déc', plaintes: 22, resolues: 19 },
  { mois: 'Jan', plaintes: 15, resolues: 14 },
  { mois: 'Fév', plaintes: 28, resolues: 24 },
  { mois: 'Mar', plaintes: 20, resolues: 19 },
];

const dataGRMType = [
  { type: 'VBG',         count: 18, color: '#D32F2F' },
  { type: 'EAS/HS',      count: 12, color: '#F44336' },
  { type: 'Corruption',  count: 8,  color: '#FF9800' },
  { type: 'Exclusion',   count: 25, color: '#FFC107' },
  { type: 'Autre',       count: 15, color: '#9E9E9E' },
];

// ---------------------------------------------------------------------------
// Sous-composants de rapport
// ---------------------------------------------------------------------------
const KPICard: React.FC<{
  label: string; value: string; change?: string; icon: string; color: string;
}> = ({ label, value, change, icon, color }) => (
  <Paper sx={{ p: 2, borderRadius: 2, bgcolor: `${color}10`, height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <GoogleIcon name={icon} size={20} sx={{ color }} />
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
    <Typography variant="h5" fontWeight={700} color={color}>{value}</Typography>
    {change && (
      <Typography variant="caption" color={change.startsWith('+') ? 'success.main' : 'error.main'}>
        {change} vs période précédente
      </Typography>
    )}
  </Paper>
);

const RapportExecutif: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Bénéficiaires" value="124 530" change="+8.2%" icon="people" color="#2E7D32" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Productivité agri." value="+23%" change="+5.3%" icon="trending_up" color="#4CAF50" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Accès au marché" value="+15%" change="+2.1%" icon="storefront" color="#1976D2" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Taux de réalisation" value="71%" change="+12%" icon="check_circle" color="#FF9800" />
      </Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 8 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Évolution des bénéficiaires vs cible</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dataEvolution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="mois" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <RechartTooltip formatter={fmtNum} />
              <Legend />
              <Area type="monotone" dataKey="beneficiaires" name="Réalisé" stroke="#2E7D32" fill="#C8E6C9" />
              <Area type="monotone" dataKey="cible" name="Cible" stroke="#FF9800" fill="#FFE0B2" strokeDasharray="5 5" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Répartition budget</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={[
                { name: 'Intrants', value: 35 },
                { name: 'Formation', value: 25 },
                { name: 'Infra.', value: 20 },
                { name: 'Gestion', value: 12 },
                { name: 'Autres', value: 8 },
              ]} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} ${value}%`} labelLine={false}>
                {COLORS.map((c, i) => <Cell key={i} fill={c} />)}
              </Pie>
              <RechartTooltip formatter={fmtPct} />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const RapportIODP: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {dataIODP.map((d) => (
        <Grid size={{ xs: 12 }} key={d.indicateur}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>{d.indicateur} – {d.label}</Typography>
              <Typography variant="body2" fontWeight={700} color={d.realise >= 75 ? 'success.main' : d.realise >= 50 ? 'warning.main' : 'error.main'}>
                {d.realise}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={d.realise}
              sx={{
                height: 10, borderRadius: 5,
                bgcolor: '#E0E0E0',
                '& .MuiLinearProgress-bar': {
                  bgcolor: d.realise >= 75 ? '#4CAF50' : d.realise >= 50 ? '#FF9800' : '#F44336',
                  borderRadius: 5,
                },
              }}
            />
          </Paper>
        </Grid>
      ))}
    </Grid>
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" gutterBottom>Performance IODP (% atteinte)</Typography>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={dataIODP} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="indicateur" width={70} />
          <RechartTooltip formatter={fmtPct} />
          <Bar dataKey="realise" name="Réalisé" fill="#2E7D32" radius={[0, 4, 4, 0]} />
          <Bar dataKey="cible" name="Cible" fill="#E0E0E0" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  </Box>
);

const RapportBeneficiaires: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Total" value="124 530" icon="people" color="#2E7D32" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Femmes" value="56 038" change="+45%" icon="female" color="#E91E63" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Hommes" value="68 492" icon="male" color="#1976D2" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Jeunes (18–35)" value="50 650" change="+40.7%" icon="school" color="#FF9800" />
      </Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Répartition par sexe</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={dataBenefSexe} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name as string} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                <Cell fill="#E91E63" />
                <Cell fill="#1976D2" />
              </Pie>
              <RechartTooltip formatter={fmtNum} />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Répartition par tranche d'âge</Typography>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dataBenefAge}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="tranche" />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <RechartTooltip formatter={fmtNum} />
              <Bar dataKey="valeur" fill="#4CAF50" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Top provinces</Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {dataProvinces.slice(0, 5).map((p) => (
              <Box key={p.province}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">{p.province}</Typography>
                  <Typography variant="caption" fontWeight={600}>{p.value.toLocaleString()}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={(p.value / 25000) * 100} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const RapportRisques: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {dataRisqueMatrice.map((r) => (
        <Grid size={{ xs: 6, md: 3 }} key={r.niveau}>
          <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: `${r.color}15` }}>
            <Typography variant="caption" color="text.secondary">{r.niveau}</Typography>
            <Typography variant="h4" fontWeight={800} color={r.color}>{r.count}</Typography>
            <Typography variant="caption" color="text.secondary">risques</Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Radar des risques par axe</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={dataRisques}>
              <PolarGrid />
              <PolarAngleAxis dataKey="axe" />
              <Radar name="Score" dataKey="score" stroke="#F44336" fill="#F44336" fillOpacity={0.3} />
              <RechartTooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ mb: 2 }}>Risques critiques & élevés</Typography>
          <Stack spacing={1.5}>
            {[
              { titre: 'Sécheresse au Kasaï', niveau: 'Critique', icon: 'warning', color: '#F44336' },
              { titre: 'Retard distribution intrants', niveau: 'Critique', icon: 'warning', color: '#F44336' },
              { titre: 'Instabilité sécuritaire Est', niveau: 'Élevé', icon: 'gpp_maybe', color: '#FF9800' },
              { titre: 'Inflation des coûts opérations', niveau: 'Élevé', icon: 'gpp_maybe', color: '#FF9800' },
            ].map((r, i) => (
              <Alert
                key={i}
                severity={r.niveau === 'Critique' ? 'error' : 'warning'}
                icon={<GoogleIcon name={r.icon} size={16} />}
                sx={{ borderRadius: 2, py: 0.5 }}
              >
                <Typography variant="caption" fontWeight={600}>{r.titre}</Typography>
              </Alert>
            ))}
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const RapportGRM: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Plaintes reçues" value="115" change="+12" icon="inbox" color="#D32F2F" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Résolues" value="101" change="+87.8%" icon="check_circle" color="#2E7D32" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="En cours" value="14" icon="pending" color="#FF9800" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Délai moyen" value="4.2 j" change="-1.3j" icon="schedule" color="#1976D2" />
      </Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Plaintes reçues vs résolues</Typography>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dataGRM}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <RechartTooltip />
              <Legend />
              <Bar dataKey="plaintes" name="Reçues" fill="#EF9A9A" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolues" name="Résolues" fill="#2E7D32" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Paper sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>Types de plaintes</Typography>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={dataGRMType} cx="50%" cy="50%" outerRadius={80} dataKey="count"
                label={({ name, percent }) => `${name as string} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {dataGRMType.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <RechartTooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

const RapportParProvince: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Provinces actives" value="7 / 10" icon="map" color="#2E7D32" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Meilleure perf." value="Haut-Katanga" icon="emoji_events" color="#FF9800" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Objectif H.-Katanga" value="95%" icon="bar_chart" color="#4CAF50" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Écart min-max" value="8 090" icon="compare_arrows" color="#1976D2" />
      </Grid>
    </Grid>
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" gutterBottom>Bénéficiaires par province</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={dataProvinces}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="province" angle={-20} textAnchor="end" interval={0} height={55} />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
          <RechartTooltip formatter={fmtNum} />
          <Bar dataKey="value" name="Bénéficiaires" radius={[4, 4, 0, 0]}>
            {dataProvinces.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Paper>
  </Box>
);

const RapportTrimestriel: React.FC = () => (
  <Box sx={{ p: 3 }}>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Score global T1" value="71%" change="+8%" icon="assessment" color="#2E7D32" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Activités réalisées" value="48 / 67" icon="task_alt" color="#4CAF50" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Budget consommé" value="62%" change="+5%" icon="account_balance_wallet" color="#1976D2" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <KPICard label="Indicateurs atteints" value="3 / 5" icon="flag" color="#FF9800" />
      </Grid>
    </Grid>
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="subtitle2" gutterBottom>Évolution mensuelle – T1 2026</Typography>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={[
          { mois: 'Jan', realise: 58, budget: 55 },
          { mois: 'Fév', realise: 64, budget: 61 },
          { mois: 'Mar', realise: 71, budget: 62 },
        ]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="mois" />
          <YAxis tickFormatter={(v) => `${v}%`} />
          <RechartTooltip formatter={fmtPct} />
          <Legend />
          <Line type="monotone" dataKey="realise" name="Taux réalisation" stroke="#2E7D32" strokeWidth={2} dot={{ r: 5 }} />
          <Line type="monotone" dataKey="budget" name="Budget consommé" stroke="#1976D2" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </Paper>
  </Box>
);

// Mapping id → composant
const rapportComponents: Record<string, React.ReactNode> = {
  '1': <RapportExecutif />,
  '2': <RapportIODP />,
  '3': <RapportBeneficiaires />,
  '4': <RapportRisques />,
  '5': <RapportGRM />,
  '6': <RapportParProvince />,
  '7': <RapportTrimestriel />,
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export const PowerBIReports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRapport, setSelectedRapport] = useState<Rapport | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = rapports.filter((r) => {
    const matchCat = selectedCategory === 'all' || r.category === selectedCategory;
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleOpen = (r: Rapport) => { setSelectedRapport(r); setDialogOpen(true); };

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}>
          Rapports &amp; Analyses
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tableaux de bord interactifs et rapports d'analyse avancée du programme PNDA-SE
        </Typography>
      </Box>

      {/* Recherche */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <TextField
          fullWidth
          placeholder="Rechercher un rapport…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <GoogleIcon name="search" size={20} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchQuery('')}>
                  <GoogleIcon name="close" size={16} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Paper>

      {/* Catégories */}
      <Tabs
        value={selectedCategory}
        onChange={(_, v) => setSelectedCategory(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {categories.map((cat) => (
          <Tab
            key={cat.value}
            value={cat.value}
            label={cat.label}
            icon={<GoogleIcon name={cat.icon} size={18} />}
            iconPosition="start"
          />
        ))}
      </Tabs>

      {/* Grille */}
      <Grid container spacing={3}>
        {filtered.map((rapport) => {
          const pal = PALETTE[rapport.category];
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={rapport.id}>
              <Card
                sx={{
                  borderRadius: 2, cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  border: `1px solid ${pal.bg}`,
                }}
                onClick={() => handleOpen(rapport)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: pal.bg, color: pal.fg, width: 44, height: 44 }}>
                      <GoogleIcon
                        name={categories.find((c) => c.value === rapport.category)?.icon ?? 'bar_chart'}
                        size={24}
                      />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} noWrap>{rapport.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Mis à jour le {new Date(rapport.updated_at).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {rapport.description}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={categories.find((c) => c.value === rapport.category)?.label}
                      size="small"
                      sx={{ bgcolor: pal.bg, color: pal.fg }}
                    />
                    <Tooltip title="Ouvrir le rapport">
                      <IconButton size="small" sx={{ color: pal.fg }}>
                        <GoogleIcon name="open_in_new" size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {filtered.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, mt: 2 }}>
          <GoogleIcon name="search_off" size={48} sx={{ color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">Aucun rapport trouvé</Typography>
          <Typography variant="body2" color="text.secondary">Modifiez vos critères de recherche</Typography>
        </Paper>
      )}

      {/* Dialog rapport */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { maxHeight: '92vh', borderRadius: 3 } }}
      >
        {selectedRapport && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GoogleIcon name="analytics" size={24} sx={{ color: PALETTE[selectedRapport.category].fg }} />
                <Typography variant="h6" fontWeight={600}>{selectedRapport.name}</Typography>
                <Chip
                  label={categories.find((c) => c.value === selectedRapport.category)?.label}
                  size="small"
                  sx={{ bgcolor: PALETTE[selectedRapport.category].bg, color: PALETTE[selectedRapport.category].fg }}
                />
              </Box>
              <IconButton onClick={() => setDialogOpen(false)}>
                <GoogleIcon name="close" size={20} />
              </IconButton>
            </DialogTitle>
            <Divider />
            <DialogContent sx={{ p: 0, overflowY: 'auto' }}>
              {rapportComponents[selectedRapport.id] ?? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">Rapport non disponible</Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 1.5 }}>
              <Button onClick={() => setDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" sx={{ bgcolor: '#2E7D32' }} startIcon={<GoogleIcon name="download" size={18} />}>
                Exporter PDF
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PowerBIReports;
