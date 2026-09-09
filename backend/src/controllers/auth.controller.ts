// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import {
  authenticateUtilisateur,
  getUtilisateurProfile
} from '../db';

// Pas de valeur de repli : la validation au demarrage est faite dans app.ts.
const JWT_SECRET = process.env.JWT_SECRET as string;

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email et mot de passe requis'
      });
    }

    // 1) Auth via MySQL (bcrypt + migration auto)
    const user = await authenticateUtilisateur(email, password);

    if (!user) {
      return res.status(401).json({
        message: 'Email ou mot de passe incorrect'
      });
    }

    // 2) Profil complet
    const profile = await getUtilisateurProfile(user.id);

    // 3) Token JWT
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        province: user.province
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 4) Réponse finale
    res.json({
      token,
      user: profile
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erreur serveur'
    });
  }
};
