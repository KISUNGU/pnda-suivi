// frontend/src/services/risque.service.ts
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

export interface Risque {
  id: number;
  code: string;
  nom: string;
  description: string;
  categorie: 'gestion' | 'technique' | 'politique' | 'socio_economique' | 'environnemental' | 'sante_securite';
  probabilite: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  niveau: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  statut: 'identifie' | 'en_cours' | 'atténue' | 'cloture';
  plan_atténuation: string;
  responsable: string;
  date_identification: string;
  date_cloture?: string;
  province?: string;
  actions_prevues?: string[];
  indicateurs_surveillance?: string[];
  dernier_suivi?: string;
}

export interface ActionAtténuation {
  id: number;
  id_risque: number;
  action: string;
  responsable: string;
  date_debut: string;
  date_fin: string;
  statut: 'prevue' | 'en_cours' | 'realisee' | 'abandonnee';
  resultat?: string;
}

export interface AlerteRisque {
  id: number;
  id_risque: number;
  message: string;
  date_alerte: string;
  est_lue: boolean;
  niveau: 'info' | 'warning' | 'danger';
}

export const risqueService = {
  getAll: () => api.get<Risque[]>('/risques'),
  getById: (id: number) => api.get<Risque>(`/risques/${id}`),
  create: (data: Partial<Risque>) => api.post<Risque>('/risques', data),
  update: (id: number, data: Partial<Risque>) => api.put<Risque>(`/risques/${id}`, data),
  delete: (id: number) => api.delete(`/risques/${id}`),
  getStats: () => api.get('/risques/stats'),
  getActions: (id: number) => api.get<ActionAtténuation[]>(`/risques/${id}/actions`),
  addAction: (id: number, action: Partial<ActionAtténuation>) => 
    api.post<ActionAtténuation>(`/risques/${id}/actions`, action),
  updateAction: (risqueId: number, actionId: number, data: Partial<ActionAtténuation>) =>
    api.put(`/risques/${risqueId}/actions/${actionId}`, data),
  getAlertes: () => api.get<AlerteRisque[]>('/risques/alertes'),
  marquerAlerteLue: (id: number) => api.put(`/risques/alertes/${id}/lue`),
};

export default risqueService;