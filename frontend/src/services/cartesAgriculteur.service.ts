// frontend/src/services/cartesAgriculteur.service.ts

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

export type StatutCarte = 'distribuee' | 'en_attente' | 'a_imprimer';

export interface CarteAgriculteur {
  id: number;
  rna_id: string;
  nom_complet: string;
  sexe: 'M' | 'F';
  province: string;
  territoire: string;
  secteur?: string;
  groupement?: string;
  village?: string;
  producteur_enregistre: boolean;
  statut_carte: StatutCarte;
  numero_carte?: string;
  date_distribution?: string;
  agent_distribution?: string;
  observations?: string;
}

export interface CarteAgriculteurFilters {
  search?: string;
  province?: string;
  statut?: StatutCarte;
  page?: number;
  limit?: number;
}

export interface CarteAgriculteurStats {
  total: number;
  producteurs_enregistres: number;
  distribuees: number;
  en_attente: number;
  a_imprimer: number;
  provinces: number;
}

export interface CarteAgriculteurResponse {
  data: CarteAgriculteur[];
  total: number;
  page: number;
  totalPages: number;
}

export const cartesAgriculteurService = {
  getAll: (filters?: CarteAgriculteurFilters) =>
    api.get<CarteAgriculteurResponse>('/cartes-agriculteurs', { params: filters }),
  
  getStats: (filters?: { search?: string; province?: string; statut?: StatutCarte }) =>
    api.get<CarteAgriculteurStats>('/cartes-agriculteurs/stats', { params: filters }),
  
  update: (id: number, data: Partial<CarteAgriculteur>) =>
    api.put(`/cartes-agriculteurs/${id}`, data),
  
  exporter: (format: 'excel' | 'pdf', filters?: { search?: string; province?: string; statut?: StatutCarte }) =>
    api.get(`/cartes-agriculteurs/export/${format}`, { 
      params: filters,
      responseType: 'blob' 
    }),
};

export default cartesAgriculteurService;