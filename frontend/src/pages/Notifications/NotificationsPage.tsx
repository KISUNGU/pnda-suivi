import React, { useMemo, useState } from 'react';
import {
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
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import { useNotifications } from '../../context/NotificationsContext';
import type { NotificationItem, NotificationType } from '../../services/notifications.service';
import { formatNotificationRelativeDate } from '../../utils/notificationTime';

type NotificationFilter = 'all' | 'unread' | NotificationType;

const severityConfig: Record<NotificationItem['severity'], { color: string; bg: string; icon: string; label: string }> = {
  danger: { color: '#C62828', bg: '#FFEBEE', icon: 'error', label: 'Critique' },
  warning: { color: '#EF6C00', bg: '#FFF3E0', icon: 'warning', label: 'Avertissement' },
  success: { color: '#2E7D32', bg: '#E8F5E9', icon: 'task_alt', label: 'Succès' },
  info: { color: '#1565C0', bg: '#E3F2FD', icon: 'info', label: 'Information' },
};

const filterLabels: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'unread', label: 'Non lues' },
  { value: 'risk', label: 'Risques' },
  { value: 'complaint', label: 'Plaintes' },
  { value: 'activity', label: 'Activités' },
  { value: 'user', label: 'Administration' },
];

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, summary, loading, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === 'all') {
        return true;
      }
      if (filter === 'unread') {
        return !notification.read;
      }
      return notification.type === filter;
    });
  }, [filter, notifications]);

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    navigate(notification.action_url);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1B5E20', mb: 1 }}>
            Centre de notifications
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Alertes métier, suivi opérationnel et actions d'administration réellement générés depuis la plateforme.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => void refresh()} startIcon={<GoogleIcon name="refresh" size={18} />}>
            Actualiser
          </Button>
          <Button
            variant="contained"
            onClick={() => void markAllAsRead()}
            startIcon={<GoogleIcon name="done_all" size={18} />}
            disabled={summary.unread === 0}
            sx={{ bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }}
          >
            Tout marquer lu
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <GradientWidget
            title="Total"
            value={summary.total.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="notifications" size={36} />}
            trend={{ value: Object.values(summary.byType).reduce((sum, count) => sum + (count ?? 0), 0), direction: 'up', period: 'notifications suivies' }}
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <GradientWidget
            title="Non lues"
            value={summary.unread.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="mark_email_unread" size={36} />}
            trend={{ value: summary.total > 0 ? Math.round((summary.unread / summary.total) * 100) : 0, direction: summary.unread > 0 ? 'down' : 'up', period: 'du total' }}
            color="danger"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <GradientWidget
            title="Risques / Plaintes"
            value={((summary.byType.risk ?? 0) + (summary.byType.complaint ?? 0)).toLocaleString('fr-FR')}
            icon={<GoogleIcon name="crisis_alert" size={36} />}
            trend={{ value: summary.total > 0 ? Math.round((((summary.byType.risk ?? 0) + (summary.byType.complaint ?? 0)) / summary.total) * 100) : 0, direction: 'up', period: 'des notifications' }}
            color="info"
          />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        {filterLabels.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            color={filter === item.value ? 'primary' : 'default'}
            onClick={() => setFilter(item.value)}
            sx={filter === item.value ? { bgcolor: '#2E7D32' } : undefined}
          />
        ))}
      </Stack>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {filteredNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <GoogleIcon name="notifications_off" size={40} sx={{ color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Aucune notification</Typography>
            <Typography variant="body2" color="text.secondary">
              Rien de nouveau pour ce filtre pour le moment.
            </Typography>
          </Box>
        ) : (
          filteredNotifications.map((notification, index) => {
            const config = severityConfig[notification.severity];

            return (
              <React.Fragment key={notification.id}>
                <Box
                  onClick={() => void handleOpenNotification(notification)}
                  sx={{
                    p: 2.5,
                    cursor: 'pointer',
                    bgcolor: notification.read ? 'background.paper' : '#F7FBF7',
                    '&:hover': { bgcolor: '#F2F8F2' },
                  }}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: config.bg, color: config.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <GoogleIcon name={config.icon} size={22} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 0.75 }}>
                        <Typography variant="subtitle1" fontWeight={notification.read ? 600 : 700}>
                          {notification.title}
                        </Typography>
                        <Chip label={notification.category_label} size="small" />
                        <Chip label={config.label} size="small" sx={{ bgcolor: config.bg, color: config.color }} />
                        {!notification.read && <Chip label="Nouveau" size="small" color="error" />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {formatNotificationRelativeDate(notification.created_at)}
                        {notification.province ? ` · ${notification.province}` : ''}
                      </Typography>
                    </Box>
                    <GoogleIcon name="chevron_right" size={22} sx={{ color: 'text.disabled' }} />
                  </Stack>
                </Box>
                {index < filteredNotifications.length - 1 && <Divider />}
              </React.Fragment>
            );
          })
        )}
      </Paper>
    </Box>
  );
};