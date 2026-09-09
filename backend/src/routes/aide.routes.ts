/**
 * Routes : Aide / Documentation Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createAideDemande,
  getAideContactSupport,
  getAideFAQ,
  getAideGuideById,
  getAideGuides,
  getAideTutorielById,
  getAideTutoriels,
  isDatabaseConnectivityError,
  searchAide,
} from '../db';
import {
  authenticateToken,
} from '../middleware/auth';

const router = Router();

// ==================== AIDE / DOCUMENTATION ROUTES ====================

router.get('/api/aide/guides', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getAideGuides());
  } catch (error) {
    console.error('GET /api/aide/guides failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des guides' });
  }
});

router.get('/api/aide/guides/:id(\\d+)', authenticateToken, async (req: Request, res: Response) => {
  try {
    const guide = await getAideGuideById(Number(req.params.id));
    if (!guide) {
      return res.status(404).json({ message: 'Guide non trouvé' });
    }
    return res.json(guide);
  } catch (error) {
    console.error('GET /api/aide/guides/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement du guide' });
  }
});

router.get('/api/aide/faq', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getAideFAQ());
  } catch (error) {
    console.error('GET /api/aide/faq failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement de la FAQ' });
  }
});

router.get('/api/aide/faq/:categorie', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.json(await getAideFAQ(req.params.categorie));
  } catch (error) {
    console.error('GET /api/aide/faq/:categorie failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement de la FAQ' });
  }
});

router.get('/api/aide/tutoriels', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getAideTutoriels());
  } catch (error) {
    console.error('GET /api/aide/tutoriels failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des tutoriels' });
  }
});

router.get('/api/aide/tutoriels/:id(\\d+)', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tutoriel = await getAideTutorielById(Number(req.params.id));
    if (!tutoriel) {
      return res.status(404).json({ message: 'Tutoriel non trouvé' });
    }
    return res.json(tutoriel);
  } catch (error) {
    console.error('GET /api/aide/tutoriels/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement du tutoriel' });
  }
});

router.get('/api/aide/support', authenticateToken, (_req: Request, res: Response) => {
  return res.json(getAideContactSupport());
});

router.post('/api/aide/demande', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sujet, message, email } = req.body ?? {};
    if (!sujet || !message || !email) {
      return res.status(400).json({ message: 'Sujet, message et email requis' });
    }
    await createAideDemande({ sujet, message, email });
    return res.status(201).json({ message: 'Demande envoyée avec succès' });
  } catch (error) {
    console.error('POST /api/aide/demande failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de l\'envoi de la demande' });
  }
});

router.get('/api/aide/recherche', authenticateToken, async (req: Request, res: Response) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    if (!query.trim()) {
      return res.json([]);
    }
    return res.json(await searchAide(query));
  } catch (error) {
    console.error('GET /api/aide/recherche failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la recherche' });
  }
});


export default router;
