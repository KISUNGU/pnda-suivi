/**
 * Petites conversions partagees par les modules d'acces aux donnees.
 *
 * Sans point commun metier : ce sont des utilitaires de lecture des colonnes,
 * regroupes ici pour qu'aucun module de domaine n'ait a importer db.ts et
 * creer un cycle d'imports.
 */

export function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function toDateOnly(value: string | Date | null | undefined): string {
  return toIsoString(value)?.split('T')[0] ?? new Date().toISOString().split('T')[0];
}

/** Nombre optionnel lu dans une colonne : chaine vide et NULL donnent null. */
export const parseNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};
