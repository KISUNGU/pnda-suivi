/**
 * Routes : Indicateurs Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getIndicateursDashboardData,
  getLegacyHistorique,
  getLegacyIndicateurById,
  getLegacyIndicateurs,
  isDatabaseConnectivityError,
  updateIndicateurValeur,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';

const router = Router();

// ==================== INDICATEURS ROUTES ====================

router.get('/api/indicateurs/iodp', authenticateToken, async (_req, res) => {
  try {
    res.json(await getLegacyIndicateurs({ type: 'iodp' }));
  } catch (error) {
    console.error('GET /api/indicateurs/iodp failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs IODP' });
  }
});

router.get('/api/indicateurs/ir', authenticateToken, async (_req, res) => {
  try {
    res.json(await getLegacyIndicateurs({ type: 'ir' }));
  } catch (error) {
    console.error('GET /api/indicateurs/ir failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs IR' });
  }
});

router.get('/api/indicateurs', authenticateToken, async (_req, res) => {
  try {
    res.json(await getLegacyIndicateurs());
  } catch (error) {
    console.error('GET /api/indicateurs failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs' });
  }
});

router.get('/api/indicateurs/composante/:composanteId', authenticateToken, async (req, res) => {
  try {
    const composanteId = Number.parseInt(req.params.composanteId, 10);
    res.json(await getLegacyIndicateurs({ composanteId }));
  } catch (error) {
    console.error('GET /api/indicateurs/composante failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs par composante' });
  }
});

router.get('/api/indicateurs/:indicateurId(\\d+)', authenticateToken, async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    const indicateur = await getLegacyIndicateurById(indicateurId);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json(indicateur);
  } catch (error) {
    console.error('GET /api/indicateurs/:indicateurId failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer cet indicateur' });
  }
});

router.post('/api/indicateurs/:indicateurId(\\d+)/calculer', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    const { valeur } = req.body;
    const indicateur = await getLegacyIndicateurById(indicateurId);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }

    const resultat = valeur !== undefined && valeur !== null && valeur !== ''
      ? Number.parseFloat(String(valeur))
      : 0;
    const progression = indicateur.cible > 0 ? (resultat / indicateur.cible) * 100 : 0;

    return res.json({ valeur: resultat, progression });
  } catch (error) {
    console.error('POST /api/indicateurs/:indicateurId/calculer failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de calculer cet indicateur' });
  }
});

router.put('/api/indicateurs/:indicateurId(\\d+)/valeur', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    const { valeur, periode } = req.body;
    const indicateur = await updateIndicateurValeur(indicateurId, Number(valeur), periode);

    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }

    return res.json({
      message: `Indicateur ${indicateurId} mis a jour avec la valeur ${valeur} pour la periode ${periode ?? '2025'}`,
      success: true,
    });
  } catch (error) {
    console.error('PUT /api/indicateurs/:indicateurId/valeur failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de mettre a jour la valeur de l\'indicateur' });
  }
});

router.get('/api/indicateurs/:indicateurId(\\d+)/historique', authenticateToken, async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    res.json(await getLegacyHistorique(indicateurId));
  } catch (error) {
    console.error('GET /api/indicateurs/:indicateurId/historique failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer l\'historique de l\'indicateur' });
  }
});

router.get('/api/indicateurs/dashboard', authenticateToken, async (_req, res) => {
  try {
    res.json(await getIndicateursDashboardData());
  } catch (error) {
    console.error('GET /api/indicateurs/dashboard failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer le dashboard des indicateurs' });
  }
});


export default router;
