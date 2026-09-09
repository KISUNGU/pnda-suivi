/**
 * Routes : Suivi Du Ptba
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getPtbaSuivi,
  isDatabaseConnectivityError,
  updatePtbaActivite,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';

const router = Router();

// ==================== SUIVI DU PTBA ====================

router.get('/api/ptba/suivi', authenticateToken, async (req: Request, res: Response) => {
  try {
    const annee = req.query.annee ? Number.parseInt(String(req.query.annee), 10) : 2026;
    if (!Number.isFinite(annee)) {
      return res.status(400).json({ message: 'Année invalide' });
    }
    return res.json(await getPtbaSuivi(annee));
  } catch (error) {
    console.error('GET /api/ptba/suivi failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement du suivi du PTBA' });
  }
});

router.put('/api/ptba/activites/:id', authenticateToken, requireRole('super_admin', 'admin', 'uncp'), async (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const input: Record<string, unknown> = {};
    for (const champ of ['prevu', 'realise', 'commentaire'] as const) {
      if (champ in req.body) {
        input[champ] = req.body[champ];
      }
    }
    const updated = await updatePtbaActivite(id, input);
    if (!updated) {
      return res.status(404).json({ message: 'Activité PTBA introuvable' });
    }
    return res.json({ message: 'Activité PTBA mise à jour' });
  } catch (error) {
    console.error('PUT /api/ptba/activites/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'activité PTBA' });
  }
});


export default router;
