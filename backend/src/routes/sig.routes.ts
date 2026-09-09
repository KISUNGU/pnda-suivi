/**
 * Routes : Sig / Géospatial Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createSigSite,
  deleteSigSite,
  getProvinceById,
  getProvinceEvolution,
  getSigOverview,
  getSigSites,
  getSigTerritoiresDensite,
  isDatabaseConnectivityError,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  refuseHorsProvince,
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== SIG / GÉOSPATIAL ROUTES ====================

/** Synthèse SIG : sites du projet et couverture géographique du RNA. */
router.get('/api/sig/overview', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getSigOverview());
  } catch (error) {
    console.error('GET /api/sig/overview failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement de la synthèse SIG' });
  }
});

/** Sites géolocalisés du projet (bureaux, périmètres, routes, marchés, CLER…). */
router.get('/api/sig/sites', authenticateToken, async (req, res) => {
  try {
    const province = scopeProvince(req);
    const type = req.query.type ? String(req.query.type) : undefined;
    return res.json(await getSigSites({ province, type }));
  } catch (error) {
    console.error('GET /api/sig/sites failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des sites' });
  }
});

router.post('/api/sig/sites', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const { nom, type, province, territoire, lat, lng, statut, details } = req.body ?? {};
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!nom || !province || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      return res.status(400).json({ message: 'Champs requis : nom, province, lat, lng' });
    }
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({ message: 'Coordonnées WGS84 invalides' });
    }

    const horsProvince = refuseHorsProvince(req, String(province));
    if (horsProvince) {
      return res.status(403).json({ message: horsProvince });
    }

    const site = await createSigSite({
      nom: String(nom),
      type: String(type ?? 'autre'),
      province: String(province),
      territoire: territoire ? String(territoire) : '',
      lat: latNum,
      lng: lngNum,
      statut: statut ? String(statut) : undefined,
      details: details && typeof details === 'object' ? details : undefined,
    });
    return res.status(201).json(site);
  } catch (error) {
    console.error('POST /api/sig/sites failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la création du site' });
  }
});

router.delete('/api/sig/sites/:id', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const ok = await deleteSigSite(id);
    if (!ok) {
      return res.status(404).json({ message: 'Site introuvable' });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/sig/sites/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la suppression du site' });
  }
});

/** Densité de bénéficiaires RNA par territoire (choroplèthe/classement). */
router.get('/api/sig/territoires', authenticateToken, async (req, res) => {
  try {
    const province = scopeProvince(req);
    return res.json(await getSigTerritoiresDensite(province));
  } catch (error) {
    console.error('GET /api/sig/territoires failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des territoires' });
  }
});

router.get('/api/provinces/:id', authenticateToken, async (req, res) => {
  try {    const province = await getProvinceById(req.params.id);
    if (!province) {
      return res.status(404).json({ message: 'Province non trouvée' });
    }

    return res.json(province);
  } catch (error) {
    console.error('GET /api/provinces/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de la province' });
  }
});

router.get('/api/provinces/:id/data', authenticateToken, async (req, res) => {
  try {
    const province = await getProvinceById(req.params.id);
    if (!province) {
      return res.status(404).json({ message: 'Province non trouvée' });
    }

    return res.json(province);
  } catch (error) {
    console.error('GET /api/provinces/:id/data failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des données provinciales' });
  }
});

router.get('/api/provinces/:id/evolution', authenticateToken, async (req, res) => {
  try {
    const province = await getProvinceById(req.params.id);
    if (!province) {
      return res.status(404).json({ message: 'Province non trouvée' });
    }

    return res.json(await getProvinceEvolution(req.params.id));
  } catch (error) {
    console.error('GET /api/provinces/:id/evolution failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de l\'évolution provinciale' });
  }
});

router.get('/api/provinces/:id/export', authenticateToken, async (req, res) => {
  try {
    const province = await getProvinceById(req.params.id);
    if (!province) {
      return res.status(404).json({ message: 'Province non trouvée' });
    }

    const csvContent = [
      ['Indicateur', 'Valeur'],
      ['Province', province.name],
      ['Bénéficiaires', province.beneficiaires.total],
      ['Femmes bénéficiaires', province.beneficiaires.femmes],
      ['Routes réhabilitées (km)', province.infrastructures.routes.rehabilitees],
      ['Production maïs', province.production['maïs'].actuel],
      ['IODP1 (%)', province.indicateurs.iodp1.actuel],
      ['IODP2 (%)', province.indicateurs.iodp2.actuel],
      ['IODP3 (%)', province.indicateurs.iodp3.actuel],
    ].map((row) => row.join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=province_${province.id}.csv`);
    return res.send(csvContent);
  } catch (error) {
    console.error('GET /api/provinces/:id/export failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de l\'export provincial' });
  }
});


export default router;
