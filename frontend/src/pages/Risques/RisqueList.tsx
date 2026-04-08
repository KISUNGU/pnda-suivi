// frontend/src/pages/Risques/RisqueList.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
} from '@mui/material';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import risqueService from '../../services/risque.service';
import type { Risque, ActionAtténuation, AlerteRisque } from '../../services/risque.service';

// Données mockées complètes
const mockRisques: Risque[] = [
  {
    id: 1,
    code: 'RISK-001',
    nom: 'Retard dans la distribution des intrants agricoles',
    description: 'Les intrants agricoles (semences, engrais) ne sont pas distribués dans les délais impartis, impactant les campagnes agricoles.',
    categorie: 'gestion',
    probabilite: 4,
    impact: 3,
    niveau: 'Élevé',
    statut: 'en_cours',
    plan_atténuation: 'Renforcer la logistique, mettre en place un suivi quotidien des livraisons, prévoir des stocks tampons',
    responsable: 'UNCP / Cellule Logistique',
    date_identification: '2026-01-15',
    province: 'Kwilu, Kasaï, Haut-Lomami',
    actions_prevues: ['Établir un planning de livraison', 'Renforcer l\'équipe logistique', 'Mettre en place un système de tracking'],
    indicateurs_surveillance: ['Délai moyen de livraison', 'Taux de satisfaction des bénéficiaires'],
    dernier_suivi: '2026-03-25',
  },
  {
    id: 2,
    code: 'RISK-002',
    nom: 'Sécheresse prolongée affectant les rendements',
    description: 'Risque de sécheresse prolongée pendant la saison des pluies, pouvant réduire les rendements agricoles de 30 à 50%.',
    categorie: 'environnemental',
    probabilite: 3,
    impact: 5,
    niveau: 'Critique',
    statut: 'identifie',
    plan_atténuation: 'Mettre en place des systèmes d\'irrigation goutte-à-goutte, distribuer des semences résistantes à la sécheresse, former aux techniques de conservation de l\'eau',
    responsable: 'Ministère Agriculture / INERA',
    date_identification: '2026-02-10',
    province: 'Kasaï, Kwilu, Tanganyika',
    actions_prevues: ['Distribution de semences résistantes', 'Formation aux techniques AIC', 'Installation de systèmes d\'irrigation pilotes'],
    indicateurs_surveillance: ['Indice de sécheresse', 'Rendements par culture', 'Taux d\'adoption des techniques AIC'],
    dernier_suivi: '2026-03-20',
  },
  {
    id: 3,
    code: 'RISK-003',
    nom: 'Insécurité dans les zones d\'intervention',
    description: 'Présence de groupes armés dans certaines zones limitant l\'accès aux bénéficiaires et la mise en œuvre des activités.',
    categorie: 'sante_securite',
    probabilite: 2,
    impact: 4,
    niveau: 'Élevé',
    statut: 'en_cours',
    plan_atténuation: 'Coordination avec les autorités locales, adaptation des itinéraires, mise en place de couloirs sécurisés',
    responsable: 'OVDA / Autorités provinciales',
    date_identification: '2026-01-05',
    province: 'Kasaï, Tanganyika',
    actions_prevues: ['Réunions de coordination mensuelles', 'Évaluation des zones à risque', 'Plan de contingence sécuritaire'],
    indicateurs_surveillance: ['Nombre d\'incidents signalés', 'Accès aux zones ciblées', 'Délais de mise en œuvre'],
    dernier_suivi: '2026-03-28',
  },
  {
    id: 4,
    code: 'RISK-004',
    nom: 'Faible adoption des technologies agricoles',
    description: 'Les agriculteurs sont réticents à adopter les nouvelles technologies AIC/AIN en raison de traditions locales et de manque de confiance.',
    categorie: 'technique',
    probabilite: 3,
    impact: 3,
    niveau: 'Modéré',
    statut: 'atténue',
    plan_atténuation: 'Renforcer les formations, organiser des démonstrations terrain, impliquer les leaders communautaires',
    responsable: 'SENASEM / Services de vulgarisation',
    date_identification: '2025-12-10',
    province: 'Kinshasa, Kongo Central',
    actions_prevues: ['Campagnes de sensibilisation', 'Champs écoles paysans', 'Visites d\'échanges inter-paysans'],
    indicateurs_surveillance: ['Taux d\'adoption', 'Nombre de formations réalisées', 'Satisfaction des bénéficiaires'],
    dernier_suivi: '2026-03-15',
  },
  {
    id: 5,
    code: 'RISK-005',
    nom: 'Fluctuation des prix des produits agricoles',
    description: 'Variations importantes des prix sur les marchés, impactant les revenus des petits exploitants.',
    categorie: 'socio_economique',
    probabilite: 4,
    impact: 3,
    niveau: 'Élevé',
    statut: 'en_cours',
    plan_atténuation: 'Mettre en place des systèmes d\'information sur les marchés, faciliter l\'accès au stockage, promouvoir les contrats de vente',
    responsable: 'UNCP / Services des marchés',
    date_identification: '2026-02-20',
    province: 'National',
    actions_prevues: ['Création d\'un observatoire des prix', 'Appui aux organisations paysannes pour la commercialisation', 'Systèmes d\'alerte précoce'],
    indicateurs_surveillance: ['Indice des prix', 'Marge bénéficiaire des exploitants', 'Volume vendu sur les marchés formels'],
    dernier_suivi: '2026-03-22',
  },
  {
    id: 6,
    code: 'RISK-006',
    nom: 'Capacité institutionnelle limitée',
    description: 'Faiblesse des capacités des institutions publiques pour la mise en œuvre et le suivi du programme.',
    categorie: 'gestion',
    probabilite: 3,
    impact: 4,
    niveau: 'Élevé',
    statut: 'identifie',
    plan_atténuation: 'Renforcement des capacités, formations continues, appui technique personnalisé',
    responsable: 'UNCP / Banque Mondiale',
    date_identification: '2026-01-20',
    province: 'National',
    actions_prevues: ['Plan de formation annuel', 'Recrutement d\'experts', 'Mentorat des équipes provinciales'],
    indicateurs_surveillance: ['Taux d\'exécution des activités', 'Qualité des rapports', 'Score de performance institutionnelle'],
    dernier_suivi: '2026-03-18',
  },
];

const mockActions: Record<number, ActionAtténuation[]> = {
  1: [
    { id: 1, id_risque: 1, action: 'Établir un planning de livraison détaillé', responsable: 'Cellule Logistique', date_debut: '2026-02-01', date_fin: '2026-02-28', statut: 'realisee', resultat: 'Planning validé et diffusé' },
    { id: 2, id_risque: 1, action: 'Renforcer l\'équipe logistique', responsable: 'UNCP', date_debut: '2026-02-15', date_fin: '2026-03-15', statut: 'realisee', resultat: '2 recrutements effectués' },
    { id: 3, id_risque: 1, action: 'Mettre en place un système de tracking', responsable: 'DANTIC', date_debut: '2026-03-01', date_fin: '2026-04-30', statut: 'en_cours' },
  ],
  2: [
    { id: 1, id_risque: 2, action: 'Distribution de semences résistantes', responsable: 'SENASEM', date_debut: '2026-03-01', date_fin: '2026-04-15', statut: 'prevue' },
    { id: 2, id_risque: 2, action: 'Formation aux techniques AIC', responsable: 'Vulgarisation', date_debut: '2026-03-15', date_fin: '2026-05-30', statut: 'prevue' },
  ],
};

const mockAlertes: AlerteRisque[] = [
  { id: 1, id_risque: 2, message: 'Niveau de risque sécheresse élevé dans la province du Kasaï', date_alerte: '2026-03-28T08:00:00Z', est_lue: false, niveau: 'danger' },
  { id: 2, id_risque: 1, message: 'Retard de 15 jours dans la livraison des intrants', date_alerte: '2026-03-25T14:30:00Z', est_lue: false, niveau: 'warning' },
  { id: 3, id_risque: 5, message: 'Baisse des prix du maïs de 20% sur le marché de Kinshasa', date_alerte: '2026-03-20T10:15:00Z', est_lue: true, niveau: 'warning' },
];

const categorieConfig = {
  gestion: { label: 'Gestion', icon: 'settings', color: '#1976D2', bg: '#E3F2FD' },
  technique: { label: 'Technique', icon: 'engineering', color: '#FF8F00', bg: '#FFF8E1' },
  politique: { label: 'Politique', icon: 'gavel', color: '#7B1FA2', bg: '#F3E5F5' },
  socio_economique: { label: 'Socio-économique', icon: 'trending_up', color: '#388E3C', bg: '#E8F5E9' },
  environnemental: { label: 'Environnemental', icon: 'eco', color: '#2E7D32', bg: '#E8F5E9' },
  sante_securite: { label: 'Santé & Sécurité', icon: 'health_and_safety', color: '#D32F2F', bg: '#FFEBEE' },
};

const niveauConfig = {
  Faible: { label: 'Faible', color: '#4CAF50', bg: '#E8F5E9', icon: 'check_circle' },
  Modéré: { label: 'Modéré', color: '#FFC107', bg: '#FFF8E1', icon: 'warning' },
  Élevé: { label: 'Élevé', color: '#FF9800', bg: '#FFF3E0', icon: 'priority_high' },
  Critique: { label: 'Critique', color: '#F44336', bg: '#FFEBEE', icon: 'error' },
};

const statutConfig = {
  identifie: { label: 'Identifié', color: '#9E9E9E', bg: '#F5F5F5', icon: 'info' },
  en_cours: { label: 'En cours', color: '#FF9800', bg: '#FFF3E0', icon: 'pending' },
  atténue: { label: 'Atténué', color: '#4CAF50', bg: '#E8F5E9', icon: 'check_circle' },
  cloture: { label: 'Clôturé', color: '#607D8B', bg: '#ECEFF1', icon: 'done_all' },
};

export const RisqueList: React.FC = () => {
  const [risques, setRisques] = useState<Risque[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [alertes, setAlertes] = useState<AlerteRisque[]>([]);
  const [tabValue, setTabValue] = useState(0);
  const [selectedRisque, setSelectedRisque] = useState<Risque | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Risque>>({});
  const [actions, setActions] = useState<Record<number, ActionAtténuation[]>>({});
  const [expandedAccordion, setExpandedAccordion] = useState<number | false>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [risquesRes, statsRes, alertesRes] = await Promise.all([
        risqueService.getAll(),
        risqueService.getStats(),
        risqueService.getAlertes(),
      ]);
      setRisques(risquesRes.data?.length ? risquesRes.data : mockRisques);
      setAlertes(alertesRes.data?.length ? alertesRes.data : mockAlertes);
      const s = statsRes.data;
      setStats(s || {
        total: mockRisques.length,
        critiques: mockRisques.filter(r => r.niveau === 'Critique').length,
        eleves: mockRisques.filter(r => r.niveau === 'Élevé').length,
        moderes: mockRisques.filter(r => r.niveau === 'Modéré').length,
        faibles: mockRisques.filter(r => r.niveau === 'Faible').length,
        en_cours: mockRisques.filter(r => r.statut === 'en_cours').length,
        attenues: mockRisques.filter(r => r.statut === 'atténue' || r.statut === 'cloture').length,
      });
      setActions(mockActions);
    } catch {
      setRisques(mockRisques);
      setActions(mockActions);
      setAlertes(mockAlertes);
      setStats({
        total: mockRisques.length,
        critiques: mockRisques.filter(r => r.niveau === 'Critique').length,
        eleves: mockRisques.filter(r => r.niveau === 'Élevé').length,
        moderes: mockRisques.filter(r => r.niveau === 'Modéré').length,
        faibles: mockRisques.filter(r => r.niveau === 'Faible').length,
        en_cours: mockRisques.filter(r => r.statut === 'en_cours').length,
        attenues: mockRisques.filter(r => r.statut === 'atténue' || r.statut === 'cloture').length,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarquerLue = async (id: number) => {
    try {
      await risqueService.marquerAlerteLue(id);
    } catch { /* ignore */ }
    setAlertes(prev => prev.map(a => a.id === id ? { ...a, est_lue: true } : a));
  };

  const handleOpenDialog = (risque?: Risque) => {
    if (risque) {
      setSelectedRisque(risque);
      setFormData(risque);
    } else {
      setSelectedRisque(null);
      setFormData({
        categorie: 'gestion',
        probabilite: 3,
        impact: 3,
        statut: 'identifie',
      });
    }
    setDialogOpen(true);
  };

  const handleOpenDetail = (risque: Risque) => {
    setSelectedRisque(risque);
    setDetailDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (selectedRisque) {
        await risqueService.update(selectedRisque.id, formData);
      } else {
        await risqueService.create(formData);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce risque ?')) {
      try {
        await risqueService.delete(id);
      } catch { /* si erreur, on recharge quand même */ }
      loadData();
    }
  };

  const getFilteredRisques = () => {
    if (tabValue === 0) return risques;
    if (tabValue === 1) return risques.filter(r => r.niveau === 'Critique');
    if (tabValue === 2) return risques.filter(r => r.niveau === 'Élevé');
    if (tabValue === 3) return risques.filter(r => r.niveau === 'Modéré');
    if (tabValue === 4) return risques.filter(r => r.statut === 'en_cours');
    if (tabValue === 5) return risques.filter(r => r.statut === 'atténue' || r.statut === 'cloture');
    return risques;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  const filteredRisques = getFilteredRisques();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Gestion des risques
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Identification, évaluation, suivi et atténuation des risques du programme
        </Typography>
      </Box>

      {/* Alertes actives */}
      {alertes.filter(a => !a.est_lue).length > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3, borderRadius: 2 }}
          icon={<GoogleIcon name="notifications_active" size={20} />}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2">
              <strong>{alertes.filter(a => !a.est_lue).length} alerte(s) non lue(s)</strong> - Des risques critiques nécessitent votre attention
            </Typography>
            <Button size="small" variant="outlined" sx={{ borderRadius: 2 }}>
              Voir les alertes
            </Button>
          </Box>
        </Alert>
      )}

      {/* Statistiques */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar sx={{ bgcolor: '#E8F5E9', width: 32, height: 32 }}>
                    <GoogleIcon name="warning" size={18} sx={{ color: '#2E7D32' }} />
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">Total risques</Typography>
                </Box>
                <Typography variant="h3" fontWeight={700}>{stats.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${niveauConfig.Critique.color}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar sx={{ bgcolor: niveauConfig.Critique.bg, width: 32, height: 32 }}>
                    <GoogleIcon name="error" size={18} sx={{ color: niveauConfig.Critique.color }} />
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">Critiques</Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} color="error.main">{stats.critiques}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${niveauConfig.Élevé.color}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar sx={{ bgcolor: niveauConfig.Élevé.bg, width: 32, height: 32 }}>
                    <GoogleIcon name="priority_high" size={18} sx={{ color: niveauConfig.Élevé.color }} />
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">Élevés</Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} color="warning.main">{stats.eleves}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${niveauConfig.Faible.color}` }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Avatar sx={{ bgcolor: niveauConfig.Faible.bg, width: 32, height: 32 }}>
                    <GoogleIcon name="check_circle" size={18} sx={{ color: niveauConfig.Faible.color }} />
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">Atténués/Clôturés</Typography>
                </Box>
                <Typography variant="h3" fontWeight={700} color="success.main">{stats.attenues}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Matrice d'évaluation */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <GoogleIcon name="grid_view" size={24} sx={{ color: '#2E7D32' }} />
          <Typography variant="h6" fontWeight={600}>
            Matrice d'évaluation des risques
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5', fontWeight: 600 }}>Impact \ Probabilité</th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>1<br/><span style={{ fontSize: 11 }}>Très faible</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>2<br/><span style={{ fontSize: 11 }}>Faible</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>3<br/><span style={{ fontSize: 11 }}>Moyenne</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>4<br/><span style={{ fontSize: 11 }}>Élevée</span></th>
                <th style={{ padding: 12, backgroundColor: '#F5F5F5' }}>5<br/><span style={{ fontSize: 11 }}>Très élevée</span></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((impact) => (
                <tr key={impact}>
                  <td style={{ padding: 12, fontWeight: 500, backgroundColor: '#FAFAFA' }}>
                    {impact}<br/><span style={{ fontSize: 11 }}>
                      {impact === 1 ? 'Très faible' : impact === 2 ? 'Faible' : impact === 3 ? 'Moyen' : impact === 4 ? 'Élevé' : 'Très élevé'}
                    </span>
                  </td>
                  {[1, 2, 3, 4, 5].map((prob) => {
                    const score = impact * prob;
                    let bgColor = '#E8F5E9';
                    let textColor = '#2E7D32';
                    let label = 'Faible';
                    if (score >= 20) { bgColor = '#FFEBEE'; textColor = '#C62828'; label = 'Critique'; }
                    else if (score >= 12) { bgColor = '#FFF3E0'; textColor = '#EF6C00'; label = 'Élevé'; }
                    else if (score >= 6) { bgColor = '#FFF8E1'; textColor = '#F9A825'; label = 'Modéré'; }
                    
                    return (
                      <td key={prob} style={{ padding: 12, backgroundColor: bgColor, color: textColor, fontWeight: 500 }}>
                        {label}<br/>
                        <span style={{ fontSize: 10, opacity: 0.7 }}>({score})</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>

      {/* Onglets */}
      <Tabs 
        value={tabValue} 
        onChange={(_, v) => setTabValue(v)} 
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Tous" icon={<GoogleIcon name="list" size={18} />} iconPosition="start" />
        <Tab label="Critiques" icon={<GoogleIcon name="error" size={18} />} iconPosition="start" />
        <Tab label="Élevés" icon={<GoogleIcon name="priority_high" size={18} />} iconPosition="start" />
        <Tab label="Modérés" icon={<GoogleIcon name="warning" size={18} />} iconPosition="start" />
        <Tab label="En cours" icon={<GoogleIcon name="pending" size={18} />} iconPosition="start" />
        <Tab label="Atténués" icon={<GoogleIcon name="check_circle" size={18} />} iconPosition="start" />
        <Tab label="Plans d'atténuation" icon={<GoogleIcon name="security" size={18} />} iconPosition="start" />
        <Tab label="Alertes" icon={<GoogleIcon name="notifications_active" size={18} />} iconPosition="start" />
      </Tabs>

      {tabValue < 6 && <ExportToolbar
        title="Registre des Risques"
        subtitle="Identification et suivi des risques du projet"
        columns={[
          { header: 'Code', key: 'code', width: 12 },
          { header: 'Nom', key: 'nom', width: 40 },
          { header: 'Catégorie', key: 'categorie', width: 18 },
          { header: 'Niveau', key: 'niveau', width: 12 },
          { header: 'Probabilité', key: 'probabilite', width: 14 },
          { header: 'Impact', key: 'impact', width: 10 },
          { header: 'Score (P×I)', key: 'score', width: 12 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: 'Responsable', key: 'responsable', width: 26 },
          { header: 'Province', key: 'province', width: 22 },
        ]}
        getData={() => filteredRisques.map((r) => ({
          code: r.code,
          nom: r.nom,
          categorie: r.categorie,
          niveau: r.niveau,
          probabilite: r.probabilite,
          impact: r.impact,
          score: r.probabilite * r.impact,
          statut: r.statut,
          responsable: r.responsable,
          province: r.province,
        }))}
        filename="risques"
        landscape
      />}

      {/* Plans d'atténuation */}
      {tabValue === 6 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, mt: 1 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: '#2E7D32' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Code</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Risque</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Niveau</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700, minWidth: 260 }}>Plan d'atténuation</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Actions prévues</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Responsable</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 700 }}>Statut</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {risques.map((risque, idx) => (
                <TableRow key={risque.id} sx={{ bgcolor: idx % 2 === 0 ? 'white' : '#F9FBF9' }}>
                  <TableCell>
                    <Chip label={risque.code} size="small" sx={{ bgcolor: '#2E7D32', color: 'white', borderRadius: 1 }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500, maxWidth: 180 }}>
                    <Typography variant="body2">{risque.nom}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={niveauConfig[risque.niveau].label} size="small" sx={{ bgcolor: niveauConfig[risque.niveau].bg, color: niveauConfig[risque.niveau].color }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{risque.plan_atténuation}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {(risque.actions_prevues ?? []).slice(0, 2).map((a, i) => (
                        <Chip key={i} label={a} size="small" variant="outlined" sx={{ fontSize: '0.7rem', m: 0.25 }} />
                      ))}
                      {(risque.actions_prevues ?? []).length > 2 && (
                        <Chip label={`+${(risque.actions_prevues ?? []).length - 2}`} size="small" sx={{ m: 0.25 }} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.78rem' }}>{risque.responsable}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={statutConfig[risque.statut].label} size="small" sx={{ bgcolor: statutConfig[risque.statut].bg, color: statutConfig[risque.statut].color }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Alertes */}
      {tabValue === 7 && (
        <Stack spacing={2} sx={{ mt: 1 }}>
          {alertes.length === 0 ? (
            <Alert severity="success" sx={{ borderRadius: 2 }}>Aucune alerte active</Alert>
          ) : (
            alertes.map((alerte) => (
              <Alert
                key={alerte.id}
                severity={alerte.niveau === 'danger' ? 'error' : alerte.niveau === 'warning' ? 'warning' : 'info'}
                sx={{ borderRadius: 2, opacity: alerte.est_lue ? 0.55 : 1 }}
                action={
                  !alerte.est_lue ? (
                    <Button size="small" onClick={() => handleMarquerLue(alerte.id)}>
                      Marquer lue
                    </Button>
                  ) : undefined
                }
              >
                <Box>
                  <Typography variant="body2" fontWeight={alerte.est_lue ? 400 : 600}>
                    {alerte.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(alerte.date_alerte).toLocaleString()} — Risque #{alerte.id_risque}
                    {alerte.est_lue && ' • Lue'}
                  </Typography>
                </Box>
              </Alert>
            ))
          )}
        </Stack>
      )}

      {/* Liste des risques */}
      {tabValue < 6 && <Grid container spacing={3}>
        {filteredRisques.map((risque) => (
          <Grid size={{ xs: 12 }} key={risque.id}>
            <Accordion 
              expanded={expandedAccordion === risque.id}
              onChange={() => setExpandedAccordion(expandedAccordion === risque.id ? false : risque.id)}
              sx={{ borderRadius: 2, '&:before': { display: 'none' }, mb: 1 }}
            >
              <AccordionSummary expandIcon={<GoogleIcon name="expand_more" />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: '100%' }}>
                  <Chip 
                    label={risque.code} 
                    size="small" 
                    sx={{ bgcolor: '#2E7D32', color: 'white', borderRadius: 1 }}
                  />
                  <Chip 
                    label={categorieConfig[risque.categorie].label}
                    size="small"
                    sx={{ bgcolor: categorieConfig[risque.categorie].bg, color: categorieConfig[risque.categorie].color }}
                  />
                  <Chip 
                    label={niveauConfig[risque.niveau].label}
                    size="small"
                    icon={<GoogleIcon name={niveauConfig[risque.niveau].icon} size={14} />}
                    sx={{ bgcolor: niveauConfig[risque.niveau].bg, color: niveauConfig[risque.niveau].color }}
                  />
                  <Typography variant="body1" fontWeight={500} sx={{ flex: 1 }}>
                    {risque.nom}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 100 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={(risque.probabilite * risque.impact) / 25 * 100} 
                        sx={{ height: 6, borderRadius: 2 }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      Score: {risque.probabilite * risque.impact}/25
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Description
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {risque.description}
                      </Typography>
                      
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Plan d'atténuation
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, mb: 2 }}>
                        <Typography variant="body2">{risque.plan_atténuation}</Typography>
                      </Paper>
                      
                      {risque.actions_prevues && risque.actions_prevues.length > 0 && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                            Actions prévues
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                            {risque.actions_prevues.map((action, idx) => (
                              <Chip key={idx} label={action} size="small" variant="outlined" />
                            ))}
                          </Stack>
                        </>
                      )}
                    </Grid>
                    
                    <Grid size={{ xs: 12, md: 4 }}>
                      <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Informations clés</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Responsable</Typography>
                          <Typography variant="caption" fontWeight={500}>{risque.responsable}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Date d'identification</Typography>
                          <Typography variant="caption">{new Date(risque.date_identification).toLocaleDateString()}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Dernier suivi</Typography>
                          <Typography variant="caption">{risque.dernier_suivi ? new Date(risque.dernier_suivi).toLocaleDateString() : '-'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Province(s)</Typography>
                          <Typography variant="caption">{risque.province}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">Statut</Typography>
                          <Chip label={statutConfig[risque.statut].label} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                    <Button 
                      size="small" 
                      startIcon={<GoogleIcon name="visibility" size={16} />}
                      onClick={() => handleOpenDetail(risque)}
                    >
                      Voir détails
                    </Button>
                    <Button 
                      size="small" 
                      startIcon={<GoogleIcon name="edit" size={16} />}
                      onClick={() => handleOpenDialog(risque)}
                    >
                      Modifier
                    </Button>
                    <Button 
                      size="small" 
                      color="error"
                      startIcon={<GoogleIcon name="delete" size={16} />}
                      onClick={() => handleDelete(risque.id)}
                    >
                      Supprimer
                    </Button>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Grid>
        ))}
      </Grid>}

      {/* Bouton d'ajout flottant */}
      <Button
        variant="contained"
        startIcon={<GoogleIcon name="add" size={20} />}
        onClick={() => handleOpenDialog()}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: '#2E7D32',
          borderRadius: 2,
          boxShadow: 3,
          '&:hover': { bgcolor: '#1B5E20' }
        }}
      >
        Nouveau risque
      </Button>

      {/* Dialog d'ajout/modification */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRisque ? 'Modifier le risque' : 'Nouveau risque'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Nom du risque"
                value={formData.nom || ''}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Catégorie</InputLabel>
                <Select
                  value={formData.categorie || 'gestion'}
                  label="Catégorie"
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value as any })}
                >
                  {Object.entries(categorieConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Probabilité (1-5)"
                value={formData.probabilite || 3}
                onChange={(e) => setFormData({ ...formData, probabilite: parseInt(e.target.value) as any })}
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <TextField
                fullWidth
                type="number"
                label="Impact (1-5)"
                value={formData.impact || 3}
                onChange={(e) => setFormData({ ...formData, impact: parseInt(e.target.value) as any })}
                inputProps={{ min: 1, max: 5 }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Plan d'atténuation"
                multiline
                rows={3}
                value={formData.plan_atténuation || ''}
                onChange={(e) => setFormData({ ...formData, plan_atténuation: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label="Responsable"
                value={formData.responsable || ''}
                onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Statut</InputLabel>
                <Select
                  value={formData.statut || 'identifie'}
                  label="Statut"
                  onChange={(e) => setFormData({ ...formData, statut: e.target.value as any })}
                >
                  {Object.entries(statutConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>{config.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Province(s) concernée(s)"
                value={formData.province || ''}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                placeholder="Ex: Kinshasa, Kwilu, Kasaï"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#2E7D32', borderRadius: 2 }}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de détail */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="lg" fullWidth>
        {selectedRisque && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GoogleIcon name="warning" size={24} sx={{ color: '#2E7D32' }} />
                <Typography variant="h6">{selectedRisque.code} - {selectedRisque.nom}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description détaillée
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {selectedRisque.description}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Plan d'atténuation
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: '#F5F5F5', borderRadius: 2, mb: 3 }}>
                    <Typography variant="body2">{selectedRisque.plan_atténuation}</Typography>
                  </Paper>
                  
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Actions de suivi
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: '#F5F5F5' }}>
                        <TableRow>
                          <TableCell>Action</TableCell>
                          <TableCell>Responsable</TableCell>
                          <TableCell>Date début</TableCell>
                          <TableCell>Date fin</TableCell>
                          <TableCell>Statut</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(actions[selectedRisque.id] || []).map((action) => (
                          <TableRow key={action.id}>
                            <TableCell>{action.action}</TableCell>
                            <TableCell>{action.responsable}</TableCell>
                            <TableCell>{new Date(action.date_debut).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(action.date_fin).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip 
                                label={action.statut === 'prevue' ? 'Prévue' : action.statut === 'en_cours' ? 'En cours' : action.statut === 'realisee' ? 'Réalisée' : 'Abandonnée'}
                                size="small"
                                sx={{ 
                                  bgcolor: action.statut === 'realisee' ? '#E8F5E9' : action.statut === 'en_cours' ? '#FFF8E1' : '#F5F5F5',
                                  color: action.statut === 'realisee' ? '#2E7D32' : action.statut === 'en_cours' ? '#FF8F00' : '#757575'
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Informations</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Niveau de risque</Typography>
                      <Chip 
                        label={niveauConfig[selectedRisque.niveau].label}
                        size="small"
                        icon={<GoogleIcon name={niveauConfig[selectedRisque.niveau].icon} size={14} />}
                        sx={{ bgcolor: niveauConfig[selectedRisque.niveau].bg, color: niveauConfig[selectedRisque.niveau].color }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Score</Typography>
                      <Typography variant="body2" fontWeight={500}>{selectedRisque.probabilite * selectedRisque.impact}/25</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Probabilité</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={selectedRisque.probabilite * 20} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                        <Typography variant="caption">{selectedRisque.probabilite}/5</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Impact</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={selectedRisque.impact * 20} sx={{ width: 60, height: 4, borderRadius: 2 }} />
                        <Typography variant="caption">{selectedRisque.impact}/5</Typography>
                      </Box>
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Responsable</Typography>
                      <Typography variant="body2">{selectedRisque.responsable}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Date identification</Typography>
                      <Typography variant="body2">{new Date(selectedRisque.date_identification).toLocaleDateString()}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">Statut</Typography>
                      <Chip label={statutConfig[selectedRisque.statut].label} size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">Province(s)</Typography>
                      <Typography variant="body2">{selectedRisque.province}</Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailDialogOpen(false)}>Fermer</Button>
              <Button variant="contained" onClick={() => { setDetailDialogOpen(false); handleOpenDialog(selectedRisque); }} sx={{ bgcolor: '#2E7D32' }}>
                Modifier
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default RisqueList;