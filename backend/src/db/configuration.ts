/**
 * Acces aux donnees : Configuration.
 *
 * Extrait de db.ts sans modification des requetes ni des traitements.
 */
import { getDbPool } from './core';
import type { CountRow, RowDataPacket } from './types';

let configurationTablesReady: Promise<void> | null = null;

// ==================== CONFIGURATION ====================

export interface SqlConfigurationGenerale {
  nomProjet: string;
  sigle: string;
  anneeDebut: string;
  anneeFin: string;
  devise: string;
  langueInterface: string;
  fuseau: string;
  budgetTotal: number;
  tauxChangeUSD: number;
}

export interface SqlConfigurationAlertes {
  seuilRisqueFaible: number;
  seuilRisqueMoyen: number;
  seuilRisqueEleve: number;
  emailNotifications: boolean;
  seuilTauxRealisation: number;
  alertesBudget: boolean;
  alertesEcheances: boolean;
  delaiRappelJours: number;
}

export interface SqlConfigurationIntegration {
  apiBackendUrl: string;
  timeoutRequetes: number;
  modehorsLigne: boolean;
  syncAutoActivee: boolean;
  intervalSyncMinutes: number;
  powerbiWorkspaceId: string;
  powerbiReportId: string;
}

export interface SqlConfiguration {
  generale: SqlConfigurationGenerale;
  alertes: SqlConfigurationAlertes;
  integration: SqlConfigurationIntegration;
  provincesActives: string[];
}

const CONFIGURATION_SEED: Record<string, unknown> = {
  generale: {
    nomProjet: 'Programme National de Développement Agricole',
    sigle: 'PNDA-SE',
    anneeDebut: '2023',
    anneeFin: '2028',
    devise: 'USD',
    langueInterface: 'fr',
    fuseau: 'Africa/Kinshasa',
    budgetTotal: 500000000,
    tauxChangeUSD: 2800,
  },
  alertes: {
    seuilRisqueFaible: 25,
    seuilRisqueMoyen: 50,
    seuilRisqueEleve: 75,
    emailNotifications: true,
    seuilTauxRealisation: 70,
    alertesBudget: true,
    alertesEcheances: true,
    delaiRappelJours: 7,
  },
  integration: {
    apiBackendUrl: 'http://localhost:3000/api',
    timeoutRequetes: 30,
    modehorsLigne: true,
    syncAutoActivee: true,
    intervalSyncMinutes: 60,
    powerbiWorkspaceId: '',
    powerbiReportId: '',
  },
  provincesActives: ['Kwilu', 'Kongo Central', 'Kasaï', 'Haut-Lomami', 'Tanganyika', 'Maniema'],
};

const ensureConfigurationTables = async (): Promise<void> => {
  if (!configurationTablesReady) {
    configurationTablesReady = (async () => {
      // (schéma créé par supabase/migrations/0002_agent_environnement_aide_configuration.sql — table "configuration")

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM configuration');
      if (Number(countRows[0]?.total ?? 0) === 0) {
        const entries = Object.entries(CONFIGURATION_SEED);
        const placeholders = entries.map(() => '(?, ?)').join(', ');
        const values = entries.flatMap(([cle, valeur]) => [cle, JSON.stringify(valeur)]);
        await getDbPool().query(`INSERT INTO configuration (cle, valeur) VALUES ${placeholders}`, values);
      }
    })().catch((error) => {
      configurationTablesReady = null;
      throw error;
    });
  }

  await configurationTablesReady;
};

export const getConfiguration = async (): Promise<SqlConfiguration> => {
  await ensureConfigurationTables();

  const [rows] = await getDbPool().query<Array<RowDataPacket & { cle: string; valeur: unknown }>>(
    'SELECT cle, valeur FROM configuration',
  );

  const parsed = Object.fromEntries(
    rows.map((row) => [row.cle, typeof row.valeur === 'string' ? JSON.parse(row.valeur) : row.valeur]),
  );

  return {
    generale: parsed.generale ?? CONFIGURATION_SEED.generale,
    alertes: parsed.alertes ?? CONFIGURATION_SEED.alertes,
    integration: parsed.integration ?? CONFIGURATION_SEED.integration,
    provincesActives: parsed.provincesActives ?? CONFIGURATION_SEED.provincesActives,
  } as SqlConfiguration;
};

export const updateConfigurationSection = async (cle: string, valeur: unknown): Promise<void> => {
  await ensureConfigurationTables();

  await getDbPool().query(
    `INSERT INTO configuration (cle, valeur, updated_at) VALUES (?, ?, NOW())
     ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, updated_at = NOW()`,
    [cle, JSON.stringify(valeur)],
  );
};

