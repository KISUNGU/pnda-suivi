// frontend/src/components/common/Layout/Header.tsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Button,
  CircularProgress,
  useTheme,
  Divider,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import GoogleIcon from '../GoogleIcon';
import { useAuth } from '../../../context/AuthContext';
import { PndaLogo } from '../PndaLogo';
import { useNotifications } from '../../../context/NotificationsContext';
import type { NotificationItem } from '../../../services/notifications.service';
import { formatNotificationRelativeDate } from '../../../utils/notificationTime';

const roleLabels: Record<string, string> = {
  admin: 'Administrateur système',
  uncp: 'UNCP - Coordinateur S&E',
  upep: 'UPEP - Coordinateur provincial',
  ot: 'Opérateur Technique',
  partenaire: 'Partenaire',
  invite: 'Invité',
};

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, summary, loading, refresh, markAsRead, markAllAsRead } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const initials = user
    ? `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase()
    : 'U';
  const displayName = user ? `${user.prenom} ${user.nom}` : 'Utilisateur';
  const roleLabel = user ? (roleLabels[user.role] ?? user.role) : '';

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    (document.activeElement as HTMLElement)?.blur();
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
    void refresh();
  };

  const handleNotificationClose = () => {
    (document.activeElement as HTMLElement)?.blur();
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    navigate('/login');
  };

  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('fr-FR', options);
  };

  const visibleNotifications = notifications.slice(0, 6);

  const getNotificationIcon = (notification: NotificationItem) => {
    switch (notification.severity) {
      case 'danger':
        return 'error';
      case 'warning':
        return 'warning';
      case 'success':
        return 'task_alt';
      default:
        return 'info';
    }
  };

  const handleOpenNotificationsPage = () => {
    handleNotificationClose();
    navigate('/notifications');
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    handleNotificationClose();
    navigate(notification.action_url);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            edge="start"
            onClick={onMenuClick}
            sx={{ display: { md: 'none' }, mr: 2 }}
          >
            <GoogleIcon name="menu" size={28} />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PndaLogo height={42} sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600, 
                color: 'primary.main',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Date */}
          <Typography 
            variant="body2" 
            sx={{ 
              alignItems: 'center',
              gap: 0.75,
              color: 'text.secondary', 
              display: { xs: 'none', sm: 'flex' },
              fontSize: '0.875rem'
            }}
          >
            <GoogleIcon name="calendar_month" size={22} />
            {getCurrentDate()}
          </Typography>

          {/* Notifications */}
          <IconButton onClick={handleNotificationOpen}>
            <Badge badgeContent={summary.unread} color="error" max={99}>
              <GoogleIcon name="notifications" size={26} />
            </Badge>
          </IconButton>
          <Menu 
            anchorEl={notificationAnchor} 
            open={Boolean(notificationAnchor)} 
            onClose={handleNotificationClose}
            PaperProps={{
              style: { maxHeight: 400, overflow: 'auto' },
              sx: { width: 320, borderRadius: '10px' }
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid #E0E0E0' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={600}>
                    Notifications
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {summary.unread} non lue(s) sur {summary.total}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => void markAllAsRead()} disabled={summary.unread === 0}>
                  Tout lire
                </Button>
              </Box>
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={24} />
              </Box>
            ) : visibleNotifications.length > 0 ? (
              visibleNotifications.map((notification) => (
                <MenuItem
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification)}
                  sx={{
                    alignItems: 'flex-start',
                    gap: 1.25,
                    py: 1.5,
                    whiteSpace: 'normal',
                    bgcolor: notification.read ? 'transparent' : '#F7FBF7',
                  }}
                >
                  <GoogleIcon name={getNotificationIcon(notification)} size={20} sx={{ color: notification.read ? 'text.secondary' : 'primary.main', mt: 0.25 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={notification.read ? 500 : 700}>
                      {notification.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                      {formatNotificationRelativeDate(notification.created_at)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            ) : (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Aucune notification disponible.
                </Typography>
              </Box>
            )}
            <Divider />
            <MenuItem onClick={handleOpenNotificationsPage} sx={{ justifyContent: 'center' }}>
              <Typography variant="body2" color="primary.main">
                Voir toutes les notifications
              </Typography>
            </MenuItem>
          </Menu>

          {/* User */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main', 
                width: 40, 
                height: 40,
                cursor: 'pointer'
              }}
              onClick={handleMenuOpen}
            >
              {initials}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={600}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {roleLabel}
              </Typography>
            </Box>
            <Menu 
              anchorEl={anchorEl} 
              open={Boolean(anchorEl)} 
              onClose={handleMenuClose}
              PaperProps={{
                style: { maxHeight: 400, overflow: 'auto' },
                sx: { width: 250, borderRadius: '10px' }
              }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profil'); }}>
                <ListItemIcon>
                    <GoogleIcon name="person" size={22} />
                </ListItemIcon>
                <ListItemText>Mon profil</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                    <GoogleIcon name="dashboard" size={22} />
                </ListItemIcon>
                <ListItemText>Mon tableau de bord</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon>
                  <GoogleIcon name="settings" size={22} />
                </ListItemIcon>
                <ListItemText>Paramètres</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <GoogleIcon name="logout" size={22} sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText sx={{ color: 'error.main' }}>Déconnexion</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};