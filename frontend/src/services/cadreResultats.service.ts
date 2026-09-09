import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface AnneeCadre {
  prevu: number | null;
  realise: number | null;
}

export interface IndicateurCadre {
  id: number;
  code: string;
  /** Libellé court du classeur v6 reformulé (21/08/2026). */
  libelle_court?: string;
  nom: string;
  composante: string;
  sous_composante: string;
  est_odp: boolean;
  reference: string;
  unite: string;
  frequence: string;
  source_donnees: string;
  methodologie_collecte?: string | null;
  responsable: string;
  /** Métadonnées des fiches d'opérationnalisation (classeur Cadre_des_resultats_PNDA.xlsx). */
  description?: string | null;
  groupes_cibles?: string | null;
  objectif?: string | null;
  justification?: string | null;
  hypothese_critique?: string | null;
  desagrege_par?: string | null;
  elements_calcul?: string | null;
  formule_mathematique?: string | null;
  niveau_validation?: string | null;
  outils_mesure?: string | null;
  commentaires?: string | null;
  annees: {
    '2023': AnneeCadre;
    '2024': AnneeCadre;
    '2025': AnneeCadre;
    '2026': AnneeCadre;
    '2027': AnneeCadre;
  };
  final_prevu: number | null;
  final_realise?: number | null;
}

export interface CadreStats {
  total: number;
  odp_count: number;
  avec_donnees_2025: number;
  en_retard: number;
  en_cours: number;
  atteint: number;
  moyenne_performance: number;
  composantes: { nom: string; count: number }[];
}

export interface CibleProvinciale {
  code_cadre: string;
  province: string;
  annee: number;
  cible: number;
}

export const cadreResultatsService = {
  getAll: (params?: { composante?: string; odp?: boolean }) =>
    api.get<IndicateurCadre[]>('/cadre-resultats', { params }),
  getStats: () => api.get<CadreStats>('/cadre-resultats/stats'),
  /** Cibles annuelles par province (fiches d'opérationnalisation du Cadre v6). */
  getCiblesProvinciales: () =>
    api.get<Record<string, CibleProvinciale[]>>('/cadre-resultats/cibles-provinciales'),
};

export default cadreResultatsService;
