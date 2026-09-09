/**
 * Acces aux donnees : Agent collecteur.
 *
 * Extrait de db.ts sans modification des requetes ni des traitements.
 */
import { getDbPool } from './core';
import { toDateOnly, toIsoString } from './helpers';
import type { CountRow, ResultSetHeader, RowDataPacket } from './types';

let agentTablesReady: Promise<void> | null = null;

// ==================== AGENT COLLECTEUR ====================

export interface SqlAgentProfil {
  id: number;
  nom: string;
  prenom: string;
  matricule: string;
  telephone: string;
  email: string;
  province: string;
  territoire: string;
  zones: string[];
  statut: 'actif' | 'inactif';
  date_affectation: string;
  superviseur: string;
}

export interface SqlAgentFormulaire {
  id: string;
  nom: string;
  version: string;
}

export interface SqlAgentCollecte {
  id: number;
  formulaire_id: string;
  formulaire_nom: string;
  donnees: Record<string, unknown>;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  date_collecte: string;
  synced: boolean;
  beneficiaire?: { nom: string; prenom: string; rna_id: string } | null;
}

export interface SqlAgentCollecteInput {
  formulaire_id: string | number;
  id_beneficiaire?: number | null;
  donnees?: Record<string, unknown>;
  latitude?: number | null;
  longitude?: number | null;
  photos?: string[];
}

export interface SqlAgentStats {
  total_collectes: number;
  collectes_semaine: number;
  collectes_mois: number;
  formulaires_disponibles: number;
  beneficiaires_couverts: number;
  taux_synchronisation: number;
  dernier_sync: string | null;
}

interface FormulaireRow extends RowDataPacket {
  id_formulaire: number;
  nom_formulaire: string;
  version: string | null;
}

interface CollecteRow extends RowDataPacket {
  id_donnee: number;
  id_formulaire: number;
  nom_formulaire: string;
  donnees_json: Record<string, unknown> | null;
  latitude: string | number | null;
  longitude: string | number | null;
  photos_urls: string | null;
  est_synchro: boolean;
  date_collecte: string;
  beneficiaire_nom: string | null;
  beneficiaire_prenom: string | null;
  beneficiaire_rna: string | null;
}

const FORMULAIRE_SEED = [
  { nom_formulaire: 'Enquête production agricole', version: '1.0', json_schema: { champs: ['culture', 'superficie', 'production'] } },
  { nom_formulaire: 'Adoption des technologies', version: '1.0', json_schema: { champs: ['technologies', 'satisfaction'] } },
  { nom_formulaire: 'Enregistrement de plainte', version: '1.0', json_schema: { champs: ['type_plainte', 'description'] } },
  { nom_formulaire: 'Évaluation de satisfaction', version: '1.0', json_schema: { champs: ['note', 'commentaire'] } },
];

const ensureAgentTables = async (): Promise<void> => {
  if (!agentTablesReady) {
    agentTablesReady = (async () => {
      // (schéma déjà créé par supabase/migrations/0001_schema_initial_from_mysql.sql — tables "formulaire"/"donnee_collectee")

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM formulaire');
      if (Number(countRows[0]?.total ?? 0) === 0) {
        const placeholders = FORMULAIRE_SEED.map(() => '(?, ?, ?, ?)').join(', ');
        const values = FORMULAIRE_SEED.flatMap((item) => [item.nom_formulaire, item.version, JSON.stringify(item.json_schema), true]);
        await getDbPool().query(
          `INSERT INTO formulaire (nom_formulaire, version, json_schema, est_actif) VALUES ${placeholders}`,
          values,
        );
      }
    })().catch((error) => {
      agentTablesReady = null;
      throw error;
    });
  }

  await agentTablesReady;
};

const mapCollecteRow = (row: CollecteRow): SqlAgentCollecte => ({
  id: row.id_donnee,
  formulaire_id: String(row.id_formulaire),
  formulaire_nom: row.nom_formulaire,
  donnees: row.donnees_json ?? {},
  latitude: row.latitude === null ? null : Number(row.latitude),
  longitude: row.longitude === null ? null : Number(row.longitude),
  photos: row.photos_urls ? JSON.parse(row.photos_urls) : [],
  date_collecte: toIsoString(row.date_collecte) ?? new Date().toISOString(),
  synced: Boolean(row.est_synchro),
  beneficiaire: row.beneficiaire_rna
    ? { nom: row.beneficiaire_nom ?? '', prenom: row.beneficiaire_prenom ?? '', rna_id: row.beneficiaire_rna }
    : null,
});

export const getAgentProfil = async (userId: number): Promise<SqlAgentProfil | null> => {
  const [rows] = await getDbPool().query<Array<RowDataPacket & {
    id: number; nom: string; prenom: string | null; email: string; telephone: string | null;
    province: string | null; territoire: string | null; est_actif: boolean; created_at: string;
  }>>(
    `SELECT u.id_utilisateur AS id, u.nom, u.prenom, u.email, u.telephone,
            l.province, l.territoire, u.est_actif, u.created_at
     FROM utilisateur u
     LEFT JOIN localisation l ON l.id_localisation = u.id_localisation
     WHERE u.id_utilisateur = ?
     LIMIT 1`,
    [userId],
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom ?? '',
    matricule: `AC-${row.id}`,
    telephone: row.telephone ?? '',
    email: row.email,
    province: row.province ?? '',
    territoire: row.territoire ?? '',
    zones: [],
    statut: row.est_actif ? 'actif' : 'inactif',
    date_affectation: toDateOnly(row.created_at),
    superviseur: '',
  };
};

export const getAgentFormulaires = async (): Promise<SqlAgentFormulaire[]> => {
  await ensureAgentTables();

  const [rows] = await getDbPool().query<FormulaireRow[]>(
    'SELECT id_formulaire, nom_formulaire, version FROM formulaire WHERE est_actif = true ORDER BY nom_formulaire ASC',
  );

  return rows.map((row) => ({
    id: String(row.id_formulaire),
    nom: row.nom_formulaire,
    version: row.version ?? '1.0',
  }));
};

export const getAgentCollectes = async (
  userId: number,
  params: { page?: number; limit?: number; synced?: boolean } = {},
): Promise<{ data: SqlAgentCollecte[]; total: number; page: number; totalPages: number }> => {
  await ensureAgentTables();

  const page = Math.max(Number(params.page ?? 0), 0);
  const limit = Math.max(Number(params.limit ?? 10), 1);
  const offset = page * limit;

  const clauses = ['dc.id_agent = ?'];
  const values: Array<string | number | boolean> = [userId];

  if (typeof params.synced === 'boolean') {
    clauses.push('dc.est_synchro = ?');
    values.push(params.synced);
  }

  const whereClause = `WHERE ${clauses.join(' AND ')}`;

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM donnee_collectee dc ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<CollecteRow[]>(
    `SELECT dc.id_donnee, dc.id_formulaire, f.nom_formulaire, dc.donnees_json, dc.latitude, dc.longitude,
            dc.photos_urls, dc.est_synchro, dc.date_collecte,
            b.nom AS beneficiaire_nom, b.prenom AS beneficiaire_prenom, b.rna_id AS beneficiaire_rna
     FROM donnee_collectee dc
     LEFT JOIN formulaire f ON f.id_formulaire = dc.id_formulaire
     LEFT JOIN beneficiaire b ON b.id_beneficiaire = dc.id_beneficiaire
     ${whereClause}
     ORDER BY dc.date_collecte DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map(mapCollecteRow),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const createAgentCollecte = async (userId: number, input: SqlAgentCollecteInput): Promise<SqlAgentCollecte> => {
  await ensureAgentTables();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO donnee_collectee (id_formulaire, id_beneficiaire, id_agent, donnees_json, latitude, longitude, photos_urls, est_synchro, date_collecte)
     VALUES (?, ?, ?, ?, ?, ?, ?, false, NOW())`,
    [
      Number(input.formulaire_id),
      input.id_beneficiaire ?? null,
      userId,
      JSON.stringify(input.donnees ?? {}),
      input.latitude ?? null,
      input.longitude ?? null,
      JSON.stringify(input.photos ?? []),
    ],
  );

  const [rows] = await getDbPool().query<CollecteRow[]>(
    `SELECT dc.id_donnee, dc.id_formulaire, f.nom_formulaire, dc.donnees_json, dc.latitude, dc.longitude,
            dc.photos_urls, dc.est_synchro, dc.date_collecte,
            b.nom AS beneficiaire_nom, b.prenom AS beneficiaire_prenom, b.rna_id AS beneficiaire_rna
     FROM donnee_collectee dc
     LEFT JOIN formulaire f ON f.id_formulaire = dc.id_formulaire
     LEFT JOIN beneficiaire b ON b.id_beneficiaire = dc.id_beneficiaire
     WHERE dc.id_donnee = ?
     LIMIT 1`,
    [result.insertId],
  );

  return mapCollecteRow(rows[0]);
};

export const getAgentBeneficiaires = async (
  params: { search?: string; page?: number; limit?: number } = {},
): Promise<{ data: Array<{ id: number; nom: string; prenom: string; rna_id: string; sexe: string; village: string; telephone: string }>; total: number; page: number; totalPages: number }> => {
  const page = Math.max(Number(params.page ?? 0), 0);
  const limit = Math.max(Number(params.limit ?? 10), 1);
  const offset = page * limit;
  const search = params.search?.trim();

  const whereClause = search ? 'WHERE (b.nom ILIKE ? OR b.prenom ILIKE ? OR b.rna_id ILIKE ?)' : '';
  const values = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM beneficiaire b ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<Array<RowDataPacket & {
    id: number; nom: string; prenom: string | null; rna_id: string | null; sexe: string | null;
    village: string | null; telephone: string | null;
  }>>(
    `SELECT b.id_beneficiaire AS id, b.nom, b.prenom, b.rna_id, b.sexe, l.village, b.telephone
     FROM beneficiaire b
     LEFT JOIN localisation l ON l.id_localisation = b.id_localisation
     ${whereClause}
     ORDER BY b.nom ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map((row) => ({
      id: row.id,
      nom: row.nom,
      prenom: row.prenom ?? '',
      rna_id: row.rna_id ?? '',
      sexe: row.sexe ?? '',
      village: row.village ?? '',
      telephone: row.telephone ?? '',
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getAgentStats = async (userId: number): Promise<SqlAgentStats> => {
  await ensureAgentTables();

  const pool = getDbPool();

  const [[totalRow], [semaineRow], [moisRow], [formsRow], [beneficiairesRow], [syncRow]] = await Promise.all([
    pool.query<CountRow[]>('SELECT COUNT(*) AS total FROM donnee_collectee WHERE id_agent = ?', [userId]),
    pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM donnee_collectee WHERE id_agent = ? AND date_collecte >= NOW() - INTERVAL '7 days'`,
      [userId],
    ),
    pool.query<CountRow[]>(
      `SELECT COUNT(*) AS total FROM donnee_collectee WHERE id_agent = ? AND date_collecte >= date_trunc('month', NOW())`,
      [userId],
    ),
    pool.query<CountRow[]>('SELECT COUNT(*) AS total FROM formulaire WHERE est_actif = true'),
    pool.query<CountRow[]>(
      'SELECT COUNT(DISTINCT id_beneficiaire) AS total FROM donnee_collectee WHERE id_agent = ? AND id_beneficiaire IS NOT NULL',
      [userId],
    ),
    pool.query<Array<RowDataPacket & { total: number; synced: number; last_sync: string | null }>>(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN est_synchro THEN 1 ELSE 0 END) AS synced,
              MAX(CASE WHEN est_synchro THEN date_collecte END) AS last_sync
       FROM donnee_collectee WHERE id_agent = ?`,
      [userId],
    ),
  ]);

  const total = Number(totalRow[0]?.total ?? 0);
  const synced = Number(syncRow[0]?.synced ?? 0);

  return {
    total_collectes: total,
    collectes_semaine: Number(semaineRow[0]?.total ?? 0),
    collectes_mois: Number(moisRow[0]?.total ?? 0),
    formulaires_disponibles: Number(formsRow[0]?.total ?? 0),
    beneficiaires_couverts: Number(beneficiairesRow[0]?.total ?? 0),
    taux_synchronisation: total > 0 ? Math.round((synced / total) * 100) : 0,
    dernier_sync: syncRow[0]?.last_sync ? toIsoString(syncRow[0].last_sync) : null,
  };
};

export const syncAgentCollectes = async (userId: number): Promise<number> => {
  const [result] = await getDbPool().execute<ResultSetHeader>(
    'UPDATE donnee_collectee SET est_synchro = true WHERE id_agent = ? AND est_synchro = false',
    [userId],
  );

  return result.affectedRows ?? 0;
};

