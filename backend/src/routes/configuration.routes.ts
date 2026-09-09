/**
 * Routes : Configuration Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getConfiguration,
  isDatabaseConnectivityError,
  updateConfigurationSection,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';

const router = Router();

// ==================== CONFIGURATION ROUTES ====================

router.get('/api/configuration', authenticateToken, requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    return res.json(await getConfiguration());
  } catch (error) {
    console.error('GET /api/configuration failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement de la configuration' });
  }
});

router.put('/api/configuration/:section', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const section = req.params.section;
    if (!['generale', 'alertes', 'integration', 'provincesActives'].includes(section)) {
      return res.status(400).json({ message: 'Section de configuration invalide' });
    }
    await updateConfigurationSection(section, req.body);
    return res.json({ message: 'Configuration mise à jour avec succès' });
  } catch (error) {
    console.error('PUT /api/configuration/:section failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la configuration' });
  }
});


export default router;
