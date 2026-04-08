// frontend/src/services/indicateursDatabase.service.ts
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

export interface IndicateurComplet {
  id: number;
  code: string;
  nom: string;
  description: string;
  type: 'iodp' | 'ir';
  composante: string;
  sous_composante?: string;
  formule: string;
  unite: string;
  frequence: 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';
  source_donnees: string;
  responsable_collecte: string;
  valeurs: {
    reference: number;
    cible: number;
    actuelle: number;
    progression: number;
  };
  historique: Array<{
    periode: string;
    valeur: number;
    source: string;
  }>;
  statut: 'actif' | 'inactif';
  created_at: string;
  updated_at: string;
}

export interface IndicateurFilters {
  search?: string;
  type?: string;
  composante?: string;
  frequence?: string;
  statut?: string;
  page?: number;
  limit?: number;
}

export interface IndicateurStats {
  total: number;
  par_type: { iodp: number; ir: number };
  par_composante: Record<string, number>;
  par_frequence: Record<string, number>;
  progression_moyenne: number;
  indicateurs_atteints: number;
  indicateurs_en_alerte: number;
}

export const indicateursDatabaseService = {
  getAll: (filters: IndicateurFilters = {}) =>
    api.get<{ data: IndicateurComplet[]; total: number; page: number; totalPages: number }>('/indicateurs-database', { params: filters }),
  
  getById: (id: number) => api.get<IndicateurComplet>(`/indicateurs-database/${id}`),
  
  update: (id: number, data: Partial<IndicateurComplet>) => api.put<IndicateurComplet>(`/indicateurs-database/${id}`, data),
  
  updateValeur: (id: number, valeur: number, periode: string) => api.put(`/indicateurs-database/${id}/valeur`, { valeur, periode }),
  
  getStats: () => api.get<IndicateurStats>('/indicateurs-database/stats'),
  
  exporter: (format: 'pdf' | 'excel') => api.get(`/indicateurs-database/export/${format}`, { responseType: 'blob' }),
};

export default indicateursDatabaseService;