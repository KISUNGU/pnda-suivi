// frontend/src/store/slices/appSlice.ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  loading: boolean;
  sidebarOpen: boolean;
  notifications: Notification[];
  theme: 'light' | 'dark';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

const initialState: AppState = {
  loading: false,
  sidebarOpen: true,
  notifications: [
    {
      id: '1',
      title: 'Alerte risque élevé',
      message: 'Kasaï - Taux de mortalité animale en hausse',
      type: 'warning',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Plainte VBG en cours',
      message: 'Délai de traitement: 12 jours',
      type: 'error',
      read: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Rapport trimestriel prêt',
      message: 'Téléchargez le rapport T1 2026',
      type: 'success',
      read: false,
      createdAt: new Date().toISOString(),
    },
  ],
  theme: 'light',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
    },
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification) {
        notification.read = true;
      }
    },
    clearNotifications: (state) => {
      state.notifications = [];
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
  },
});

export const {
  setLoading,
  toggleSidebar,
  setSidebarOpen,
  addNotification,
  markNotificationAsRead,
  clearNotifications,
  setTheme,
} = appSlice.actions;

export default appSlice.reducer;