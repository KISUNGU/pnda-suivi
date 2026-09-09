// frontend/src/services/activites.service.ts

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type ActiviteType = 'enquete' | 'formation' | 'suivi' | 'distribution' | 'reunion' | 'visite' | 'plainte' | 'autre';
export type ActiviteStatut = 'planifiee' | 'en_cours' | 'terminee' | 'annulee' | 'reportee';
export type ActivitePriorite = 'haute' | 'moyenne' | 'basse';

export interface Document {
  nom: string;
  url: string;
}

export interface Activite {
  id: number;
  code: string;
  titre: string;
  description: string;
  type: ActiviteType;
  composante?: string;
  statut: ActiviteStatut;
  priorite: ActivitePriorite;
  date_debut: string;
  date_fin: string;
  lieu: string;
  province: string;
  territoire?: string;
  commune?: string;
  village?: string;
  responsable: string;
  responsable_contact?: string;
  equipe?: string[];
  participants_prevus: number;
  participants_reels?: number;
  budget_prevu: number;
  budget_reel?: number;
  objectifs: string[];
  resultats_attendus: string[];
  resultats_obtenus?: string;
  difficultes?: string;
  lecons_apprises?: string;
  documents: Document[];
  photos?: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  beneficiaires_cibles?: number;
  beneficiaires_atteints?: number;
  taux_execution?: number;
}

export interface ActiviteFilters {
  search?: string;
  type?: string;
  statut?: string;
  province?: string;
  page?: number;
  limit?: number;
}

export interface ActiviteStats {
  total: number;
  par_type: Record<string, number>;
  par_statut: Record<string, number>;
  par_province: Record<string, number>;
  par_mois: Array<{ mois: string; total: number }>;
  budget_total: number;
  budget_depense: number;
  participants_total: number;
  taux_realisation: number;
}

export interface ActiviteResponse {
  data: Activite[];
  total: number;
  page: number;
  totalPages: number;
}

const normalizeActivite = (activite: Activite): Activite => ({
  ...activite,
  description: activite.description ?? '',
  type: activite.type ?? 'autre',
  statut: activite.statut ?? 'planifiee',
  priorite: activite.priorite ?? 'moyenne',
  date_debut: activite.date_debut ?? '',
  date_fin: activite.date_fin ?? '',
  lieu: activite.lieu ?? '',
  province: activite.province ?? '',
  territoire: activite.territoire ?? '',
  commune: activite.commune ?? '',
  village: activite.village ?? '',
  responsable: activite.responsable ?? '',
  responsable_contact: activite.responsable_contact ?? '',
  equipe: Array.isArray(activite.equipe) ? activite.equipe : [],
  participants_prevus: Number(activite.participants_prevus ?? 0),
  participants_reels: activite.participants_reels !== undefined ? Number(activite.participants_reels) : undefined,
  budget_prevu: Number(activite.budget_prevu ?? 0),
  budget_reel: activite.budget_reel !== undefined ? Number(activite.budget_reel) : undefined,
  objectifs: Array.isArray(activite.objectifs) ? activite.objectifs : [],
  resultats_attendus: Array.isArray(activite.resultats_attendus) ? activite.resultats_attendus : [],
  documents: Array.isArray(activite.documents) ? activite.documents : [],
  photos: Array.isArray(activite.photos) ? activite.photos : [],
  beneficiaires_cibles: activite.beneficiaires_cibles !== undefined ? Number(activite.beneficiaires_cibles) : undefined,
  beneficiaires_atteints: activite.beneficiaires_atteints !== undefined ? Number(activite.beneficiaires_atteints) : undefined,
  taux_execution: activite.taux_execution !== undefined ? Number(activite.taux_execution) : undefined,
});

const normalizeActiviteStats = (stats: ActiviteStats): ActiviteStats => ({
  ...stats,
  total: Number(stats.total ?? 0),
  par_type: Object.fromEntries(Object.entries(stats.par_type ?? {}).map(([key, value]) => [key, Number(value ?? 0)])),
  par_statut: {
    planifiee: Number(stats.par_statut?.planifiee ?? 0),
    en_cours: Number(stats.par_statut?.en_cours ?? 0),
    terminee: Number(stats.par_statut?.terminee ?? 0),
    reportee: Number(stats.par_statut?.reportee ?? 0),
    annulee: Number(stats.par_statut?.annulee ?? 0),
    ...Object.fromEntries(Object.entries(stats.par_statut ?? {}).map(([key, value]) => [key, Number(value ?? 0)])),
  },
  par_province: Object.fromEntries(Object.entries(stats.par_province ?? {}).map(([key, value]) => [key, Number(value ?? 0)])),
  par_mois: Array.isArray(stats.par_mois) ? stats.par_mois.map((item) => ({ mois: item.mois, total: Number(item.total ?? 0) })) : [],
  budget_total: Number(stats.budget_total ?? 0),
  budget_depense: Number(stats.budget_depense ?? 0),
  participants_total: Number(stats.participants_total ?? 0),
  taux_realisation: Number(stats.taux_realisation ?? 0),
});

export const activitesService = {
  getAll: (filters?: ActiviteFilters) =>
    api.get<ActiviteResponse>('/activites-database', { params: filters }).then((response) => ({
      ...response,
      data: {
        ...response.data,
        data: Array.isArray(response.data.data) ? response.data.data.map(normalizeActivite) : [],
        total: Number(response.data.total ?? 0),
        page: Number(response.data.page ?? 0),
        totalPages: Number(response.data.totalPages ?? 0),
      },
    })),
  
  getStats: () =>
    api.get<ActiviteStats>('/activites-database/stats').then((response) => ({
      ...response,
      data: normalizeActiviteStats(response.data),
    })),
  
  getById: (id: number) =>
    api.get<Activite>(`/activites-database/${id}`).then((response) => ({
      ...response,
      data: normalizeActivite(response.data),
    })),
  
  create: (data: Partial<Activite>) =>
    api.post<{ id: number; code: string }>('/activites-database', data),
  
  update: (id: number, data: Partial<Activite>) =>
    api.put(`/activites-database/${id}`, data),
  
  delete: (id: number) =>
    api.delete(`/activites-database/${id}`),
};

export default activitesService;