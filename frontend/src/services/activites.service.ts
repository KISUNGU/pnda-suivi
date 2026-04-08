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

export interface Activite {
  id: number;
  code: string;
  titre: string;
  description: string;
  type: 'enquete' | 'formation' | 'suivi' | 'distribution' | 'reunion' | 'visite' | 'plainte' | 'autre';
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'annulee' | 'reportee';
  priorite: 'haute' | 'moyenne' | 'basse';
  date_debut: string;
  date_fin: string;
  lieu: string;
  province: string;
  territoire: string;
  commune?: string;
  village?: string;
  responsable: string;
  responsable_contact?: string;
  participants_prevus: number;
  participants_reels?: number;
  budget_prevu: number;
  budget_reel?: number;
  objectifs: string[];
  resultats_attendus: string[];
  resultats_obtenus?: string;
  difficultes?: string;
  lecons_apprises?: string;
  documents: { nom: string; url: string }[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ActiviteFilters {
  search?: string;
  type?: string;
  statut?: string;
  province?: string;
  responsable?: string;
  date_debut?: string;
  date_fin?: string;
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

export const activitesService = {
  getAll: (filters: ActiviteFilters = {}) =>
    api.get<{ data: Activite[]; total: number; page: number; totalPages: number }>('/activites', { params: filters }),
  
  getById: (id: number) => api.get<Activite>(`/activites/${id}`),
  
  create: (data: Partial<Activite>) => api.post<Activite>('/activites', data),
  
  update: (id: number, data: Partial<Activite>) => api.put<Activite>(`/activites/${id}`, data),
  
  delete: (id: number) => api.delete(`/activites/${id}`),
  
  getStats: () => api.get<ActiviteStats>('/activites/stats'),
  
  exporter: (format: 'pdf' | 'excel') => api.get(`/activites/export/${format}`, { responseType: 'blob' }),
  
  importer: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/activites/import', formData);
  },
};

export default activitesService;