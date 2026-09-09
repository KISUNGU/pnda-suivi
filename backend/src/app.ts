// backend/src/app.ts
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { JWT_SECRET, corsAllowedOrigins } from './config/env';
import {
  authenticateToken,
  getTokenUser,
  requireRole,
  type AppRole,
  type AuthenticatedRequest,
  type TokenUser,
} from './middleware/auth';
import { ROLES_NATIONAUX, refuseHorsProvince, scopeProvince } from './middleware/scope';
import type { RowDataPacket } from './db/types';
import type { AlerteRisque, CountRow } from './types/app.types';
import {
  inferBeneficiaireType,
  mapBeneficiaireToDatabaseRecord,
  mapRisqueToApi,
  parseDocumentsBody,
  parseStringArrayBody,
  splitBeneficiaireName,
} from './utils/mappers';
import {
  authenticateUtilisateur,
  changeUtilisateurPassword,
  createActivite,
  createFournisseur,
  createOrganisation,
  createOTActivite,
  createOTRapport,
  createPlainte,
  createRisque,
  createRisqueAction,
  createUtilisateur,
  deleteActivite,
  deleteFournisseur,
  deleteOrganisation,
  deletePlainte,
  deleteRisque,
  deleteUtilisateur,
  findPowerBIReport,
  buildPowerBIEmbedUrl,
  generatePowerBIEmbedToken,
  getActiviteById,
  getActivites,
  getActivitesStats,
  getAgentBeneficiaires,
  getAgentCollectes,
  getAgentFormulaires,
  getAgentProfil,
  getAgentStats,
  createAgentCollecte,
  syncAgentCollectes,
  getAgriculteursDashboardOverview,
  getAgriculteursSummary,
  getAideContactSupport,
  getAideFAQ,
  getAideGuideById,
  getAideGuides,
  getAideTutorielById,
  getAideTutoriels,
  createAideDemande,
  searchAide,
  getBeneficiaireById,
  getCartesAgriculteurs,
  getCartesAgriculteursStats,
  getBeneficiairesDatabaseStats,
  getBeneficiaireStats,
  getBeneficiaires,
  getCadreResultats,
  getCadreResultatsStats,
  getCadreCiblesProvinciales,
  getPtbaSuivi,
  updatePtbaActivite,
  getProvincesContours,
  setProvinceContour,
  getSigSites,
  createSigSite,
  deleteSigSite,
  getSigTerritoiresDensite,
  getSigOverview,
  getConfiguration,
  updateConfigurationSection,
  getEnvironnementFormations,
  getEnvironnementIndicateurs,
  getEnvironnementPlaintes,
  getEnvironnementStats,
  addEnvironnementFormation,
  getFournisseurById,
  getFournisseurs,
  getFournisseursStats,
  getGrmServices,
  getIndicateurDatabaseById,
  getIndicateursDashboardData,
  getIndicateursDatabase,
  getIndicateursDatabaseStats,
  getLegacyHistorique,
  getLegacyIndicateurById,
  getLegacyIndicateurByCode,
  getLegacyIndicateurs,
  getOrganisationById,
  getOrganisations,
  getOrganisationsStats,
  getOTActivites,
  getOTData,
  getOTEquipiers,
  getOTRapports,
  getPlainteById,
  getPlaintes,
  getPlainteStats,
  getPowerBIDashboardById,
  getPowerBIDashboards,
  getPowerBIReportById,
  getPowerBIReports,
  getPowerBIReportsByCategory,
  getProvinceById,
  getProvinceClassement,
  getProvinceComparaison,
  getProvinceEvolution,
  getProvinces,
  getReadNotificationIds,
  getRisqueActions,
  getRisqueAlertes,
  getRisqueById,
  getRisques,
  getRisquesStats,
  getSuiviMissions,
  getSuiviStats,
  getUtilisateurById,
  getUtilisateurProfile,
  getUtilisateurs,
  getUtilisateursStats,
  getVentesSemences,
  getVentesSemencesStats,
  isDatabaseConnectivityError,
  markNotificationAsRead,
  markNotificationsAsRead,
  markRisqueAlerteAsRead,
  resetUtilisateurPassword,
  SqlCarteAgriculteur,
  updateActivite,
  updateFournisseur,
  updateIndicateurValeur,
  updateOrganisation,
  updateOTActivite,
  updatePlainte,
  updateRisque,
  updateRisqueAction,
  updateUtilisateur,
  updateUtilisateurProfile,
  updateUtilisateurStatut,
  SqlActivite,
  SqlBeneficiaire,
  SqlPlainte,
  SqlVenteSemence,
  getDbPool,
} from './db';

// Le chargement de .env vit dans config/env.ts, importe ci-dessus.

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || corsAllowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS origin not allowed: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
}));
app.use(compression());
app.use(express.json({ limit: '4mb' })); // les contours GeoJSON des provinces depassent la limite par defaut (100 ko)
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});


// ==================== ROUTES ====================

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date(), message: 'API PNDA opérationnelle' });
});

app.get('/api/dashboard/beneficiaires-summary', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const summary = await getAgriculteursSummary();
    res.json(summary);
  } catch (error) {
    console.error('GET /api/dashboard/beneficiaires-summary failed', error);

    const message = error instanceof Error ? error.message : 'Erreur de connexion à la base de données';

    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({
        message: 'Connexion à la base de données indisponible pour les bénéficiaires RNA',
        details: message,
      });
    }

    return res.status(500).json({
      message: 'Erreur lors du chargement des bénéficiaires RNA',
    });
  }
});

app.get('/api/dashboard/rna-overview', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getAgriculteursDashboardOverview());
  } catch (error) {
    console.error('GET /api/dashboard/rna-overview failed', error);

    const message = error instanceof Error ? error.message : 'Erreur de connexion à la base de données';

    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({
        message: 'Connexion à la base de données indisponible pour le tableau de bord RNA',
        details: message,
      });
    }

    return res.status(500).json({
      message: 'Erreur lors du chargement du tableau de bord RNA',
    });
  }
});

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    // Auth via MySQL (bcrypt + migration auto)
    const user = await authenticateUtilisateur(
      String(email).trim().toLowerCase(),
      String(password)
    );

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Profil complet
    const profile = await getUtilisateurProfile(user.id);

    // Les controles de role s'appuient sur le champ `role` du jeton. Un compte
    // sans profil retombe sur 'invite' et se verra refuser la plupart des
    // routes : on le signale au lieu de laisser diagnostiquer des 403 opaques.
    if (user.role === 'invite') {
      console.warn(
        `[auth] ${user.email} se connecte avec le role 'invite' : profil absent ou non reconnu en base. ` +
        `Acces refuse sur la plupart des routes. Verifier utilisateur.id_profil.`
      );
    }

    if ((user.role === 'upep' || user.role === 'ot') && !user.province) {
      console.warn(
        `[auth] ${user.email} a le role '${user.role}' sans province : le cloisonnement provincial ` +
        `ne s'applique pas a ce compte. Verifier utilisateur.id_localisation.`
      );
    }

    // Token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        province: user.province,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: profile,
    });

  } catch (error) {
    console.error(error);

    // Plus de fallback → message propre
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({
        message: 'Base de données indisponible. Impossible de vérifier les identifiants.',
      });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});


// ==================== BÉNÉFICIAIRES ROUTES ====================

app.get('/api/beneficiaires', authenticateToken, async (req, res) => {
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

app.get('/api/beneficiaires/stats', authenticateToken, async (_req, res) => {
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

app.get('/api/beneficiaires/cartes', authenticateToken, async (req, res) => {
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

app.get('/api/beneficiaires/cartes/stats', authenticateToken, async (req, res) => {
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

app.get('/api/beneficiaires/ventes-semences', authenticateToken, async (req, res) => {
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

app.get('/api/beneficiaires/ventes-semences/stats', authenticateToken, async (req, res) => {
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

app.get('/api/beneficiaires/:id(\\d+)', authenticateToken, async (req, res) => {
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

app.post('/api/beneficiaires', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

app.put('/api/beneficiaires/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

app.delete('/api/beneficiaires/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), (_req, res) => {
  res.status(405).json({ message: 'Le registre RNA est accessible en lecture seule depuis cette application' });
});

// ==================== INDICATEURS ROUTES ====================

app.get('/api/indicateurs/iodp', authenticateToken, async (_req, res) => {
  try {
    res.json(await getLegacyIndicateurs({ type: 'iodp' }));
  } catch (error) {
    console.error('GET /api/indicateurs/iodp failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs IODP' });
  }
});

app.get('/api/indicateurs/ir', authenticateToken, async (_req, res) => {
  try {
    res.json(await getLegacyIndicateurs({ type: 'ir' }));
  } catch (error) {
    console.error('GET /api/indicateurs/ir failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs IR' });
  }
});

app.get('/api/indicateurs', authenticateToken, async (_req, res) => {
  try {
    res.json(await getLegacyIndicateurs());
  } catch (error) {
    console.error('GET /api/indicateurs failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs' });
  }
});

app.get('/api/indicateurs/composante/:composanteId', authenticateToken, async (req, res) => {
  try {
    const composanteId = Number.parseInt(req.params.composanteId, 10);
    res.json(await getLegacyIndicateurs({ composanteId }));
  } catch (error) {
    console.error('GET /api/indicateurs/composante failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les indicateurs par composante' });
  }
});

app.get('/api/indicateurs/:indicateurId(\\d+)', authenticateToken, async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    const indicateur = await getLegacyIndicateurById(indicateurId);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json(indicateur);
  } catch (error) {
    console.error('GET /api/indicateurs/:indicateurId failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer cet indicateur' });
  }
});

app.post('/api/indicateurs/:indicateurId(\\d+)/calculer', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    const { valeur } = req.body;
    const indicateur = await getLegacyIndicateurById(indicateurId);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }

    const resultat = valeur !== undefined && valeur !== null && valeur !== ''
      ? Number.parseFloat(String(valeur))
      : 0;
    const progression = indicateur.cible > 0 ? (resultat / indicateur.cible) * 100 : 0;

    return res.json({ valeur: resultat, progression });
  } catch (error) {
    console.error('POST /api/indicateurs/:indicateurId/calculer failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de calculer cet indicateur' });
  }
});

app.put('/api/indicateurs/:indicateurId(\\d+)/valeur', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    const { valeur, periode } = req.body;
    const indicateur = await updateIndicateurValeur(indicateurId, Number(valeur), periode);

    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }

    return res.json({
      message: `Indicateur ${indicateurId} mis a jour avec la valeur ${valeur} pour la periode ${periode ?? '2025'}`,
      success: true,
    });
  } catch (error) {
    console.error('PUT /api/indicateurs/:indicateurId/valeur failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de mettre a jour la valeur de l\'indicateur' });
  }
});

app.get('/api/indicateurs/:indicateurId(\\d+)/historique', authenticateToken, async (req, res) => {
  try {
    const indicateurId = Number.parseInt(req.params.indicateurId, 10);
    res.json(await getLegacyHistorique(indicateurId));
  } catch (error) {
    console.error('GET /api/indicateurs/:indicateurId/historique failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer l\'historique de l\'indicateur' });
  }
});

app.get('/api/indicateurs/dashboard', authenticateToken, async (_req, res) => {
  try {
    res.json(await getIndicateursDashboardData());
  } catch (error) {
    console.error('GET /api/indicateurs/dashboard failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer le dashboard des indicateurs' });
  }
});

// ==================== GRM ROUTES ====================

app.get('/api/grm/plaintes', authenticateToken, async (req, res) => {
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

app.get('/api/grm/stats', authenticateToken, async (_req, res) => {
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

app.get('/api/grm/plaintes/:id(\\d+)', authenticateToken, async (req, res) => {
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

app.get('/api/grm/services', authenticateToken, async (_req, res) => {
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

// ==================== RISQUES ROUTES ====================
app.get('/api/risques', authenticateToken, async (req, res) => {
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

app.get('/api/risques/stats', authenticateToken, async (_req, res) => {
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

app.get('/api/risques/alertes', authenticateToken, async (_req, res) => {
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

app.put('/api/risques/alertes/:id(\\d+)/lue', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.get('/api/risques/:id(\\d+)/actions', authenticateToken, async (req, res) => {
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

app.post('/api/risques/:id(\\d+)/actions', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.put('/api/risques/:risqueId(\\d+)/actions/:actionId(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.get('/api/risques/:id(\\d+)', authenticateToken, async (req, res) => {
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

app.post('/api/risques', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.put('/api/risques/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.delete('/api/risques/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

// ==================== CADRE DES RÉSULTATS ====================

app.get('/api/cadre-resultats', authenticateToken, async (req, res) => {
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

app.get('/api/cadre-resultats/stats', authenticateToken, async (_req, res) => {
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
app.get('/api/cadre-resultats/cibles-provinciales', authenticateToken, async (_req, res) => {
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

// backend/src/app.ts - Ajouter après les routes risques

// ==================== POWER BI ROUTES ====================
// Token d'embed mocké
const generateMockToken = (reportId: string) => {
  return {
    token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MTE4MDQ4MDB9.${reportId}`,
    expiration: new Date(Date.now() + 3600000).toISOString(),
  };
};

// A REMPLACER


app.get('/api/powerbi/reports', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getPowerBIReports());
  } catch (error) {
    console.error('GET /api/powerbi/reports failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des rapports Power BI' });
  }
});

app.get('/api/powerbi/reports/category/:category', authenticateToken, async (req, res) => {
  try {
    return res.json(await getPowerBIReportsByCategory(req.params.category));
  } catch (error) {
    console.error('GET /api/powerbi/reports/category/:category failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des rapports par catégorie' });
  }
});

app.get('/api/powerbi/dashboards', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getPowerBIDashboards());
  } catch (error) {
    console.error('GET /api/powerbi/dashboards failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des dashboards Power BI' });
  }
});

app.get('/api/powerbi/dashboards/:id', authenticateToken, async (req, res) => {
  try {
    const dashboard = await getPowerBIDashboardById(req.params.id);

    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard non trouvé' });
    }

    return res.json(dashboard);
  } catch (error) {
    console.error('GET /api/powerbi/dashboards/:id failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du dashboard Power BI' });
  }
});

app.get('/api/powerbi/embed/:reportId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestedReportId = String(req.params.reportId ?? '').trim();

    if (!requestedReportId) {
      return res.status(400).json({ message: 'Identifiant de rapport manquant' });
    }

    const report = await findPowerBIReport(requestedReportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    const embedToken = await generatePowerBIEmbedToken(report.report_id, report.dataset_id);

    return res.json({
      reportId: report.report_id,
      reportName: report.name,
      embedUrl: buildPowerBIEmbedUrl(report.report_id),
      token: embedToken.token,
      expiration: embedToken.expiration,
      mode: 'embed',
    });
  } catch (error) {
    console.error('GET /api/powerbi/embed/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({
      message: "Erreur lors de la génération de la configuration d'embed",
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/powerbi/token/:reportId', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'partenaire'), async (req, res) => {
  try {
    const requestedReportId = String(req.params.reportId ?? '').trim();

    if (!requestedReportId) {
      return res.status(400).json({ message: 'Identifiant de rapport manquant' });
    }

    const report = await findPowerBIReport(requestedReportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    return res.json(await generatePowerBIEmbedToken(report.report_id, report.dataset_id));
  } catch (error) {
    console.error('POST /api/powerbi/token/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({
      message: 'Erreur lors de la génération du token Power BI',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/powerbi/refresh/:datasetId', authenticateToken, requireRole('super_admin', 'admin', 'uncp'), async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.datasetId);
    const datasetId = report?.datasetId ?? req.params.datasetId;

    return res.json({
      message: `Rafraîchissement du dataset ${datasetId} initié`,
      status: 'processing',
    });
  } catch (error) {
    console.error('POST /api/powerbi/refresh/:datasetId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du rafraîchissement du dataset Power BI' });
  }
});

app.post('/api/powerbi/export/:reportId', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'partenaire'), async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 24 Tf 100 700 Td (Rapport PNDA - ${report.reportId}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000210 00000 n
trailer << /Size 5 /Root 1 0 R >>
startxref
299
%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_${report.reportId}.pdf`);
    return res.send(Buffer.from(pdfContent));
  } catch (error) {
    console.error('POST /api/powerbi/export/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: "Erreur lors de l'export du rapport Power BI" });
  }
});

app.post('/api/powerbi/export/:reportId/ppt', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'partenaire'), async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename=rapport_${report.reportId}.pptx`);
    return res.send(Buffer.from('Mock PPT content'));
  } catch (error) {
    console.error('POST /api/powerbi/export/:reportId/ppt failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: "Erreur lors de l'export PPT du rapport Power BI" });
  }
});

app.get('/api/powerbi/reports/:reportId', authenticateToken, async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }
    return res.json(report);
  } catch (error) {
    console.error('GET /api/powerbi/reports/:reportId failed', error);   

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du rapport Power BI' });
  }
});

app.get('/api/powerbi/embed/:reportId', authenticateToken, async (req, res) => {
  try {
    const report = await getPowerBIReportById(req.params.reportId);
    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    const token = generateMockToken(report.reportId);

    return res.json({
      reportId: report.reportId,
      reportName: report.name,
      embedUrl: report.embedUrl,
      token: token.token,
      expiration: token.expiration,
    });
  } catch (error) {
    console.error('GET /api/powerbi/embed/:reportId failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de la génération de la configuration d\'embed' });
  }
});




app.get('/api/provinces', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvinces());
  } catch (error) {
    console.error('GET /api/provinces failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des provinces' });
  }
});

app.get('/api/provinces/classement', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvinceClassement());
  } catch (error) {
    console.error('GET /api/provinces/classement failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement du classement provincial' });
  }
});

app.get('/api/provinces/comparaison', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvinceComparaison());
  } catch (error) {
    console.error('GET /api/provinces/comparaison failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de la comparaison provinciale' });
  }
});

/**
 * Contours GeoJSON des provinces pour la cartographie (SIG).
 */
app.get('/api/provinces/contours', authenticateToken, async (_req, res) => {
  try {
    return res.json(await getProvincesContours());
  } catch (error) {
    console.error('GET /api/provinces/contours failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des contours' });
  }
});

/**
 * Import du contour officiel d'une province (GeoJSON Polygon/MultiPolygon, WGS84).
 */
app.put('/api/provinces/:id/contour', authenticateToken, requireRole('super_admin', 'admin', 'uncp'), async (req, res) => {
  try {
    const geometry = req.body?.geometry;
    if (!geometry || typeof geometry !== 'object' || !['Polygon', 'MultiPolygon'].includes((geometry as { type?: string }).type ?? '')) {
      return res.status(400).json({ message: 'GeoJSON attendu : geometrie Polygon ou MultiPolygon (WGS84)' });
    }

    const ok = await setProvinceContour(String(req.params.id), geometry);
    if (!ok) {
      return res.status(404).json({ message: 'Province introuvable' });
    }

    return res.json({ ok: true });
  } catch (error) {
    console.error('PUT /api/provinces/:id/contour failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement du contour' });
  }
});

// ==================== SIG / GÉOSPATIAL ROUTES ====================

/** Synthèse SIG : sites du projet et couverture géographique du RNA. */
app.get('/api/sig/overview', authenticateToken, async (_req, res) => {
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
app.get('/api/sig/sites', authenticateToken, async (req, res) => {
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

app.post('/api/sig/sites', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.delete('/api/sig/sites/:id', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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
app.get('/api/sig/territoires', authenticateToken, async (req, res) => {
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

app.get('/api/provinces/:id', authenticateToken, async (req, res) => {
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

app.get('/api/provinces/:id/data', authenticateToken, async (req, res) => {
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

app.get('/api/provinces/:id/evolution', authenticateToken, async (req, res) => {
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

app.get('/api/provinces/:id/export', authenticateToken, async (req, res) => {
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

// ==================== FOURNISSEURS ROUTES ====================

app.get('/api/fournisseurs', authenticateToken, async (req, res) => {
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

app.get('/api/fournisseurs/stats', authenticateToken, async (_req, res) => {
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

app.get('/api/fournisseurs/:id(\\d+)', authenticateToken, async (req, res) => {
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

app.post('/api/fournisseurs', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.put('/api/fournisseurs/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.delete('/api/fournisseurs/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

// ==================== ORGANISATIONS ROUTES ====================

app.get('/api/organisations', authenticateToken, async (req, res) => {
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

app.get('/api/organisations/stats', authenticateToken, async (_req, res) => {
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

app.get('/api/organisations/:id(\\d+)', authenticateToken, async (req, res) => {
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

app.post('/api/organisations', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.put('/api/organisations/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.delete('/api/organisations/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

// ==================== ACTIVITÉS ROUTES ====================

app.get('/api/activites', authenticateToken, async (req, res) => {
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

app.get('/api/activites/stats', authenticateToken, async (_req, res) => {
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

app.get('/api/activites/:id(\\d+)', authenticateToken, async (req, res) => {
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

app.post('/api/activites', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.put('/api/activites/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

app.delete('/api/activites/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

// ==================== UTILISATEURS ROUTES ====================

app.get('/api/utilisateurs', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const payload = await getUtilisateurs({
      search: req.query.search ? String(req.query.search) : undefined,
      role: req.query.role ? String(req.query.role) : undefined,
      province: scopeProvince(req),
      statut: req.query.statut ? String(req.query.statut) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    return res.json({ ...payload, page: req.query.page ? Number(req.query.page) : 0 });
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/utilisateurs/:id(\\d+)', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const utilisateurId = Number(req.params.id);

    if (!Number.isInteger(utilisateurId) || utilisateurId <= 0) {
      return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
    }

    const utilisateur = await getUtilisateurById(utilisateurId);

    if (!utilisateur) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json(utilisateur);
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/utilisateurs/stats', authenticateToken, requireRole('super_admin'), async (_req, res) => {
  try {
    const stats = await getUtilisateursStats();
    return res.json(stats);
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.get('/api/utilisateurs/roles', authenticateToken, (_req, res) => {
  res.json([
    { id: 'admin', nom: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités', permissions: ['*'], niveau: 100 },
    { id: 'uncp', nom: 'UNCP', description: 'Coordination nationale du programme', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'rapports', 'admin'], niveau: 80 },
    { id: 'upep', nom: 'UPEP', description: 'Unités provinciales d\'exécution du programme', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'], niveau: 60 },
    { id: 'ot', nom: 'Opérateur Technique', description: 'Collecte terrain et suivi des bénéficiaires', permissions: ['collecte', 'beneficiaires', 'rapports_terrain'], niveau: 50 },
    { id: 'partenaire', nom: 'Partenaire', description: 'Accès aux rapports et tableaux de bord', permissions: ['dashboard', 'rapports'], niveau: 40 },
    { id: 'invite', nom: 'Invité', description: 'Accès limité en lecture seule', permissions: ['dashboard'], niveau: 20 },
  ]);
});

app.get('/api/utilisateurs/permissions', authenticateToken, (_req, res) => {
  res.json([
    { id: 'dashboard', nom: 'Tableau de bord', module: 'Dashboard', description: 'Accès aux dashboards' },
    { id: 'indicateurs', nom: 'Indicateurs', module: 'Indicateurs', description: 'Gestion des indicateurs' },
    { id: 'beneficiaires', nom: 'Bénéficiaires', module: 'Bénéficiaires', description: 'Gestion des bénéficiaires' },
    { id: 'collecte', nom: 'Collecte', module: 'Collecte', description: 'Saisie et collecte de données' },
    { id: 'rapports', nom: 'Rapports', module: 'Rapports', description: 'Consultation des rapports' },
    { id: 'rapports_terrain', nom: 'Rapports terrain', module: 'Rapports', description: 'Rapports des opérations terrain' },
    { id: 'admin', nom: 'Administration', module: 'Admin', description: 'Gestion des utilisateurs et configuration' },
  ]);
});

app.post('/api/utilisateurs', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const created = await createUtilisateur({
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email,
      telephone: req.body.telephone,
      role: req.body.role,
      statut: req.body.statut ?? 'Actif',
      province: req.body.province,
      territoire: req.body.territoire,
      niveau: req.body.niveau,
      composante: req.body.composante,
      password: req.body.password,
    });

    return res.status(201).json(created);
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.post('/api/utilisateurs/:id(\\d+)/reset-password', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const utilisateurId = Number(req.params.id);

    if (!Number.isInteger(utilisateurId) || utilisateurId <= 0) {
      return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
    }

    const success = await resetUtilisateurPassword(utilisateurId);

    if (!success) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json({ message: 'Mot de passe réinitialisé', temp_password: 'password123' });
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.patch('/api/utilisateurs/:id(\\d+)/statut', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const utilisateurId = Number(req.params.id);

    if (!Number.isInteger(utilisateurId) || utilisateurId <= 0) {
      return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
    }

    const updated = await updateUtilisateurStatut(utilisateurId, String(req.body.statut ?? 'Actif'));

    if (!updated) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json(updated);
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.put('/api/utilisateurs/:id(\\d+)', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const utilisateurId = Number(req.params.id);

    if (!Number.isInteger(utilisateurId) || utilisateurId <= 0) {
      return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
    }

    const updated = await updateUtilisateur(utilisateurId, {
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email,
      telephone: req.body.telephone,
      role: req.body.role,
      statut: req.body.statut,
      province: req.body.province,
      territoire: req.body.territoire,
      niveau: req.body.niveau,
      composante: req.body.composante,
    });

    if (!updated) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json(updated);
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

app.delete('/api/utilisateurs/:id(\\d+)', authenticateToken, requireRole('super_admin'), async (req, res) => {
  try {
    const utilisateurId = Number(req.params.id);

    if (!Number.isInteger(utilisateurId) || utilisateurId <= 0) {
      return res.status(400).json({ message: 'Identifiant utilisateur invalide' });
    }

    const deleted = await deleteUtilisateur(utilisateurId);

    if (!deleted) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    return res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error(error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur serveur' });
  }
});

// ==================== NOTIFICATIONS ROUTES ====================

type AppUser = { id: number; role: string; province: string | null; email?: string };

type NotificationSeverity = 'info' | 'success' | 'warning' | 'danger';
type NotificationType = 'risk' | 'complaint' | 'activity' | 'user';
type NotificationEntityType = 'risque' | 'plainte' | 'activite' | 'utilisateur';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  type: NotificationType;
  category_label: string;
  created_at: string;
  action_url: string;
  province: string | null;
  entity_type: NotificationEntityType;
  entity_id: number;
  read: boolean;
}

interface NotificationSeed extends Omit<AppNotification, 'read'> {
  roles?: string[];
  defaultRead?: boolean;
}

const nationalRoles = new Set(['admin', 'uncp', 'partenaire']);

function getRequestUser(req: AuthenticatedRequest): AppUser | null {
  const decoded = req.user as { id?: number; role?: string; province?: string | null; email?: string } | undefined;

  if (!decoded || typeof decoded.id !== 'number') {
    return null;
  }

  return {
    id: decoded.id,
    role: typeof decoded.role === 'string' ? decoded.role : 'invite',
    province: typeof decoded.province === 'string' ? decoded.province : null,
    email: typeof decoded.email === 'string' ? decoded.email : undefined,
  };
}

function toIsoDate(value?: string | null): string {
  if (!value) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function compareNotificationsByDate(a: { created_at: string }, b: { created_at: string }): number {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function canUserAccessNotification(currentUser: AppUser, notification: NotificationSeed): boolean {
  if (notification.roles && !notification.roles.includes(currentUser.role)) {
    return false;
  }

  if (!notification.province || nationalRoles.has(currentUser.role)) {
    return true;
  }

  return currentUser.province === notification.province;
}

function getComplaintSeverity(plainte: SqlPlainte): NotificationSeverity {
  if (plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS') {
    return 'danger';
  }

  if (plainte.statut === 'en_cours' || plainte.statut === 'referee') {
    return 'warning';
  }

  if (plainte.statut === 'traitee') {
    return 'success';
  }

  return 'info';
}

function getComplaintTitle(plainte: SqlPlainte): string {
  if (plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS') {
    return 'Plainte sensible à traiter';
  }

  switch (plainte.statut) {
    case 'traitee':
      return 'Plainte traitée';
    case 'en_cours':
      return 'Plainte en cours de traitement';
    case 'referee':
      return 'Plainte référée à un service';
    default:
      return 'Nouvelle plainte reçue';
  }
}

async function buildRiskNotificationSeeds(): Promise<NotificationSeed[]> {
  const [alertes, risques] = await Promise.all([getRisqueAlertes(), getRisques()]);
  const risqueById = new Map(risques.map((item) => [item.id, item]));

  return alertes.map((alerte) => {
    const risque = risqueById.get(alerte.id_risque);
    const titleByLevel: Record<AlerteRisque['niveau'], string> = {
      danger: 'Alerte risque critique',
      warning: 'Alerte risque élevée',
      info: 'Mise à jour de risque',
    };

    return {
      id: `risk-alert-${alerte.id}`,
      title: titleByLevel[alerte.niveau],
      message: risque?.province ? `${risque.province} · ${alerte.message}` : alerte.message,
      severity: alerte.niveau,
      type: 'risk',
      category_label: 'Risques',
      created_at: toIsoDate(alerte.date_alerte),
      action_url: '/risques/alertes',
      province: risque?.province ?? null,
      entity_type: 'risque',
      entity_id: alerte.id_risque,
      roles: ['admin', 'uncp', 'upep'],
      defaultRead: alerte.est_lue,
    };
  });
}

async function buildComplaintNotificationSeeds(): Promise<NotificationSeed[]> {
  const { data: plaintes } = await getPlaintes({ page: 0, limit: 10000 });

  return plaintes.map((plainte) => ({
    id: `complaint-${plainte.id}`,
    title: getComplaintTitle(plainte),
    message: `${plainte.numero_plainte} · ${plainte.province} · ${plainte.description}`,
    severity: getComplaintSeverity(plainte),
    type: 'complaint',
    category_label: 'Plaintes',
    created_at: toIsoDate(plainte.date_reception),
    action_url: '/database/plaintes',
    province: plainte.province ?? null,
    entity_type: 'plainte',
    entity_id: plainte.id,
    roles: plainte.est_confidentiel || plainte.type === 'VBG' || plainte.type === 'EAS'
      ? ['admin', 'uncp', 'upep']
      : ['admin', 'uncp', 'upep', 'ot'],
  }));
}

function getActivityCompletionDate(activite: SqlActivite): string {
  return activite.date_fin || activite.updated_at || activite.created_at;
}

async function buildActivityNotificationSeeds(): Promise<NotificationSeed[]> {
  const { data: activites } = await getActivites({ page: 0, limit: 10000 });
  const notifications: NotificationSeed[] = [];

  for (const activite of activites) {
    if (activite.statut === 'en_cours' && activite.taux_execution < 60) {
      notifications.push({
        id: `activity-progress-${activite.id}`,
        title: 'Activité à surveiller',
        message: `${activite.code} · ${activite.titre} n'a atteint que ${activite.taux_execution}% d'exécution.`,
        severity: 'warning',
        type: 'activity',
        category_label: 'Activités',
        created_at: toIsoDate(getActivityCompletionDate(activite)),
        action_url: '/suivi/activites',
        province: activite.province ?? null,
        entity_type: 'activite',
        entity_id: activite.id,
        roles: ['admin', 'uncp', 'upep', 'ot'],
      });
    }

    if (activite.statut === 'terminee') {
      notifications.push({
        id: `activity-complete-${activite.id}`,
        title: 'Activité terminée',
        message: `${activite.code} · ${activite.titre} est clôturée avec ${activite.taux_execution}% d'exécution.`,
        severity: 'success',
        type: 'activity',
        category_label: 'Activités',
        created_at: toIsoDate(getActivityCompletionDate(activite)),
        action_url: '/suivi/activites',
        province: activite.province ?? null,
        entity_type: 'activite',
        entity_id: activite.id,
        roles: ['admin', 'uncp', 'upep', 'ot'],
      });
    }
  }

  return notifications;
}

async function buildUserNotificationSeeds(): Promise<NotificationSeed[]> {
  const notifications: NotificationSeed[] = [];
  const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const { data: utilisateurs } = await getUtilisateurs({ page: 0, limit: 1000 });

  for (const utilisateur of utilisateurs) {
    if (utilisateur.statut === 'inactif') {
      notifications.push({
        id: `user-inactive-${utilisateur.id}`,
        title: 'Utilisateur inactif',
        message: `${utilisateur.prenom} ${utilisateur.nom} (${utilisateur.email}) est actuellement inactif.`,
        severity: 'warning',
        type: 'user',
        category_label: 'Administration',
        created_at: toIsoDate(utilisateur.derniere_connexion || utilisateur.date_creation),
        action_url: '/admin/utilisateurs',
        province: utilisateur.province ?? null,
        entity_type: 'utilisateur',
        entity_id: utilisateur.id,
        roles: ['admin'],
      });
    }

    const lastSeen = utilisateur.derniere_connexion ? new Date(utilisateur.derniere_connexion).getTime() : 0;
    if (utilisateur.statut === 'actif' && lastSeen > 0 && lastSeen < fourteenDaysAgo) {
      notifications.push({
        id: `user-stale-${utilisateur.id}`,
        title: 'Connexion à relancer',
        message: `${utilisateur.prenom} ${utilisateur.nom} n'a pas ouvert la plateforme depuis plus de 14 jours.`,
        severity: 'info',
        type: 'user',
        category_label: 'Administration',
        created_at: toIsoDate(utilisateur.derniere_connexion),
        action_url: '/admin/utilisateurs',
        province: utilisateur.province ?? null,
        entity_type: 'utilisateur',
        entity_id: utilisateur.id,
        roles: ['admin'],
      });
    }
  }

  return notifications;
}

async function buildNotificationsForUser(currentUser: AppUser): Promise<AppNotification[]> {
  const seeds = [
    ...(await buildRiskNotificationSeeds()),
    ...(await buildComplaintNotificationSeeds()),
    ...(await buildActivityNotificationSeeds()),
    ...(await buildUserNotificationSeeds()),
  ];

  const visibleSeeds = seeds
    .filter((notification) => canUserAccessNotification(currentUser, notification))
    .sort(compareNotificationsByDate);

  const readSet = await getReadNotificationIds(
    currentUser.id,
    visibleSeeds.map((notification) => notification.id),
  );

  return visibleSeeds
    .map(({ defaultRead, ...notification }) => ({
      ...notification,
      read: Boolean(defaultRead) || readSet.has(notification.id),
    }));
}

function buildNotificationSummary(notifications: AppNotification[]): {
  total: number;
  unread: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
} {
  const summary = {
    total: notifications.length,
    unread: notifications.filter((notification) => !notification.read).length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
  };

  for (const notification of notifications) {
    summary.byType[notification.type] = (summary.byType[notification.type] ?? 0) + 1;
    summary.bySeverity[notification.severity] = (summary.bySeverity[notification.severity] ?? 0) + 1;
  }

  return summary;
}

app.get('/api/notifications', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    let notifications = await buildNotificationsForUser(currentUser);
    const { type, severity, unreadOnly, limit } = req.query;

    if (type) {
      notifications = notifications.filter((notification) => notification.type === String(type));
    }

    if (severity) {
      notifications = notifications.filter((notification) => notification.severity === String(severity));
    }

    if (String(unreadOnly) === 'true') {
      notifications = notifications.filter((notification) => !notification.read);
    }

    const total = notifications.length;
    const parsedLimit = Number(limit);
    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      notifications = notifications.slice(0, parsedLimit);
    }

    return res.json({
      data: notifications,
      total,
      unread: notifications.filter((notification) => !notification.read).length,
    });
  } catch (error) {
    console.error('GET /api/notifications failed', error);
    return res.status(500).json({ message: 'Erreur lors du chargement des notifications' });
  }
});

app.get('/api/notifications/summary', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    return res.json(buildNotificationSummary(await buildNotificationsForUser(currentUser)));
  } catch (error) {
    console.error('GET /api/notifications/summary failed', error);
    return res.status(500).json({ message: 'Erreur lors du chargement du résumé des notifications' });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    const unreadNotifications = (await buildNotificationsForUser(currentUser)).filter((notification) => !notification.read);

    await markNotificationsAsRead(
      currentUser.id,
      unreadNotifications.map((notification) => notification.id),
    );

    return res.json({
      updated: unreadNotifications.length,
      summary: buildNotificationSummary(await buildNotificationsForUser(currentUser)),
    });
  } catch (error) {
    console.error('PUT /api/notifications/read-all failed', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour des notifications' });
  }
});

app.put('/api/notifications/:id(\\d+)/read', authenticateToken, async (req, res) => {
  const currentUser = getRequestUser(req);
  if (!currentUser) {
    return res.status(401).json({ message: 'Utilisateur non authentifié' });
  }

  try {
    const notificationId = String(req.params.id);
    const notification = (await buildNotificationsForUser(currentUser)).find((item) => item.id === notificationId);

    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }

    await markNotificationAsRead(currentUser.id, notificationId);

    return res.json({ ...notification, read: true });
  } catch (error) {
    console.error('PUT /api/notifications/:id/read failed', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la notification' });
  }
});

// ==================== GRM PLAINTES ROUTES (CRUD complet) ====================

app.post('/api/grm/plaintes', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
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

app.put('/api/grm/plaintes/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
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

app.delete('/api/grm/plaintes/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
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

// ==================== CALCULATEUR ROUTES ====================

// Anciens codes (internes « ODP-x / IR-x » et alias historiques) -> codes réels du
// classeur v6 reformulé (21/08/2026), désormais stockés tels quels dans cadre_resultats.
// Seuls les anciens codes qui ne sont PAS des codes réels actuels figurent ici.
const CALCULATEUR_CODE_ALIASES: Record<string, string> = {
  'ODP-1': 'IODP1.1',
  'ODP-2': 'IODP2.1.1',
  'ODP-2F': 'IODP2.1.2',
  'ODP-3': 'IODP2.3',
  'ODP-4': 'IODP2.4',
  'ODP-5': 'IODP2.5',
  'ODP-6': 'IR2.1.3',
  'ODP-7': 'IR1.1.6.1',
  'ODP-7F': 'IR1.1.6.2',
  'IODP2.1': 'IODP2.1.1',
  'IODP2.2': 'IODP2.1.2',
  'IODP2.6': 'IODP2.5',
  'IODP3.2': 'IR2.1.3',
  'IODP3.3': 'IR1.1.6.1',
  'IODP3.4': 'IR1.1.6.2',
  'IR-1.1.1': 'IR1.1.1.1',
  'IR-1.1.1F': 'IR1.1.1.2',
  'IR-1.1.2': 'IR1.1.2',
  'IR-1.1.3': 'IR1.1.3.1',
  'IR-1.1.3F': 'IR1.1.3.2',
  'IR-1.1.4': 'IR1.1.4',
  'IR-1.1.5': 'IR1.1.5',
  'IR1.1.1': 'IR1.1.1.1',
  'IR-2.1.1': 'IR2.1.1',
  'IR-2.1.2': 'IR2.1.2',
  'IR-2.1.3': 'IR2.1.3',
  'IR-2.1.4': 'IR2.1.4',
  'IR2.1.5': 'IR2.1.3',
  'IR2.1.6': 'IR2.1.4',
  'IR-2.2.1': 'IR2.2.4',
  'IR-2.2.1F': 'IR2.2.4',
  'IR-2.2.2': 'IR2.2.5',
  'IR-2.2.2F': 'IR2.2.5',
  'IR-2.2.3': 'IR2.2.7',
  'IR-2.2.4': 'IR2.2.3',
  'IR-2.2.6': 'IR2.2.6',
  'IR2.2.8': 'IR2.2.5',
  'IR2.2.4.1': 'IR2.2.4',
  'IR2.2.4.2': 'IR2.2.4',
  'IR2.2.5.1': 'IR2.2.5',
  'IR2.2.5.2': 'IR2.2.5',
  'IR-3.1.1': 'IR3.1.2',
  'IR-3.1.2': 'IR3.1.1',
  'IR-3.1.3': 'IR3.1.5',
  'IR-3.1.4': 'IR3.1.3',
  'IR-3.1.5': 'IR3.1.4',
  'IR-3.1.6': 'IR3.1.6',
  'IR3.1.7': 'IR3.1.6',
  'IR-4.1': 'IODP3.1',
  'IR4.1': 'IODP3.1',
};

const CALCULATEUR_CODE_REVERSE_ALIASES = Object.fromEntries(
  Object.entries(CALCULATEUR_CODE_ALIASES).map(([cadreCode, calculateurCode]) => [calculateurCode, cadreCode])
);

function toCalculateurCode(code: string): string {
  return CALCULATEUR_CODE_ALIASES[code] ?? code;
}

function getCalculateurLookupCodes(code: string): string[] {
  return [code, toCalculateurCode(code), CALCULATEUR_CODE_REVERSE_ALIASES[code] ?? code];
}

const calculateurHistorique: unknown[] = [];

// backend/src/app.ts
// Les routes calculateur existent déjà, mais vérifions qu'elles sont complètes

// ==================== CALCULATEUR ROUTES ====================

// Obtenir tous les indicateurs pour le calculateur
app.get('/api/calculateur/indicateurs', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // Récupérer les indicateurs depuis la table cadre_resultats
    const [rows] = await getDbPool().query(`
      SELECT 
        id,
        code,
        nom,
        COALESCE(NULLIF(sous_composante, ''), NULLIF(reference_value, ''), '') as description,
        '' as formule,
        unite,
        frequence,
        est_odp as type,
        composante,
        final_prevu as cible,
        source_donnees,
        methodologie_collecte
      FROM cadre_resultats
      ORDER BY code
    `);
    
    // Transformer les données
    const indicateurs = (rows as any[]).map(row => {
      const code = toCalculateurCode(row.code);

      return {
      id: row.id,
      code,
      nom: row.nom,
      description: row.description || '',
      formule: getFormuleForCode(code),
      unite: row.unite,
      frequence: row.frequence || 'annuelle',
      type: row.type === true || row.type === 1 ? 'iodp' : 'ir',
      composante: row.composante,
      cible: row.cible !== null ? Number(row.cible) : null,
      champs: getChampsForIndicateur(code),
    };
    });
    
    res.json(indicateurs);
  } catch (error) {
    console.error('GET /api/calculateur/indicateurs failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des indicateurs' });
  }
});

// Obtenir un indicateur par code
app.get('/api/calculateur/indicateurs/:code', authenticateToken, async (req: Request, res: Response) => {
  try {
    const lookupCodes = getCalculateurLookupCodes(req.params.code);
    const [rows] = await getDbPool().query(
      `SELECT id, code, nom, COALESCE(NULLIF(sous_composante, ''), NULLIF(reference_value, ''), '') as description, unite, frequence, est_odp as type, composante, final_prevu as cible
       FROM cadre_resultats WHERE code IN (?, ?, ?) LIMIT 1`,
      lookupCodes
    );
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Indicateur non trouvé' });
    }
    
    const row = (rows as any[])[0];
    const code = toCalculateurCode(row.code);
    res.json({
      id: row.id,
      code,
      nom: row.nom,
      description: row.description || '',
      formule: getFormuleForCode(code),
      unite: row.unite,
      frequence: row.frequence || 'annuelle',
      type: row.type === true || row.type === 1 ? 'iodp' : 'ir',
      composante: row.composante,
      cible: row.cible !== null ? Number(row.cible) : null,
      champs: getChampsForIndicateur(code),
    });
  } catch (error) {
    console.error('GET /api/calculateur/indicateurs/:code failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement de l\'indicateur' });
  }
});

// Calculer un indicateur
app.post('/api/calculateur/calculer/:code', authenticateToken, async (req: Request, res: Response) => {
  try {
    const requestedCode = req.params.code;
    const code = toCalculateurCode(requestedCode);
    const donnees = req.body;
    const lookupCodes = getCalculateurLookupCodes(requestedCode);
    
    // Récupérer l'indicateur
    const [rows] = await getDbPool().query(
      `SELECT id, code, nom, unite, final_prevu as cible FROM cadre_resultats WHERE code IN (?, ?, ?) LIMIT 1`,
      lookupCodes
    );
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Indicateur non trouvé' });
    }
    
    const indicateur = (rows as any[])[0];
    let valeur = 0;
    let interpretation = '';
    const recommandations: string[] = [];
    
    // Calcul selon le code
    switch (code) {
      case 'IODP1.1':
        valeur = ((donnees.surplus_t / donnees.surplus_t0) - 1) * 100;
        interpretation = valeur > 0 ? `Hausse de ${valeur.toFixed(1)}% des ventes` : `Baisse de ${Math.abs(valeur).toFixed(1)}% des ventes`;
        break;
      case 'IODP2.1.1':
        valeur = (donnees.nouveaux || 0) + (donnees.cumul_anterieur || 0);
        interpretation = `Total cumulé de ${valeur.toLocaleString()} exploitants ayant adopté les technologies`;
        break;
      case 'IODP2.3':
        valeur = ((donnees.rendement_t - donnees.rendement_t0) / donnees.rendement_t0) * 100;
        interpretation = valeur > 0 ? `Augmentation de ${valeur.toFixed(1)}% du rendement` : `Baisse de ${Math.abs(valeur).toFixed(1)}% du rendement`;
        break;
      case 'IODP2.5':
        valeur = (1 - (donnees.taux_t / donnees.taux_t0)) * 100;
        interpretation = valeur > 0 ? `Réduction de ${valeur.toFixed(1)}% de la mortalité` : 'Augmentation de la mortalité';
        if (valeur < 20) recommandations.push("Renforcer les campagnes de vaccination", "Améliorer la formation des éleveurs");
        break;
      case 'IR1.1.1.1':
        valeur = (donnees.nouveaux || 0) + (donnees.cumul_anterieur || 0);
        interpretation = `${valeur.toLocaleString()} agriculteurs atteints au total`;
        break;
      case 'IR2.1.1':
        valeur = (donnees.routes_nationales || 0) + (donnees.routes_provinciales || 0) + (donnees.routes_desserte || 0);
        interpretation = `${valeur.toLocaleString()} km de routes réhabilitées`;
        break;
      case 'IR3.1.1':
        valeur = (donnees.traitees_delai / donnees.recues) * 100;
        interpretation = `${valeur.toFixed(1)}% des plaintes traitées dans les délais`;
        if (valeur < 80) recommandations.push("Renforcer l'équipe GRM", 'Améliorer les procédures de traitement');
        break;
      case 'IR3.1.6':
        valeur = (donnees.satisfaits / donnees.total_adoptants) * 100;
        interpretation = `${valeur.toFixed(1)}% des fermiers sont satisfaits`;
        break;
      default:
        // Calcul générique: somme de toutes les valeurs
        valeur = Object.values(donnees).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
        interpretation = `Valeur calculée: ${valeur.toLocaleString()} ${indicateur.unite}`;
    }
    
    valeur = Math.round(valeur * 10) / 10;
    const progression = indicateur.cible > 0 ? (valeur / indicateur.cible) * 100 : undefined;
    
    // Sauvegarder le calcul dans l'historique
    await getDbPool().query(
      `INSERT INTO calculateur_historique (user_id, indicateur_code, indicateur_nom, valeur, unite, interpretation, donnees)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [(req as any).user?.id, code, indicateur.nom, valeur, indicateur.unite, interpretation, JSON.stringify(donnees)]
    );
    
    res.json({
      valeur,
      unite: indicateur.unite,
      progression,
      cible: indicateur.cible,
      interpretation,
      recommandations,
    });
  } catch (error) {
    console.error('POST /api/calculateur/calculer/:code failed', error);
    res.status(500).json({ message: 'Erreur lors du calcul' });
  }
});

// Obtenir l'historique des calculs
app.get('/api/calculateur/historique', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [rows] = await getDbPool().query(
      `SELECT id, indicateur_code, indicateur_nom, valeur, unite, interpretation, created_at as date
       FROM calculateur_historique
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 50`,
      [(req as any).user?.id]
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /api/calculateur/historique failed', error);
    // Retourner un tableau vide si la table n'existe pas
    res.json([]);
  }
});

// Sauvegarder un calcul
app.post('/api/calculateur/sauvegarder', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const { code, donnees, resultat } = req.body;
    const [rows] = await getDbPool().query(
      `SELECT nom FROM cadre_resultats WHERE code = ?`,
      [code]
    );
    const nom = (rows as any[])[0]?.nom || code;
    
    await getDbPool().query(
      `INSERT INTO calculateur_historique (user_id, indicateur_code, indicateur_nom, valeur, unite, interpretation, donnees)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [(req as any).user?.id, code, nom, resultat.valeur, resultat.unite, resultat.interpretation, JSON.stringify(donnees)]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('POST /api/calculateur/sauvegarder failed', error);
    res.status(500).json({ message: 'Erreur lors de la sauvegarde' });
  }
});

// Exporter les calculs
app.get('/api/calculateur/export/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const [rows] = await getDbPool().query(
      `SELECT indicateur_code, indicateur_nom, valeur, unite, interpretation, created_at as date
       FROM calculateur_historique
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [(req as any).user?.id]
    );
    
    if (format === 'excel') {
      const csvRows = [
        ['Date', 'Code', 'Indicateur', 'Valeur', 'Unité', 'Interprétation'],
        ...(rows as any[]).map(row => [
          new Date(row.date).toLocaleString('fr-FR'),
          row.indicateur_code,
          row.indicateur_nom,
          row.valeur,
          row.unite,
          row.interpretation,
        ]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=calculs_indicateurs_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/calculateur/export/:format failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});

// Fonctions utilitaires
function getFormuleForCode(code: string): string {
  const normalizedCode = toCalculateurCode(code);
  const formules: Record<string, string> = {
    'IODP1.1': '((Surplus vendu année t / Surplus vendu année référence) − 1) × 100',
    'IODP2.1.1': 'Nouveaux adoptants + Cumul années précédentes',
    'IODP2.1.2': 'Nouvelles femmes adoptantes + Cumul périodes précédentes',
    'IODP2.3': '((Rendement t − Rendement t0) / Rendement t0) × 100',
    'IODP2.4': '((Rendement t − Rendement t0) / Rendement t0) × 100',
    'IODP2.5': '(1 − (Taux mortalité t / Taux mortalité t0)) × 100',
    'IR1.1.1.1': 'Nouveaux bénéficiaires + Cumul périodes précédentes',
    'IR2.1.1': 'Routes nationales + Routes provinciales + Routes de desserte',
    'IR3.1.1': '(Plaintes traitées dans délai / Plaintes reçues) × 100',
    'IR3.1.6': '(Fermiers satisfaits / Total fermiers ayant adopté) × 100',
  };
  return formules[normalizedCode] || 'Valeur saisie';
}

function getChampsForIndicateur(code: string): Array<{ id: string; label: string; type: string; required: boolean }> {
  const normalizedCode = toCalculateurCode(code);
  const champs: Record<string, Array<{ id: string; label: string; type: string; required: boolean }>> = {
    'IODP1.1': [
      { id: 'surplus_t', label: 'Surplus vendu année t (kg)', type: 'number', required: true },
      { id: 'surplus_t0', label: 'Surplus vendu année référence (kg)', type: 'number', required: true },
    ],
    'IODP2.1.1': [
      { id: 'nouveaux', label: 'Nouveaux adoptants cette année', type: 'number', required: true },
      { id: 'cumul_anterieur', label: 'Cumul des années précédentes', type: 'number', required: true },
    ],
    'IODP2.1.2': [
      { id: 'femmes_t', label: 'Nouvelles femmes adoptantes', type: 'number', required: true },
      { id: 'cumul_anterieur', label: 'Cumul périodes précédentes', type: 'number', required: true },
    ],
    'IODP2.3': [
      { id: 'rendement_t', label: 'Rendement année t (kg/ha)', type: 'number', required: true },
      { id: 'rendement_t0', label: 'Rendement année référence (kg/ha)', type: 'number', required: true },
    ],
    'IODP2.4': [
      { id: 'rendement_t', label: 'Rendement année t (kg/ha)', type: 'number', required: true },
      { id: 'rendement_t0', label: 'Rendement année référence (kg/ha)', type: 'number', required: true },
    ],
    'IODP2.5': [
      { id: 'taux_t', label: 'Taux mortalité année t (%)', type: 'number', required: true },
      { id: 'taux_t0', label: 'Taux mortalité année référence (%)', type: 'number', required: true },
    ],
    'IR1.1.1.1': [
      { id: 'nouveaux', label: 'Nouveaux bénéficiaires cette période', type: 'number', required: true },
      { id: 'cumul_anterieur', label: 'Cumul des périodes précédentes', type: 'number', required: true },
    ],
    'IR2.1.1': [
      { id: 'routes_nationales', label: 'Routes nationales (km)', type: 'number', required: true },
      { id: 'routes_provinciales', label: 'Routes provinciales (km)', type: 'number', required: true },
      { id: 'routes_desserte', label: 'Routes de desserte (km)', type: 'number', required: true },
    ],
    'IR3.1.1': [
      { id: 'traitees_delai', label: 'Plaintes traitées dans les délais', type: 'number', required: true },
      { id: 'recues', label: 'Plaintes reçues', type: 'number', required: true },
    ],
    'IR3.1.6': [
      { id: 'satisfaits', label: 'Fermiers satisfaits', type: 'number', required: true },
      { id: 'total_adoptants', label: 'Total fermiers ayant adopté', type: 'number', required: true },
    ],
  };
  return champs[normalizedCode] || [{ id: 'valeur', label: 'Valeur', type: 'number', required: true }];
}

function getChampsPourIndicateur(code: string) {
  const champsMap: Record<string, { id: string; label: string; type: string; required: boolean }[]> = {
    'IODP1.1': [{ id: 'surplus_t', label: 'Surplus vendu année t (kg)', type: 'number', required: true }, { id: 'surplus_t0', label: 'Surplus vendu année référence (kg)', type: 'number', required: true }],
    'IODP2.1.1': [{ id: 'nouveaux', label: 'Nouveaux adoptants cette année', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul des années précédentes', type: 'number', required: true }],
    'IODP2.1.2': [{ id: 'femmes_t', label: 'Nouvelles femmes adoptantes', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul périodes précédentes', type: 'number', required: true }],
    'IODP2.3': [{ id: 'rendement_t', label: 'Rendement maïs année t (kg/ha)', type: 'number', required: true }, { id: 'rendement_t0', label: 'Rendement maïs année référence (kg/ha)', type: 'number', required: true }],
    'IODP2.4': [{ id: 'rendement_t', label: 'Rendement manioc année t (kg/ha)', type: 'number', required: true }, { id: 'rendement_t0', label: 'Rendement manioc année référence (kg/ha)', type: 'number', required: true }],
    'IODP2.5': [{ id: 'taux_t', label: 'Taux mortalité année t (%)', type: 'number', required: true }, { id: 'taux_t0', label: 'Taux mortalité année référence (%)', type: 'number', required: true }],
    'IR1.1.1.1': [{ id: 'nouveaux', label: 'Nouveaux bénéficiaires cette période', type: 'number', required: true }, { id: 'cumul_anterieur', label: 'Cumul des périodes précédentes', type: 'number', required: true }],
    'IR2.1.1': [{ id: 'routes_nationales', label: 'Routes nationales (km)', type: 'number', required: true }, { id: 'routes_provinciales', label: 'Routes provinciales (km)', type: 'number', required: true }, { id: 'routes_desserte', label: 'Routes de desserte (km)', type: 'number', required: true }],
    'IR3.1.1': [{ id: 'traitees_delai', label: 'Plaintes traitées dans les délais', type: 'number', required: true }, { id: 'recues', label: 'Plaintes reçues', type: 'number', required: true }],
    'IR3.1.6': [{ id: 'satisfaits', label: 'Fermiers satisfaits', type: 'number', required: true }, { id: 'total_adoptants', label: 'Total fermiers ayant adopté', type: 'number', required: true }],
  };
  return champsMap[code] || [{ id: 'valeur', label: 'Valeur', type: 'number', required: true }];
}



// ==================== OT (OPÉRATEURS TECHNIQUES) ROUTES ====================
app.get('/api/ot/data', authenticateToken, async (_req, res) => {
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

app.get('/api/ot/activites', authenticateToken, async (req, res) => {
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

app.get('/api/ot/equipiers', authenticateToken, async (req, res) => {
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

app.get('/api/ot/rapports', authenticateToken, async (_req, res) => {
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

app.post('/api/ot/rapports', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
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

app.put('/api/ot/activites/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
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

app.post('/api/ot/activites', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req, res) => {
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

app.get('/api/ot/export/:format', authenticateToken, async (req, res) => {
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

// ==================== DATABASE VIEWS ====================

app.get('/api/database/beneficiaires', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const payload = await getBeneficiaires({
      search: req.query.search ? String(req.query.search) : undefined,
      province: scopeProvince(req),
      sexe: req.query.sexe ? String(req.query.sexe) : undefined,
      type: req.query.type_exploitant ? String(req.query.type_exploitant) : req.query.type ? String(req.query.type) : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });

    res.json({
      ...payload,
      data: payload.data.map(mapBeneficiaireToDatabaseRecord),
    });
  } catch (error) {
    console.error('GET /api/database/beneficiaires failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement de la base bénéficiaires' });
  }
});

app.get('/api/database/beneficiaires/stats', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (_req, res) => {
  try {
    const [baseStats, databaseStats] = await Promise.all([
      getBeneficiaireStats(),
      getBeneficiairesDatabaseStats(),
    ]);

    res.json({
      total: baseStats.total,
      par_sexe: { femmes: baseStats.femmes, hommes: baseStats.hommes },
      par_type: databaseStats.parType,
      par_province: databaseStats.parProvince,
      par_age: { jeunes: 0, adultes: baseStats.total, seniors: 0 },
      par_instruction: {},
      par_technologies: databaseStats.parTechnologies,
      evolution_mensuelle: databaseStats.evolutionMensuelle,
    });
  } catch (error) {
    console.error('GET /api/database/beneficiaires/stats failed', error);

    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }

    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques bénéficiaires' });
  }
});

app.get('/api/indicateurs-database', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    res.json(await getIndicateursDatabase({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      composante: typeof req.query.composante === 'string' ? req.query.composante : undefined,
      frequence: typeof req.query.frequence === 'string' ? req.query.frequence : undefined,
      statut: typeof req.query.statut === 'string' ? req.query.statut : undefined,
      page: Number(req.query.page ?? 0),
      limit: Number(req.query.limit ?? 10),
    }));
  } catch (error) {
    console.error('GET /api/indicateurs-database failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer la base indicateurs' });
  }
});

app.get('/api/indicateurs-database/stats', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (_req, res) => {
  try {
    res.json(await getIndicateursDatabaseStats());
  } catch (error) {
    console.error('GET /api/indicateurs-database/stats failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer les statistiques des indicateurs' });
  }
});

app.get('/api/indicateurs-database/:id(\\d+)', authenticateToken, async (req, res) => {
  try {
    const indicateur = await getIndicateurDatabaseById(Number(req.params.id));
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json(indicateur);
  } catch (error) {
    console.error('GET /api/indicateurs-database/:id failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de recuperer cet indicateur' });
  }
});

app.put('/api/indicateurs-database/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (req.body?.valeurs?.actuelle !== undefined) {
      await updateIndicateurValeur(id, Number(req.body.valeurs.actuelle), req.body?.periode);
    }
    const indicateur = await getIndicateurDatabaseById(id);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json(indicateur);
  } catch (error) {
    console.error('PUT /api/indicateurs-database/:id failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de mettre a jour cet indicateur' });
  }
});

app.put('/api/indicateurs-database/:id(\\d+)/valeur', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { valeur, periode } = req.body;
    const indicateur = await updateIndicateurValeur(id, Number(valeur), periode);
    if (!indicateur) {
      return res.status(404).json({ message: 'Indicateur non trouve' });
    }
    return res.json({ success: true, indicateur });
  } catch (error) {
    console.error('PUT /api/indicateurs-database/:id/valeur failed', error);
    const message = error instanceof Error ? error.message : 'Erreur de connexion a la base de donnees';
    if (message.startsWith('Database configuration is missing') || isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message });
    }
    return res.status(500).json({ message: 'Impossible de mettre a jour la valeur' });
  }
});

app.get('/api/suivi/missions', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const province = scopeProvince(req);
    return res.json(await getSuiviMissions(province));
  } catch (error) {
    console.error('GET /api/suivi/missions failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des missions de suivi' });
  }
});

app.get('/api/suivi/stats', authenticateToken, async (_req: express.Request, res: express.Response) => {
  try {
    return res.json(await getSuiviStats());
  } catch (error) {
    console.error('GET /api/suivi/stats failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques de suivi' });
  }
});

// Statistiques avancées des bénéficiaires
app.get('/api/beneficiaires/advanced-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { saison, province, territoire, secteur, groupement, village, ptech } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    if (ptech) {
      whereClause += ' AND a.ptech = ?';
      params.push(ptech);
    }
    
    // Stats globales
    const [statsRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN a.sexe = 'F' THEN 1 ELSE 0 END) AS total_femmes,
        AVG(CASE WHEN a.age IS NOT NULL AND a.age > 0 THEN a.age END) AS age_moyen,
        SUM(CASE WHEN a.est_chef_menage = true THEN 1 ELSE 0 END) AS chefs_menage,
        SUM(CASE WHEN a.membre_deja_enregistre = true THEN 1 ELSE 0 END) AS membres_deja_enregistres
      FROM agriculteurs a
      ${whereClause}
    `, params);
    
    // Distribution par âge
    const [ageRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.age BETWEEN 18 AND 25 THEN '18-25 ans'
          WHEN a.age BETWEEN 26 AND 40 THEN '26-40 ans'
          WHEN a.age BETWEEN 41 AND 60 THEN '41-60 ans'
          WHEN a.age > 60 THEN 'Plus de 60 ans'
          ELSE 'Non renseigné'
        END AS tranche_age,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY tranche_age
    `, params);
    
    // Distribution par statut matrimonial
    const [matrimonialRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COALESCE(a.situation_matrimoniale, 'Non renseigné') AS situation,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.situation_matrimoniale
    `, params);
    
    // Distribution par niveau d'éducation
    const [educationRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COALESCE(a.niveau_instruction, 'Non renseigné') AS niveau,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.niveau_instruction
    `, params);
    
    // Distribution par type d'activité
    const [activiteRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.ptech LIKE '%elev%' THEN 'Elevage'
          WHEN a.ptech LIKE '%pisc%' THEN 'Aquapisciculture'
          ELSE 'Agriculture'
        END AS type_activite,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY type_activite
    `, params);
    
    // Distribution par superficie de terres
    const [superficieRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.superficie_terres = 0 OR a.superficie_terres IS NULL THEN 'Aucune'
          WHEN a.superficie_terres <= 0.5 THEN '0 - 0.5 ha'
          WHEN a.superficie_terres <= 1 THEN '0.5 - 1 ha'
          WHEN a.superficie_terres <= 2 THEN '1 - 2 ha'
          WHEN a.superficie_terres <= 3 THEN '2 - 3 ha'
          ELSE 'Plus de 3 ha'
        END AS tranche_superficie,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY tranche_superficie
    `, params);
    
    // Top 5 cultures
    const [culturesRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT c.nom, COUNT(*) AS nombre
      FROM agriculteurs_cultures ac
      JOIN cultures c ON c.id = ac.culture_id
      JOIN agriculteurs a ON a.id = ac.agriculteur_id
      ${whereClause}
      GROUP BY c.nom
      ORDER BY nombre DESC
      LIMIT 5
    `, params);
    
    res.json({
      stats: statsRows[0],
      age_distribution: ageRows,
      matrimonial_distribution: matrimonialRows,
      education_distribution: educationRows,
      activite_distribution: activiteRows,
      superficie_distribution: superficieRows,
      top_cultures: culturesRows
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/advanced-stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques avancées' });
  }
});

// Paquets techniques
app.get('/api/beneficiaires/ptech-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { saison, province, territoire, secteur, groupement, village } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    
    // Statistiques des paquets techniques
    const [ptechRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.ptech,
        COUNT(*) AS nombre_producteurs,
        COUNT(DISTINCT a.province) AS provinces_concernees
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.ptech
      ORDER BY nombre_producteurs DESC
    `, params);
    
    // Distribution par province des paquets techniques
    const [ptechProvinceRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.province,
        a.ptech,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY a.province, a.ptech
      ORDER BY a.province, nombre DESC
    `, params);
    
    res.json({
      ptech_distribution: ptechRows,
      ptech_by_province: ptechProvinceRows,
      total_ptech_selectionnes: ptechRows.reduce((sum: number, row: any) => sum + row.nombre_producteurs, 0)
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/ptech-stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques des paquets techniques' });
  }
});

// Distribution des cartes et ventes de semences
app.get('/api/beneficiaires/cartes-ventes-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { saison, province, territoire, secteur, groupement, village } = req.query;

    await Promise.all([
      getCartesAgriculteursStats(),
      getVentesSemencesStats(),
    ]);
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    
    // Statistiques des cartes
    const [carteRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.province,
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS cartes_distribuees,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'en_attente' THEN 1 ELSE 0 END) AS cartes_attente,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'a_imprimer' THEN 1 ELSE 0 END) AS cartes_imprimer
      FROM agriculteurs a
      LEFT JOIN cartes_agriculteurs dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
      GROUP BY a.province
      ORDER BY a.province
    `, params);
    
    // Statistiques des ventes par province
    const [venteProvinceRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        vs.province,
        COUNT(DISTINCT vs.rna_id) AS producteurs_acheteurs,
        COALESCE(SUM(vs.quantite_kg), 0) AS total_kg,
        COALESCE(SUM(vs.montant_usd), 0) AS total_usd,
        0 AS total_cdf
      FROM ventes_semences vs
      JOIN agriculteurs a ON a.farmer_id = CAST(vs.rna_id AS BIGINT)
      ${whereClause}
      GROUP BY vs.province
      ORDER BY vs.province
    `, params);
    
    // Tableau village - cartes - semences
    const [villageRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        a.village,
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS ont_recu_carte,
        COUNT(DISTINCT vs.rna_id) AS ont_achete_semences
      FROM agriculteurs a
      LEFT JOIN cartes_agriculteurs dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      LEFT JOIN ventes_semences vs ON vs.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
      GROUP BY a.village
      ORDER BY a.village
    `, params);
    
    const fournisseurRows: RowDataPacket[] = [];
    
    // Widgets globaux
    const [widgetRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(DISTINCT a.farmer_id) AS producteurs_avec_ptech,
        SUM(CASE WHEN COALESCE(dc.statut_carte, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS ont_recu_carte,
        COUNT(DISTINCT vs.rna_id) AS ont_achete_semences,
        0 AS fournisseurs_actifs,
        COALESCE(SUM(vs.quantite_kg), 0) AS kg_semences_vendues
      FROM agriculteurs a
      LEFT JOIN cartes_agriculteurs dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      LEFT JOIN ventes_semences vs ON vs.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
    `, params);
    
    res.json({
      widgets: widgetRows[0],
      distribution_cartes_par_province: carteRows,
      ventes_semences_par_province: venteProvinceRows,
      suivi_par_village: villageRows,
      ventes_par_fournisseur: fournisseurRows
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/cartes-ventes-stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques des cartes et ventes' });
  }
});

// Liste des filtres disponibles
app.get('/api/beneficiaires/filters', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [saisons] = await getDbPool().query('SELECT DISTINCT saison FROM agriculteurs WHERE saison IS NOT NULL ORDER BY saison DESC');
    const [provinces] = await getDbPool().query('SELECT DISTINCT province FROM agriculteurs WHERE province IS NOT NULL ORDER BY province');
    const [territoires] = await getDbPool().query('SELECT DISTINCT territoire, province FROM agriculteurs WHERE territoire IS NOT NULL ORDER BY province, territoire');
    const [secteurs] = await getDbPool().query('SELECT DISTINCT secteur, province, territoire FROM agriculteurs WHERE secteur IS NOT NULL ORDER BY secteur');
    const [groupements] = await getDbPool().query('SELECT DISTINCT groupement, province, territoire, secteur FROM agriculteurs WHERE groupement IS NOT NULL ORDER BY groupement');
    const [villages] = await getDbPool().query('SELECT DISTINCT village, province, territoire, secteur, groupement FROM agriculteurs WHERE village IS NOT NULL ORDER BY village');
    const [ptechs] = await getDbPool().query('SELECT DISTINCT ptech FROM agriculteurs WHERE ptech IS NOT NULL ORDER BY ptech');
    
    res.json({
      saisons,
      provinces,
      territoires,
      secteurs,
      groupements,
      villages,
      ptechs
    });
  } catch (error) {
    console.error('GET /api/beneficiaires/filters failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des filtres' });
  }
});

// Export des statistiques
app.get('/api/beneficiaires/export/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const { saison, province, territoire, secteur, groupement, village, ptech } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    if (ptech) {
      whereClause += ' AND a.ptech = ?';
      params.push(ptech);
    }
    
    // Récupérer les données
    const [statsRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) AS total_producteurs,
        SUM(CASE WHEN a.sexe = 'F' THEN 1 ELSE 0 END) AS total_femmes,
        AVG(CASE WHEN a.age IS NOT NULL AND a.age > 0 THEN a.age END) AS age_moyen,
        SUM(CASE WHEN a.est_chef_menage = true THEN 1 ELSE 0 END) AS chefs_menage,
        SUM(CASE WHEN a.membre_deja_enregistre = true THEN 1 ELSE 0 END) AS membres_deja_enregistres
      FROM agriculteurs a
      ${whereClause}
    `, params);
    
    const [ageRows] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        CASE 
          WHEN a.age BETWEEN 18 AND 25 THEN '18-25 ans'
          WHEN a.age BETWEEN 26 AND 40 THEN '26-40 ans'
          WHEN a.age BETWEEN 41 AND 60 THEN '41-60 ans'
          WHEN a.age > 60 THEN 'Plus de 60 ans'
          ELSE 'Non renseigné'
        END AS tranche_age,
        COUNT(*) AS nombre
      FROM agriculteurs a
      ${whereClause}
      GROUP BY tranche_age
    `, params);
    
    if (format === 'excel') {
      // Création du CSV
      const csvRows = [
        ['=== STATISTIQUES GLOBALES ==='],
        ['Indicateur', 'Valeur'],
        ['Total producteurs', statsRows[0]?.total_producteurs || 0],
        ['Productrices', statsRows[0]?.total_femmes || 0],
        ['Âge moyen', `${Math.round(statsRows[0]?.age_moyen || 0)} ans`],
        ['Chefs de ménage', statsRows[0]?.chefs_menage || 0],
        ['Membres déjà enregistrés', statsRows[0]?.membres_deja_enregistres || 0],
        [],
        ['=== RÉPARTITION PAR ÂGE ==='],
        ['Tranche d\'âge', 'Nombre'],
        ...ageRows.map((row: any) => [row.tranche_age, row.nombre]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=statistiques_beneficiaires_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/beneficiaires/export failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});

// Export des bénéficiaires détaillés
app.get('/api/beneficiaires/export-beneficiaires/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const { saison, province, territoire, secteur, groupement, village, ptech } = req.query;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    
    if (saison) {
      whereClause += ' AND a.saison = ?';
      params.push(saison);
    }
    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }
    if (territoire) {
      whereClause += ' AND a.territoire = ?';
      params.push(territoire);
    }
    if (secteur) {
      whereClause += ' AND a.secteur = ?';
      params.push(secteur);
    }
    if (groupement) {
      whereClause += ' AND a.groupement = ?';
      params.push(groupement);
    }
    if (village) {
      whereClause += ' AND a.village = ?';
      params.push(village);
    }
    if (ptech) {
      whereClause += ' AND a.ptech = ?';
      params.push(ptech);
    }
    
    const [beneficiaires] = await getDbPool().query(`
      SELECT 
        a.farmer_id AS rna_id,
        a.nom_complet,
        a.sexe,
        a.age,
        a.province,
        a.territoire,
        a.secteur,
        a.groupement,
        a.village,
        a.saison,
        a.ptech,
        a.est_chef_menage,
        a.membre_deja_enregistre,
        a.a_recu_carte,
        COALESCE(dc.statut, 'non_distribuee') AS statut_carte,
        COALESCE(vs.total_kg, 0) AS semences_achetees_kg
      FROM agriculteurs a
      LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
      LEFT JOIN (
        SELECT rna_id, SUM(quantite_kg) AS total_kg
        FROM ventes_semences
        GROUP BY rna_id
      ) vs ON vs.rna_id = CAST(a.farmer_id AS TEXT)
      ${whereClause}
      ORDER BY a.province, a.territoire, a.village, a.nom_complet
    `, params);
    
    if (format === 'excel') {
      const csvRows = [
        ['RNA ID', 'Nom complet', 'Sexe', 'Âge', 'Province', 'Territoire', 'Secteur', 'Groupement', 'Village', 'Saison', 'Paquet technique', 'Chef de ménage', 'Membre déjà enregistré', 'A reçu carte', 'Statut carte', 'Semences achetées (kg)'],
        ...(beneficiaires as any[]).map(b => [
          b.rna_id,
          b.nom_complet,
          b.sexe === 'F' ? 'Femme' : 'Homme',
          b.age || '-',
          b.province,
          b.territoire,
          b.secteur,
          b.groupement,
          b.village,
          b.saison,
          b.ptech,
          b.est_chef_menage ? 'Oui' : 'Non',
          b.membre_deja_enregistre ? 'Oui' : 'Non',
          b.a_recu_carte ? 'Oui' : 'Non',
          b.statut_carte,
          b.semences_achetees_kg,
        ]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=beneficiaires_detail_${new Date().toISOString().split('T')[0]}.csv`);
      res.send(csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/beneficiaires/export-beneficiaires failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});

// ==================== PLANS D'ATTÉNUATION ROUTES ====================

// Obtenir tous les plans d'atténuation avec leurs actions
app.get('/api/plans-attenuation', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [risques] = await getDbPool().query(`
      SELECT 
        id, code, nom, description, categorie, probabilite, impact, niveau, statut,
        plan_attenuation, responsable, date_identification, province, actions_prevues,
        indicateurs_surveillance, dernier_suivi
      FROM risques
      WHERE plan_attenuation IS NOT NULL AND plan_attenuation != ''
      ORDER BY 
        array_position(ARRAY['Critique', 'Élevé', 'Modéré', 'Faible'], niveau),
        date_identification DESC
    `);

    // Pour chaque risque, récupérer ses actions
    const result = await Promise.all((risques as any[]).map(async (risque) => {
      const [actions] = await getDbPool().query(`
        SELECT 
          id, id_risque, action, responsable, date_debut, date_fin, statut, resultat
        FROM risque_actions
        WHERE id_risque = ?
        ORDER BY date_fin ASC, statut ASC
      `, [risque.id]);
      
      return {
        ...risque,
        actions_prevues: risque.actions_prevues ? JSON.parse(risque.actions_prevues) : [],
        indicateurs_surveillance: risque.indicateurs_surveillance ? JSON.parse(risque.indicateurs_surveillance) : [],
        actions: actions
      };
    }));

    res.json(result);
  } catch (error) {
    console.error('GET /api/plans-attenuation failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des plans d\'atténuation' });
  }
});

// Obtenir les statistiques des plans d'atténuation
app.get('/api/plans-attenuation/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const [totalActions] = await getDbPool().query<RowDataPacket[]>(`
      SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'realisee' THEN 1 ELSE 0 END) AS realisees,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) AS en_cours,
        SUM(CASE WHEN statut = 'prevue' THEN 1 ELSE 0 END) AS prevues,
        SUM(CASE WHEN statut = 'abandonnee' THEN 1 ELSE 0 END) AS abandonnees
      FROM risque_actions
    `);
    
    const [risquesAvecPlan] = await getDbPool().query<CountRow[]>(`
      SELECT COUNT(*) AS total
      FROM risques
      WHERE plan_attenuation IS NOT NULL AND plan_attenuation != ''
    `);

    res.json({
      ...(totalActions[0] ?? {}),
      risques_avec_plan: Number(risquesAvecPlan[0]?.total ?? 0),
    });
  } catch (error) {
    console.error('GET /api/plans-attenuation/stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques' });
  }
});

// Mettre à jour le plan d'atténuation d'un risque
app.put('/api/plans-attenuation/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { plan_attenuation, actions_prevues, indicateurs_surveillance } = req.body;
    
    await getDbPool().query(
      `UPDATE risques 
       SET plan_attenuation = COALESCE(?, plan_attenuation),
           actions_prevues = COALESCE(?, actions_prevues),
           indicateurs_surveillance = COALESCE(?, indicateurs_surveillance),
           updated_at = NOW()
       WHERE id = ?`,
      [
        plan_attenuation, 
        actions_prevues ? JSON.stringify(actions_prevues) : null,
        indicateurs_surveillance ? JSON.stringify(indicateurs_surveillance) : null,
        id
      ]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/plans-attenuation/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du plan' });
  }
});

// Ajouter une action à un risque
app.post('/api/plans-attenuation/:id(\\d+)/actions', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const idRisque = Number(req.params.id);
    const { action, responsable, date_debut, date_fin, statut, resultat } = req.body;
    
    const [result] = await getDbPool().query(
      `INSERT INTO risque_actions (id_risque, action, responsable, date_debut, date_fin, statut, resultat)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [idRisque, action, responsable, date_debut, date_fin, statut || 'prevue', resultat || null]
    );
    
    const [newAction] = await getDbPool().query(
      `SELECT * FROM risque_actions WHERE id = ?`,
      [(result as any).insertId]
    );
    
    res.status(201).json((newAction as any[])[0]);
  } catch (error) {
    console.error('POST /api/plans-attenuation/:id/actions failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout de l\'action' });
  }
});

// Mettre à jour une action
app.put('/api/plans-attenuation/actions/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { action, responsable, date_debut, date_fin, statut, resultat } = req.body;
    
    await getDbPool().query(
      `UPDATE risque_actions 
       SET action = COALESCE(?, action),
           responsable = COALESCE(?, responsable),
           date_debut = COALESCE(?, date_debut),
           date_fin = COALESCE(?, date_fin),
           statut = COALESCE(?, statut),
           resultat = COALESCE(?, resultat)
       WHERE id = ?`,
      [action, responsable, date_debut, date_fin, statut, resultat, id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/plans-attenuation/actions/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'action' });
  }
});

// Supprimer une action
app.delete('/api/plans-attenuation/actions/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await getDbPool().query('DELETE FROM risque_actions WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/plans-attenuation/actions/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'action' });
  }
});

// ==================== DISTRIBUTION CARTES ROUTES ====================

// Obtenir la liste des cartes
app.get('/api/cartes-agriculteurs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const province = scopeProvince(req) ?? '';
    const statut = req.query.statut ? String(req.query.statut) : '';
    const page = Math.max(Number(req.query.page ?? 0), 0);
    const limit = Math.max(Number(req.query.limit ?? 10), 1);
    const offset = page * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (a.nom_complet LIKE ? OR CAST(a.farmer_id AS TEXT) LIKE ? OR dc.numero_carte LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }

    if (statut) {
      whereClause += ' AND COALESCE(dc.statut, "a_imprimer") = ?';
      params.push(statut);
    }

    // Compter le total
    const [countRows] = await getDbPool().query<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total ?? 0);

    // Récupérer les données
    const [rows] = await getDbPool().query<any[]>(
      `SELECT 
         a.id,
         CAST(a.farmer_id AS TEXT) AS rna_id,
         a.nom_complet,
         a.sexe,
         a.province,
         a.territoire,
         a.secteur,
         a.groupement,
         a.village,
         1 AS producteur_enregistre,
         COALESCE(dc.statut, 'a_imprimer') AS statut_carte,
         dc.numero_carte,
         dc.date_distribution,
         dc.agent_distribution,
         dc.observations
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}
       ORDER BY a.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const data = rows.map((row) => ({
      id: row.id,
      rna_id: row.rna_id,
      nom_complet: row.nom_complet,
      sexe: row.sexe,
      province: row.province || '',
      territoire: row.territoire || '',
      secteur: row.secteur || '',
      groupement: row.groupement || '',
      village: row.village || '',
      producteur_enregistre: Boolean(row.producteur_enregistre),
      statut_carte: row.statut_carte,
      numero_carte: row.numero_carte || undefined,
      date_distribution: row.date_distribution ? new Date(row.date_distribution).toISOString().split('T')[0] : undefined,
      agent_distribution: row.agent_distribution || undefined,
      observations: row.observations || undefined,
    }));

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET /api/cartes-agriculteurs failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des cartes' });
  }
});

// Obtenir les statistiques des cartes
app.get('/api/cartes-agriculteurs/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const province = scopeProvince(req) ?? '';
    const statut = req.query.statut ? String(req.query.statut) : '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (a.nom_complet LIKE ? OR CAST(a.farmer_id AS TEXT) LIKE ? OR dc.numero_carte LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }

    if (statut) {
      whereClause += ' AND COALESCE(dc.statut, "a_imprimer") = ?';
      params.push(statut);
    }

    const [rows] = await getDbPool().query<any[]>(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) AS producteurs_enregistres,
         SUM(CASE WHEN COALESCE(dc.statut, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS distribuees,
         SUM(CASE WHEN COALESCE(dc.statut, 'a_imprimer') = 'en_attente' THEN 1 ELSE 0 END) AS en_attente,
         SUM(CASE WHEN COALESCE(dc.statut, 'a_imprimer') = 'a_imprimer' THEN 1 ELSE 0 END) AS a_imprimer,
         COUNT(DISTINCT NULLIF(TRIM(a.province), '')) AS provinces
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}`,
      params
    );

    const stats = rows[0];
    res.json({
      total: Number(stats?.total ?? 0),
      producteurs_enregistres: Number(stats?.producteurs_enregistres ?? 0),
      distribuees: Number(stats?.distribuees ?? 0),
      en_attente: Number(stats?.en_attente ?? 0),
      a_imprimer: Number(stats?.a_imprimer ?? 0),
      provinces: Number(stats?.provinces ?? 0),
    });
  } catch (error) {
    console.error('GET /api/cartes-agriculteurs/stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques' });
  }
});

// Mettre à jour le statut d'une carte
app.put('/api/cartes-agriculteurs/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { numero_carte, date_distribution, agent_distribution, statut, observations } = req.body;

    // Vérifier si l'enregistrement existe
    const [existing] = await getDbPool().query<any[]>(
      'SELECT * FROM distribution_cartes WHERE rna_id = (SELECT CAST(farmer_id AS TEXT) FROM agriculteurs WHERE id = ?)',
      [id]
    );

    if (existing.length === 0) {
      // Créer un nouvel enregistrement
      const [agriculteur] = await getDbPool().query<any[]>(
        'SELECT CAST(farmer_id AS TEXT) AS rna_id FROM agriculteurs WHERE id = ?',
        [id]
      );
      
      if (agriculteur.length === 0) {
        return res.status(404).json({ message: 'Agriculteur non trouvé' });
      }

      await getDbPool().query(
        `INSERT INTO distribution_cartes (rna_id, numero_carte, date_distribution, agent_distribution, statut, observations)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [agriculteur[0].rna_id, numero_carte, date_distribution, agent_distribution, statut || 'a_imprimer', observations]
      );
    } else {
      // Mettre à jour l'enregistrement existant
      await getDbPool().query(
        `UPDATE distribution_cartes 
         SET numero_carte = COALESCE(?, numero_carte),
             date_distribution = COALESCE(?, date_distribution),
             agent_distribution = COALESCE(?, agent_distribution),
             statut = COALESCE(?, statut),
             observations = COALESCE(?, observations)
         WHERE rna_id = (SELECT CAST(farmer_id AS TEXT) FROM agriculteurs WHERE id = ?)`,
        [numero_carte, date_distribution, agent_distribution, statut, observations, id]
      );
    }

    res.json({ success: true, message: 'Carte mise à jour avec succès' });
  } catch (error) {
    console.error('PUT /api/cartes-agriculteurs/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la carte' });
  }
});

// Exporter les données
app.get('/api/cartes-agriculteurs/export/:format', authenticateToken, async (req: Request, res: Response) => {
  try {
    const format = req.params.format;
    const search = req.query.search ? String(req.query.search) : '';
    const province = scopeProvince(req) ?? '';
    const statut = req.query.statut ? String(req.query.statut) : '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (a.nom_complet LIKE ? OR CAST(a.farmer_id AS TEXT) LIKE ? OR dc.numero_carte LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    if (province) {
      whereClause += ' AND a.province = ?';
      params.push(province);
    }

    if (statut) {
      whereClause += ' AND COALESCE(dc.statut, "a_imprimer") = ?';
      params.push(statut);
    }

    const [rows] = await getDbPool().query<any[]>(
      `SELECT 
         CAST(a.farmer_id AS TEXT) AS rna_id,
         a.nom_complet,
         a.sexe,
         a.province,
         a.territoire,
         a.secteur,
         a.groupement,
         a.village,
         COALESCE(dc.statut, 'a_imprimer') AS statut_carte,
         dc.numero_carte,
         dc.date_distribution,
         dc.agent_distribution
       FROM agriculteurs a
       LEFT JOIN distribution_cartes dc ON dc.rna_id = CAST(a.farmer_id AS TEXT)
       ${whereClause}
       ORDER BY a.province, a.territoire, a.village, a.nom_complet`,
      params
    );

    if (format === 'excel') {
      const csvRows = [
        ['RNA ID', 'Nom complet', 'Sexe', 'Province', 'Territoire', 'Secteur', 'Groupement', 'Village', 'Statut carte', 'Numéro carte', 'Date distribution', 'Agent distribution'],
        ...rows.map(row => [
          row.rna_id,
          row.nom_complet,
          row.sexe === 'F' ? 'Femme' : 'Homme',
          row.province || '',
          row.territoire || '',
          row.secteur || '',
          row.groupement || '',
          row.village || '',
          row.statut_carte === 'distribuee' ? 'Distribuée' : row.statut_carte === 'en_attente' ? 'En attente' : 'À imprimer',
          row.numero_carte || '',
          row.date_distribution ? new Date(row.date_distribution).toLocaleDateString('fr-FR') : '',
          row.agent_distribution || '',
        ]),
      ];
      
      const csv = csvRows.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=distribution_cartes_${new Date().toISOString().split('T')[0]}.csv`);
      res.send('\uFEFF' + csv);
    } else {
      res.status(400).json({ message: 'Format non supporté' });
    }
  } catch (error) {
    console.error('GET /api/cartes-agriculteurs/export failed', error);
    res.status(500).json({ message: 'Erreur lors de l\'export' });
  }
});

// ==================== ACTIVITÉS DATABASE ROUTES ====================

// Obtenir toutes les activités avec pagination et filtres
app.get('/api/activites-database', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const search = req.query.search ? String(req.query.search) : '';
    const type = req.query.type ? String(req.query.type) : '';
    const statut = req.query.statut ? String(req.query.statut) : '';
    const province = scopeProvince(req) ?? '';
    const page = Math.max(Number(req.query.page ?? 0), 0);
    const limit = Math.max(Number(req.query.limit ?? 10), 1);
    const offset = page * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ' AND (code LIKE ? OR titre LIKE ? OR description LIKE ? OR responsable LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    if (type) {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    if (statut) {
      whereClause += ' AND statut = ?';
      params.push(statut);
    }
    if (province) {
      whereClause += ' AND province = ?';
      params.push(province);
    }

    // Compter le total
    const [countRows] = await getDbPool().query(
      `SELECT COUNT(*) AS total FROM activites ${whereClause}`,
      params
    );
    const total = Number((countRows as any[])[0]?.total ?? 0);

    // Récupérer les données
    const [rows] = await getDbPool().query(
      `SELECT 
        id, code, titre, description, type, composante, statut, priorite,
        date_debut, date_fin, lieu, province, territoire, commune, village,
        responsable, responsable_contact, equipe,
        participants_prevus, participants_reels,
        budget_prevu, budget_reel,
        objectifs, resultats_attendus, resultats_obtenus,
        difficultes, lecons_apprises, documents, photos,
        created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution,
        created_at, updated_at
      FROM activites
      ${whereClause}
      ORDER BY date_debut DESC, id DESC
      LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Transformer les données JSON
    const activites = (rows as any[]).map(row => ({
      ...row,
      objectifs: row.objectifs ? JSON.parse(row.objectifs) : [],
      resultats_attendus: row.resultats_attendus ? JSON.parse(row.resultats_attendus) : [],
      documents: row.documents ? JSON.parse(row.documents) : [],
      photos: row.photos ? JSON.parse(row.photos) : [],
      equipe: row.equipe ? JSON.parse(row.equipe) : [],
    }));

    res.json({ data: activites, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('GET /api/activites-database failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des activités' });
  }
});

// Obtenir les statistiques des activités
app.get('/api/activites-database/stats', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (_req: Request, res: Response) => {
  try {
    const [typeRows] = await getDbPool().query(
      `SELECT type, COUNT(*) AS total FROM activites GROUP BY type`
    );
    
    const [statutRows] = await getDbPool().query(
      `SELECT statut, COUNT(*) AS total FROM activites GROUP BY statut`
    );
    
    const [provinceRows] = await getDbPool().query(
      `SELECT province, COUNT(*) AS total FROM activites GROUP BY province`
    );
    
    const [monthRows] = await getDbPool().query(
      `SELECT to_char(date_debut, 'YYYY-MM') AS mois, COUNT(*) AS total
       FROM activites
       WHERE date_debut IS NOT NULL
       GROUP BY to_char(date_debut, 'YYYY-MM')
       ORDER BY mois DESC
       LIMIT 6`
    );
    
    const [budgetRows] = await getDbPool().query<RowDataPacket[]>(
      `SELECT 
        SUM(budget_prevu) AS budget_total,
        SUM(budget_reel) AS budget_depense,
        SUM(participants_reels) AS participants_total,
        AVG(taux_execution) AS taux_realisation
      FROM activites`
    );
    
    const parType: Record<string, number> = {};
    (typeRows as any[]).forEach(row => { parType[row.type] = row.total; });
    
    const parStatut: Record<string, number> = {};
    (statutRows as any[]).forEach(row => { parStatut[row.statut] = row.total; });
    
    const parProvince: Record<string, number> = {};
    (provinceRows as any[]).forEach(row => { parProvince[row.province] = row.total; });
    
    const parMois = (monthRows as any[]).map(row => ({
      mois: new Date(row.mois).toLocaleString('fr-FR', { month: 'short' }),
      total: row.total
    })).reverse();
    
    const budget = budgetRows[0] ?? {};
    
    res.json({
      total: (typeRows as any[]).reduce((acc, row) => acc + row.total, 0),
      par_type: parType,
      par_statut: parStatut,
      par_province: parProvince,
      par_mois: parMois,
      budget_total: budget?.budget_total || 0,
      budget_depense: budget?.budget_depense || 0,
      participants_total: budget?.participants_total || 0,
      taux_realisation: Math.round(budget?.taux_realisation || 0)
    });
  } catch (error) {
    console.error('GET /api/activites-database/stats failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement des statistiques' });
  }
});

// Obtenir une activité par ID
app.get('/api/activites-database/:id(\\d+)', authenticateToken, async (req: Request, res: Response) => {
  try {
    const [rows] = await getDbPool().query(
      `SELECT * FROM activites WHERE id = ?`,
      [req.params.id]
    );
    
    if ((rows as any[]).length === 0) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }
    
    const row = (rows as any[])[0];
    res.json({
      ...row,
      objectifs: row.objectifs ? JSON.parse(row.objectifs) : [],
      resultats_attendus: row.resultats_attendus ? JSON.parse(row.resultats_attendus) : [],
      documents: row.documents ? JSON.parse(row.documents) : [],
      photos: row.photos ? JSON.parse(row.photos) : [],
      equipe: row.equipe ? JSON.parse(row.equipe) : [],
    });
  } catch (error) {
    console.error('GET /api/activites-database/:id failed', error);
    res.status(500).json({ message: 'Erreur lors du chargement de l\'activité' });
  }
});

// Créer une activité
app.post('/api/activites-database', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const {
      code, titre, description, type, composante, statut, priorite,
      date_debut, date_fin, lieu, province, territoire, commune, village,
      responsable, responsable_contact, equipe,
      participants_prevus, participants_reels,
      budget_prevu, budget_reel,
      objectifs, resultats_attendus, resultats_obtenus,
      difficultes, lecons_apprises, documents, photos,
      created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution
    } = req.body;
    
    // Générer un code si non fourni
    let finalCode = code;
    if (!finalCode) {
      const year = new Date().getFullYear();
      const [lastCode] = await getDbPool().query(
        `SELECT code FROM activites WHERE code LIKE 'ACT-${year}-%' ORDER BY code DESC LIMIT 1`
      );
      let nextNum = 1;
      if ((lastCode as any[]).length > 0) {
        const match = (lastCode as any[])[0].code.match(/\d+$/);
        if (match) nextNum = parseInt(match[0]) + 1;
      }
      finalCode = `ACT-${year}-${String(nextNum).padStart(3, '0')}`;
    }
    
    const [result] = await getDbPool().query(
      `INSERT INTO activites (
        code, titre, description, type, composante, statut, priorite,
        date_debut, date_fin, lieu, province, territoire, commune, village,
        responsable, responsable_contact, equipe,
        participants_prevus, participants_reels,
        budget_prevu, budget_reel,
        objectifs, resultats_attendus, resultats_obtenus,
        difficultes, lecons_apprises, documents, photos,
        created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        finalCode, titre, description, type, composante, statut || 'planifiee', priorite || 'moyenne',
        date_debut, date_fin, lieu, province, territoire, commune, village,
        responsable, responsable_contact, equipe ? JSON.stringify(equipe) : null,
        participants_prevus || 0, participants_reels || null,
        budget_prevu || 0, budget_reel || null,
        objectifs ? JSON.stringify(objectifs) : null,
        resultats_attendus ? JSON.stringify(resultats_attendus) : null,
        resultats_obtenus, difficultes, lecons_apprises,
        documents ? JSON.stringify(documents) : null,
        photos ? JSON.stringify(photos) : null,
        created_by, beneficiaires_cibles || 0, beneficiaires_atteints || 0, taux_execution || 0
      ]
    );
    
    res.status(201).json({ id: (result as any).insertId, code: finalCode });
  } catch (error) {
    console.error('POST /api/activites-database failed', error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'activité' });
  }
});

// Mettre à jour une activité
app.put('/api/activites-database/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const updates = req.body;
    const fields: string[] = [];
    const values: any[] = [];
    
    const allowedFields = [
      'titre', 'description', 'type', 'composante', 'statut', 'priorite',
      'date_debut', 'date_fin', 'lieu', 'province', 'territoire', 'commune', 'village',
      'responsable', 'responsable_contact', 'participants_prevus', 'participants_reels',
      'budget_prevu', 'budget_reel', 'resultats_obtenus', 'difficultes', 'lecons_apprises',
      'created_by', 'beneficiaires_cibles', 'beneficiaires_atteints', 'taux_execution'
    ];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    // Champs JSON
    if (updates.objectifs !== undefined) {
      fields.push('objectifs = ?');
      values.push(JSON.stringify(updates.objectifs));
    }
    if (updates.resultats_attendus !== undefined) {
      fields.push('resultats_attendus = ?');
      values.push(JSON.stringify(updates.resultats_attendus));
    }
    if (updates.equipe !== undefined) {
      fields.push('equipe = ?');
      values.push(JSON.stringify(updates.equipe));
    }
    if (updates.documents !== undefined) {
      fields.push('documents = ?');
      values.push(JSON.stringify(updates.documents));
    }
    if (updates.photos !== undefined) {
      fields.push('photos = ?');
      values.push(JSON.stringify(updates.photos));
    }
    
    if (fields.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à mettre à jour' });
    }
    
    values.push(id);
    await getDbPool().query(
      `UPDATE activites SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('PUT /api/activites-database/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'activité' });
  }
});

// Supprimer une activité
app.delete('/api/activites-database/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const [result] = await getDbPool().query('DELETE FROM activites WHERE id = ?', [req.params.id]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ message: 'Activité non trouvée' });
    }
    res.json({ message: 'Activité supprimée avec succès' });
  } catch (error) {
    console.error('DELETE /api/activites-database/:id failed', error);
    res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
});
// ==================== AGENT COLLECTEUR ROUTES ====================

app.get('/api/agent/profil', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const profil = await getAgentProfil(user.id);
    if (!profil) {
      return res.status(404).json({ message: 'Profil agent introuvable' });
    }
    return res.json(profil);
  } catch (error) {
    console.error('GET /api/agent/profil failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement du profil agent' });
  }
});

app.get('/api/agent/formulaires', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getAgentFormulaires());
  } catch (error) {
    console.error('GET /api/agent/formulaires failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des formulaires' });
  }
});

app.get('/api/agent/collectes', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const synced = typeof req.query.synced === 'string' ? req.query.synced === 'true' : undefined;
    return res.json(await getAgentCollectes(user.id, {
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
      synced,
    }));
  } catch (error) {
    console.error('GET /api/agent/collectes failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des collectes' });
  }
});

app.post('/api/agent/collectes', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const collecte = await createAgentCollecte(user.id, req.body);
    return res.status(201).json(collecte);
  } catch (error) {
    console.error('POST /api/agent/collectes failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la collecte' });
  }
});

app.get('/api/agent/beneficiaires', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.json(await getAgentBeneficiaires({
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      page: req.query.page ? Number(req.query.page) : 0,
      limit: req.query.limit ? Number(req.query.limit) : 10,
    }));
  } catch (error) {
    console.error('GET /api/agent/beneficiaires failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des bénéficiaires' });
  }
});

app.get('/api/agent/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    return res.json(await getAgentStats(user.id));
  } catch (error) {
    console.error('GET /api/agent/stats failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques agent' });
  }
});

app.post('/api/agent/sync', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep', 'ot'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getRequestUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    const synced = await syncAgentCollectes(user.id);
    return res.json({ synced });
  } catch (error) {
    console.error('POST /api/agent/sync failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la synchronisation' });
  }
});

// ==================== ENVIRONNEMENT / VBG ROUTES ====================

app.get('/api/environnement/indicateurs', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementIndicateurs());
  } catch (error) {
    console.error('GET /api/environnement/indicateurs failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des indicateurs environnementaux' });
  }
});

app.get('/api/environnement/plaintes', authenticateToken, async (req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementPlaintes({
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      statut: typeof req.query.statut === 'string' ? req.query.statut : undefined,
      province: scopeProvince(req),
    }));
  } catch (error) {
    console.error('GET /api/environnement/plaintes failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des plaintes' });
  }
});

app.put('/api/environnement/plaintes/:id(\\d+)', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const plainte = await updatePlainte(Number(req.params.id), req.body);
    if (!plainte) {
      return res.status(404).json({ message: 'Plainte non trouvée' });
    }
    return res.json(plainte);
  } catch (error) {
    console.error('PUT /api/environnement/plaintes/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la plainte' });
  }
});

app.get('/api/environnement/formations', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementFormations());
  } catch (error) {
    console.error('GET /api/environnement/formations failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des formations' });
  }
});

app.post('/api/environnement/formations', authenticateToken, requireRole('super_admin', 'admin', 'uncp', 'upep'), async (req: Request, res: Response) => {
  try {
    const formation = await addEnvironnementFormation(req.body);
    return res.status(201).json(formation);
  } catch (error) {
    console.error('POST /api/environnement/formations failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la création de la formation' });
  }
});

app.get('/api/environnement/stats', authenticateToken, async (_req: Request, res: Response) => {
  try {
    return res.json(await getEnvironnementStats());
  } catch (error) {
    console.error('GET /api/environnement/stats failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement des statistiques environnement' });
  }
});

// ==================== AIDE / DOCUMENTATION ROUTES ====================

app.get('/api/aide/guides', authenticateToken, async (_req: Request, res: Response) => {
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

app.get('/api/aide/guides/:id(\\d+)', authenticateToken, async (req: Request, res: Response) => {
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

app.get('/api/aide/faq', authenticateToken, async (_req: Request, res: Response) => {
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

app.get('/api/aide/faq/:categorie', authenticateToken, async (req: Request, res: Response) => {
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

app.get('/api/aide/tutoriels', authenticateToken, async (_req: Request, res: Response) => {
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

app.get('/api/aide/tutoriels/:id(\\d+)', authenticateToken, async (req: Request, res: Response) => {
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

app.get('/api/aide/support', authenticateToken, (_req: Request, res: Response) => {
  return res.json(getAideContactSupport());
});

app.post('/api/aide/demande', authenticateToken, async (req: Request, res: Response) => {
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

app.get('/api/aide/recherche', authenticateToken, async (req: Request, res: Response) => {
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

// ==================== CONFIGURATION ROUTES ====================

app.get('/api/configuration', authenticateToken, requireRole('super_admin'), async (_req: Request, res: Response) => {
  try {
    return res.json(await getConfiguration());
  } catch (error) {
    console.error('GET /api/configuration failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement de la configuration' });
  }
});

app.put('/api/configuration/:section', authenticateToken, requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const section = req.params.section;
    if (!['generale', 'alertes', 'integration', 'provincesActives'].includes(section)) {
      return res.status(400).json({ message: 'Section de configuration invalide' });
    }
    await updateConfigurationSection(section, req.body);
    return res.json({ message: 'Configuration mise à jour avec succès' });
  } catch (error) {
    console.error('PUT /api/configuration/:section failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de la configuration' });
  }
});

// ==================== SUIVI DU PTBA ====================

app.get('/api/ptba/suivi', authenticateToken, async (req: Request, res: Response) => {
  try {
    const annee = req.query.annee ? Number.parseInt(String(req.query.annee), 10) : 2026;
    if (!Number.isFinite(annee)) {
      return res.status(400).json({ message: 'Année invalide' });
    }
    return res.json(await getPtbaSuivi(annee));
  } catch (error) {
    console.error('GET /api/ptba/suivi failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors du chargement du suivi du PTBA' });
  }
});

app.put('/api/ptba/activites/:id', authenticateToken, requireRole('super_admin', 'admin', 'uncp'), async (req: Request, res: Response) => {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ message: 'Identifiant invalide' });
    }
    const input: Record<string, unknown> = {};
    for (const champ of ['prevu', 'realise', 'commentaire'] as const) {
      if (champ in req.body) {
        input[champ] = req.body[champ];
      }
    }
    const updated = await updatePtbaActivite(id, input);
    if (!updated) {
      return res.status(404).json({ message: 'Activité PTBA introuvable' });
    }
    return res.json({ message: 'Activité PTBA mise à jour' });
  } catch (error) {
    console.error('PUT /api/ptba/activites/:id failed', error);
    if (isDatabaseConnectivityError(error)) {
      return res.status(503).json({ message: 'Connexion à la base de données indisponible' });
    }
    return res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'activité PTBA' });
  }
});

// ==================== EXPORT ====================

// L'application est exportee sans etre demarree : le demarrage vit dans
// server.ts. Cette separation permet de monter l'app dans un test ou dans
// l'inventaire des routes sans ouvrir de port.
export default app;
export { app };
