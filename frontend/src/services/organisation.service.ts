// frontend/src/services/organisation.service.ts
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

export interface Organisation {
  id: number;
  code: string;
  nom: string;
  sigle: string;
  type: 'cooperative' | 'groupement' | 'association' | 'union' | 'federation';
  date_creation: string;
  date_agrement?: string;
  province: string;
  territoire: string;
  commune?: string;
  adresse: string;
  contacts: {
    responsable: string;
    telephone: string;
    email?: string;
  };
  membres: {
    total: number;
    femmes: number;
    hommes: number;
    jeunes: number;
  };
  productions: string[];
  statut: 'active' | 'inactive' | 'sous_supervision';
  created_at: string;
  updated_at: string;
}

export interface OrganisationFilters {
  search?: string;
  type?: string;
  province?: string;
  statut?: string;
  page?: number;
  limit?: number;
}

export interface OrganisationStats {
  total: number;
  par_type: Record<string, number>;
  par_province: Record<string, number>;
  par_statut: Record<string, number>;
  total_membres: number;
  femmes_membres: number;
  hommes_membres: number;
  jeunes_membres: number;
}

export const organisationService = {
  getAll: (filters: OrganisationFilters = {}) => 
    api.get<{ data: Organisation[]; total: number; page: number; totalPages: number }>('/organisations', { params: filters }),
  
  getById: (id: number) => api.get<Organisation>(`/organisations/${id}`),
  
  create: (data: Partial<Organisation>) => api.post<Organisation>('/organisations', data),
  
  update: (id: number, data: Partial<Organisation>) => api.put<Organisation>(`/organisations/${id}`, data),
  
  delete: (id: number) => api.delete(`/organisations/${id}`),
  
  getStats: () => api.get<OrganisationStats>('/organisations/stats'),
  
  export: (format: 'pdf' | 'excel') => api.get(`/organisations/export/${format}`, { responseType: 'blob' }),
};

export default organisationService;