/**
 * Cloisonnement provincial.
 *
 * Regle metier centrale du S&E : un UPEP ou un OT ne lit et n'ecrit que dans
 * sa propre province. La valeur portee par le jeton fait autorite sur le
 * parametre de requete, qui reste donc sans effet pour ces roles.
 */
import type { Request } from 'express';

import { getTokenUser, type AppRole } from './auth';

/** Roles autorises a consulter toutes les provinces. */
export const ROLES_NATIONAUX: readonly AppRole[] = ['super_admin', 'admin', 'uncp'];

/**
 * Cloisonnement provincial. Un UPEP ou un OT ne voit que sa propre province :
 * la valeur du jeton ecrase le parametre ?province= de la requete.
 * Retourne undefined pour les roles nationaux (= toutes provinces).
 */
export const scopeProvince = (req: Request): string | undefined => {
  const user = getTokenUser(req);
  const demandee = req.query.province ? String(req.query.province) : undefined;

  if (!user || ROLES_NATIONAUX.includes(user.role)) {
    return demandee;
  }

  return user.province ?? demandee;
};

/**
 * Verifie qu'un role provincial n'ecrit pas hors de sa province.
 * Retourne un message d'erreur, ou null si l'ecriture est permise.
 */
export const refuseHorsProvince = (req: Request, provinceCible: string | null | undefined): string | null => {
  const user = getTokenUser(req);

  if (!user || ROLES_NATIONAUX.includes(user.role) || !user.province || !provinceCible) {
    return null;
  }

  return provinceCible.trim().toLowerCase() === user.province.toLowerCase()
    ? null
    : `Accès refusé : opération limitée à la province ${user.province}`;
};
