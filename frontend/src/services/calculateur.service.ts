// frontend/src/services/calculateur.service.ts
import { api } from './api';

export interface IndicateurDefinition {
  id: number;
  code: string;
  nom: string;
  description: string;
  formule: string;
  unite: string;
  frequence: string;
  type: 'iodp' | 'ir';
  composante: string;
  cible?: number | null;
  champs: Array<{
    id: string;
    label: string;
    type: 'number' | 'date' | 'select';
    required: boolean;
    options?: Array<{ value: string; label: string }>;
  }>;
}

export interface CalculResult {
  valeur: number;
  unite: string;
  progression?: number;
  cible?: number;
  interpretation: string;
  recommandations?: string[];
}

export interface HistoriqueCalculEntry {
  id: number;
  indicateur_code: string;
  indicateur_nom: string;
  valeur: number;
  unite: string;
  interpretation: string;
  date: string;
}

export const calculateurService = {
  // Récupérer tous les indicateurs disponibles
  getIndicateurs: () => api.get<IndicateurDefinition[]>('/calculateur/indicateurs'),
  
  // Récupérer un indicateur par son code
  getIndicateurByCode: (code: string) => api.get<IndicateurDefinition>(`/calculateur/indicateurs/${code}`),
  
  // Calculer un indicateur
  calculer: (code: string, donnees: Record<string, any>) => 
    api.post<CalculResult>(`/calculateur/calculer/${code}`, donnees),
  
  // Récupérer l'historique des calculs
  getHistorique: () => api.get<HistoriqueCalculEntry[]>('/calculateur/historique'),
  
  // Sauvegarder un calcul
  sauvegarderCalcul: (code: string, donnees: Record<string, any>, resultat: CalculResult) =>
    api.post('/calculateur/sauvegarder', { code, donnees, resultat }),
  
  // Exporter les calculs
  exporter: (format: 'pdf' | 'excel') => api.get(`/calculateur/export/${format}`, { responseType: 'blob' }),
};

export default calculateurService;