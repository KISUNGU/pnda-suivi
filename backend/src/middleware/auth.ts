/**
 * Authentification et autorisation.
 *
 * authenticateToken verifie la signature du jeton ; requireRole filtre par
 * role et doit toujours etre monte APRES authenticateToken.
 */
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { JWT_SECRET } from '../config/env';

/**
 * Roles applicatifs, alignes sur la table DEFAULT_HOME de frontend/src/App.tsx.
 * 'invite' est le repli quand mapDbRoleToAppRole ne reconnait pas le profil.
 */
export type AppRole = 'super_admin' | 'admin' | 'uncp' | 'upep' | 'ot' | 'partenaire' | 'invite';

export interface TokenUser {
  id: number;
  email: string;
  role: AppRole;
  province: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: unknown;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token invalide ou expiré' });
  }
};

// ==================== AUTORISATION ====================

export const KNOWN_ROLES: readonly AppRole[] = ['super_admin', 'admin', 'uncp', 'upep', 'ot', 'partenaire', 'invite'];

/** Lit l'utilisateur du jeton verifie. Retourne null si la forme est inattendue. */
export const getTokenUser = (req: Request): TokenUser | null => {
  const decoded = (req as AuthenticatedRequest).user as Record<string, unknown> | undefined;

  if (!decoded || typeof decoded !== 'object') {
    return null;
  }

  const role = typeof decoded.role === 'string' && (KNOWN_ROLES as readonly string[]).includes(decoded.role)
    ? (decoded.role as AppRole)
    : 'invite';

  return {
    id: Number(decoded.id ?? 0),
    email: typeof decoded.email === 'string' ? decoded.email : '',
    role,
    province: typeof decoded.province === 'string' && decoded.province.trim() ? decoded.province.trim() : null,
  };
};

/**
 * Restreint une route a une liste de roles. A monter APRES authenticateToken :
 *   app.delete('/api/utilisateurs/:id', authenticateToken, requireRole('super_admin'), handler)
 */
export const requireRole = (...roles: AppRole[]) => (req: Request, res: Response, next: NextFunction) => {
  const user = getTokenUser(req);

  if (!user) {
    return res.status(401).json({ message: 'Authentification requise' });
  }

  if (!roles.includes(user.role)) {
    return res.status(403).json({ message: 'Accès refusé : rôle insuffisant pour cette opération' });
  }

  return next();
};
