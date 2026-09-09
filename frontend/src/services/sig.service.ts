// frontend/src/services/sig.service.ts
// Client des API géospatiales du backend : synthèse SIG, sites géolocalisés
// du projet et densité RNA par territoire.
import axios from 'axios';
import type { Geometry } from 'geojson';

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

export type SigSiteType = 'bureau' | 'perimetre' | 'route' | 'marche' | 'cler' | 'entrepot' | 'autre';

export interface SigSite {
  id: number;
  nom: string;
  type: SigSiteType | string;
  province: string;
  territoire: string;
  lat: number;
  lng: number;
  statut: string;
  details: Record<string, unknown>;
  created_at: string | null;
}

export interface SigSiteInput {
  nom: string;
  type: string;
  province: string;
  territoire?: string;
  lat: number;
  lng: number;
  statut?: string;
  details?: Record<string, unknown>;
}

export interface SigTerritoireDensite {
  province: string;
  territoire: string;
  beneficiaires: number;
  femmes: number;
  villages: number;
}

export interface SigOverview {
  sites_total: number;
  sites_par_type: Record<string, number>;
  provinces_couvertes: number;
  territoires_couverts: number;
  villages_couverts: number;
}

export const sigService = {
  /** Synthèse SIG : sites du projet + couverture géographique du RNA. */
  getOverview: () => api.get<SigOverview>('/sig/overview'),
  /** Sites géolocalisés (bureaux, périmètres, routes, marchés, CLER, entrepôts…). */
  getSites: (params?: { province?: string; type?: string }) =>
    api.get<SigSite[]>('/sig/sites', { params }),
  createSite: (site: SigSiteInput) => api.post<SigSite>('/sig/sites', site),
  deleteSite: (id: number) => api.delete(`/sig/sites/${id}`),
  /** Densité de bénéficiaires RNA par territoire. */
  getTerritoires: (province?: string) =>
    api.get<SigTerritoireDensite[]>('/sig/territoires', { params: province ? { province } : undefined }),
  /** Import du contour officiel d'une province (GeoJSON Polygon/MultiPolygon WGS84). */
  putContour: (provinceId: string, geometry: Geometry) =>
    api.put(`/provinces/${provinceId}/contour`, { geometry }),
};

export default sigService;
