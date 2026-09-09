/**
 * Routes : Activités Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createActivite,
  deleteActivite,
  getActiviteById,
  getActivites,
  getActivitesStats,
  isDatabaseConnectivityError,
  updateActivite,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';
import {
  parseDocumentsBody,
  parseStringArrayBody,
} from '../utils/mappers';

const router = Router();

// ==================== ACTIVITÉS ROUTES ====================

router.get('/api/activites', authenticateToken, async (req, res) => {
  try {
    const payload = await getActivites({
      search: req.query.search ? String(req.query.search) : undefined,
      type: req.query.type ? String(req.query.type) : undefined,
      composante: req.query.composante ? String(req.query.composante) : undefined,
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) : undefined,
      responsable: req.query.responsable ? String(req.query.responsable) : undefined,
      date_debut: req.query.date_debut ? String(req.query.date_debut) : undefined,
      date_fin: req.query.date_fin ? String(req.query.date_fin) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    return res.json(payload);
  } catch (error) {
    console.error('GET /api/activites failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des activités' });
  }
});

router.get('/api/activites/stats', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getActivitesStats());
  } catch (error) {
    console.error('GET /api/activites/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques activités' });
  }
});

router.get('/api/activites/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const item = await getActiviteById(Number(req.params.id));
    if (!item) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }

    return res.json(item);
  } catch (error) {
    console.error('GET /api/activites/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de l\'activité' });
  }
});

router.post('/api/activites', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const activite = await createActivite({
      code: req.body.code ? String(req.body.code) : undefined,
      titre: req.body.titre ? String(req.body.titre) : undefined,
      description: req.body.description ? String(req.body.description) : undefined,
      type: req.body.type ? String(req.body.type) : undefined,
      composante: req.body.composante ? String(req.body.composante) : undefined,
      statut: req.body.statut ? String(req.body.statut) : undefined,
      priorite: req.body.priorite ? String(req.body.priorite) : undefined,
      date_debut: req.body.date_debut ? String(req.body.date_debut) : undefined,
      date_fin: req.body.date_fin ? String(req.body.date_fin) : undefined,
      lieu: req.body.lieu ? String(req.body.lieu) : undefined,
      province: req.body.province ? String(req.body.province) : undefined,
      territoire: req.body.territoire ? String(req.body.territoire) : undefined,
      commune: req.body.commune === null ? null : req.body.commune ? String(req.body.commune) : undefined,
      village: req.body.village === null ? null : req.body.village ? String(req.body.village) : undefined,
      responsable: req.body.responsable ? String(req.body.responsable) : undefined,
      responsable_contact: req.body.responsable_contact === null ? null : req.body.responsable_contact ? String(req.body.responsable_contact) : undefined,
      equipe: parseStringArrayBody(req.body.equipe),
      participants_prevus: req.body.participants_prevus !== undefined ? Number(req.body.participants_prevus) : undefined,
      participants_reels: req.body.participants_reels !== undefined ? Number(req.body.participants_reels) : undefined,
      budget_prevu: req.body.budget_prevu !== undefined ? Number(req.body.budget_prevu) : undefined,
      budget_reel: req.body.budget_reel !== undefined ? Number(req.body.budget_reel) : undefined,
      objectifs: parseStringArrayBody(req.body.objectifs),
      resultats_attendus: parseStringArrayBody(req.body.resultats_attendus),
      resultats_obtenus: req.body.resultats_obtenus === null ? null : req.body.resultats_obtenus ? String(req.body.resultats_obtenus) : undefined,
      difficultes: req.body.difficultes === null ? null : req.body.difficultes ? String(req.body.difficultes) : undefined,
      lecons_apprises: req.body.lecons_apprises === null ? null : req.body.lecons_apprises ? String(req.body.lecons_apprises) : undefined,
      documents: parseDocumentsBody(req.body.documents),
      photos: parseStringArrayBody(req.body.photos),
      created_by: req.body.created_by ? String(req.body.created_by) : undefined,
      beneficiaires_cibles: req.body.beneficiaires_cibles !== undefined ? Number(req.body.beneficiaires_cibles) : undefined,
      beneficiaires_atteints: req.body.beneficiaires_atteints !== undefined ? Number(req.body.beneficiaires_atteints) : undefined,
      taux_execution: req.body.taux_execution !== undefined ? Number(req.body.taux_execution) : undefined,
    });

    return res.status(201).json(activite);
  } catch (error) {
    console.error('POST /api/activites failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la création de l\'activité' });
  }
});

router.put('/api/activites/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const activite = await updateActivite(Number(req.params.id), {
      code: req.body.code !== undefined ? String(req.body.code) : undefined,
      titre: req.body.titre !== undefined ? String(req.body.titre) : undefined,
      description: req.body.description !== undefined ? String(req.body.description) : undefined,
      type: req.body.type !== undefined ? String(req.body.type) : undefined,
      composante: req.body.composante !== undefined ? String(req.body.composante) : undefined,
      statut: req.body.statut !== undefined ? String(req.body.statut) : undefined,
      priorite: req.body.priorite !== undefined ? String(req.body.priorite) : undefined,
      date_debut: req.body.date_debut !== undefined ? String(req.body.date_debut) : undefined,
      date_fin: req.body.date_fin !== undefined ? String(req.body.date_fin) : undefined,
      lieu: req.body.lieu !== undefined ? String(req.body.lieu) : undefined,
      province: req.body.province !== undefined ? String(req.body.province) : undefined,
      territoire: req.body.territoire !== undefined ? String(req.body.territoire) : undefined,
      commune: req.body.commune === null ? null : req.body.commune !== undefined ? String(req.body.commune) : undefined,
      village: req.body.village === null ? null : req.body.village !== undefined ? String(req.body.village) : undefined,
      responsable: req.body.responsable !== undefined ? String(req.body.responsable) : undefined,
      responsable_contact: req.body.responsable_contact === null ? null : req.body.responsable_contact !== undefined ? String(req.body.responsable_contact) : undefined,
      equipe: req.body.equipe !== undefined ? parseStringArrayBody(req.body.equipe) : undefined,
      participants_prevus: req.body.participants_prevus !== undefined ? Number(req.body.participants_prevus) : undefined,
      participants_reels: req.body.participants_reels !== undefined ? Number(req.body.participants_reels) : undefined,
      budget_prevu: req.body.budget_prevu !== undefined ? Number(req.body.budget_prevu) : undefined,
      budget_reel: req.body.budget_reel !== undefined ? Number(req.body.budget_reel) : undefined,
      objectifs: req.body.objectifs !== undefined ? parseStringArrayBody(req.body.objectifs) : undefined,
      resultats_attendus: req.body.resultats_attendus !== undefined ? parseStringArrayBody(req.body.resultats_attendus) : undefined,
      resultats_obtenus: req.body.resultats_obtenus === null ? null : req.body.resultats_obtenus !== undefined ? String(req.body.resultats_obtenus) : undefined,
      difficultes: req.body.difficultes === null ? null : req.body.difficultes !== undefined ? String(req.body.difficultes) : undefined,
      lecons_apprises: req.body.lecons_apprises === null ? null : req.body.lecons_apprises !== undefined ? String(req.body.lecons_apprises) : undefined,
      documents: req.body.documents !== undefined ? parseDocumentsBody(req.body.documents) : undefined,
      photos: req.body.photos !== undefined ? parseStringArrayBody(req.body.photos) : undefined,
      created_by: req.body.created_by !== undefined ? String(req.body.created_by) : undefined,
      beneficiaires_cibles: req.body.beneficiaires_cibles !== undefined ? Number(req.body.beneficiaires_cibles) : undefined,
      beneficiaires_atteints: req.body.beneficiaires_atteints !== undefined ? Number(req.body.beneficiaires_atteints) : undefined,
      taux_execution: req.body.taux_execution !== undefined ? Number(req.body.taux_execution) : undefined,
    });

    if (!activite) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }

    return res.json(activite);
  } catch (error) {
    console.error('PUT /api/activites/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'activité' });
  }
});

router.delete('/api/activites/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const deleted = await deleteActivite(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }

    return res.json({ message: 'Activité supprimée' });
  } catch (error) {
    console.error('DELETE /api/activites/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la suppression de l\'activité' });
  }
});


export default router;
