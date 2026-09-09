// frontend/src/services/planAttenuation.service.ts

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

export interface PlanAtténuationRisque {
  id: number;
  code: string;
  nom: string;
  description: string;
  categorie: string;
  probabilite: number;
  impact: number;
  niveau: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  statut: string;
  plan_attenuation: string;
  responsable: string;
  date_identification: string;
  province: string;
  actions_prevues: string[];
  indicateurs_surveillance: string[];
  dernier_suivi: string;
  actions: ActionAtténuation[];
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

export interface PlanStats {
  total: number;
  realisees: number;
  en_cours: number;
  prevues: number;
  abandonnees: number;
  risques_avec_plan: number;
}

export const planAttenuationService = {
  getAll: () => api.get<PlanAtténuationRisque[]>('/plans-attenuation'),
  
  getStats: () => api.get<PlanStats>('/plans-attenuation/stats'),
  
  updatePlan: (id: number, data: { plan_attenuation?: string; actions_prevues?: string[]; indicateurs_surveillance?: string[] }) =>
    api.put(`/plans-attenuation/${id}`, data),
  
  addAction: (risqueId: number, data: Partial<ActionAtténuation>) =>
    api.post<ActionAtténuation>(`/plans-attenuation/${risqueId}/actions`, data),
  
  updateAction: (actionId: number, data: Partial<ActionAtténuation>) =>
    api.put(`/plans-attenuation/actions/${actionId}`, data),
  
  deleteAction: (actionId: number) =>
    api.delete(`/plans-attenuation/actions/${actionId}`),
};

export default planAttenuationService;