/**
 * Routes : Ot (Opérateurs Techniques) Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createOTActivite,
  createOTRapport,
  getOTActivites,
  getOTData,
  getOTEquipiers,
  getOTRapports,
  isDatabaseConnectivityError,
  updateOTActivite,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== OT (OPÉRATEURS TECHNIQUES) ROUTES ====================
router.get('/api/ot/data', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getOTData());
  } catch (error) {
    console.error('GET /api/ot/data failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des données OT' });
  }
});

router.get('/api/ot/activites', authenticateToken, async (req, res) => {
  try {
    return res.json(await getOTActivites({
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) : undefined,
      date_debut: req.query.date_debut ? String(req.query.date_debut) : undefined,
      date_fin: req.query.date_fin ? String(req.query.date_fin) : undefined,
    }));
  } catch (error) {
    console.error('GET /api/ot/activites failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des activités terrain' });
  }
});

router.get('/api/ot/equipiers', authenticateToken, async (req, res) => {
  try {
    return res.json(await getOTEquipiers({
      fonction: req.query.fonction ? String(req.query.fonction) : undefined,
      province: scopeProvince(req),
      actif: req.query.actif === undefined ? undefined : String(req.query.actif) === 'true',
    }));
  } catch (error) {
    console.error('GET /api/ot/equipiers failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des équipiers OT' });
  }
});

router.get('/api/ot/rapports', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getOTRapports());
  } catch (error) {
    console.error('GET /api/ot/rapports failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des rapports OT' });
  }
});

router.post('/api/ot/rapports', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
  try {
    return res.status(201).json(await createOTRapport({
      mois: req.body.mois ? String(req.body.mois) : undefined,
      annee: req.body.annee !== undefined ? Number(req.body.annee) : undefined,
      enquetes: req.body.enquetes !== undefined ? Number(req.body.enquetes) : undefined,
      formations: req.body.formations !== undefined ? Number(req.body.formations) : undefined,
      suivis: req.body.suivis !== undefined ? Number(req.body.suivis) : undefined,
      qualite_donnees: req.body.qualite_donnees !== undefined ? Number(req.body.qualite_donnees) : undefined,
      commentaires: req.body.commentaires ? String(req.body.commentaires) : undefined,
      valide: req.body.valide !== undefined ? Boolean(req.body.valide) : undefined,
    }));
  } catch (error) {
    console.error('POST /api/ot/rapports failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la création du rapport OT' });
  }
});

router.put('/api/ot/activites/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
  try {
    const activite = await updateOTActivite(Number(req.params.id), {
      type: req.body.type !== undefined ? String(req.body.type) : undefined,
      titre: req.body.titre !== undefined ? String(req.body.titre) : undefined,
      description: req.body.description !== undefined ? String(req.body.description) : undefined,
      date: req.body.date !== undefined ? String(req.body.date) : undefined,
      province: req.body.province !== undefined ? String(req.body.province) : undefined,
      territoire: req.body.territoire !== undefined ? String(req.body.territoire) : undefined,
      village: req.body.village !== undefined ? String(req.body.village) : undefined,
      statut: req.body.statut !== undefined ? String(req.body.statut) : undefined,
      responsable: req.body.responsable !== undefined ? String(req.body.responsable) : undefined,
      participants: req.body.participants !== undefined ? Number(req.body.participants) : undefined,
      resultats: req.body.resultats === null ? null : req.body.resultats !== undefined ? String(req.body.resultats) : undefined,
    });

    if (!activite) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }

    return res.json(activite);
  } catch (error) {
    console.error('PUT /api/ot/activites/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'activité terrain' });
  }
});

router.post('/api/ot/activites', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
  try {
    return res.status(201).json(await createOTActivite({
      type: req.body.type ? String(req.body.type) : undefined,
      titre: req.body.titre ? String(req.body.titre) : undefined,
      description: req.body.description ? String(req.body.description) : undefined,
      date: req.body.date ? String(req.body.date) : undefined,
      province: req.body.province ? String(req.body.province) : undefined,
      territoire: req.body.territoire ? String(req.body.territoire) : undefined,
      village: req.body.village ? String(req.body.village) : undefined,
      statut: req.body.statut ? String(req.body.statut) : undefined,
      responsable: req.body.responsable ? String(req.body.responsable) : undefined,
      participants: req.body.participants !== undefined ? Number(req.body.participants) : undefined,
      resultats: req.body.resultats === null ? null : req.body.resultats ? String(req.body.resultats) : undefined,
    }));
  } catch (error) {
    console.error('POST /api/ot/activites failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la création de l\'activité terrain' });
  }
});

router.get('/api/ot/export/:format', authenticateToken, async (req, res) => {
  try {
    const activites = await getOTActivites();
    const format = String(req.params.format).toLowerCase();

    if (format === 'excel') {
      const csv = [
        ['Type', 'Titre', 'Date', 'Province', 'Statut', 'Responsable', 'Participants'],
        ...activites.map((item) => [item.type, item.titre, item.date, item.province, item.statut, item.responsable, item.participants ?? 0]),
      ].map((row) => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ot_activites.csv');
      return res.send(csv);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=ot_activites.pdf');
    return res.send(Buffer.from(`OT export\nTotal activités: ${activites.length}`));
  } catch (error) {
    console.error('GET /api/ot/export/:format failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de l\'export OT' });
  }
});


export default router;
