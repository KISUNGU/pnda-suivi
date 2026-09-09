/**
 * Acces aux donnees : Suivi du PTBA.
 *
 * Extrait de db.ts sans modification des requetes ni des traitements.
 */
import { getDbPool } from './core';
import { parseNullableNumber } from './helpers';
import type { ResultSetHeader, RowDataPacket } from './types';

// ==================== SUIVI DU PTBA ====================
// Table ptba_activites créée/chargée par supabase/migrations/0004_cadre_v6_reel_ptba_2026.sql
// (classeur « SUIVI DU PTBA 2026 »). Taux et écarts sont calculés, pas stockés.

export interface SqlPtbaActivite {
  id: number;
  code: string | null;
  activite: string;
  indicateur_realisation: string | null;
  prevu: number | null;
  realise: number | null;
  taux: number | null;
  ecart: number | null;
  commentaire: string | null;
}

export interface SqlPtbaSousComposante {
  sous_composante: string;
  taux_moyen: number | null;
  activites: SqlPtbaActivite[];
}

export interface SqlPtbaComposante {
  composante: string;
  taux_moyen: number | null;
  sous_composantes: SqlPtbaSousComposante[];
}

export interface SqlPtbaSuivi {
  annee: number;
  taux_global: number | null;
  total_activites: number;
  realisees: number;
  en_cours: number;
  non_demarrees: number;
  composantes: SqlPtbaComposante[];
}

const calcPtbaTaux = (prevu: number | null, realise: number | null): number | null => {
  if (prevu === null || prevu <= 0 || realise === null) {
    return null;
  }
  return Math.round((realise / prevu) * 10000) / 100;
};

const moyenneTaux = (activites: SqlPtbaActivite[]): number | null => {
  const taux = activites
    .map((activite) => activite.taux)
    .filter((valeur): valeur is number => valeur !== null);
  if (taux.length === 0) {
    return null;
  }
  return Math.round((taux.reduce((total, valeur) => total + valeur, 0) / taux.length) * 100) / 100;
};

export const getPtbaSuivi = async (annee = 2026): Promise<SqlPtbaSuivi> => {
  const [rows] = await getDbPool().query<Array<RowDataPacket & {
    id: number;
    composante: string;
    sous_composante: string;
    code: string | null;
    activite: string;
    indicateur_realisation: string | null;
    prevu: number | string | null;
    realise: number | string | null;
    commentaire: string | null;
  }>>(
    `SELECT id, composante, sous_composante, code, activite, indicateur_realisation,
            prevu, realise, commentaire
       FROM ptba_activites
      WHERE annee = ?
      ORDER BY ordre ASC`,
    [annee],
  );

  const composantes: SqlPtbaComposante[] = [];
  for (const row of rows) {
    const prevu = parseNullableNumber(row.prevu);
    const realise = parseNullableNumber(row.realise);
    const activite: SqlPtbaActivite = {
      id: row.id,
      code: row.code,
      activite: row.activite,
      indicateur_realisation: row.indicateur_realisation,
      prevu,
      realise,
      taux: calcPtbaTaux(prevu, realise),
      ecart: prevu !== null && realise !== null ? realise - prevu : null,
      commentaire: row.commentaire,
    };

    let composante = composantes[composantes.length - 1];
    if (!composante || composante.composante !== row.composante) {
      composante = { composante: row.composante, taux_moyen: null, sous_composantes: [] };
      composantes.push(composante);
    }
    let sousComposante = composante.sous_composantes[composante.sous_composantes.length - 1];
    if (!sousComposante || sousComposante.sous_composante !== row.sous_composante) {
      sousComposante = { sous_composante: row.sous_composante, taux_moyen: null, activites: [] };
      composante.sous_composantes.push(sousComposante);
    }
    sousComposante.activites.push(activite);
  }

  const toutes: SqlPtbaActivite[] = [];
  for (const composante of composantes) {
    const activitesComposante: SqlPtbaActivite[] = [];
    for (const sousComposante of composante.sous_composantes) {
      sousComposante.taux_moyen = moyenneTaux(sousComposante.activites);
      activitesComposante.push(...sousComposante.activites);
    }
    composante.taux_moyen = moyenneTaux(activitesComposante);
    toutes.push(...activitesComposante);
  }

  const avecTaux = toutes.filter((activite) => activite.taux !== null);
  return {
    annee,
    taux_global: moyenneTaux(toutes),
    total_activites: toutes.length,
    realisees: avecTaux.filter((activite) => (activite.taux ?? 0) >= 100).length,
    en_cours: avecTaux.filter((activite) => (activite.taux ?? 0) > 0 && (activite.taux ?? 0) < 100).length,
    non_demarrees: avecTaux.filter((activite) => (activite.taux ?? 0) === 0).length,
    composantes,
  };
};

export interface PtbaActiviteUpdateInput {
  prevu?: number | null;
  realise?: number | null;
  commentaire?: string | null;
}

export const updatePtbaActivite = async (id: number, input: PtbaActiviteUpdateInput): Promise<boolean> => {
  const updates: string[] = [];
  const values: Array<number | string | null> = [];

  if ('prevu' in input) {
    updates.push('prevu = ?');
    values.push(input.prevu ?? null);
  }
  if ('realise' in input) {
    updates.push('realise = ?');
    values.push(input.realise ?? null);
  }
  if ('commentaire' in input) {
    updates.push('commentaire = ?');
    values.push(input.commentaire ?? null);
  }

  if (updates.length === 0) {
    return false;
  }

  values.push(id);
  const [result] = await getDbPool().query<ResultSetHeader>(
    `UPDATE ptba_activites SET ${updates.join(', ')} WHERE id = ?`,
    values,
  );
  return (result.affectedRows ?? 0) > 0;
};
