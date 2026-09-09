/**
 * Routes : Cadre Des Résultats
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getCadreCiblesProvinciales,
  getCadreResultats,
  getCadreResultatsStats,
  isDatabaseConnectivityError,
} from '../db';
import {
  authenticateToken,
} from '../middleware/auth';

const router = Router();

// ==================== CADRE DES RÉSULTATS ====================

router.get('/api/cadre-resultats', authenticateToken, async (req, res) => {
  try {
    const composante = typeof req.query.composante === 'string' ? req.query.composante : undefined;
    const odp = req.query.odp === 'true' ? true : req.query.odp === 'false' ? false : undefined;
    const data = await getCadreResultats({ composante, odp });

    res.json(data);
  } catch (error) {
    console.error('GET /api/cadre-resultats failed', error);

    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';

    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }

    return res.status(500).json({ message: 'Impossible de recuperer le cadre des resultats' });
  }
});

router.get('/api/cadre-resultats/stats', authenticateToken, async (_req, res) => {
  try {
    const stats = await getCadreResultatsStats('2025');
    res.json(stats);
  } catch (error) {
    console.error('GET /api/cadre-resultats/stats failed', error);

    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';

    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }

    return res.status(500).json({ message: 'Impossible de calculer les statistiques du cadre des resultats' });
  }
});

/**
 * Cibles annuelles par province (fiches d'operationnalisation du Cadre v6).
 * Reponse : { "ODP-1": [{ province, annee, cible }, ...], ... }
 */
router.get('/api/cadre-resultats/cibles-provinciales', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getCadreCiblesProvinciales());
  } catch (error) {
    console.error('GET /api/cadre-resultats/cibles-provinciales failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Impossible de recuperer les cibles provinciales' });
  }
});

// backend/src/app.ts - Ajouter après les routes risques


export default router;
