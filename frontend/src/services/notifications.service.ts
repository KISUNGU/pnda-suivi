import { api } from './api';

export type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';
export type NotificationType = 'risk' | 'complaint' | 'activity' | 'user';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  type: NotificationType;
  category_label: string;
  created_at: string;
  action_url: string;
  province: string | null;
  entity_type: 'risque' | 'plainte' | 'activite' | 'utilisateur';
  entity_id: number;
  read: boolean;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  total: number;
  unread: number;
}

export interface NotificationsSummary {
  total: number;
  unread: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
}

export interface NotificationFilters {
  type?: NotificationType;
  severity?: NotificationSeverity;
  unreadOnly?: boolean;
  limit?: number;
}

export const notificationsService = {
  getAll: (params: NotificationFilters = {}) =>
    api.get<NotificationsResponse>('/notifications', { params }),

  getSummary: () =>
    api.get<NotificationsSummary>('/notifications/summary'),

  markAsRead: (id: string) =>
    api.put<NotificationItem>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.put<{ updated: number; summary: NotificationsSummary }>('/notifications/read-all'),
};

export default notificationsService;