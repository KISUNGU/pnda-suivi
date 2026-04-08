// frontend/src/services/suiviActivites.service.ts
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

export interface ActiviteSuivi {
  id: number;
  code: string;
  titre: string;
  description: string;
  type: 'enquete' | 'formation' | 'distribution' | 'reunion' | 'visite' | 'suivi_technique' | 'autre';
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'reportee' | 'annulee';
  priorite: 'haute' | 'moyenne' | 'basse';
  date_debut: string;
  date_fin: string;
  lieu: string;
  province: string;
  territoire: string;
  responsable: string;
  equipe: string[];
  participants_prevus: number;
  participants_reels?: number;
  objectifs: string[];
  resultats_attendus: string[];
  resultats_obtenus?: string;
  difficultes?: string;
  photos?: string[];
  documents?: { nom: string; url: string }[];
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
  taux_realisation: number;
  participants_total: number;
}

export const suiviActivitesService = {
  getAll: (filters: ActiviteFilters = {}) =>
    api.get<{ data: ActiviteSuivi[]; total: number; page: number; totalPages: number }>('/suivi/activites', { params: filters }),
  
  getById: (id: number) => api.get<ActiviteSuivi>(`/suivi/activites/${id}`),
  
  create: (data: Partial<ActiviteSuivi>) => api.post<ActiviteSuivi>('/suivi/activites', data),
  
  update: (id: number, data: Partial<ActiviteSuivi>) => api.put<ActiviteSuivi>(`/suivi/activites/${id}`, data),
  
  delete: (id: number) => api.delete(`/suivi/activites/${id}`),
  
  getStats: () => api.get<ActiviteStats>('/suivi/activites/stats'),
  
  exporter: (format: 'pdf' | 'excel') => api.get(`/suivi/activites/export/${format}`, { responseType: 'blob' }),
  
  importer: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/suivi/activites/import', formData);
  },
};

export default suiviActivitesService;