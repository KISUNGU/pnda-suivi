// frontend/src/services/ot.service.ts
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

export interface OTData {
  id: string;
  nom: string;
  sigle: string;
  region: string;
  provinces: string[];
  responsable: {
    nom: string;
    email: string;
    telephone: string;
  };
  equipes: {
    total: number;
    superviseurs: number;
    enqueteurs: number;
    techniciens: number;
  };
  performances: {
    taux_realisation: number;
    taux_satisfaction: number;
    qualite_donnees: number;
    ponctualite: number;
  };
  activites: {
    enquetes_realisees: number;
    formations_dispensees: number;
    suivis_effectues: number;
    plaintes_traitees: number;
  };
  indicateurs: {
    production: number;
    adoption: number;
    satisfaction: number;
  };
  objectifs: {
    enquetes: { realises: number; cible: number };
    formations: { realises: number; cible: number };
    suivis: { realises: number; cible: number };
  };
  zones: Array<{
    province: string;
    territoire: string;
    villages: number;
    enquetes: number;
  }>;
  dernier_rapport: string;
  dernier_suivi: string;
}

export interface ActiviteTerrain {
  id: number;
  type: 'enquete' | 'formation' | 'suivi' | 'plainte';
  titre: string;
  description: string;
  date: string;
  province: string;
  territoire: string;
  village: string;
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
  responsable: string;
  participants?: number;
  resultats?: string;
}

export interface Equipier {
  id: number;
  nom: string;
  prenom: string;
  fonction: 'superviseur' | 'enqueteur' | 'technicien';
  telephone: string;
  email: string;
  province: string;
  performance: number;
  enquetes_realisees: number;
  dernier_suivi: string;
  est_actif: boolean;
}

export interface RapportMensuel {
  id: number;
  mois: string;
  annee: number;
  enquetes: number;
  formations: number;
  suivis: number;
  qualite_donnees: number;
  commentaires: string;
  soumis_le: string;
  valide: boolean;
}

export const otService = {
  // Données principales de l'OT
  getOTData: () => api.get<OTData>('/ot/data'),
  
  // Activités terrain
  getActivites: (params?: { statut?: string; province?: string; date_debut?: string; date_fin?: string }) => 
    api.get<ActiviteTerrain[]>('/ot/activites', { params }),
  
  // Équipiers
  getEquipiers: (params?: { fonction?: string; province?: string; actif?: boolean }) => 
    api.get<Equipier[]>('/ot/equipiers', { params }),
  
  // Rapports mensuels
  getRapportsMensuels: () => api.get<RapportMensuel[]>('/ot/rapports'),
  
  // Soumettre un rapport
  soumettreRapport: (data: Partial<RapportMensuel>) => api.post('/ot/rapports', data),
  
  // Mettre à jour une activité
  updateActivite: (id: number, data: Partial<ActiviteTerrain>) => api.put(`/ot/activites/${id}`, data),
  
  // Ajouter une activité
  addActivite: (data: Partial<ActiviteTerrain>) => api.post('/ot/activites', data),
  
  // Exporter données
  exportData: (format: 'pdf' | 'excel') => api.get(`/ot/export/${format}`, { responseType: 'blob' }),
};

export default otService;