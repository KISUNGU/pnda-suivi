/**
 * Routes : Organisations Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createOrganisation,
  deleteOrganisation,
  getOrganisationById,
  getOrganisations,
  getOrganisationsStats,
  isDatabaseConnectivityError,
  updateOrganisation,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== ORGANISATIONS ROUTES ====================

router.get('/api/organisations', authenticateToken, async (req, res) => {
  try {
    const payload = await getOrganisations({
      search: req.query.search ? String(req.query.search) : undefined,
      type: req.query.type ? String(req.query.type) : undefined,
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    return res.json(payload);
  } catch (error) {
    console.error('GET /api/organisations failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des organisations' });
  }
});

router.get('/api/organisations/stats', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getOrganisationsStats());
  } catch (error) {
    console.error('GET /api/organisations/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques organisations' });
  }
});

router.get('/api/organisations/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const item = await getOrganisationById(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: 'Organisation non trouvée' });
    }

    return res.json(item);
  } catch (error) {
    console.error('GET /api/organisations/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de l\'organisation' });
  }
});

router.post('/api/organisations', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const organisation = await createOrganisation({
      code: req.body.code ? String(req.body.code) : undefined,
      nom: req.body.nom ? String(req.body.nom) : undefined,
      sigle: req.body.sigle ? String(req.body.sigle) : undefined,
      nom_complet: req.body.nom_complet ? String(req.body.nom_complet) : undefined,
      type: req.body.type ? String(req.body.type) : undefined,
      source_type: req.body.source_type ? String(req.body.source_type) : undefined,
      date_creation: req.body.date_creation ? String(req.body.date_creation) : undefined,
      date_agrement: req.body.date_agrement === null ? null : req.body.date_agrement ? String(req.body.date_agrement) : undefined,
      province: req.body.province ? String(req.body.province) : undefined,
      territoire: req.body.territoire ? String(req.body.territoire) : undefined,
      commune: req.body.commune ? String(req.body.commune) : undefined,
      adresse: req.body.adresse ? String(req.body.adresse) : undefined,
      contacts: req.body.contacts ? {
        responsable: req.body.contacts.responsable ? String(req.body.contacts.responsable) : undefined,
        telephone: req.body.contacts.telephone ? String(req.body.contacts.telephone) : undefined,
        email: req.body.contacts.email ? String(req.body.contacts.email) : undefined,
      } : undefined,
      membres: req.body.membres ? {
        total: req.body.membres.total !== undefined ? Number(req.body.membres.total) : undefined,
        femmes: req.body.membres.femmes !== undefined ? Number(req.body.membres.femmes) : undefined,
        hommes: req.body.membres.hommes !== undefined ? Number(req.body.membres.hommes) : undefined,
        jeunes: req.body.membres.jeunes !== undefined ? Number(req.body.membres.jeunes) : undefined,
      } : undefined,
      productions: Array.isArray(req.body.productions) ? req.body.productions.map((item: unknown) => String(item)) : undefined,
      statut: req.body.statut ? String(req.body.statut) : undefined,
      role: req.body.role ? String(req.body.role) : undefined,
      beneficiaires_couverts: req.body.beneficiaires_couverts !== undefined ? Number(req.body.beneficiaires_couverts) : 0,
      budget_alloue: req.body.budget_alloue !== undefined ? Number(req.body.budget_alloue) : 0,
      taux_execution: req.body.taux_execution !== undefined ? Number(req.body.taux_execution) : 0,
    });

    return res.status(201).json(organisation);
  } catch (error) {
    console.error('POST /api/organisations failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la création de l\'organisation' });
  }
});

router.put('/api/organisations/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const organisation = await updateOrganisation(Number(req.params.id), {
      code: req.body.code !== undefined ? String(req.body.code) : undefined,
      nom: req.body.nom !== undefined ? String(req.body.nom) : undefined,
      sigle: req.body.sigle !== undefined ? String(req.body.sigle) : undefined,
      nom_complet: req.body.nom_complet !== undefined ? String(req.body.nom_complet) : undefined,
      type: req.body.type !== undefined ? String(req.body.type) : undefined,
      source_type: req.body.source_type !== undefined ? String(req.body.source_type) : undefined,
      date_creation: req.body.date_creation !== undefined ? String(req.body.date_creation) : undefined,
      date_agrement: req.body.date_agrement === null ? null : req.body.date_agrement !== undefined ? String(req.body.date_agrement) : undefined,
      province: req.body.province !== undefined ? String(req.body.province) : undefined,
      territoire: req.body.territoire !== undefined ? String(req.body.territoire) : undefined,
      commune: req.body.commune !== undefined ? String(req.body.commune) : undefined,
      adresse: req.body.adresse !== undefined ? String(req.body.adresse) : undefined,
      contacts: req.body.contacts ? {
        responsable: req.body.contacts.responsable !== undefined ? String(req.body.contacts.responsable) : undefined,
        telephone: req.body.contacts.telephone !== undefined ? String(req.body.contacts.telephone) : undefined,
        email: req.body.contacts.email !== undefined ? String(req.body.contacts.email) : undefined,
      } : undefined,
      membres: req.body.membres ? {
        total: req.body.membres.total !== undefined ? Number(req.body.membres.total) : undefined,
        femmes: req.body.membres.femmes !== undefined ? Number(req.body.membres.femmes) : undefined,
        hommes: req.body.membres.hommes !== undefined ? Number(req.body.membres.hommes) : undefined,
        jeunes: req.body.membres.jeunes !== undefined ? Number(req.body.membres.jeunes) : undefined,
      } : undefined,
      productions: req.body.productions !== undefined && Array.isArray(req.body.productions)
        ? req.body.productions.map((item: unknown) => String(item))
        : undefined,
      statut: req.body.statut !== undefined ? String(req.body.statut) : undefined,
      role: req.body.role !== undefined ? String(req.body.role) : undefined,
      beneficiaires_couverts: req.body.beneficiaires_couverts !== undefined ? Number(req.body.beneficiaires_couverts) : undefined,
      budget_alloue: req.body.budget_alloue !== undefined ? Number(req.body.budget_alloue) : undefined,
      taux_execution: req.body.taux_execution !== undefined ? Number(req.body.taux_execution) : undefined,
    });

    if (!organisation) {
      return res.status(404).json({ message: 'Organisation non trouvée' });
    }

    return res.json(organisation);
  } catch (error) {
    console.error('PUT /api/organisations/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'organisation' });
  }
});

router.delete('/api/organisations/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const deleted = await deleteOrganisation(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Organisation non trouvée' });
    }

    return res.json({ message: 'Organisation supprimée' });
  } catch (error) {
    console.error('DELETE /api/organisations/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la suppression de l\'organisation' });
  }
});


export default router;
