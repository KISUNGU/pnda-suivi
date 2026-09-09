// frontend/src/services/grm.service.ts
import axios from 'axios';
import { authService } from './auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface Plainte {
  id: number;
  numero_plainte: string;
  type: 'Technique' | 'Administratif' | 'Financier' | 'VBG' | 'EAS' | 'HS' | 'Environnemental';
  description: string;
  province: string;
  territoire: string;
  village: string;
  beneficiaire_nom?: string;
  beneficiaire_rna?: string;
  date_reception: string;
  date_traitement?: string;
  statut: 'recue' | 'en_cours' | 'referee' | 'traitee' | 'cloturee';
  delai_traite?: number;
  prise_en_charge?: string;
  resolution?: string;
  est_confidentiel: boolean;
}

export interface PlainteFilters {
  search?: string;
  type?: string;
  province?: string;
  statut?: string;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  limit?: number;
}

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${authService.getToken()}` }
});

export const grmService = {
  getAll: (filters: PlainteFilters = {}) =>
    axios.get(`${API_URL}/grm/plaintes`, { 
      params: filters,
      ...getAuthHeaders()
    }),
  
  getById: (id: number) =>
    axios.get(`${API_URL}/grm/plaintes/${id}`, getAuthHeaders()),
  
  create: (data: Partial<Plainte>) =>
    axios.post(`${API_URL}/grm/plaintes`, data, getAuthHeaders()),
  
  update: (id: number, data: Partial<Plainte>) =>
    axios.put(`${API_URL}/grm/plaintes/${id}`, data, getAuthHeaders()),
  
  delete: (id: number) =>
    axios.delete(`${API_URL}/grm/plaintes/${id}`, getAuthHeaders()),
  
  getStats: () =>
    axios.get(`${API_URL}/grm/stats`, getAuthHeaders()),
  
  getServicesPriseEnCharge: () =>
    axios.get(`${API_URL}/grm/services`, getAuthHeaders()),
};

export default grmService;