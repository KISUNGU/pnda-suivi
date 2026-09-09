// frontend/src/pages/Dashboard/NationalDashboard.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { IndicatorChart } from '../../components/common/Charts/IndicatorChart';
import { PerformanceGauge } from '../../components/common/Charts/PerformanceGauge';
import { InteractiveMap } from '../../components/common/Map/InteractiveMap';
import GoogleIcon from '../../components/common/GoogleIcon';
import { dashboardService, type RnaOverview } from '../../services/api';
import ptbaService, { type PtbaSuivi } from '../../services/ptba.service';
import cadreResultatsService, { type CadreStats } from '../../services/cadreResultats.service';
import grmService from '../../services/grm.service';
import risqueService, { type AlerteRisque, type RisqueStats } from '../../services/risque.service';
import notificationsService, { type NotificationItem } from '../../services/notifications.service';
import { suiviService, type SuiviMission } from '../../services/suivi.service';
import { useAuth } from '../../context/AuthContext';
import { COULEURS_ETAT } from '../../assets/styles/theme';

type TonBriefing = 'ok' | 'vigilance' | 'critique';

interface GrmStats {
  total?: number;
  en_cours?: number;
  sensibles?: number;
  traitees?: number;
}

interface EvenementAccueil {
  id: string;
  titre: string;
  detail: string;
  dates: string;
  province: string;
  href: string;
}

const MOIS: Record<string, number> = {
  jan: 0, fev: 1, fév: 1, mar: 2, avr: 3, mai: 4, jun: 5, juin: 5,
  jui: 6, juil: 6, aou: 7, aoû: 7, sep: 8, oct: 9, nov: 10, dec: 11, déc: 11,
};

const unwrap = <T,>(result: PromiseSettledResult<{ data: T }>): T | null =>
  result.status === 'fulfilled' ? result.value.data : null;

const parseMissionEnd = (dates: string): Date | null => {
  if (!dates) return null;
  const iso = dates.match(/(\d{4}-\d{2}-\d{2})/g);
  if (iso?.length) return new Date(iso[iso.length - 1]);

  const annee = Number(dates.match(/(20\d{2})/)?.[1] ?? new Date().getFullYear());
  const moisCle = Object.keys(MOIS).find((cle) => dates.toLowerCase().includes(cle));
  const jours = [...dates.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= 31);
  if (moisCle && jours.length) {
    return new Date(annee, MOIS[moisCle], jours[jours.length - 1]);
  }

  const slash = [...dates.matchAll(/(\d{1,2})\/(\d{1,2})/g)];
  if (slash.length) {
    const dernier = slash[slash.length - 1];
    return new Date(annee, Number(dernier[2]) - 1, Number(dernier[1]));
  }
  return null;
};

const construireBriefing = (params: {
  ptba: PtbaSuivi | null;
  cadre: CadreStats | null;
  grm: GrmStats | null;
  risques: RisqueStats | null;
  alertesNonLues: number;
  notifNonLues: number;
}): { titre: string; ton: TonBriefing; points: string[] } => {
  const { ptba, cadre, grm, risques, alertesNonLues, notifNonLues } = params;
  const points: { ton: TonBriefing; texte: string }[] = [];
  const taux = ptba?.taux_global ?? null;

  if (taux !== null) {
    if (taux >= 85) {
      points.push({ ton: 'ok', texte: `Le PTBA ${ptba?.annee} est tenu (${Math.round(taux)}%).` });
    } else if (taux >= 50) {
      points.push({ ton: 'vigilance', texte: `Exécution PTBA ${ptba?.annee} à ${Math.round(taux)}% — à relancer.` });
    } else {
      points.push({ ton: 'critique', texte: `PTBA ${ptba?.annee} en souffrance (${Math.round(taux)}%).` });
    }
  }

  if (ptba && ptba.non_demarrees > 0) {
    points.push({
      ton: ptba.non_demarrees > 8 ? 'critique' : 'vigilance',
      texte: `${ptba.non_demarrees} activité(s) PTBA non démarrée(s).`,
    });
  }

  if (cadre) {
    if (cadre.en_retard > 0) {
      points.push({
        ton: cadre.en_retard > 5 ? 'critique' : 'vigilance',
        texte: `${cadre.en_retard} indicateur(s) du cadre en retard · perf. moyenne ${Math.round(cadre.moyenne_performance)}%.`,
      });
    } else {
      points.push({
        ton: 'ok',
        texte: `Cadre des résultats : ${cadre.atteint} indicateur(s) atteint(s), ${cadre.en_cours} en cours.`,
      });
    }
  }

  if ((risques?.critiques ?? 0) > 0) {
    points.push({ ton: 'critique', texte: `${risques!.critiques} risque(s) critique(s) ouvert(s).` });
  } else if ((risques?.eleves ?? 0) > 0) {
    points.push({ ton: 'vigilance', texte: `${risques!.eleves} risque(s) de niveau élevé à surveiller.` });
  }

  if (alertesNonLues > 0) {
    points.push({ ton: 'vigilance', texte: `${alertesNonLues} alerte(s) risques non lue(s).` });
  }

  const plaintesOuvertes = grm?.en_cours ?? 0;
  if (plaintesOuvertes > 0) {
    points.push({
      ton: (grm?.sensibles ?? 0) > 0 ? 'critique' : 'vigilance',
      texte: `${plaintesOuvertes} plainte(s) GRM en cours${(grm?.sensibles ?? 0) > 0 ? `, dont ${grm!.sensibles} cas sensible(s)` : ''}.`,
    });
  }

  if (notifNonLues > 0) {
    points.push({ ton: 'vigilance', texte: `${notifNonLues} notification(s) non lue(s) dans le centre.` });
  }

  const ton: TonBriefing = points.some((p) => p.ton === 'critique')
    ? 'critique'
    : points.some((p) => p.ton === 'vigilance')
      ? 'vigilance'
      : 'ok';

  const titre =
    ton === 'critique'
      ? 'Attention requise sur plusieurs volets'
      : ton === 'vigilance'
        ? 'Situation sous contrôle, avec points de vigilance'
        : 'Situation globale maîtrisée';

  const synthetiques = points.slice(0, 4).map((p) => p.texte);
  if (synthetiques.length === 0) {
    synthetiques.push('Les modules projet n’ont pas encore renvoyé assez de données pour un briefing.');
  }

  return { titre, ton, points: synthetiques };
};

const tonCouleur = (ton: TonBriefing) =>
  ton === 'ok' ? COULEURS_ETAT.bon : ton === 'vigilance' ? COULEURS_ETAT.vigilance : COULEURS_ETAT.critique;

const MODULES = [
  { label: 'Cadre des résultats', icon: 'flag', href: '/indicateurs/cadre', hint: 'ODP / IR' },
  { label: 'Suivi PTBA', icon: 'event_note', href: '/suivi/ptba', hint: 'Exécution annuelle' },
  { label: 'RNA', icon: 'agriculture', href: '/beneficiaires/rna', hint: 'Registre agriculteurs' },
  { label: 'GRM', icon: 'assignment', href: '/database/plaintes', hint: 'Plaintes & VBG' },
  { label: 'Risques', icon: 'warning', href: '/risques/registre', hint: 'Alertes & atténuation' },
  { label: 'Missions', icon: 'flight_takeoff', href: '/suivi/missions', hint: 'T4 2025' },
] as const;

export const NationalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rna, setRna] = useState<RnaOverview | null>(null);
  const [ptba, setPtba] = useState<PtbaSuivi | null>(null);
  const [cadre, setCadre] = useState<CadreStats | null>(null);
  const [grm, setGrm] = useState<GrmStats | null>(null);
  const [risques, setRisques] = useState<RisqueStats | null>(null);
  const [alertes, setAlertes] = useState<AlerteRisque[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [missions, setMissions] = useState<SuiviMission[]>([]);
  const [partiel, setPartiel] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const results = await Promise.allSettled([
        dashboardService.getRnaOverview(),
        ptbaService.getSuivi(2026),
        cadreResultatsService.getStats(),
        grmService.getStats(),
        risqueService.getStats(),
        risqueService.getAlertes(),
        notificationsService.getAll({ unreadOnly: true, limit: 8 }),
        suiviService.getMissions(),
      ]);

      const [rnaRes, ptbaRes, cadreRes, grmRes, risqueRes, alertesRes, notifRes, missionsRes] = results;
      setRna(unwrap(rnaRes));
      setPtba(unwrap(ptbaRes));
      setCadre(unwrap(cadreRes));
      setGrm(unwrap(grmRes) as GrmStats | null);
      setRisques(unwrap(risqueRes));
      setAlertes(unwrap(alertesRes) ?? []);
      const notifs = unwrap(notifRes);
      setNotifications(notifs?.data ?? []);
      setUnread(notifs?.unread ?? 0);
      setMissions(unwrap(missionsRes) ?? []);
      setPartiel(results.some((r) => r.status === 'rejected'));
      setLoading(false);
    };
    void load();
  }, []);

  const femmes = rna?.femmes ?? 0;
  const total = rna?.total ?? 0;
  const provinces = rna?.provinces ?? 0;
  const femmesPct = total > 0 ? Math.round((femmes / total) * 100) : 0;
  const coveragePct = Math.round((provinces / 26) * 100);
  const ptbaTaux = ptba?.taux_global ?? null;
  const cadrePerf = cadre ? Math.round(cadre.moyenne_performance) : null;
  const alertesNonLues = alertes.filter((a) => !a.est_lue).length;

  const briefing = useMemo(
    () =>
      construireBriefing({
        ptba,
        cadre,
        grm,
        risques,
        alertesNonLues,
        notifNonLues: unread,
      }),
    [ptba, cadre, grm, risques, alertesNonLues, unread],
  );

  const evenements = useMemo<EvenementAccueil[]>(() => {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const mapped = missions.map((m) => {
      const fin = parseMissionEnd(m.dates);
      return {
        id: `mission-${m.id}`,
        titre: m.natureMission,
        detail: m.objectif,
        dates: m.dates || 'Date non renseignée',
        province: m.province,
        href: '/suivi/missions',
        fin,
      };
    });
    const aVenir = mapped
      .filter((e) => e.fin && e.fin >= aujourdhui)
      .sort((a, b) => a.fin!.getTime() - b.fin!.getTime());
    const source = aVenir.length > 0
      ? aVenir
      : mapped.sort((a, b) => (b.fin?.getTime() ?? 0) - (a.fin?.getTime() ?? 0));
    return source.slice(0, 5).map(({ fin: _fin, ...reste }) => reste);
  }, [missions]);

  const alertesAffichees = useMemo(() => {
    const risquesItems = alertes
      .filter((a) => !a.est_lue)
      .slice(0, 4)
      .map((a) => ({
        id: `alerte-${a.id}`,
        titre: a.risque_code ? `Risque ${a.risque_code}` : 'Alerte risque',
        message: a.message,
        niveau: a.niveau,
        href: '/risques/alertes',
      }));
    const notifItems = notifications.slice(0, 4).map((n) => ({
      id: n.id,
      titre: n.title,
      message: n.message,
      niveau: n.severity === 'danger' ? 'danger' : n.severity === 'warning' ? 'warning' : 'info',
      href: n.action_url || '/notifications',
    }));
    return [...risquesItems, ...notifItems].slice(0, 6);
  }, [alertes, notifications]);

  const evolutionData = (rna?.evolution ?? []).map((item) => ({
    name: item.month,
    total: item.total,
  }));

  const prenom = user?.prenom?.trim();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 600, color: 'primary.main' }}>
          {prenom ? `Bonjour, ${prenom}` : 'Tableau de bord national'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Accueil PNDA — briefing synthétique à partir du PTBA, du cadre, du RNA, du GRM et des risques.
        </Typography>
      </Box>

      {partiel && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Certaines sources n’ont pas répondu. Le briefing s’appuie sur les modules disponibles.
        </Alert>
      )}

      <Paper
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2.1,
          border: `1px solid color-mix(in oklab, ${tonCouleur(briefing.ton)} 42%, transparent)`,
          background: `linear-gradient(152deg,
            color-mix(in oklab, ${tonCouleur(briefing.ton)} 18%, transparent) 0%,
            color-mix(in oklab, ${tonCouleur(briefing.ton)} 6%, transparent) 100%)`,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'flex-start' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.4,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: tonCouleur(briefing.ton),
              bgcolor: `color-mix(in oklab, ${tonCouleur(briefing.ton)} 16%, transparent)`,
            }}
          >
            <GoogleIcon
              name={briefing.ton === 'ok' ? 'verified' : briefing.ton === 'vigilance' ? 'priority_high' : 'error'}
              size={26}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
              {briefing.titre}
            </Typography>
            <Stack spacing={0.5}>
              {briefing.points.map((point) => (
                <Typography key={point} variant="body2" color="text.secondary">
                  {point}
                </Typography>
              ))}
            </Stack>
          </Box>
          <Button variant="outlined" size="small" onClick={() => navigate('/notifications')} sx={{ flexShrink: 0 }}>
            Centre d’alertes
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Exécution PTBA 2026"
            value={ptbaTaux === null ? 'N/D' : `${Math.round(ptbaTaux)}%`}
            icon={<GoogleIcon name="speed" size={36} />}
            detail={ptba ? `${ptba.realisees}/${ptba.total_activites} activités achevées` : 'Données PTBA indisponibles'}
            color={ptbaTaux === null ? 'info' : ptbaTaux >= 85 ? 'success' : ptbaTaux >= 50 ? 'warning' : 'danger'}
            progression={ptbaTaux ?? undefined}
            onClick={() => navigate('/suivi/ptba')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Performance cadre 2025"
            value={cadrePerf === null ? 'N/D' : `${cadrePerf}%`}
            icon={<GoogleIcon name="flag" size={36} />}
            detail={cadre ? `${cadre.atteint} atteints · ${cadre.en_retard} en retard` : 'Cadre indisponible'}
            color={cadrePerf === null ? 'info' : cadrePerf >= 100 ? 'success' : cadrePerf >= 70 ? 'primary' : 'warning'}
            progression={cadrePerf ?? undefined}
            onClick={() => navigate('/indicateurs/cadre')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Bénéficiaires RNA"
            value={total.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="agriculture" size={36} />}
            trend={{ value: coveragePct, direction: 'up', period: 'couverture nationale' }}
            color="primary"
            onClick={() => navigate('/beneficiaires/rna')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Alertes ouvertes"
            value={alertesNonLues + unread + (risques?.critiques ?? 0)}
            icon={<GoogleIcon name="notifications_active" size={36} />}
            detail={`${risques?.critiques ?? 0} risques critiques · ${grm?.en_cours ?? 0} plaintes en cours`}
            color={(risques?.critiques ?? 0) > 0 || (grm?.sensibles ?? 0) > 0 ? 'danger' : unread > 0 ? 'warning' : 'success'}
            onClick={() => navigate('/notifications')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.25, borderRadius: 2.1, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
              Alertes et notifications
            </Typography>
            {alertesAffichees.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune alerte non lue. Le centre de notifications est à jour.
              </Typography>
            ) : (
              <Stack divider={<Divider flexItem />} spacing={1.5}>
                {alertesAffichees.map((item) => (
                  <Box
                    key={item.id}
                    onClick={() => navigate(item.href)}
                    sx={{ cursor: 'pointer', display: 'flex', gap: 1.25, alignItems: 'flex-start' }}
                  >
                    <GoogleIcon
                      name={item.niveau === 'danger' ? 'error' : item.niveau === 'warning' ? 'warning' : 'info'}
                      size={20}
                      sx={{
                        mt: 0.2,
                        color:
                          item.niveau === 'danger'
                            ? COULEURS_ETAT.critique
                            : item.niveau === 'warning'
                              ? COULEURS_ETAT.vigilance
                              : 'info.main',
                      }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {item.titre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {item.message}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.25, borderRadius: 2.1, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600 }}>
              Prochains événements
            </Typography>
            {evenements.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune mission datée n’est encore chargée.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {evenements.map((evt) => (
                  <Box key={evt.id} onClick={() => navigate(evt.href)} sx={{ cursor: 'pointer' }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                      <Chip label={evt.dates} size="small" />
                      <Chip label={evt.province} size="small" variant="outlined" />
                    </Stack>
                    <Typography variant="body2" fontWeight={600}>
                      {evt.titre}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {evt.detail}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
        Accès aux modules
      </Typography>
      <Grid container spacing={1.5} sx={{ mb: 4 }}>
        {MODULES.map((mod) => (
          <Grid key={mod.href} size={{ xs: 6, sm: 4, md: 2 }}>
            <Paper
              onClick={() => navigate(mod.href)}
              sx={{
                p: 1.5,
                borderRadius: 1.75,
                cursor: 'pointer',
                height: '100%',
                '&:hover': { borderColor: 'primary.main' },
              }}
            >
              <GoogleIcon name={mod.icon} size={22} sx={{ color: 'primary.main', mb: 0.75 }} />
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.25 }}>
                {mod.label}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {mod.hint}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2, borderRadius: 2.1 }}>
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
            lines={[{ key: 'total', name: 'Bénéficiaires RNA', color: '#2E7D32' }]}
            type="line"
            unit="pers."
            showToggle={false}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge title="Part des femmes" current={femmesPct} target={50} unit="%" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge title="Couverture provinciale" current={coveragePct} target={100} unit="%" />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PerformanceGauge title="Exécution PTBA" current={Math.round(ptbaTaux ?? 0)} target={100} unit="%" />
        </Grid>
      </Grid>
    </Box>
  );
};
