// frontend/src/components/common/Layout/Sidebar.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import GoogleIcon from '../GoogleIcon';
import { SamentorLogo } from '../SamentorLogo';
import { COULEURS_MODULE } from '../../../assets/styles/theme';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  variant: 'permanent' | 'temporary';
}

interface MenuItem {
  title: string;
  path?: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: 'Tableaux de bord',
    icon: <GoogleIcon name="dashboard" size={26} />,
    children: [
      { title: 'National', path: '/dashboard/national', icon: <GoogleIcon name="dashboard" size={24} />, roles: ['super_admin', 'admin', 'uncp'] },
      { title: 'Provincial', path: '/dashboard/provincial', icon: <GoogleIcon name="map" size={24} />, roles: ['super_admin', 'admin', 'uncp', 'upep'] },
      { title: 'Officier Terrain', path: '/dashboard/ot', icon: <GoogleIcon name="person_pin_circle" size={24} />, roles: ['ot'] },
      { title: 'Partenaires', path: '/dashboard/partenaires', icon: <GoogleIcon name="handshake" size={24} />, roles: ['super_admin', 'admin', 'uncp', 'upep', 'partenaire'] },
    ],
  },
  {
    title: 'Indicateurs de performance',
    icon: <GoogleIcon name="bar_chart" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire'],
    children: [
      { title: 'IODP', path: '/indicateurs/iodp', icon: <GoogleIcon name="bar_chart" size={24} /> },
      { title: 'Résultats intermédiaires', path: '/indicateurs/ir', icon: <GoogleIcon name="trending_up" size={24} /> },
      { title: 'Cadre des résultats', path: '/indicateurs/cadre', icon: <GoogleIcon name="assignment_turned_in" size={24} /> },
      // { title: 'Environnement & VBG', path: '/indicateurs/environnement', icon: <GoogleIcon name="eco" size={24} /> },
    ],
  },
  {
    title: 'Bénéficiaires',
    icon: <GoogleIcon name="groups" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep', 'ot'],
    children: [
      { title: 'Tableau de bord', path: '/beneficiaires/dashboard', icon: <GoogleIcon name="dashboard" size={24} />, roles: ['super_admin', 'admin', 'uncp', 'upep'] },
      { title: 'RNA', path: '/beneficiaires/rna', icon: <GoogleIcon name="person" size={24} /> },
      { title: 'Cartes agriculteurs', path: '/beneficiaires/cartes', icon: <GoogleIcon name="badge" size={24} /> },
      { title: 'Ventes semences', path: '/beneficiaires/ventes-semences', icon: <GoogleIcon name="sell" size={24} /> },
      { title: 'Organisations paysannes', path: '/beneficiaires/organisations', icon: <GoogleIcon name="corporate_fare" size={24} /> },
      { title: 'Fournisseurs', path: '/beneficiaires/fournisseurs', icon: <GoogleIcon name="local_shipping" size={24} />, roles: ['super_admin', 'admin', 'uncp', 'upep'] },
    ],
  },
  {
    title: 'Suivi opérationnel',
    icon: <GoogleIcon name="assignment" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep', 'ot'],
    children: [
      { title: 'Missions T4 2025', path: '/suivi/missions', icon: <GoogleIcon name="flight_takeoff" size={24} /> },
      { title: 'Activités du projet', path: '/suivi/activites', icon: <GoogleIcon name="task" size={24} /> },
      { title: 'Suivi du PTBA 2026', path: '/suivi/ptba', icon: <GoogleIcon name="event_note" size={24} /> },
    ],
  },
  {
    title: 'Gestion des risques',
    icon: <GoogleIcon name="warning" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep'],
    children: [
      { title: 'Registre des risques', path: '/risques/registre', icon: <GoogleIcon name="report_problem" size={24} /> },
      { title: "Plan d'atténuation", path: '/risques/plan', icon: <GoogleIcon name="security" size={24} /> },
      { title: 'Alertes', path: '/risques/alertes', icon: <GoogleIcon name="notifications_active" size={24} /> },
    ],
  },
  {
    title: 'Mécanisme de plaintes',
    icon: <GoogleIcon name="support_agent" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep', 'ot'],
    children: [
      { title: 'Registre des plaintes', path: '/database/plaintes', icon: <GoogleIcon name="feedback" size={24} /> },
    ],
  },
  {
    title: 'Données du projet',
    icon: <GoogleIcon name="folder_open" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep'],
    children: [
      { title: 'Base bénéficiaires', path: '/database/beneficiaires', icon: <GoogleIcon name="people" size={24} /> },
      { title: 'Base activités', path: '/database/activites', icon: <GoogleIcon name="list_alt" size={24} /> },
      { title: 'Base indicateurs', path: '/database/indicateurs', icon: <GoogleIcon name="analytics" size={24} /> },
    ],
  },
  {
    title: 'Outils terrain',
    icon: <GoogleIcon name="agriculture" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep', 'ot'],
    children: [
      { title: 'Calculateur indicateurs', path: '/outils/calculateur', icon: <GoogleIcon name="calculate" size={24} />, roles: ['super_admin', 'admin', 'uncp', 'upep'] },
      { title: 'Collecte mobile', path: '/outils/collecte', icon: <GoogleIcon name="phone_android" size={24} /> },
      { title: 'Cartographie', path: '/outils/cartographie', icon: <GoogleIcon name="map" size={24} /> },
    ],
  },
  {
    title: 'Rapports',
    path: '/rapports',
    icon: <GoogleIcon name="description" size={26} />,
    roles: ['super_admin', 'admin', 'uncp', 'upep', 'partenaire'],
  },
  {
    title: 'Administration',
    icon: <GoogleIcon name="settings" size={26} />,
    roles: ['super_admin'],
    children: [
      { title: 'Utilisateurs', path: '/admin/utilisateurs', icon: <GoogleIcon name="admin_panel_settings" size={24} /> },
      { title: 'Configurations', path: '/admin/configurations', icon: <GoogleIcon name="tune" size={24} /> },
    ],
  },
  {
    title: 'Aide & Documentation',
    path: '/aide',
    icon: <GoogleIcon name="help" size={26} />,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose, variant }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  // Rôle de l'utilisateur connecté
  const userRole = React.useMemo(() => {
    try {
      const s = localStorage.getItem('user');
      return s ? (JSON.parse(s) as { role: string }).role : '';
    } catch {
      return '';
    }
  }, []);

  // Filtrer les éléments selon le rôle
  const canSee = (item: MenuItem) =>
    !item.roles || item.roles.includes(userRole);

  const visibleItems = React.useMemo(
    () => menuItems
      .filter(canSee)
      .map((item) => ({
        ...item,
        children: item.children?.filter(canSee),
      }))
      .filter((item) => !item.children || item.children.length > 0),
    [userRole],
  );

  const activeParentTitle = React.useMemo(
    () => visibleItems.find((item) => item.children?.some((child) => child.path === location.pathname))?.title ?? null,
    [location.pathname, visibleItems],
  );

  useEffect(() => {
    if (activeParentTitle) {
      setExpandedMenu(activeParentTitle);
    }
  }, [activeParentTitle]);

  const handleMenuClick = (title: string) => {
    setExpandedMenu((currentMenu) => (currentMenu === title ? null : title));
  };

  const handleItemClick = (path: string) => {
    navigate(path);
    if (variant === 'temporary') {
      onClose();
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const drawerContent = (
    <Box sx={{ width: 280, height: '100%', color: 'text.primary', display: 'flex', flexDirection: 'column' }}>
      {/* Header avec logo */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          background: `linear-gradient(152deg, ${COULEURS_MODULE.base}2E 0%, ${COULEURS_MODULE.statistiques}14 100%)`,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Box>
          <SamentorLogo height={72} sx={{ mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.2 }}>
          
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Système de Suivi-Évaluation
          </Typography>
        </Box>
        {variant === 'temporary' && (
          <IconButton onClick={onClose}>
            <GoogleIcon name="close" size={26} />
          </IconButton>
        )}
      </Box>

      {/* Menu de navigation */}
      <List sx={{ px: 1, py: 2, flex: 1, overflow: 'auto' }}>
        {visibleItems.map((item) => (
          <React.Fragment key={item.title}>
            <ListItem disablePadding>
              {(() => {
                const isExpanded = expandedMenu === item.title;
                const isDirectlyActive = isActive(item.path || '');
                const isMenuSelected = isDirectlyActive || activeParentTitle === item.title;

                return (
              <ListItemButton
                onClick={() => item.children ? handleMenuClick(item.title) : item.path && handleItemClick(item.path)}
                sx={{
                  borderRadius: '10px',
                  mb: 0.5,
                  color: isMenuSelected ? 'text.primary' : 'text.secondary',
                  background: isMenuSelected
                    ? `linear-gradient(135deg, ${COULEURS_MODULE.base}3D 0%, ${COULEURS_MODULE.statistiques}26 100%)`
                    : isExpanded
                      ? 'action.hover'
                      : 'transparent',
                  boxShadow: isMenuSelected
                    ? `inset 3px 0 0 ${COULEURS_MODULE.base}`
                    : isExpanded
                      ? 'inset 0 0 0 1px rgba(148,163,184,0.18)'
                      : 'none',
                  transition: theme.transitions.create(['background-color', 'box-shadow', 'transform'], {
                    duration: 220,
                    easing: theme.transitions.easing.easeInOut,
                  }),
                  '&:hover': {
                    background: isMenuSelected
                      ? `linear-gradient(135deg, ${COULEURS_MODULE.base}4D 0%, ${COULEURS_MODULE.statistiques}33 100%)`
                      : 'action.hover',
                    color: 'text.primary',
                    transform: 'translateX(2px)',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40, fontSize: '26px' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.title} 
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: isExpanded || isDirectlyActive ? 700 : 500,
                    letterSpacing: isExpanded ? 0.15 : 0,
                  }} 
                />
                {item.children && (
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      transition: theme.transitions.create('transform', {
                        duration: 260,
                        easing: theme.transitions.easing.easeInOut,
                      }),
                      transform: expandedMenu === item.title ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    <GoogleIcon name="expand_more" size={24} />
                  </Box>
                )}
              </ListItemButton>
                );
              })()}
            </ListItem>
            {item.children && (
              <Collapse
                in={expandedMenu === item.title}
                timeout={{ enter: 280, exit: 220 }}
                easing={{
                  enter: theme.transitions.easing.easeOut,
                  exit: theme.transitions.easing.sharp,
                }}
                unmountOnExit
              >
                <List component="div" disablePadding>
                  {item.children.map((child) => (
                    <ListItemButton
                      key={child.title}
                      onClick={() => child.path && handleItemClick(child.path)}
                      sx={{
                        pl: 6,
                        borderRadius: '10px',
                        ml: 1,
                        mr: 1,
                        mb: 0.5,
                        color: isActive(child.path || '') ? 'text.primary' : 'text.secondary',
                        background: isActive(child.path || '')
                          ? `linear-gradient(135deg, ${COULEURS_MODULE.base}33 0%, ${COULEURS_MODULE.statistiques}1F 100%)`
                          : 'transparent',
                        boxShadow: isActive(child.path || '') ? `inset 3px 0 0 ${COULEURS_MODULE.base}` : 'none',
                        '&:hover': {
                          background: isActive(child.path || '')
                            ? `linear-gradient(135deg, ${COULEURS_MODULE.base}42 0%, ${COULEURS_MODULE.statistiques}2E 100%)`
                            : 'action.hover',
                          color: 'text.primary',
                        },
                      }}
                    >
                      <ListItemIcon sx={{ color: 'inherit', minWidth: 32, fontSize: '24px' }}>
                        {child.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={child.title} 
                        primaryTypographyProps={{ fontSize: 13 }} 
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </React.Fragment>
        ))}
      </List>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.disabled">
          Version 2.0 © SAMANTOR 2026
        </Typography>
      </Box>
    </Box>
  );

  if (variant === 'permanent') {
    return (
      <Drawer
        variant="permanent"
        className="sans-impression"
        sx={{
          width: 280,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        {drawerContent}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="temporary"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          border: 'none',
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
};