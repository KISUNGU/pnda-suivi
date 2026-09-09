// frontend/src/services/beneficiaire.service.ts

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

export interface BeneficiaireFilters {
  saison?: string;
  province?: string;
  territoire?: string;
  secteur?: string;
  groupement?: string;
  village?: string;
  ptech?: string;
}

export interface AdvancedStats {
  stats: {
    total_producteurs: number;
    total_femmes: number;
    age_moyen: number;
    chefs_menage: number;
    membres_deja_enregistres: number;
  };
  age_distribution: Array<{ tranche_age: string; nombre: number }>;
  matrimonial_distribution: Array<{ situation: string; nombre: number }>;
  education_distribution: Array<{ niveau: string; nombre: number }>;
  activite_distribution: Array<{ type_activite: string; nombre: number }>;
  superficie_distribution: Array<{ tranche_superficie: string; nombre: number }>;
  top_cultures: Array<{ nom: string; nombre: number }>;
}

export interface PtechStats {
  ptech_distribution: Array<{ ptech: string; nombre_producteurs: number; provinces_concernees: number }>;
  ptech_by_province: Array<{ province: string; ptech: string; nombre: number }>;
  total_ptech_selectionnes: number;
}

export interface CartesVentesStats {
  widgets: {
    producteurs_avec_ptech: number;
    ont_recu_carte: number;
    ont_achete_semences: number;
    fournisseurs_actifs: number;
    kg_semences_vendues: number;
  };
  distribution_cartes_par_province: Array<{
    province: string;
    total_producteurs: number;
    cartes_distribuees: number;
    cartes_attente: number;
    cartes_imprimer: number;
  }>;
  ventes_semences_par_province: Array<{
    province: string;
    producteurs_acheteurs: number;
    total_kg: number;
    total_usd: number;
    total_cdf: number;
  }>;
  suivi_par_village: Array<{
    village: string;
    total_producteurs: number;
    ont_recu_carte: number;
    ont_achete_semences: number;
  }>;
  ventes_par_fournisseur: Array<{
    fournisseur: string;
    total_kg: number;
    total_cdf: number;
  }>;
}

export interface FilterOptions {
  saisons: Array<{ saison: string }>;
  provinces: Array<{ province: string }>;
  territoires: Array<{ territoire: string; province: string }>;
  secteurs: Array<{ secteur: string; province: string; territoire: string }>;
  groupements: Array<{ groupement: string; province: string; territoire: string; secteur: string }>;
  villages: Array<{ village: string; province: string; territoire: string; secteur: string; groupement: string }>;
  ptechs: Array<{ ptech: string }>;
}

export const beneficiaireService = {
  getAdvancedStats: (filters: BeneficiaireFilters) =>
    api.get<AdvancedStats>('/beneficiaires/advanced-stats', { params: filters }),
  
  getPtechStats: (filters: BeneficiaireFilters) =>
    api.get<PtechStats>('/beneficiaires/ptech-stats', { params: filters }),
  
  getCartesVentesStats: (filters: BeneficiaireFilters) =>
    api.get<CartesVentesStats>('/beneficiaires/cartes-ventes-stats', { params: filters }),
  
  getFilterOptions: () =>
    api.get<FilterOptions>('/beneficiaires/filters'),

    exportStats: (format: 'excel' | 'pdf', filters: BeneficiaireFilters) =>
    api.get(`/beneficiaires/export/${format}`, { 
      params: filters,
      responseType: 'blob' 
    }),
  
  // Export des données détaillées
  exportBeneficiaires: (format: 'excel' | 'pdf', filters: BeneficiaireFilters) =>
    api.get(`/beneficiaires/export-beneficiaires/${format}`, { 
      params: filters,
      responseType: 'blob' 
    }),
};

export default beneficiaireService;