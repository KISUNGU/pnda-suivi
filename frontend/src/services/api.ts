// frontend/src/services/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
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

// Intercepteur de réponse : redirige vers /login si token expiré/invalide
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Types - Export explicites
export interface Beneficiaire {
  id: number;
  rna_id: string;
  nom_complet: string;
  sexe: 'M' | 'F';
  province: string;
  territoire: string;
  secteur: string;
  groupement: string;
  village: string;
  saison: string;
  ptech: string;
  created_at: string;
}

export interface BeneficiaireFilters {
  search?: string;
  province?: string;
  sexe?: 'M' | 'F';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface DashboardData {
  iodp1: { current: number; target: number; trend: number };
  iodp2: { current: number; target: number; trend: number };
  iodp3: { current: number; target: number; trend: number };
  evolution: Array<{ month: string; iodp1: number; iodp2: number; iodp3: number }>;
}

export interface BeneficiairesSummary {
  total: number;
}

// Services bénéficiaires
export const beneficiaireService = {
  getAll: (filters: BeneficiaireFilters = {}): Promise<{ data: PaginatedResponse<Beneficiaire> }> => 
    api.get('/beneficiaires', { params: filters }),
  
  getById: (id: number): Promise<{ data: Beneficiaire }> => 
    api.get(`/beneficiaires/${id}`),
  
  create: (data: Partial<Beneficiaire>): Promise<{ data: Beneficiaire }> => 
    api.post('/beneficiaires', data),
  
  update: (id: number, data: Partial<Beneficiaire>): Promise<{ data: Beneficiaire }> => 
    api.put(`/beneficiaires/${id}`, data),
  
  delete: (id: number): Promise<{ data: { message: string } }> => 
    api.delete(`/beneficiaires/${id}`),
  
  getStats: (): Promise<{ data: { total: number; femmes: number; hommes: number; provinces: number } }> => 
    api.get('/beneficiaires/stats'),
};

// Services indicateurs
export const indicateurService = {
  getAll: () => api.get('/indicateurs'),
  getById: (id: number) => api.get(`/indicateurs/${id}`),
  getValues: (indicateurId: number, params?: { periode?: string; province?: string }) =>
    api.get(`/indicateurs/${indicateurId}/valeurs`, { params }),
  getDashboard: (): Promise<{ data: DashboardData }> => 
    api.get('/indicateurs/dashboard'),
};

export const dashboardService = {
  getBeneficiairesSummary: (): Promise<{ data: BeneficiairesSummary }> =>
    api.get('/dashboard/beneficiaires-summary'),
};

// Export par défaut
export default api;

// ==================== FOURNISSEURS ====================
export interface Fournisseur {
  id: number;
  nom: string;
  sigle?: string;
  type: string;
  province: string;
  territoire: string;
  responsable: string;
  telephone: string;
  email?: string;
  statut: 'Agréé' | 'En cours' | 'Suspendu';
  stock_disponible: number;
  stock_total: number;
  beneficiaires_servis: number;
  montant_contrat: number;
  taux_livraison: number;
  date_contrat: string;
  intrants: string[];
}

export const fournisseurService = {
  getAll: (params: Record<string, unknown> = {}) => api.get<PaginatedResponse<Fournisseur>>('/fournisseurs', { params }),
  getById: (id: number) => api.get<Fournisseur>(`/fournisseurs/${id}`),
  getStats: () => api.get<{ total: number; agrees: number; en_cours: number; suspendus: number }>('/fournisseurs/stats'),
  create: (data: Partial<Fournisseur>) => api.post<Fournisseur>('/fournisseurs', data),
  update: (id: number, data: Partial<Fournisseur>) => api.put<Fournisseur>(`/fournisseurs/${id}`, data),
  delete: (id: number) => api.delete(`/fournisseurs/${id}`),
};

// ==================== ORGANISATIONS ====================
export interface Organisation {
  id: number;
  nom: string;
  nom_complet: string;
  type: string;
  province: string;
  responsable: string;
  telephone: string;
  email?: string;
  role: string;
  beneficiaires_couverts: number;
  budget_alloue: number;
  taux_execution: number;
  statut: string;
  date_creation: string;
}

export const organisationService = {
  getAll: (params: Record<string, unknown> = {}) => api.get<PaginatedResponse<Organisation>>('/organisations', { params }),
  getById: (id: number) => api.get<Organisation>(`/organisations/${id}`),
  getStats: () => api.get<{ total: number; gouvernementaux: number; ong: number; partenaires: number }>('/organisations/stats'),
  create: (data: Partial<Organisation>) => api.post<Organisation>('/organisations', data),
  update: (id: number, data: Partial<Organisation>) => api.put<Organisation>(`/organisations/${id}`, data),
  delete: (id: number) => api.delete(`/organisations/${id}`),
};

// ==================== ACTIVITÉS ====================
export interface Activite {
  id: number;
  code: string;
  titre: string;
  type: string;
  composante: string;
  province: string;
  territoire: string;
  responsable: string;
  beneficiaires_cibles: number;
  beneficiaires_atteints: number;
  budget_prevu: number;
  budget_execute: number;
  statut: 'Planifié' | 'En cours' | 'Terminé' | 'Suspendu';
  date_debut: string;
  date_fin: string;
  taux_execution: number;
  objectifs: string[];
  created_at: string;
}

export interface ActiviteFilters {
  search?: string;
  type?: string;
  composante?: string;
  province?: string;
  statut?: string;
  page?: number;
  limit?: number;
}

export interface ActiviteStats {
  total: number;
  terminees: number;
  en_cours: number;
  planifiees: number;
  budget_total: number;
  budget_execute: number;
  taux_execution_moyen: number;
}

export const activiteService = {
  getAll: (filters: ActiviteFilters = {}) => api.get<PaginatedResponse<Activite>>('/activites', { params: filters }),
  getById: (id: number) => api.get<Activite>(`/activites/${id}`),
  getStats: () => api.get<ActiviteStats>('/activites/stats'),
  create: (data: Partial<Activite>) => api.post<Activite>('/activites', data),
  update: (id: number, data: Partial<Activite>) => api.put<Activite>(`/activites/${id}`, data),
  delete: (id: number) => api.delete(`/activites/${id}`),
};

// ==================== UTILISATEURS ====================
export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  niveau: number;
  province: string | null;
  telephone?: string;
  statut: string;
  derniere_connexion: string | null;
  permissions: string[];
  created_at: string;
}

export const utilisateurService = {
  getAll: (params: Record<string, unknown> = {}) => api.get<{ data: Utilisateur[]; total: number; page: number }>('/utilisateurs', { params }),
  getStats: () => api.get<{ total: number; actifs: number; admins: number; operateurs_terrain: number }>('/utilisateurs/stats'),
  create: (data: Partial<Utilisateur>) => api.post<Utilisateur>('/utilisateurs', data),
  update: (id: number, data: Partial<Utilisateur>) => api.put<Utilisateur>(`/utilisateurs/${id}`, data),
  delete: (id: number) => api.delete(`/utilisateurs/${id}`),
};

// ==================== CALCULATEUR ====================
export interface CalculateurIndicateur {
  id: number;
  code: string;
  nom: string;
  description: string;
  formule: string;
  unite: string;
  frequence: string;
  type: 'iodp' | 'ir';
  composante: string;
  cible: number;
  champs: { id: string; label: string; type: string; required: boolean }[];
}

export interface CalculateurResult {
  valeur: number;
  unite: string;
  progression?: number;
  cible?: number;
  interpretation: string;
  recommandations: string[];
}

export const calculateurApiService = {
  getIndicateurs: () => api.get<CalculateurIndicateur[]>('/calculateur/indicateurs'),
  calculer: (code: string, donnees: Record<string, number>) => api.post<CalculateurResult>(`/calculateur/calculer/${code}`, donnees),
  getHistorique: () => api.get('/calculateur/historique'),
};