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
  getRequestUser,
  getTokenUser,
  requireRole,
  type AppUser,
  type AppRole,
  type AuthenticatedRequest,
  type TokenUser,
} from './middleware/auth';
import { ROLES_NATIONAUX, refuseHorsProvince, scopeProvince } from './middleware/scope';
import activitesDatabaseRouter from './routes/activites-database.routes';
import agentRouter from './routes/agent.routes';
import aideRouter from './routes/aide.routes';
import calculateurRouter from './routes/calculateur.routes';
import cartesRouter from './routes/cartes.routes';
import configurationRouter from './routes/configuration.routes';
import databaseViewsRouter from './routes/database-views.routes';
import environnementRouter from './routes/environnement.routes';
import otRouter from './routes/ot.routes';
import plansAttenuationRouter from './routes/plans-attenuation.routes';
import ptbaRouter from './routes/ptba.routes';
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

// ==================== MONTAGE DES ROUTERS PAR DOMAINE ====================

// Les routers sont montes a la racine : chaque fichier declare des chemins
// absolus (/api/...), identiques a ceux qu'ils avaient dans app.ts. L'ordre
// de montage reproduit l'ordre de declaration d'origine.
app.use(calculateurRouter);
app.use(otRouter);
app.use(databaseViewsRouter);
app.use(plansAttenuationRouter);
app.use(cartesRouter);
app.use(activitesDatabaseRouter);
app.use(agentRouter);
app.use(environnementRouter);
app.use(aideRouter);
app.use(configurationRouter);
app.use(ptbaRouter);

// ==================== EXPORT ====================

// L'application est exportee sans etre demarree : le demarrage vit dans
// server.ts. Cette separation permet de monter l'app dans un test ou dans
// l'inventaire des routes sans ouvrir de port.
export default app;
export { app };
