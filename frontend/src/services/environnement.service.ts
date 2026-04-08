// frontend/src/services/environnement.service.ts
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

export interface IndicateurEnvironnemental {
  id: number;
  code: string;
  nom: string;
  description: string;
  categorie: 'environnement' | 'vbg' | 'eas' | 'hs';
  unite: string;
  valeur_actuelle: number;
  valeur_cible: number;
  progression: number;
  tendance: 'hausse' | 'baisse' | 'stable';
  periode: string;
  observations?: string;
}

export interface PlainteSensible {
  id: number;
  numero: string;
  type: 'VBG' | 'EAS' | 'HS';
  description: string;
  date_reception: string;
  statut: 'recue' | 'en_cours' | 'referee' | 'traitee' | 'cloturee';
  delai_traitement: number;
  province: string;
  territoire: string;
  est_confidentiel: boolean;
  prise_en_charge?: string;
  resolution?: string;
}

export interface FormationSensibilisation {
  id: number;
  titre: string;
  type: 'formation' | 'sensibilisation';
  date: string;
  lieu: string;
  participants: number;
  participants_femmes: number;
  participants_hommes: number;
  province: string;
  formateur: string;
  evaluation?: number;
}

export interface StatsEnvironnement {
  entreprises_conformes: number;
  total_entreprises: number;
  taux_conformite: number;
  eies_realisees: number;
  eies_prevues: number;
  personnes_formees: number;
  personnes_sensibilisees: number;
  plaintes_vbg: number;
  plaintes_eas: number;
  plaintes_hs: number;
  plaintes_traitees: number;
  delai_moyen_traitement: number;
  code_conduite_signes: number;
  total_personnel: number;
}

export const environnementService = {
  // Indicateurs environnementaux
  getIndicateurs: () => api.get<IndicateurEnvironnemental[]>('/environnement/indicateurs'),
  
  // Plaintes sensibles
  getPlaintes: (params?: { type?: string; statut?: string; province?: string }) =>
    api.get<PlainteSensible[]>('/environnement/plaintes', { params }),
  
  // Formations et sensibilisations
  getFormations: () => api.get<FormationSensibilisation[]>('/environnement/formations'),
  
  // Statistiques
  getStats: () => api.get<StatsEnvironnement>('/environnement/stats'),
  
  // Mettre à jour une plainte
  updatePlainte: (id: number, data: Partial<PlainteSensible>) => 
    api.put(`/environnement/plaintes/${id}`, data),
  
  // Ajouter une formation
  addFormation: (data: Partial<FormationSensibilisation>) => 
    api.post('/environnement/formations', data),
  
  // Exporter les données
  exporter: (format: 'pdf' | 'excel') => 
    api.get(`/environnement/export/${format}`, { responseType: 'blob' }),
};

export default environnementService;