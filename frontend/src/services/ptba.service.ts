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

export interface PtbaActivite {
  id: number;
  code: string | null;
  activite: string;
  indicateur_realisation: string | null;
  prevu: number | null;
  realise: number | null;
  taux: number | null;
  ecart: number | null;
  commentaire: string | null;
}

export interface PtbaSousComposante {
  sous_composante: string;
  taux_moyen: number | null;
  activites: PtbaActivite[];
}

export interface PtbaComposante {
  composante: string;
  taux_moyen: number | null;
  sous_composantes: PtbaSousComposante[];
}

export interface PtbaSuivi {
  annee: number;
  taux_global: number | null;
  total_activites: number;
  realisees: number;
  en_cours: number;
  non_demarrees: number;
  composantes: PtbaComposante[];
}

export const ptbaService = {
  getSuivi: (annee = 2026) => api.get<PtbaSuivi>('/ptba/suivi', { params: { annee } }),
  updateActivite: (id: number, data: { prevu?: number | null; realise?: number | null; commentaire?: string | null }) =>
    api.put(`/ptba/activites/${id}`, data),
};

export default ptbaService;
