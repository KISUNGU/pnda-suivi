/**
 * Routes : Grm Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createPlainte,
  deletePlainte,
  getGrmServices,
  getPlainteById,
  getPlainteStats,
  getPlaintes,
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

// ==================== GRM ROUTES ====================

router.get('/api/grm/plaintes', authenticateToken, async (req, res) => {
  try {
    const payload = await getPlaintes({
      search: req.query.search ? String(req.query.search) : undefined,
      type: req.query.type ? String(req.query.type) : undefined,
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) : undefined,
      date_debut: req.query.date_debut ? String(req.query.date_debut) : undefined,
      date_fin: req.query.date_fin ? String(req.query.date_fin) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    return res.json(payload);
  } catch (error) {
    console.error('GET /api/grm/plaintes failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des plaintes' });
  }
});

router.get('/api/grm/stats', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getPlainteStats());
  } catch (error) {
    console.error('GET /api/grm/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques GRM' });
  }
});

router.get('/api/grm/plaintes/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const plainte = await getPlainteById(Number(req.params.id));
    if (!plainte) {
      return res.status(404).json({ message: 'Plainte non trouvée' });
    }

    return res.json(plainte);
  } catch (error) {
    console.error('GET /api/grm/plaintes/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de la plainte' });
  }
});

router.get('/api/grm/services', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getGrmServices());
  } catch (error) {
    console.error('GET /api/grm/services failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des services GRM' });
  }
});


// Dans backend/src/app.ts, ajouter après les routes GRM

// ==================== GRM PLAINTES ROUTES (CRUD complet) ====================

router.post('/api/grm/plaintes', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
  try {
    const plainte = await createPlainte({
      type: req.body.type ? String(req.body.type) : undefined,
      description: req.body.description ? String(req.body.description) : undefined,
      province: req.body.province ? String(req.body.province) : undefined,
      territoire: req.body.territoire ? String(req.body.territoire) : undefined,
      village: req.body.village ? String(req.body.village) : undefined,
      beneficiaire_nom: req.body.beneficiaire_nom === null ? null : req.body.beneficiaire_nom ? String(req.body.beneficiaire_nom) : undefined,
      beneficiaire_rna: req.body.beneficiaire_rna === null ? null : req.body.beneficiaire_rna ? String(req.body.beneficiaire_rna) : undefined,
      est_confidentiel: Boolean(req.body.est_confidentiel),
      prise_en_charge: req.body.prise_en_charge === null ? null : req.body.prise_en_charge ? String(req.body.prise_en_charge) : undefined,
      resolution: req.body.resolution === null ? null : req.body.resolution ? String(req.body.resolution) : undefined,
    });

    return res.status(201).json(plainte);
  } catch (error) {
    console.error('POST /api/grm/plaintes failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la création de la plainte' });
  }
});

router.put('/api/grm/plaintes/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
  try {
    const plainte = await updatePlainte(Number(req.params.id), {
      type: req.body.type !== undefined ? String(req.body.type) : undefined,
      description: req.body.description !== undefined ? String(req.body.description) : undefined,
      province: req.body.province !== undefined ? String(req.body.province) : undefined,
      territoire: req.body.territoire !== undefined ? String(req.body.territoire) : undefined,
      village: req.body.village !== undefined ? String(req.body.village) : undefined,
      beneficiaire_nom: req.body.beneficiaire_nom === null ? null : req.body.beneficiaire_nom !== undefined ? String(req.body.beneficiaire_nom) : undefined,
      beneficiaire_rna: req.body.beneficiaire_rna === null ? null : req.body.beneficiaire_rna !== undefined ? String(req.body.beneficiaire_rna) : undefined,
      statut: req.body.statut !== undefined ? String(req.body.statut) : undefined,
      date_traitement: req.body.date_traitement === null ? null : req.body.date_traitement !== undefined ? String(req.body.date_traitement) : undefined,
      delai_traite: req.body.delai_traite !== undefined ? Number(req.body.delai_traite) : undefined,
      prise_en_charge: req.body.prise_en_charge === null ? null : req.body.prise_en_charge !== undefined ? String(req.body.prise_en_charge) : undefined,
      resolution: req.body.resolution === null ? null : req.body.resolution !== undefined ? String(req.body.resolution) : undefined,
      est_confidentiel: req.body.est_confidentiel !== undefined ? Boolean(req.body.est_confidentiel) : undefined,
    });

    if (!plainte) {
      return res.status(404).json({ message: 'Plainte non trouvée' });
    }

    return res.json(plainte);
  } catch (error) {
    console.error('PUT /api/grm/plaintes/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la plainte' });
  }
});

router.delete('/api/grm/plaintes/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const deleted = await deletePlainte(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Plainte non trouvée' });
    }

    return res.json({ message: 'Plainte supprimée' });
  } catch (error) {
    console.error('DELETE /api/grm/plaintes/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la suppression de la plainte' });
  }
});


export default router;
