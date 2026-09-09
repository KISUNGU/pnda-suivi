/**
 * Routes : Utilisateurs Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';

import {
  createUtilisateur,
  deleteUtilisateur,
  getUtilisateurById,
  getUtilisateurs,
  getUtilisateursStats,
  isDatabaseConnectivityError,
  resetUtilisateurPassword,
  updateUtilisateur,
  updateUtilisateurStatut,
} from '../db';
import {
  authenticateToken,
  requireRole,
} from '../middleware/auth';
import {
  scopeProvince,
} from '../middleware/scope';

const router = Router();

// ==================== UTILISATEURS ROUTES ====================

router.get('/api/utilisateurs', authenticateToken, requireRole('super_admin'), async (req, res) => {
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

router.get('/api/utilisateurs/:id(\\d+)', authenticateToken, requireRole('super_admin'), async (req, res) => {
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

router.get('/api/utilisateurs/stats', authenticateToken, requireRole('super_admin'), async (_req, res) => {
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

router.get('/api/utilisateurs/roles', authenticateToken, (_req, res) => {
  res.json([
    { id: 'admin', nom: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités', permissions: ['*'], niveau: 100 },
    { id: 'uncp', nom: 'UNCP', description: 'Coordination nationale du programme', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'rapports', 'admin'], niveau: 80 },
    { id: 'upep', nom: 'UPEP', description: 'Unités provinciales d\'exécution du programme', permissions: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'], niveau: 60 },
    { id: 'ot', nom: 'Opérateur Technique', description: 'Collecte terrain et suivi des bénéficiaires', permissions: ['collecte', 'beneficiaires', 'rapports_terrain'], niveau: 50 },
    { id: 'partenaire', nom: 'Partenaire', description: 'Accès aux rapports et tableaux de bord', permissions: ['dashboard', 'rapports'], niveau: 40 },
    { id: 'invite', nom: 'Invité', description: 'Accès limité en lecture seule', permissions: ['dashboard'], niveau: 20 },
  ]);
});

router.get('/api/utilisateurs/permissions', authenticateToken, (_req, res) => {
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

router.post('/api/utilisateurs', authenticateToken, requireRole('super_admin'), async (req, res) => {
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

router.post('/api/utilisateurs/:id(\\d+)/reset-password', authenticateToken, requireRole('super_admin'), async (req, res) => {
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

router.patch('/api/utilisateurs/:id(\\d+)/statut', authenticateToken, requireRole('super_admin'), async (req, res) => {
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

router.put('/api/utilisateurs/:id(\\d+)', authenticateToken, requireRole('super_admin'), async (req, res) => {
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

router.delete('/api/utilisateurs/:id(\\d+)', authenticateToken, requireRole('super_admin'), async (req, res) => {
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


export default router;
