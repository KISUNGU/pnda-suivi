// backend/src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'pnda_secret_key_2026';

// Utilisateurs fictifs (à remplacer par base de données)
const users = [
  {
    id: 1,
    nom: 'MUKENDI',
    prenom: 'Jean',
    email: 'admin@pnda.cd',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    province: null,
  },
  {
    id: 2,
    nom: 'KABEYA',
    prenom: 'Marie',
    email: 'uncp@pnda.cd',
    password: bcrypt.hashSync('uncp123', 10),
    role: 'uncp',
    province: null,
  },
  {
    id: 3,
    nom: 'TSHIBOLA',
    prenom: 'Pierre',
    email: 'upep@pnda.cd',
    password: bcrypt.hashSync('upep123', 10),
    role: 'upep',
    province: 'Kwilu',
  },
];

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        province: user.province,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};