// frontend/src/pages/Risques/AlertesRisques.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Stack,
  Avatar,
  Divider,
  Badge,
} from '@mui/material';
import { GoogleIcon } from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { ExportToolbar } from '../../components/common/ExportToolbar/ExportToolbar';
import { useNotifications } from '../../context/NotificationsContext';
import type { NotificationItem } from '../../services/notifications.service';

type RiskAlertNotification = NotificationItem & {
  severity: 'danger' | 'warning' | 'info';
};

const niveauConfig: Record<'danger' | 'warning' | 'info', {
  label: string; color: string; bg: string; borderColor: string; icon: string; severity: 'error' | 'warning' | 'info';
}> = {
  danger:  { label: 'Critique', color: '#C62828', bg: '#FFEBEE', borderColor: '#EF9A9A', icon: 'error', severity: 'error' },
  warning: { label: 'Avertissement', color: '#E65100', bg: '#FFF3E0', borderColor: '#FFCC80', icon: 'warning', severity: 'warning' },
  info:    { label: 'Information', color: '#1565C0', bg: '#E3F2FD', borderColor: '#90CAF9', icon: 'info', severity: 'info' },
};

const risqueCodes: Record<number, string> = {
  1: 'RISK-001', 2: 'RISK-002', 3: 'RISK-003',
  4: 'RISK-004', 5: 'RISK-005', 6: 'RISK-006',
};

export const AlertesRisques: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, loading, refresh, markAsRead } = useNotifications();
  const [filter, setFilter] = useState<'toutes' | 'non_lues' | 'danger' | 'warning' | 'info'>('toutes');

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const alertes = useMemo(
    () => notifications.filter(
      (notification): notification is RiskAlertNotification => (
        notification.type === 'risk' && notification.severity !== 'success'
      ),
    ),
    [notifications],
  );

  const handleMarquerLue = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleToutMarquerLu = async () => {
    const nonLues = alertes.filter((alerte) => !alerte.read);
    await Promise.allSettled(nonLues.map((alerte) => markAsRead(alerte.id)));
  };

  const nonLues = alertes.filter((alerte) => !alerte.read).length;
  const critiques = alertes.filter((alerte) => alerte.severity === 'danger').length;
  const avertissements = alertes.filter((alerte) => alerte.severity === 'warning').length;

  const filtered = alertes.filter((alerte) => {
    if (filter === 'non_lues') return !alerte.read;
    if (filter === 'danger' || filter === 'warning' || filter === 'info') return alerte.severity === filter;
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
            Alertes risques
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Alertes issues du centre de notifications unifié pour les risques nécessitant une attention immédiate
          </Typography>
        </Box>
        {nonLues > 0 && (
          <Button
            variant="outlined"
            startIcon={<GoogleIcon name="done_all" size={18} />}
            onClick={handleToutMarquerLu}
            sx={{ borderRadius: 2 }}
          >
            Tout marquer comme lu
          </Button>
        )}
      </Box>

      {/* Statistiques */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Total alertes"
            value={alertes.length.toLocaleString('fr-FR')}
            icon={<Badge badgeContent={nonLues} color="error"><GoogleIcon name="notifications" size={36} /></Badge>}
            trend={{ value: nonLues, direction: nonLues > 0 ? 'down' : 'up', period: nonLues > 0 ? 'non lues' : 'toutes lues' }}
            color="primary"
            onClick={() => navigate('/risques/registre')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Critiques"
            value={critiques.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="error" size={36} />}
            trend={{ value: alertes.length > 0 ? Math.round((critiques / alertes.length) * 100) : 0, direction: 'down', period: 'du total' }}
            color="danger"
            onClick={() => navigate('/risques/registre')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Avertissements"
            value={avertissements.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="warning" size={36} />}
            trend={{ value: alertes.length > 0 ? Math.round((avertissements / alertes.length) * 100) : 0, direction: 'up', period: 'du total' }}
            color="warning"
            onClick={() => navigate('/risques/plan')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <GradientWidget
            title="Lues"
            value={(alertes.length - nonLues).toLocaleString('fr-FR')}
            icon={<GoogleIcon name="mark_email_read" size={36} />}
            trend={{ value: alertes.length > 0 ? Math.round(((alertes.length - nonLues) / alertes.length) * 100) : 0, direction: 'up', period: 'du total' }}
            color="success"
            onClick={() => navigate('/notifications')}
          />
        </Grid>
      </Grid>

      {/* Filtres */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        {([
          { key: 'toutes', label: 'Toutes', count: alertes.length },
          { key: 'non_lues', label: 'Non lues', count: nonLues },
          { key: 'danger', label: 'Critiques', count: critiques },
          { key: 'warning', label: 'Avertissements', count: avertissements },
          { key: 'info', label: 'Informations', count: alertes.filter((a) => a.severity === 'info').length },
        ] as const).map(({ key, label, count }) => (
          <Chip
            key={key}
            label={`${label} (${count})`}
            onClick={() => setFilter(key)}
            variant={filter === key ? 'filled' : 'outlined'}
            sx={{
              bgcolor: filter === key ? '#2E7D32' : 'transparent',
              color: filter === key ? 'white' : 'inherit',
              borderColor: '#2E7D32',
              cursor: 'pointer',
            }}
          />
        ))}
      </Stack>

      {/* Export */}
      <ExportToolbar
        title="Alertes risques — PNDA-SE"
        subtitle="Journal des alertes et notifications de risques"
        columns={[
          { header: 'ID', key: 'id', width: 8 },
          { header: 'Risque', key: 'risque_code', width: 14 },
          { header: 'Message', key: 'message', width: 60 },
          { header: 'Niveau', key: 'niveau', width: 16 },
          { header: 'Date', key: 'date_alerte', width: 20 },
          { header: 'Statut', key: 'statut', width: 12 },
        ]}
        getData={() => filtered.map((a) => ({
          id: a.id,
          risque_code: risqueCodes[a.entity_id] ?? `RISK-${a.entity_id}`,
          message: `${a.title} — ${a.message}`,
          niveau: niveauConfig[a.severity].label,
          date_alerte: new Date(a.created_at).toLocaleString('fr-FR'),
          statut: a.read ? 'Lue' : 'Non lue',
        }))}
        filename="alertes_risques"
      />

      {/* Liste des alertes */}
      <Stack spacing={2} sx={{ mt: 2 }}>
        {filtered.length === 0 ? (
          <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
            <GoogleIcon name="notifications_none" size={48} sx={{ color: '#BDBDBD', mb: 1 }} />
            <Typography color="text.secondary">Aucune alerte pour ce filtre</Typography>
          </Paper>
        ) : (
          filtered.map((alerte) => {
            const cfg = niveauConfig[alerte.severity];
            return (
              <Paper
                key={alerte.id}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  borderLeft: `4px solid ${cfg.borderColor}`,
                  bgcolor: alerte.read ? 'white' : cfg.bg,
                  opacity: alerte.read ? 0.75 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1 }}>
                    <Avatar sx={{ bgcolor: cfg.bg, width: 36, height: 36, mt: 0.25 }}>
                      <GoogleIcon name={cfg.icon} size={20} sx={{ color: cfg.color }} />
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          label={cfg.label}
                          size="small"
                          sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: '0.7rem' }}
                        />
                        <Chip
                          label={risqueCodes[alerte.entity_id] ?? `RISK-${alerte.entity_id}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                        {!alerte.read && (
                          <Chip
                            label="Non lue"
                            size="small"
                            sx={{ bgcolor: '#1976D2', color: 'white', fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={alerte.read ? 400 : 600}
                        sx={{ mb: 0.5 }}
                      >
                        {alerte.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {alerte.message}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(alerte.created_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </Typography>
                    </Box>
                  </Box>
                  {!alerte.read && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<GoogleIcon name="check" size={14} />}
                      onClick={() => void handleMarquerLue(alerte.id)}
                      sx={{ borderRadius: 2, whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      Marquer lue
                    </Button>
                  )}
                </Box>
                {alerte.read && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <GoogleIcon name="check_circle" size={14} sx={{ color: '#4CAF50' }} />
                      <Typography variant="caption" color="success.main">Lue</Typography>
                    </Box>
                  </>
                )}
              </Paper>
            );
          })
        )}
      </Stack>
    </Box>
  );
};

export default AlertesRisques;
