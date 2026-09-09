import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import notificationsService, {
  type NotificationItem,
  type NotificationsSummary,
} from '../services/notifications.service';

interface NotificationsContextType {
  notifications: NotificationItem[];
  summary: NotificationsSummary;
  loading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const emptySummary: NotificationsSummary = {
  total: 0,
  unread: 0,
  byType: {},
  bySeverity: {},
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [summary, setSummary] = useState<NotificationsSummary>(emptySummary);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setSummary(emptySummary);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [notificationsResponse, summaryResponse] = await Promise.all([
        notificationsService.getAll(),
        notificationsService.getSummary(),
      ]);
      setNotifications(notificationsResponse.data.data);
      setSummary(summaryResponse.data);
    } catch {
      setNotifications([]);
      setSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((current) => current.map((notification) => (
        notification.id === id ? { ...notification, read: true } : notification
      )));
      setSummary((current) => ({
        ...current,
        unread: Math.max(0, current.unread - 1),
      }));
    } catch {
      await refresh();
    }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    try {
      const response = await notificationsService.markAllAsRead();
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      setSummary(response.data.summary);
    } catch {
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    void refresh();

    if (!user) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh, user?.id]);

  return (
    <NotificationsContext.Provider value={{ notifications, summary, loading, refresh, markAsRead, markAllAsRead }}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
};