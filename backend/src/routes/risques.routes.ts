/**
 * Routes : Risques Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createRisque,
  createRisqueAction,
  deleteRisque,
  getRisqueActions,
  getRisqueAlertes,
  getRisqueById,
  getRisques,
  getRisquesStats,
  isDatabaseConnectivityError,
  markRisqueAlerteAsRead,
  updateRisque,
  updateRisqueAction,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  refuseHorsProvince,
  scopeProvince,
} from '../middleware/scope';
import {
  mapRisqueToApi,
  parseStringArrayBody,
} from '../utils/mappers';

const router = Router();

// ==================== RISQUES ROUTES ====================
router.get('/api/risques', authenticateToken, async (req, res) => {
  try {
    const search = req.query.search ? String(req.query.search).toLowerCase() : '';
    const categorie = req.query.categorie ? String(req.query.categorie) : undefined;
    const statut = req.query.statut ? String(req.query.statut) : undefined;
    const province = scopeProvince(req);
    const niveau = req.query.niveau ? String(req.query.niveau) : undefined;

    const risques = (await getRisques()).filter((risque) => {
      if (search) {
        const source = `${risque.code} ${risque.nom} ${risque.description} ${risque.responsable}`.toLowerCase();
        if (!source.includes(search)) {
          return false;
        }
      }

      if (categorie && risque.categorie !== categorie) {
        return false;
      }
      if (statut && risque.statut !== statut) {
        return false;
      }
      if (province && risque.province !== province) {
        return false;
      }
      if (niveau && risque.niveau !== niveau) {
        return false;
      }

      return true;
    });

    return res.json(risques.map(mapRisqueToApi));
  } catch (error) {
    console.error('GET /api/risques failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des risques' });
  }
});

router.get('/api/risques/stats', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getRisquesStats());
  } catch (error) {
    console.error('GET /api/risques/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques risques' });
  }
});

router.get('/api/risques/alertes', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getRisqueAlertes());
  } catch (error) {
    console.error('GET /api/risques/alertes failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des alertes risques' });
  }
});

router.put('/api/risques/alertes/:id(\\d+)/lue', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const alerte = await markRisqueAlerteAsRead(Number(req.params.id));
    if (!alerte) {
      return res.status(404).json({ message: 'Alerte non trouvée' });
    }

    return res.json(alerte);
  } catch (error) {
    console.error('PUT /api/risques/alertes/:id/lue failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'alerte' });
  }
});

router.get('/api/risques/:id(\\d+)/actions', authenticateToken, async (req, res) => {
  try {
    const risque = await getRisqueById(Number(req.params.id));
    if (!risque) {
      return res.status(404).json({ message: 'Risque non trouvé' });
    }

    return res.json(await getRisqueActions(risque.id));
  } catch (error) {
    console.error('GET /api/risques/:id/actions failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des actions d\'atténuation' });
  }
});

router.post('/api/risques/:id(\\d+)/actions', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const action = await createRisqueAction(Number(req.params.id), {
      action: req.body.action ? String(req.body.action) : undefined,
      responsable: req.body.responsable ? String(req.body.responsable) : undefined,
      date_debut: req.body.date_debut ? String(req.body.date_debut) : undefined,
      date_fin: req.body.date_fin ? String(req.body.date_fin) : undefined,
      statut: req.body.statut ? String(req.body.statut) : undefined,
      resultat: req.body.resultat === null ? null : req.body.resultat ? String(req.body.resultat) : undefined,
    });

    if (!action) {
      return res.status(404).json({ message: 'Risque non trouvé' });
    }

    return res.status(201).json(action);
  } catch (error) {
    console.error('POST /api/risques/:id/actions failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la création de l\'action d\'atténuation' });
  }
});

router.put('/api/risques/:risqueId(\\d+)/actions/:actionId(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const action = await updateRisqueAction(Number(req.params.risqueId), Number(req.params.actionId), {
      action: req.body.action !== undefined ? String(req.body.action) : undefined,
      responsable: req.body.responsable !== undefined ? String(req.body.responsable) : undefined,
      date_debut: req.body.date_debut !== undefined ? String(req.body.date_debut) : undefined,
      date_fin: req.body.date_fin !== undefined ? String(req.body.date_fin) : undefined,
      statut: req.body.statut !== undefined ? String(req.body.statut) : undefined,
      resultat: req.body.resultat === null ? null : req.body.resultat !== undefined ? String(req.body.resultat) : undefined,
    });

    if (!action) {
      return res.status(404).json({ message: 'Action non trouvée' });
    }

    return res.json(action);
  } catch (error) {
    console.error('PUT /api/risques/:risqueId/actions/:actionId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'action d\'atténuation' });
  }
});

router.get('/api/risques/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const risque = await getRisqueById(Number(req.params.id));
    if (!risque) {
      return res.status(404).json({ message: 'Risque non trouvé' });
    }

    return res.json(mapRisqueToApi(risque));
  } catch (error) {
    console.error('GET /api/risques/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du risque' });
  }
});

router.post('/api/risques', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const horsProvince = refuseHorsProvince(req, req.body?.province ? String(req.body.province) : null);
    if (horsProvince) {
      return res.status(403).json({ message: horsProvince });
    }

    const risque = await createRisque({
      code: req.body.code ? String(req.body.code) : undefined,
      nom: req.body.nom ? String(req.body.nom) : undefined,
      description: req.body.description ? String(req.body.description) : undefined,
      categorie: req.body.categorie ? String(req.body.categorie) : undefined,
      probabilite: req.body.probabilite !== undefined ? Number(req.body.probabilite) : undefined,
      impact: req.body.impact !== undefined ? Number(req.body.impact) : undefined,
      niveau: req.body.niveau ? String(req.body.niveau) : undefined,
      statut: req.body.statut ? String(req.body.statut) : undefined,
      plan_attenuation: req.body.plan_atténuation ? String(req.body.plan_atténuation) : req.body.plan_attenuation ? String(req.body.plan_attenuation) : undefined,
      responsable: req.body.responsable ? String(req.body.responsable) : undefined,
      date_identification: req.body.date_identification ? String(req.body.date_identification) : undefined,
      date_cloture: req.body.date_cloture === null ? null : req.body.date_cloture ? String(req.body.date_cloture) : undefined,
      province: req.body.province === null ? null : req.body.province ? String(req.body.province) : undefined,
      actions_prevues: parseStringArrayBody(req.body.actions_prevues),
      indicateurs_surveillance: parseStringArrayBody(req.body.indicateurs_surveillance),
      dernier_suivi: req.body.dernier_suivi === null ? null : req.body.dernier_suivi ? String(req.body.dernier_suivi) : undefined,
    });

    return res.status(201).json(mapRisqueToApi(risque));
  } catch (error) {
    console.error('POST /api/risques failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la création du risque' });
  }
});

router.put('/api/risques/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const risque = await updateRisque(Number(req.params.id), {
      code: req.body.code !== undefined ? String(req.body.code) : undefined,
      nom: req.body.nom !== undefined ? String(req.body.nom) : undefined,
      description: req.body.description !== undefined ? String(req.body.description) : undefined,
      categorie: req.body.categorie !== undefined ? String(req.body.categorie) : undefined,
      probabilite: req.body.probabilite !== undefined ? Number(req.body.probabilite) : undefined,
      impact: req.body.impact !== undefined ? Number(req.body.impact) : undefined,
      niveau: req.body.niveau !== undefined ? String(req.body.niveau) : undefined,
      statut: req.body.statut !== undefined ? String(req.body.statut) : undefined,
      plan_attenuation: req.body.plan_atténuation !== undefined ? String(req.body.plan_atténuation) : req.body.plan_attenuation !== undefined ? String(req.body.plan_attenuation) : undefined,
      responsable: req.body.responsable !== undefined ? String(req.body.responsable) : undefined,
      date_identification: req.body.date_identification !== undefined ? String(req.body.date_identification) : undefined,
      date_cloture: req.body.date_cloture === null ? null : req.body.date_cloture !== undefined ? String(req.body.date_cloture) : undefined,
      province: req.body.province === null ? null : req.body.province !== undefined ? String(req.body.province) : undefined,
      actions_prevues: req.body.actions_prevues !== undefined ? parseStringArrayBody(req.body.actions_prevues) : undefined,
      indicateurs_surveillance: req.body.indicateurs_surveillance !== undefined ? parseStringArrayBody(req.body.indicateurs_surveillance) : undefined,
      dernier_suivi: req.body.dernier_suivi === null ? null : req.body.dernier_suivi !== undefined ? String(req.body.dernier_suivi) : undefined,
    });

    if (!risque) {
      return res.status(404).json({ message: 'Risque non trouvé' });
    }

    return res.json(mapRisqueToApi(risque));
  } catch (error) {
    console.error('PUT /api/risques/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la mise à jour du risque' });
  }
});

router.delete('/api/risques/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const deleted = await deleteRisque(Number(req.params.id));
    if (!deleted) {
      return res.status(404).json({ message: 'Risque non trouvé' });
    }

    return res.json({ message: 'Risque supprimé avec succès' });
  } catch (error) {
    console.error('DELETE /api/risques/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la suppression du risque' });
  }
});


export default router;
