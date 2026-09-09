// frontend/src/services/database.service.ts
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

export interface BeneficiaireComplet {
  id: number;
  rna_id: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  date_naissance: string;
  age: number;
  telephone: string;
  email?: string;
  province: string;
  territoire: string;
  commune?: string;
  village: string;
  type_exploitant: 'agriculteur' | 'eleveur' | 'pisciculteur' | 'mixte';
  est_jeune: boolean;
  niveau_instruction?: 'aucun' | 'primaire' | 'secondaire' | 'superieur';
  situation_matrimoniale?: 'celibataire' | 'marie' | 'veuf' | 'divorce';
  nombre_enfants?: number;
  superficie_totale: number;
  superficie_cultivee: number;
  principales_cultures: string[];
  cheptel?: {
    bovins: number;
    caprins: number;
    ovins: number;
    volailles: number;
  };
  technologies_adoptees: string[];
  est_beneficiaire_subvention: boolean;
  date_adhesion: string;
  created_at: string;
  updated_at: string;
}

export interface ActiviteBeneficiaire {
  id: number;
  beneficiaire_id: number;
  type: 'formation' | 'subvention' | 'enquete' | 'visite' | 'plainte';
  titre: string;
  date: string;
  statut: string;
  details: any;
}

export interface StatistiquesBeneficiaires {
  total: number;
  par_sexe: { hommes: number; femmes: number };
  par_type: Record<string, number>;
  par_province: Record<string, number>;
  par_age: { jeunes: number; adultes: number; seniors: number };
  par_instruction: Record<string, number>;
  par_technologies: Record<string, number>;
  evolution_mensuelle: Array<{ mois: string; total: number }>;
}

export const databaseService = {
  // Récupérer tous les bénéficiaires
  getAll: (params?: { page?: number; limit?: number; search?: string; province?: string; type?: string; sexe?: string }) =>
    api.get<{ data: BeneficiaireComplet[]; total: number; page: number; totalPages: number }>('/database/beneficiaires', { params }),
  
  // Récupérer un bénéficiaire par ID
  getById: (id: number) => api.get<BeneficiaireComplet>(`/database/beneficiaires/${id}`),
  
  // Récupérer les activités d'un bénéficiaire
  getActivites: (id: number) => api.get<ActiviteBeneficiaire[]>(`/database/beneficiaires/${id}/activites`),
  
  // Récupérer les statistiques
  getStats: () => api.get<StatistiquesBeneficiaires>('/database/beneficiaires/stats'),
  
  // Exporter les données
  exporter: (format: 'pdf' | 'excel') => api.get(`/database/beneficiaires/export/${format}`, { responseType: 'blob' }),
  
  // Importer des données
  importer: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/database/beneficiaires/import', formData);
  },
};

export default databaseService;