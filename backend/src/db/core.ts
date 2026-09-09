/**
 * Noyau d'acces aux donnees : connexion Postgres et couche de compatibilite
 * mysql2 -> pg.
 *
 * Point d'entree unique vers la base. Tout le reste du backend passe par
 * `getDbPool()` et n'a jamais a connaitre le pilote reellement utilise.
 *
 * Ce fichier est le seul endroit ou vit la dette mysql2 : le sortir du shim
 * (Phase 0 du plan) consiste a reecrire les appelants en SQL Postgres natif
 * puis a supprimer `compatQuery`, sans toucher a `getPgPool()`.
 */
import dotenv from 'dotenv';
import path from 'path';
import { Pool as PgPool, type QueryResult } from 'pg';

import type { DbPool, RowDataPacket } from './types';

// .env.local surcharge .env pour le dev local (ignore si les variables sont
// deja definies, ex. Docker). Charge ici parce que ce module est importe en
// premier par la couche donnees : le pool doit voir DATABASE_URL.
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config();

let pool: DbPool | null = null;

const getMissingDatabaseConfig = (): string[] => {
  const missing: string[] = [];

  if (!process.env.DATABASE_URL) {
    missing.push('DATABASE_URL');
  }

  return missing;
};

// Table -> colonne de clé primaire à valeur unique, issue de
// supabase/migrations/0001_schema_initial_from_mysql.sql. Sert uniquement à
// injecter un RETURNING automatique sur les INSERT pour émuler result.insertId
// (mysql2) — les tables à clé composite (notification_reads, ...) sont absentes
// exprès : elles ne s'appuient jamais sur insertId.
const TABLE_PRIMARY_KEY: Record<string, string> = {
  activite: 'id_activite',
  activites: 'id',
  agriculteurs: 'id',
  agriculteurs_cultures: 'id',
  alerte_risque: 'id_alerte',
  beneficiaire: 'id_beneficiaire',
  beneficiaires: 'id',
  cadre_resultats: 'id',
  calculateur_historique: 'id',
  cartes_agriculteurs: 'id',
  cler: 'id_cler',
  composante: 'id_composante',
  cultures: 'id',
  distribution_cartes: 'id',
  donnee_collectee: 'id_donnee',
  formation: 'id_formation',
  formulaire: 'id_formulaire',
  fournisseurs: 'id',
  fournisseurs_semences: 'id',
  grm_plaintes: 'id',
  grm_services: 'id',
  indicateur: 'id_indicateur',
  indicateur_formule: 'id',
  infrastructure: 'id_infrastructure',
  localisation: 'id_localisation',
  organisations: 'id',
  ot_activites: 'id',
  ot_equipiers: 'id',
  ot_profile: 'id',
  ot_rapports: 'id',
  paquets_techniques: 'id',
  participation_formation: 'id_participation',
  periode: 'id_periode',
  plainte_grm: 'id_plainte',
  plan_contingence: 'id_plan',
  powerbi_dashboards: 'id',
  powerbi_reports: 'id',
  prise_en_charge: 'id_prise_charge',
  profil: 'id_profil',
  provinces: 'id',
  province_evolution: 'id',
  ptba_activites: 'id',
  risque: 'id_risque',
  risques: 'id',
  risque_actions: 'id',
  risque_alertes: 'id',
  sig_sites: 'id',
  sous_composante: 'id_sous_composante',
  subvention: 'id_subvention',
  suivi_missions: 'id',
  theme_formation: 'id_theme',
  tranche_subvention: 'id_tranche',
  type_infrastructure: 'id_type_infrastructure',
  type_plainte: 'id_type_plainte',
  type_risque: 'id_type_risque',
  type_subvention: 'id_type_subvention',
  utilisateur: 'id_utilisateur',
  valeur_indicateur: 'id_valeur',
  ventes_semences: 'id',
};

/**
 * Couche de compatibilité mysql2 -> pg. La base a migré vers Postgres/Supabase
 * mais tout ce fichier (et app.ts) appelle encore getDbPool().query()/.execute()
 * avec la syntaxe mysql2 : placeholders `?`, tuple [rows], result.insertId,
 * DESCRIBE table. Plutôt que réécrire des milliers d'appels, ce shim traduit
 * cette syntaxe vers pg à ce point d'entrée unique.
 */
let pgPool: PgPool | null = null;

/** Nombre entier lu dans l'environnement, avec repli si absent ou invalide. */
const entierEnv = (nom: string, defaut: number): number => {
  const brut = Number(process.env[nom]);
  return Number.isFinite(brut) && brut > 0 ? brut : defaut;
};

/**
 * Pool Postgres.
 *
 * DATABASE_URL pointe sur le pooler Supavisor de Supabase. En mode transaction
 * (port 6543), le pooler recycle agressivement les connexions inactives : un
 * pool Node à longue durée de vie garde alors des clients que le serveur a
 * déjà fermés, et la requête suivante meurt en ECONNRESET. D'où le cadrage
 * ci-dessous — peu de connexions, gardées peu de temps, avec keep-alive TCP.
 *
 * Le `pool.on('error')` n'est pas cosmétique : sans lui, une erreur survenant
 * sur un client *inactif* est un évènement 'error' non écouté sur un
 * EventEmitter, ce qui termine le processus Node. C'est la différence entre
 * une requête qui échoue et l'API qui tombe.
 */
function getPgPool(): PgPool {
  if (!pgPool) {
    pgPool = new PgPool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false },
      max: entierEnv('DATABASE_POOL_MAX', 5),
      idleTimeoutMillis: entierEnv('DATABASE_POOL_IDLE_MS', 10_000),
      connectionTimeoutMillis: entierEnv('DATABASE_CONNECT_TIMEOUT_MS', 15_000),
      keepAlive: true,
      keepAliveInitialDelayMillis: 5_000,
      application_name: 'pnda-se-api',
    });

    pgPool.on('error', (erreur) => {
      console.warn('[db] connexion inactive fermée par le serveur :', (erreur as Error).message);
    });
  }

  return pgPool;
}

/**
 * Codes signalant une connexion perdue plutôt qu'une requête fautive. Une
 * requête qui échoue là-dessus a toutes les chances de passer au second essai,
 * sur une connexion neuve.
 */
const CODES_CONNEXION_PERDUE = new Set([
  'ECONNRESET', 'EPIPE', 'ECONNABORTED', 'ETIMEDOUT', 'ERR_STREAM_PREMATURE_CLOSE',
  '08000', '08001', '08003', '08004', '08006', '08P01', '57P01', '57P02', '57P03',
]);

export const estConnexionPerdue = (erreur: unknown): boolean => {
  if (!erreur || typeof erreur !== 'object') {
    return false;
  }

  const code = 'code' in erreur ? String((erreur as { code?: unknown }).code ?? '') : '';
  if (CODES_CONNEXION_PERDUE.has(code)) {
    return true;
  }

  const message = 'message' in erreur ? String((erreur as { message?: unknown }).message ?? '') : '';
  return /Connection terminated|Client has encountered a connection error|server closed the connection/i.test(message);
};

const patienter = (ms: number) => new Promise((resoudre) => setTimeout(resoudre, ms));

// `?` positionnels (mysql2) -> `$1, $2, ...` (pg) : les deux pilotes sont
// strictement positionnels dans l'ordre, la conversion est donc sûre sans
// avoir à réordonner le tableau de paramètres.
function toPgPlaceholders(sql: string): string {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

async function describeTable(table: string): Promise<Array<RowDataPacket & { Field: string }>> {
  const { rows } = await getPgPool().query(
    `select column_name as "Field", data_type as "Type",
            (is_nullable = 'YES') as "Null", column_default as "Default"
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [table]
  );
  return rows as unknown as Array<RowDataPacket & { Field: string }>;
}

function withReturningForInsertId(sql: string): { sql: string; pk: string | null } {
  const match = sql.match(/^INSERT\s+INTO\s+["`]?(\w+)["`]?/i);
  const table = match?.[1];
  const pk = table ? TABLE_PRIMARY_KEY[table] ?? null : null;
  if (pk && !/RETURNING/i.test(sql)) {
    return { sql: `${sql} RETURNING "${pk}"`, pk };
  }
  return { sql, pk: null };
}

type CompatHeader = {
  affectedRows: number;
  insertId: number;
  fieldCount: number;
  info: string;
  serverStatus: number;
  warningStatus: number;
};

async function compatQuery<T = unknown>(sqlText: string, params: unknown[] = []): Promise<[T, unknown[]]> {
  const trimmed = sqlText.trim();

  if (/^DESCRIBE\s/i.test(trimmed)) {
    const table = trimmed.replace(/^DESCRIBE\s+/i, '').replace(/[`";]/g, '').trim();
    const rows = await describeTable(table);
    return [rows as unknown as T, []];
  }

  const isWrite = /^(INSERT|UPDATE|DELETE)\b/i.test(trimmed);
  const { sql: finalSql, pk } = isWrite ? withReturningForInsertId(trimmed) : { sql: trimmed, pk: null };

  const sqlPg = toPgPlaceholders(finalSql);
  let result: QueryResult;

  // Une connexion recyclée par le pooler entre deux requêtes est un incident
  // normal, pas une panne : on retente une fois sur une connexion neuve avant
  // de remonter l'erreur. Seules les pertes de connexion sont retentées — une
  // requête fautive doit échouer tout de suite, pas deux fois.
  for (let essai = 1; ; essai += 1) {
    try {
      result = await getPgPool().query(sqlPg, params as unknown[]);
      break;
    } catch (e) {
      if (essai === 1 && estConnexionPerdue(e)) {
        console.warn(`[db] connexion perdue, nouvelle tentative (${(e as Error).message})`);
        await patienter(120);
        continue;
      }

      // Le SQL final (placeholders convertis) aide énormément au diagnostic des
      // incompatibilités MySQL -> Postgres restantes — gardé volontairement.
      console.error('[db] requête en échec:', sqlPg);
      throw e;
    }
  }

  if (isWrite) {
    const header: CompatHeader = {
      affectedRows: result.rowCount ?? 0,
      insertId: pk ? Number((result.rows?.[0] as Record<string, unknown> | undefined)?.[pk] ?? 0) : 0,
      fieldCount: 0,
      info: '',
      serverStatus: 0,
      warningStatus: 0,
    };
    return [header as unknown as T, []];
  }

  return [result.rows as unknown as T, []];
}

export const getDbPool = (): DbPool => {
  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    throw new Error(`Database configuration is missing: ${missingConfig.join(', ')}`);
  }

  if (!pool) {
    getPgPool(); // instancie/valide la connexion pg dès le premier appel
    pool = { query: compatQuery, execute: compatQuery };
  }

  return pool;
};
