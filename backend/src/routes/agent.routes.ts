/**
 * Routes : Agent Collecteur Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createAgentCollecte,
  getAgentBeneficiaires,
  getAgentCollectes,
  getAgentFormulaires,
  getAgentProfil,
  getAgentStats,
  isDatabaseConnectivityError,
  syncAgentCollectes,
} from '../db';
import {
  authenticateToken,
  getRequestUser,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth';

const router = Router();

// ==================== AGENT COLLECTEUR ROUTES ====================

router.get('/api/agent/profil', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const profil = await getAgentProfil(user.id);
    if (!profil) {
      return res.status(404).json({ message: 'Profil agent introuvable' });
    }
    return res.json(profil);
  } catch (error) {
    console.error('GET /api/agent/profil failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement du profil agent' });
  }
});

router.get('/api/agent/formulaires', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getAgentFormulaires());
  } catch (error) {
    console.error('GET /api/agent/formulaires failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des formulaires' });
  }
});

router.get('/api/agent/collectes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const synced = typeof req.query.synced === 'string' ? req.query.synced === 'true' : undefined;
    return res.json(await getAgentCollectes(user.id, {
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
      synced,
    }));
  } catch (error) {
    console.error('GET /api/agent/collectes failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des collectes' });
  }
});

router.post('/api/agent/collectes', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const collecte = await createAgentCollecte(user.id, req.body);
    return res.status(201).json(collecte);
  } catch (error) {
    console.error('POST /api/agent/collectes failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la collecte' });
  }
});

router.get('/api/agent/beneficiaires', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.json(await getAgentBeneficiaires({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    }));
  } catch (error) {
    console.error('GET /api/agent/beneficiaires failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des bénéficiaires' });
  }
});

router.get('/api/agent/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    return res.json(await getAgentStats(user.id));
  } catch (error) {
    console.error('GET /api/agent/stats failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques agent' });
  }
});

router.post('/api/agent/sync', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const synced = await syncAgentCollectes(user.id);
    return res.json({ synced });
  } catch (error) {
    console.error('POST /api/agent/sync failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la synchronisation' });
  }
});


export default router;
