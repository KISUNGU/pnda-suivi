// frontend/src/services/powerbi.service.ts
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

export interface PowerBIReport {
  id: string;
  name: string;
  description: string;
  embedUrl: string;      // ← attention: camelCase
  reportId: string;      // ← attention: camelCase (pas report_id)
  datasetId: string;     // ← attention: camelCase
  category: 'dashboard' | 'indicateurs' | 'beneficiaires' | 'risques' | 'grm';
  thumbnailUrl?: string;
  updated_at: string;
}

export interface PowerBIDashboard {
  id: string;
  name: string;
  description: string;
  embedUrl: string;
  dashboardId: string;
  category: string;
  created_at: string;
}

export interface EmbedConfig {
  reportId: string;
  reportName: string;
  embedUrl: string;
  token: string;
  expiration: string;
}

export const powerbiService = {
  // Récupérer tous les rapports disponibles
  getReports: () => api.get<PowerBIReport[]>('/powerbi/reports'),
  
  // Récupérer un rapport par ID
  getReport: (id: string) => api.get<PowerBIReport>(`/powerbi/reports/${id}`),
  
  // Récupérer les rapports par catégorie
  getReportsByCategory: (category: string) => api.get<PowerBIReport[]>(`/powerbi/reports/category/${category}`),
  
  // Obtenir la configuration d'embed pour un rapport
  getEmbedConfig: (reportId: string) => api.get<EmbedConfig>(`/powerbi/embed/${reportId}`),
  
  // Récupérer les dashboards
  getDashboards: () => api.get<PowerBIDashboard[]>('/powerbi/dashboards'),
  
  // Récupérer un dashboard par ID
  getDashboard: (id: string) => api.get<PowerBIDashboard>(`/powerbi/dashboards/${id}`),
  
  // Générer un token d'embed
  generateToken: (reportId: string) => api.post<{ token: string; expiration: string }>(`/powerbi/token/${reportId}`),
  
  // Exporter un rapport en PDF
  exportToPDF: (reportId: string, format?: 'A4' | 'Letter') => 
    api.post(`/powerbi/export/${reportId}`, { format }, { responseType: 'blob' }),
  
  // Exporter en PowerPoint
  exportToPPT: (reportId: string) => 
    api.post(`/powerbi/export/${reportId}/ppt`, {}, { responseType: 'blob' }),
  
  // Rafraîchir les données du rapport
  refreshDataset: (datasetId: string) => api.post(`/powerbi/refresh/${datasetId}`),
};

export default powerbiService;