// frontend/src/services/provincial.service.ts
import axios from 'axios';
import type { Geometry } from 'geojson';

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

export interface ProvinceData {
  id: string;
  name: string;
  code: string;
  region: string;
  population: number;
  beneficiaires: {
    total: number;
    femmes: number;
    hommes: number;
    jeunes: number;
    cible: number;
  };
  production: {
    maïs: { actuel: number; cible: number; unite: string };
    manioc: { actuel: number; cible: number; unite: string };
    arachide: { actuel: number; cible: number; unite: string };
  };
  infrastructures: {
    routes: { rehabilitees: number; prevues: number; unite: string };
    cler: { fonctionnels: number; total: number };
    marches: { construits: number; prevus: number };
  };
  indicateurs: {
    iodp1: { actuel: number; cible: number; trend: number };
    iodp2: { actuel: number; cible: number; trend: number };
    iodp3: { actuel: number; cible: number; trend: number };
  };
  risques: {
    critiques: number;
    eleves: number;
    moderes: number;
    faibles: number;
  };
  plaintes: {
    total: number;
    traitees: number;
    en_cours: number;
    vbg: number;
  };
  dernier_suivi: string;
  progression?: number;
  performance_score?: number;
  progression_delta?: number;
  coordonnees?: { lat: number; lng: number };
}

export interface ProvinceContour {
  id: string;
  name: string;
  code: string;
  coord_lat: number | null;
  coord_lng: number | null;
  contour_geojson: Geometry | null;
}

export interface PerformanceEvolution {
  mois: string;
  beneficiaires: number;
  production: number;
  routes: number;
}

export interface ClassementProvincial {
  province: string;
  score: number;
  rang: number;
  progression?: number;
}

export const provincialService = {
  // Récupérer toutes les provinces
  getAllProvinces: () => api.get<ProvinceData[]>('/provinces'),
  
  // Récupérer une province par ID
  getProvinceById: (id: string) => api.get<ProvinceData>(`/provinces/${id}`),
  
  // Récupérer les données d'une province
  getProvinceData: (provinceId: string) => api.get(`/provinces/${provinceId}/data`),
  
  // Récupérer l'évolution des performances
  getPerformanceEvolution: (provinceId: string) => api.get<PerformanceEvolution[]>(`/provinces/${provinceId}/evolution`),
  
  // Récupérer le classement des provinces
  getClassement: () => api.get<ClassementProvincial[]>('/provinces/classement'),
  
  // Récupérer les comparaisons
  getComparaison: () => api.get('/provinces/comparaison'),
  
  // Exporter les données provinciales
  exportProvinceData: (provinceId: string) => api.get(`/provinces/${provinceId}/export`, { responseType: 'blob' }),

  // Contours GeoJSON des provinces (SIG)
  getContours: () => api.get<ProvinceContour[]>('/provinces/contours'),

  // Importer le contour officiel d'une province (GeoJSON Polygon/MultiPolygon WGS84)
  putContour: (provinceId: string, geometry: Geometry) =>
    api.put(`/provinces/${provinceId}/contour`, { geometry }),
};

export default provincialService;