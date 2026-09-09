// frontend/src/services/agentCollecteur.service.ts
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

export interface AgentCollecteur {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  telephone: string;
  email: string;
  province: string;
  territoire: string;
  zones: string[];
  statut: 'actif' | 'inactif';
  date_affectation: string;
  superviseur: string;
}

export interface CollecteData {
  id: number;
  formulaire_id: string;
  formulaire_nom: string;
  donnees: Record<string, any>;
  latitude: number;
  longitude: number;
  photos: string[];
  date_collecte: string;
  synced: boolean;
  beneficiaire?: {
    nom: string;
    prenom: string;
    rna_id: string;
  };
}

export interface StatistiquesAC {
  total_collectes: number;
  collectes_semaine: number;
  collectes_mois: number;
  formulaires_disponibles: number;
  beneficiaires_couverts: number;
  taux_synchronisation: number;
  dernier_sync: string;
}

export const agentCollecteurService = {
  // Données de l'agent connecté
  getProfil: () => api.get<AgentCollecteur>('/agent/profil'),
  
  // Formulaires disponibles pour l'agent
  getFormulaires: () => api.get<{ id: string; nom: string; version: string }[]>('/agent/formulaires'),
  
  // Collectes de l'agent
  getCollectes: (params?: { page?: number; limit?: number; synced?: boolean }) =>
    api.get<{ data: CollecteData[]; total: number; page: number; totalPages: number }>('/agent/collectes', { params }),
  
  // Bénéficiaires dans sa circonscription
  getBeneficiaires: (params?: { search?: string; page?: number; limit?: number }) =>
    api.get<{ data: any[]; total: number; page: number; totalPages: number }>('/agent/beneficiaires', { params }),
  
  // Statistiques
  getStats: () => api.get<StatistiquesAC>('/agent/stats'),
  
  // Sauvegarder une collecte (hors ligne puis sync)
  sauvegarderCollecte: (data: Partial<CollecteData>) => api.post('/agent/collectes', data),
  
  // Synchroniser les données
  synchroniser: () => api.post('/agent/sync'),
  
  // Exporter les données
  exporter: (format: 'pdf' | 'excel') => api.get(`/agent/export/${format}`, { responseType: 'blob' }),
};

export default agentCollecteurService;