// frontend/src/services/suivi.service.ts
import { api } from './api';

export interface SuiviMission {
  id: number;
  num: string;
  section: number;
  sectionLabel: string;
  natureMission: string;
  objectif: string;
  horsProjet: number;
  projet: number;
  montantUSD: number;
  dates: string;
  avanceUSD: number;
  solde: number;
  province: string;
}

export interface SuiviStats {
  totalMissions: number;
  totalMontant: number;
  totalAvances: number;
  totalSolde: number;
  parProvince: Record<string, {
    missions: number;
    montant: number;
    avances: number;
    solde: number;
  }>;
}

export const suiviService = {
  getMissions: (province?: string) =>
    api.get<SuiviMission[]>('/suivi/missions', { params: province ? { province } : undefined }),
  getStats: () =>
    api.get<SuiviStats>('/suivi/stats'),
};
