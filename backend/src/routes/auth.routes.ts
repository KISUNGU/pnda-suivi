/**
 * Routes : Auth Routes
 *
 * Extrait de app.ts sans modification des chemins ni des traitements.
 * Le router est monte a la racine : les chemins restent absolus (/api/...).
 */
import { Router, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';

import {
  authenticateUtilisateur,
  getUtilisateurProfile,
  isDatabaseConnectivityError,
} from '../db';
import {
  JWT_SECRET,
} from '../config/env';

const router = Router();

// ==================== AUTH ROUTES ====================

router.post('/api/auth/login', async (req: Request, res: Response) => {
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



export default router;
