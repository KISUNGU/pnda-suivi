// frontend/src/services/suiviActivites.service.ts
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

export interface ActiviteSuivi {
  id: number;
  code: string;
  titre: string;
  description: string;
  type: 'enquete' | 'formation' | 'distribution' | 'reunion' | 'visite' | 'suivi_technique' | 'autre';
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'reportee' | 'annulee';
  priorite: 'haute' | 'moyenne' | 'basse';
  date_debut: string;
  date_fin: string;
  lieu: string;
  province: string;
  territoire: string;
  responsable: string;
  equipe: string[];
  participants_prevus: number;
  participants_reels?: number;
  objectifs: string[];
  resultats_attendus: string[];
  resultats_obtenus?: string;
  difficultes?: string;
  photos?: string[];
  documents?: { nom: string; url: string }[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ActiviteFilters {
  search?: string;
  type?: string;
  statut?: string;
  province?: string;
  responsable?: string;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  limit?: number;
}

export interface ActiviteStats {
  total: number;
  par_type: Record<string, number>;
  par_statut: Record<string, number>;
  par_province: Record<string, number>;
  par_mois: Array<{ mois: string; total: number }>;
  taux_realisation: number;
  participants_total: number;
}

interface BackendActiviteSuivi extends Omit<ActiviteSuivi, 'type'> {
  type: 'enquete' | 'formation' | 'distribution' | 'reunion' | 'visite' | 'suivi' | 'autre';
}

interface BackendActiviteStats extends Omit<ActiviteStats, 'par_type'> {
  par_type: Record<string, number>;
}

const mapApiTypeToUi = (type: BackendActiviteSuivi['type']): ActiviteSuivi['type'] => {
  if (type === 'suivi') {
    return 'suivi_technique';
  }

  return type;
};

const mapUiTypeToApi = (type: string | undefined): BackendActiviteSuivi['type'] | undefined => {
  if (!type) {
    return undefined;
  }

  if (type === 'suivi_technique') {
    return 'suivi';
  }

  return type as BackendActiviteSuivi['type'];
};

const normalizeActivite = (activite: BackendActiviteSuivi): ActiviteSuivi => ({
  ...activite,
  type: mapApiTypeToUi(activite.type),
  description: activite.description ?? '',
  lieu: activite.lieu ?? '',
  province: activite.province ?? '',
  territoire: activite.territoire ?? '',
  responsable: activite.responsable ?? '',
  equipe: Array.isArray(activite.equipe) ? activite.equipe : [],
  objectifs: Array.isArray(activite.objectifs) ? activite.objectifs : [],
  resultats_attendus: Array.isArray(activite.resultats_attendus) ? activite.resultats_attendus : [],
  photos: Array.isArray(activite.photos) ? activite.photos : [],
  documents: Array.isArray(activite.documents) ? activite.documents : [],
  created_by: activite.created_by ?? 'SYSTEM',
  participants_prevus: Number(activite.participants_prevus ?? 0),
  participants_reels: activite.participants_reels !== undefined ? Number(activite.participants_reels) : undefined,
});

const normalizeStats = (stats: BackendActiviteStats): ActiviteStats => {
  const parType = { ...stats.par_type };
  const parStatut = {
    planifiee: Number(stats.par_statut?.planifiee ?? 0),
    en_cours: Number(stats.par_statut?.en_cours ?? 0),
    terminee: Number(stats.par_statut?.terminee ?? 0),
    reportee: Number(stats.par_statut?.reportee ?? 0),
    annulee: Number(stats.par_statut?.annulee ?? 0),
    ...stats.par_statut,
  };
  const parProvince = Object.fromEntries(
    Object.entries(stats.par_province ?? {}).map(([key, value]) => [key, Number(value ?? 0)])
  );

  if (parType.suivi !== undefined) {
    parType.suivi_technique = (parType.suivi_technique ?? 0) + Number(parType.suivi);
    delete parType.suivi;
  }

  return {
    ...stats,
    par_type: parType,
    par_statut: parStatut,
    par_province: parProvince,
    total: Number(stats.total ?? 0),
    taux_realisation: Number(stats.taux_realisation ?? 0),
    participants_total: Number(stats.participants_total ?? 0),
    par_mois: Array.isArray(stats.par_mois)
      ? stats.par_mois.map((item) => ({ mois: item.mois, total: Number(item.total ?? 0) }))
      : [],
  };
};

const mapFiltersToApi = (filters: ActiviteFilters): ActiviteFilters => ({
  ...filters,
  type: mapUiTypeToApi(filters.type),
});

const mapPayloadToApi = (data: Partial<ActiviteSuivi>): Partial<BackendActiviteSuivi> => ({
  ...data,
  type: mapUiTypeToApi(data.type),
});

export const suiviActivitesService = {
  getAll: (filters: ActiviteFilters = {}) =>
    api
      .get<{ data: BackendActiviteSuivi[]; total: number; page: number; totalPages: number }>('/activites', { params: mapFiltersToApi(filters) })
      .then((response) => ({
        ...response,
        data: {
          ...response.data,
          data: response.data.data.map(normalizeActivite),
        },
      })),
  
  getById: (id: number) =>
    api.get<BackendActiviteSuivi>(`/activites/${id}`).then((response) => ({
      ...response,
      data: normalizeActivite(response.data),
    })),
  
  create: (data: Partial<ActiviteSuivi>) =>
    api.post<BackendActiviteSuivi>('/activites', mapPayloadToApi(data)).then((response) => ({
      ...response,
      data: normalizeActivite(response.data),
    })),
  
  update: (id: number, data: Partial<ActiviteSuivi>) =>
    api.put<BackendActiviteSuivi>(`/activites/${id}`, mapPayloadToApi(data)).then((response) => ({
      ...response,
      data: normalizeActivite(response.data),
    })),
  
  delete: (id: number) => api.delete(`/activites/${id}`),
  
  getStats: () =>
    api.get<BackendActiviteStats>('/activites/stats').then((response) => ({
      ...response,
      data: normalizeStats(response.data),
    })),
  
  exporter: (format: 'pdf' | 'excel') => api.get(`/activites/export/${format}`, { responseType: 'blob' }),
  
  importer: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/activites/import', formData);
  },
};

export default suiviActivitesService;