// frontend/src/services/aide.service.ts
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

export interface ArticleAide {
  id: number;
  titre: string;
  contenu: string;
  categorie: 'guide' | 'faq' | 'tutoriel' | 'support';
  tags: string[];
  date_creation: string;
  date_modification: string;
  auteur: string;
  lien?: string;
}

export interface FAQ {
  id: number;
  question: string;
  reponse: string;
  categorie: string;
  popularite: number;
}

export interface Tutoriel {
  id: number;
  titre: string;
  description: string;
  duree: string;
  niveau: 'debutant' | 'intermediaire' | 'avance';
  video_url?: string;
  etapes: Array<{ titre: string; description: string }>;
}

export interface ContactSupport {
  email: string;
  telephone: string;
  horaires: string;
  urgence: string;
}

export const aideService = {
  // Guides
  getGuides: () => api.get<ArticleAide[]>('/aide/guides'),
  getGuideById: (id: number) => api.get<ArticleAide>(`/aide/guides/${id}`),
  
  // FAQ
  getFAQ: () => api.get<FAQ[]>('/aide/faq'),
  getFAQByCategorie: (categorie: string) => api.get<FAQ[]>(`/aide/faq/${categorie}`),
  
  // Tutoriels
  getTutoriels: () => api.get<Tutoriel[]>('/aide/tutoriels'),
  getTutorielById: (id: number) => api.get<Tutoriel>(`/aide/tutoriels/${id}`),
  
  // Support
  getContactSupport: () => api.get<ContactSupport>('/aide/support'),
  
  // Envoyer une demande
  envoyerDemande: (data: { sujet: string; message: string; email: string }) =>
    api.post('/aide/demande', data),
  
  // Recherche
  rechercher: (query: string) => api.get('/aide/recherche', { params: { q: query } }),
};

export default aideService;