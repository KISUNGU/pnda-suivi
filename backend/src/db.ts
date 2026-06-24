import dotenv from 'dotenv';
import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

dotenv.config();

let pool: Pool | null = null;
let notificationsTableReady: Promise<void> | null = null;
let utilisateurSchemaModePromise: Promise<'flat' | 'normalized'> | null = null;
let beneficiaireSourcePromise: Promise<BeneficiaireSourceConfig> | null = null;
let grmTablesReady: Promise<void> | null = null;
let fournisseursTablesReady: Promise<void> | null = null;
let organisationsTablesReady: Promise<void> | null = null;
let activitesTablesReady: Promise<void> | null = null;
let risquesTablesReady: Promise<void> | null = null;
let provincesTablesReady: Promise<void> | null = null;
let powerBITablesReady: Promise<void> | null = null;
let otTablesReady: Promise<void> | null = null;
let suiviTablesReady: Promise<void> | null = null;
let cartesAgriculteursTableReady: Promise<void> | null = null;
let ventesSemencesTableReady: Promise<void> | null = null;

interface CountRow extends RowDataPacket {
  total: number;
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeUtilisateurStatut(value: string | null | undefined): 'actif' | 'inactif' | 'suspendu' {
  const normalized = normalizeText(value);

  if (normalized.includes('suspend')) {
    return 'suspendu';
  }

  if (normalized.includes('inact')) {
    return 'inactif';
  }

  return 'actif';
}

function toIsoString(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toDateOnly(value: string | Date | null | undefined): string {
  return toIsoString(value)?.split('T')[0] ?? new Date().toISOString().split('T')[0];
}

function mapDbRoleToAppRole(role: string | null, niveau: string | null): AppRole {
  const roleText = normalizeText(role);
  const niveauText = normalizeText(niveau);

  if (roleText === 'uncp') {
    return 'uncp';
  }

  if (roleText === 'upep') {
    return 'upep';
  }

  if (roleText.includes('superviseur_ot') || roleText.includes('enqueteur_ot')) {
    return 'ot';
  }

  if (roleText === 'invite') {
    return 'invite';
  }

  if (roleText.includes('super admin') || roleText.includes('administrateur')) {
    return 'admin';
  }

  if (roleText.includes('coordinateur ucp') || roleText.includes('responsable financier')) {
    return 'uncp';
  }

  if (roleText.includes('responsable c1') || roleText.includes('responsable c2')) {
    return 'uncp';
  }

  if (roleText.includes('responsable se national') || roleText.includes('responsable s&e national')) {
    return 'uncp';
  }

  if (roleText.includes('responsable se provincial') || roleText.includes('responsable s&e provincial')) {
    return 'upep';
  }

  if (roleText.includes('operateur technique') || roleText.includes('opérateur technique')) {
    return 'ot';
  }

  if (roleText.includes('animateur communautaire')) {
    return 'ot';
  }

  if (roleText.includes('partenaire')) {
    return 'partenaire';
  }

  if (roleText.includes('lecteur')) {
    return 'invite';
  }

  if (niveauText.includes('provincial')) {
    return 'upep';
  }

  if (niveauText.includes('ot') || niveauText.includes('communautaire')) {
    return 'ot';
  }

  if (niveauText.includes('national')) {
    return 'uncp';
  }

  return 'invite';
}

function mapAppRoleToDbRole(role: string | null | undefined): { role: string; niveau: string; profil: string } {
  switch (role) {
    case 'admin':
      return { role: 'Super Admin', niveau: 'National', profil: 'Administrateur' };
    case 'uncp':
      return { role: 'Coordinateur UCP', niveau: 'National', profil: 'UNCP' };
    case 'upep':
      return { role: 'Responsable SE Provincial', niveau: 'Provincial', profil: 'UPEP' };
    case 'ot':
      return { role: 'Opérateur Technique', niveau: 'OT', profil: 'Superviseur_OT' };
    case 'partenaire':
      return { role: 'Partenaire', niveau: 'National', profil: 'Partenaire' };
    case 'invite':
    default:
      return { role: 'Lecteur', niveau: 'National', profil: 'Invite' };
  }
}

function mapUtilisateurRow(row: UtilisateurRow): AuthUserProfile {
  const role = mapDbRoleToAppRole(row.role, row.niveau);

  return {
    id: row.id,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    role,
    role_label: row.role?.trim() || ROLE_LABELS[role],
    province: row.province,
    territoire: row.territoire,
    niveau: row.niveau,
    statut: normalizeUtilisateurStatut(row.statut),
    derniere_connexion: toIsoString(row.derniere_connexion),
    date_creation: toDateOnly(row.created_at),
    telephone: row.telephone ?? null,
    permissions: ROLE_PERMISSIONS[role],
  };
}

async function getUtilisateurSchemaMode(): Promise<'flat' | 'normalized'> {
  if (!utilisateurSchemaModePromise) {
    utilisateurSchemaModePromise = (async () => {
      const [rows] = await getDbPool().query<Array<RowDataPacket & { Field: string }>>('DESCRIBE utilisateur');
      return rows.some((row) => row.Field === 'id_utilisateur') ? 'normalized' : 'flat';
    })();
  }

  return utilisateurSchemaModePromise;
}

function getUtilisateurSelectSql(mode: 'flat' | 'normalized'): string {
  if (mode === 'normalized') {
    return `
      SELECT
        u.id_utilisateur AS id,
        u.nom AS nom,
        COALESCE(u.prenom, '') AS prenom,
        u.email AS email,
        p.nom_profil AS role,
        CASE WHEN COALESCE(u.est_actif, 1) = 1 THEN 'Actif' ELSE 'Inactif' END AS statut,
        u.dernier_connexion AS derniere_connexion,
        u.created_at AS created_at,
        u.updated_at AS updated_at,
        u.mot_de_passe AS mdp,
        NULL AS composante,
        NULL AS nbConnexions,
        l.province AS province,
        l.territoire AS territoire,
        CASE
          WHEN p.nom_profil = 'UPEP' THEN 'Provincial'
          WHEN p.nom_profil IN ('Superviseur_OT', 'Enqueteur_OT') THEN 'OT'
          ELSE 'National'
        END AS niveau,
        u.telephone AS telephone,
        p.niveau_acces AS niveau_acces
      FROM utilisateur u
      LEFT JOIN profil p ON p.id_profil = u.id_profil
      LEFT JOIN localisation l ON l.id_localisation = u.id_localisation
    `;
  }

  return `
    SELECT
      id,
      nom,
      prenom,
      email,
      role,
      statut,
      derniere_connexion,
      created_at,
      updated_at,
      mdp,
      composante,
      nbConnexions,
      province,
      territoire,
      niveau,
      NULL AS telephone,
      NULL AS niveau_acces
    FROM utilisateur
  `;
}

async function getUtilisateurWhereClause(
  mode: 'flat' | 'normalized',
  filters: Pick<UtilisateurFilters, 'search' | 'statut' | 'province'>
): Promise<{ whereSql: string; params: Array<string | number> }> {
  const whereClauses: string[] = [];
  const params: Array<string | number> = [];

  if (filters.search) {
    const searchValue = `%${filters.search}%`;
    if (mode === 'normalized') {
      whereClauses.push('(u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ? OR p.nom_profil LIKE ?)');
    } else {
      whereClauses.push('(nom LIKE ? OR prenom LIKE ? OR email LIKE ? OR role LIKE ?)');
    }
    params.push(searchValue, searchValue, searchValue, searchValue);
  }

  if (filters.statut) {
    if (mode === 'normalized') {
      whereClauses.push('COALESCE(u.est_actif, 1) = ?');
      params.push(normalizeUtilisateurStatut(filters.statut) === 'actif' ? 1 : 0);
    } else {
      whereClauses.push('LOWER(statut) = LOWER(?)');
      params.push(filters.statut);
    }
  }

  if (filters.province) {
    whereClauses.push(mode === 'normalized' ? 'l.province = ?' : 'province = ?');
    params.push(filters.province);
  }

  return {
    whereSql: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
    params,
  };
}

async function queryUtilisateurs(
  filters: Pick<UtilisateurFilters, 'search' | 'statut' | 'province'> = {},
  extraWhere?: { clause: string; params: Array<string | number> },
  orderBy?: string
): Promise<UtilisateurRow[]> {
  const mode = await getUtilisateurSchemaMode();
  const baseSql = getUtilisateurSelectSql(mode);
  const { whereSql, params } = await getUtilisateurWhereClause(mode, filters);
  const extraClause = extraWhere?.clause ? `${whereSql ? ' AND ' : ' WHERE '}${extraWhere.clause}` : '';
  const finalSql = `${baseSql} ${whereSql}${extraClause} ${orderBy ?? 'ORDER BY id DESC'}`;
  const finalParams = [...params, ...(extraWhere?.params ?? [])];
  const [rows] = await getDbPool().query<UtilisateurRow[]>(finalSql, finalParams);
  return rows;
}

async function resolveProfilId(appRole: string | null | undefined): Promise<number | null> {
  const mapping = mapAppRoleToDbRole(appRole);
  const [rows] = await getDbPool().execute<Array<RowDataPacket & { id_profil: number }>>(
    'SELECT id_profil FROM profil WHERE nom_profil = ? LIMIT 1',
    [mapping.profil]
  );
  return rows[0]?.id_profil ?? null;
}

async function resolveLocalisationId(province?: string | null, territoire?: string | null): Promise<number | null> {
  const provinceValue = province?.trim() || null;
  const territoireValue = territoire?.trim() || null;

  if (!provinceValue && !territoireValue) {
    return null;
  }

  const [existingRows] = await getDbPool().execute<Array<RowDataPacket & { id_localisation: number }>>(
    'SELECT id_localisation FROM localisation WHERE province <=> ? AND territoire <=> ? LIMIT 1',
    [provinceValue, territoireValue]
  );

  if (existingRows[0]?.id_localisation) {
    return existingRows[0].id_localisation;
  }

  const [result] = await getDbPool().execute<ResultSetHeader>(
    'INSERT INTO localisation (province, territoire) VALUES (?, ?)',
    [provinceValue || 'Non renseignée', territoireValue]
  );

  return result.insertId;
}

async function getUtilisateurRowById(id: number): Promise<UtilisateurRow | null> {
  const rows = await queryUtilisateurs({}, { clause: `${(await getUtilisateurSchemaMode()) === 'normalized' ? 'u.id_utilisateur' : 'id'} = ?`, params: [id] }, 'LIMIT 1');
  return rows[0] ?? null;
}

async function getUtilisateurRowByEmail(email: string): Promise<UtilisateurRow | null> {
  const mode = await getUtilisateurSchemaMode();
  const rows = await queryUtilisateurs({}, { clause: `LOWER(${mode === 'normalized' ? 'u.email' : 'email'}) = LOWER(?)`, params: [email] }, 'LIMIT 1');
  return rows[0] ?? null;
}

async function verifyStoredPassword(plainPassword: string, storedPassword: string): Promise<boolean> {
  if (!storedPassword) {
    return false;
  }

  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
    return bcrypt.compare(plainPassword, storedPassword);
  }

  return plainPassword === storedPassword;
}

async function upgradePlaintextPasswordIfNeeded(userId: number, plainPassword: string, storedPassword: string): Promise<void> {
  if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$')) {
    return;
  }

  if (plainPassword !== storedPassword) {
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  const mode = await getUtilisateurSchemaMode();

  if (mode === 'normalized') {
    await getDbPool().execute('UPDATE utilisateur SET mot_de_passe = ?, updated_at = NOW() WHERE id_utilisateur = ?', [hashedPassword, userId]);
    return;
  }

  await getDbPool().execute('UPDATE utilisateur SET mdp = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, userId]);
}

export async function authenticateUtilisateur(email: string, password: string): Promise<AuthUserProfile | null> {
  const row = await getUtilisateurRowByEmail(email);

  if (!row) {
    return null;
  }

  const passwordMatches = await verifyStoredPassword(password, row.mdp);

  if (!passwordMatches) {
    return null;
  }

  await upgradePlaintextPasswordIfNeeded(row.id, password, row.mdp);
  const mode = await getUtilisateurSchemaMode();

  if (mode === 'normalized') {
    await getDbPool().execute('UPDATE utilisateur SET dernier_connexion = NOW(), updated_at = NOW() WHERE id_utilisateur = ?', [row.id]);
  } else {
    await getDbPool().execute(
      'UPDATE utilisateur SET derniere_connexion = NOW(), nbConnexions = COALESCE(nbConnexions, 0) + 1, updated_at = NOW() WHERE id = ?',
      [row.id]
    );
  }

  const refreshed = await getUtilisateurRowById(row.id);
  return refreshed ? mapUtilisateurRow(refreshed) : mapUtilisateurRow(row);
}

export async function getUtilisateurProfile(id: number): Promise<AuthUserProfile | null> {
  const row = await getUtilisateurRowById(id);
  return row ? mapUtilisateurRow(row) : null;
}

export async function updateUtilisateurProfile(
  id: number,
  input: Pick<UtilisateurUpdateInput, 'nom' | 'prenom' | 'email' | 'province' | 'territoire' | 'telephone'>
): Promise<AuthUserProfile | null> {
  const mode = await getUtilisateurSchemaMode();
  const fields: string[] = [];
  const values: Array<string | null | number> = [];

  if (typeof input.nom === 'string') {
    fields.push('nom = ?');
    values.push(input.nom.trim());
  }

  if (typeof input.prenom === 'string') {
    fields.push('prenom = ?');
    values.push(input.prenom.trim());
  }

  if (typeof input.email === 'string') {
    fields.push('email = ?');
    values.push(input.email.trim().toLowerCase());
  }

  if (mode === 'normalized') {
    if (input.telephone !== undefined) {
      fields.push('telephone = ?');
      values.push(input.telephone?.trim() || null);
    }

    if (input.province !== undefined || input.territoire !== undefined) {
      const idLocalisation = await resolveLocalisationId(input.province, input.territoire);
      fields.push('id_localisation = ?');
      values.push(idLocalisation);
    }
  } else {
    if (input.province !== undefined) {
      fields.push('province = ?');
      values.push(input.province?.trim() || null);
    }

    if (input.territoire !== undefined) {
      fields.push('territoire = ?');
      values.push(input.territoire?.trim() || null);
    }
  }

  if (fields.length > 0) {
    values.push(id);
    await getDbPool().execute(
      `UPDATE utilisateur SET ${fields.join(', ')}, updated_at = NOW() WHERE ${mode === 'normalized' ? 'id_utilisateur' : 'id'} = ?`,
      values
    );
  }

  return getUtilisateurProfile(id);
}

export async function changeUtilisateurPassword(id: number, currentPassword: string, newPassword: string): Promise<boolean> {
  const row = await getUtilisateurRowById(id);

  if (!row) {
    return false;
  }

  const passwordMatches = await verifyStoredPassword(currentPassword, row.mdp);

  if (!passwordMatches) {
    return false;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const mode = await getUtilisateurSchemaMode();

  if (mode === 'normalized') {
    await getDbPool().execute('UPDATE utilisateur SET mot_de_passe = ?, updated_at = NOW() WHERE id_utilisateur = ?', [hashedPassword, id]);
  } else {
    await getDbPool().execute('UPDATE utilisateur SET mdp = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, id]);
  }

  return true;
}

export async function getUtilisateurs(filters: UtilisateurFilters = {}): Promise<{ data: AuthUserProfile[]; total: number }> {
  const page = Math.max(filters.page ?? 0, 0);
  const limit = Math.max(filters.limit ?? 50, 1);
  const offset = page * limit;
  const rows = await queryUtilisateurs(filters);
  const mappedRows = rows.map(mapUtilisateurRow);
  const roleFiltered = filters.role ? mappedRows.filter((item) => item.role === filters.role) : mappedRows;

  return {
    data: roleFiltered.slice(offset, offset + limit),
    total: roleFiltered.length,
  };
}

export async function getUtilisateurById(id: number): Promise<AuthUserProfile | null> {
  return getUtilisateurProfile(id);
}

export async function getUtilisateursStats(): Promise<UtilisateurStats> {
  const rows = await queryUtilisateurs();
  const stats: UtilisateurStats = {
    total: rows.length,
    par_role: {},
    par_statut: {},
    par_province: {},
    actifs_30j: 0,
    nouveaux_mois: 0,
  };

  const now = Date.now();
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  for (const row of rows) {
    const mapped = mapUtilisateurRow(row);
    stats.par_role[mapped.role] = (stats.par_role[mapped.role] ?? 0) + 1;
    stats.par_statut[mapped.statut] = (stats.par_statut[mapped.statut] ?? 0) + 1;

    if (mapped.province) {
      stats.par_province[mapped.province] = (stats.par_province[mapped.province] ?? 0) + 1;
    }

    const lastConnexion = row.derniere_connexion ? new Date(row.derniere_connexion).getTime() : 0;
    if (lastConnexion >= monthAgo) {
      stats.actifs_30j += 1;
    }

    const createdAt = row.created_at ? new Date(row.created_at).getTime() : 0;
    if (createdAt >= monthStart.getTime()) {
      stats.nouveaux_mois += 1;
    }
  }

  return stats;
}

export async function createUtilisateur(input: UtilisateurCreateInput): Promise<AuthUserProfile> {
  const mode = await getUtilisateurSchemaMode();
  const roleMapping = mapAppRoleToDbRole(input.role);
  const password = input.password?.trim() || 'password123';
  const hashedPassword = await bcrypt.hash(password, 10);

  let result: ResultSetHeader;

  if (mode === 'normalized') {
    const profilId = await resolveProfilId(input.role);
    const localisationId = await resolveLocalisationId(input.province, input.territoire);
    const [insertResult] = await getDbPool().execute<ResultSetHeader>(
      `INSERT INTO utilisateur (
        nom,
        prenom,
        email,
        mot_de_passe,
        telephone,
        id_profil,
        id_localisation,
        dernier_connexion,
        est_actif,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, NOW(), NOW())`,
      [
        input.nom?.trim() || '',
        input.prenom?.trim() || null,
        input.email?.trim().toLowerCase() || '',
        hashedPassword,
        input.telephone?.trim() || null,
        profilId,
        localisationId,
        normalizeUtilisateurStatut(input.statut) === 'actif' ? 1 : 0,
      ]
    );
    result = insertResult;
  } else {
    const [insertResult] = await getDbPool().execute<ResultSetHeader>(
      `INSERT INTO utilisateur (
        nom,
        prenom,
        email,
        role,
        statut,
        derniere_connexion,
        created_at,
        updated_at,
        mdp,
        composante,
        nbConnexions,
        province,
        territoire,
        niveau
      ) VALUES (?, ?, ?, ?, ?, NULL, NOW(), NOW(), ?, ?, 0, ?, ?, ?)`,
      [
        input.nom?.trim() || '',
        input.prenom?.trim() || '',
        input.email?.trim().toLowerCase() || '',
        roleMapping.role,
        input.statut?.trim() || 'Actif',
        hashedPassword,
        input.composante?.trim() || 'UGP',
        input.province?.trim() || null,
        input.territoire?.trim() || null,
        input.niveau?.trim() || roleMapping.niveau,
      ]
    );
    result = insertResult;
  }

  const created = await getUtilisateurProfile(result.insertId);
  if (!created) {
    throw new Error('Utilisateur créé mais introuvable');
  }

  return created;
}

export async function updateUtilisateur(id: number, input: UtilisateurUpdateInput): Promise<AuthUserProfile | null> {
  const mode = await getUtilisateurSchemaMode();
  const fields: string[] = [];
  const values: Array<string | null | number> = [];

  if (typeof input.nom === 'string') {
    fields.push('nom = ?');
    values.push(input.nom.trim());
  }

  if (typeof input.prenom === 'string') {
    fields.push('prenom = ?');
    values.push(input.prenom.trim());
  }

  if (typeof input.email === 'string') {
    fields.push('email = ?');
    values.push(input.email.trim().toLowerCase());
  }

  if (typeof input.role === 'string') {
    const roleMapping = mapAppRoleToDbRole(input.role);
    if (mode === 'normalized') {
      const profilId = await resolveProfilId(input.role);
      fields.push('id_profil = ?');
      values.push(profilId);
    } else {
      fields.push('role = ?', 'niveau = ?');
      values.push(roleMapping.role, input.niveau?.trim() || roleMapping.niveau);
    }
  } else if (mode === 'flat' && typeof input.niveau === 'string') {
    fields.push('niveau = ?');
    values.push(input.niveau.trim());
  }

  if (typeof input.statut === 'string') {
    if (mode === 'normalized') {
      fields.push('est_actif = ?');
      values.push(normalizeUtilisateurStatut(input.statut) === 'actif' ? 1 : 0);
    } else {
      fields.push('statut = ?');
      values.push(input.statut.trim());
    }
  }

  if (mode === 'normalized') {
    if (input.telephone !== undefined) {
      fields.push('telephone = ?');
      values.push(input.telephone?.trim() || null);
    }

    if (input.province !== undefined || input.territoire !== undefined) {
      const localisationId = await resolveLocalisationId(input.province, input.territoire);
      fields.push('id_localisation = ?');
      values.push(localisationId);
    }
  } else {
    if (input.province !== undefined) {
      fields.push('province = ?');
      values.push(input.province?.trim() || null);
    }

    if (input.territoire !== undefined) {
      fields.push('territoire = ?');
      values.push(input.territoire?.trim() || null);
    }

    if (input.composante !== undefined) {
      fields.push('composante = ?');
      values.push(input.composante?.trim() || null);
    }
  }

  if (fields.length === 0) {
    return getUtilisateurProfile(id);
  }

  values.push(id);
  await getDbPool().execute(
    `UPDATE utilisateur SET ${fields.join(', ')}, updated_at = NOW() WHERE ${mode === 'normalized' ? 'id_utilisateur' : 'id'} = ?`,
    values
  );
  return getUtilisateurProfile(id);
}

export async function deleteUtilisateur(id: number): Promise<boolean> {
  const mode = await getUtilisateurSchemaMode();
  const [result] = await getDbPool().execute<ResultSetHeader>(
    `DELETE FROM utilisateur WHERE ${mode === 'normalized' ? 'id_utilisateur' : 'id'} = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

export async function resetUtilisateurPassword(id: number, nextPassword = 'password123'): Promise<boolean> {
  const mode = await getUtilisateurSchemaMode();
  const hashedPassword = await bcrypt.hash(nextPassword, 10);
  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE utilisateur SET ${mode === 'normalized' ? 'mot_de_passe' : 'mdp'} = ?, updated_at = NOW() WHERE ${mode === 'normalized' ? 'id_utilisateur' : 'id'} = ?`,
    [hashedPassword, id]
  );
  return result.affectedRows > 0;
}

export async function updateUtilisateurStatut(id: number, statut: string): Promise<AuthUserProfile | null> {
  const mode = await getUtilisateurSchemaMode();

  if (mode === 'normalized') {
    await getDbPool().execute('UPDATE utilisateur SET est_actif = ?, updated_at = NOW() WHERE id_utilisateur = ?', [
      normalizeUtilisateurStatut(statut) === 'actif' ? 1 : 0,
      id,
    ]);
  } else {
    await getDbPool().execute('UPDATE utilisateur SET statut = ?, updated_at = NOW() WHERE id = ?', [statut, id]);
  }

  return getUtilisateurProfile(id);
}

interface BeneficiaireStatsRow extends RowDataPacket {
  total: number;
  femmes: number;
  hommes: number;
  provinces: number;
}

interface AgriculteurRow extends RowDataPacket {
  id: number;
  rna_id: string | number | null;
  province: string | null;
  territoire: string | null;
  secteur: string | null;
  groupement: string | null;
  village: string | null;
  nom_complet: string | null;
  sexe: string | null;
  saison: string | null;
  ptech: string | null;
  created_at: string | Date | null;
}

interface CarteAgriculteurRow extends RowDataPacket {
  id: number;
  rna_id: string | number | null;
  nom_complet: string | null;
  sexe: string | null;
  province: string | null;
  territoire: string | null;
  producteur_enregistre: number | boolean;
  statut_carte: string | null;
  numero_carte: string | null;
  date_distribution: string | Date | null;
}

interface CarteAgriculteurStatsRow extends RowDataPacket {
  total: number;
  producteurs_enregistres: number;
  distribuees: number;
  en_attente: number;
  a_imprimer: number;
  provinces: number;
}

interface VenteSemenceRow extends RowDataPacket {
  id: number;
  province: string | null;
  producteur: string | null;
  rna_id: string | null;
  type_semence: string;
  quantite_kg: number | string;
  montant_usd: number | string;
  date_vente: string | Date;
}

interface VenteSemenceStatsRow extends RowDataPacket {
  provinces_actives: number;
  producteurs_enregistres: number;
  semences_vendues_kg: number | string;
  montant_total_usd: number | string;
}

interface BeneficiaireSourceColumnRow extends RowDataPacket {
  TABLE_NAME: string;
  COLUMN_NAME: string;
}

interface BeneficiaireGroupRow extends RowDataPacket {
  label: string | null;
  total: number;
}

interface BeneficiaireMonthlyRow extends RowDataPacket {
  month_key: string | null;
  total: number;
}

interface PlainteRow extends RowDataPacket {
  id: number;
  numero_plainte: string;
  type: string;
  description: string;
  province: string | null;
  territoire: string | null;
  village: string | null;
  beneficiaire_nom: string | null;
  beneficiaire_rna: string | null;
  date_reception: string | Date;
  date_traitement: string | Date | null;
  statut: string;
  delai_traite: number | null;
  prise_en_charge: string | null;
  resolution: string | null;
  est_confidentiel: number | boolean;
  created_at: string | Date | null;
  updated_at: string | Date | null;
}

interface PlainteStatsRow extends RowDataPacket {
  total: number;
  en_cours: number;
  traitees: number;
  sensibles: number;
}

interface GrmServiceRow extends RowDataPacket {
  id: number;
  nom: string;
  type: string;
  province: string | null;
}

interface FournisseurRow extends RowDataPacket {
  id: number;
  nom: string;
  sigle: string | null;
  type: string;
  province: string;
  territoire: string;
  responsable: string;
  telephone: string;
  email: string | null;
  statut: string;
  stock_disponible: number;
  stock_total: number;
  beneficiaires_servis: number;
  montant_contrat: number;
  taux_livraison: number;
  date_contrat: string | Date;
  intrants: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
}

interface FournisseurStatsRow extends RowDataPacket {
  total: number;
  agrees: number;
  en_cours: number;
  suspendus: number;
}

interface OrganisationRow extends RowDataPacket {
  id: number;
  code: string;
  nom: string;
  sigle: string | null;
  nom_complet: string | null;
  type: string;
  source_type: string | null;
  date_creation: string | Date;
  date_agrement: string | Date | null;
  province: string;
  territoire: string | null;
  commune: string | null;
  adresse: string | null;
  responsable: string;
  telephone: string;
  email: string | null;
  role: string | null;
  beneficiaires_couverts: number;
  budget_alloue: number;
  taux_execution: number;
  statut: string;
  membres_total: number;
  membres_femmes: number;
  membres_hommes: number;
  membres_jeunes: number;
  productions: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
}

interface NotificationReadRow extends RowDataPacket {
  notification_id: string;
}

export interface AgriculteursSummary {
  total: number;
}

export interface AgriculteursDashboardOverview {
  total: number;
  femmes: number;
  hommes: number;
  provinces: number;
  evolution: Array<{ month: string; total: number }>;
  parProvince: Record<string, number>;
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
  type?: string;
  page?: number;
  limit?: number;
}

export interface SqlBeneficiaireStats {
  total: number;
  femmes: number;
  hommes: number;
  provinces: number;
}

export interface BeneficiaireDatabaseStats {
  parProvince: Record<string, number>;
  parType: Record<string, number>;
  parTechnologies: Record<string, number>;
  evolutionMensuelle: Array<{ mois: string; total: number }>;
}

export interface SqlCarteAgriculteur {
  id: number;
  rna_id: string;
  nom_complet: string;
  sexe: 'M' | 'F';
  province: string;
  territoire: string;
  producteur_enregistre: boolean;
  statut_carte: 'distribuee' | 'en_attente' | 'a_imprimer';
  numero_carte?: string;
  date_distribution?: string;
}

export interface SqlCarteAgriculteurFilters {
  search?: string;
  province?: string;
  statut?: 'distribuee' | 'en_attente' | 'a_imprimer';
  page?: number;
  limit?: number;
}

export interface SqlCarteAgriculteurStats {
  total: number;
  producteurs_enregistres: number;
  distribuees: number;
  en_attente: number;
  a_imprimer: number;
  provinces: number;
}

export interface SqlVenteSemence {
  id: number;
  province: string;
  producteur: string;
  rna_id: string;
  type_semence: string;
  quantite_kg: number;
  montant_usd: number;
  date_vente: string;
}

export interface SqlVenteSemenceFilters {
  search?: string;
  province?: string;
}

export interface SqlVenteSemenceStats {
  provinces_actives: number;
  producteurs_enregistres: number;
  semences_vendues_kg: number;
  montant_total_usd: number;
}

export interface SqlPlainte {
  id: number;
  numero_plainte: string;
  type: 'Technique' | 'Administratif' | 'Financier' | 'VBG' | 'EAS' | 'HS' | 'Environnemental';
  description: string;
  province: string;
  territoire: string;
  village: string;
  beneficiaire_nom?: string;
  beneficiaire_rna?: string;
  date_reception: string;
  date_traitement?: string;
  statut: 'recue' | 'en_cours' | 'referee' | 'traitee' | 'cloturee';
  delai_traite?: number;
  prise_en_charge?: string;
  resolution?: string;
  est_confidentiel: boolean;
}

export interface SqlPlainteFilters {
  search?: string;
  type?: string;
  province?: string;
  statut?: string;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  limit?: number;
}

export interface SqlPlainteStats {
  total: number;
  en_cours: number;
  traitees: number;
  sensibles: number;
}

export interface GrmServiceItem {
  id: number;
  nom: string;
  type: string;
  province: string;
}

export interface SqlPlainteCreateInput {
  type?: string;
  description?: string;
  province?: string;
  territoire?: string;
  village?: string;
  beneficiaire_nom?: string | null;
  beneficiaire_rna?: string | null;
  est_confidentiel?: boolean;
  prise_en_charge?: string | null;
  resolution?: string | null;
}

export interface SqlPlainteUpdateInput extends Partial<SqlPlainteCreateInput> {
  date_traitement?: string | null;
  statut?: string;
  delai_traite?: number | null;
}

export interface SqlFournisseur {
  id: number;
  nom: string;
  sigle?: string;
  type: string;
  province: string;
  territoire: string;
  responsable: string;
  telephone: string;
  email?: string;
  statut: 'Agréé' | 'En cours' | 'Suspendu';
  stock_disponible: number;
  stock_total: number;
  beneficiaires_servis: number;
  montant_contrat: number;
  taux_livraison: number;
  date_contrat: string;
  intrants: string[];
}

export interface SqlFournisseurFilters {
  search?: string;
  type?: string;
  province?: string;
  statut?: string;
  page?: number;
  limit?: number;
}

export interface SqlFournisseurStats {
  total: number;
  agrees: number;
  en_cours: number;
  suspendus: number;
}

export interface SqlFournisseurCreateInput {
  nom?: string;
  sigle?: string | null;
  type?: string;
  province?: string;
  territoire?: string;
  responsable?: string;
  telephone?: string;
  email?: string | null;
  statut?: string;
  stock_disponible?: number;
  stock_total?: number;
  beneficiaires_servis?: number;
  montant_contrat?: number;
  taux_livraison?: number;
  date_contrat?: string;
  intrants?: string[];
}

export interface SqlFournisseurUpdateInput extends Partial<SqlFournisseurCreateInput> {}

export interface SqlOrganisation {
  id: number;
  code: string;
  nom: string;
  sigle: string;
  nom_complet: string;
  type: 'cooperative' | 'groupement' | 'association' | 'union' | 'federation';
  source_type?: string;
  date_creation: string;
  date_agrement?: string;
  province: string;
  territoire: string;
  commune?: string;
  adresse: string;
  contacts: {
    responsable: string;
    telephone: string;
    email?: string;
  };
  membres: {
    total: number;
    femmes: number;
    hommes: number;
    jeunes: number;
  };
  productions: string[];
  statut: 'active' | 'inactive' | 'sous_supervision';
  created_at: string;
  updated_at: string;
  role?: string;
  beneficiaires_couverts?: number;
  budget_alloue?: number;
  taux_execution?: number;
}

export interface SqlOrganisationFilters {
  search?: string;
  type?: string;
  province?: string;
  statut?: string;
  page?: number;
  limit?: number;
}

export interface SqlOrganisationStats {
  total: number;
  par_type: Record<string, number>;
  par_province: Record<string, number>;
  par_statut: Record<string, number>;
  total_membres: number;
  femmes_membres: number;
  hommes_membres: number;
  jeunes_membres: number;
  gouvernementaux: number;
  ong: number;
  partenaires: number;
}

export interface SqlOrganisationCreateInput {
  code?: string;
  nom?: string;
  sigle?: string;
  nom_complet?: string;
  type?: string;
  source_type?: string;
  date_creation?: string;
  date_agrement?: string | null;
  province?: string;
  territoire?: string;
  commune?: string;
  adresse?: string;
  contacts?: {
    responsable?: string;
    telephone?: string;
    email?: string;
  };
  membres?: {
    total?: number;
    femmes?: number;
    hommes?: number;
    jeunes?: number;
  };
  productions?: string[];
  statut?: string;
  role?: string;
  beneficiaires_couverts?: number;
  budget_alloue?: number;
  taux_execution?: number;
}

export interface SqlOrganisationUpdateInput extends Partial<SqlOrganisationCreateInput> {}

export interface SqlActivite {
  id: number;
  code: string;
  titre: string;
  description: string;
  type: 'enquete' | 'formation' | 'suivi' | 'distribution' | 'reunion' | 'visite' | 'plainte' | 'autre';
  composante: string;
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'annulee' | 'reportee';
  priorite: 'haute' | 'moyenne' | 'basse';
  date_debut: string;
  date_fin: string;
  lieu: string;
  province: string;
  territoire: string;
  commune?: string;
  village?: string;
  responsable: string;
  responsable_contact?: string;
  equipe: string[];
  participants_prevus: number;
  participants_reels?: number;
  budget_prevu: number;
  budget_reel?: number;
  objectifs: string[];
  resultats_attendus: string[];
  resultats_obtenus?: string;
  difficultes?: string;
  lecons_apprises?: string;
  documents: Array<{ nom: string; url: string }>;
  photos?: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  beneficiaires_cibles: number;
  beneficiaires_atteints: number;
  taux_execution: number;
}

export interface SqlActiviteFilters {
  search?: string;
  type?: string;
  composante?: string;
  province?: string;
  statut?: string;
  responsable?: string;
  date_debut?: string;
  date_fin?: string;
  page?: number;
  limit?: number;
}

export interface SqlActiviteStats {
  total: number;
  par_type: Record<string, number>;
  par_statut: Record<string, number>;
  par_province: Record<string, number>;
  par_mois: Array<{ mois: string; total: number }>;
  budget_total: number;
  budget_depense: number;
  participants_total: number;
  taux_realisation: number;
  terminees: number;
  en_cours: number;
  planifiees: number;
  budget_execute: number;
  taux_execution_moyen: number;
}

export interface SqlActiviteCreateInput {
  code?: string;
  titre?: string;
  description?: string;
  type?: string;
  composante?: string;
  statut?: string;
  priorite?: string;
  date_debut?: string;
  date_fin?: string;
  lieu?: string;
  province?: string;
  territoire?: string;
  commune?: string | null;
  village?: string | null;
  responsable?: string;
  responsable_contact?: string | null;
  equipe?: string[];
  participants_prevus?: number;
  participants_reels?: number;
  budget_prevu?: number;
  budget_reel?: number;
  objectifs?: string[];
  resultats_attendus?: string[];
  resultats_obtenus?: string | null;
  difficultes?: string | null;
  lecons_apprises?: string | null;
  documents?: Array<{ nom: string; url: string }>;
  photos?: string[];
  created_by?: string;
  beneficiaires_cibles?: number;
  beneficiaires_atteints?: number;
  taux_execution?: number;
}

export interface SqlActiviteUpdateInput extends Partial<SqlActiviteCreateInput> {}

export interface SqlRisque {
  id: number;
  code: string;
  nom: string;
  description: string;
  categorie: 'gestion' | 'technique' | 'politique' | 'socio_economique' | 'environnemental' | 'sante_securite';
  probabilite: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  niveau: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  statut: 'identifie' | 'en_cours' | 'atténue' | 'cloture';
  plan_attenuation: string;
  responsable: string;
  date_identification: string;
  date_cloture?: string;
  province?: string;
  actions_prevues?: string[];
  indicateurs_surveillance?: string[];
  dernier_suivi?: string;
}

export interface SqlRisqueStats {
  total: number;
  critiques: number;
  eleves: number;
  moderes: number;
  faibles: number;
  en_cours: number;
  attenues: number;
}

export interface SqlRisqueCreateInput {
  code?: string;
  nom?: string;
  description?: string;
  categorie?: string;
  probabilite?: number;
  impact?: number;
  niveau?: string;
  statut?: string;
  plan_attenuation?: string;
  responsable?: string;
  date_identification?: string;
  date_cloture?: string | null;
  province?: string | null;
  actions_prevues?: string[];
  indicateurs_surveillance?: string[];
  dernier_suivi?: string | null;
}

export interface SqlRisqueUpdateInput extends Partial<SqlRisqueCreateInput> {}

export interface SqlAlerteRisque {
  id: number;
  id_risque: number;
  message: string;
  date_alerte: string;
  est_lue: boolean;
  niveau: 'info' | 'warning' | 'danger';
}

export interface SqlActionAttenuation {
  id: number;
  id_risque: number;
  action: string;
  responsable: string;
  date_debut: string;
  date_fin: string;
  statut: 'prevue' | 'en_cours' | 'realisee' | 'abandonnee';
  resultat?: string;
}

export interface SqlActionAttenuationInput {
  action?: string;
  responsable?: string;
  date_debut?: string;
  date_fin?: string;
  statut?: string;
  resultat?: string | null;
}

export interface SqlProvinceData {
  id: string;
  name: string;
  code: string;
  region: string;
  population: number;
  progression: number;
  performance_score: number;
  progression_delta: number;
  beneficiaires: {
    total: number;
    femmes: number;
    hommes: number;
    jeunes: number;
    cible: number;
  };
  production: {
    'maïs': { actuel: number; cible: number; unite: string };
    manioc: { actuel: number; cible: number; unite: string };
    arachide: { actuel: number; cible: number; unite: string };
  };
  infrastructures: {
    routes: { rehabilitees: number; prevues: number; unite: string };
    cler: { fonctionnels: number; total: number };
    marches: { construits: number; prevus: number };
  };
  indicateurs: {
    iodp1: { actuel: number; cible: number; trend: number };
    iodp2: { actuel: number; cible: number; trend: number };
    iodp3: { actuel: number; cible: number; trend: number };
  };
  risques: {
    critiques: number;
    eleves: number;
    moderes: number;
    faibles: number;
  };
  plaintes: {
    total: number;
    traitees: number;
    en_cours: number;
    vbg: number;
  };
  dernier_suivi: string;
  coordonnees?: { lat: number; lng: number };
}

export interface SqlProvinceEvolution {
  mois: string;
  beneficiaires: number;
  production: number;
  routes: number;
}

export interface SqlClassementProvincial {
  province: string;
  score: number;
  rang: number;
  progression?: number;
}

export interface SqlProvinceComparaison {
  province: string;
  score: number;
  beneficiaires: number;
  production: number;
  routes: number;
  risques_critiques: number;
}

export interface SqlPowerBIReport {
  id: string;
  name: string;
  description: string;
  embedUrl: string;
  reportId: string;
  datasetId: string | null;
  category: 'dashboard' | 'indicateurs' | 'beneficiaires' | 'risques' | 'grm';
  thumbnailUrl?: string;
  created_at: string;
  updated_at: string;
}

export interface SqlPowerBIDashboard {
  id: string;
  name: string;
  description: string;
  embedUrl: string;
  dashboardId: string;
  category: string;
  created_at: string;
}

export interface SqlOTData {
  id: string;
  nom: string;
  sigle: string;
  region: string;
  provinces: string[];
  responsable: {
    nom: string;
    email: string;
    telephone: string;
  };
  equipes: {
    total: number;
    superviseurs: number;
    enqueteurs: number;
    techniciens: number;
  };
  performances: {
    taux_realisation: number;
    taux_satisfaction: number;
    qualite_donnees: number;
    ponctualite: number;
  };
  activites: {
    enquetes_realisees: number;
    formations_dispensees: number;
    suivis_effectues: number;
    plaintes_traitees: number;
  };
  indicateurs: {
    production: number;
    adoption: number;
    satisfaction: number;
  };
  objectifs: {
    enquetes: { realises: number; cible: number };
    formations: { realises: number; cible: number };
    suivis: { realises: number; cible: number };
  };
  zones: Array<{
    province: string;
    territoire: string;
    villages: number;
    enquetes: number;
  }>;
  dernier_rapport: string;
  dernier_suivi: string;
}

export interface SqlOTActivite {
  id: number;
  type: 'enquete' | 'formation' | 'suivi' | 'plainte';
  titre: string;
  description: string;
  date: string;
  province: string;
  territoire: string;
  village: string;
  statut: 'planifiee' | 'en_cours' | 'terminee' | 'annulee';
  responsable: string;
  participants?: number;
  resultats?: string;
}

export interface SqlOTActiviteInput {
  type?: string;
  titre?: string;
  description?: string;
  date?: string;
  province?: string;
  territoire?: string;
  village?: string;
  statut?: string;
  responsable?: string;
  participants?: number;
  resultats?: string | null;
}

export interface SqlOTEquipier {
  id: number;
  nom: string;
  prenom: string;
  fonction: 'superviseur' | 'enqueteur' | 'technicien';
  telephone: string;
  email: string;
  province: string;
  performance: number;
  enquetes_realisees: number;
  dernier_suivi: string;
  est_actif: boolean;
}

export interface SqlOTRapportMensuel {
  id: number;
  mois: string;
  annee: number;
  enquetes: number;
  formations: number;
  suivis: number;
  qualite_donnees: number;
  commentaires: string;
  soumis_le: string;
  valide: boolean;
}

export interface SqlOTRapportInput {
  mois?: string;
  annee?: number;
  enquetes?: number;
  formations?: number;
  suivis?: number;
  qualite_donnees?: number;
  commentaires?: string;
  valide?: boolean;
}

export interface SqlSuiviMission {
  id: number;
  num: string;
  section: number;
  sectionLabel: string;
  natureMission: string;
  objectif: string;
  horsProjet: number;
  projet: number;
  montantUSD: number;
  dates: string;
  avanceUSD: number;
  solde: number;
  province: string;
}

export interface SqlSuiviStats {
  totalMissions: number;
  totalMontant: number;
  totalAvances: number;
  totalSolde: number;
  parProvince: Record<string, {
    missions: number;
    montant: number;
    avances: number;
    solde: number;
  }>;
}

interface BeneficiaireSourceConfig {
  tableName: string;
  tableRef: string;
  idExpr: string;
  rnaExpr: string;
  provinceExpr: string;
  territoireExpr: string;
  secteurExpr: string;
  groupementExpr: string;
  villageExpr: string;
  nomCompletExpr: string;
  sexeExpr: string;
  ageExpr: string;
  dateNaissanceExpr: string;
  saisonExpr: string;
  ptechExpr: string;
  createdAtExpr: string;
  typeExploitantExpr: string;
}

interface ActiviteRow extends RowDataPacket {
  id: number;
  code: string;
  titre: string;
  description: string | null;
  type: string;
  composante: string | null;
  statut: string;
  priorite: string | null;
  date_debut: string | Date;
  date_fin: string | Date;
  lieu: string | null;
  province: string;
  territoire: string | null;
  commune: string | null;
  village: string | null;
  responsable: string;
  responsable_contact: string | null;
  equipe: string | null;
  participants_prevus: number | string | null;
  participants_reels: number | string | null;
  budget_prevu: number | string | null;
  budget_reel: number | string | null;
  objectifs: string | null;
  resultats_attendus: string | null;
  resultats_obtenus: string | null;
  difficultes: string | null;
  lecons_apprises: string | null;
  documents: string | null;
  photos: string | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  created_by: string | null;
  beneficiaires_cibles: number | string | null;
  beneficiaires_atteints: number | string | null;
  taux_execution: number | string | null;
}

interface RisqueRow extends RowDataPacket {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  categorie: string;
  probabilite: number;
  impact: number;
  niveau: string;
  statut: string;
  plan_attenuation: string | null;
  responsable: string | null;
  date_identification: string | Date;
  date_cloture: string | Date | null;
  province: string | null;
  actions_prevues: string | null;
  indicateurs_surveillance: string | null;
  dernier_suivi: string | Date | null;
}

interface AlerteRisqueRow extends RowDataPacket {
  id: number;
  id_risque: number;
  message: string;
  date_alerte: string | Date;
  est_lue: number;
  niveau: string;
}

interface ActionAttenuationRow extends RowDataPacket {
  id: number;
  id_risque: number;
  action: string;
  responsable: string;
  date_debut: string | Date;
  date_fin: string | Date;
  statut: string;
  resultat: string | null;
}

interface ProvinceRow extends RowDataPacket {
  id: string;
  name: string;
  code: string;
  region: string;
  population: number | string | null;
  progression: number | string | null;
  performance_score: number | string | null;
  progression_delta: number | string | null;
  beneficiaires: string | null;
  production: string | null;
  infrastructures: string | null;
  indicateurs: string | null;
  risques: string | null;
  plaintes: string | null;
  dernier_suivi: string | Date | null;
  coord_lat: number | string | null;
  coord_lng: number | string | null;
}

interface ProvinceEvolutionRow extends RowDataPacket {
  mois: string;
  beneficiaires: number | string | null;
  production: number | string | null;
  routes: number | string | null;
  sort_order: number | string | null;
}

// interface PowerBIReportRow extends RowDataPacket {
//   id: string;
//   name: string;
//   description: string;
//   embed_url: string;
//   report_id: string;
//   dataset_id: string;
//   category: string;
//   thumbnail_url: string | null;
//   created_at: string | Date | null;
//   updated_at: string | Date | null;
// }


interface PowerBIReportRow extends RowDataPacket {
  id: string;
  name: string;
  report_id: string;
  dataset_id: string | null;
  embed_url: string | null;
}

interface AzureAccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface PowerBIEmbedTokenResponse {
  token: string;
  tokenId?: string;
  expiration: string;
}

const getRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

export const buildPowerBIEmbedUrl = (reportId: string): string => {
  const workspaceId = getRequiredEnv('POWERBI_WORKSPACE_ID');
  const tenantId = getRequiredEnv('POWERBI_TENANT_ID');

  return `https://app.powerbi.com/reportEmbed?reportId=${encodeURIComponent(
    reportId
  )}&groupId=${encodeURIComponent(workspaceId)}&autoAuth=true&ctid=${encodeURIComponent(
    tenantId
  )}`;
};

const getPowerBIAccessToken = async (): Promise<string> => {
  const tenantId = getRequiredEnv('POWERBI_TENANT_ID');
  const clientId = getRequiredEnv('POWERBI_CLIENT_ID');
  const clientSecret = getRequiredEnv('POWERBI_CLIENT_SECRET');

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://analysis.windows.net/powerbi/api/.default',
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Power BI access token error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as AzureAccessTokenResponse;
  return data.access_token;
};

export const generatePowerBIEmbedToken = async (
  reportId: string,
  datasetId?: string | null
): Promise<PowerBIEmbedTokenResponse> => {
  const workspaceId = getRequiredEnv('POWERBI_WORKSPACE_ID');
  const accessToken = await getPowerBIAccessToken();

  const body = {
    accessLevel: 'View',
    allowSaveAs: false,
    ...(datasetId
      ? {
          datasets: [{ id: datasetId }],
        }
      : {}),
  };

  const response = await fetch(
    `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Power BI embed token error: ${response.status} ${errorText}`);
  }

  return (await response.json()) as PowerBIEmbedTokenResponse;
};

export const findPowerBIReport = async (requestedReportId: string): Promise<PowerBIReportRow | null> => {
  const [rows] = await getDbPool().query<PowerBIReportRow[]>(
    `
      SELECT id, name, report_id, dataset_id, embed_url
      FROM powerbi_reports
      WHERE report_id = ? OR id = ?
      LIMIT 1
    `,
    [requestedReportId, requestedReportId]
  );

  return rows[0] ?? null;
};


interface PowerBIDashboardRow extends RowDataPacket {
  id: string;
  name: string;
  description: string;
  embed_url: string;
  dashboard_id: string;
  category: string;
  created_at: string | Date | null;
}

interface OTProfileRow extends RowDataPacket {
  id: string;
  nom: string;
  sigle: string;
  region: string;
  provinces: string | null;
  responsable: string | null;
  performances: string | null;
  indicateurs: string | null;
  objectifs: string | null;
  zones: string | null;
  dernier_suivi: string | Date | null;
}

interface OTActiviteRow extends RowDataPacket {
  id: number;
  type: string;
  titre: string;
  description: string | null;
  date: string | Date;
  province: string;
  territoire: string | null;
  village: string | null;
  statut: string;
  responsable: string | null;
  participants: number | string | null;
  resultats: string | null;
}

interface OTEquipierRow extends RowDataPacket {
  id: number;
  nom: string;
  prenom: string;
  fonction: string;
  telephone: string | null;
  email: string | null;
  province: string;
  performance: number | string | null;
  enquetes_realisees: number | string | null;
  dernier_suivi: string | Date | null;
  est_actif: number;
}

interface OTRapportRow extends RowDataPacket {
  id: number;
  mois: string;
  annee: number | string;
  enquetes: number | string | null;
  formations: number | string | null;
  suivis: number | string | null;
  qualite_donnees: number | string | null;
  commentaires: string | null;
  soumis_le: string | Date | null;
  valide: number;
}

interface SuiviMissionRow extends RowDataPacket {
  id: number;
  num: string;
  section: number | string;
  section_label: string;
  nature_mission: string;
  objectif: string | null;
  hors_projet: number | string | null;
  projet: number | string | null;
  montant_usd: number | string | null;
  dates: string | null;
  avance_usd: number | string | null;
  solde: number | string | null;
  province: string;
}

// const GRM_PLAINTES_SEED: Array<Omit<SqlPlainte, 'id'>> = [
//   {
//     numero_plainte: 'PL-2026-001',
//     type: 'Technique',
//     description: 'Non-livraison des semences ameliorees',
//     province: 'Kwilu',
//     territoire: 'Idiofa',
//     village: 'Masi-Manimba',
//     beneficiaire_nom: 'Joseph Mukendi',
//     beneficiaire_rna: 'RNA-00123',
//     date_reception: '2026-03-15T10:00:00Z',
//     statut: 'traitee',
//     delai_traite: 8,
//     resolution: 'Semences livrees le 23/03/2026',
//     est_confidentiel: false,
//   },
//   {
//     numero_plainte: 'PL-2026-002',
//     type: 'VBG',
//     description: "Cas d'exploitation sexuelle par agent de terrain",
//     province: 'Kasai',
//     territoire: 'Tshikapa',
//     village: 'Kananga',
//     beneficiaire_nom: 'Marie Kabeya',
//     beneficiaire_rna: 'RNA-00124',
//     date_reception: '2026-03-18T14:30:00Z',
//     statut: 'en_cours',
//     est_confidentiel: true,
//   },
//   {
//     numero_plainte: 'PL-2026-003',
//     type: 'Environnemental',
//     description: 'Deforestation excessive lors des travaux',
//     province: 'Kongo Central',
//     territoire: 'Matadi',
//     village: 'Boma',
//     date_reception: '2026-03-20T09:15:00Z',
//     statut: 'referee',
//     prise_en_charge: 'Inspection Environnementale',
//     est_confidentiel: false,
//   },
//   {
//     numero_plainte: 'PL-2026-004',
//     type: 'Administratif',
//     description: 'Retard dans le versement des subventions',
//     province: 'Kinshasa',
//     territoire: 'Mont Ngafula',
//     village: 'Selembao',
//     beneficiaire_nom: 'Albert Tshibola',
//     beneficiaire_rna: 'RNA-00125',
//     date_reception: '2026-03-22T11:00:00Z',
//     statut: 'en_cours',
//     est_confidentiel: false,
//   },
//   {
//     numero_plainte: 'PL-2026-005',
//     type: 'EAS',
//     description: 'Cas de harcelement sexuel',
//     province: 'Haut-Lomami',
//     territoire: 'Kamina',
//     village: 'Malemba',
//     beneficiaire_nom: 'David Kalonji',
//     beneficiaire_rna: 'RNA-00127',
//     date_reception: '2026-03-25T08:45:00Z',
//     statut: 'recue',
//     est_confidentiel: true,
//   },
// ];

// const GRM_SERVICES_SEED: GrmServiceItem[] = [
//   { id: 1, nom: 'Centre de sante de Tshikapa', type: 'medical', province: 'Kasai' },
//   { id: 2, nom: 'Inspection Environnementale', type: 'environnement', province: 'Kongo Central' },
//   { id: 3, nom: 'Commission VBG provinciale', type: 'social', province: 'Kwilu' },
// ];

// const FOURNISSEURS_SEED: Array<Omit<SqlFournisseur, 'id'>> = [
//   {
//     nom: 'AgroSemences Congo',
//     sigle: 'ASC',
//     type: 'Semences',
//     province: 'Kinshasa',
//     territoire: 'Mont-Ngafula',
//     responsable: 'Jean-Claude Mbaya',
//     telephone: '+243 81 234 5678',
//     email: 'asc@agrosemences.cd',
//     statut: 'Agréé',
//     stock_disponible: 4500,
//     stock_total: 6000,
//     beneficiaires_servis: 1240,
//     montant_contrat: 185000,
//     taux_livraison: 87,
//     date_contrat: '2026-01-15',
//     intrants: ['Maïs hybride', 'Manioc amélioré', 'Haricot'],
//   },
//   {
//     nom: 'Engrais du Congo SARL',
//     sigle: 'EC',
//     type: 'Engrais',
//     province: 'Kongo Central',
//     territoire: 'Matadi',
//     responsable: 'Marie-Thérèse Lufutu',
//     telephone: '+243 82 345 6789',
//     email: 'ec@engraiscongo.cd',
//     statut: 'Agréé',
//     stock_disponible: 2800,
//     stock_total: 5000,
//     beneficiaires_servis: 890,
//     montant_contrat: 245000,
//     taux_livraison: 75,
//     date_contrat: '2026-01-20',
//     intrants: ['NPK 17-17-17', 'Urée 46%', 'Sulfate d\'ammonium'],
//   },
//   {
//     nom: 'AgriEquip Kwilu',
//     sigle: 'AEK',
//     type: 'Équipements',
//     province: 'Kwilu',
//     territoire: 'Bandundu',
//     responsable: 'Patrick Niangadou',
//     telephone: '+243 84 456 7890',
//     statut: 'En cours',
//     stock_disponible: 320,
//     stock_total: 500,
//     beneficiaires_servis: 450,
//     montant_contrat: 98000,
//     taux_livraison: 64,
//     date_contrat: '2026-02-01',
//     intrants: ['Houes améliorées', 'Pulvérisateurs', 'Brouettes'],
//   },
//   {
//     nom: 'PhytoProtect SA',
//     sigle: 'PP',
//     type: 'Pesticides',
//     province: 'Haut-Lomami',
//     territoire: 'Kamina',
//     responsable: 'Alphonse Kasongo',
//     telephone: '+243 85 567 8901',
//     statut: 'Suspendu',
//     stock_disponible: 0,
//     stock_total: 1200,
//     beneficiaires_servis: 230,
//     montant_contrat: 67000,
//     taux_livraison: 30,
//     date_contrat: '2025-12-10',
//     intrants: ['Herbicides', 'Insecticides bio'],
//   },
//   {
//     nom: 'Congo Agri Services',
//     sigle: 'CAS',
//     type: 'Mixte',
//     province: 'Kasaï',
//     territoire: 'Tshikapa',
//     responsable: 'Sandrine Mukeba',
//     telephone: '+243 86 678 9012',
//     email: 'cas@congoas.cd',
//     statut: 'Agréé',
//     stock_disponible: 3100,
//     stock_total: 4200,
//     beneficiaires_servis: 1680,
//     montant_contrat: 312000,
//     taux_livraison: 92,
//     date_contrat: '2026-01-10',
//     intrants: ['Semences maïs', 'Engrais NPK', 'Outils de récolte'],
//   },
// ];

// const ORGANISATIONS_SEED: Array<Omit<SqlOrganisation, 'id' | 'created_at' | 'updated_at'>> = [
//   {
//     code: 'ORG-001',
//     nom: 'UNCP',
//     sigle: 'UNCP',
//     nom_complet: 'Unité Nationale de Coordination du Programme',
//     type: 'union',
//     source_type: 'gouvernemental',
//     date_creation: '2023-01-01',
//     province: 'Kinshasa',
//     territoire: 'Kinshasa',
//     adresse: '',
//     contacts: { responsable: 'Jean Mukendi', telephone: '+243 81 000 0001', email: 'uncp@pnda.cd' },
//     membres: { total: 48, femmes: 22, hommes: 26, jeunes: 15 },
//     productions: [],
//     statut: 'active',
//     role: 'Coordination nationale',
//     beneficiaires_couverts: 124530,
//     budget_alloue: 5200000,
//     taux_execution: 78,
//   },
//   {
//     code: 'ORG-002',
//     nom: 'OVDA',
//     sigle: 'OVDA',
//     nom_complet: 'Office des Voiries et Drainage Agricole',
//     type: 'union',
//     source_type: 'gouvernemental',
//     date_creation: '2023-01-15',
//     province: 'Kinshasa',
//     territoire: 'Kinshasa',
//     adresse: '',
//     contacts: { responsable: 'Pierre Kabeya', telephone: '+243 81 000 0002', email: 'ovda@pnda.cd' },
//     membres: { total: 32, femmes: 12, hommes: 20, jeunes: 8 },
//     productions: [],
//     statut: 'active',
//     role: 'Infrastructures rurales',
//     beneficiaires_couverts: 45000,
//     budget_alloue: 3100000,
//     taux_execution: 62,
//   },
//   {
//     code: 'ORG-003',
//     nom: 'Banque Mondiale',
//     sigle: 'BM',
//     nom_complet: 'Banque Internationale pour la Reconstruction et le Développement',
//     type: 'federation',
//     source_type: 'partenaire_financier',
//     date_creation: '2023-01-01',
//     province: 'Kinshasa',
//     territoire: 'Kinshasa',
//     adresse: '',
//     contacts: { responsable: 'Sophie Laurent', telephone: '+243 81 000 0003', email: 'bm@worldbank.org' },
//     membres: { total: 12, femmes: 5, hommes: 7, jeunes: 2 },
//     productions: [],
//     statut: 'active',
//     role: 'Bailleur principal',
//     beneficiaires_couverts: 0,
//     budget_alloue: 150000000,
//     taux_execution: 65,
//   },
//   {
//     code: 'ORG-004',
//     nom: 'ONG Agri-RDC',
//     sigle: 'AGRIRDC',
//     nom_complet: 'Organisation Non Gouvernementale pour l\'Agriculture en RDC',
//     type: 'association',
//     source_type: 'ong',
//     date_creation: '2023-03-01',
//     province: 'Kwilu',
//     territoire: 'Kwilu',
//     adresse: '',
//     contacts: { responsable: 'Alice Mwamba', telephone: '+243 82 111 2222', email: 'agrirdc@ong.cd' },
//     membres: { total: 85, femmes: 48, hommes: 37, jeunes: 32 },
//     productions: [],
//     statut: 'active',
//     role: 'Appui terrain',
//     beneficiaires_couverts: 12500,
//     budget_alloue: 450000,
//     taux_execution: 85,
//   },
//   {
//     code: 'ORG-005',
//     nom: 'FAO-RDC',
//     sigle: 'FAO',
//     nom_complet: 'Organisation des Nations Unies pour l\'Alimentation et l\'Agriculture - RDC',
//     type: 'federation',
//     source_type: 'partenaire_technique',
//     date_creation: '2023-02-01',
//     province: 'Kinshasa',
//     territoire: 'Kinshasa',
//     adresse: '',
//     contacts: { responsable: 'Dr. Carlos Meza', telephone: '+243 81 222 3333', email: 'fao-rdc@fao.org' },
//     membres: { total: 18, femmes: 8, hommes: 10, jeunes: 4 },
//     productions: [],
//     statut: 'active',
//     role: 'Appui technique',
//     beneficiaires_couverts: 0,
//     budget_alloue: 2800000,
//     taux_execution: 71,
//   },
// ];

// const ACTIVITES_SEED: Array<Omit<SqlActivite, 'id' | 'created_at' | 'updated_at'>> = [
//   {
//     code: 'ACT-2026-001',
//     titre: 'Enquete de production agricole',
//     description: 'Collecte des donnees de production dans la zone de Kwilu.',
//     type: 'enquete',
//     composante: 'Composante 1',
//     statut: 'terminee',
//     priorite: 'haute',
//     date_debut: '2026-03-01',
//     date_fin: '2026-03-15',
//     lieu: 'Masi-Manimba',
//     province: 'Kwilu',
//     territoire: 'Idiofa',
//     village: 'Masi-Manimba',
//     responsable: 'Marie KABEYA',
//     responsable_contact: '+243812345678',
//     equipe: ['Joseph MUKENDI', 'Albert TSHIBOLA'],
//     participants_prevus: 150,
//     participants_reels: 145,
//     budget_prevu: 2500000,
//     budget_reel: 2350000,
//     objectifs: ['Collecter les donnees de production', 'Identifier les besoins des agriculteurs'],
//     resultats_attendus: ['Base de donnees actualisee', 'Rapport d\'analyse'],
//     resultats_obtenus: '145 exploitants enquetes, donnees collectees avec succes.',
//     documents: [{ nom: 'Rapport_enquete.pdf', url: '#' }],
//     photos: [],
//     created_by: 'UNCP',
//     beneficiaires_cibles: 150,
//     beneficiaires_atteints: 145,
//     taux_execution: 97,
//   },
//   {
//     code: 'ACT-2026-002',
//     titre: 'Formation AIC',
//     description: 'Formation aux techniques agricoles intelligentes face au climat.',
//     type: 'formation',
//     composante: 'Composante 1',
//     statut: 'en_cours',
//     priorite: 'haute',
//     date_debut: '2026-03-20',
//     date_fin: '2026-03-25',
//     lieu: 'Kananga',
//     province: 'Kasai',
//     territoire: 'Tshikapa',
//     village: 'Kananga',
//     responsable: 'Albert TSHIBOLA',
//     responsable_contact: '+243834567890',
//     equipe: ['Marie KABEYA', 'Joseph MUKENDI'],
//     participants_prevus: 50,
//     participants_reels: 48,
//     budget_prevu: 3500000,
//     budget_reel: 2800000,
//     objectifs: ['Former aux techniques AIC', 'Sensibiliser a l\'adaptation climatique'],
//     resultats_attendus: ['50 agriculteurs formes', 'Adoption des techniques'],
//     documents: [],
//     photos: [],
//     created_by: 'SENASEM',
//     beneficiaires_cibles: 50,
//     beneficiaires_atteints: 48,
//     taux_execution: 80,
//   },
//   {
//     code: 'ACT-2026-003',
//     titre: 'Distribution d\'intrants',
//     description: 'Distribution de semences ameliorees et engrais.',
//     type: 'distribution',
//     composante: 'Composante 1',
//     statut: 'planifiee',
//     priorite: 'haute',
//     date_debut: '2026-04-05',
//     date_fin: '2026-04-10',
//     lieu: 'Matadi',
//     province: 'Kongo Central',
//     territoire: 'Matadi',
//     responsable: 'Pauline LUBALA',
//     responsable_contact: '+243845678901',
//     equipe: ['David KALONJI'],
//     participants_prevus: 200,
//     budget_prevu: 15000000,
//     objectifs: ['Distribuer les intrants', 'Appuyer la campagne agricole'],
//     resultats_attendus: ['200 exploitants servis', 'Amelioration des rendements'],
//     documents: [],
//     photos: [],
//     created_by: 'UNCP',
//     beneficiaires_cibles: 200,
//     beneficiaires_atteints: 0,
//     taux_execution: 0,
//   },
//   {
//     code: 'ACT-2026-004',
//     titre: 'Suivi post-formation',
//     description: 'Evaluation de l\'adoption des techniques apres formation.',
//     type: 'suivi',
//     composante: 'Composante 1',
//     statut: 'planifiee',
//     priorite: 'moyenne',
//     date_debut: '2026-04-15',
//     date_fin: '2026-04-20',
//     lieu: 'Kinshasa',
//     province: 'Kinshasa',
//     territoire: 'Mont Ngafula',
//     commune: 'Selembao',
//     responsable: 'Joseph MUKENDI',
//     equipe: ['Marie KABEYA'],
//     participants_prevus: 80,
//     budget_prevu: 1200000,
//     objectifs: ['Evaluer le niveau d\'adoption', 'Identifier les difficultes'],
//     resultats_attendus: ['Rapport d\'evaluation', 'Recommandations'],
//     documents: [],
//     photos: [],
//     created_by: 'SENASEM',
//     beneficiaires_cibles: 80,
//     beneficiaires_atteints: 0,
//     taux_execution: 0,
//   },
//   {
//     code: 'ACT-2026-005',
//     titre: 'Reunion de coordination',
//     description: 'Reunion mensuelle des partenaires.',
//     type: 'reunion',
//     composante: 'Composante 3',
//     statut: 'terminee',
//     priorite: 'moyenne',
//     date_debut: '2026-03-18',
//     date_fin: '2026-03-18',
//     lieu: 'Kinshasa',
//     province: 'Kinshasa',
//     territoire: 'Gombe',
//     commune: 'Gombe',
//     responsable: 'Jean MUKENDI',
//     equipe: ['Toute l\'equipe'],
//     participants_prevus: 25,
//     participants_reels: 22,
//     budget_prevu: 500000,
//     budget_reel: 450000,
//     objectifs: ['Faire le point des activites', 'Planifier le trimestre suivant'],
//     resultats_attendus: ['Compte-rendu', 'Plan d\'action'],
//     resultats_obtenus: '22 participants, plan valide.',
//     documents: [{ nom: 'CR_reunion.pdf', url: '#' }],
//     photos: [],
//     created_by: 'UNCP',
//     beneficiaires_cibles: 25,
//     beneficiaires_atteints: 22,
//     taux_execution: 88,
//   },
//   {
//     code: 'ACT-2026-006',
//     titre: 'Suivi de plainte terrain',
//     description: 'Visite de verification et resolution d\'une plainte terrain.',
//     type: 'plainte',
//     composante: 'Composante 3',
//     statut: 'en_cours',
//     priorite: 'haute',
//     date_debut: '2026-04-01',
//     date_fin: '2026-04-03',
//     lieu: 'Kikwit',
//     province: 'Kwilu',
//     territoire: 'Kikwit',
//     responsable: 'Equipe GRM',
//     equipe: ['Agent GRM 1'],
//     participants_prevus: 1,
//     budget_prevu: 250000,
//     objectifs: ['Verifier la plainte', 'Assurer la prise en charge'],
//     resultats_attendus: ['Plainte resolue', 'Beneficiaire pris en charge'],
//     documents: [],
//     photos: [],
//     created_by: 'GRM',
//     beneficiaires_cibles: 1,
//     beneficiaires_atteints: 0,
//     taux_execution: 40,
//   },
// ];

// const RISQUES_SEED: Array<Omit<SqlRisque, 'id'>> = [
//   {
//     code: 'RISK-001',
//     nom: 'Retard dans la distribution des intrants',
//     description: 'Les intrants agricoles ne sont pas distribues dans les delais impartis.',
//     categorie: 'gestion',
//     probabilite: 4,
//     impact: 3,
//     niveau: 'Élevé',
//     statut: 'en_cours',
//     plan_attenuation: 'Renforcer la logistique et suivre quotidiennement les livraisons.',
//     responsable: 'UNCP',
//     date_identification: '2026-01-15',
//     province: 'Kwilu',
//     actions_prevues: ['Suivi quotidien des livraisons', 'Reunion hebdomadaire logistique'],
//     indicateurs_surveillance: ['Taux de livraison', 'Retards moyens'],
//     dernier_suivi: '2026-03-28',
//   },
//   {
//     code: 'RISK-002',
//     nom: 'Insuffisance de capacites techniques provinciales',
//     description: 'Les equipes provinciales peinent a suivre le rythme de mise en oeuvre.',
//     categorie: 'technique',
//     probabilite: 3,
//     impact: 4,
//     niveau: 'Modéré',
//     statut: 'identifie',
//     plan_attenuation: 'Plan de formation annuel et mentorat des equipes provinciales.',
//     responsable: 'UPEP',
//     date_identification: '2026-02-03',
//     province: 'Kasai',
//     actions_prevues: ['Former les nouveaux agents', 'Deployement de mentors'],
//     indicateurs_surveillance: ['Nombre d\'agents formes', 'Taux de supervision'],
//     dernier_suivi: '2026-03-21',
//   },
//   {
//     code: 'RISK-003',
//     nom: 'Tensions communautaires autour des beneficiaires',
//     description: 'Des contestations emergent lors des selections des beneficiaires.',
//     categorie: 'socio_economique',
//     probabilite: 2,
//     impact: 5,
//     niveau: 'Critique',
//     statut: 'en_cours',
//     plan_attenuation: 'Renforcer la communication locale et les mecanismes de plaintes.',
//     responsable: 'OT',
//     date_identification: '2026-02-20',
//     province: 'Kongo Central',
//     actions_prevues: ['Sessions de sensibilisation', 'Diffusion de listes validées'],
//     indicateurs_surveillance: ['Nombre de plaintes communautaires'],
//     dernier_suivi: '2026-03-30',
//   },
//   {
//     code: 'RISK-004',
//     nom: 'Risque phytosanitaire localise',
//     description: 'Presence d\'une pression parasitaire sur les champs de mais.',
//     categorie: 'environnemental',
//     probabilite: 2,
//     impact: 2,
//     niveau: 'Faible',
//     statut: 'atténue',
//     plan_attenuation: 'Traitement cible et suivi technique rapproche.',
//     responsable: 'SENASEM',
//     date_identification: '2026-01-25',
//     date_cloture: '2026-03-10',
//     province: 'Tanganyika',
//     actions_prevues: ['Traitement phytosanitaire', 'Suivi des parcelles'],
//     indicateurs_surveillance: ['Taux d\'attaque'],
//     dernier_suivi: '2026-03-10',
//   },
// ];

// const RISQUE_ALERTES_SEED: Array<Omit<SqlAlerteRisque, 'id'>> = [
//   {
//     id_risque: 1,
//     message: 'Risque RISK-001 : niveau Eleve et aucune action de mitigation depuis 30 jours.',
//     date_alerte: toDateOnly(new Date()),
//     est_lue: false,
//     niveau: 'warning',
//   },
//   {
//     id_risque: 3,
//     message: 'Risque RISK-003 : tensions communautaires necessitant une reponse rapide.',
//     date_alerte: toDateOnly(new Date()),
//     est_lue: false,
//     niveau: 'danger',
//   },
// ];

// const RISQUE_ACTIONS_SEED: Array<Omit<SqlActionAttenuation, 'id'>> = [
//   {
//     id_risque: 1,
//     action: 'Mettre en place un tableau de suivi logistique hebdomadaire',
//     responsable: 'UNCP',
//     date_debut: '2026-03-01',
//     date_fin: '2026-04-15',
//     statut: 'en_cours',
//   },
//   {
//     id_risque: 2,
//     action: 'Former les points focaux provinciaux',
//     responsable: 'UPEP',
//     date_debut: '2026-03-10',
//     date_fin: '2026-04-30',
//     statut: 'prevue',
//   },
//   {
//     id_risque: 3,
//     action: 'Organiser des sessions de communication communautaire',
//     responsable: 'OT',
//     date_debut: '2026-03-15',
//     date_fin: '2026-04-05',
//     statut: 'en_cours',
//   },
// ];

// const PROVINCES_SEED: SqlProvinceData[] = [
//   {
//     id: 'kinshasa',
//     name: 'Kinshasa',
//     code: 'KN',
//     region: 'Centre',
//     population: 15000000,
//     progression: 78,
//     performance_score: 78,
//     progression_delta: 5,
//     beneficiaires: { total: 15230, femmes: 6853, hommes: 8377, jeunes: 4230, cible: 20000 },
//     production: {
//       'maïs': { actuel: 1250, cible: 2000, unite: 'tonnes' },
//       manioc: { actuel: 890, cible: 1500, unite: 'tonnes' },
//       arachide: { actuel: 450, cible: 800, unite: 'tonnes' },
//     },
//     infrastructures: {
//       routes: { rehabilitees: 45, prevues: 80, unite: 'km' },
//       cler: { fonctionnels: 3, total: 5 },
//       marches: { construits: 2, prevus: 4 },
//     },
//     indicateurs: {
//       iodp1: { actuel: 18, cible: 30, trend: 2.5 },
//       iodp2: { actuel: 25, cible: 40, trend: 3.2 },
//       iodp3: { actuel: 70, cible: 100, trend: 5.1 },
//     },
//     risques: { critiques: 1, eleves: 2, moderes: 3, faibles: 4 },
//     plaintes: { total: 12, traitees: 8, en_cours: 4, vbg: 2 },
//     dernier_suivi: '2026-03-28',
//   },
//   {
//     id: 'kongocentral',
//     name: 'Kongo Central',
//     code: 'KC',
//     region: 'Ouest',
//     population: 8000000,
//     progression: 85,
//     performance_score: 85,
//     progression_delta: 12,
//     beneficiaires: { total: 18920, femmes: 8514, hommes: 10406, jeunes: 5670, cible: 25000 },
//     production: {
//       'maïs': { actuel: 2100, cible: 3000, unite: 'tonnes' },
//       manioc: { actuel: 1560, cible: 2500, unite: 'tonnes' },
//       arachide: { actuel: 780, cible: 1200, unite: 'tonnes' },
//     },
//     infrastructures: {
//       routes: { rehabilitees: 78, prevues: 120, unite: 'km' },
//       cler: { fonctionnels: 5, total: 7 },
//       marches: { construits: 3, prevus: 5 },
//     },
//     indicateurs: {
//       iodp1: { actuel: 22, cible: 30, trend: 3.1 },
//       iodp2: { actuel: 32, cible: 40, trend: 4.2 },
//       iodp3: { actuel: 78, cible: 100, trend: 6.3 },
//     },
//     risques: { critiques: 0, eleves: 1, moderes: 4, faibles: 6 },
//     plaintes: { total: 8, traitees: 6, en_cours: 2, vbg: 1 },
//     dernier_suivi: '2026-03-27',
//   },
//   {
//     id: 'kwilu',
//     name: 'Kwilu',
//     code: 'KW',
//     region: 'Ouest',
//     population: 5000000,
//     progression: 72,
//     performance_score: 72,
//     progression_delta: 3,
//     beneficiaires: { total: 14250, femmes: 6412, hommes: 7838, jeunes: 3980, cible: 18000 },
//     production: {
//       'maïs': { actuel: 1850, cible: 2500, unite: 'tonnes' },
//       manioc: { actuel: 1250, cible: 2000, unite: 'tonnes' },
//       arachide: { actuel: 620, cible: 1000, unite: 'tonnes' },
//     },
//     infrastructures: {
//       routes: { rehabilitees: 52, prevues: 90, unite: 'km' },
//       cler: { fonctionnels: 4, total: 6 },
//       marches: { construits: 2, prevus: 4 },
//     },
//     indicateurs: {
//       iodp1: { actuel: 16, cible: 30, trend: 2.0 },
//       iodp2: { actuel: 28, cible: 40, trend: 3.5 },
//       iodp3: { actuel: 65, cible: 100, trend: 4.8 },
//     },
//     risques: { critiques: 1, eleves: 3, moderes: 3, faibles: 4 },
//     plaintes: { total: 15, traitees: 10, en_cours: 5, vbg: 3 },
//     dernier_suivi: '2026-03-29',
//     coordonnees: { lat: -5.0489, lng: 18.8203 },
//   },
//   {
//     id: 'kasai',
//     name: 'Kasai',
//     code: 'KS',
//     region: 'Centre',
//     population: 6000000,
//     progression: 82,
//     performance_score: 82,
//     progression_delta: 8,
//     beneficiaires: { total: 16890, femmes: 7600, hommes: 9290, jeunes: 4850, cible: 22000 },
//     production: {
//       'maïs': { actuel: 2450, cible: 3500, unite: 'tonnes' },
//       manioc: { actuel: 1980, cible: 2800, unite: 'tonnes' },
//       arachide: { actuel: 890, cible: 1400, unite: 'tonnes' },
//     },
//     infrastructures: {
//       routes: { rehabilitees: 63, prevues: 100, unite: 'km' },
//       cler: { fonctionnels: 5, total: 7 },
//       marches: { construits: 3, prevus: 5 },
//     },
//     indicateurs: {
//       iodp1: { actuel: 20, cible: 30, trend: 2.8 },
//       iodp2: { actuel: 35, cible: 40, trend: 4.5 },
//       iodp3: { actuel: 72, cible: 100, trend: 5.5 },
//     },
//     risques: { critiques: 2, eleves: 4, moderes: 2, faibles: 3 },
//     plaintes: { total: 22, traitees: 14, en_cours: 8, vbg: 5 },
//     dernier_suivi: '2026-03-26',
//     coordonnees: { lat: -5.9443, lng: 22.4167 },
//   },
//   {
//     id: 'hautlomami',
//     name: 'Haut-Lomami',
//     code: 'HL',
//     region: 'Est',
//     population: 4000000,
//     progression: 65,
//     performance_score: 65,
//     progression_delta: -2,
//     beneficiaires: { total: 11240, femmes: 5058, hommes: 6182, jeunes: 3120, cible: 15000 },
//     production: {
//       'maïs': { actuel: 980, cible: 1500, unite: 'tonnes' },
//       manioc: { actuel: 720, cible: 1200, unite: 'tonnes' },
//       arachide: { actuel: 380, cible: 600, unite: 'tonnes' },
//     },
//     infrastructures: {
//       routes: { rehabilitees: 34, prevues: 60, unite: 'km' },
//       cler: { fonctionnels: 2, total: 4 },
//       marches: { construits: 1, prevus: 3 },
//     },
//     indicateurs: {
//       iodp1: { actuel: 14, cible: 30, trend: 1.8 },
//       iodp2: { actuel: 22, cible: 40, trend: 2.8 },
//       iodp3: { actuel: 58, cible: 100, trend: 4.2 },
//     },
//     risques: { critiques: 0, eleves: 2, moderes: 4, faibles: 5 },
//     plaintes: { total: 6, traitees: 5, en_cours: 1, vbg: 0 },
//     dernier_suivi: '2026-03-25',
//   },
//   {
//     id: 'tanganyika',
//     name: 'Tanganyika',
//     code: 'TN',
//     region: 'Est',
//     population: 3500000,
//     progression: 58,
//     performance_score: 58,
//     progression_delta: 2,
//     beneficiaires: { total: 9800, femmes: 4410, hommes: 5390, jeunes: 2750, cible: 12000 },
//     production: {
//       'maïs': { actuel: 720, cible: 1200, unite: 'tonnes' },
//       manioc: { actuel: 580, cible: 1000, unite: 'tonnes' },
//       arachide: { actuel: 290, cible: 500, unite: 'tonnes' },
//     },
//     infrastructures: {
//       routes: { rehabilitees: 28, prevues: 50, unite: 'km' },
//       cler: { fonctionnels: 2, total: 4 },
//       marches: { construits: 1, prevus: 2 },
//     },
//     indicateurs: {
//       iodp1: { actuel: 12, cible: 30, trend: 1.5 },
//       iodp2: { actuel: 20, cible: 40, trend: 2.5 },
//       iodp3: { actuel: 55, cible: 100, trend: 4.0 },
//     },
//     risques: { critiques: 0, eleves: 1, moderes: 3, faibles: 6 },
//     plaintes: { total: 4, traitees: 3, en_cours: 1, vbg: 0 },
//     dernier_suivi: '2026-03-24',
//   },
// ];

// const PROVINCE_EVOLUTION_SEED: Array<{ province_id: string; mois: string; beneficiaires: number; production: number; routes: number; sort_order: number }> = [
//   { province_id: 'kinshasa', mois: 'Jan', beneficiaires: 8500, production: 3200, routes: 45, sort_order: 1 },
//   { province_id: 'kinshasa', mois: 'Fev', beneficiaires: 9800, production: 3800, routes: 58, sort_order: 2 },
//   { province_id: 'kinshasa', mois: 'Mar', beneficiaires: 11200, production: 4200, routes: 72, sort_order: 3 },
//   { province_id: 'kinshasa', mois: 'Avr', beneficiaires: 12800, production: 4800, routes: 85, sort_order: 4 },
//   { province_id: 'kinshasa', mois: 'Mai', beneficiaires: 14200, production: 5200, routes: 95, sort_order: 5 },
//   { province_id: 'kinshasa', mois: 'Juin', beneficiaires: 15230, production: 5800, routes: 110, sort_order: 6 },
//   { province_id: 'kwilu', mois: 'Jan', beneficiaires: 7900, production: 2500, routes: 28, sort_order: 1 },
//   { province_id: 'kwilu', mois: 'Fev', beneficiaires: 9100, production: 2900, routes: 34, sort_order: 2 },
//   { province_id: 'kwilu', mois: 'Mar', beneficiaires: 10400, production: 3400, routes: 41, sort_order: 3 },
//   { province_id: 'kwilu', mois: 'Avr', beneficiaires: 11900, production: 3900, routes: 46, sort_order: 4 },
//   { province_id: 'kwilu', mois: 'Mai', beneficiaires: 13100, production: 4300, routes: 49, sort_order: 5 },
//   { province_id: 'kwilu', mois: 'Juin', beneficiaires: 14250, production: 4700, routes: 52, sort_order: 6 },
// ];

// const POWERBI_REPORTS_SEED: Array<Omit<SqlPowerBIReport, 'created_at' | 'updated_at'>> = [
//   {
//     id: '1',
//     name: 'Tableau de bord executif',
//     description: 'Vue d\'ensemble des indicateurs cles du programme',
//     embedUrl: 'https://app.powerbi.com/reportEmbed',
//     reportId: 'report-exec-001',
//     datasetId: 'dataset-exec-001',
//     category: 'dashboard',
//     thumbnailUrl: 'https://placehold.co/300x200/2E7D32/FFFFFF?text=Dashboard',
//   },
//   {
//     id: '2',
//     name: 'Suivi des indicateurs IODP',
//     description: 'Performance des objectifs de developpement du programme',
//     embedUrl: 'https://app.powerbi.com/reportEmbed',
//     reportId: 'report-iodp-001',
//     datasetId: 'dataset-iodp-001',
//     category: 'indicateurs',
//     thumbnailUrl: 'https://placehold.co/300x200/4CAF50/FFFFFF?text=IODP',
//   },
//   {
//     id: '3',
//     name: 'Analyse des beneficiaires',
//     description: 'Distribution geographique et demographique des beneficiaires',
//     embedUrl: 'https://app.powerbi.com/reportEmbed',
//     reportId: 'report-benef-001',
//     datasetId: 'dataset-benef-001',
//     category: 'beneficiaires',
//     thumbnailUrl: 'https://placehold.co/300x200/81C784/FFFFFF?text=Beneficiaires',
//   },
//   {
//     id: '4',
//     name: 'Matrice des risques',
//     description: 'Evaluation et suivi des risques du programme',
//     embedUrl: 'https://app.powerbi.com/reportEmbed',
//     reportId: 'report-risks-001',
//     datasetId: 'dataset-risks-001',
//     category: 'risques',
//     thumbnailUrl: 'https://placehold.co/300x200/FFC107/FFFFFF?text=Risques',
//   },
//   {
//     id: '5',
//     name: 'Gestion des plaintes GRM',
//     description: 'Suivi des plaintes VBG/EAS/HS et delais de traitement',
//     embedUrl: 'https://app.powerbi.com/reportEmbed',
//     reportId: 'report-grm-001',
//     datasetId: 'dataset-grm-001',
//     category: 'grm',
//     thumbnailUrl: 'https://placehold.co/300x200/D32F2F/FFFFFF?text=GRM',
//   },
// ];

// const POWERBI_DASHBOARDS_SEED: Array<Omit<SqlPowerBIDashboard, 'created_at'>> = [
//   {
//     id: 'dash-1',
//     name: 'Dashboard executif',
//     description: 'Vue synthetique du portefeuille PNDA-SE',
//     embedUrl: 'https://app.powerbi.com/dashboardEmbed',
//     dashboardId: 'dashboard-exec-001',
//     category: 'dashboard',
//   },
//   {
//     id: 'dash-2',
//     name: 'Dashboard provincial',
//     description: 'Vue comparee des performances provinciales',
//     embedUrl: 'https://app.powerbi.com/dashboardEmbed',
//     dashboardId: 'dashboard-prov-001',
//     category: 'provinces',
//   },
// ];

// const OT_PROFILE_SEED: Omit<SqlOTData, 'equipes' | 'activites' | 'dernier_rapport'> = {
//   id: 'ot-001',
//   nom: 'Opérateur Technique Agricole',
//   sigle: 'OTA',
//   region: 'Sud-Ouest',
//   provinces: ['Kwilu', 'Kongo Central', 'Kinshasa'],
//   responsable: {
//     nom: 'Jean-Pierre KABEYA',
//     email: 'jp.kabeya@ota.cd',
//     telephone: '+243812345678',
//   },
//   performances: {
//     taux_realisation: 78,
//     taux_satisfaction: 85,
//     qualite_donnees: 92,
//     ponctualite: 88,
//   },
//   indicateurs: {
//     production: 76,
//     adoption: 68,
//     satisfaction: 85,
//   },
//   objectifs: {
//     enquetes: { realises: 1245, cible: 1600 },
//     formations: { realises: 32, cible: 40 },
//     suivis: { realises: 156, cible: 200 },
//   },
//   zones: [
//     { province: 'Kwilu', territoire: 'Idiofa', villages: 45, enquetes: 520 },
//     { province: 'Kwilu', territoire: 'Masi-Manimba', villages: 38, enquetes: 380 },
//     { province: 'Kongo Central', territoire: 'Matadi', villages: 52, enquetes: 245 },
//     { province: 'Kongo Central', territoire: 'Boma', villages: 28, enquetes: 180 },
//     { province: 'Kinshasa', territoire: 'Mont Ngafula', villages: 12, enquetes: 120 },
//   ],
//   dernier_suivi: '2026-03-28',
// };

// const OT_ACTIVITES_SEED: Array<Omit<SqlOTActivite, 'id'>> = [
//   { type: 'enquete', titre: 'Enquête production maïs', description: 'Collecte des données de production dans la zone de Idiofa', date: '2026-03-25', province: 'Kwilu', territoire: 'Idiofa', village: 'Masi-Manimba', statut: 'terminee', responsable: 'Marie KABEYA', participants: 45, resultats: '450 enregistrements' },
//   { type: 'formation', titre: 'Formation AIC', description: 'Formation aux techniques agricoles intelligentes face au climat', date: '2026-03-28', province: 'Kongo Central', territoire: 'Matadi', village: 'Kimpese', statut: 'en_cours', responsable: 'Joseph MUKENDI', participants: 28 },
//   { type: 'suivi', titre: 'Suivi post-formation', description: 'Évaluation de l\'adoption des techniques après formation', date: '2026-03-30', province: 'Kinshasa', territoire: 'Mont Ngafula', village: 'Selembao', statut: 'planifiee', responsable: 'Albert TSHIBOLA' },
//   { type: 'plainte', titre: 'Traitement plainte VBG', description: 'Suivi de plainte pour exploitation sexuelle', date: '2026-03-26', province: 'Kwilu', territoire: 'Idiofa', village: 'Kikwit', statut: 'en_cours', responsable: 'Pauline LUBALA' },
//   { type: 'enquete', titre: 'Enquête satisfaction', description: 'Évaluation de la satisfaction des bénéficiaires', date: '2026-03-22', province: 'Kongo Central', territoire: 'Boma', village: 'Tshela', statut: 'terminee', responsable: 'David KALONJI', participants: 32, resultats: 'Taux satisfaction: 82%' },
// ];

// const OT_EQUIPIERS_SEED: Array<Omit<SqlOTEquipier, 'id'>> = [
//   { nom: 'KABEYA', prenom: 'Marie', fonction: 'superviseur', telephone: '+243812345678', email: 'marie.kabeya@ota.cd', province: 'Kwilu', performance: 95, enquetes_realisees: 145, dernier_suivi: '2026-03-20', est_actif: true },
//   { nom: 'MUKENDI', prenom: 'Joseph', fonction: 'enqueteur', telephone: '+243823456789', email: 'joseph.mukendi@ota.cd', province: 'Kwilu', performance: 88, enquetes_realisees: 112, dernier_suivi: '2026-03-22', est_actif: true },
//   { nom: 'TSHIBOLA', prenom: 'Albert', fonction: 'technicien', telephone: '+243834567890', email: 'albert.tshibola@ota.cd', province: 'Kongo Central', performance: 92, enquetes_realisees: 78, dernier_suivi: '2026-03-21', est_actif: true },
//   { nom: 'LUBALA', prenom: 'Pauline', fonction: 'enqueteur', telephone: '+243845678901', email: 'pauline.lubala@ota.cd', province: 'Kinshasa', performance: 78, enquetes_realisees: 65, dernier_suivi: '2026-03-23', est_actif: true },
//   { nom: 'KALONJI', prenom: 'David', fonction: 'superviseur', telephone: '+243856789012', email: 'david.kalonji@ota.cd', province: 'Kongo Central', performance: 91, enquetes_realisees: 132, dernier_suivi: '2026-03-24', est_actif: true },
//   { nom: 'NGOMA', prenom: 'Béatrice', fonction: 'enqueteur', telephone: '+243867890123', email: 'beatrice.ngoma@ota.cd', province: 'Kwilu', performance: 85, enquetes_realisees: 95, dernier_suivi: '2026-03-19', est_actif: false },
// ];

// const OT_RAPPORTS_SEED: Array<Omit<SqlOTRapportMensuel, 'id'>> = [
//   { mois: 'Janvier', annee: 2026, enquetes: 420, formations: 12, suivis: 48, qualite_donnees: 89, commentaires: 'Bon début d\'année', soumis_le: '2026-02-05', valide: true },
//   { mois: 'Février', annee: 2026, enquetes: 385, formations: 10, suivis: 52, qualite_donnees: 91, commentaires: 'Progression satisfaisante', soumis_le: '2026-03-05', valide: true },
//   { mois: 'Mars', annee: 2026, enquetes: 440, formations: 10, suivis: 56, qualite_donnees: 92, commentaires: 'Activités intensifiées', soumis_le: '2026-03-30', valide: false },
// ];

// const SUIVI_MISSIONS_SEED: SqlSuiviMission[] = [
//   { id: 1, num: '1.1', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Accompagnement Assistant SG Agriculture à Mweka', objectif: 'Conduire le véhicule', horsProjet: 1, projet: 1, montantUSD: 706, dates: '02–05 oct 2025', avanceUSD: 706, solde: 0, province: 'Kasaï' },
//   { id: 2, num: '1.5', section: 1, sectionLabel: 'Missions au profit du personnel dans le cadre des travaux de routine', natureMission: 'Enquête production agricole Tshikapa', objectif: 'Superviser enquête', horsProjet: 0, projet: 2, montantUSD: 7102, dates: '06–12 oct 2025', avanceUSD: 5504, solde: 1598, province: 'Kasaï' },
//   { id: 3, num: '3.1', section: 3, sectionLabel: 'Ateliers', natureMission: 'Atelier restitution EIES Kamonia', objectif: 'Participer atelier', horsProjet: 0, projet: 4, montantUSD: 800, dates: '18–19 nov 2025', avanceUSD: 640, solde: 160, province: 'Kasaï' },
//   { id: 4, num: '2.1', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Supervision & accompagnement enquête PEA (Demba, Dibaya)', objectif: 'Enquêter bénéficiaires PNDA (B-2024, A-2024, B-2025)', horsProjet: 16, projet: 1, montantUSD: 9493, dates: '12 oct 2025', avanceUSD: 9493, solde: 0, province: 'Kasaï Central' },
//   { id: 5, num: '2.4', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Évaluation boutures manioc FAO/INERA Ngandajika', objectif: 'Augmenter production manioc', horsProjet: 0, projet: 2, montantUSD: 3255, dates: '17 oct 2025', avanceUSD: 3255, solde: 0, province: 'Kasaï Central' },
//   { id: 6, num: '2.1', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Mise en œuvre activités', objectif: 'Collecte données enquêtes production PEA', horsProjet: 20, projet: 3, montantUSD: 10162, dates: '03–12 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
//   { id: 7, num: '2.10', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Missions FACT 9/8 – entretien véhicules INERA & pêche/élevage', objectif: 'Entretien véhicules', horsProjet: 2, projet: 0, montantUSD: 875, dates: '24–25 déc 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
//   { id: 8, num: '3.4', section: 3, sectionLabel: 'Ateliers', natureMission: 'Formation', objectif: 'Remise à niveau en passation de marchés (STEP & contrats)', horsProjet: 0, projet: 2, montantUSD: 1341, dates: '19–24 oct 2025', avanceUSD: 0, solde: 0, province: 'Kwilu' },
//   { id: 9, num: '2.1', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Atelier formation prévention & sécurité routière (Kananga)', objectif: 'Former les utilisateurs des engins roulants', horsProjet: 25, projet: 9, montantUSD: 3732, dates: '24/09–05/10 2025', avanceUSD: 3420, solde: 0, province: 'UNCP' },
//   { id: 10, num: '2.2', section: 2, sectionLabel: "Missions en vue de l'implémentation des activités", natureMission: 'Enquête production PNDA (Kwilu, Kasaï Central, Kasaï)', objectif: 'Collecte données indicateurs ODP PNDA', horsProjet: 44, projet: 3, montantUSD: 30800, dates: '01–15 oct 2025', avanceUSD: 0, solde: 0, province: 'UNCP' },
//   { id: 11, num: '8.1', section: 3, sectionLabel: 'Ateliers', natureMission: 'Atelier revue à mi-parcours (Kinshasa)', objectif: 'Participer à la revue à mi-parcours du PNDA', horsProjet: 45, projet: 28, montantUSD: 2252, dates: '24–28 nov 2025', avanceUSD: 1802, solde: 0, province: 'UNCP' }
// ];

// db.ts - Vérifier que AnneeCadre a les bonnes propriétés

export interface AnneeCadre {
  prevu: number | null;
  realise: number | null;
}

export interface IndicateurCadre {
  id: number;
  code: string;
  nom: string;
  composante: string;
  sous_composante: string;
  est_odp: boolean;
  reference: string;
  unite: string;
  frequence: string;
  source_donnees: string;
  methodologie_collecte?: string | null;
  responsable: string;
  annees: {
    '2023': AnneeCadre;
    '2024': AnneeCadre;
    '2025': AnneeCadre;
    '2026': AnneeCadre;
  };
  final_prevu: number | null;
  final_realise?: number | null;
}

export interface CadreResultatsFilters {
  composante?: string;
  odp?: boolean;
}

export interface CadreStats {
  total: number;
  odp_count: number;
  avec_donnees_2025: number;
  en_retard: number;
  en_cours: number;
  atteint: number;
  moyenne_performance: number;
  composantes: Array<{ nom: string; count: number }>;
}

// db.ts - Remplacer l'interface LegacyIndicateur

export interface LegacyIndicateur {
  id: number;
  code: string;
  nom: string;
  description: string;
  formule: string;
  unite: string;
  frequence: 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';
  cible: number;
  valeur_actuelle: number;
  valeur_reference: number;
  progression: number;
  id_composante: number;
  est_iodp: boolean;
  // NOUVEAU : Valeurs annuelles
  cible_2023: number | null;
  cible_2024: number | null;
  cible_2025: number | null;
  cible_2026: number | null;
  realise_2023: number | null;
  realise_2024: number | null;
  realise_2025: number | null;
  realise_2026: number | null;
  source_donnees: string | null;
  methodologie_collecte: string | null;
  responsable_collecte: string | null;
}

export interface HistoriqueValeur {
  periode: string;
  valeur: number;
}

export interface IndicateurDatabaseItem {
  id: number;
  code: string;
  nom: string;
  description: string;
  type: 'iodp' | 'ir';
  composante: string;
  sous_composante?: string;
  formule: string;
  unite: string;
  frequence: 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle';
  source_donnees: string;
  methodologie_collecte?: string | null;
  responsable_collecte: string;
  valeurs: {
    reference: number;
    cible: number;
    cible_annuelle: number;
    cible_finale: number;
    actuelle: number;
    progression: number;
    final_realise: number | null;
  };
  historique: Array<{
    periode: string;
    valeur: number;
    source: string;
  }>;
  statut: 'actif' | 'inactif';
  created_at: string;
  updated_at: string;
}

export interface IndicateursDatabaseFilters {
  search?: string;
  type?: string;
  composante?: string;
  frequence?: string;
  statut?: string;
  page?: number;
  limit?: number;
}

export interface IndicateursDatabaseStats {
  total: number;
  par_type: { iodp: number; ir: number };
  par_composante: Record<string, number>;
  par_frequence: Record<string, number>;
  progression_moyenne: number;
  indicateurs_atteints: number;
  indicateurs_en_alerte: number;
}

export interface DashboardData {
  iodp1: { current: number; target: number; trend: number };
  iodp2: { current: number; target: number; trend: number };
  iodp3: { current: number; target: number; trend: number };
  evolution: Array<{ month: string; iodp1: number; iodp2: number; iodp3: number }>;
}

export type AppRole = 'admin' | 'uncp' | 'upep' | 'ot' | 'partenaire' | 'invite';

export interface AuthUserProfile {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: AppRole;
  role_label: string;
  province: string | null;
  territoire: string | null;
  niveau: string | null;
  statut: 'actif' | 'inactif' | 'suspendu';
  derniere_connexion: string | null;
  date_creation: string;
  telephone?: string | null;
  permissions: string[];
}

const GRM_PLAINTES_SEED: Array<Omit<SqlPlainte, 'id'>> = [];
const GRM_SERVICES_SEED: GrmServiceItem[] = [];
const FOURNISSEURS_SEED: Array<Omit<SqlFournisseur, 'id'>> = [];
const ORGANISATIONS_SEED: Array<Omit<SqlOrganisation, 'id' | 'created_at' | 'updated_at'>> = [];
const ACTIVITES_SEED: Array<Omit<SqlActivite, 'id' | 'created_at' | 'updated_at'>> = [];
const RISQUES_SEED: Array<Omit<SqlRisque, 'id'>> = [];
const RISQUE_ALERTES_SEED: Array<Omit<SqlAlerteRisque, 'id'>> = [];
const RISQUE_ACTIONS_SEED: Array<Omit<SqlActionAttenuation, 'id'>> = [];
const PROVINCES_SEED: SqlProvinceData[] = [];
const PROVINCE_EVOLUTION_SEED: Array<{ province_id: string; mois: string; beneficiaires: number; production: number; routes: number; sort_order: number }> = [];
const POWERBI_REPORTS_SEED: Array<Omit<SqlPowerBIReport, 'created_at' | 'updated_at'>> = [];
const POWERBI_DASHBOARDS_SEED: Array<Omit<SqlPowerBIDashboard, 'created_at'>> = [];
const OT_PROFILE_SEED: Omit<SqlOTData, 'equipes' | 'activites' | 'dernier_rapport'> = {
  id: '',
  nom: '',
  sigle: '',
  region: '',
  provinces: [],
  responsable: { nom: '', email: '', telephone: '' },
  performances: { taux_realisation: 0, taux_satisfaction: 0, qualite_donnees: 0, ponctualite: 0 },
  indicateurs: { production: 0, adoption: 0, satisfaction: 0 },
  objectifs: {
    enquetes: { realises: 0, cible: 0 },
    formations: { realises: 0, cible: 0 },
    suivis: { realises: 0, cible: 0 },
  },
  zones: [],
  dernier_suivi: '',
};
const OT_ACTIVITES_SEED: Array<Omit<SqlOTActivite, 'id'>> = [];
const OT_EQUIPIERS_SEED: Array<Omit<SqlOTEquipier, 'id'>> = [];
const OT_RAPPORTS_SEED: Array<Omit<SqlOTRapportMensuel, 'id'>> = [];
const SUIVI_MISSIONS_SEED: SqlSuiviMission[] = [];

export interface UtilisateurFilters {
  search?: string;
  role?: string;
  statut?: string;
  province?: string;
  page?: number;
  limit?: number;
}

export interface UtilisateurStats {
  total: number;
  par_role: Record<string, number>;
  par_statut: Record<string, number>;
  par_province: Record<string, number>;
  actifs_30j: number;
  nouveaux_mois: number;
}

export interface UtilisateurCreateInput {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  role?: string;
  statut?: string;
  province?: string | null;
  territoire?: string | null;
  niveau?: string | null;
  composante?: string | null;
  password?: string;
}

export interface UtilisateurUpdateInput {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string | null;
  role?: string;
  statut?: string;
  province?: string | null;
  territoire?: string | null;
  niveau?: string | null;
  composante?: string | null;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface IndicateurAliasMeta {
  code: string;
  composanteId: number;
  composanteLabel: string;
  description?: string;
  formule?: string;
}

interface CadreResultatRow extends RowDataPacket {
  id: number;
  code: string;
  nom: string;
  composante: string;
  sous_composante: string;
  est_odp: number;
  reference_value: string;
  unite: string;
  frequence: string;
  source_donnees: string;
  methodologie_collecte: string | null;
  responsable: string;
  prevu_2023: number | string | null;
  realise_2023: number | string | null;
  prevu_2024: number | string | null;
  realise_2024: number | string | null;
  prevu_2025: number | string | null;
  realise_2025: number | string | null;
  prevu_2026: number | string | null;
  realise_2026: number | string | null;
  final_prevu: number | string | null;
  final_realise: number | string | null;
}

interface UtilisateurRow extends RowDataPacket {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  role: string | null;
  statut: string | null;
  derniere_connexion: string | Date | null;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  mdp: string;
  composante: string | null;
  nbConnexions: number | null;
  province: string | null;
  territoire: string | null;
  niveau: string | null;
  niveau_acces: number | null;
}

type CadreYear = '2023' | '2024' | '2025' | '2026';

let cadreResultatsTableReady: Promise<void> | null = null;

const CADRE_TO_ALIAS_MAP: Record<string, IndicateurAliasMeta> = {
  'ODP-1': { code: 'IODP1.1', composanteId: 2, composanteLabel: 'Acces au marche' },
  'ODP-2': { code: 'IODP2.1', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'ODP-2F': { code: 'IODP2.2', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'ODP-3': { code: 'IODP2.3', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'ODP-4': { code: 'IODP2.4', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'ODP-5': { code: 'IODP2.6', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'ODP-6': { code: 'IODP3.2', composanteId: 3, composanteLabel: 'Capacite du secteur public' },
  'ODP-7': { code: 'IODP3.3', composanteId: 3, composanteLabel: 'Capacite du secteur public' },
  'ODP-7F': { code: 'IODP3.4', composanteId: 3, composanteLabel: 'Capacite du secteur public' },
  'IR-1.1.1': { code: 'IR1.1.1', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'IR-1.1.1F': { code: 'IR1.1.2', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'IR-1.1.2': { code: 'IR1.1.3', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'IR-1.1.3': { code: 'IR1.1.4', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'IR-1.1.3F': { code: 'IR1.1.5', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'IR-1.1.4': { code: 'IR1.1.6', composanteId: 1, composanteLabel: 'Productivite agricole' },
  'IR-2.1.1': { code: 'IR2.1.1', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.1.2': { code: 'IR2.1.4', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.1.3': { code: 'IR2.1.5', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.1.4': { code: 'IR2.1.6', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.2.1': { code: 'IR2.2.1', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.2.1F': { code: 'IR2.2.2', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.2.2': { code: 'IR2.2.7', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.2.2F': { code: 'IR2.2.8', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.2.3': { code: 'IR2.2.3', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-2.2.4': { code: 'IR2.2.4', composanteId: 2, composanteLabel: 'Acces au marche' },
  'IR-3.1.1': { code: 'IR3.1.1', composanteId: 3, composanteLabel: 'Services publics agricoles' },
  'IR-3.1.2': { code: 'IR3.1.4', composanteId: 3, composanteLabel: 'Services publics agricoles' },
  'IR-3.1.3': { code: 'IR3.1.5', composanteId: 3, composanteLabel: 'Services publics agricoles' },
  'IR-4.1': { code: 'IR4.1', composanteId: 4, composanteLabel: 'Intervention d\'urgence agricole' },
};

const CADRE_RESULTATS_SEED: IndicateurCadre[] = [
  {
    id: 1,
    code: 'ODP-1',
    nom: 'Augmentation des ventes de produits agricoles et alimentaires par les petits exploitants',
    composante: 'ODP',
    sous_composante: 'Ameliorer l\'acces au marche des petits exploitants dans les zones du projet',
    est_odp: true,
    reference: '0',
    unite: '%',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Rapport entre la quantite vendue et celle produite (enquete de production)',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 5, realise: null }, '2025': { prevu: 10, realise: 70 }, '2026': { prevu: 20, realise: null } },
    final_prevu: 30,
    final_realise: null,
  },
  {
    id: 2,
    code: 'ODP-2',
    nom: 'Les agriculteurs adoptent une technologie agricole amelioree (CRI, nombre)',
    composante: 'ODP',
    sous_composante: 'Augmenter la productivite agricole des petits exploitants agricoles dans les zones du projet',
    est_odp: true,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Systeme d\'information sur les beneficiaires',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 18391 }, '2025': { prevu: 130000, realise: 79605 }, '2026': { prevu: 240000, realise: null } },
    final_prevu: 300000,
    final_realise: null,
  },
  {
    id: 3,
    code: 'ODP-2F',
    nom: 'Les agriculteurs adoptent une technologie agricole amelioree - Femmes (CRI, nombre)',
    composante: 'ODP',
    sous_composante: 'Augmenter la productivite agricole des petits exploitants agricoles dans les zones du projet',
    est_odp: true,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Systeme d\'information sur les beneficiaires',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 9848 }, '2025': { prevu: 65000, realise: 43030 }, '2026': { prevu: 120000, realise: null } },
    final_prevu: 150000,
    final_realise: null,
  },
  {
    id: 4,
    code: 'ODP-3',
    nom: 'Mais',
    composante: 'ODP',
    sous_composante: 'Rendement des cultures vivrieres a travers l\'incorporation de pratiques/technologies intelligentes face au climat et a la nutrition',
    est_odp: true,
    reference: '0,5 T/ha',
    unite: '%',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Enquete sur les beneficiaires',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 30, realise: 30 }, '2025': { prevu: 60, realise: 50 }, '2026': { prevu: 80, realise: null } },
    final_prevu: 100,
    final_realise: null,
  },
  {
    id: 5,
    code: 'ODP-4',
    nom: 'Manioc',
    composante: 'ODP',
    sous_composante: 'Rendement des cultures vivrieres a travers l\'incorporation de pratiques/technologies intelligentes face au climat et a la nutrition',
    est_odp: true,
    reference: '7 T/ha',
    unite: '%',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Enquete sur les beneficiaires',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 25, realise: null }, '2026': { prevu: 40, realise: null } },
    final_prevu: 50,
    final_realise: null,
  },
  {
    id: 6,
    code: 'ODP-5',
    nom: 'Reduction du taux de mortalite animale au niveau des petits exploitants cibles',
    composante: 'ODP',
    sous_composante: 'Rendement des cultures vivrieres a travers l\'incorporation de pratiques/technologies intelligentes face au climat et a la nutrition',
    est_odp: true,
    reference: '0',
    unite: '%',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Enquete sur les beneficiaires',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 30, realise: null }, '2026': { prevu: 40, realise: null } },
    final_prevu: 50,
    final_realise: null,
  },
  {
    id: 7,
    code: 'ODP-6',
    nom: 'Nombre de provinces ciblees soumettent des plans de maintenance annuelle des routes',
    composante: 'ODP',
    sous_composante: 'Renforcer la capacite du secteur public dans la reponse aux urgences agricoles eligibles',
    est_odp: true,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA',
    methodologie_collecte: 'Enquetes sur les provinces ciblees qui ont soumis des plans au FONER',
    responsable: 'OVDA',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 4,
    final_realise: null,
  },
  {
    id: 8,
    code: 'ODP-7',
    nom: 'Beneficiaires directs du projet',
    composante: 'ODP',
    sous_composante: '',
    est_odp: true,
    reference: '0',
    unite: 'Nombre',
    frequence: '',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Nombre de beneficiaires des incitations et ceux des routes',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 23368 }, '2025': { prevu: 180000, realise: 142622 }, '2026': { prevu: 420000, realise: null } },
    final_prevu: 600000,
    final_realise: null,
  },
  {
    id: 9,
    code: 'ODP-7F',
    nom: 'Beneficiaires directs du projet - Femmes',
    composante: 'ODP',
    sous_composante: '',
    est_odp: true,
    reference: '0',
    unite: 'Nombre',
    frequence: '',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Nombre de beneficiaires des incitations et ceux des routes',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 11917 }, '2025': { prevu: 90000, realise: 77059 }, '2026': { prevu: 210000, realise: null } },
    final_prevu: 300000,
    final_realise: null,
  },
  {
    id: 10,
    code: 'IR-1.1.1',
    nom: 'Agriculteurs atteints avec des actifs ou des services agricoles (CRI, nombre)',
    composante: 'Composante 1',
    sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Semestrielle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Donnees collectees par l\'OT sur les beneficiaires de subvention ayant recu au moins la premiere tranche',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 23368 }, '2025': { prevu: 130000, realise: 142622 }, '2026': { prevu: 300000, realise: null } },
    final_prevu: 300000,
    final_realise: null,
  },
  {
    id: 11,
    code: 'IR-1.1.1F',
    nom: 'Agriculteurs atteints avec des actifs ou des services agricoles - Femmes (CRI, nombre)',
    composante: 'Composante 1',
    sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Semestrielle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Donnees collectees par l\'OT sur les beneficiaires de subvention ayant recu au moins la premiere tranche',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 11917 }, '2025': { prevu: 65000, realise: 77059 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
    final_realise: null,
  },
  {
    id: 12,
    code: 'IR-1.1.2',
    nom: 'Fournisseurs d\'intrants et de services agricoles proposant des technologies agricoles intelligentes face au climat et/ou nutrition (nombre)',
    composante: 'Composante 1',
    sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Semestrielle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Donnees collectees par l\'OT sur les prestataires prives d\'intrants et services figurant sur le registre de subvention du PNDA',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: 14 }, '2025': { prevu: 10, realise: 78 }, '2026': { prevu: 20, realise: null } },
    final_prevu: 25,
    final_realise: null,
  },
  {
    id: 13,
    code: 'IR-1.1.3',
    nom: 'Petits exploitants agricoles inscrits au registre national d\'agriculteurs (RNA) (nombre)',
    composante: 'Composante 1',
    sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Semestrielle',
    source_donnees: 'Registre National des Agriculteurs (RNA)',
    methodologie_collecte: 'Systeme d\'information sur les beneficiaires',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 30002 }, '2025': { prevu: 130000, realise: 294355 }, '2026': { prevu: 300000, realise: null } },
    final_prevu: 300000,
    final_realise: null,
  },
  {
    id: 14,
    code: 'IR-1.1.3F',
    nom: 'Petits exploitants agricoles inscrits au registre national d\'agriculteurs (RNA) - Femmes (nombre)',
    composante: 'Composante 1',
    sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Semestrielle',
    source_donnees: 'Registre National des Agriculteurs (RNA)',
    methodologie_collecte: 'Systeme d\'information sur les beneficiaires',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 15301 }, '2025': { prevu: 65000, realise: 161895 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
    final_realise: null,
  },
  {
    id: 15,
    code: 'IR-1.1.4',
    nom: 'Superficie sous pratiques agricoles intelligentes face au climat dans les provinces ciblees (hectare)',
    composante: 'Composante 1',
    sous_composante: 'Sous-composante 1.1 : Appui aux petits exploitants',
    est_odp: false,
    reference: '0',
    unite: 'Ha',
    frequence: 'Semestrielle',
    source_donnees: 'Registre Foncier et Registre National des Agriculteurs',
    methodologie_collecte: 'Registre foncier et RNA',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10000, realise: 1650 }, '2025': { prevu: 65000, realise: 42787 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
    final_realise: null,
  },
  {
    id: 16,
    code: 'IR-2.1.1',
    nom: 'Routes rehabilitees rurales et non rurales (CRI, kilometres)',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    est_odp: false,
    reference: '0',
    unite: 'Km',
    frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA',
    methodologie_collecte: 'Systeme d\'information de l\'OVDA',
    responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 400,
    final_realise: null,
  },
  {
    id: 17,
    code: 'IR-2.1.2',
    nom: 'Nombre de CLER fonctionnel',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA',
    methodologie_collecte: 'Systeme d\'information de l\'OVDA',
    responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 16,
    final_realise: null,
  },
  {
    id: 18,
    code: 'IR-2.1.3',
    nom: 'Nombre de provinces selectionnees soumettant des plans annuels d\'entretien routier au FONER (Nombre)',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA',
    methodologie_collecte: 'Systeme d\'information de l\'OVDA',
    responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 4,
    final_realise: null,
  },
  {
    id: 19,
    code: 'IR-2.1.4',
    nom: 'Superficie equipee avec l\'infrastructure d\'irrigation',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.1 : Infrastructures rurales',
    est_odp: false,
    reference: '0',
    unite: 'Ha',
    frequence: 'Annuelle',
    source_donnees: 'Rapport OVDA',
    methodologie_collecte: 'Systeme d\'information de l\'OVDA',
    responsable: 'OVDA/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 300,
    final_realise: null,
  },
  {
    id: 20,
    code: 'IR-2.2.1',
    nom: 'PME ayant un pret ou une marge de credit (CRI, nombre)',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.2 : Appui a l\'inclusion des petits exploitants dans les chaines de valeur',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Semestrielle',
    source_donnees: 'Rapport BCC',
    methodologie_collecte: 'Comptes de BCC et UNCP',
    responsable: 'Gestionnaire du BCC/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 10, realise: null }, '2025': { prevu: 20, realise: null }, '2026': { prevu: 30, realise: null } },
    final_prevu: 50,
    final_realise: null,
  },
  {
    id: 21,
    code: 'IR-2.2.1F',
    nom: 'Nombre de PME ayant un pret ou une marge de credit, dirige par des femmes (pourcentage)',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.2 : Appui a l\'inclusion des petits exploitants dans les chaines de valeur',
    est_odp: false,
    reference: '0',
    unite: '%',
    frequence: 'Semestrielle',
    source_donnees: 'Rapport BCC',
    methodologie_collecte: 'Comptes de BCC et UNCP',
    responsable: 'Gestionnaire du BCC/UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 50, realise: null }, '2025': { prevu: 50, realise: null }, '2026': { prevu: 50, realise: null } },
    final_prevu: 50,
    final_realise: null,
  },
  {
    id: 22,
    code: 'IR-2.2.2',
    nom: 'Personnes avec les polices de meso assurance (CRI, nombre)',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.2 : Appui a l\'inclusion des petits exploitants dans les chaines de valeur',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Donnees collectees par l\'Operateur technique sur les beneficiaires de micro assurance',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 20000, realise: 0 }, '2025': { prevu: 130000, realise: 110000 }, '2026': { prevu: 300000, realise: null } },
    final_prevu: 300000,
    final_realise: 51418,
  },
  {
    id: 23,
    code: 'IR-2.2.2F',
    nom: 'Personnes avec les polices de meso assurance - Femmes (CRI, nombre)',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.2 : Appui a l\'inclusion des petits exploitants dans les chaines de valeur',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport Operateur Technique',
    methodologie_collecte: 'Donnees collectees par l\'Operateur technique sur les beneficiaires de micro assurance',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: 25124 }, '2024': { prevu: 10000, realise: null }, '2025': { prevu: 65000, realise: 59400 }, '2026': { prevu: 150000, realise: null } },
    final_prevu: 150000,
    final_realise: null,
  },
  {
    id: 24,
    code: 'IR-2.2.3',
    nom: 'Organisations ayant mis en un plan d\'affaires',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.2 : Appui a l\'inclusion des petits exploitants dans les chaines de valeur',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: '',
    source_donnees: '',
    methodologie_collecte: '',
    responsable: '',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 50, realise: null }, '2025': { prevu: 100, realise: null }, '2026': { prevu: 200, realise: null } },
    final_prevu: 300,
    final_realise: null,
  },
  {
    id: 25,
    code: 'IR-2.2.4',
    nom: 'Volume de prets au moyen de lignes de credit accordees par le programme aux provinces ciblees (montant USD)',
    composante: 'Composante 2',
    sous_composante: 'Sous-composante 2.2 : Appui a l\'inclusion des petits exploitants dans les chaines de valeur',
    est_odp: false,
    reference: '0',
    unite: 'USD',
    frequence: '',
    source_donnees: 'Rapport BCC',
    methodologie_collecte: '',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 0, realise: null } },
    final_prevu: 4000000,
    final_realise: null,
  },
  {
    id: 26,
    code: 'IR-3.1.1',
    nom: 'Campagnes de vaccination animale dans les provinces ciblees (nombre)',
    composante: 'Composante 3',
    sous_composante: 'Sous-composante 3.1 : Renforcement des capacites pour la fourniture de services publics agricoles',
    est_odp: false,
    reference: '0',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapports Operateur Technique',
    methodologie_collecte: 'Rapport Direction de la Sante Animale du Ministere de l\'Agriculture',
    responsable: 'UNCP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 0, realise: null }, '2025': { prevu: 0, realise: null }, '2026': { prevu: 1, realise: null } },
    final_prevu: 2,
    final_realise: null,
  },
  {
    id: 27,
    code: 'IR-3.1.2',
    nom: 'Traitement des reclamations du Service de reparation des griefs dans les delais requis (GRM) (%)',
    composante: 'Composante 3',
    sous_composante: 'Sous-composante 3.1 : Renforcement des capacites pour la fourniture de services publics agricoles',
    est_odp: false,
    reference: '0',
    unite: '%',
    frequence: 'Semestrielle',
    source_donnees: 'Rapports OT/UNCP/UPEP sur les GRM',
    methodologie_collecte: 'GRM Systeme d\'information',
    responsable: 'OT/UNCP/UPEP',
    annees: { '2023': { prevu: 0, realise: null }, '2024': { prevu: 100, realise: null }, '2025': { prevu: 100, realise: 100 }, '2026': { prevu: 100, realise: null } },
    final_prevu: 100,
    final_realise: null,
  },
  {
    id: 28,
    code: 'IR-3.1.3',
    nom: 'Cas d\'exploitation et d\'abus sexuels/de harcelement sexuel traite au service (%)',
    composante: 'Composante 3',
    sous_composante: 'Sous-composante 3.1 : Renforcement des capacites pour la fourniture de services publics agricoles',
    est_odp: false,
    reference: '100',
    unite: '%',
    frequence: 'Annuelle',
    source_donnees: 'Rapports OT/UNCP/UPEP sur les GRM',
    methodologie_collecte: 'Donnees collectees par l\'OT/UNCP/UPEP',
    responsable: 'OT/UNCP/UPEP',
    annees: { '2023': { prevu: 100, realise: null }, '2024': { prevu: 100, realise: 100 }, '2025': { prevu: 100, realise: 100 }, '2026': { prevu: 100, realise: null } },
    final_prevu: 100,
    final_realise: null,
  },
  {
    id: 29,
    code: 'IR-4.1',
    nom: 'Plans de contingence des risques agricoles prepares et approuves (Nombre)',
    composante: 'Composante 4',
    sous_composante: 'Intervention d\'urgence agricole',
    est_odp: false,
    reference: 'Nombre',
    unite: 'Nombre',
    frequence: 'Annuelle',
    source_donnees: 'Rapport UNCP',
    methodologie_collecte: 'Rapport final du Manuel d\'Intervention d\'Urgence',
    responsable: 'UNCP/UPEP',
    annees: { '2023': { prevu: 1, realise: 1 }, '2024': { prevu: 2, realise: 1 }, '2025': { prevu: 0, realise: 0 }, '2026': { prevu: 3, realise: null } },
    final_prevu: 4,
    final_realise: null,
  },
];

const parseNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const mapCadreResultatRow = (row: CadreResultatRow): IndicateurCadre => ({
  id: row.id,
  code: row.code,
  nom: row.nom,
  composante: row.composante,
  sous_composante: row.sous_composante,
  est_odp: row.est_odp === 1,
  reference: row.reference_value,
  unite: row.unite,
  frequence: row.frequence,
  source_donnees: row.source_donnees,
  methodologie_collecte: row.methodologie_collecte,
  responsable: row.responsable,
  annees: {
    '2023': { prevu: parseNullableNumber(row.prevu_2023), realise: parseNullableNumber(row.realise_2023) },
    '2024': { prevu: parseNullableNumber(row.prevu_2024), realise: parseNullableNumber(row.realise_2024) },
    '2025': { prevu: parseNullableNumber(row.prevu_2025), realise: parseNullableNumber(row.realise_2025) },
    '2026': { prevu: parseNullableNumber(row.prevu_2026), realise: parseNullableNumber(row.realise_2026) },
  },
  final_prevu: parseNullableNumber(row.final_prevu),
  final_realise: parseNullableNumber(row.final_realise),
});

const buildCadreSeedValues = (indicateur: IndicateurCadre): Array<number | string | boolean | null> => [
  indicateur.id,
  indicateur.code,
  indicateur.nom,
  indicateur.composante,
  indicateur.sous_composante,
  indicateur.est_odp,
  indicateur.reference,
  indicateur.unite,
  indicateur.frequence,
  indicateur.source_donnees,
  indicateur.methodologie_collecte ?? null,
  indicateur.responsable,
  indicateur.annees['2023'].prevu,
  indicateur.annees['2023'].realise,
  indicateur.annees['2024'].prevu,
  indicateur.annees['2024'].realise,
  indicateur.annees['2025'].prevu,
  indicateur.annees['2025'].realise,
  indicateur.annees['2026'].prevu,
  indicateur.annees['2026'].realise,
  indicateur.final_prevu,
  indicateur.final_realise ?? null,
];

const ensureCadreResultatsTable = async (): Promise<void> => {
  if (!cadreResultatsTableReady) {
    cadreResultatsTableReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS cadre_resultats (
          id INT NOT NULL,
          code VARCHAR(50) NOT NULL,
          nom VARCHAR(500) NOT NULL,
          composante VARCHAR(100) NOT NULL,
          sous_composante VARCHAR(255) NOT NULL DEFAULT '',
          est_odp TINYINT(1) NOT NULL DEFAULT 0,
          reference_value VARCHAR(100) NOT NULL DEFAULT '',
          unite VARCHAR(50) NOT NULL,
          frequence VARCHAR(50) NOT NULL DEFAULT '',
          source_donnees VARCHAR(255) NOT NULL DEFAULT '',
          methodologie_collecte TEXT NULL,
          responsable VARCHAR(255) NOT NULL DEFAULT '',
          prevu_2023 DECIMAL(18,2) NULL,
          realise_2023 DECIMAL(18,2) NULL,
          prevu_2024 DECIMAL(18,2) NULL,
          realise_2024 DECIMAL(18,2) NULL,
          prevu_2025 DECIMAL(18,2) NULL,
          realise_2025 DECIMAL(18,2) NULL,
          prevu_2026 DECIMAL(18,2) NULL,
          realise_2026 DECIMAL(18,2) NULL,
          final_prevu DECIMAL(18,2) NULL,
          final_realise DECIMAL(18,2) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_cadre_resultats_code (code),
          KEY idx_cadre_resultats_composante (composante),
          KEY idx_cadre_resultats_est_odp (est_odp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [rows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM cadre_resultats');
      const total = Number(rows[0]?.total ?? 0);

      if (total > 0) {
        return;
      }

      const placeholders = CADRE_RESULTATS_SEED.map(
        () => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      ).join(', ');
      const values = CADRE_RESULTATS_SEED.flatMap(buildCadreSeedValues);

      await getDbPool().query<ResultSetHeader>(
        `INSERT INTO cadre_resultats (
          id,
          code,
          nom,
          composante,
          sous_composante,
          est_odp,
          reference_value,
          unite,
          frequence,
          source_donnees,
          methodologie_collecte,
          responsable,
          prevu_2023,
          realise_2023,
          prevu_2024,
          realise_2024,
          prevu_2025,
          realise_2025,
          prevu_2026,
          realise_2026,
          final_prevu,
          final_realise
        ) VALUES ${placeholders}`,
        values,
      );
    })();
  }

  await cadreResultatsTableReady;
};

const calcCadrePerformance = (realise: number | null, prevu: number | null): number | null => {
  if (realise === null || prevu === null || prevu <= 0) {
    return null;
  }

  return (realise / prevu) * 100;
};

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

const ensureGrmTables = async (): Promise<void> => {
  if (!grmTablesReady) {
    grmTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS grm_plaintes (
          id INT NOT NULL AUTO_INCREMENT,
          numero_plainte VARCHAR(64) NOT NULL,
          type VARCHAR(32) NOT NULL,
          description TEXT NOT NULL,
          province VARCHAR(128) DEFAULT NULL,
          territoire VARCHAR(128) DEFAULT NULL,
          village VARCHAR(255) DEFAULT NULL,
          beneficiaire_nom VARCHAR(255) DEFAULT NULL,
          beneficiaire_rna VARCHAR(64) DEFAULT NULL,
          date_reception DATETIME NOT NULL,
          date_traitement DATETIME DEFAULT NULL,
          statut VARCHAR(32) NOT NULL DEFAULT 'recue',
          delai_traite INT DEFAULT NULL,
          prise_en_charge VARCHAR(255) DEFAULT NULL,
          resolution TEXT DEFAULT NULL,
          est_confidentiel TINYINT(1) NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_grm_plaintes_numero (numero_plainte),
          KEY idx_grm_plaintes_type (type),
          KEY idx_grm_plaintes_province (province),
          KEY idx_grm_plaintes_statut (statut),
          KEY idx_grm_plaintes_confidentiel (est_confidentiel),
          KEY idx_grm_plaintes_date_reception (date_reception)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS grm_services (
          id INT NOT NULL AUTO_INCREMENT,
          nom VARCHAR(255) NOT NULL,
          type VARCHAR(64) NOT NULL,
          province VARCHAR(128) DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_grm_services_type (type),
          KEY idx_grm_services_province (province)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [plaintesCountRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM grm_plaintes');
      if (Number(plaintesCountRows[0]?.total ?? 0) === 0 && GRM_PLAINTES_SEED.length > 0) {
        const plaintePlaceholders = GRM_PLAINTES_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const plainteValues = GRM_PLAINTES_SEED.flatMap((plainte) => [
          plainte.numero_plainte,
          plainte.type,
          plainte.description,
          plainte.province,
          plainte.territoire,
          plainte.village,
          plainte.beneficiaire_nom ?? null,
          plainte.beneficiaire_rna ?? null,
          plainte.date_reception,
          plainte.date_traitement ?? null,
          plainte.statut,
          plainte.delai_traite ?? null,
          plainte.prise_en_charge ?? null,
          plainte.resolution ?? null,
          plainte.est_confidentiel ? 1 : 0,
        ]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO grm_plaintes (
            numero_plainte,
            type,
            description,
            province,
            territoire,
            village,
            beneficiaire_nom,
            beneficiaire_rna,
            date_reception,
            date_traitement,
            statut,
            delai_traite,
            prise_en_charge,
            resolution,
            est_confidentiel
          ) VALUES ${plaintePlaceholders}`,
          plainteValues,
        );
      }

      const [servicesCountRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM grm_services');
      if (Number(servicesCountRows[0]?.total ?? 0) === 0 && GRM_SERVICES_SEED.length > 0) {
        const servicePlaceholders = GRM_SERVICES_SEED.map(() => '(?, ?, ?, ?)').join(', ');
        const serviceValues = GRM_SERVICES_SEED.flatMap((service) => [service.id, service.nom, service.type, service.province]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO grm_services (id, nom, type, province) VALUES ${servicePlaceholders}`,
          serviceValues,
        );
      }
    })().catch((error) => {
      grmTablesReady = null;
      throw error;
    });
  }

  await grmTablesReady;
};

const ensureFournisseursTable = async (): Promise<void> => {
  if (!fournisseursTablesReady) {
    fournisseursTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS fournisseurs (
          id INT NOT NULL AUTO_INCREMENT,
          nom VARCHAR(255) NOT NULL,
          sigle VARCHAR(64) DEFAULT NULL,
          type VARCHAR(128) NOT NULL,
          province VARCHAR(128) NOT NULL,
          territoire VARCHAR(128) NOT NULL,
          responsable VARCHAR(255) NOT NULL,
          telephone VARCHAR(64) NOT NULL,
          email VARCHAR(255) DEFAULT NULL,
          statut VARCHAR(64) NOT NULL DEFAULT 'En cours',
          stock_disponible INT NOT NULL DEFAULT 0,
          stock_total INT NOT NULL DEFAULT 0,
          beneficiaires_servis INT NOT NULL DEFAULT 0,
          montant_contrat DECIMAL(15,2) NOT NULL DEFAULT 0,
          taux_livraison INT NOT NULL DEFAULT 0,
          date_contrat DATE NOT NULL,
          intrants TEXT DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_fournisseurs_type (type),
          KEY idx_fournisseurs_province (province),
          KEY idx_fournisseurs_statut (statut)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM fournisseurs');
      if (Number(countRows[0]?.total ?? 0) === 0 && FOURNISSEURS_SEED.length > 0) {
        const placeholders = FOURNISSEURS_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = FOURNISSEURS_SEED.flatMap((item) => [
          item.nom,
          item.sigle ?? null,
          item.type,
          item.province,
          item.territoire,
          item.responsable,
          item.telephone,
          item.email ?? null,
          item.statut,
          item.stock_disponible,
          item.stock_total,
          item.beneficiaires_servis,
          item.montant_contrat,
          item.taux_livraison,
          item.date_contrat,
          JSON.stringify(item.intrants),
        ]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO fournisseurs (
            nom,
            sigle,
            type,
            province,
            territoire,
            responsable,
            telephone,
            email,
            statut,
            stock_disponible,
            stock_total,
            beneficiaires_servis,
            montant_contrat,
            taux_livraison,
            date_contrat,
            intrants
          ) VALUES ${placeholders}`,
          values,
        );
      }
    })().catch((error) => {
      fournisseursTablesReady = null;
      throw error;
    });
  }

  await fournisseursTablesReady;
};

const ensureOrganisationsTable = async (): Promise<void> => {
  if (!organisationsTablesReady) {
    organisationsTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS organisations (
          id INT NOT NULL AUTO_INCREMENT,
          code VARCHAR(64) NOT NULL,
          nom VARCHAR(255) NOT NULL,
          sigle VARCHAR(64) DEFAULT NULL,
          nom_complet VARCHAR(255) DEFAULT NULL,
          type VARCHAR(64) NOT NULL,
          source_type VARCHAR(64) DEFAULT NULL,
          date_creation DATE NOT NULL,
          date_agrement DATE DEFAULT NULL,
          province VARCHAR(128) NOT NULL,
          territoire VARCHAR(128) DEFAULT NULL,
          commune VARCHAR(128) DEFAULT NULL,
          adresse VARCHAR(255) DEFAULT NULL,
          responsable VARCHAR(255) NOT NULL,
          telephone VARCHAR(64) NOT NULL,
          email VARCHAR(255) DEFAULT NULL,
          role VARCHAR(255) DEFAULT NULL,
          beneficiaires_couverts INT NOT NULL DEFAULT 0,
          budget_alloue DECIMAL(15,2) NOT NULL DEFAULT 0,
          taux_execution INT NOT NULL DEFAULT 0,
          statut VARCHAR(64) NOT NULL DEFAULT 'active',
          membres_total INT NOT NULL DEFAULT 0,
          membres_femmes INT NOT NULL DEFAULT 0,
          membres_hommes INT NOT NULL DEFAULT 0,
          membres_jeunes INT NOT NULL DEFAULT 0,
          productions TEXT DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_organisations_code (code),
          KEY idx_organisations_type (type),
          KEY idx_organisations_source_type (source_type),
          KEY idx_organisations_province (province),
          KEY idx_organisations_statut (statut)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM organisations');
      if (Number(countRows[0]?.total ?? 0) === 0 && ORGANISATIONS_SEED.length > 0) {
        const placeholders = ORGANISATIONS_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = ORGANISATIONS_SEED.flatMap((item) => [
          item.code,
          item.nom,
          item.sigle,
          item.nom_complet,
          item.type,
          item.source_type ?? null,
          item.date_creation,
          item.date_agrement ?? null,
          item.province,
          item.territoire,
          item.commune ?? null,
          item.adresse,
          item.contacts.responsable,
          item.contacts.telephone,
          item.contacts.email ?? null,
          item.role ?? null,
          item.beneficiaires_couverts ?? 0,
          item.budget_alloue ?? 0,
          item.taux_execution ?? 0,
          item.statut,
          item.membres.total,
          item.membres.femmes,
          item.membres.hommes,
          item.membres.jeunes,
          JSON.stringify(item.productions ?? []),
        ]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO organisations (
            code,
            nom,
            sigle,
            nom_complet,
            type,
            source_type,
            date_creation,
            date_agrement,
            province,
            territoire,
            commune,
            adresse,
            responsable,
            telephone,
            email,
            role,
            beneficiaires_couverts,
            budget_alloue,
            taux_execution,
            statut,
            membres_total,
            membres_femmes,
            membres_hommes,
            membres_jeunes,
            productions
          ) VALUES ${placeholders}`,
          values,
        );
      }
    })().catch((error) => {
      organisationsTablesReady = null;
      throw error;
    });
  }

  await organisationsTablesReady;
};

const ensureActivitesTable = async (): Promise<void> => {
  if (!activitesTablesReady) {
    activitesTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS activites (
          id INT NOT NULL AUTO_INCREMENT,
          code VARCHAR(64) NOT NULL,
          titre VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          type VARCHAR(64) NOT NULL,
          composante VARCHAR(128) DEFAULT NULL,
          statut VARCHAR(64) NOT NULL DEFAULT 'planifiee',
          priorite VARCHAR(32) NOT NULL DEFAULT 'moyenne',
          date_debut DATE NOT NULL,
          date_fin DATE NOT NULL,
          lieu VARCHAR(255) DEFAULT NULL,
          province VARCHAR(128) NOT NULL,
          territoire VARCHAR(128) DEFAULT NULL,
          commune VARCHAR(128) DEFAULT NULL,
          village VARCHAR(128) DEFAULT NULL,
          responsable VARCHAR(255) NOT NULL,
          responsable_contact VARCHAR(128) DEFAULT NULL,
          equipe TEXT DEFAULT NULL,
          participants_prevus INT NOT NULL DEFAULT 0,
          participants_reels INT DEFAULT NULL,
          budget_prevu DECIMAL(15,2) NOT NULL DEFAULT 0,
          budget_reel DECIMAL(15,2) DEFAULT NULL,
          objectifs TEXT DEFAULT NULL,
          resultats_attendus TEXT DEFAULT NULL,
          resultats_obtenus TEXT DEFAULT NULL,
          difficultes TEXT DEFAULT NULL,
          lecons_apprises TEXT DEFAULT NULL,
          documents TEXT DEFAULT NULL,
          photos TEXT DEFAULT NULL,
          created_by VARCHAR(255) DEFAULT NULL,
          beneficiaires_cibles INT NOT NULL DEFAULT 0,
          beneficiaires_atteints INT NOT NULL DEFAULT 0,
          taux_execution INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_activites_code (code),
          KEY idx_activites_type (type),
          KEY idx_activites_statut (statut),
          KEY idx_activites_province (province),
          KEY idx_activites_date_debut (date_debut)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM activites');
      if (Number(countRows[0]?.total ?? 0) === 0 && ACTIVITES_SEED.length > 0) {
        const placeholders = ACTIVITES_SEED.map(
          () => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).join(', ');
        const values = ACTIVITES_SEED.flatMap((item) => [
          item.code,
          item.titre,
          item.description,
          item.type,
          item.composante,
          item.statut,
          item.priorite,
          item.date_debut,
          item.date_fin,
          item.lieu,
          item.province,
          item.territoire,
          item.commune ?? null,
          item.village ?? null,
          item.responsable,
          item.responsable_contact ?? null,
          JSON.stringify(item.equipe ?? []),
          item.participants_prevus,
          item.participants_reels ?? null,
          item.budget_prevu,
          item.budget_reel ?? null,
          JSON.stringify(item.objectifs ?? []),
          JSON.stringify(item.resultats_attendus ?? []),
          item.resultats_obtenus ?? null,
          item.difficultes ?? null,
          item.lecons_apprises ?? null,
          JSON.stringify(item.documents ?? []),
          JSON.stringify(item.photos ?? []),
          item.created_by,
          item.beneficiaires_cibles,
          item.beneficiaires_atteints,
          item.taux_execution,
        ]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO activites (
            code,
            titre,
            description,
            type,
            composante,
            statut,
            priorite,
            date_debut,
            date_fin,
            lieu,
            province,
            territoire,
            commune,
            village,
            responsable,
            responsable_contact,
            equipe,
            participants_prevus,
            participants_reels,
            budget_prevu,
            budget_reel,
            objectifs,
            resultats_attendus,
            resultats_obtenus,
            difficultes,
            lecons_apprises,
            documents,
            photos,
            created_by,
            beneficiaires_cibles,
            beneficiaires_atteints,
            taux_execution
          ) VALUES ${placeholders}`,
          values,
        );
      }
    })().catch((error) => {
      activitesTablesReady = null;
      throw error;
    });
  }

  await activitesTablesReady;
};

const ensureRisquesTables = async (): Promise<void> => {
  if (!risquesTablesReady) {
    risquesTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS risques (
          id INT NOT NULL AUTO_INCREMENT,
          code VARCHAR(64) NOT NULL,
          nom VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          categorie VARCHAR(64) NOT NULL,
          probabilite TINYINT NOT NULL,
          impact TINYINT NOT NULL,
          niveau VARCHAR(32) NOT NULL,
          statut VARCHAR(32) NOT NULL,
          plan_attenuation TEXT DEFAULT NULL,
          responsable VARCHAR(255) DEFAULT NULL,
          date_identification DATE NOT NULL,
          date_cloture DATE DEFAULT NULL,
          province VARCHAR(128) DEFAULT NULL,
          actions_prevues TEXT DEFAULT NULL,
          indicateurs_surveillance TEXT DEFAULT NULL,
          dernier_suivi DATE DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_risques_code (code),
          KEY idx_risques_niveau (niveau),
          KEY idx_risques_statut (statut),
          KEY idx_risques_province (province)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS risque_alertes (
          id INT NOT NULL AUTO_INCREMENT,
          id_risque INT NOT NULL,
          message TEXT NOT NULL,
          date_alerte DATE NOT NULL,
          est_lue TINYINT(1) NOT NULL DEFAULT 0,
          niveau VARCHAR(16) NOT NULL,
          PRIMARY KEY (id),
          KEY idx_risque_alertes_risque (id_risque),
          CONSTRAINT fk_risque_alertes_risque FOREIGN KEY (id_risque) REFERENCES risques(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS risque_actions (
          id INT NOT NULL AUTO_INCREMENT,
          id_risque INT NOT NULL,
          action TEXT NOT NULL,
          responsable VARCHAR(255) NOT NULL,
          date_debut DATE NOT NULL,
          date_fin DATE NOT NULL,
          statut VARCHAR(32) NOT NULL,
          resultat TEXT DEFAULT NULL,
          PRIMARY KEY (id),
          KEY idx_risque_actions_risque (id_risque),
          CONSTRAINT fk_risque_actions_risque FOREIGN KEY (id_risque) REFERENCES risques(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM risques');
      if (Number(countRows[0]?.total ?? 0) === 0 && RISQUES_SEED.length > 0) {
        const risquePlaceholders = RISQUES_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const risqueValues = RISQUES_SEED.flatMap((item) => [
          item.code,
          item.nom,
          item.description,
          item.categorie,
          item.probabilite,
          item.impact,
          item.niveau,
          item.statut,
          item.plan_attenuation,
          item.responsable,
          item.date_identification,
          item.date_cloture ?? null,
          item.province ?? null,
          JSON.stringify(item.actions_prevues ?? []),
          JSON.stringify(item.indicateurs_surveillance ?? []),
          item.dernier_suivi ?? null,
        ]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO risques (
            code, nom, description, categorie, probabilite, impact, niveau, statut, plan_attenuation,
            responsable, date_identification, date_cloture, province, actions_prevues, indicateurs_surveillance, dernier_suivi
          ) VALUES ${risquePlaceholders}`,
          risqueValues,
        );

        const [risqueRows] = await getDbPool().query<Array<RowDataPacket & { id: number; code: string }>>('SELECT id, code FROM risques');
        const riskByCode = new Map(risqueRows.map((row) => [row.code, row.id]));
        const orderedRiskIds = RISQUES_SEED.map((item) => riskByCode.get(item.code) ?? 0);

        const alertePlaceholders = RISQUE_ALERTES_SEED.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const alerteValues = RISQUE_ALERTES_SEED.flatMap((item) => [
          orderedRiskIds[item.id_risque - 1],
          item.message,
          item.date_alerte,
          item.est_lue ? 1 : 0,
          item.niveau,
        ]);
        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO risque_alertes (id_risque, message, date_alerte, est_lue, niveau) VALUES ${alertePlaceholders}`,
          alerteValues,
        );

        const actionPlaceholders = RISQUE_ACTIONS_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        const actionValues = RISQUE_ACTIONS_SEED.flatMap((item) => [
          orderedRiskIds[item.id_risque - 1],
          item.action,
          item.responsable,
          item.date_debut,
          item.date_fin,
          item.statut,
          item.resultat ?? null,
        ]);
        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO risque_actions (id_risque, action, responsable, date_debut, date_fin, statut, resultat) VALUES ${actionPlaceholders}`,
          actionValues,
        );
      }
    })().catch((error) => {
      risquesTablesReady = null;
      throw error;
    });
  }

  await risquesTablesReady;
};

const ensureProvincesTables = async (): Promise<void> => {
  if (!provincesTablesReady) {
    provincesTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS provinces (
          id VARCHAR(64) NOT NULL,
          name VARCHAR(128) NOT NULL,
          code VARCHAR(16) NOT NULL,
          region VARCHAR(64) NOT NULL,
          population BIGINT NOT NULL DEFAULT 0,
          progression INT NOT NULL DEFAULT 0,
          performance_score INT NOT NULL DEFAULT 0,
          progression_delta INT NOT NULL DEFAULT 0,
          beneficiaires JSON NOT NULL,
          production JSON NOT NULL,
          infrastructures JSON NOT NULL,
          indicateurs JSON NOT NULL,
          risques JSON NOT NULL,
          plaintes JSON NOT NULL,
          dernier_suivi DATE NOT NULL,
          coord_lat DECIMAL(10,6) DEFAULT NULL,
          coord_lng DECIMAL(10,6) DEFAULT NULL,
          PRIMARY KEY (id),
          UNIQUE KEY uq_provinces_code (code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS province_evolution (
          id INT NOT NULL AUTO_INCREMENT,
          province_id VARCHAR(64) NOT NULL,
          mois VARCHAR(16) NOT NULL,
          beneficiaires INT NOT NULL DEFAULT 0,
          production INT NOT NULL DEFAULT 0,
          routes INT NOT NULL DEFAULT 0,
          sort_order INT NOT NULL DEFAULT 0,
          PRIMARY KEY (id),
          KEY idx_province_evolution_province (province_id),
          CONSTRAINT fk_province_evolution_province FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM provinces');
      if (Number(countRows[0]?.total ?? 0) === 0 && PROVINCES_SEED.length > 0) {
        const provincePlaceholders = PROVINCES_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const provinceValues = PROVINCES_SEED.flatMap((item) => [
          item.id,
          item.name,
          item.code,
          item.region,
          item.population,
          item.progression,
          item.performance_score,
          item.progression_delta,
          JSON.stringify(item.beneficiaires),
          JSON.stringify(item.production),
          JSON.stringify(item.infrastructures),
          JSON.stringify(item.indicateurs),
          JSON.stringify(item.risques),
          JSON.stringify(item.plaintes),
          item.dernier_suivi,
          item.coordonnees?.lat ?? null,
          item.coordonnees?.lng ?? null,
        ]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO provinces (
            id, name, code, region, population, progression, performance_score, progression_delta,
            beneficiaires, production, infrastructures, indicateurs, risques, plaintes,
            dernier_suivi, coord_lat, coord_lng
          ) VALUES ${provincePlaceholders}`,
          provinceValues,
        );

        const evolutionPlaceholders = PROVINCE_EVOLUTION_SEED.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const evolutionValues = PROVINCE_EVOLUTION_SEED.flatMap((item) => [
          item.province_id,
          item.mois,
          item.beneficiaires,
          item.production,
          item.routes,
          item.sort_order,
        ]);

        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO province_evolution (province_id, mois, beneficiaires, production, routes, sort_order) VALUES ${evolutionPlaceholders}`,
          evolutionValues,
        );
      }
    })().catch((error) => {
      provincesTablesReady = null;
      throw error;
    });
  }

  await provincesTablesReady;
};

const ensurePowerBITables = async (): Promise<void> => {
  if (!powerBITablesReady) {
    powerBITablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS powerbi_reports (
          id VARCHAR(32) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          embed_url VARCHAR(512) NOT NULL,
          report_id VARCHAR(128) NOT NULL,
          dataset_id VARCHAR(128) NOT NULL,
          category VARCHAR(64) NOT NULL,
          thumbnail_url VARCHAR(512) DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_powerbi_reports_report_id (report_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS powerbi_dashboards (
          id VARCHAR(32) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          embed_url VARCHAR(512) NOT NULL,
          dashboard_id VARCHAR(128) NOT NULL,
          category VARCHAR(64) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_powerbi_dashboards_dashboard_id (dashboard_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [reportsCountRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM powerbi_reports');
      if (Number(reportsCountRows[0]?.total ?? 0) === 0 && POWERBI_REPORTS_SEED.length > 0) {
        const placeholders = POWERBI_REPORTS_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = POWERBI_REPORTS_SEED.flatMap((item) => [
          item.id,
          item.name,
          item.description,
          item.embedUrl,
          item.reportId,
          item.datasetId,
          item.category,
          item.thumbnailUrl ?? null,
        ]);
        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO powerbi_reports (id, name, description, embed_url, report_id, dataset_id, category, thumbnail_url) VALUES ${placeholders}`,
          values,
        );
      }

      const [dashboardsCountRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM powerbi_dashboards');
      if (Number(dashboardsCountRows[0]?.total ?? 0) === 0 && POWERBI_DASHBOARDS_SEED.length > 0) {
        const placeholders = POWERBI_DASHBOARDS_SEED.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const values = POWERBI_DASHBOARDS_SEED.flatMap((item) => [
          item.id,
          item.name,
          item.description,
          item.embedUrl,
          item.dashboardId,
          item.category,
        ]);
        await getDbPool().query<ResultSetHeader>(
          `INSERT INTO powerbi_dashboards (id, name, description, embed_url, dashboard_id, category) VALUES ${placeholders}`,
          values,
        );
      }
    })().catch((error) => {
      powerBITablesReady = null;
      throw error;
    });
  }

  await powerBITablesReady;
};

const ensureOTTables = async (): Promise<void> => {
  if (!otTablesReady) {
    otTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS ot_profile (
          id VARCHAR(32) NOT NULL,
          nom VARCHAR(255) NOT NULL,
          sigle VARCHAR(64) NOT NULL,
          region VARCHAR(128) NOT NULL,
          provinces JSON NOT NULL,
          responsable JSON NOT NULL,
          performances JSON NOT NULL,
          indicateurs JSON NOT NULL,
          objectifs JSON NOT NULL,
          zones JSON NOT NULL,
          dernier_suivi DATE NOT NULL,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS ot_activites (
          id INT NOT NULL AUTO_INCREMENT,
          type VARCHAR(32) NOT NULL,
          titre VARCHAR(255) NOT NULL,
          description TEXT DEFAULT NULL,
          date DATE NOT NULL,
          province VARCHAR(128) NOT NULL,
          territoire VARCHAR(128) DEFAULT NULL,
          village VARCHAR(128) DEFAULT NULL,
          statut VARCHAR(32) NOT NULL,
          responsable VARCHAR(255) DEFAULT NULL,
          participants INT DEFAULT NULL,
          resultats TEXT DEFAULT NULL,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS ot_equipiers (
          id INT NOT NULL AUTO_INCREMENT,
          nom VARCHAR(128) NOT NULL,
          prenom VARCHAR(128) NOT NULL,
          fonction VARCHAR(32) NOT NULL,
          telephone VARCHAR(64) DEFAULT NULL,
          email VARCHAR(255) DEFAULT NULL,
          province VARCHAR(128) NOT NULL,
          performance INT NOT NULL DEFAULT 0,
          enquetes_realisees INT NOT NULL DEFAULT 0,
          dernier_suivi DATE NOT NULL,
          est_actif TINYINT(1) NOT NULL DEFAULT 1,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS ot_rapports (
          id INT NOT NULL AUTO_INCREMENT,
          mois VARCHAR(32) NOT NULL,
          annee INT NOT NULL,
          enquetes INT NOT NULL DEFAULT 0,
          formations INT NOT NULL DEFAULT 0,
          suivis INT NOT NULL DEFAULT 0,
          qualite_donnees INT NOT NULL DEFAULT 0,
          commentaires TEXT DEFAULT NULL,
          soumis_le DATE NOT NULL,
          valide TINYINT(1) NOT NULL DEFAULT 0,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [profileRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM ot_profile');
      if (Number(profileRows[0]?.total ?? 0) === 0 && OT_PROFILE_SEED.id) {
        await getDbPool().execute(
          `INSERT INTO ot_profile (id, nom, sigle, region, provinces, responsable, performances, indicateurs, objectifs, zones, dernier_suivi)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            OT_PROFILE_SEED.id,
            OT_PROFILE_SEED.nom,
            OT_PROFILE_SEED.sigle,
            OT_PROFILE_SEED.region,
            JSON.stringify(OT_PROFILE_SEED.provinces),
            JSON.stringify(OT_PROFILE_SEED.responsable),
            JSON.stringify(OT_PROFILE_SEED.performances),
            JSON.stringify(OT_PROFILE_SEED.indicateurs),
            JSON.stringify(OT_PROFILE_SEED.objectifs),
            JSON.stringify(OT_PROFILE_SEED.zones),
            OT_PROFILE_SEED.dernier_suivi,
          ],
        );
      }

      const [activiteRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM ot_activites');
      if (Number(activiteRows[0]?.total ?? 0) === 0 && OT_ACTIVITES_SEED.length > 0) {
        const placeholders = OT_ACTIVITES_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = OT_ACTIVITES_SEED.flatMap((item) => [
          item.type,
          item.titre,
          item.description,
          item.date,
          item.province,
          item.territoire,
          item.village,
          item.statut,
          item.responsable,
          item.participants ?? null,
          item.resultats ?? null,
        ]);
        await getDbPool().query(
          `INSERT INTO ot_activites (type, titre, description, date, province, territoire, village, statut, responsable, participants, resultats) VALUES ${placeholders}`,
          values,
        );
      }

      const [equipierRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM ot_equipiers');
      if (Number(equipierRows[0]?.total ?? 0) === 0 && OT_EQUIPIERS_SEED.length > 0) {
        const placeholders = OT_EQUIPIERS_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = OT_EQUIPIERS_SEED.flatMap((item) => [
          item.nom,
          item.prenom,
          item.fonction,
          item.telephone,
          item.email,
          item.province,
          item.performance,
          item.enquetes_realisees,
          item.dernier_suivi,
          item.est_actif ? 1 : 0,
        ]);
        await getDbPool().query(
          `INSERT INTO ot_equipiers (nom, prenom, fonction, telephone, email, province, performance, enquetes_realisees, dernier_suivi, est_actif) VALUES ${placeholders}`,
          values,
        );
      }

      const [rapportRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM ot_rapports');
      if (Number(rapportRows[0]?.total ?? 0) === 0 && OT_RAPPORTS_SEED.length > 0) {
        const placeholders = OT_RAPPORTS_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = OT_RAPPORTS_SEED.flatMap((item) => [
          item.mois,
          item.annee,
          item.enquetes,
          item.formations,
          item.suivis,
          item.qualite_donnees,
          item.commentaires,
          item.soumis_le,
          item.valide ? 1 : 0,
        ]);
        await getDbPool().query(
          `INSERT INTO ot_rapports (mois, annee, enquetes, formations, suivis, qualite_donnees, commentaires, soumis_le, valide) VALUES ${placeholders}`,
          values,
        );
      }
    })().catch((error) => {
      otTablesReady = null;
      throw error;
    });
  }

  await otTablesReady;
};

const ensureSuiviTables = async (): Promise<void> => {
  if (!suiviTablesReady) {
    suiviTablesReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS suivi_missions (
          id INT NOT NULL,
          num VARCHAR(32) NOT NULL,
          section INT NOT NULL,
          section_label VARCHAR(255) NOT NULL,
          nature_mission TEXT NOT NULL,
          objectif TEXT DEFAULT NULL,
          hors_projet INT NOT NULL DEFAULT 0,
          projet INT NOT NULL DEFAULT 0,
          montant_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
          dates VARCHAR(64) DEFAULT NULL,
          avance_usd DECIMAL(12,2) NOT NULL DEFAULT 0,
          solde DECIMAL(12,2) NOT NULL DEFAULT 0,
          province VARCHAR(128) NOT NULL,
          PRIMARY KEY (id),
          KEY idx_suivi_missions_province (province)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );

      const [countRows] = await getDbPool().query<CountRow[]>('SELECT COUNT(*) AS total FROM suivi_missions');
      if (Number(countRows[0]?.total ?? 0) === 0 && SUIVI_MISSIONS_SEED.length > 0) {
        const placeholders = SUIVI_MISSIONS_SEED.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = SUIVI_MISSIONS_SEED.flatMap((item) => [
          item.id,
          item.num,
          item.section,
          item.sectionLabel,
          item.natureMission,
          item.objectif,
          item.horsProjet,
          item.projet,
          item.montantUSD,
          item.dates,
          item.avanceUSD,
          item.solde,
          item.province,
        ]);
        await getDbPool().query(
          `INSERT INTO suivi_missions (id, num, section, section_label, nature_mission, objectif, hors_projet, projet, montant_usd, dates, avance_usd, solde, province) VALUES ${placeholders}`,
          values,
        );
      }
    })().catch((error) => {
      suiviTablesReady = null;
      throw error;
    });
  }

  await suiviTablesReady;
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

const sqlIdentifier = (value: string) => `\`${value.replace(/`/g, '``')}\``;

const buildQualifiedColumnExpr = (tableRef: string, columns: Set<string>, candidates: string[], fallback = 'NULL') => {
  for (const candidate of candidates) {
    if (columns.has(candidate)) {
      return `${tableRef}.${sqlIdentifier(candidate)}`;
    }
  }

  return fallback;
};

const buildCoalescedColumnExpr = (tableRef: string, columns: Set<string>, candidates: string[], fallback = 'NULL') => {
  const expressions = candidates
    .filter((candidate) => columns.has(candidate))
    .map((candidate) => `${tableRef}.${sqlIdentifier(candidate)}`);

  if (expressions.length === 0) {
    return fallback;
  }

  return expressions.length === 1 ? expressions[0] : `COALESCE(${expressions.join(', ')})`;
};

const buildBeneficiaireSourceConfig = (tableName: string, columns: Set<string>): BeneficiaireSourceConfig | null => {
  const tableRef = sqlIdentifier(tableName);
  const idExpr = buildQualifiedColumnExpr(tableRef, columns, ['id', 'id_beneficiaire', 'beneficiaire_id']);

  if (idExpr === 'NULL') {
    return null;
  }

  const rnaExpr = buildCoalescedColumnExpr(tableRef, columns, ['rna_id', 'farmer_id', 'code_rna'], `CAST(${idExpr} AS CHAR)`);
  const provinceExpr = buildCoalescedColumnExpr(tableRef, columns, ['province'], "''");
  const territoireExpr = buildCoalescedColumnExpr(tableRef, columns, ['territoire'], "''");
  const secteurExpr = buildCoalescedColumnExpr(tableRef, columns, ['secteur'], "''");
  const groupementExpr = buildCoalescedColumnExpr(tableRef, columns, ['groupement'], "''");
  const villageExpr = buildCoalescedColumnExpr(tableRef, columns, ['village'], "''");
  const sexeExpr = buildCoalescedColumnExpr(tableRef, columns, ['sexe', 'genre'], 'NULL');
  const ageExpr = buildCoalescedColumnExpr(tableRef, columns, ['age'], 'NULL');
  const dateNaissanceExpr = buildCoalescedColumnExpr(tableRef, columns, ['date_naissance', 'dateNaissance', 'annee_naissance'], 'NULL');
  const saisonExpr = buildCoalescedColumnExpr(tableRef, columns, ['saison'], "''");
  const ptechExpr = buildCoalescedColumnExpr(tableRef, columns, ['ptech', 'technique', 'type_activite'], "''");
  const createdAtExpr = buildCoalescedColumnExpr(tableRef, columns, ['created_at', 'date_adhesion', 'date_creation', 'updated_at'], 'CURRENT_TIMESTAMP');
  const typeExploitantExpr = buildCoalescedColumnExpr(tableRef, columns, ['type_exploitant'], tableName === 'agriculteurs' ? "'agriculteur'" : "'agriculteur'");

  let nomCompletExpr = buildCoalescedColumnExpr(tableRef, columns, ['nom_complet'], 'NULL');

  if (nomCompletExpr === 'NULL') {
    const nomExpr = buildCoalescedColumnExpr(tableRef, columns, ['nom'], 'NULL');
    const prenomExpr = buildCoalescedColumnExpr(tableRef, columns, ['prenom', 'postnom'], 'NULL');

    if (nomExpr !== 'NULL' || prenomExpr !== 'NULL') {
      nomCompletExpr = `TRIM(CONCAT_WS(' ', ${nomExpr === 'NULL' ? 'NULL' : nomExpr}, ${prenomExpr === 'NULL' ? 'NULL' : prenomExpr}))`;
    }
  }

  if (nomCompletExpr === 'NULL') {
    nomCompletExpr = `CAST(${idExpr} AS CHAR)`;
  }

  return {
    tableName,
    tableRef,
    idExpr,
    rnaExpr,
    provinceExpr,
    territoireExpr,
    secteurExpr,
    groupementExpr,
    villageExpr,
    nomCompletExpr,
    sexeExpr,
    ageExpr,
    dateNaissanceExpr,
    saisonExpr,
    ptechExpr,
    createdAtExpr,
    typeExploitantExpr,
  };
};

const ensureBeneficiairesTable = async (): Promise<void> => {
  await getDbPool().query(
    `CREATE TABLE IF NOT EXISTS beneficiaires (
      id INT NOT NULL AUTO_INCREMENT,
      rna_id VARCHAR(64) DEFAULT NULL,
      nom_complet VARCHAR(255) NOT NULL,
      sexe VARCHAR(16) DEFAULT NULL,
      province VARCHAR(128) DEFAULT NULL,
      territoire VARCHAR(128) DEFAULT NULL,
      secteur VARCHAR(128) DEFAULT NULL,
      groupement VARCHAR(255) DEFAULT NULL,
      village VARCHAR(255) DEFAULT NULL,
      saison VARCHAR(128) DEFAULT NULL,
      ptech VARCHAR(255) DEFAULT NULL,
      type_exploitant VARCHAR(64) DEFAULT 'agriculteur',
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_beneficiaires_rna_id (rna_id),
      KEY idx_beneficiaires_province (province),
      KEY idx_beneficiaires_sexe (sexe)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  );
};

const resolveBeneficiaireSource = async (): Promise<BeneficiaireSourceConfig> => {
  if (!beneficiaireSourcePromise) {
    beneficiaireSourcePromise = (async () => {
      const [rows] = await getDbPool().query<BeneficiaireSourceColumnRow[]>(
        `SELECT TABLE_NAME, COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME IN ('beneficiaires', 'agriculteurs')`,
      );

      const columnsByTable = new Map<string, Set<string>>();
      for (const row of rows) {
        if (!columnsByTable.has(row.TABLE_NAME)) {
          columnsByTable.set(row.TABLE_NAME, new Set<string>());
        }

        columnsByTable.get(row.TABLE_NAME)?.add(row.COLUMN_NAME);
      }

      for (const tableName of ['beneficiaires', 'agriculteurs']) {
        const columns = columnsByTable.get(tableName);
        if (!columns) {
          continue;
        }

        const config = buildBeneficiaireSourceConfig(tableName, columns);
        if (config) {
          return config;
        }
      }

      await ensureBeneficiairesTable();
      return buildBeneficiaireSourceConfig('beneficiaires', new Set<string>([
        'id',
        'rna_id',
        'nom_complet',
        'sexe',
        'province',
        'territoire',
        'secteur',
        'groupement',
        'village',
        'saison',
        'ptech',
        'age',
        'date_naissance',
        'type_exploitant',
        'created_at',
        'updated_at',
      ])) as BeneficiaireSourceConfig;
    })().catch((error) => {
      beneficiaireSourcePromise = null;
      throw error;
    });
  }

  return beneficiaireSourcePromise;
};

export const getAgriculteursSummary = async (): Promise<AgriculteursSummary> => {
  const source = await resolveBeneficiaireSource();
  const [rows] = await getDbPool().query<CountRow[]>(`SELECT COUNT(*) AS total FROM ${source.tableRef}`);

  return {
    total: Number(rows[0]?.total ?? 0),
  };
};

export const getAgriculteursDashboardOverview = async (): Promise<AgriculteursDashboardOverview> => {
  const source = await resolveBeneficiaireSource();
  const pool = getDbPool();
  const [summaryRows, provinceRows, monthlyRows] = await Promise.all([
    pool.query<Array<RowDataPacket & { total: number; femmes: number; hommes: number; provinces: number }>>(
      `SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN LOWER(COALESCE(${source.sexeExpr}, '')) LIKE 'f%' THEN 1 ELSE 0 END) AS femmes,
          SUM(CASE WHEN LOWER(COALESCE(${source.sexeExpr}, '')) LIKE 'm%' OR ${source.sexeExpr} IS NULL OR ${source.sexeExpr} = '' THEN 1 ELSE 0 END) AS hommes,
          COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '')) AS provinces
       FROM ${source.tableRef}`
    ),
    pool.query<BeneficiaireGroupRow[]>(
      `SELECT NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '') AS label, COUNT(*) AS total
       FROM ${source.tableRef}
       GROUP BY NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '')`
    ),
    pool.query<BeneficiaireGroupRow[]>(
      `SELECT DATE_FORMAT(${source.createdAtExpr}, '%Y-%m') AS label, COUNT(*) AS total
       FROM ${source.tableRef}
       GROUP BY DATE_FORMAT(${source.createdAtExpr}, '%Y-%m')
       ORDER BY DATE_FORMAT(${source.createdAtExpr}, '%Y-%m') ASC`
    ),
  ]);

  return {
    total: Number(summaryRows[0][0]?.total ?? 0),
    femmes: Number(summaryRows[0][0]?.femmes ?? 0),
    hommes: Number(summaryRows[0][0]?.hommes ?? 0),
    provinces: Number(summaryRows[0][0]?.provinces ?? 0),
    parProvince: mapGroupRowsToRecord(provinceRows[0]),
    evolution: (monthlyRows[0] ?? []).map((row) => ({
      month: formatMonthLabel(String(row.label ?? '')),
      total: Number(row.total ?? 0),
    })),
  };
};

const normalizeSexe = (value: string | null): 'M' | 'F' => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized.startsWith('f') ? 'F' : 'M';
};

const mapAgriculteurRow = (row: AgriculteurRow): SqlBeneficiaire => ({
  id: row.id,
  rna_id: String(row.rna_id ?? row.id),
  nom_complet: row.nom_complet ?? String(row.id),
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

const buildBeneficiaireWhereClause = (filters: SqlBeneficiaireFilters, source: BeneficiaireSourceConfig) => {
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.search) {
    clauses.push(`(${source.nomCompletExpr} LIKE ? OR CAST(${source.rnaExpr} AS CHAR) LIKE ? OR ${source.provinceExpr} LIKE ? OR ${source.territoireExpr} LIKE ? OR ${source.villageExpr} LIKE ?)`);
    const search = `%${filters.search}%`;
    values.push(search, search, search, search, search);
  }

  if (filters.province) {
    clauses.push(`${source.provinceExpr} = ?`);
    values.push(filters.province);
  }

  if (filters.sexe) {
    if (filters.sexe === 'F') {
      clauses.push(`LOWER(COALESCE(${source.sexeExpr}, "")) LIKE ?`);
      values.push('f%');
    } else if (filters.sexe === 'M') {
      clauses.push(`(LOWER(COALESCE(${source.sexeExpr}, "")) LIKE ? OR ${source.sexeExpr} IS NULL OR ${source.sexeExpr} = "")`);
      values.push('m%');
    }
  }

  if (filters.type) {
    clauses.push(`LOWER(COALESCE(${source.typeExploitantExpr}, "")) = ?`);
    values.push(filters.type.trim().toLowerCase());
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

export const getBeneficiaires = async (filters: SqlBeneficiaireFilters) => {
  const source = await resolveBeneficiaireSource();
  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 10);
  const offset = page * limit;
  const { whereClause, values } = buildBeneficiaireWhereClause(filters, source);

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM ${source.tableRef} ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<AgriculteurRow[]>(
    `SELECT ${source.idExpr} AS id,
            ${source.rnaExpr} AS rna_id,
            ${source.provinceExpr} AS province,
            ${source.territoireExpr} AS territoire,
            ${source.secteurExpr} AS secteur,
            ${source.groupementExpr} AS groupement,
            ${source.villageExpr} AS village,
            ${source.nomCompletExpr} AS nom_complet,
            ${source.sexeExpr} AS sexe,
            ${source.saisonExpr} AS saison,
            ${source.ptechExpr} AS ptech,
            ${source.createdAtExpr} AS created_at
     FROM ${source.tableRef}
     ${whereClause}
     ORDER BY ${source.idExpr} DESC
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
  const source = await resolveBeneficiaireSource();
  const [rows] = await getDbPool().query<AgriculteurRow[]>(
    `SELECT ${source.idExpr} AS id,
            ${source.rnaExpr} AS rna_id,
            ${source.provinceExpr} AS province,
            ${source.territoireExpr} AS territoire,
            ${source.secteurExpr} AS secteur,
            ${source.groupementExpr} AS groupement,
            ${source.villageExpr} AS village,
            ${source.nomCompletExpr} AS nom_complet,
            ${source.sexeExpr} AS sexe,
            ${source.saisonExpr} AS saison,
            ${source.ptechExpr} AS ptech,
            ${source.createdAtExpr} AS created_at
     FROM ${source.tableRef}
     WHERE ${source.idExpr} = ?
     LIMIT 1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  return mapAgriculteurRow(rows[0]);
};

export const getBeneficiaireStats = async (): Promise<SqlBeneficiaireStats> => {
  const source = await resolveBeneficiaireSource();
  const [rows] = await getDbPool().query<BeneficiaireStatsRow[]>(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN LOWER(COALESCE(${source.sexeExpr}, '')) LIKE 'f%' THEN 1 ELSE 0 END) AS femmes,
        SUM(CASE WHEN LOWER(COALESCE(${source.sexeExpr}, '')) LIKE 'm%' THEN 1 ELSE 0 END) AS hommes,
        COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '')) AS provinces
      FROM ${source.tableRef}`,
  );

  return {
    total: Number(rows[0]?.total ?? 0),
    femmes: Number(rows[0]?.femmes ?? 0),
    hommes: Number(rows[0]?.hommes ?? 0),
    provinces: Number(rows[0]?.provinces ?? 0),
  };
};

const ensureCartesAgriculteursTable = async (): Promise<void> => {
  if (!cartesAgriculteursTableReady) {
    cartesAgriculteursTableReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS cartes_agriculteurs (
          id INT NOT NULL AUTO_INCREMENT,
          rna_id VARCHAR(64) NOT NULL,
          numero_carte VARCHAR(64) DEFAULT NULL,
          statut_carte VARCHAR(32) NOT NULL DEFAULT 'a_imprimer',
          date_distribution DATE DEFAULT NULL,
          agent_distribution VARCHAR(255) DEFAULT NULL,
          observations TEXT DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_cartes_agriculteurs_rna (rna_id),
          UNIQUE KEY uq_cartes_agriculteurs_numero (numero_carte),
          KEY idx_cartes_agriculteurs_statut (statut_carte),
          KEY idx_cartes_agriculteurs_date_distribution (date_distribution)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    })().catch((error) => {
      cartesAgriculteursTableReady = null;
      throw error;
    });
  }

  await cartesAgriculteursTableReady;
};

const ensureVentesSemencesTable = async (): Promise<void> => {
  if (!ventesSemencesTableReady) {
    ventesSemencesTableReady = (async () => {
      await getDbPool().query(
        `CREATE TABLE IF NOT EXISTS ventes_semences (
          id INT NOT NULL AUTO_INCREMENT,
          rna_id VARCHAR(64) NOT NULL,
          province VARCHAR(128) DEFAULT NULL,
          producteur_nom VARCHAR(255) DEFAULT NULL,
          type_semence VARCHAR(255) NOT NULL,
          quantite_kg DECIMAL(12, 2) NOT NULL DEFAULT 0,
          montant_usd DECIMAL(12, 2) NOT NULL DEFAULT 0,
          date_vente DATE NOT NULL,
          observations TEXT DEFAULT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_ventes_semences_rna_id (rna_id),
          KEY idx_ventes_semences_province (province),
          KEY idx_ventes_semences_type_semence (type_semence),
          KEY idx_ventes_semences_date_vente (date_vente)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      );
    })().catch((error) => {
      ventesSemencesTableReady = null;
      throw error;
    });
  }

  await ventesSemencesTableReady;
};

const normalizeCarteStatut = (value: string | null | undefined): SqlCarteAgriculteur['statut_carte'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('distrib')) {
    return 'distribuee';
  }

  if (normalized.includes('attente')) {
    return 'en_attente';
  }

  return 'a_imprimer';
};

const buildCarteAgriculteurWhereClause = (
  filters: SqlCarteAgriculteurFilters,
  source: BeneficiaireSourceConfig,
): { whereClause: string; values: Array<string | number> } => {
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.search) {
    const search = `%${filters.search}%`;
    clauses.push(`(${source.nomCompletExpr} LIKE ? OR CAST(${source.rnaExpr} AS CHAR) LIKE ? OR ${source.territoireExpr} LIKE ? OR cartes_agriculteurs.numero_carte LIKE ?)`);
    values.push(search, search, search, search);
  }

  if (filters.province) {
    clauses.push(`${source.provinceExpr} = ?`);
    values.push(filters.province);
  }

  if (filters.statut) {
    clauses.push(`COALESCE(cartes_agriculteurs.statut_carte, 'a_imprimer') = ?`);
    values.push(filters.statut);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const mapCarteAgriculteurRow = (row: CarteAgriculteurRow): SqlCarteAgriculteur => ({
  id: Number(row.id),
  rna_id: String(row.rna_id ?? row.id),
  nom_complet: row.nom_complet ?? String(row.rna_id ?? row.id),
  sexe: normalizeSexe(row.sexe),
  province: row.province ?? '',
  territoire: row.territoire ?? '',
  producteur_enregistre: Boolean(row.producteur_enregistre),
  statut_carte: normalizeCarteStatut(row.statut_carte),
  numero_carte: row.numero_carte ?? undefined,
  date_distribution: toOptionalIsoString(row.date_distribution),
});

export const getCartesAgriculteurs = async (filters: SqlCarteAgriculteurFilters) => {
  await ensureCartesAgriculteursTable();
  const source = await resolveBeneficiaireSource();
  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 10);
  const offset = page * limit;
  const { whereClause, values } = buildCarteAgriculteurWhereClause(filters, source);

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total
     FROM ${source.tableRef}
     LEFT JOIN cartes_agriculteurs ON cartes_agriculteurs.rna_id = CAST(${source.rnaExpr} AS CHAR)
     ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<CarteAgriculteurRow[]>(
    `SELECT ${source.idExpr} AS id,
            CAST(${source.rnaExpr} AS CHAR) AS rna_id,
            ${source.nomCompletExpr} AS nom_complet,
            ${source.sexeExpr} AS sexe,
            ${source.provinceExpr} AS province,
            ${source.territoireExpr} AS territoire,
            1 AS producteur_enregistre,
            COALESCE(cartes_agriculteurs.statut_carte, 'a_imprimer') AS statut_carte,
            cartes_agriculteurs.numero_carte AS numero_carte,
            cartes_agriculteurs.date_distribution AS date_distribution
     FROM ${source.tableRef}
     LEFT JOIN cartes_agriculteurs ON cartes_agriculteurs.rna_id = CAST(${source.rnaExpr} AS CHAR)
     ${whereClause}
     ORDER BY ${source.idExpr} DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map(mapCarteAgriculteurRow),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getCartesAgriculteursStats = async (
  filters: SqlCarteAgriculteurFilters = {},
): Promise<SqlCarteAgriculteurStats> => {
  await ensureCartesAgriculteursTable();
  const source = await resolveBeneficiaireSource();
  const { whereClause, values } = buildCarteAgriculteurWhereClause(filters, source);

  const [rows] = await getDbPool().query<CarteAgriculteurStatsRow[]>(
    `SELECT
        COUNT(*) AS total,
        COUNT(*) AS producteurs_enregistres,
        SUM(CASE WHEN COALESCE(cartes_agriculteurs.statut_carte, 'a_imprimer') = 'distribuee' THEN 1 ELSE 0 END) AS distribuees,
        SUM(CASE WHEN COALESCE(cartes_agriculteurs.statut_carte, 'a_imprimer') = 'en_attente' THEN 1 ELSE 0 END) AS en_attente,
        SUM(CASE WHEN COALESCE(cartes_agriculteurs.statut_carte, 'a_imprimer') = 'a_imprimer' THEN 1 ELSE 0 END) AS a_imprimer,
        COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '')) AS provinces
     FROM ${source.tableRef}
     LEFT JOIN cartes_agriculteurs ON cartes_agriculteurs.rna_id = CAST(${source.rnaExpr} AS CHAR)
     ${whereClause}`,
    values,
  );

  return {
    total: Number(rows[0]?.total ?? 0),
    producteurs_enregistres: Number(rows[0]?.producteurs_enregistres ?? 0),
    distribuees: Number(rows[0]?.distribuees ?? 0),
    en_attente: Number(rows[0]?.en_attente ?? 0),
    a_imprimer: Number(rows[0]?.a_imprimer ?? 0),
    provinces: Number(rows[0]?.provinces ?? 0),
  };
};

const buildVenteSemenceWhereClause = (
  filters: SqlVenteSemenceFilters,
  source: BeneficiaireSourceConfig,
): { whereClause: string; values: Array<string | number> } => {
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.search) {
    const search = `%${filters.search}%`;
    clauses.push(`(COALESCE(${source.nomCompletExpr}, ventes_semences.producteur_nom, '') LIKE ? OR ventes_semences.rna_id LIKE ? OR ventes_semences.type_semence LIKE ?)`);
    values.push(search, search, search);
  }

  if (filters.province) {
    clauses.push(`COALESCE(NULLIF(TRIM(${source.provinceExpr}), ''), NULLIF(TRIM(ventes_semences.province), '')) = ?`);
    values.push(filters.province);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const mapVenteSemenceRow = (row: VenteSemenceRow): SqlVenteSemence => ({
  id: Number(row.id),
  province: row.province ?? '',
  producteur: row.producteur ?? 'Producteur inconnu',
  rna_id: row.rna_id ?? '',
  type_semence: row.type_semence,
  quantite_kg: Number(row.quantite_kg ?? 0),
  montant_usd: Number(row.montant_usd ?? 0),
  date_vente: new Date(row.date_vente).toISOString(),
});

export const getVentesSemences = async (
  filters: SqlVenteSemenceFilters = {},
): Promise<{ data: SqlVenteSemence[]; total: number }> => {
  await ensureVentesSemencesTable();
  const source = await resolveBeneficiaireSource();
  const { whereClause, values } = buildVenteSemenceWhereClause(filters, source);

  const [rows] = await getDbPool().query<VenteSemenceRow[]>(
    `SELECT ventes_semences.id AS id,
            COALESCE(NULLIF(TRIM(${source.provinceExpr}), ''), NULLIF(TRIM(ventes_semences.province), ''), '') AS province,
            COALESCE(NULLIF(TRIM(${source.nomCompletExpr}), ''), NULLIF(TRIM(ventes_semences.producteur_nom), ''), 'Producteur inconnu') AS producteur,
            ventes_semences.rna_id AS rna_id,
            ventes_semences.type_semence AS type_semence,
            ventes_semences.quantite_kg AS quantite_kg,
            ventes_semences.montant_usd AS montant_usd,
            ventes_semences.date_vente AS date_vente
     FROM ventes_semences
     LEFT JOIN ${source.tableRef} ON ventes_semences.rna_id = CAST(${source.rnaExpr} AS CHAR)
     ${whereClause}
     ORDER BY ventes_semences.date_vente DESC, ventes_semences.id DESC`,
    values,
  );

  return {
    data: rows.map(mapVenteSemenceRow),
    total: rows.length,
  };
};

export const getVentesSemencesStats = async (
  filters: SqlVenteSemenceFilters = {},
): Promise<SqlVenteSemenceStats> => {
  await ensureVentesSemencesTable();
  const source = await resolveBeneficiaireSource();
  const { whereClause, values } = buildVenteSemenceWhereClause(filters, source);

  const [rows] = await getDbPool().query<VenteSemenceStatsRow[]>(
    `SELECT
        COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.provinceExpr}, ventes_semences.province, '')), '')) AS provinces_actives,
        COUNT(DISTINCT NULLIF(TRIM(ventes_semences.rna_id), '')) AS producteurs_enregistres,
        COALESCE(SUM(ventes_semences.quantite_kg), 0) AS semences_vendues_kg,
        COALESCE(SUM(ventes_semences.montant_usd), 0) AS montant_total_usd
     FROM ventes_semences
     LEFT JOIN ${source.tableRef} ON ventes_semences.rna_id = CAST(${source.rnaExpr} AS CHAR)
     ${whereClause}`,
    values,
  );

  return {
    provinces_actives: Number(rows[0]?.provinces_actives ?? 0),
    producteurs_enregistres: Number(rows[0]?.producteurs_enregistres ?? 0),
    semences_vendues_kg: Number(rows[0]?.semences_vendues_kg ?? 0),
    montant_total_usd: Number(rows[0]?.montant_total_usd ?? 0),
  };
};

const mapGroupRowsToRecord = (rows: BeneficiaireGroupRow[]): Record<string, number> => rows.reduce<Record<string, number>>((accumulator, row) => {
  const label = (row.label ?? '').trim();
  if (!label) {
    return accumulator;
  }

  accumulator[label] = Number(row.total ?? 0);
  return accumulator;
}, {});

const formatMonthLabel = (monthKey: string): string => {
  const [yearText, monthText] = monthKey.split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) {
    return monthKey;
  }

  const labels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
  return labels[month - 1] ?? monthKey;
};

const toOptionalIsoString = (value: string | Date | null | undefined): string | undefined => toIsoString(value) ?? undefined;

const mapPlainteRow = (row: PlainteRow): SqlPlainte => ({
  id: row.id,
  numero_plainte: row.numero_plainte,
  type: row.type as SqlPlainte['type'],
  description: row.description,
  province: row.province ?? '',
  territoire: row.territoire ?? '',
  village: row.village ?? '',
  beneficiaire_nom: row.beneficiaire_nom ?? undefined,
  beneficiaire_rna: row.beneficiaire_rna ?? undefined,
  date_reception: new Date(row.date_reception).toISOString(),
  date_traitement: toOptionalIsoString(row.date_traitement),
  statut: row.statut as SqlPlainte['statut'],
  delai_traite: row.delai_traite ?? undefined,
  prise_en_charge: row.prise_en_charge ?? undefined,
  resolution: row.resolution ?? undefined,
  est_confidentiel: Boolean(row.est_confidentiel),
});

const parseIntrants = (value: string | null): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const parseActiviteDocuments = (value: string | null): Array<{ nom: string; url: string }> => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (!item || typeof item !== 'object') {
            return null;
          }

          const nom = 'nom' in item ? String(item.nom ?? '').trim() : '';
          const url = 'url' in item ? String(item.url ?? '').trim() : '';
          if (!nom) {
            return null;
          }

          return { nom, url };
        })
        .filter((item): item is { nom: string; url: string } => Boolean(item));
    }
  } catch {
    return [];
  }

  return [];
};

const parseJsonObject = <T>(value: string | null, fallback: T): T => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

const normalizeRisqueLevel = (value: string | null | undefined): SqlRisque['niveau'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('crit')) {
    return 'Critique';
  }
  if (normalized.includes('eleve')) {
    return 'Élevé';
  }
  if (normalized.includes('moder')) {
    return 'Modéré';
  }

  return 'Faible';
};

const normalizeRisqueStatut = (value: string | null | undefined): SqlRisque['statut'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('en_cours') || normalized.includes('en cours')) {
    return 'en_cours';
  }
  if (normalized.includes('attenu') || normalized.includes('attenue')) {
    return 'atténue';
  }
  if (normalized.includes('clot')) {
    return 'cloture';
  }

  return 'identifie';
};

const normalizeActionStatut = (value: string | null | undefined): SqlActionAttenuation['statut'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('en_cours') || normalized.includes('en cours')) {
    return 'en_cours';
  }
  if (normalized.includes('realis')) {
    return 'realisee';
  }
  if (normalized.includes('aband')) {
    return 'abandonnee';
  }

  return 'prevue';
};

const normalizeAlerteNiveau = (value: string | null | undefined): SqlAlerteRisque['niveau'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('danger')) {
    return 'danger';
  }
  if (normalized.includes('warn')) {
    return 'warning';
  }

  return 'info';
};

const mapRisqueRow = (row: RisqueRow): SqlRisque => ({
  id: row.id,
  code: row.code,
  nom: row.nom,
  description: row.description ?? '',
  categorie: (row.categorie || 'gestion') as SqlRisque['categorie'],
  probabilite: Number(row.probabilite ?? 1) as SqlRisque['probabilite'],
  impact: Number(row.impact ?? 1) as SqlRisque['impact'],
  niveau: normalizeRisqueLevel(row.niveau),
  statut: normalizeRisqueStatut(row.statut),
  plan_attenuation: row.plan_attenuation ?? '',
  responsable: row.responsable ?? '',
  date_identification: toDateOnly(row.date_identification),
  date_cloture: toOptionalIsoString(row.date_cloture),
  province: row.province ?? undefined,
  actions_prevues: parseIntrants(row.actions_prevues),
  indicateurs_surveillance: parseIntrants(row.indicateurs_surveillance),
  dernier_suivi: toOptionalIsoString(row.dernier_suivi),
});

const mapAlerteRisqueRow = (row: AlerteRisqueRow): SqlAlerteRisque => ({
  id: row.id,
  id_risque: row.id_risque,
  message: row.message,
  date_alerte: toDateOnly(row.date_alerte),
  est_lue: Boolean(row.est_lue),
  niveau: normalizeAlerteNiveau(row.niveau),
});

const mapActionAttenuationRow = (row: ActionAttenuationRow): SqlActionAttenuation => ({
  id: row.id,
  id_risque: row.id_risque,
  action: row.action,
  responsable: row.responsable,
  date_debut: toDateOnly(row.date_debut),
  date_fin: toDateOnly(row.date_fin),
  statut: normalizeActionStatut(row.statut),
  resultat: row.resultat ?? undefined,
});

const mapProvinceName = (value: string): string => {
  switch (normalizeText(value)) {
    case 'kasai':
      return 'Kasaï';
    case 'mais':
      return 'Maïs';
    default:
      return value;
  }
};

const mapProvinceRow = (row: ProvinceRow): SqlProvinceData => {
  const production = parseJsonObject<Record<string, { actuel: number; cible: number; unite: string }>>(row.production, {});

  return {
    id: row.id,
    name: mapProvinceName(row.name),
    code: row.code,
    region: row.region,
    population: Number(row.population ?? 0),
    progression: Number(row.progression ?? 0),
    performance_score: Number(row.performance_score ?? 0),
    progression_delta: Number(row.progression_delta ?? 0),
    beneficiaires: parseJsonObject(row.beneficiaires, { total: 0, femmes: 0, hommes: 0, jeunes: 0, cible: 0 }),
    production: {
      'maïs': production['maïs'] ?? production.mais ?? { actuel: 0, cible: 0, unite: 'tonnes' },
      manioc: production.manioc ?? { actuel: 0, cible: 0, unite: 'tonnes' },
      arachide: production.arachide ?? { actuel: 0, cible: 0, unite: 'tonnes' },
    },
    infrastructures: parseJsonObject(row.infrastructures, {
      routes: { rehabilitees: 0, prevues: 0, unite: 'km' },
      cler: { fonctionnels: 0, total: 0 },
      marches: { construits: 0, prevus: 0 },
    }),
    indicateurs: parseJsonObject(row.indicateurs, {
      iodp1: { actuel: 0, cible: 0, trend: 0 },
      iodp2: { actuel: 0, cible: 0, trend: 0 },
      iodp3: { actuel: 0, cible: 0, trend: 0 },
    }),
    risques: parseJsonObject(row.risques, { critiques: 0, eleves: 0, moderes: 0, faibles: 0 }),
    plaintes: parseJsonObject(row.plaintes, { total: 0, traitees: 0, en_cours: 0, vbg: 0 }),
    dernier_suivi: toDateOnly(row.dernier_suivi),
    coordonnees: row.coord_lat !== null && row.coord_lng !== null
      ? { lat: Number(row.coord_lat), lng: Number(row.coord_lng) }
      : undefined,
  };
};

const mapPowerBIReportRow = (row: PowerBIReportRow): SqlPowerBIReport => ({
  id: row.id,
  name: row.name,
  description: row.description,
  embedUrl: row.embed_url ?? buildPowerBIEmbedUrl(row.report_id),
  reportId: row.report_id,
  datasetId: row.dataset_id,
  category: row.category as SqlPowerBIReport['category'],
  thumbnailUrl: row.thumbnail_url ?? undefined,
  created_at: toIsoString(row.created_at) ?? new Date().toISOString(),
  updated_at: toIsoString(row.updated_at) ?? new Date().toISOString(),
});

const mapPowerBIDashboardRow = (row: PowerBIDashboardRow): SqlPowerBIDashboard => ({
  id: row.id,
  name: row.name,
  description: row.description,
  embedUrl: row.embed_url,
  dashboardId: row.dashboard_id,
  category: row.category,
  created_at: toIsoString(row.created_at) ?? new Date().toISOString(),
});

const normalizeOTActiviteType = (value: string | null | undefined): SqlOTActivite['type'] => {
  const normalized = normalizeText(value);
  if (normalized.includes('format')) {
    return 'formation';
  }
  if (normalized.includes('suivi')) {
    return 'suivi';
  }
  if (normalized.includes('plain')) {
    return 'plainte';
  }
  return 'enquete';
};

const normalizeOTActiviteStatut = (value: string | null | undefined): SqlOTActivite['statut'] => {
  const normalized = normalizeText(value);
  if (normalized.includes('en_cours') || normalized.includes('en cours')) {
    return 'en_cours';
  }
  if (normalized.includes('term')) {
    return 'terminee';
  }
  if (normalized.includes('annul')) {
    return 'annulee';
  }
  return 'planifiee';
};

const normalizeOTFonction = (value: string | null | undefined): SqlOTEquipier['fonction'] => {
  const normalized = normalizeText(value);
  if (normalized.includes('super')) {
    return 'superviseur';
  }
  if (normalized.includes('techn')) {
    return 'technicien';
  }
  return 'enqueteur';
};

const mapOTActiviteRow = (row: OTActiviteRow): SqlOTActivite => ({
  id: row.id,
  type: normalizeOTActiviteType(row.type),
  titre: row.titre,
  description: row.description ?? '',
  date: toDateOnly(row.date),
  province: row.province,
  territoire: row.territoire ?? '',
  village: row.village ?? '',
  statut: normalizeOTActiviteStatut(row.statut),
  responsable: row.responsable ?? '',
  participants: row.participants === null ? undefined : Number(row.participants ?? 0),
  resultats: row.resultats ?? undefined,
});

const mapOTEquipierRow = (row: OTEquipierRow): SqlOTEquipier => ({
  id: row.id,
  nom: row.nom,
  prenom: row.prenom,
  fonction: normalizeOTFonction(row.fonction),
  telephone: row.telephone ?? '',
  email: row.email ?? '',
  province: row.province,
  performance: Number(row.performance ?? 0),
  enquetes_realisees: Number(row.enquetes_realisees ?? 0),
  dernier_suivi: toDateOnly(row.dernier_suivi),
  est_actif: Boolean(row.est_actif),
});

const mapOTRapportRow = (row: OTRapportRow): SqlOTRapportMensuel => ({
  id: row.id,
  mois: row.mois,
  annee: Number(row.annee ?? new Date().getFullYear()),
  enquetes: Number(row.enquetes ?? 0),
  formations: Number(row.formations ?? 0),
  suivis: Number(row.suivis ?? 0),
  qualite_donnees: Number(row.qualite_donnees ?? 0),
  commentaires: row.commentaires ?? '',
  soumis_le: toDateOnly(row.soumis_le),
  valide: Boolean(row.valide),
});

const mapSuiviMissionRow = (row: SuiviMissionRow): SqlSuiviMission => ({
  id: row.id,
  num: row.num,
  section: Number(row.section ?? 0),
  sectionLabel: row.section_label,
  natureMission: row.nature_mission,
  objectif: row.objectif ?? '',
  horsProjet: Number(row.hors_projet ?? 0),
  projet: Number(row.projet ?? 0),
  montantUSD: Number(row.montant_usd ?? 0),
  dates: row.dates ?? '',
  avanceUSD: Number(row.avance_usd ?? 0),
  solde: Number(row.solde ?? 0),
  province: row.province,
});

const mapOTProfileRow = (
  row: OTProfileRow,
  activites: SqlOTActivite[],
  equipiers: SqlOTEquipier[],
  rapports: SqlOTRapportMensuel[],
): SqlOTData => ({
  id: row.id,
  nom: row.nom,
  sigle: row.sigle,
  region: row.region,
  provinces: parseJsonObject<string[]>(row.provinces, []),
  responsable: parseJsonObject(row.responsable, { nom: '', email: '', telephone: '' }),
  equipes: {
    total: equipiers.length,
    superviseurs: equipiers.filter((item) => item.fonction === 'superviseur').length,
    enqueteurs: equipiers.filter((item) => item.fonction === 'enqueteur').length,
    techniciens: equipiers.filter((item) => item.fonction === 'technicien').length,
  },
  performances: parseJsonObject(row.performances, { taux_realisation: 0, taux_satisfaction: 0, qualite_donnees: 0, ponctualite: 0 }),
  activites: {
    enquetes_realisees: activites.filter((item) => item.type === 'enquete').length,
    formations_dispensees: activites.filter((item) => item.type === 'formation').length,
    suivis_effectues: activites.filter((item) => item.type === 'suivi').length,
    plaintes_traitees: activites.filter((item) => item.type === 'plainte').length,
  },
  indicateurs: parseJsonObject(row.indicateurs, { production: 0, adoption: 0, satisfaction: 0 }),
  objectifs: parseJsonObject(row.objectifs, {
    enquetes: { realises: 0, cible: 0 },
    formations: { realises: 0, cible: 0 },
    suivis: { realises: 0, cible: 0 },
  }),
  zones: parseJsonObject(row.zones, []),
  dernier_rapport: rapports.sort((a, b) => b.soumis_le.localeCompare(a.soumis_le))[0]?.soumis_le ?? toDateOnly(new Date()),
  dernier_suivi: toDateOnly(row.dernier_suivi),
});

const mapFournisseurRow = (row: FournisseurRow): SqlFournisseur => ({
  id: row.id,
  nom: row.nom,
  sigle: row.sigle ?? undefined,
  type: row.type,
  province: row.province,
  territoire: row.territoire,
  responsable: row.responsable,
  telephone: row.telephone,
  email: row.email ?? undefined,
  statut: row.statut as SqlFournisseur['statut'],
  stock_disponible: Number(row.stock_disponible ?? 0),
  stock_total: Number(row.stock_total ?? 0),
  beneficiaires_servis: Number(row.beneficiaires_servis ?? 0),
  montant_contrat: Number(row.montant_contrat ?? 0),
  taux_livraison: Number(row.taux_livraison ?? 0),
  date_contrat: toDateOnly(row.date_contrat),
  intrants: parseIntrants(row.intrants),
});

const buildFournisseurWhereClause = (filters: SqlFournisseurFilters) => {
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.search) {
    const search = `%${filters.search}%`;
    clauses.push('(nom LIKE ? OR responsable LIKE ? OR territoire LIKE ? OR province LIKE ?)');
    values.push(search, search, search, search);
  }

  if (filters.type) {
    clauses.push('type = ?');
    values.push(filters.type);
  }

  if (filters.province) {
    clauses.push('province = ?');
    values.push(filters.province);
  }

  if (filters.statut) {
    clauses.push('statut = ?');
    values.push(filters.statut);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const normalizeOrganisationType = (value: string | null | undefined): SqlOrganisation['type'] => {
  const normalized = normalizeText(value);

  switch (normalized) {
    case 'cooperative':
      return 'cooperative';
    case 'groupement':
      return 'groupement';
    case 'association':
    case 'ong':
      return 'association';
    case 'federation':
    case 'partenaire_financier':
    case 'partenaire_technique':
      return 'federation';
    case 'union':
    case 'gouvernemental':
    default:
      return 'union';
  }
};

const normalizeOrganisationStatut = (value: string | null | undefined): SqlOrganisation['statut'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('inactive')) {
    return 'inactive';
  }

  if (normalized.includes('supervision')) {
    return 'sous_supervision';
  }

  return 'active';
};

const mapOrganisationRow = (row: OrganisationRow): SqlOrganisation => ({
  id: row.id,
  code: row.code,
  nom: row.nom,
  sigle: row.sigle ?? '',
  nom_complet: row.nom_complet ?? row.nom,
  type: normalizeOrganisationType(row.type),
  source_type: row.source_type ?? undefined,
  date_creation: toDateOnly(row.date_creation),
  date_agrement: toIsoString(row.date_agrement) ?? undefined,
  province: row.province,
  territoire: row.territoire ?? '',
  commune: row.commune ?? undefined,
  adresse: row.adresse ?? '',
  contacts: {
    responsable: row.responsable,
    telephone: row.telephone,
    email: row.email ?? undefined,
  },
  membres: {
    total: Number(row.membres_total ?? 0),
    femmes: Number(row.membres_femmes ?? 0),
    hommes: Number(row.membres_hommes ?? 0),
    jeunes: Number(row.membres_jeunes ?? 0),
  },
  productions: parseIntrants(row.productions),
  statut: normalizeOrganisationStatut(row.statut),
  created_at: toIsoString(row.created_at) ?? new Date().toISOString(),
  updated_at: toIsoString(row.updated_at) ?? new Date().toISOString(),
  role: row.role ?? undefined,
  beneficiaires_couverts: Number(row.beneficiaires_couverts ?? 0),
  budget_alloue: Number(row.budget_alloue ?? 0),
  taux_execution: Number(row.taux_execution ?? 0),
});

const buildOrganisationWhereClause = (filters: SqlOrganisationFilters) => {
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.search) {
    const search = `%${filters.search}%`;
    clauses.push('(nom LIKE ? OR nom_complet LIKE ? OR code LIKE ? OR responsable LIKE ?)');
    values.push(search, search, search, search);
  }

  if (filters.type) {
    clauses.push('type = ?');
    values.push(filters.type);
  }

  if (filters.province) {
    clauses.push('province = ?');
    values.push(filters.province);
  }

  if (filters.statut) {
    clauses.push('statut = ?');
    values.push(filters.statut);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const normalizeActiviteType = (value: string | null | undefined): SqlActivite['type'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('enquet')) {
    return 'enquete';
  }
  if (normalized.includes('formation')) {
    return 'formation';
  }
  if (normalized.includes('distribution') || normalized.includes('intrant')) {
    return 'distribution';
  }
  if (normalized.includes('reunion') || normalized.includes('coordination') || normalized.includes('atelier')) {
    return 'reunion';
  }
  if (normalized.includes('visite')) {
    return 'visite';
  }
  if (normalized.includes('suivi') || normalized.includes('infrastructure') || normalized.includes('enregistrement') || normalized.includes('vaccination')) {
    return 'suivi';
  }
  if (normalized.includes('plainte') || normalized.includes('grm')) {
    return 'plainte';
  }

  return 'autre';
};

const normalizeActiviteStatut = (value: string | null | undefined): SqlActivite['statut'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('en cours') || normalized.includes('en_cours')) {
    return 'en_cours';
  }
  if (normalized.includes('term')) {
    return 'terminee';
  }
  if (normalized.includes('annul')) {
    return 'annulee';
  }
  if (normalized.includes('report')) {
    return 'reportee';
  }

  return 'planifiee';
};

const normalizeActivitePriorite = (value: string | null | undefined): SqlActivite['priorite'] => {
  const normalized = normalizeText(value);

  if (normalized.includes('haut')) {
    return 'haute';
  }
  if (normalized.includes('bas')) {
    return 'basse';
  }

  return 'moyenne';
};

const calculateActiviteExecution = (row: Pick<ActiviteRow, 'taux_execution' | 'participants_prevus' | 'participants_reels' | 'beneficiaires_cibles' | 'beneficiaires_atteints'>): number => {
  const explicit = Number(row.taux_execution ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const target = Number(row.participants_prevus ?? row.beneficiaires_cibles ?? 0);
  const reached = Number(row.participants_reels ?? row.beneficiaires_atteints ?? 0);
  if (target <= 0 || reached <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((reached / target) * 100));
};

const mapActiviteRow = (row: ActiviteRow): SqlActivite => ({
  id: row.id,
  code: row.code,
  titre: row.titre,
  description: row.description ?? '',
  type: normalizeActiviteType(row.type),
  composante: row.composante ?? '',
  statut: normalizeActiviteStatut(row.statut),
  priorite: normalizeActivitePriorite(row.priorite),
  date_debut: toDateOnly(row.date_debut),
  date_fin: toDateOnly(row.date_fin),
  lieu: row.lieu ?? '',
  province: row.province,
  territoire: row.territoire ?? '',
  commune: row.commune ?? undefined,
  village: row.village ?? undefined,
  responsable: row.responsable,
  responsable_contact: row.responsable_contact ?? undefined,
  equipe: parseIntrants(row.equipe),
  participants_prevus: Number(row.participants_prevus ?? 0),
  participants_reels: row.participants_reels === null || row.participants_reels === undefined ? undefined : Number(row.participants_reels),
  budget_prevu: Number(row.budget_prevu ?? 0),
  budget_reel: row.budget_reel === null || row.budget_reel === undefined ? undefined : Number(row.budget_reel),
  objectifs: parseIntrants(row.objectifs),
  resultats_attendus: parseIntrants(row.resultats_attendus),
  resultats_obtenus: row.resultats_obtenus ?? undefined,
  difficultes: row.difficultes ?? undefined,
  lecons_apprises: row.lecons_apprises ?? undefined,
  documents: parseActiviteDocuments(row.documents),
  photos: parseIntrants(row.photos),
  created_at: toIsoString(row.created_at) ?? new Date().toISOString(),
  updated_at: toIsoString(row.updated_at) ?? new Date().toISOString(),
  created_by: row.created_by ?? 'SYSTEM',
  beneficiaires_cibles: Number(row.beneficiaires_cibles ?? row.participants_prevus ?? 0),
  beneficiaires_atteints: Number(row.beneficiaires_atteints ?? row.participants_reels ?? 0),
  taux_execution: calculateActiviteExecution(row),
});

const buildActiviteWhereClause = (filters: SqlActiviteFilters) => {
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.search) {
    const search = `%${filters.search}%`;
    clauses.push('(code LIKE ? OR titre LIKE ? OR description LIKE ? OR responsable LIKE ? OR province LIKE ? OR territoire LIKE ?)');
    values.push(search, search, search, search, search, search);
  }

  if (filters.type) {
    clauses.push('type = ?');
    values.push(normalizeActiviteType(filters.type));
  }

  if (filters.composante) {
    clauses.push('composante = ?');
    values.push(filters.composante);
  }

  if (filters.province) {
    clauses.push('province = ?');
    values.push(filters.province);
  }

  if (filters.statut) {
    clauses.push('statut = ?');
    values.push(normalizeActiviteStatut(filters.statut));
  }

  if (filters.responsable) {
    clauses.push('responsable = ?');
    values.push(filters.responsable);
  }

  if (filters.date_debut) {
    clauses.push('date_debut >= ?');
    values.push(filters.date_debut);
  }

  if (filters.date_fin) {
    clauses.push('date_fin <= ?');
    values.push(filters.date_fin);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

const buildPlainteWhereClause = (filters: SqlPlainteFilters) => {
  const clauses: string[] = [];
  const values: Array<string> = [];

  if (filters.search) {
    const search = `%${filters.search}%`;
    clauses.push('(numero_plainte LIKE ? OR description LIKE ? OR beneficiaire_nom LIKE ? OR beneficiaire_rna LIKE ?)');
    values.push(search, search, search, search);
  }

  if (filters.type) {
    clauses.push('type = ?');
    values.push(filters.type);
  }

  if (filters.province) {
    clauses.push('province = ?');
    values.push(filters.province);
  }

  if (filters.statut) {
    clauses.push('statut = ?');
    values.push(filters.statut);
  }

  if (filters.date_debut) {
    clauses.push('date_reception >= ?');
    values.push(filters.date_debut);
  }

  if (filters.date_fin) {
    clauses.push('date_reception <= ?');
    values.push(`${filters.date_fin} 23:59:59`);
  }

  return {
    whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
};

export const getPlaintes = async (filters: SqlPlainteFilters) => {
  await ensureGrmTables();

  const page = Math.max(Number(filters.page ?? 0), 0);
  const limit = Math.max(Number(filters.limit ?? 10), 1);
  const offset = page * limit;
  const { whereClause, values } = buildPlainteWhereClause(filters);

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM grm_plaintes ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<PlainteRow[]>(
    `SELECT id, numero_plainte, type, description, province, territoire, village, beneficiaire_nom, beneficiaire_rna,
            date_reception, date_traitement, statut, delai_traite, prise_en_charge, resolution, est_confidentiel,
            created_at, updated_at
     FROM grm_plaintes
     ${whereClause}
     ORDER BY date_reception DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map(mapPlainteRow),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getPlainteById = async (id: number): Promise<SqlPlainte | null> => {
  await ensureGrmTables();

  const [rows] = await getDbPool().query<PlainteRow[]>(
    `SELECT id, numero_plainte, type, description, province, territoire, village, beneficiaire_nom, beneficiaire_rna,
            date_reception, date_traitement, statut, delai_traite, prise_en_charge, resolution, est_confidentiel,
            created_at, updated_at
     FROM grm_plaintes
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapPlainteRow(rows[0]) : null;
};

export const getPlainteStats = async (): Promise<SqlPlainteStats> => {
  await ensureGrmTables();

  const [rows] = await getDbPool().query<PlainteStatsRow[]>(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'en_cours' THEN 1 ELSE 0 END) AS en_cours,
        SUM(CASE WHEN statut = 'traitee' THEN 1 ELSE 0 END) AS traitees,
        SUM(CASE WHEN est_confidentiel = 1 OR type IN ('VBG', 'EAS', 'HS') THEN 1 ELSE 0 END) AS sensibles
     FROM grm_plaintes`,
  );

  return {
    total: Number(rows[0]?.total ?? 0),
    en_cours: Number(rows[0]?.en_cours ?? 0),
    traitees: Number(rows[0]?.traitees ?? 0),
    sensibles: Number(rows[0]?.sensibles ?? 0),
  };
};

export const getGrmServices = async (): Promise<GrmServiceItem[]> => {
  await ensureGrmTables();

  const [rows] = await getDbPool().query<GrmServiceRow[]>(
    `SELECT id, nom, type, province
     FROM grm_services
     ORDER BY nom ASC`,
  );

  return rows.map((row) => ({
    id: row.id,
    nom: row.nom,
    type: row.type,
    province: row.province ?? '',
  }));
};

export const createPlainte = async (input: SqlPlainteCreateInput): Promise<SqlPlainte> => {
  await ensureGrmTables();

  const temporaryNumeroPlainte = `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO grm_plaintes (
      numero_plainte,
      type,
      description,
      province,
      territoire,
      village,
      beneficiaire_nom,
      beneficiaire_rna,
      date_reception,
      statut,
      est_confidentiel,
      prise_en_charge,
      resolution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'recue', ?, ?, ?)`,
    [
      temporaryNumeroPlainte,
      input.type?.trim() || 'Technique',
      input.description?.trim() || '',
      input.province?.trim() || '',
      input.territoire?.trim() || '',
      input.village?.trim() || '',
      input.beneficiaire_nom?.trim() || null,
      input.beneficiaire_rna?.trim() || null,
      input.est_confidentiel ? 1 : 0,
      input.prise_en_charge?.trim() || null,
      input.resolution?.trim() || null,
    ],
  );

  const numeroPlainte = `PL-${new Date().getFullYear()}-${String(result.insertId).padStart(3, '0')}`;
  await getDbPool().execute('UPDATE grm_plaintes SET numero_plainte = ? WHERE id = ?', [numeroPlainte, result.insertId]);

  const plainte = await getPlainteById(result.insertId);
  if (!plainte) {
    throw new Error('Plainte creee mais introuvable');
  }

  return plainte;
};

export const updatePlainte = async (id: number, input: SqlPlainteUpdateInput): Promise<SqlPlainte | null> => {
  await ensureGrmTables();

  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.type !== undefined) {
    fields.push('type = ?');
    values.push(input.type?.trim() || 'Technique');
  }
  if (input.description !== undefined) {
    fields.push('description = ?');
    values.push(input.description?.trim() || '');
  }
  if (input.province !== undefined) {
    fields.push('province = ?');
    values.push(input.province?.trim() || '');
  }
  if (input.territoire !== undefined) {
    fields.push('territoire = ?');
    values.push(input.territoire?.trim() || '');
  }
  if (input.village !== undefined) {
    fields.push('village = ?');
    values.push(input.village?.trim() || '');
  }
  if (input.beneficiaire_nom !== undefined) {
    fields.push('beneficiaire_nom = ?');
    values.push(input.beneficiaire_nom?.trim() || null);
  }
  if (input.beneficiaire_rna !== undefined) {
    fields.push('beneficiaire_rna = ?');
    values.push(input.beneficiaire_rna?.trim() || null);
  }
  if (input.statut !== undefined) {
    fields.push('statut = ?');
    values.push(input.statut.trim());
  }
  if (input.date_traitement !== undefined) {
    fields.push('date_traitement = ?');
    values.push(input.date_traitement || null);
  }
  if (input.delai_traite !== undefined) {
    fields.push('delai_traite = ?');
    values.push(input.delai_traite ?? null);
  }
  if (input.prise_en_charge !== undefined) {
    fields.push('prise_en_charge = ?');
    values.push(input.prise_en_charge?.trim() || null);
  }
  if (input.resolution !== undefined) {
    fields.push('resolution = ?');
    values.push(input.resolution?.trim() || null);
  }
  if (input.est_confidentiel !== undefined) {
    fields.push('est_confidentiel = ?');
    values.push(input.est_confidentiel ? 1 : 0);
  }

  if (fields.length === 0) {
    return getPlainteById(id);
  }

  values.push(id);
  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE grm_plaintes SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getPlainteById(id);
};

export const deletePlainte = async (id: number): Promise<boolean> => {
  await ensureGrmTables();
  const [result] = await getDbPool().execute<ResultSetHeader>('DELETE FROM grm_plaintes WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

export const getFournisseurs = async (filters: SqlFournisseurFilters = {}) => {
  await ensureFournisseursTable();

  const page = Math.max(Number(filters.page ?? 0), 0);
  const limit = Math.max(Number(filters.limit ?? 10), 1);
  const offset = page * limit;
  const { whereClause, values } = buildFournisseurWhereClause(filters);

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM fournisseurs ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<FournisseurRow[]>(
    `SELECT id, nom, sigle, type, province, territoire, responsable, telephone, email, statut,
            stock_disponible, stock_total, beneficiaires_servis, montant_contrat, taux_livraison,
            date_contrat, intrants, created_at, updated_at
     FROM fournisseurs
     ${whereClause}
     ORDER BY nom ASC, id ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map(mapFournisseurRow),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getFournisseurById = async (id: number): Promise<SqlFournisseur | null> => {
  await ensureFournisseursTable();

  const [rows] = await getDbPool().query<FournisseurRow[]>(
    `SELECT id, nom, sigle, type, province, territoire, responsable, telephone, email, statut,
            stock_disponible, stock_total, beneficiaires_servis, montant_contrat, taux_livraison,
            date_contrat, intrants, created_at, updated_at
     FROM fournisseurs
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapFournisseurRow(rows[0]) : null;
};

export const getFournisseursStats = async (): Promise<SqlFournisseurStats> => {
  await ensureFournisseursTable();

  const [rows] = await getDbPool().query<FournisseurStatsRow[]>(
    `SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN statut = 'Agréé' THEN 1 ELSE 0 END) AS agrees,
        SUM(CASE WHEN statut = 'En cours' THEN 1 ELSE 0 END) AS en_cours,
        SUM(CASE WHEN statut = 'Suspendu' THEN 1 ELSE 0 END) AS suspendus
     FROM fournisseurs`,
  );

  return {
    total: Number(rows[0]?.total ?? 0),
    agrees: Number(rows[0]?.agrees ?? 0),
    en_cours: Number(rows[0]?.en_cours ?? 0),
    suspendus: Number(rows[0]?.suspendus ?? 0),
  };
};

export const createFournisseur = async (input: SqlFournisseurCreateInput): Promise<SqlFournisseur> => {
  await ensureFournisseursTable();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO fournisseurs (
      nom,
      sigle,
      type,
      province,
      territoire,
      responsable,
      telephone,
      email,
      statut,
      stock_disponible,
      stock_total,
      beneficiaires_servis,
      montant_contrat,
      taux_livraison,
      date_contrat,
      intrants
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.nom?.trim() || '',
      input.sigle?.trim() || null,
      input.type?.trim() || 'Semences',
      input.province?.trim() || '',
      input.territoire?.trim() || '',
      input.responsable?.trim() || '',
      input.telephone?.trim() || '',
      input.email?.trim() || null,
      input.statut?.trim() || 'En cours',
      input.stock_disponible ?? 0,
      input.stock_total ?? 0,
      input.beneficiaires_servis ?? 0,
      input.montant_contrat ?? 0,
      input.taux_livraison ?? 0,
      input.date_contrat || toDateOnly(new Date()),
      JSON.stringify(input.intrants ?? []),
    ],
  );

  const fournisseur = await getFournisseurById(result.insertId);
  if (!fournisseur) {
    throw new Error('Fournisseur cree mais introuvable');
  }

  return fournisseur;
};

export const updateFournisseur = async (id: number, input: SqlFournisseurUpdateInput): Promise<SqlFournisseur | null> => {
  await ensureFournisseursTable();

  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.nom !== undefined) {
    fields.push('nom = ?');
    values.push(input.nom?.trim() || '');
  }
  if (input.sigle !== undefined) {
    fields.push('sigle = ?');
    values.push(input.sigle?.trim() || null);
  }
  if (input.type !== undefined) {
    fields.push('type = ?');
    values.push(input.type?.trim() || 'Semences');
  }
  if (input.province !== undefined) {
    fields.push('province = ?');
    values.push(input.province?.trim() || '');
  }
  if (input.territoire !== undefined) {
    fields.push('territoire = ?');
    values.push(input.territoire?.trim() || '');
  }
  if (input.responsable !== undefined) {
    fields.push('responsable = ?');
    values.push(input.responsable?.trim() || '');
  }
  if (input.telephone !== undefined) {
    fields.push('telephone = ?');
    values.push(input.telephone?.trim() || '');
  }
  if (input.email !== undefined) {
    fields.push('email = ?');
    values.push(input.email?.trim() || null);
  }
  if (input.statut !== undefined) {
    fields.push('statut = ?');
    values.push(input.statut?.trim() || 'En cours');
  }
  if (input.stock_disponible !== undefined) {
    fields.push('stock_disponible = ?');
    values.push(input.stock_disponible ?? 0);
  }
  if (input.stock_total !== undefined) {
    fields.push('stock_total = ?');
    values.push(input.stock_total ?? 0);
  }
  if (input.beneficiaires_servis !== undefined) {
    fields.push('beneficiaires_servis = ?');
    values.push(input.beneficiaires_servis ?? 0);
  }
  if (input.montant_contrat !== undefined) {
    fields.push('montant_contrat = ?');
    values.push(input.montant_contrat ?? 0);
  }
  if (input.taux_livraison !== undefined) {
    fields.push('taux_livraison = ?');
    values.push(input.taux_livraison ?? 0);
  }
  if (input.date_contrat !== undefined) {
    fields.push('date_contrat = ?');
    values.push(input.date_contrat || toDateOnly(new Date()));
  }
  if (input.intrants !== undefined) {
    fields.push('intrants = ?');
    values.push(JSON.stringify(input.intrants ?? []));
  }

  if (fields.length === 0) {
    return getFournisseurById(id);
  }

  values.push(id);
  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE fournisseurs SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getFournisseurById(id);
};

export const deleteFournisseur = async (id: number): Promise<boolean> => {
  await ensureFournisseursTable();
  const [result] = await getDbPool().execute<ResultSetHeader>('DELETE FROM fournisseurs WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

export const getActivites = async (filters: SqlActiviteFilters = {}) => {
  await ensureActivitesTable();

  const page = Math.max(Number(filters.page ?? 0), 0);
  const limit = Math.max(Number(filters.limit ?? 10), 1);
  const offset = page * limit;
  const { whereClause, values } = buildActiviteWhereClause(filters);

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM activites ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<ActiviteRow[]>(
    `SELECT id, code, titre, description, type, composante, statut, priorite, date_debut, date_fin, lieu,
            province, territoire, commune, village, responsable, responsable_contact, equipe,
            participants_prevus, participants_reels, budget_prevu, budget_reel, objectifs,
            resultats_attendus, resultats_obtenus, difficultes, lecons_apprises, documents, photos,
            created_at, updated_at, created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution
     FROM activites
     ${whereClause}
     ORDER BY date_debut DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map(mapActiviteRow),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getActiviteById = async (id: number): Promise<SqlActivite | null> => {
  await ensureActivitesTable();

  const [rows] = await getDbPool().query<ActiviteRow[]>(
    `SELECT id, code, titre, description, type, composante, statut, priorite, date_debut, date_fin, lieu,
            province, territoire, commune, village, responsable, responsable_contact, equipe,
            participants_prevus, participants_reels, budget_prevu, budget_reel, objectifs,
            resultats_attendus, resultats_obtenus, difficultes, lecons_apprises, documents, photos,
            created_at, updated_at, created_by, beneficiaires_cibles, beneficiaires_atteints, taux_execution
     FROM activites
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapActiviteRow(rows[0]) : null;
};

export const getActivitesStats = async (): Promise<SqlActiviteStats> => {
  await ensureActivitesTable();

  const pool = getDbPool();
  const [typeRows, statutRows, provinceRows, monthRows, aggregateRows] = await Promise.all([
    pool.query<BeneficiaireGroupRow[]>('SELECT type AS label, COUNT(*) AS total FROM activites GROUP BY type'),
    pool.query<BeneficiaireGroupRow[]>('SELECT statut AS label, COUNT(*) AS total FROM activites GROUP BY statut'),
    pool.query<BeneficiaireGroupRow[]>('SELECT province AS label, COUNT(*) AS total FROM activites GROUP BY province'),
    pool.query<BeneficiaireGroupRow[]>(
      `SELECT DATE_FORMAT(date_debut, '%Y-%m') AS label, COUNT(*) AS total
       FROM activites
       GROUP BY DATE_FORMAT(date_debut, '%Y-%m')
       ORDER BY DATE_FORMAT(date_debut, '%Y-%m') ASC`
    ),
    pool.query<Array<RowDataPacket & {
      total: number;
      budget_total: number;
      budget_depense: number;
      participants_total: number;
      taux_execution_moyen: number;
    }>>(
      `SELECT COUNT(*) AS total,
              SUM(budget_prevu) AS budget_total,
              SUM(COALESCE(budget_reel, 0)) AS budget_depense,
              SUM(COALESCE(participants_reels, 0)) AS participants_total,
              AVG(COALESCE(taux_execution, 0)) AS taux_execution_moyen
       FROM activites`
    ),
  ]);

  const parType = mapGroupRowsToRecord(typeRows[0]);
  const parStatut = mapGroupRowsToRecord(statutRows[0]);
  const aggregate = aggregateRows[0][0];
  const total = Number(aggregate?.total ?? 0);
  const tauxExecutionMoyen = Math.round(Number(aggregate?.taux_execution_moyen ?? 0));

  return {
    total,
    par_type: parType,
    par_statut: parStatut,
    par_province: mapGroupRowsToRecord(provinceRows[0]),
    par_mois: monthRows[0].map((row) => ({ mois: formatMonthLabel(String(row.label ?? '')), total: Number(row.total ?? 0) })),
    budget_total: Number(aggregate?.budget_total ?? 0),
    budget_depense: Number(aggregate?.budget_depense ?? 0),
    participants_total: Number(aggregate?.participants_total ?? 0),
    taux_realisation: tauxExecutionMoyen,
    terminees: Number(parStatut.terminee ?? 0),
    en_cours: Number(parStatut.en_cours ?? 0),
    planifiees: Number(parStatut.planifiee ?? 0),
    budget_execute: Number(aggregate?.budget_depense ?? 0),
    taux_execution_moyen: tauxExecutionMoyen,
  };
};

export const createActivite = async (input: SqlActiviteCreateInput): Promise<SqlActivite> => {
  await ensureActivitesTable();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO activites (
      code,
      titre,
      description,
      type,
      composante,
      statut,
      priorite,
      date_debut,
      date_fin,
      lieu,
      province,
      territoire,
      commune,
      village,
      responsable,
      responsable_contact,
      equipe,
      participants_prevus,
      participants_reels,
      budget_prevu,
      budget_reel,
      objectifs,
      resultats_attendus,
      resultats_obtenus,
      difficultes,
      lecons_apprises,
      documents,
      photos,
      created_by,
      beneficiaires_cibles,
      beneficiaires_atteints,
      taux_execution
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.code?.trim() || `ACT-TMP-${Date.now()}`,
      input.titre?.trim() || '',
      input.description?.trim() || '',
      normalizeActiviteType(input.type),
      input.composante?.trim() || '',
      normalizeActiviteStatut(input.statut),
      normalizeActivitePriorite(input.priorite),
      input.date_debut || toDateOnly(new Date()),
      input.date_fin || input.date_debut || toDateOnly(new Date()),
      input.lieu?.trim() || '',
      input.province?.trim() || '',
      input.territoire?.trim() || '',
      input.commune?.trim() || null,
      input.village?.trim() || null,
      input.responsable?.trim() || '',
      input.responsable_contact?.trim() || null,
      JSON.stringify(input.equipe ?? []),
      input.participants_prevus ?? input.beneficiaires_cibles ?? 0,
      input.participants_reels ?? input.beneficiaires_atteints ?? null,
      input.budget_prevu ?? 0,
      input.budget_reel ?? null,
      JSON.stringify(input.objectifs ?? []),
      JSON.stringify(input.resultats_attendus ?? []),
      input.resultats_obtenus ?? null,
      input.difficultes ?? null,
      input.lecons_apprises ?? null,
      JSON.stringify(input.documents ?? []),
      JSON.stringify(input.photos ?? []),
      input.created_by?.trim() || 'SYSTEM',
      input.beneficiaires_cibles ?? input.participants_prevus ?? 0,
      input.beneficiaires_atteints ?? input.participants_reels ?? 0,
      input.taux_execution ?? 0,
    ],
  );

  if (!input.code) {
    const year = new Date().getFullYear();
    const code = `ACT-${year}-${String(result.insertId).padStart(3, '0')}`;
    await getDbPool().execute('UPDATE activites SET code = ? WHERE id = ?', [code, result.insertId]);
  }

  const activite = await getActiviteById(result.insertId);
  if (!activite) {
    throw new Error('Activite creee mais introuvable');
  }

  return activite;
};

export const updateActivite = async (id: number, input: SqlActiviteUpdateInput): Promise<SqlActivite | null> => {
  await ensureActivitesTable();

  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.code !== undefined) { fields.push('code = ?'); values.push(input.code?.trim() || ''); }
  if (input.titre !== undefined) { fields.push('titre = ?'); values.push(input.titre?.trim() || ''); }
  if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description?.trim() || ''); }
  if (input.type !== undefined) { fields.push('type = ?'); values.push(normalizeActiviteType(input.type)); }
  if (input.composante !== undefined) { fields.push('composante = ?'); values.push(input.composante?.trim() || ''); }
  if (input.statut !== undefined) { fields.push('statut = ?'); values.push(normalizeActiviteStatut(input.statut)); }
  if (input.priorite !== undefined) { fields.push('priorite = ?'); values.push(normalizeActivitePriorite(input.priorite)); }
  if (input.date_debut !== undefined) { fields.push('date_debut = ?'); values.push(input.date_debut || toDateOnly(new Date())); }
  if (input.date_fin !== undefined) { fields.push('date_fin = ?'); values.push(input.date_fin || toDateOnly(new Date())); }
  if (input.lieu !== undefined) { fields.push('lieu = ?'); values.push(input.lieu?.trim() || ''); }
  if (input.province !== undefined) { fields.push('province = ?'); values.push(input.province?.trim() || ''); }
  if (input.territoire !== undefined) { fields.push('territoire = ?'); values.push(input.territoire?.trim() || ''); }
  if (input.commune !== undefined) { fields.push('commune = ?'); values.push(input.commune?.trim() || null); }
  if (input.village !== undefined) { fields.push('village = ?'); values.push(input.village?.trim() || null); }
  if (input.responsable !== undefined) { fields.push('responsable = ?'); values.push(input.responsable?.trim() || ''); }
  if (input.responsable_contact !== undefined) { fields.push('responsable_contact = ?'); values.push(input.responsable_contact?.trim() || null); }
  if (input.equipe !== undefined) { fields.push('equipe = ?'); values.push(JSON.stringify(input.equipe ?? [])); }
  if (input.participants_prevus !== undefined) { fields.push('participants_prevus = ?'); values.push(input.participants_prevus ?? 0); }
  if (input.participants_reels !== undefined) { fields.push('participants_reels = ?'); values.push(input.participants_reels ?? null); }
  if (input.budget_prevu !== undefined) { fields.push('budget_prevu = ?'); values.push(input.budget_prevu ?? 0); }
  if (input.budget_reel !== undefined) { fields.push('budget_reel = ?'); values.push(input.budget_reel ?? null); }
  if (input.objectifs !== undefined) { fields.push('objectifs = ?'); values.push(JSON.stringify(input.objectifs ?? [])); }
  if (input.resultats_attendus !== undefined) { fields.push('resultats_attendus = ?'); values.push(JSON.stringify(input.resultats_attendus ?? [])); }
  if (input.resultats_obtenus !== undefined) { fields.push('resultats_obtenus = ?'); values.push(input.resultats_obtenus ?? null); }
  if (input.difficultes !== undefined) { fields.push('difficultes = ?'); values.push(input.difficultes ?? null); }
  if (input.lecons_apprises !== undefined) { fields.push('lecons_apprises = ?'); values.push(input.lecons_apprises ?? null); }
  if (input.documents !== undefined) { fields.push('documents = ?'); values.push(JSON.stringify(input.documents ?? [])); }
  if (input.photos !== undefined) { fields.push('photos = ?'); values.push(JSON.stringify(input.photos ?? [])); }
  if (input.created_by !== undefined) { fields.push('created_by = ?'); values.push(input.created_by?.trim() || 'SYSTEM'); }
  if (input.beneficiaires_cibles !== undefined) { fields.push('beneficiaires_cibles = ?'); values.push(input.beneficiaires_cibles ?? 0); }
  if (input.beneficiaires_atteints !== undefined) { fields.push('beneficiaires_atteints = ?'); values.push(input.beneficiaires_atteints ?? 0); }
  if (input.taux_execution !== undefined) { fields.push('taux_execution = ?'); values.push(input.taux_execution ?? 0); }

  if (fields.length === 0) {
    return getActiviteById(id);
  }

  values.push(id);
  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE activites SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getActiviteById(id);
};

export const deleteActivite = async (id: number): Promise<boolean> => {
  await ensureActivitesTable();
  const [result] = await getDbPool().execute<ResultSetHeader>('DELETE FROM activites WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

export const getRisques = async (): Promise<SqlRisque[]> => {
  await ensureRisquesTables();

  const [rows] = await getDbPool().query<RisqueRow[]>(
    `SELECT id, code, nom, description, categorie, probabilite, impact, niveau, statut,
            plan_attenuation, responsable, date_identification, date_cloture, province,
            actions_prevues, indicateurs_surveillance, dernier_suivi
     FROM risques
     ORDER BY date_identification DESC, id DESC`
  );

  return rows.map(mapRisqueRow);
};

export const getRisqueById = async (id: number): Promise<SqlRisque | null> => {
  await ensureRisquesTables();

  const [rows] = await getDbPool().query<RisqueRow[]>(
    `SELECT id, code, nom, description, categorie, probabilite, impact, niveau, statut,
            plan_attenuation, responsable, date_identification, date_cloture, province,
            actions_prevues, indicateurs_surveillance, dernier_suivi
     FROM risques
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapRisqueRow(rows[0]) : null;
};

export const getRisquesStats = async (): Promise<SqlRisqueStats> => {
  const risques = await getRisques();

  return risques.reduce<SqlRisqueStats>((stats, risque) => {
    stats.total += 1;

    if (risque.niveau === 'Critique') {
      stats.critiques += 1;
    } else if (risque.niveau === 'Élevé') {
      stats.eleves += 1;
    } else if (risque.niveau === 'Modéré') {
      stats.moderes += 1;
    } else {
      stats.faibles += 1;
    }

    if (risque.statut === 'en_cours') {
      stats.en_cours += 1;
    }
    if (risque.statut === 'atténue') {
      stats.attenues += 1;
    }

    return stats;
  }, {
    total: 0,
    critiques: 0,
    eleves: 0,
    moderes: 0,
    faibles: 0,
    en_cours: 0,
    attenues: 0,
  });
};

export const getRisqueAlertes = async (): Promise<SqlAlerteRisque[]> => {
  await ensureRisquesTables();

  const [rows] = await getDbPool().query<AlerteRisqueRow[]>(
    `SELECT id, id_risque, message, date_alerte, est_lue, niveau
     FROM risque_alertes
     ORDER BY date_alerte DESC, id DESC`
  );

  return rows.map(mapAlerteRisqueRow);
};

export const markRisqueAlerteAsRead = async (id: number): Promise<SqlAlerteRisque | null> => {
  await ensureRisquesTables();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    'UPDATE risque_alertes SET est_lue = 1 WHERE id = ?',
    [id],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await getDbPool().query<AlerteRisqueRow[]>(
    `SELECT id, id_risque, message, date_alerte, est_lue, niveau
     FROM risque_alertes
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapAlerteRisqueRow(rows[0]) : null;
};

export const getRisqueActions = async (risqueId: number): Promise<SqlActionAttenuation[]> => {
  await ensureRisquesTables();

  const [rows] = await getDbPool().query<ActionAttenuationRow[]>(
    `SELECT id, id_risque, action, responsable, date_debut, date_fin, statut, resultat
     FROM risque_actions
     WHERE id_risque = ?
     ORDER BY date_debut DESC, id DESC`,
    [risqueId],
  );

  return rows.map(mapActionAttenuationRow);
};

export const createRisque = async (input: SqlRisqueCreateInput): Promise<SqlRisque> => {
  await ensureRisquesTables();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO risques (
      code,
      nom,
      description,
      categorie,
      probabilite,
      impact,
      niveau,
      statut,
      plan_attenuation,
      responsable,
      date_identification,
      date_cloture,
      province,
      actions_prevues,
      indicateurs_surveillance,
      dernier_suivi
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.code?.trim() || `RISK-TMP-${Date.now()}`,
      input.nom?.trim() || '',
      input.description?.trim() || '',
      input.categorie?.trim() || 'gestion',
      Number(input.probabilite ?? 1),
      Number(input.impact ?? 1),
      normalizeRisqueLevel(input.niveau),
      normalizeRisqueStatut(input.statut),
      input.plan_attenuation?.trim() || '',
      input.responsable?.trim() || '',
      input.date_identification || toDateOnly(new Date()),
      input.date_cloture || null,
      input.province?.trim() || null,
      JSON.stringify(input.actions_prevues ?? []),
      JSON.stringify(input.indicateurs_surveillance ?? []),
      input.dernier_suivi || null,
    ],
  );

  if (!input.code) {
    const year = new Date().getFullYear();
    const code = `RISK-${year}-${String(result.insertId).padStart(3, '0')}`;
    await getDbPool().execute('UPDATE risques SET code = ? WHERE id = ?', [code, result.insertId]);
  }

  const risque = await getRisqueById(result.insertId);
  if (!risque) {
    throw new Error('Risque cree mais introuvable');
  }

  return risque;
};

export const updateRisque = async (id: number, input: SqlRisqueUpdateInput): Promise<SqlRisque | null> => {
  await ensureRisquesTables();

  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.code !== undefined) { fields.push('code = ?'); values.push(input.code?.trim() || ''); }
  if (input.nom !== undefined) { fields.push('nom = ?'); values.push(input.nom?.trim() || ''); }
  if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description?.trim() || ''); }
  if (input.categorie !== undefined) { fields.push('categorie = ?'); values.push(input.categorie?.trim() || 'gestion'); }
  if (input.probabilite !== undefined) { fields.push('probabilite = ?'); values.push(Number(input.probabilite ?? 1)); }
  if (input.impact !== undefined) { fields.push('impact = ?'); values.push(Number(input.impact ?? 1)); }
  if (input.niveau !== undefined) { fields.push('niveau = ?'); values.push(normalizeRisqueLevel(input.niveau)); }
  if (input.statut !== undefined) { fields.push('statut = ?'); values.push(normalizeRisqueStatut(input.statut)); }
  if (input.plan_attenuation !== undefined) { fields.push('plan_attenuation = ?'); values.push(input.plan_attenuation?.trim() || ''); }
  if (input.responsable !== undefined) { fields.push('responsable = ?'); values.push(input.responsable?.trim() || ''); }
  if (input.date_identification !== undefined) { fields.push('date_identification = ?'); values.push(input.date_identification || toDateOnly(new Date())); }
  if (input.date_cloture !== undefined) { fields.push('date_cloture = ?'); values.push(input.date_cloture || null); }
  if (input.province !== undefined) { fields.push('province = ?'); values.push(input.province?.trim() || null); }
  if (input.actions_prevues !== undefined) { fields.push('actions_prevues = ?'); values.push(JSON.stringify(input.actions_prevues ?? [])); }
  if (input.indicateurs_surveillance !== undefined) { fields.push('indicateurs_surveillance = ?'); values.push(JSON.stringify(input.indicateurs_surveillance ?? [])); }
  if (input.dernier_suivi !== undefined) { fields.push('dernier_suivi = ?'); values.push(input.dernier_suivi || null); }

  if (fields.length === 0) {
    return getRisqueById(id);
  }

  values.push(id);

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE risques SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getRisqueById(id);
};

export const deleteRisque = async (id: number): Promise<boolean> => {
  await ensureRisquesTables();

  await getDbPool().execute('DELETE FROM risque_actions WHERE id_risque = ?', [id]);
  await getDbPool().execute('DELETE FROM risque_alertes WHERE id_risque = ?', [id]);
  const [result] = await getDbPool().execute<ResultSetHeader>('DELETE FROM risques WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

export const createRisqueAction = async (risqueId: number, input: SqlActionAttenuationInput): Promise<SqlActionAttenuation | null> => {
  await ensureRisquesTables();

  const parent = await getRisqueById(risqueId);
  if (!parent) {
    return null;
  }

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO risque_actions (id_risque, action, responsable, date_debut, date_fin, statut, resultat)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      risqueId,
      input.action?.trim() || '',
      input.responsable?.trim() || '',
      input.date_debut || toDateOnly(new Date()),
      input.date_fin || input.date_debut || toDateOnly(new Date()),
      normalizeActionStatut(input.statut),
      input.resultat ?? null,
    ],
  );

  const [rows] = await getDbPool().query<ActionAttenuationRow[]>(
    `SELECT id, id_risque, action, responsable, date_debut, date_fin, statut, resultat
     FROM risque_actions
     WHERE id = ?
     LIMIT 1`,
    [result.insertId],
  );

  return rows[0] ? mapActionAttenuationRow(rows[0]) : null;
};

export const updateRisqueAction = async (
  risqueId: number,
  actionId: number,
  input: SqlActionAttenuationInput,
): Promise<SqlActionAttenuation | null> => {
  await ensureRisquesTables();

  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.action !== undefined) { fields.push('action = ?'); values.push(input.action?.trim() || ''); }
  if (input.responsable !== undefined) { fields.push('responsable = ?'); values.push(input.responsable?.trim() || ''); }
  if (input.date_debut !== undefined) { fields.push('date_debut = ?'); values.push(input.date_debut || toDateOnly(new Date())); }
  if (input.date_fin !== undefined) { fields.push('date_fin = ?'); values.push(input.date_fin || toDateOnly(new Date())); }
  if (input.statut !== undefined) { fields.push('statut = ?'); values.push(normalizeActionStatut(input.statut)); }
  if (input.resultat !== undefined) { fields.push('resultat = ?'); values.push(input.resultat ?? null); }

  if (fields.length === 0) {
    const [rows] = await getDbPool().query<ActionAttenuationRow[]>(
      `SELECT id, id_risque, action, responsable, date_debut, date_fin, statut, resultat
       FROM risque_actions
       WHERE id = ? AND id_risque = ?
       LIMIT 1`,
      [actionId, risqueId],
    );

    return rows[0] ? mapActionAttenuationRow(rows[0]) : null;
  }

  values.push(actionId, risqueId);

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE risque_actions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ? AND id_risque = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await getDbPool().query<ActionAttenuationRow[]>(
    `SELECT id, id_risque, action, responsable, date_debut, date_fin, statut, resultat
     FROM risque_actions
     WHERE id = ? AND id_risque = ?
     LIMIT 1`,
    [actionId, risqueId],
  );

  return rows[0] ? mapActionAttenuationRow(rows[0]) : null;
};

export const getProvinces = async (): Promise<SqlProvinceData[]> => {
  const source = await resolveBeneficiaireSource();
  const pool = getDbPool();
  const youthExpr = source.ageExpr !== 'NULL'
    ? `CASE WHEN CAST(COALESCE(${source.ageExpr}, 0) AS SIGNED) BETWEEN 15 AND 35 THEN 1 ELSE 0 END`
    : source.dateNaissanceExpr !== 'NULL'
      ? `CASE WHEN TIMESTAMPDIFF(YEAR, ${source.dateNaissanceExpr}, CURDATE()) BETWEEN 15 AND 35 THEN 1 ELSE 0 END`
      : '0';

  const [provinceRows, monthlyRows] = await Promise.all([
    pool.query<Array<RowDataPacket & {
      province: string | null;
      total: number;
      femmes: number;
      hommes: number;
      jeunes: number;
      territoires: number;
      secteurs: number;
      groupements: number;
      villages: number;
      mais: number;
      manioc: number;
      arachide: number;
      dernier_suivi: string | Date | null;
    }>>(
      `SELECT
          NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '') AS province,
          COUNT(*) AS total,
          SUM(CASE WHEN LOWER(COALESCE(${source.sexeExpr}, '')) LIKE 'f%' THEN 1 ELSE 0 END) AS femmes,
          SUM(CASE WHEN LOWER(COALESCE(${source.sexeExpr}, '')) LIKE 'm%' OR ${source.sexeExpr} IS NULL OR ${source.sexeExpr} = '' THEN 1 ELSE 0 END) AS hommes,
          SUM(${youthExpr}) AS jeunes,
          COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.territoireExpr}, '')), '')) AS territoires,
          COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.secteurExpr}, '')), '')) AS secteurs,
          COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.groupementExpr}, '')), '')) AS groupements,
          COUNT(DISTINCT NULLIF(TRIM(COALESCE(${source.villageExpr}, '')), '')) AS villages,
          SUM(CASE WHEN LOWER(COALESCE(${source.ptechExpr}, '')) LIKE '%mai%' THEN 1 ELSE 0 END) AS mais,
          SUM(CASE WHEN LOWER(COALESCE(${source.ptechExpr}, '')) LIKE '%manioc%' THEN 1 ELSE 0 END) AS manioc,
          SUM(CASE WHEN LOWER(COALESCE(${source.ptechExpr}, '')) LIKE '%arach%' THEN 1 ELSE 0 END) AS arachide,
          MAX(${source.createdAtExpr}) AS dernier_suivi
       FROM ${source.tableRef}
       GROUP BY NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '')
       HAVING province IS NOT NULL
       ORDER BY province ASC`
    ),
    pool.query<Array<RowDataPacket & {
      province: string | null;
      mois: string | null;
      total: number;
    }>>(
      `SELECT
          NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '') AS province,
          DATE_FORMAT(${source.createdAtExpr}, '%Y-%m') AS mois,
          COUNT(*) AS total
       FROM ${source.tableRef}
       WHERE NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '') IS NOT NULL
       GROUP BY NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), ''), DATE_FORMAT(${source.createdAtExpr}, '%Y-%m')`
    ),
  ]);

  const provinceMetadata = new Map(
    PROVINCES_SEED.map((province) => [normalizeText(province.name), province]),
  );

  const monthlySeriesByProvince = new Map<string, Array<{ mois: string; total: number }>>();
  for (const row of monthlyRows[0]) {
    const provinceKey = normalizeText(row.province ?? '');
    if (!provinceKey || !row.mois) {
      continue;
    }

    if (!monthlySeriesByProvince.has(provinceKey)) {
      monthlySeriesByProvince.set(provinceKey, []);
    }

    monthlySeriesByProvince.get(provinceKey)?.push({
      mois: formatMonthLabel(row.mois),
      total: Number(row.total ?? 0),
    });
  }

  const mapProvinceId = (provinceName: string) => {
    const metadata = provinceMetadata.get(normalizeText(provinceName));
    if (metadata) {
      return metadata.id;
    }

    return normalizeText(provinceName).replace(/[^a-z0-9]+/g, '');
  };

  return provinceRows[0].map((row) => {
    const provinceName = mapProvinceName(String(row.province ?? '').trim());
    const provinceKey = normalizeText(provinceName);
    const metadata = provinceMetadata.get(provinceKey);
    const total = Number(row.total ?? 0);
    const femmes = Number(row.femmes ?? 0);
    const hommes = Number(row.hommes ?? Math.max(total - femmes, 0));
    const jeunes = Number(row.jeunes ?? 0);
    const cible = Math.max(total, Math.ceil(total * 1.2));
    const performanceScore = cible > 0 ? Math.min(100, Math.round((total / cible) * 100)) : 0;
    const monthlySeries = (monthlySeriesByProvince.get(provinceKey) ?? []).sort((left, right) => left.mois.localeCompare(right.mois));
    const previousTotal = monthlySeries.length >= 2 ? monthlySeries[monthlySeries.length - 2].total : total;
    const progressionDelta = previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : 0;
    const territoires = Number(row.territoires ?? 0);
    const secteurs = Number(row.secteurs ?? 0);
    const groupements = Number(row.groupements ?? 0);
    const villages = Number(row.villages ?? 0);
    const femaleShare = total > 0 ? Math.round((femmes / total) * 100) : 0;
    const youthShare = total > 0 ? Math.round((jeunes / total) * 100) : 0;
    const productionMais = Number(row.mais ?? 0);
    const productionManioc = Number(row.manioc ?? 0);
    const productionArachide = Number(row.arachide ?? 0);

    return {
      id: mapProvinceId(provinceName),
      name: provinceName,
      code: metadata?.code ?? provinceName.slice(0, 2).toUpperCase(),
      region: metadata?.region ?? 'Non défini',
      population: metadata?.population ?? 0,
      progression: progressionDelta,
      performance_score: performanceScore,
      progression_delta: progressionDelta,
      beneficiaires: {
        total,
        femmes,
        hommes,
        jeunes,
        cible,
      },
      production: {
        'maïs': { actuel: productionMais, cible: productionMais > 0 ? Math.ceil(productionMais * 1.2) : 0, unite: 'exploitants' },
        manioc: { actuel: productionManioc, cible: productionManioc > 0 ? Math.ceil(productionManioc * 1.2) : 0, unite: 'exploitants' },
        arachide: { actuel: productionArachide, cible: productionArachide > 0 ? Math.ceil(productionArachide * 1.2) : 0, unite: 'exploitants' },
      },
      infrastructures: {
        routes: { rehabilitees: territoires, prevues: territoires, unite: 'territoires' },
        cler: { fonctionnels: secteurs, total: secteurs },
        marches: { construits: groupements, prevus: groupements },
      },
      indicateurs: {
        iodp1: { actuel: performanceScore, cible: 100, trend: progressionDelta },
        iodp2: { actuel: femaleShare, cible: 50, trend: 0 },
        iodp3: { actuel: youthShare, cible: 35, trend: 0 },
      },
      risques: { critiques: 0, eleves: 0, moderes: 0, faibles: 0 },
      plaintes: { total: 0, traitees: 0, en_cours: 0, vbg: 0 },
      dernier_suivi: toDateOnly(row.dernier_suivi),
      coordonnees: metadata?.coordonnees,
    } satisfies SqlProvinceData;
  });
};

export const getProvinceById = async (id: string): Promise<SqlProvinceData | null> => {
  const provinces = await getProvinces();
  return provinces.find((province) => province.id === id) ?? null;
};

export const getProvinceEvolution = async (provinceId: string): Promise<SqlProvinceEvolution[]> => {
  const source = await resolveBeneficiaireSource();
  const provinces = await getProvinces();
  const province = provinces.find((item) => item.id === provinceId);

  if (!province) {
    return [];
  }

  const [rows] = await getDbPool().query<Array<RowDataPacket & { province: string | null; mois: string | null; total: number }>>(
    `SELECT NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '') AS province,
            DATE_FORMAT(${source.createdAtExpr}, '%Y-%m') AS mois,
            COUNT(*) AS total
     FROM ${source.tableRef}
     WHERE NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '') IS NOT NULL
     GROUP BY NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), ''), DATE_FORMAT(${source.createdAtExpr}, '%Y-%m')
     ORDER BY DATE_FORMAT(${source.createdAtExpr}, '%Y-%m') ASC`,
  );

  return rows
    .filter((row) => normalizeText(row.province) === normalizeText(province.name))
    .map((row, index) => ({
    mois: formatMonthLabel(String(row.mois ?? '')),
    beneficiaires: Number(row.total ?? 0),
    production: Math.round(Number(row.total ?? 0) * 0.35),
    routes: index + 1,
    }));
};

export const getProvinceClassement = async (): Promise<SqlClassementProvincial[]> => {
  const provinces = await getProvinces();

  return provinces
    .sort((a, b) => b.performance_score - a.performance_score)
    .map((province, index) => ({
      province: province.name,
      score: province.performance_score,
      rang: index + 1,
      progression: province.progression,
    }));
};

export const getProvinceComparaison = async (): Promise<SqlProvinceComparaison[]> => {
  const provinces = await getProvinces();

  return provinces.map((province) => ({
    province: province.name,
    score: province.performance_score,
    beneficiaires: province.beneficiaires.total,
    production:
      Number(province.production['maïs']?.actuel ?? 0)
      + Number(province.production.manioc?.actuel ?? 0)
      + Number(province.production.arachide?.actuel ?? 0),
    routes: Number(province.infrastructures.routes?.rehabilitees ?? 0),
    risques_critiques: Number(province.risques.critiques ?? 0),
  }));
};

export const getPowerBIReports = async (): Promise<SqlPowerBIReport[]> => {
  await ensurePowerBITables();

  const [rows] = await getDbPool().query<PowerBIReportRow[]>(
    `SELECT id, name, description, embed_url, report_id, dataset_id, category, thumbnail_url, created_at, updated_at
     FROM powerbi_reports
     ORDER BY name ASC`
  );

  return rows.map(mapPowerBIReportRow);
};

export const getPowerBIReportById = async (id: string): Promise<SqlPowerBIReport | null> => {
  await ensurePowerBITables();

  const [rows] = await getDbPool().query<PowerBIReportRow[]>(
    `SELECT id, name, description, embed_url, report_id, dataset_id, category, thumbnail_url, created_at, updated_at
     FROM powerbi_reports
     WHERE id = ? OR report_id = ?
     LIMIT 1`,
    [id, id],
  );

  return rows[0] ? mapPowerBIReportRow(rows[0]) : null;
};

export const getPowerBIReportsByCategory = async (category: string): Promise<SqlPowerBIReport[]> => {
  await ensurePowerBITables();

  const [rows] = await getDbPool().query<PowerBIReportRow[]>(
    `SELECT id, name, description, embed_url, report_id, dataset_id, category, thumbnail_url, created_at, updated_at
     FROM powerbi_reports
     WHERE category = ?
     ORDER BY name ASC`,
    [category],
  );

  return rows.map(mapPowerBIReportRow);
};

export const getPowerBIDashboards = async (): Promise<SqlPowerBIDashboard[]> => {
  await ensurePowerBITables();

  const [rows] = await getDbPool().query<PowerBIDashboardRow[]>(
    `SELECT id, name, description, embed_url, dashboard_id, category, created_at
     FROM powerbi_dashboards
     ORDER BY name ASC`
  );

  return rows.map(mapPowerBIDashboardRow);
};

export const getPowerBIDashboardById = async (id: string): Promise<SqlPowerBIDashboard | null> => {
  await ensurePowerBITables();

  const [rows] = await getDbPool().query<PowerBIDashboardRow[]>(
    `SELECT id, name, description, embed_url, dashboard_id, category, created_at
     FROM powerbi_dashboards
     WHERE id = ? OR dashboard_id = ?
     LIMIT 1`,
    [id, id],
  );

  return rows[0] ? mapPowerBIDashboardRow(rows[0]) : null;
};

export const getOTActivites = async (filters: { statut?: string; province?: string; date_debut?: string; date_fin?: string } = {}): Promise<SqlOTActivite[]> => {
  await ensureOTTables();

  const whereClauses: string[] = [];
  const values: Array<string | number> = [];

  if (filters.statut) {
    whereClauses.push('statut = ?');
    values.push(normalizeOTActiviteStatut(filters.statut));
  }
  if (filters.province) {
    whereClauses.push('province = ?');
    values.push(filters.province);
  }
  if (filters.date_debut) {
    whereClauses.push('date >= ?');
    values.push(filters.date_debut);
  }
  if (filters.date_fin) {
    whereClauses.push('date <= ?');
    values.push(filters.date_fin);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const [rows] = await getDbPool().query<OTActiviteRow[]>(
    `SELECT id, type, titre, description, date, province, territoire, village, statut, responsable, participants, resultats
     FROM ot_activites
     ${whereClause}
     ORDER BY date DESC, id DESC`,
    values,
  );

  return rows.map(mapOTActiviteRow);
};

export const createOTActivite = async (input: SqlOTActiviteInput): Promise<SqlOTActivite> => {
  await ensureOTTables();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO ot_activites (type, titre, description, date, province, territoire, village, statut, responsable, participants, resultats)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizeOTActiviteType(input.type),
      input.titre?.trim() || '',
      input.description?.trim() || '',
      input.date || toDateOnly(new Date()),
      input.province?.trim() || '',
      input.territoire?.trim() || '',
      input.village?.trim() || '',
      normalizeOTActiviteStatut(input.statut),
      input.responsable?.trim() || '',
      input.participants ?? null,
      input.resultats ?? null,
    ],
  );

  const [rows] = await getDbPool().query<OTActiviteRow[]>(
    `SELECT id, type, titre, description, date, province, territoire, village, statut, responsable, participants, resultats
     FROM ot_activites WHERE id = ? LIMIT 1`,
    [result.insertId],
  );

  if (!rows[0]) {
    throw new Error('Activite OT creee mais introuvable');
  }

  return mapOTActiviteRow(rows[0]);
};

export const updateOTActivite = async (id: number, input: SqlOTActiviteInput): Promise<SqlOTActivite | null> => {
  await ensureOTTables();

  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.type !== undefined) { fields.push('type = ?'); values.push(normalizeOTActiviteType(input.type)); }
  if (input.titre !== undefined) { fields.push('titre = ?'); values.push(input.titre?.trim() || ''); }
  if (input.description !== undefined) { fields.push('description = ?'); values.push(input.description?.trim() || ''); }
  if (input.date !== undefined) { fields.push('date = ?'); values.push(input.date || toDateOnly(new Date())); }
  if (input.province !== undefined) { fields.push('province = ?'); values.push(input.province?.trim() || ''); }
  if (input.territoire !== undefined) { fields.push('territoire = ?'); values.push(input.territoire?.trim() || ''); }
  if (input.village !== undefined) { fields.push('village = ?'); values.push(input.village?.trim() || ''); }
  if (input.statut !== undefined) { fields.push('statut = ?'); values.push(normalizeOTActiviteStatut(input.statut)); }
  if (input.responsable !== undefined) { fields.push('responsable = ?'); values.push(input.responsable?.trim() || ''); }
  if (input.participants !== undefined) { fields.push('participants = ?'); values.push(input.participants ?? null); }
  if (input.resultats !== undefined) { fields.push('resultats = ?'); values.push(input.resultats ?? null); }

  if (fields.length === 0) {
    const [rows] = await getDbPool().query<OTActiviteRow[]>(
      `SELECT id, type, titre, description, date, province, territoire, village, statut, responsable, participants, resultats
       FROM ot_activites WHERE id = ? LIMIT 1`,
      [id],
    );
    return rows[0] ? mapOTActiviteRow(rows[0]) : null;
  }

  values.push(id);
  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE ot_activites SET ${fields.join(', ')} WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  const [rows] = await getDbPool().query<OTActiviteRow[]>(
    `SELECT id, type, titre, description, date, province, territoire, village, statut, responsable, participants, resultats
     FROM ot_activites WHERE id = ? LIMIT 1`,
    [id],
  );
  return rows[0] ? mapOTActiviteRow(rows[0]) : null;
};

export const getOTEquipiers = async (filters: { fonction?: string; province?: string; actif?: boolean } = {}): Promise<SqlOTEquipier[]> => {
  await ensureOTTables();

  const whereClauses: string[] = [];
  const values: Array<string | number> = [];
  if (filters.fonction) {
    whereClauses.push('fonction = ?');
    values.push(normalizeOTFonction(filters.fonction));
  }
  if (filters.province) {
    whereClauses.push('province = ?');
    values.push(filters.province);
  }
  if (filters.actif !== undefined) {
    whereClauses.push('est_actif = ?');
    values.push(filters.actif ? 1 : 0);
  }

  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const [rows] = await getDbPool().query<OTEquipierRow[]>(
    `SELECT id, nom, prenom, fonction, telephone, email, province, performance, enquetes_realisees, dernier_suivi, est_actif
     FROM ot_equipiers
     ${whereClause}
     ORDER BY performance DESC, nom ASC`,
    values,
  );

  return rows.map(mapOTEquipierRow);
};

export const getOTRapports = async (): Promise<SqlOTRapportMensuel[]> => {
  await ensureOTTables();

  const [rows] = await getDbPool().query<OTRapportRow[]>(
    `SELECT id, mois, annee, enquetes, formations, suivis, qualite_donnees, commentaires, soumis_le, valide
     FROM ot_rapports
     ORDER BY annee DESC,
       FIELD(mois, 'Décembre','Novembre','Octobre','Septembre','Août','Juillet','Juin','Mai','Avril','Mars','Février','Janvier') ASC,
       id DESC`
  );

  return rows.map(mapOTRapportRow);
};

export const createOTRapport = async (input: SqlOTRapportInput): Promise<SqlOTRapportMensuel> => {
  await ensureOTTables();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO ot_rapports (mois, annee, enquetes, formations, suivis, qualite_donnees, commentaires, soumis_le, valide)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.mois?.trim() || new Date().toLocaleString('fr-FR', { month: 'long' }),
      Number(input.annee ?? new Date().getFullYear()),
      Number(input.enquetes ?? 0),
      Number(input.formations ?? 0),
      Number(input.suivis ?? 0),
      Number(input.qualite_donnees ?? 0),
      input.commentaires?.trim() || '',
      toDateOnly(new Date()),
      input.valide ? 1 : 0,
    ],
  );

  const [rows] = await getDbPool().query<OTRapportRow[]>(
    `SELECT id, mois, annee, enquetes, formations, suivis, qualite_donnees, commentaires, soumis_le, valide
     FROM ot_rapports WHERE id = ? LIMIT 1`,
    [result.insertId],
  );

  if (!rows[0]) {
    throw new Error('Rapport OT cree mais introuvable');
  }

  return mapOTRapportRow(rows[0]);
};

export const getOTData = async (): Promise<SqlOTData> => {
  await ensureOTTables();

  const [[profileRows], activites, equipiers, rapports] = await Promise.all([
    getDbPool().query<OTProfileRow[]>('SELECT id, nom, sigle, region, provinces, responsable, performances, indicateurs, objectifs, zones, dernier_suivi FROM ot_profile LIMIT 1'),
    getOTActivites(),
    getOTEquipiers(),
    getOTRapports(),
  ]);

  const profile = profileRows[0];
  if (!profile) {
    throw new Error('Profil OT introuvable');
  }

  return mapOTProfileRow(profile, activites, equipiers, rapports);
};

export const getSuiviMissions = async (province?: string): Promise<SqlSuiviMission[]> => {
  await ensureSuiviTables();

  const whereClause = province ? 'WHERE province = ?' : '';
  const values = province ? [province] : [];

  const [rows] = await getDbPool().query<SuiviMissionRow[]>(
    `SELECT id, num, section, section_label, nature_mission, objectif, hors_projet, projet, montant_usd, dates, avance_usd, solde, province
     FROM suivi_missions
     ${whereClause}
     ORDER BY province ASC, section ASC, id ASC`,
    values,
  );

  return rows.map(mapSuiviMissionRow);
};

export const getSuiviStats = async (): Promise<SqlSuiviStats> => {
  const missions = await getSuiviMissions();
  const parProvince = missions.reduce<SqlSuiviStats['parProvince']>((accumulator, mission) => {
    const current = accumulator[mission.province] ?? { missions: 0, montant: 0, avances: 0, solde: 0 };
    current.missions += 1;
    current.montant += mission.montantUSD;
    current.avances += mission.avanceUSD;
    current.solde += mission.solde;
    accumulator[mission.province] = current;
    return accumulator;
  }, {});

  return {
    totalMissions: missions.length,
    totalMontant: missions.reduce((sum, item) => sum + item.montantUSD, 0),
    totalAvances: missions.reduce((sum, item) => sum + item.avanceUSD, 0),
    totalSolde: missions.reduce((sum, item) => sum + item.solde, 0),
    parProvince,
  };
};

export const getOrganisations = async (filters: SqlOrganisationFilters = {}) => {
  await ensureOrganisationsTable();

  const page = Math.max(Number(filters.page ?? 0), 0);
  const limit = Math.max(Number(filters.limit ?? 10), 1);
  const offset = page * limit;
  const { whereClause, values } = buildOrganisationWhereClause(filters);

  const [countRows] = await getDbPool().query<CountRow[]>(
    `SELECT COUNT(*) AS total FROM organisations ${whereClause}`,
    values,
  );

  const [rows] = await getDbPool().query<OrganisationRow[]>(
    `SELECT id, code, nom, sigle, nom_complet, type, source_type, date_creation, date_agrement, province, territoire,
            commune, adresse, responsable, telephone, email, role, beneficiaires_couverts, budget_alloue,
            taux_execution, statut, membres_total, membres_femmes, membres_hommes, membres_jeunes,
            productions, created_at, updated_at
     FROM organisations
     ${whereClause}
     ORDER BY nom ASC, id ASC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset],
  );

  const total = Number(countRows[0]?.total ?? 0);

  return {
    data: rows.map(mapOrganisationRow),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
};

export const getOrganisationById = async (id: number): Promise<SqlOrganisation | null> => {
  await ensureOrganisationsTable();

  const [rows] = await getDbPool().query<OrganisationRow[]>(
    `SELECT id, code, nom, sigle, nom_complet, type, source_type, date_creation, date_agrement, province, territoire,
            commune, adresse, responsable, telephone, email, role, beneficiaires_couverts, budget_alloue,
            taux_execution, statut, membres_total, membres_femmes, membres_hommes, membres_jeunes,
            productions, created_at, updated_at
     FROM organisations
     WHERE id = ?
     LIMIT 1`,
    [id],
  );

  return rows[0] ? mapOrganisationRow(rows[0]) : null;
};

export const getOrganisationsStats = async (): Promise<SqlOrganisationStats> => {
  await ensureOrganisationsTable();

  const pool = getDbPool();
  const [typeRows, provinceRows, statutRows, aggregateRows, sourceTypeRows] = await Promise.all([
    pool.query<BeneficiaireGroupRow[]>('SELECT type AS label, COUNT(*) AS total FROM organisations GROUP BY type'),
    pool.query<BeneficiaireGroupRow[]>('SELECT province AS label, COUNT(*) AS total FROM organisations GROUP BY province'),
    pool.query<BeneficiaireGroupRow[]>('SELECT statut AS label, COUNT(*) AS total FROM organisations GROUP BY statut'),
    pool.query<Array<RowDataPacket & { total: number; total_membres: number; femmes_membres: number; hommes_membres: number; jeunes_membres: number }>>(
      `SELECT COUNT(*) AS total,
              SUM(membres_total) AS total_membres,
              SUM(membres_femmes) AS femmes_membres,
              SUM(membres_hommes) AS hommes_membres,
              SUM(membres_jeunes) AS jeunes_membres
       FROM organisations`
    ),
    pool.query<BeneficiaireGroupRow[]>('SELECT source_type AS label, COUNT(*) AS total FROM organisations GROUP BY source_type'),
  ]);

  const sourceTypeMap = mapGroupRowsToRecord(sourceTypeRows[0]);
  const aggregate = aggregateRows[0][0];

  return {
    total: Number(aggregate?.total ?? 0),
    par_type: mapGroupRowsToRecord(typeRows[0]),
    par_province: mapGroupRowsToRecord(provinceRows[0]),
    par_statut: mapGroupRowsToRecord(statutRows[0]),
    total_membres: Number(aggregate?.total_membres ?? 0),
    femmes_membres: Number(aggregate?.femmes_membres ?? 0),
    hommes_membres: Number(aggregate?.hommes_membres ?? 0),
    jeunes_membres: Number(aggregate?.jeunes_membres ?? 0),
    gouvernementaux: Number(sourceTypeMap.gouvernemental ?? 0),
    ong: Number(sourceTypeMap.ong ?? 0),
    partenaires: Number(sourceTypeMap.partenaire_financier ?? 0) + Number(sourceTypeMap.partenaire_technique ?? 0),
  };
};

export const createOrganisation = async (input: SqlOrganisationCreateInput): Promise<SqlOrganisation> => {
  await ensureOrganisationsTable();

  const [result] = await getDbPool().execute<ResultSetHeader>(
    `INSERT INTO organisations (
      code,
      nom,
      sigle,
      nom_complet,
      type,
      source_type,
      date_creation,
      date_agrement,
      province,
      territoire,
      commune,
      adresse,
      responsable,
      telephone,
      email,
      role,
      beneficiaires_couverts,
      budget_alloue,
      taux_execution,
      statut,
      membres_total,
      membres_femmes,
      membres_hommes,
      membres_jeunes,
      productions
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.code?.trim() || `ORG-TMP-${Date.now()}`,
      input.nom?.trim() || '',
      input.sigle?.trim() || '',
      input.nom_complet?.trim() || input.nom?.trim() || '',
      normalizeOrganisationType(input.type),
      input.source_type?.trim() || null,
      input.date_creation || toDateOnly(new Date()),
      input.date_agrement || null,
      input.province?.trim() || '',
      input.territoire?.trim() || '',
      input.commune?.trim() || null,
      input.adresse?.trim() || '',
      input.contacts?.responsable?.trim() || '',
      input.contacts?.telephone?.trim() || '',
      input.contacts?.email?.trim() || null,
      input.role?.trim() || null,
      input.beneficiaires_couverts ?? 0,
      input.budget_alloue ?? 0,
      input.taux_execution ?? 0,
      normalizeOrganisationStatut(input.statut),
      input.membres?.total ?? 0,
      input.membres?.femmes ?? 0,
      input.membres?.hommes ?? 0,
      input.membres?.jeunes ?? 0,
      JSON.stringify(input.productions ?? []),
    ],
  );

  if (!input.code) {
    const code = `ORG-${String(result.insertId).padStart(3, '0')}`;
    await getDbPool().execute('UPDATE organisations SET code = ? WHERE id = ?', [code, result.insertId]);
  }

  const organisation = await getOrganisationById(result.insertId);
  if (!organisation) {
    throw new Error('Organisation creee mais introuvable');
  }

  return organisation;
};

export const updateOrganisation = async (id: number, input: SqlOrganisationUpdateInput): Promise<SqlOrganisation | null> => {
  await ensureOrganisationsTable();

  const fields: string[] = [];
  const values: Array<string | number | null> = [];

  if (input.code !== undefined) { fields.push('code = ?'); values.push(input.code?.trim() || ''); }
  if (input.nom !== undefined) { fields.push('nom = ?'); values.push(input.nom?.trim() || ''); }
  if (input.sigle !== undefined) { fields.push('sigle = ?'); values.push(input.sigle?.trim() || ''); }
  if (input.nom_complet !== undefined) { fields.push('nom_complet = ?'); values.push(input.nom_complet?.trim() || ''); }
  if (input.type !== undefined) { fields.push('type = ?'); values.push(normalizeOrganisationType(input.type)); }
  if (input.source_type !== undefined) { fields.push('source_type = ?'); values.push(input.source_type?.trim() || null); }
  if (input.date_creation !== undefined) { fields.push('date_creation = ?'); values.push(input.date_creation || toDateOnly(new Date())); }
  if (input.date_agrement !== undefined) { fields.push('date_agrement = ?'); values.push(input.date_agrement || null); }
  if (input.province !== undefined) { fields.push('province = ?'); values.push(input.province?.trim() || ''); }
  if (input.territoire !== undefined) { fields.push('territoire = ?'); values.push(input.territoire?.trim() || ''); }
  if (input.commune !== undefined) { fields.push('commune = ?'); values.push(input.commune?.trim() || null); }
  if (input.adresse !== undefined) { fields.push('adresse = ?'); values.push(input.adresse?.trim() || ''); }
  if (input.contacts?.responsable !== undefined) { fields.push('responsable = ?'); values.push(input.contacts.responsable?.trim() || ''); }
  if (input.contacts?.telephone !== undefined) { fields.push('telephone = ?'); values.push(input.contacts.telephone?.trim() || ''); }
  if (input.contacts?.email !== undefined) { fields.push('email = ?'); values.push(input.contacts.email?.trim() || null); }
  if (input.role !== undefined) { fields.push('role = ?'); values.push(input.role?.trim() || null); }
  if (input.beneficiaires_couverts !== undefined) { fields.push('beneficiaires_couverts = ?'); values.push(input.beneficiaires_couverts ?? 0); }
  if (input.budget_alloue !== undefined) { fields.push('budget_alloue = ?'); values.push(input.budget_alloue ?? 0); }
  if (input.taux_execution !== undefined) { fields.push('taux_execution = ?'); values.push(input.taux_execution ?? 0); }
  if (input.statut !== undefined) { fields.push('statut = ?'); values.push(normalizeOrganisationStatut(input.statut)); }
  if (input.membres?.total !== undefined) { fields.push('membres_total = ?'); values.push(input.membres.total ?? 0); }
  if (input.membres?.femmes !== undefined) { fields.push('membres_femmes = ?'); values.push(input.membres.femmes ?? 0); }
  if (input.membres?.hommes !== undefined) { fields.push('membres_hommes = ?'); values.push(input.membres.hommes ?? 0); }
  if (input.membres?.jeunes !== undefined) { fields.push('membres_jeunes = ?'); values.push(input.membres.jeunes ?? 0); }
  if (input.productions !== undefined) { fields.push('productions = ?'); values.push(JSON.stringify(input.productions ?? [])); }

  if (fields.length === 0) {
    return getOrganisationById(id);
  }

  values.push(id);
  const [result] = await getDbPool().execute<ResultSetHeader>(
    `UPDATE organisations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getOrganisationById(id);
};

export const deleteOrganisation = async (id: number): Promise<boolean> => {
  await ensureOrganisationsTable();
  const [result] = await getDbPool().execute<ResultSetHeader>('DELETE FROM organisations WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

export const getBeneficiairesDatabaseStats = async (): Promise<BeneficiaireDatabaseStats> => {
  const source = await resolveBeneficiaireSource();
  const pool = getDbPool();

  const [provinceRows, typeRows, technologieRows, monthlyRows] = await Promise.all([
    pool.query<BeneficiaireGroupRow[]>(
      `SELECT NULLIF(TRIM(COALESCE(${source.provinceExpr}, '')), '') AS label, COUNT(*) AS total
       FROM ${source.tableRef}
       GROUP BY label`,
    ),
    pool.query<BeneficiaireGroupRow[]>(
      `SELECT NULLIF(TRIM(COALESCE(${source.typeExploitantExpr}, '')), '') AS label, COUNT(*) AS total
       FROM ${source.tableRef}
       GROUP BY label`,
    ),
    pool.query<BeneficiaireGroupRow[]>(
      `SELECT NULLIF(TRIM(COALESCE(${source.ptechExpr}, '')), '') AS label, COUNT(*) AS total
       FROM ${source.tableRef}
       GROUP BY label`,
    ),
    pool.query<BeneficiaireMonthlyRow[]>(
      `SELECT DATE_FORMAT(${source.createdAtExpr}, '%Y-%m') AS month_key, COUNT(*) AS total
       FROM ${source.tableRef}
       WHERE ${source.createdAtExpr} IS NOT NULL
       GROUP BY month_key
       ORDER BY month_key DESC
       LIMIT 6`,
    ),
  ]);

  return {
    parProvince: mapGroupRowsToRecord(provinceRows[0]),
    parType: mapGroupRowsToRecord(typeRows[0]),
    parTechnologies: mapGroupRowsToRecord(technologieRows[0]),
    evolutionMensuelle: monthlyRows[0]
      .filter((row) => Boolean(row.month_key))
      .reverse()
      .map((row) => ({
        mois: formatMonthLabel(String(row.month_key)),
        total: Number(row.total ?? 0),
      })),
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

export const getCadreResultats = async (filters: CadreResultatsFilters = {}): Promise<IndicateurCadre[]> => {
  await ensureCadreResultatsTable();

  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (typeof filters.odp === 'boolean') {
    clauses.push('est_odp = ?');
    values.push(filters.odp ? 1 : 0);
  }

  if (filters.composante) {
    clauses.push('composante = ?');
    values.push(filters.composante);
  }

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const [rows] = await getDbPool().query<CadreResultatRow[]>(
    `SELECT
        id,
        code,
        nom,
        composante,
        sous_composante,
        est_odp,
        reference_value,
        unite,
        frequence,
        source_donnees,
        methodologie_collecte,
        responsable,
        prevu_2023,
        realise_2023,
        prevu_2024,
        realise_2024,
        prevu_2025,
        realise_2025,
        prevu_2026,
        realise_2026,
        final_prevu,
        final_realise
      FROM cadre_resultats
      ${whereClause}
      ORDER BY id ASC`,
    values,
  );

  return rows.map(mapCadreResultatRow);
};

export const getCadreResultatsStats = async (year: CadreYear = '2025'): Promise<CadreStats> => {
  const data = await getCadreResultats();
  const avecRealise = data.filter((indicateur) => {
    const annee = indicateur.annees[year];
    return annee.prevu !== null && annee.prevu > 0 && annee.realise !== null;
  });

  const performances = avecRealise
    .map((indicateur) => calcCadrePerformance(indicateur.annees[year].realise, indicateur.annees[year].prevu))
    .filter((performance): performance is number => performance !== null);

  const enRetard = performances.filter((performance) => performance < 70).length;
  const enCours = performances.filter((performance) => performance >= 70 && performance < 100).length;
  const atteint = performances.filter((performance) => performance >= 100).length;
  const moyennePerf = performances.length > 0
    ? Math.round(performances.reduce((total, performance) => total + performance, 0) / performances.length)
    : 0;
  const composantes = ['Composante 1', 'Composante 2', 'Composante 3', 'Composante 4'].map((nom) => ({
    nom,
    count: data.filter((indicateur) => indicateur.composante === nom).length,
  }));

  return {
    total: data.length,
    odp_count: data.filter((indicateur) => indicateur.est_odp).length,
    avec_donnees_2025: avecRealise.length,
    en_retard: enRetard,
    en_cours: enCours,
    atteint,
    moyenne_performance: moyennePerf,
    composantes,
  };
};

const getReferenceNumber = (reference: string): number => {
  const normalized = reference.replace(',', '.');
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : 0;
};

const toLegacyFrequence = (frequence: string): LegacyIndicateur['frequence'] => {
  const normalized = frequence.trim().toLowerCase();
  if (normalized.includes('mens')) return 'mensuelle';
  if (normalized.includes('trim')) return 'trimestrielle';
  if (normalized.includes('sem')) return 'semestrielle';
  return 'annuelle';
};

const toLegacyUnite = (unite: string): string => {
  const normalized = unite.trim().toLowerCase();
  if (normalized === 'nombre') return 'nombre';
  if (normalized === 'km') return 'km';
  if (normalized === 'ha') return 'ha';
  return unite;
};

const buildIndicatorDescription = (indicateur: IndicateurCadre): string => {
  if (indicateur.sous_composante) {
    return indicateur.sous_composante;
  }

  if (indicateur.source_donnees) {
    return `Source: ${indicateur.source_donnees}`;
  }

  return indicateur.nom;
};

const getAliasMeta = (indicateur: IndicateurCadre): IndicateurAliasMeta => {
  const mapped = CADRE_TO_ALIAS_MAP[indicateur.code];

  if (mapped) {
    return mapped;
  }

  if (indicateur.est_odp) {
    return {
      code: indicateur.code,
      composanteId: 3,
      composanteLabel: 'Capacite du secteur public',
    };
  }

  const composanteId = Number.parseInt(indicateur.composante.replace(/\D/g, ''), 10) || 1;
  const composanteLabelMap: Record<number, string> = {
    1: 'Productivite agricole',
    2: 'Acces au marche',
    3: 'Services publics agricoles',
    4: 'Intervention d\'urgence agricole',
  };

  return {
    code: indicateur.code,
    composanteId,
    composanteLabel: composanteLabelMap[composanteId] ?? indicateur.composante,
  };
};

const getYearValueForUi = (indicateur: IndicateurCadre, year: CadreYear = '2025') => {
  const currentYear = indicateur.annees[year];
  const cibleAnnuelle = currentYear.prevu ?? 0;
  const cibleFinale = indicateur.final_prevu ?? cibleAnnuelle;
  const cible = cibleFinale > 0 ? cibleFinale : cibleAnnuelle;
  const actuelle = currentYear.realise ?? 0;
  const progression = cible > 0 ? Number(((actuelle / cible) * 100).toFixed(1)) : 0;

  return { cible, cibleAnnuelle, cibleFinale, actuelle, progression };
};

// db.ts - Remplacer la fonction mapCadreToLegacyIndicateur

const mapCadreToLegacyIndicateur = (indicateur: IndicateurCadre, year: CadreYear = '2025'): LegacyIndicateur => {
  const alias = getAliasMeta(indicateur);
  const values = getYearValueForUi(indicateur, year);

  return {
    id: indicateur.id,
    code: alias.code,
    nom: indicateur.nom,
    description: buildIndicatorDescription(indicateur),
    formule: indicateur.methodologie_collecte || 'Valeur issue du cadre des resultats',
    unite: toLegacyUnite(indicateur.unite),
    frequence: toLegacyFrequence(indicateur.frequence),
    cible: values.cible,
    valeur_actuelle: values.actuelle,
    valeur_reference: getReferenceNumber(indicateur.reference),
    progression: values.progression,
    id_composante: alias.composanteId,
    est_iodp: indicateur.est_odp,
    // ⚠️ AJOUTER LES VALEURS ANNUELLES ⚠️
    cible_2023: indicateur.annees['2023'].prevu ?? null,
    cible_2024: indicateur.annees['2024'].prevu ?? null,
    cible_2025: indicateur.annees['2025'].prevu ?? null,
    cible_2026: indicateur.annees['2026'].prevu ?? null,
    realise_2023: indicateur.annees['2023'].realise ?? null,
    realise_2024: indicateur.annees['2024'].realise ?? null,
    realise_2025: indicateur.annees['2025'].realise ?? null,
    realise_2026: indicateur.annees['2026'].realise ?? null,
    source_donnees: indicateur.source_donnees,
    methodologie_collecte: indicateur.methodologie_collecte ?? null,
    responsable_collecte: indicateur.responsable,
  };
};

const mapCadreToHistorique = (indicateur: IndicateurCadre): HistoriqueValeur[] => {
  const years: CadreYear[] = ['2023', '2024', '2025', '2026'];
  return years.map((year) => ({
    periode: year,
    valeur: indicateur.annees[year].realise ?? indicateur.annees[year].prevu ?? 0,
  }));
};

const mapCadreToDatabaseItem = (indicateur: IndicateurCadre, year: CadreYear = '2025'): IndicateurDatabaseItem => {
  const alias = getAliasMeta(indicateur);
  const values = getYearValueForUi(indicateur, year);
  const now = new Date().toISOString();

  return {
    id: indicateur.id,
    code: alias.code,
    nom: indicateur.nom,
    description: buildIndicatorDescription(indicateur),
    type: indicateur.est_odp ? 'iodp' : 'ir',
    composante: alias.composanteLabel,
    sous_composante: indicateur.sous_composante,
    formule: indicateur.methodologie_collecte || 'Valeur issue du cadre des resultats',
    unite: toLegacyUnite(indicateur.unite),
    frequence: toLegacyFrequence(indicateur.frequence),
    source_donnees: indicateur.source_donnees,
    methodologie_collecte: indicateur.methodologie_collecte ?? null,
    responsable_collecte: indicateur.responsable,
    valeurs: {
      reference: getReferenceNumber(indicateur.reference),
      cible: values.cible,
      cible_annuelle: values.cibleAnnuelle,
      cible_finale: values.cibleFinale,
      actuelle: values.actuelle,
      progression: values.progression,
      final_realise: indicateur.final_realise ?? null,
    },
    historique: mapCadreToHistorique(indicateur).map((entry) => ({
      ...entry,
      source: indicateur.source_donnees,
    })),
    statut: 'actif',
    created_at: now,
    updated_at: now,
  };
};

export const getLegacyIndicateurs = async (filters: { type?: 'iodp' | 'ir'; composanteId?: number } = {}): Promise<LegacyIndicateur[]> => {
  const data = await getCadreResultats();

  return data
    .map((indicateur) => mapCadreToLegacyIndicateur(indicateur))
    .filter((indicateur) => {
      if (filters.type === 'iodp' && !indicateur.est_iodp) {
        return false;
      }

      if (filters.type === 'ir' && indicateur.est_iodp) {
        return false;
      }

      if (filters.composanteId && indicateur.id_composante !== filters.composanteId) {
        return false;
      }

      return true;
    });
};

export const getLegacyIndicateurById = async (id: number): Promise<LegacyIndicateur | null> => {
  const indicateurs = await getLegacyIndicateurs();
  return indicateurs.find((indicateur) => indicateur.id === id) ?? null;
};

export const getLegacyIndicateurByCode = async (code: string): Promise<LegacyIndicateur | null> => {
  const indicateurs = await getLegacyIndicateurs();
  return indicateurs.find((indicateur) => indicateur.code === code) ?? null;
};

export const getLegacyHistorique = async (id: number): Promise<HistoriqueValeur[]> => {
  const cadre = await getCadreResultats();
  const indicateur = cadre.find((item) => item.id === id);
  return indicateur ? mapCadreToHistorique(indicateur) : [];
};

export const getIndicateursDashboardData = async (): Promise<DashboardData> => {
  const indicateurs = await getLegacyIndicateurs({ type: 'iodp' });
  const iodp1 = indicateurs.find((indicateur) => indicateur.code === 'IODP1.1') ?? indicateurs[0];
  const iodp2 = indicateurs.find((indicateur) => indicateur.code === 'IODP2.1') ?? indicateurs[1] ?? iodp1;
  const iodp3 = indicateurs.find((indicateur) => indicateur.code === 'IODP2.3') ?? indicateurs[2] ?? iodp2;
  const buildEvolution = (indicateurId: number) => ['2023', '2024', '2025', '2026'].map((year) => ({ year, value: 0 }));
  const cadre = await getCadreResultats({ odp: true });
  const byId = new Map(cadre.map((item) => [item.id, item]));
  const months = ['2023', '2024', '2025', '2026'];

  const resolveSeries = (id: number) => months.map((month) => {
    const indicateur = byId.get(id);
    const year = month as CadreYear;
    return indicateur?.annees[year].realise ?? indicateur?.annees[year].prevu ?? 0;
  });

  const iodp1Series = iodp1 ? resolveSeries(iodp1.id) : [0, 0, 0, 0];
  const iodp2Series = iodp2 ? resolveSeries(iodp2.id) : [0, 0, 0, 0];
  const iodp3Series = iodp3 ? resolveSeries(iodp3.id) : [0, 0, 0, 0];

  return {
    iodp1: { current: iodp1?.valeur_actuelle ?? 0, target: iodp1?.cible ?? 0, trend: iodp1Series[3] - iodp1Series[2] },
    iodp2: { current: iodp2?.valeur_actuelle ?? 0, target: iodp2?.cible ?? 0, trend: iodp2Series[3] - iodp2Series[2] },
    iodp3: { current: iodp3?.valeur_actuelle ?? 0, target: iodp3?.cible ?? 0, trend: iodp3Series[3] - iodp3Series[2] },
    evolution: months.map((month, index) => ({
      month,
      iodp1: iodp1Series[index],
      iodp2: iodp2Series[index],
      iodp3: iodp3Series[index],
    })),
  };
};

export const getIndicateursDatabase = async (filters: IndicateursDatabaseFilters = {}): Promise<PaginatedResult<IndicateurDatabaseItem>> => {
  const all = (await getCadreResultats()).map((indicateur) => mapCadreToDatabaseItem(indicateur));
  let filtered = [...all];

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter((indicateur) => indicateur.nom.toLowerCase().includes(search) || indicateur.code.toLowerCase().includes(search));
  }

  if (filters.type) {
    filtered = filtered.filter((indicateur) => indicateur.type === filters.type);
  }

  if (filters.composante) {
    filtered = filtered.filter((indicateur) => indicateur.composante === filters.composante);
  }

  if (filters.frequence) {
    filtered = filtered.filter((indicateur) => indicateur.frequence === filters.frequence);
  }

  if (filters.statut) {
    filtered = filtered.filter((indicateur) => indicateur.statut === filters.statut);
  }

  const page = Number(filters.page ?? 0);
  const limit = Number(filters.limit ?? 10);
  const start = page * limit;

  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    totalPages: Math.ceil(filtered.length / limit),
  };
};

export const getIndicateurDatabaseById = async (id: number): Promise<IndicateurDatabaseItem | null> => {
  const items = await getIndicateursDatabase({ page: 0, limit: 1000 });
  return items.data.find((item) => item.id === id) ?? null;
};

export const getIndicateursDatabaseStats = async (): Promise<IndicateursDatabaseStats> => {
  const items = (await getCadreResultats()).map((indicateur) => mapCadreToDatabaseItem(indicateur));
  const parComposante = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.composante] = (acc[item.composante] ?? 0) + 1;
    return acc;
  }, {});
  const parFrequence = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.frequence] = (acc[item.frequence] ?? 0) + 1;
    return acc;
  }, {});
  const progressionMoyenne = items.length > 0
    ? Number((items.reduce((total, item) => total + item.valeurs.progression, 0) / items.length).toFixed(1))
    : 0;

  return {
    total: items.length,
    par_type: {
      iodp: items.filter((item) => item.type === 'iodp').length,
      ir: items.filter((item) => item.type === 'ir').length,
    },
    par_composante: parComposante,
    par_frequence: parFrequence,
    progression_moyenne: progressionMoyenne,
    indicateurs_atteints: items.filter((item) => item.valeurs.progression >= 100).length,
    indicateurs_en_alerte: items.filter((item) => item.valeurs.progression < 50).length,
  };
};

export const updateIndicateurValeur = async (id: number, valeur: number, periode?: string): Promise<LegacyIndicateur | null> => {
  await ensureCadreResultatsTable();

  const yearMatch = periode?.match(/20\d{2}/);
  const year = (yearMatch?.[0] as CadreYear | undefined) ?? '2025';
  const allowedYears: CadreYear[] = ['2023', '2024', '2025', '2026'];
  const targetYear = allowedYears.includes(year) ? year : '2025';

  await getDbPool().query<ResultSetHeader>(
    `UPDATE cadre_resultats
     SET realise_${targetYear} = ?
     WHERE id = ?`,
    [valeur, id],
  );

  return getLegacyIndicateurById(id);
};

export const isDatabaseConnectivityError = (error: unknown): boolean => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: string }).code)
    : '';

  return ['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ENOTFOUND', 'ETIMEDOUT'].includes(code);
};

const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  admin: ['*'],
  uncp: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte', 'rapports', 'admin'],
  upep: ['dashboard', 'indicateurs', 'beneficiaires', 'collecte'],
  ot: ['collecte', 'beneficiaires', 'rapports_terrain'],
  partenaire: ['dashboard', 'rapports'],
  invite: ['dashboard'],
};

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrateur',
  uncp: 'UNCP',
  upep: 'UPEP',
  ot: 'Opérateur Technique',
  partenaire: 'Partenaire',
  invite: 'Invité',
};