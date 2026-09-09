/**
 * Routes : Fournisseurs Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createFournisseur,
  deleteFournisseur,
  getFournisseurById,
  getFournisseurs,
  getFournisseursStats,
  isDatabaseConnectivityError,
  updateFournisseur,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== FOURNISSEURS ROUTES ====================

router.get('/api/fournisseurs', authenticateToken, async (req, res) => {
  try {
    const payload = await getFournisseurs({
      search: req.query.search ? String(req.query.search) : undefined,
      type: req.query.type ? String(req.query.type) : undefined,
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    return res.json(payload);
  } catch (error) {
    console.error('GET /api/fournisseurs failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des fournisseurs' });
  }
});

router.get('/api/fournisseurs/stats', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getFournisseursStats());
  } catch (error) {
    console.error('GET /api/fournisseurs/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques fournisseurs' });
  }
});

router.get('/api/fournisseurs/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const item = await getFournisseurById(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    return res.json(item);
  } catch (error) {
    console.error('GET /api/fournisseurs/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du fournisseur' });
  }
});

router.post('/api/fournisseurs', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const fournisseur = await createFournisseur({
      nom: req.body.nom ? String(req.body.nom) : undefined,
      sigle: req.body.sigle === null ? null : req.body.sigle ? String(req.body.sigle) : undefined,
      type: req.body.type ? String(req.body.type) : undefined,
      province: req.body.province ? String(req.body.province) : undefined,
      territoire: req.body.territoire ? String(req.body.territoire) : undefined,
      responsable: req.body.responsable ? String(req.body.responsable) : undefined,
      telephone: req.body.telephone ? String(req.body.telephone) : undefined,
      email: req.body.email === null ? null : req.body.email ? String(req.body.email) : undefined,
      statut: req.body.statut ? String(req.body.statut) : undefined,
      stock_disponible: req.body.stock_disponible !== undefined ? Number(req.body.stock_disponible) : undefined,
      stock_total: req.body.stock_total !== undefined ? Number(req.body.stock_total) : undefined,
      beneficiaires_servis: req.body.beneficiaires_servis !== undefined ? Number(req.body.beneficiaires_servis) : 0,
      montant_contrat: req.body.montant_contrat !== undefined ? Number(req.body.montant_contrat) : 0,
      taux_livraison: req.body.taux_livraison !== undefined ? Number(req.body.taux_livraison) : 0,
      date_contrat: req.body.date_contrat ? String(req.body.date_contrat) : undefined,
      intrants: Array.isArray(req.body.intrants) ? req.body.intrants.map((item: unknown) => String(item)) : undefined,
    });

    return res.status(201).json(fournisseur);
  } catch (error) {
    console.error('POST /api/fournisseurs failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la création du fournisseur' });
  }
});

router.put('/api/fournisseurs/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const fournisseur = await updateFournisseur(Number(req.params.id), {
      nom: req.body.nom !== undefined ? String(req.body.nom) : undefined,
      sigle: req.body.sigle === null ? null : req.body.sigle !== undefined ? String(req.body.sigle) : undefined,
      type: req.body.type !== undefined ? String(req.body.type) : undefined,
      province: req.body.province !== undefined ? String(req.body.province) : undefined,
      territoire: req.body.territoire !== undefined ? String(req.body.territoire) : undefined,
      responsable: req.body.responsable !== undefined ? String(req.body.responsable) : undefined,
      telephone: req.body.telephone !== undefined ? String(req.body.telephone) : undefined,
      email: req.body.email === null ? null : req.body.email !== undefined ? String(req.body.email) : undefined,
      statut: req.body.statut !== undefined ? String(req.body.statut) : undefined,
      stock_disponible: req.body.stock_disponible !== undefined ? Number(req.body.stock_disponible) : undefined,
      stock_total: req.body.stock_total !== undefined ? Number(req.body.stock_total) : undefined,
      beneficiaires_servis: req.body.beneficiaires_servis !== undefined ? Number(req.body.beneficiaires_servis) : undefined,
      montant_contrat: req.body.montant_contrat !== undefined ? Number(req.body.montant_contrat) : undefined,
      taux_livraison: req.body.taux_livraison !== undefined ? Number(req.body.taux_livraison) : undefined,
      date_contrat: req.body.date_contrat !== undefined ? String(req.body.date_contrat) : undefined,
      intrants: req.body.intrants !== undefined && Array.isArray(req.body.intrants)
        ? req.body.intrants.map((item: unknown) => String(item))
        : undefined,
    });

    if (!fournisseur) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    return res.json(fournisseur);
  } catch (error) {
    console.error('PUT /api/fournisseurs/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la mise à jour du fournisseur' });
  }
});

router.delete('/api/fournisseurs/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const deleted = await deleteFournisseur(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Fournisseur non trouvé' });
    }

    return res.json({ message: 'Fournisseur supprimé' });
  } catch (error) {
    console.error('DELETE /api/fournisseurs/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la suppression du fournisseur' });
  }
});


export default router;
