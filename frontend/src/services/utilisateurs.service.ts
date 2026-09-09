// frontend/src/services/utilisateurs.service.ts
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

export interface Utilisateur {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'uncp' | 'upep' | 'ot' | 'partenaire' | 'invite';
  role_label: string;
  province?: string;
  telephone?: string;
  statut: 'actif' | 'inactif' | 'suspendu';
  derniere_connexion?: string;
  date_creation: string;
  created_by?: string;
  permissions: string[];
}

export interface Role {
  id: string;
  nom: string;
  description: string;
  permissions: string[];
  niveau: number;
}

export interface Permission {
  id: string;
  nom: string;
  module: string;
  description: string;
}

export interface UtilisateurFilters {
  search?: string;
  role?: string;
  statut?: string;
  province?: string;
  page?: number;
  limit?: number;
}

export interface UtilisateurStats {
  total: number;
  par_role: Record<string, number>;
  par_statut: Record<string, number>;
  par_province: Record<string, number>;
  actifs_30j: number;
  nouveaux_mois: number;
}

export const utilisateursService = {
  // Récupérer tous les utilisateurs
  getAll: (filters: UtilisateurFilters = {}) =>
    api.get<{ data: Utilisateur[]; total: number; page: number; totalPages: number }>('/utilisateurs', { params: filters }),
  
  // Récupérer un utilisateur par ID
  getById: (id: number) => api.get<Utilisateur>(`/utilisateurs/${id}`),
  
  // Créer un utilisateur
  create: (data: Partial<Utilisateur>) => api.post<Utilisateur>('/utilisateurs', data),
  
  // Mettre à jour un utilisateur
  update: (id: number, data: Partial<Utilisateur>) => api.put<Utilisateur>(`/utilisateurs/${id}`, data),
  
  // Supprimer un utilisateur
  delete: (id: number) => api.delete(`/utilisateurs/${id}`),
  
  // Réinitialiser le mot de passe
  resetPassword: (id: number) => api.post(`/utilisateurs/${id}/reset-password`),
  
  // Activer/désactiver un utilisateur
  toggleStatut: (id: number, statut: 'actif' | 'inactif' | 'suspendu') => 
    api.patch(`/utilisateurs/${id}/statut`, { statut }),
  
  // Récupérer les rôles disponibles
  getRoles: () => api.get<Role[]>('/utilisateurs/roles'),
  
  // Récupérer les permissions
  getPermissions: () => api.get<Permission[]>('/utilisateurs/permissions'),
  
  // Récupérer les statistiques
  getStats: () => api.get<UtilisateurStats>('/utilisateurs/stats'),
  
  // Exporter les utilisateurs
  exporter: (format: 'pdf' | 'excel') => api.get(`/utilisateurs/export/${format}`, { responseType: 'blob' }),
};

export default utilisateursService;