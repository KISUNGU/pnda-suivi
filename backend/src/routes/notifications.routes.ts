/**
 * Routes : Notifications Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getActivites,
  getPlaintes,
  getReadNotificationIds,
  getRisqueAlertes,
  getRisques,
  getUtilisateurs,
  markNotificationAsRead,
  markNotificationsAsRead,
  type SqlActivite,
  type SqlPlainte,
} from '../db';
import {
  authenticateToken,
  getRequestUser,
  type AppUser,
} from '../middleware/auth';
import type { AlerteRisque } from '../types/app.types';

const router = Router();

// ==================== NOTIFICATIONS ROUTES ====================


type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';
type NotificationType = 'risk' | 'complaint' | 'activity' | 'user';
type NotificationEntityType = 'risque' | 'plainte' | 'activite' | 'utilisateur';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  type: NotificationType;
  category_label: string;
  created_at: string;
  action_url: string;
  province: string | null;
  entity_type: NotificationEntityType;
  entity_id: number;
  read: boolean;
}

interface NotificationSeed extends Omit<AppNotification, 'read'> {
  roles?: string[];
  defaultRead?: boolean;
}

const nationalRoles = new Set(['admin', 'uncp', 'partenaire']);


function toIsoDate(value?: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function compareNotificationsByDate(a: { created_at: string }, b: { created_at: string }): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function canUserAccessNotification(currentUser: AppUser, notification: NotificationSeed): boolean {
  if (notification.roles && !notification.roles.includes(currentUser.role)) {
    return false;
  }

  if (!notification.province || nationalRoles.has(currentUser.role)) {
    return true;
  }

  return currentUser.province === notification.province;
}

function getComplaintSeverity(plainte: SqlPlainte): NotificationSeverity {
  if (plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS') {
    return 'danger';
  }

  if (plainte.statut === 'en_cours' || plainte.statut === 'referee') {
    return 'warning';
  }

  if (plainte.statut === 'traitee') {
    return 'success';
  }

  return 'info';
}

function getComplaintTitle(plainte: SqlPlainte): string {
  if (plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS') {
    return 'Plainte sensible à traiter';
  }

  switch (plainte.statut) {
    case 'traitee':
      return 'Plainte traitée';
    case 'en_cours':
      return 'Plainte en cours de traitement';
    case 'referee':
      return 'Plainte référée à un service';
    default:
      return 'Nouvelle plainte reçue';
  }
}

async function buildRiskNotificationSeeds(): Promise<NotificationSeed[]> {
  const [alertes, risques] = await Promise.all([getRisqueAlertes(), getRisques()]);
  const risqueById = new Map(risques.map((item) => [item.id, item]));

  return alertes.map((alerte) => {
    const risque = risqueById.get(alerte.id_risque);
    const titleByLevel: Record<AlerteRisque['niveau'], string> = {
      danger: 'Alerte risque critique',
      warning: 'Alerte risque élevée',
      info: 'Mise à jour de risque',
    };

    return {
      id: `risk-alert-${alerte.id}`,
      title: titleByLevel[alerte.niveau],
      message: risque?.province ? `${risque.province} · ${alerte.message}` : alerte.message,
      severity: alerte.niveau,
      type: 'risk',
      category_label: 'Risques',
      created_at: toIsoDate(alerte.date_alerte),
      action_url: '/risques/alertes',
      province: risque?.province ?? null,
      entity_type: 'risque',
      entity_id: alerte.id_risque,
      roles: ['admin', 'uncp', 'upep'],
      defaultRead: alerte.est_lue,
    };
  });
}

async function buildComplaintNotificationSeeds(): Promise<NotificationSeed[]> {
  const { data: plaintes } = await getPlaintes({ page: 0, limit: 10000 });

  return plaintes.map((plainte) => ({
    id: `complaint-${plainte.id}`,
    title: getComplaintTitle(plainte),
    message: `${plainte.numero_plainte} · ${plainte.province} · ${plainte.description}`,
    severity: getComplaintSeverity(plainte),
    type: 'complaint',
    category_label: 'Plaintes',
    created_at: toIsoDate(plainte.date_reception),
    action_url: '/database/plaintes',
    province: plainte.province ?? null,
    entity_type: 'plainte',
    entity_id: plainte.id,
    roles: plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS'
      ? ['admin', 'uncp', 'upep']
      : ['admin', 'uncp', 'upep', 'ot'],
  }));
}

function getActivityCompletionDate(activite: SqlActivite): string {
  return activite.date_fin || activite.updated_at || activite.created_at;
}

async function buildActivityNotificationSeeds(): Promise<NotificationSeed[]> {
  const { data: activites } = await getActivites({ page: 0, limit: 10000 });
  const notifications: NotificationSeed[] = [];

  for (const activite of activites) {
    if (activite.statut === 'en_cours' && activite.taux_execution < 60) {
      notifications.push({
        id: `activity-progress-${activite.id}`,
        title: 'Activité à surveiller',
        message: `${activite.code} · ${activite.titre} n'a atteint que ${activite.taux_execution}% d'exécution.`,
        severity: 'warning',
        type: 'activity',
        category_label: 'Activités',
        created_at: toIsoDate(getActivityCompletionDate(activite)),
        action_url: '/suivi/activites',
        province: activite.province ?? null,
        entity_type: 'activite',
        entity_id: activite.id,
        roles: ['admin', 'uncp', 'upep', 'ot'],
      });
    }

    if (activite.statut === 'terminee') {
      notifications.push({
        id: `activity-complete-${activite.id}`,
        title: 'Activité terminée',
        message: `${activite.code} · ${activite.titre} est clôturée avec ${activite.taux_execution}% d'exécution.`,
        severity: 'success',
        type: 'activity',
        category_label: 'Activités',
        created_at: toIsoDate(getActivityCompletionDate(activite)),
        action_url: '/suivi/activites',
        province: activite.province ?? null,
        entity_type: 'activite',
        entity_id: activite.id,
        roles: ['admin', 'uncp', 'upep', 'ot'],
      });
    }
  }

  return notifications;
}

async function buildUserNotificationSeeds(): Promise<NotificationSeed[]> {
  const notifications: NotificationSeed[] = [];
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const { data: utilisateurs } = await getUtilisateurs({ page: 0, limit: 1000 });

  for (const utilisateur of utilisateurs) {
    if (utilisateur.statut === 'inactif') {
      notifications.push({
        id: `user-inactive-${utilisateur.id}`,
        title: 'Utilisateur inactif',
        message: `${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email}) est actuellement inactif.`,
        severity: 'warning',
        type: 'user',
        category_label: 'Administration',
        created_at: toIsoDate(utilisateur.derniere_connexion || utilisateur.date_creation),
        action_url: '/admin/utilisateurs',
        province: utilisateur.province ?? null,
        entity_type: 'utilisateur',
        entity_id: utilisateur.id,
        roles: ['admin'],
      });
    }

    const lastSeen = utilisateur.derniere_connexion ? new Date(utilisateur.derniere_connexion).getTime() : 0;
    if (utilisateur.statut === 'actif' && lastSeen > 0 && lastSeen < fourteenDaysAgo) {
      notifications.push({
        id: `user-stale-${utilisateur.id}`,
        title: 'Connexion à relancer',
        message: `${utilisateur.prenom} ${utilisateur.nom} n'a pas ouvert la plateforme depuis plus de 14 jours.`,
        severity: 'info',
        type: 'user',
        category_label: 'Administration',
        created_at: toIsoDate(utilisateur.derniere_connexion),
        action_url: '/admin/utilisateurs',
        province: utilisateur.province ?? null,
        entity_type: 'utilisateur',
        entity_id: utilisateur.id,
        roles: ['admin'],
      });
    }
  }

  return notifications;
}

async function buildNotificationsForUser(currentUser: AppUser): Promise<AppNotification[]> {
  const seeds = [
    ...(await buildRiskNotificationSeeds()),
    ...(await buildComplaintNotificationSeeds()),
    ...(await buildActivityNotificationSeeds()),
    ...(await buildUserNotificationSeeds()),
  ];

  const visibleSeeds = seeds
    .filter((notification) => canUserAccessNotification(currentUser, notification))
    .sort(compareNotificationsByDate);

  const readSet = await getReadNotificationIds(
    currentUser.id,
    visibleSeeds.map((notification) => notification.id),
  );

  return visibleSeeds
    .map(({ defaultRead, ...notification }) => ({
      ...notification,
      read: Boolean(defaultRead) || readSet.has(notification.id),
    }));
}

function buildNotificationSummary(notifications: AppNotification[]): {
  total: number;
  unread: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
} {
  const summary = {
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.read).length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  };

  for (const notification of notifications) {
    summary.byType[notification.type] = (summary.byType[notification.type] ?? 0) + 1;
    summary.bySeverity[notification.severity] = (summary.bySeverity[notification.severity] ?? 0) + 1;
  }

  return summary;
}

router.get('/api/notifications', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    let notifications = await buildNotificationsForUser(currentUser);
    const { type, severity, unreadOnly, limit } = req.query;

    if (type) {
      notifications = notifications.filter((notification) => notification.type === String(type));
    }

    if (severity) {
      notifications = notifications.filter((notification) => notification.severity === String(severity));
    }

    if (String(unreadOnly) === 'true') {
      notifications = notifications.filter((notification) => !notification.read);
    }

    const total = notifications.length;
    const parsedLimit = Number(limit);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      notifications = notifications.slice(0, parsedLimit);
    }

    return res.json({
      data: notifications,
      total,
      unread: notifications.filter((notification) => !notification.read).length,
    });
  } catch (error) {
    console.error('GET /api/notifications failed', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des notifications' });
  }
});

router.get('/api/notifications/summary', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    return res.json(buildNotificationSummary(await buildNotificationsForUser(currentUser)));
  } catch (error) {
    console.error('GET /api/notifications/summary failed', error);
    return res.status(500).json({ message: 'Erreur lors du chargement du résumé des notifications' });
  }
});

router.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    const unreadNotifications = (await buildNotificationsForUser(currentUser)).filter((notification) => !notification.read);

    await markNotificationsAsRead(
      currentUser.id,
      unreadNotifications.map((notification) => notification.id),
    );

    return res.json({
      updated: unreadNotifications.length,
      summary: buildNotificationSummary(await buildNotificationsForUser(currentUser)),
    });
  } catch (error) {
    console.error('PUT /api/notifications/read-all failed', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour des notifications' });
  }
});

router.put('/api/notifications/:id(\\d+)/read', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    const notificationId = String(req.params.id);
    const notification = (await buildNotificationsForUser(currentUser)).find((item) => item.id === notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    await markNotificationAsRead(currentUser.id, notificationId);

    return res.json({ ...notification, read: true });
  } catch (error) {
    console.error('PUT /api/notifications/:id/read failed', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la notification' });
  }
});


export default router;
