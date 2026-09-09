/**
 * Routes : Cadre Des Résultats
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  controlerCadre,
  getCadreCiblesProvinciales,
  getCadreIndicateurDetail,
  getCadreResultats,
  getCadreResultatsStats,
  getCadreValeurs,
  isDatabaseConnectivityError,
} from '../db';
import { authenticateToken, requireRole } from '../middleware/auth';
import { scopeProvince } from '../middleware/scope';

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

// ==================== VALEURS DESAGREGEES (modele cadre_valeur) ====================
//
// Introduites par la migration 0006. Les routes ci-dessus lisent toujours
// cadre_resultats et son modele en colonnes : elles restent inchangees pour ne
// rien casser cote ecrans. Celles-ci exposent le modele en lignes, seul capable
// de porter la desagregation annee x province x sexe.

/**
 * Valeurs du cadre, filtrables par indicateur, annee et sexe.
 *
 * La province n'est pas un filtre libre : elle vient de scopeProvince, donc un
 * UPEP ou un OT ne recoit que la sienne quoi qu'il demande.
 */
router.get('/api/cadre-resultats/valeurs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const sexe = req.query.sexe === 'F' || req.query.sexe === 'M' ? req.query.sexe : undefined;
    const annee = req.query.annee ? Number.parseInt(String(req.query.annee), 10) : undefined;

    if (annee !== undefined && Number.isNaN(annee)) {
      return res.status(400).json({ message: 'Parametre annee invalide' });
    }

    return res.json(await getCadreValeurs({
      code: typeof req.query.code === 'string' ? req.query.code : undefined,
      annee,
      sexe,
      province: scopeProvince(req),
    }));
  } catch (error) {
    console.error('GET /api/cadre-resultats/valeurs failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Impossible de recuperer les valeurs du cadre' });
  }
});

/**
 * Rapport de coherence du cadre.
 *
 * Reserve aux roles nationaux : il porte sur l'ensemble du cadre, toutes
 * provinces confondues, et sert a arbitrer avant une revue ou un ISR.
 */
router.get(
  '/api/cadre-resultats/controle',
  authenticateToken,
  requireRole('super_admin', 'admin', 'uncp'),
  async (_req: Request, res: Response) => {
    try {
      return res.json(await controlerCadre());
    } catch (error) {
      console.error('GET /api/cadre-resultats/controle failed', error);

      if (isDatabaseConnectivityError(error)) {
        return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
      }

      return res.status(500).json({ message: 'Impossible de controler le cadre' });
    }
  }
);

/**
 * Fiche d'un indicateur avec ses valeurs desagregees.
 *
 * Un code de desagregation (une ancienne ligne « — Femmes ») renvoie la fiche
 * de son indicateur mere : ce n'est plus un indicateur autonome.
 */
router.get('/api/cadre-resultats/:code([A-Za-z0-9.]+)/valeurs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const detail = await getCadreIndicateurDetail(req.params.code, scopeProvince(req));

    if (!detail) {
      return res.status(404).json({ message: 'Indicateur introuvable dans le cadre' });
    }

    return res.json(detail);
  } catch (error) {
    console.error('GET /api/cadre-resultats/:code/valeurs failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Impossible de recuperer la fiche de l\'indicateur' });
  }
});

export default router;
