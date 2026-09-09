// frontend/src/services/configuration.service.ts
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

export interface ConfigurationGenerale {
  nomProjet: string;
  sigle: string;
  anneeDebut: string;
  anneeFin: string;
  devise: string;
  langueInterface: string;
  fuseau: string;
  budgetTotal: number;
  tauxChangeUSD: number;
}

export interface ConfigurationAlertes {
  seuilRisqueFaible: number;
  seuilRisqueMoyen: number;
  seuilRisqueEleve: number;
  emailNotifications: boolean;
  seuilTauxRealisation: number;
  alertesBudget: boolean;
  alertesEcheances: boolean;
  delaiRappelJours: number;
}

export interface ConfigurationIntegration {
  apiBackendUrl: string;
  timeoutRequetes: number;
  modehorsLigne: boolean;
  syncAutoActivee: boolean;
  intervalSyncMinutes: number;
  powerbiWorkspaceId: string;
  powerbiReportId: string;
}

export interface Configuration {
  generale: ConfigurationGenerale;
  alertes: ConfigurationAlertes;
  integration: ConfigurationIntegration;
  provincesActives: string[];
}

export const configurationService = {
  getConfiguration: () => api.get<Configuration>('/configuration'),

  updateSection: (section: 'generale' | 'alertes' | 'integration' | 'provincesActives', valeur: unknown) =>
    api.put(`/configuration/${section}`, valeur),
};

export default configurationService;
