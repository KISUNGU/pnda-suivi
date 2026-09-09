/**
 * Acces aux donnees : valeurs du cadre de resultats.
 *
 * Lit cadre_valeur, introduite par la migration 0006 : une ligne par
 * indicateur x annee x province x sexe, la ou cadre_resultats portait ses
 * valeurs en colonnes prevu_20xx / realise_20xx sans aucune desagregation.
 *
 * Les regles de coherence vivent ici et non dans le script CLI, pour que le
 * terminal et l'API disent exactement la meme chose sur les memes donnees.
 */
import { getDbPool } from './core';
import type { RowDataPacket } from './types';

export interface CadreValeur {
  code_cadre: string;
  annee: number;
  /** null = valeur nationale */
  province: string | null;
  /** null = tous sexes confondus */
  sexe: 'F' | 'M' | null;
  cible: number | null;
  realise: number | null;
  taux: number | null;
  statut: string;
  source: string | null;
}

export interface CadreValeurFiltres {
  code?: string;
  annee?: number;
  /** Impose par le cloisonnement provincial pour un UPEP ou un OT. */
  province?: string;
  sexe?: 'F' | 'M';
}

interface LigneValeur extends RowDataPacket {
  code_cadre: string;
  annee: number;
  province: string | null;
  sexe: 'F' | 'M' | null;
  cible: string | null;
  realise: string | null;
  statut: string;
  source: string | null;
}

const nombre = (v: string | null): number | null => (v === null ? null : Number(v));

const mapValeur = (r: LigneValeur): CadreValeur => {
  const cible = nombre(r.cible);
  const realise = nombre(r.realise);
  return {
    code_cadre: r.code_cadre,
    annee: Number(r.annee),
    province: r.province,
    sexe: r.sexe,
    cible,
    realise,
    // Le taux n'a de sens que si la cible est non nulle : une cible a 0 ferait
    // une division par zero, et une cible absente n'autorise aucun ratio.
    taux: cible !== null && cible !== 0 && realise !== null
      ? Math.round((realise / cible) * 1000) / 10
      : null,
    statut: r.statut,
    source: r.source,
  };
};

/**
 * Valeurs du cadre, filtrees.
 *
 * `province` sert au cloisonnement : quand il est fourni, la reponse ne
 * contient que cette province — les lignes nationales sont exclues, un role
 * provincial n'ayant pas a lire le consolide national.
 */
export const getCadreValeurs = async (filtres: CadreValeurFiltres = {}): Promise<CadreValeur[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filtres.code) { conditions.push('code_cadre = ?'); params.push(filtres.code); }
  if (filtres.annee) { conditions.push('annee = ?'); params.push(filtres.annee); }
  if (filtres.sexe) { conditions.push('sexe = ?'); params.push(filtres.sexe); }
  if (filtres.province) { conditions.push('province = ?'); params.push(filtres.province); }

  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const [rows] = await getDbPool().query<LigneValeur[]>(
    `select code_cadre, annee, province, sexe, cible, realise, statut, source
       from cadre_valeur ${where}
      order by code_cadre, annee, province nulls first, sexe nulls first`,
    params
  );

  return rows.map(mapValeur);
};

export interface CadreIndicateurDetail {
  code: string;
  nom: string;
  libelle_court: string | null;
  unite: string | null;
  est_odp: boolean;
  desagregations: string[];
  valeurs: CadreValeur[];
}

/**
 * Fiche d'un indicateur avec toutes ses valeurs desagregees.
 *
 * Repond a la question que doit pouvoir poser un UNCP : pour cet IODP, quelle
 * est la valeur, par annee, par province, par sexe, et d'ou vient-elle.
 */
export const getCadreIndicateurDetail = async (
  code: string,
  province?: string
): Promise<CadreIndicateurDetail | null> => {
  const [fiches] = await getDbPool().query<Array<RowDataPacket & {
    code: string; nom: string; libelle_court: string | null; unite: string | null;
    est_odp: boolean; code_parent: string | null;
  }>>(
    `select code, nom, libelle_court, unite, est_odp, code_parent
       from cadre_resultats where code = ?`, [code]);

  const fiche = fiches[0];
  if (!fiche) return null;

  // Une ligne « — Femmes » n'est plus un indicateur : c'est une desagregation
  // de sa mere. On repond donc sur la mere, valeurs desagregees comprises.
  const codeReel = fiche.code_parent ?? fiche.code;
  const valeurs = await getCadreValeurs({ code: codeReel, province });

  const [meres] = await getDbPool().query<Array<RowDataPacket & {
    nom: string; libelle_court: string | null; unite: string | null; est_odp: boolean;
  }>>(`select nom, libelle_court, unite, est_odp from cadre_resultats where code = ?`, [codeReel]);
  const mere = meres[0] ?? fiche;

  return {
    code: codeReel,
    nom: mere.nom,
    libelle_court: mere.libelle_court,
    unite: mere.unite,
    est_odp: Boolean(mere.est_odp),
    desagregations: [
      ...new Set(valeurs.filter((v) => v.sexe).map((v) => `sexe:${v.sexe}`)),
      ...new Set(valeurs.filter((v) => v.province).map((v) => `province:${v.province}`)),
    ],
    valeurs,
  };
};

// =============================================================================
// Controle de coherence
// =============================================================================

export type GraviteAnomalie = 'bloquant' | 'a_verifier';

export interface Anomalie {
  regle: string;
  gravite: GraviteAnomalie;
  code_cadre: string;
  annee: number | null;
  detail: string;
}

export interface RapportCadre {
  anomalies: Anomalie[];
  bloquants: number;
  a_verifier: number;
  completude: Array<{ annee: number; renseignes: number; total: number; part: number }>;
}

/** Compare une ligne femmes a sa ligne totale, sur la meme portee geographique. */
const JOINTURE_TOTAL_FEMMES = `
  from cadre_valeur t
  join cadre_valeur f
    on f.code_cadre = t.code_cadre and f.annee = t.annee
   and f.sexe = 'F' and t.sexe is null
   and f.province is not distinct from t.province`;

/**
 * Regles que la base ne peut pas exprimer, parce qu'elles portent sur le sens
 * des valeurs et non sur leur forme.
 */
export const controlerCadre = async (): Promise<RapportCadre> => {
  const pool = getDbPool();
  const anomalies: Anomalie[] = [];

  const ajouter = (
    regle: string, gravite: GraviteAnomalie,
    lignes: Array<Record<string, unknown>>,
    detail: (l: Record<string, unknown>) => string
  ) => {
    for (const l of lignes) {
      anomalies.push({
        regle, gravite,
        code_cadre: String(l.code_cadre ?? l.code ?? ''),
        annee: l.annee != null ? Number(l.annee) : null,
        detail: detail(l),
      });
    }
  };

  // Un sous-total ne peut pas depasser son total. Jamais.
  const [depassements] = await pool.query<Array<Record<string, unknown>>>(
    `select t.code_cadre, t.annee, t.province, t.realise as total, f.realise as femmes
     ${JOINTURE_TOTAL_FEMMES}
      where t.realise is not null and f.realise is not null and f.realise > t.realise
      order by t.code_cadre, t.annee`);
  ajouter('Sous-total femmes superieur au total', 'bloquant', depassements,
    (l) => `${l.code_cadre} ${l.annee}${l.province ? ` (${l.province})` : ''} : femmes ${l.femmes} pour un total de ${l.total}`);

  // Une egalite stricte n'est pas impossible, mais sur des effectifs c'est le
  // symptome classique du copier-coller de tableur.
  const [egaux] = await pool.query<Array<Record<string, unknown>>>(
    `select t.code_cadre, t.annee, t.province, t.realise
     ${JOINTURE_TOTAL_FEMMES}
      where t.realise is not null and f.realise is not null
        and t.realise = f.realise and t.realise <> 0
      order by t.code_cadre, t.annee`);
  ajouter('Sous-total femmes egal au total (recopie probable)', 'bloquant', egaux,
    (l) => `${l.code_cadre} ${l.annee}${l.province ? ` (${l.province})` : ''} : les deux valent ${l.realise}, soit 100 % de femmes`);

  const [ciblesEgales] = await pool.query<Array<Record<string, unknown>>>(
    `select t.code_cadre, t.annee, t.province, t.cible
     ${JOINTURE_TOTAL_FEMMES}
      where t.cible is not null and f.cible is not null and t.cible = f.cible and t.cible <> 0
      order by t.code_cadre, t.annee`);
  ajouter('Cible femmes egale a la cible totale', 'a_verifier', ciblesEgales,
    (l) => `${l.code_cadre} ${l.annee}${l.province ? ` (${l.province})` : ''} : cible ${l.cible} pour les deux, alors qu'ailleurs la cible femmes vaut la moitie`);

  const [depassees] = await pool.query<Array<Record<string, unknown>>>(
    `select code_cadre, annee, sexe, province, cible, realise
       from cadre_valeur
      where annee <= 2025 and cible is not null and realise is not null
        and cible > 0 and realise > cible * 1.5
      order by code_cadre, annee`);
  ajouter('Realise depassant la cible de plus de 50 %', 'a_verifier', depassees,
    (l) => `${l.code_cadre} ${l.annee}${l.sexe ? ` (${l.sexe})` : ''} : ${l.realise} pour une cible de ${l.cible} (+${Math.round((Number(l.realise) / Number(l.cible) - 1) * 100)} %)`);

  // La cible annuelle 2027 a ete supprimee par la migration 0008 pour les
  // indicateurs dont la colonne « 2027 » des fiches portait en realite la cible
  // finale cumulee. Aucune source qui fait foi ne donne la vraie cible 2027 :
  // c'est une lacune a combler, pas une incoherence. Signalee une fois, pas une
  // fois par indicateur.
  //
  // La colonne cadre_resultats.prevu_2027 n'est plus comparee a final_prevu :
  // elle contient justement la cible finale mal rangee, et la confronter a la
  // valeur correcte produirait un faux positif par indicateur.
  const [sans2027] = await pool.query<Array<Record<string, unknown>>>(
    `select count(*)::int as n from cadre_resultats c
      where c.code_parent is null
        and not exists (select 1 from cadre_valeur v
                         where v.code_cadre = c.code and v.annee = 2027
                           and v.province is null and v.sexe is null
                           and v.cible is not null)`);
  const manquants2027 = Number(sans2027[0]?.n ?? 0);
  if (manquants2027 > 0) {
    anomalies.push({
      regle: 'Cible annuelle 2027 inconnue',
      gravite: 'a_verifier',
      code_cadre: '',
      annee: 2027,
      detail: `${manquants2027} indicateurs sans cible 2027. Les fiches rangeaient la cible finale cumulee dans cette colonne ; la vraie cible annuelle n'est donnee par aucune source qui fait foi.`,
    });
  }

  const [provinciales] = await pool.query<Array<Record<string, unknown>>>(
    `select p.code_cadre, p.annee, p.province, p.cible
       from cadre_valeur p
       join cadre_valeur n on n.code_cadre = p.code_cadre and n.annee = p.annee
                          and n.province is null and n.sexe is not distinct from p.sexe
      where p.province is not null and p.cible is not null and n.cible is not null
        and p.cible = n.cible
      order by p.code_cadre, p.annee`);
  ajouter('Cible provinciale identique a la cible nationale', 'a_verifier', provinciales,
    (l) => `${l.code_cadre} ${l.annee} ${l.province} : ${l.cible}, soit la cible nationale rangee sous une province`);

  const [completude] = await pool.query<Array<Record<string, unknown>>>(
    `select annee, count(*) filter (where realise is not null)::int as renseignes, count(*)::int as total
       from cadre_valeur where province is null and sexe is null
      group by annee order by annee`);

  return {
    anomalies,
    bloquants: anomalies.filter((a) => a.gravite === 'bloquant').length,
    a_verifier: anomalies.filter((a) => a.gravite === 'a_verifier').length,
    completude: completude.map((c) => ({
      annee: Number(c.annee),
      renseignes: Number(c.renseignes),
      total: Number(c.total),
      part: Math.round((Number(c.renseignes) / Number(c.total)) * 100),
    })),
  };
};
