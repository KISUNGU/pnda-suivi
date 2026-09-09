/**
 * Routes : Environnement / Vbg Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  addEnvironnementFormation,
  getEnvironnementFormations,
  getEnvironnementIndicateurs,
  getEnvironnementPlaintes,
  getEnvironnementStats,
  isDatabaseConnectivityError,
  updatePlainte,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== ENVIRONNEMENT / VBG ROUTES ====================

router.get('/api/environnement/indicateurs', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementIndicateurs());
  } catch (error) {
    console.error('GET /api/environnement/indicateurs failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des indicateurs environnementaux' });
  }
});

router.get('/api/environnement/plaintes', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementPlaintes({
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      statut: typeof req.query.statut === 'string' ? req.query.statut : undefined,
      province: scopeProvince(req),
    }));
  } catch (error) {
    console.error('GET /api/environnement/plaintes failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des plaintes' });
  }
});

router.put('/api/environnement/plaintes/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const plainte = await updatePlainte(Number(req.params.id), req.body);
    if (!plainte) {
      return res.status(404).json({ message: 'Plainte non trouvée' });
    }
    return res.json(plainte);
  } catch (error) {
    console.error('PUT /api/environnement/plaintes/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la plainte' });
  }
});

router.get('/api/environnement/formations', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementFormations());
  } catch (error) {
    console.error('GET /api/environnement/formations failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des formations' });
  }
});

router.post('/api/environnement/formations', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const formation = await addEnvironnementFormation(req.body);
    return res.status(201).json(formation);
  } catch (error) {
    console.error('POST /api/environnement/formations failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la création de la formation' });
  }
});

router.get('/api/environnement/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementStats());
  } catch (error) {
    console.error('GET /api/environnement/stats failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques environnement' });
  }
});


export default router;
