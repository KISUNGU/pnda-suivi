import dotenv from 'dotenv';
import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

dotenv.config();

let pool: Pool | null = null;
let notificationsTableReady: Promise<void> | null = null;

interface CountRow extends RowDataPacket {
  total: number;
}

interface BeneficiaireStatsRow extends RowDataPacket {
  total: number;
  femmes: number;
  hommes: number;
  provinces: number;
}

interface AgriculteurRow extends RowDataPacket {
  id: number;
  farmer_id: number | null;
  province: string | null;
  territoire: string | null;
  secteur: string | null;
  groupement: string | null;
  village: string | null;
  nom_complet: string;
  sexe: string | null;
  saison: string | null;
  ptech: string | null;
  created_at: string | Date | null;
}

interface NotificationReadRow extends RowDataPacket {
  notification_id: string;
}

export interface AgriculteursSummary {
  total: number;
}

export interface SqlBeneficiaire {
  id: number;
  rna_id: string;
  nom_complet: string;
  sexe: 'M' | 'F';
  province: string;
  territoire: string;
  secteur: string;
  groupement: string;
  village: string;
  saison: string;
  ptech: string;
  created_at: string;
}

export interface SqlBeneficiaireFilters {
  search?: string;
  province?: string;
  sexe?: string;
  page?: number;
  limit?: number;
}

export interface SqlBeneficiaireStats {
  total: number;
  femmes: number;
  hommes: number;
  provinces: number;
}

const ensureNotificationsTable = async (): Promise<void> => {
  if (!notificationsTableReady) {
    notificationsTableReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS notification_reads (
          user_id INT NOT NULL,
          notification_id VARCHAR(191) NOT NULL,
          read_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, notification_id),
          INDEX idx_notification_reads_user_id (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    })();
  }

  await notificationsTableReady;
};

const getMissingDatabaseConfig = (): string[] => {
  const missing: string[] = [];

  if (!process.env.DB_USER) {
    missing.push('DB_USER');
  }

  if (!process.env.DB_NAME) {
    missing.push('DB_NAME');
  }

  return missing;
};

export const getDbPool = (): Pool => {
  const missingConfig = getMissingDatabaseConfig();

  if (missingConfig.length > 0) {
    throw new Error(`Database configuration is missing: ${missingConfig.join(', ')}`);
  }

  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  return pool;
};

export const getAgriculteursSummary = async (): Promise<AgriculteursSummary> => {
  const [rows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM agriculteurs');

  return {
    total: Number(rows[0]?.total ?? 0),
  };
};

const normalizeSexe = (value: string | null): 'M' | 'F' => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.startsWith('f') ? 'F' : 'M';
};

const mapAgriculteurRow = (row: AgriculteurRow): SqlBeneficiaire => ({
  id: row.id,
  rna_id: String(row.farmer_id ?? row.id),
  nom_complet: row.nom_complet,
  sexe: normalizeSexe(row.sexe),
  province: row.province ?? '',
  territoire: row.territoire ?? '',
  secteur: row.secteur ?? '',
  groupement: row.groupement ?? '',
  village: row.village ?? '',
  saison: row.saison ?? '',
  ptech: row.ptech ?? '',
  created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date(0).toISOString(),
});

const buildBeneficiaireWhereClause = (filters: SqlBeneficiaireFilters) => {
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.search) {
    clauses.push('(nom_complet LIKE ? OR CAST(farmer_id AS CHAR) LIKE ? OR province LIKE ? OR territoire LIKE ? OR village LIKE ?)');
    const search = `%${filters.search}%`;
    values.push(search, search, search, search, search);
  }

  if (filters.province) {
    clauses.push('province = ?');
    values.push(filters.province);
  }

  if (filters.sexe) {
    if (filters.sexe === 'F') {
      clauses.push('LOWER(COALESCE(sexe, "")) LIKE ?');
      values.push('f%');
    } else if (filters.sexe === 'M') {
      clauses.push('(LOWER(COALESCE(sexe, "")) LIKE ? OR sexe IS NULL OR sexe = "")');
      values.push('m%');
    }
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

export const getBeneficiaires = async (filters: SqlBeneficiaireFilters) => {
  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 10);
  const offset = page * limit;
  const { whereClause, values } = buildBeneficiaireWhereClause(filters);

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM agriculteurs ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<AgriculteurRow[]>(
    `SELECT id, farmer_id, province, territoire, secteur, groupement, village, nom_complet, sexe, saison, ptech, created_at
     FROM agriculteurs
     ${whereClause}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map(mapAgriculteurRow),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getBeneficiaireById = async (id: number): Promise<SqlBeneficiaire | null> => {
  const [rows] = await getDbPool().query<AgriculteurRow[]>(
    `SELECT id, farmer_id, province, territoire, secteur, groupement, village, nom_complet, sexe, saison, ptech, created_at
     FROM agriculteurs
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  return mapAgriculteurRow(rows[0]);
};

export const getBeneficiaireStats = async (): Promise<SqlBeneficiaireStats> => {
  const [rows] = await getDbPool().query<BeneficiaireStatsRow[]>(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN LOWER(COALESCE(sexe, '')) LIKE 'f%' THEN 1 ELSE 0 END) AS femmes,
        SUM(CASE WHEN LOWER(COALESCE(sexe, '')) LIKE 'm%' THEN 1 ELSE 0 END) AS hommes,
        COUNT(DISTINCT province) AS provinces
      FROM agriculteurs`,
  );

  return {
    total: Number(rows[0]?.total ?? 0),
    femmes: Number(rows[0]?.femmes ?? 0),
    hommes: Number(rows[0]?.hommes ?? 0),
    provinces: Number(rows[0]?.provinces ?? 0),
  };
};

export const getReadNotificationIds = async (userId: number, notificationIds: string[]): Promise<Set<string>> => {
  if (notificationIds.length === 0) {
    return new Set<string>();
  }

  await ensureNotificationsTable();

  const placeholders = notificationIds.map(() => '?').join(', ');
  const [rows] = await getDbPool().query<NotificationReadRow[]>(
    `SELECT notification_id
     FROM notification_reads
     WHERE user_id = ?
       AND notification_id IN (${placeholders})`,
    [userId, ...notificationIds],
  );

  return new Set(rows.map((row) => row.notification_id));
};

export const markNotificationAsRead = async (userId: number, notificationId: string): Promise<void> => {
  await ensureNotificationsTable();

  await getDbPool().query<ResultSetHeader>(
    `INSERT INTO notification_reads (user_id, notification_id, read_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP`,
    [userId, notificationId],
  );
};

export const markNotificationsAsRead = async (userId: number, notificationIds: string[]): Promise<void> => {
  if (notificationIds.length === 0) {
    return;
  }

  await ensureNotificationsTable();

  const placeholders = notificationIds.map(() => '(?, ?, CURRENT_TIMESTAMP)').join(', ');
  const values = notificationIds.flatMap((notificationId) => [userId, notificationId]);

  await getDbPool().query<ResultSetHeader>(
    `INSERT INTO notification_reads (user_id, notification_id, read_at)
     VALUES ${placeholders}
     ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP`,
    values,
  );
};

export const isDatabaseConnectivityError = (error: unknown): boolean => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  return ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ENOTFOUND', 'ETIMEDOUT'].includes(code);
};