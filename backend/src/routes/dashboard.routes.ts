/**
 * Routes : Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getAgriculteursDashboardOverview,
  getAgriculteursSummary,
  isDatabaseConnectivityError,
} from '../db';
import {
  authenticateToken,
} from '../middleware/auth';

const router = Router();

// ==================== ROUTES ====================

// Health check
router.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date(), message: 'API PNDA opérationnelle' });
});

router.get('/api/dashboard/beneficiaires-summary', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const summary = await getAgriculteursSummary();
    res.json(summary);
  } catch (error) {
    console.error('GET /api/dashboard/beneficiaires-summary failed', error);

    const message = error instanceof Error ? error.message : 'Erreur de connexion à la base de données';

    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({
        message: 'Connexion à la base de données indisponible pour les bénéficiaires RNA',
        details: message,
      });
    }

    return res.status(500).json({
      message: 'Erreur lors du chargement des bénéficiaires RNA',
    });
  }
});

router.get('/api/dashboard/rna-overview', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getAgriculteursDashboardOverview());
  } catch (error) {
    console.error('GET /api/dashboard/rna-overview failed', error);

    const message = error instanceof Error ? error.message : 'Erreur de connexion à la base de données';

    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({
        message: 'Connexion à la base de données indisponible pour le tableau de bord RNA',
        details: message,
      });
    }

    return res.status(500).json({
      message: 'Erreur lors du chargement du tableau de bord RNA',
    });
  }
});


export default router;
