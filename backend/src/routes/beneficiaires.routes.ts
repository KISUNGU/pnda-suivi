/**
 * Routes : Bénéficiaires Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  getBeneficiaireById,
  getBeneficiaireStats,
  getBeneficiaires,
  getCartesAgriculteurs,
  getCartesAgriculteursStats,
  getVentesSemences,
  getVentesSemencesStats,
  isDatabaseConnectivityError,
  type SqlCarteAgriculteur,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== BÉNÉFICIAIRES ROUTES ====================

router.get('/api/beneficiaires', authenticateToken, async (req, res) => {
  try {
    const payload = await getBeneficiaires({
      search: req.query.search ? String(req.query.search) : undefined,
      province: scopeProvince(req),
      sexe: req.query.sexe ? String(req.query.sexe) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    res.json(payload);
  } catch (error) {
    console.error('GET /api/beneficiaires failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des bénéficiaires RNA' });
  }
});

router.get('/api/beneficiaires/stats', authenticateToken, async (_req, res) => {
  try {
    const stats = await getBeneficiaireStats();
    res.json(stats);
  } catch (error) {
    console.error('GET /api/beneficiaires/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques RNA' });
  }
});

router.get('/api/beneficiaires/cartes', authenticateToken, async (req, res) => {
  try {
    const payload = await getCartesAgriculteurs({
      search: req.query.search ? String(req.query.search) : undefined,
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) as SqlCarteAgriculteur['statut_carte'] : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    res.json(payload);
  } catch (error) {
    console.error('GET /api/beneficiaires/cartes failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des cartes agriculteurs' });
  }
});

router.get('/api/beneficiaires/cartes/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getCartesAgriculteursStats({
      search: req.query.search ? String(req.query.search) : undefined,
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) as SqlCarteAgriculteur['statut_carte'] : undefined,
    });

    res.json(stats);
  } catch (error) {
    console.error('GET /api/beneficiaires/cartes/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques de cartes agriculteurs' });
  }
});

router.get('/api/beneficiaires/ventes-semences', authenticateToken, async (req, res) => {
  try {
    const payload = await getVentesSemences({
      search: req.query.search ? String(req.query.search) : undefined,
      province: scopeProvince(req),
    });

    res.json(payload);
  } catch (error) {
    console.error('GET /api/beneficiaires/ventes-semences failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des ventes de semences' });
  }
});

router.get('/api/beneficiaires/ventes-semences/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await getVentesSemencesStats({
      search: req.query.search ? String(req.query.search) : undefined,
      province: scopeProvince(req),
    });

    res.json(stats);
  } catch (error) {
    console.error('GET /api/beneficiaires/ventes-semences/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques des ventes de semences' });
  }
});

router.get('/api/beneficiaires/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const beneficiaireId = Number(req.params.id);

    if (!Number.isInteger(beneficiaireId) || beneficiaireId <= 0) {
      return res.status(400).json({ message: 'Identifiant de bénéficiaire invalide' });
    }

    const beneficiaire = await getBeneficiaireById(beneficiaireId);
    if (!beneficiaire) {
      return res.status(404).json({ message: 'Bénéficiaire non trouvé' });
    }

    return res.json(beneficiaire);
  } catch (error) {
    console.error('GET /api/beneficiaires/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du bénéficiaire RNA' });
  }
});

router.post('/api/beneficiaires', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

router.put('/api/beneficiaires/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

router.delete('/api/beneficiaires/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});


export default router;
