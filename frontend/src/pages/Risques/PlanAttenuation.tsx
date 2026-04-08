// frontend/src/pages/Risques/PlanAttenuation.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Divider,
  Avatar,
  Card,
  CardContent,
} from '@mui/material';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import risqueService from '../../services/risque.service';
import type { Risque, ActionAtténuation } from '../../services/risque.service';

const mockRisques: Risque[] = [
  {
    id: 1, code: 'RISK-001',
    nom: 'Retard dans la distribution des intrants agricoles',
    description: 'Les intrants agricoles ne sont pas distribués dans les délais impartis.',
    categorie: 'gestion', probabilite: 4, impact: 3, niveau: 'Élevé', statut: 'en_cours',
    plan_atténuation: 'Renforcer la logistique, mettre en place un suivi quotidien des livraisons, prévoir des stocks tampons',
    responsable: 'UNCP / Cellule Logistique', date_identification: '2026-01-15', province: 'Kwilu, Kasaï',
    actions_prevues: ['Établir un planning de livraison', 'Renforcer l\'équipe logistique', 'Mettre en place un système de tracking'],
    dernier_suivi: '2026-03-25',
  },
  {
    id: 2, code: 'RISK-002',
    nom: 'Sécheresse prolongée affectant les rendements',
    description: 'Risque de sécheresse pouvant réduire les rendements de 30 à 50%.',
    categorie: 'environnemental', probabilite: 3, impact: 5, niveau: 'Critique', statut: 'identifie',
    plan_atténuation: 'Mettre en place des systèmes d\'irrigation goutte-à-goutte, distribuer des semences résistantes à la sécheresse',
    responsable: 'Ministère Agriculture / INERA', date_identification: '2026-02-10', province: 'Kasaï, Kwilu',
    actions_prevues: ['Distribution de semences résistantes', 'Formation aux techniques AIC', 'Installation de systèmes d\'irrigation pilotes'],
    dernier_suivi: '2026-03-20',
  },
  {
    id: 3, code: 'RISK-003',
    nom: 'Insécurité dans les zones d\'intervention',
    description: 'Présence de groupes armés limitant l\'accès aux bénéficiaires.',
    categorie: 'sante_securite', probabilite: 2, impact: 4, niveau: 'Élevé', statut: 'en_cours',
    plan_atténuation: 'Coordination avec les autorités locales, adaptation des itinéraires, mise en place de couloirs sécurisés',
    responsable: 'OVDA / Autorités provinciales', date_identification: '2026-01-05', province: 'Kasaï, Tanganyika',
    actions_prevues: ['Réunions de coordination mensuelles', 'Évaluation des zones à risque', 'Plan de contingence sécuritaire'],
    dernier_suivi: '2026-03-28',
  },
  {
    id: 4, code: 'RISK-004',
    nom: 'Faible adoption des technologies agricoles',
    description: 'Les agriculteurs sont réticents à adopter les nouvelles technologies AIC/AIN.',
    categorie: 'technique', probabilite: 3, impact: 3, niveau: 'Modéré', statut: 'atténue',
    plan_atténuation: 'Renforcer les formations, organiser des démonstrations terrain, impliquer les leaders communautaires',
    responsable: 'SENASEM / Services de vulgarisation', date_identification: '2025-12-10', province: 'Kinshasa, Kongo Central',
    actions_prevues: ['Campagnes de sensibilisation', 'Champs écoles paysans', 'Visites d\'échanges inter-paysans'],
    dernier_suivi: '2026-03-15',
  },
  {
    id: 5, code: 'RISK-005',
    nom: 'Fluctuation des prix des produits agricoles',
    description: 'Variations importantes des prix impactant les revenus des petits exploitants.',
    categorie: 'socio_economique', probabilite: 4, impact: 3, niveau: 'Élevé', statut: 'en_cours',
    plan_atténuation: 'Mettre en place des systèmes d\'information sur les marchés, faciliter l\'accès au stockage',
    responsable: 'UNCP / Services des marchés', date_identification: '2026-02-20', province: 'National',
    actions_prevues: ['Création d\'un observatoire des prix', 'Appui aux organisations paysannes', 'Systèmes d\'alerte précoce'],
    dernier_suivi: '2026-03-22',
  },
  {
    id: 6, code: 'RISK-006',
    nom: 'Capacité institutionnelle limitée',
    description: 'Faiblesse des capacités des institutions pour la mise en œuvre du programme.',
    categorie: 'gestion', probabilite: 3, impact: 4, niveau: 'Élevé', statut: 'identifie',
    plan_atténuation: 'Renforcement des capacités, formations continues, appui technique personnalisé',
    responsable: 'UNCP / Banque Mondiale', date_identification: '2026-01-20', province: 'National',
    actions_prevues: ['Plan de formation annuel', 'Recrutement d\'experts', 'Mentorat des équipes provinciales'],
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
  3: [
    { id: 1, id_risque: 3, action: 'Réunions de coordination mensuelles', responsable: 'OVDA', date_debut: '2026-02-01', date_fin: '2026-12-31', statut: 'en_cours' },
    { id: 2, id_risque: 3, action: 'Cartographie des zones à risque', responsable: 'Autorités sécuritaires', date_debut: '2026-01-15', date_fin: '2026-02-28', statut: 'realisee', resultat: 'Carte validée' },
  ],
  4: [
    { id: 1, id_risque: 4, action: 'Organiser des champs écoles paysans', responsable: 'SENASEM', date_debut: '2026-01-01', date_fin: '2026-06-30', statut: 'en_cours' },
    { id: 2, id_risque: 4, action: 'Visites d\'échange inter-paysans', responsable: 'Vulgarisation', date_debut: '2026-02-01', date_fin: '2026-05-31', statut: 'realisee', resultat: '45 paysans formés' },
  ],
};

const niveauConfig: Record<string, { label: string; color: string; bg: string }> = {
  Faible: { label: 'Faible', color: '#4CAF50', bg: '#E8F5E9' },
  Modéré: { label: 'Modéré', color: '#FFC107', bg: '#FFF8E1' },
  Élevé: { label: 'Élevé', color: '#FF9800', bg: '#FFF3E0' },
  Critique: { label: 'Critique', color: '#F44336', bg: '#FFEBEE' },
};

const statutActionConfig: Record<string, { label: string; color: string; bg: string }> = {
  prevue: { label: 'Prévue', color: '#757575', bg: '#F5F5F5' },
  en_cours: { label: 'En cours', color: '#FF8F00', bg: '#FFF8E1' },
  realisee: { label: 'Réalisée', color: '#2E7D32', bg: '#E8F5E9' },
  abandonnee: { label: 'Abandonnée', color: '#C62828', bg: '#FFEBEE' },
};

export const PlanAttenuation: React.FC = () => {
  const [risques, setRisques] = useState<Risque[]>([]);
  const [actions, setActions] = useState<Record<number, ActionAtténuation[]>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | false>(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await risqueService.getAll();
        setRisques(res.data?.length ? res.data : mockRisques);
      } catch {
        setRisques(mockRisques);
      } finally {
        setActions(mockActions);
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalActions = Object.values(actions).flat().length;
  const realisees = Object.values(actions).flat().filter(a => a.statut === 'realisee').length;
  const enCours = Object.values(actions).flat().filter(a => a.statut === 'en_cours').length;
  const prevues = Object.values(actions).flat().filter(a => a.statut === 'prevue').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  const exportData = risques.map(r => ({
    code: r.code,
    nom: r.nom,
    niveau: r.niveau,
    statut: r.statut,
    plan: r.plan_atténuation,
    responsable: r.responsable,
    actions_count: (actions[r.id] ?? []).length,
    actions_realisees: (actions[r.id] ?? []).filter(a => a.statut === 'realisee').length,
    dernier_suivi: r.dernier_suivi ?? '-',
  }));

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
          Plans d'atténuation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Suivi des mesures d'atténuation et des actions par risque identifié
        </Typography>
      </Box>

      {/* Statistiques des actions */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#E3F2FD', width: 32, height: 32 }}>
                  <GoogleIcon name="task" size={18} sx={{ color: '#1976D2' }} />
                </Avatar>
                <Typography variant="caption" color="text.secondary">Total actions</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700}>{totalActions}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#E8F5E9', width: 32, height: 32 }}>
                  <GoogleIcon name="check_circle" size={18} sx={{ color: '#4CAF50' }} />
                </Avatar>
                <Typography variant="caption" color="text.secondary">Réalisées</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} color="success.main">{realisees}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #FF9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#FFF3E0', width: 32, height: 32 }}>
                  <GoogleIcon name="pending" size={18} sx={{ color: '#FF9800' }} />
                </Avatar>
                <Typography variant="caption" color="text.secondary">En cours</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} color="warning.main">{enCours}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 2, borderLeft: '4px solid #9E9E9E' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar sx={{ bgcolor: '#F5F5F5', width: 32, height: 32 }}>
                  <GoogleIcon name="schedule" size={18} sx={{ color: '#9E9E9E' }} />
                </Avatar>
                <Typography variant="caption" color="text.secondary">Prévues</Typography>
              </Box>
              <Typography variant="h3" fontWeight={700} color="text.secondary">{prevues}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progression globale */}
      {totalActions > 0 && (
        <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Progression globale des actions d'atténuation</Typography>
            <Typography variant="body2" fontWeight={600} color="success.main">
              {Math.round((realisees / totalActions) * 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(realisees / totalActions) * 100}
            sx={{ height: 10, borderRadius: 2, bgcolor: '#E8F5E9', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {realisees} actions réalisées sur {totalActions}
          </Typography>
        </Paper>
      )}

      {/* Export */}
      <ExportToolbar
        title="Plans d'atténuation des risques"
        subtitle="Suivi des mesures d'atténuation par risque — PNDA-SE"
        columns={[
          { header: 'Code', key: 'code', width: 12 },
          { header: 'Risque', key: 'nom', width: 40 },
          { header: 'Niveau', key: 'niveau', width: 12 },
          { header: 'Statut', key: 'statut', width: 14 },
          { header: "Plan d'atténuation", key: 'plan', width: 50 },
          { header: 'Responsable', key: 'responsable', width: 26 },
          { header: 'Actions', key: 'actions_count', width: 10 },
          { header: 'Réalisées', key: 'actions_realisees', width: 12 },
          { header: 'Dernier suivi', key: 'dernier_suivi', width: 16 },
        ]}
        getData={() => exportData}
        filename="plans_attenuation"
        landscape
      />

      {/* Accordions par risque */}
      <Stack spacing={2} sx={{ mt: 2 }}>
        {risques.map((risque) => {
          const risqueActions = actions[risque.id] ?? [];
          const done = risqueActions.filter(a => a.statut === 'realisee').length;
          const pct = risqueActions.length > 0 ? Math.round((done / risqueActions.length) * 100) : 0;
          const cfg = niveauConfig[risque.niveau] ?? niveauConfig['Modéré'];

          return (
            <Accordion
              key={risque.id}
              expanded={expanded === risque.id}
              onChange={() => setExpanded(expanded === risque.id ? false : risque.id)}
              sx={{ borderRadius: 2, '&:before': { display: 'none' }, boxShadow: 1 }}
            >
              <AccordionSummary expandIcon={<GoogleIcon name="expand_more" />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', width: '100%', pr: 2 }}>
                  <Chip label={risque.code} size="small" sx={{ bgcolor: '#2E7D32', color: 'white', borderRadius: 1 }} />
                  <Chip
                    label={cfg.label}
                    size="small"
                    sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600 }}
                  />
                  <Typography variant="body1" fontWeight={500} sx={{ flex: 1 }}>
                    {risque.nom}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 160 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ flex: 1, height: 6, borderRadius: 2, bgcolor: '#E8F5E9', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {done}/{risqueActions.length} actions
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 7 }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Plan d'atténuation
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: '#F1F8F1', borderRadius: 2, mb: 3, borderLeft: '3px solid #2E7D32' }}>
                      <Typography variant="body2">{risque.plan_atténuation}</Typography>
                    </Paper>

                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Actions de mitigation
                    </Typography>
                    {risqueActions.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        Aucune action définie pour ce risque
                      </Typography>
                    ) : (
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: '#FAFAFA' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Responsable</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Échéance</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Statut</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Résultat</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {risqueActions.map((action) => {
                              const sCfg = statutActionConfig[action.statut] ?? statutActionConfig['prevue'];
                              return (
                                <TableRow key={action.id} sx={{ '&:hover': { bgcolor: '#F9FBF9' } }}>
                                  <TableCell sx={{ maxWidth: 200 }}>
                                    <Typography variant="body2">{action.action}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">{action.responsable}</Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption">
                                      {new Date(action.date_fin).toLocaleDateString('fr-FR')}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip
                                      label={sCfg.label}
                                      size="small"
                                      sx={{ bgcolor: sCfg.bg, color: sCfg.color, fontSize: '0.7rem' }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="caption" color="text.secondary">
                                      {action.resultat ?? '—'}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </Grid>
                  <Grid size={{ xs: 12, md: 5 }}>
                    <Paper sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>Informations</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Responsable</Typography>
                        <Typography variant="body2" fontWeight={500}>{risque.responsable}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Province(s)</Typography>
                        <Typography variant="body2">{risque.province ?? '—'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Identification</Typography>
                        <Typography variant="body2">
                          {new Date(risque.date_identification).toLocaleDateString('fr-FR')}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">Dernier suivi</Typography>
                        <Typography variant="body2">
                          {risque.dernier_suivi
                            ? new Date(risque.dernier_suivi).toLocaleDateString('fr-FR')
                            : '—'}
                        </Typography>
                      </Box>
                      <Divider sx={{ my: 1.5 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">Progression</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{ width: 70, height: 6, borderRadius: 2 }}
                          />
                          <Typography variant="caption" fontWeight={600}>{pct}%</Typography>
                        </Box>
                      </Box>
                    </Paper>

                    {(risque.indicateurs_surveillance ?? []).length > 0 && (
                      <Paper sx={{ p: 2, bgcolor: '#FAFAFA', borderRadius: 2, mt: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Indicateurs de surveillance</Typography>
                        <Stack spacing={0.5}>
                          {(risque.indicateurs_surveillance ?? []).map((ind, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <GoogleIcon name="fiber_manual_record" size={8} sx={{ color: '#2E7D32' }} />
                              <Typography variant="caption">{ind}</Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Paper>
                    )}
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
};

export default PlanAttenuation;
