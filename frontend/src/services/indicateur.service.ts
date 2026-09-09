// frontend/src/services/indicateur.service.ts
import axios from 'axios';

// Configuration de l'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Création de l'instance axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// DÉFINITION DES TYPES
// ============================================

// frontend/src/services/indicateur.service.ts

// frontend/src/services/indicateur.service.ts

export type Indicateur = {
  id: number;
  code: string;
  nom: string;
  description: string;
  formule: string;
  unite: string;
  frequence: 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';
  cible: number;
  valeur_actuelle: number;
  valeur_reference: number;
  progression: number;
  id_composante: number;
  est_iodp: boolean;
  // Valeurs annuelles
  cible_2023: number | null;
  cible_2024: number | null;
  cible_2025: number | null;
  cible_2026: number | null;
  realise_2023: number | null;
  realise_2024: number | null;
  realise_2025: number | null;
  realise_2026: number | null;
  source_donnees: string | null;
  methodologie_collecte: string | null;
  responsable_collecte: string | null;
};

export type DashboardData = {
  iodp1: { current: number; target: number; trend: number };
  iodp2: { current: number; target: number; trend: number };
  iodp3: { current: number; target: number; trend: number };
  evolution: Array<{ month: string; iodp1: number; iodp2: number; iodp3: number }>;
};

export type HistoriqueValeur = {
  periode: string;
  valeur: number;
};

// ============================================
// SERVICES
// ============================================

export const getIODP = () => api.get<Indicateur[]>('/indicateurs/iodp');

export const getIR = () => api.get<Indicateur[]>('/indicateurs/ir');

export const getAllIndicateurs = () => api.get<Indicateur[]>('/indicateurs');

export const getIndicateursByComposante = (composanteId: number) => 
  api.get<Indicateur[]>(`/indicateurs/composante/${composanteId}`);

export const calculerIndicateur = (indicateurId: number, donnees: Record<string, any>) => 
  api.post<{ valeur: number; progression: number }>(`/indicateurs/${indicateurId}/calculer`, donnees);

export const updateValeurIndicateur = (indicateurId: number, valeur: number, periode: string) =>
  api.put<{ message: string; success: boolean }>(`/indicateurs/${indicateurId}/valeur`, { valeur, periode });

export const getHistoriqueIndicateur = (indicateurId: number) =>
  api.get<HistoriqueValeur[]>(`/indicateurs/${indicateurId}/historique`);

export const getDashboardData = () => api.get<DashboardData>('/indicateurs/dashboard');

export const getIndicateurById = (id: number) => api.get<Indicateur>(`/indicateurs/${id}`);

// ============================================
// EXPORT PAR DÉFAUT - OBJET SERVICE
// ============================================

const indicateurService = {
  getIODP,
  getIR,
  getAll: getAllIndicateurs,
  getByComposante: getIndicateursByComposante,
  calculer: calculerIndicateur,
  updateValeur: updateValeurIndicateur,
  getHistorique: getHistoriqueIndicateur,
  getDashboard: getDashboardData,
  getById: getIndicateurById,
};

export default indicateurService;