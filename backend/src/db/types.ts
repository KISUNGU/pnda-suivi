/**
 * Types de la couche d'acces aux donnees.
 *
 * Le projet a migre de MySQL vers Postgres/Supabase, mais les milliers d'appels
 * existants gardent la forme d'appel mysql2 : `const [rows] = await pool.query(...)`,
 * placeholders `?`, `result.insertId`. Ces types reproduisent localement la
 * surface de mysql2 reellement utilisee, ce qui permet de retirer la dependance
 * runtime `mysql2` du backend sans toucher aux appelants.
 *
 * Ils sont volontairement minimaux : aucune transaction, aucun `getConnection()`
 * n'est utilise dans le code, donc rien de tout cela n'est declare ici.
 */

/** Ligne renvoyee par un SELECT. Les interfaces de resultat l'etendent. */
export interface RowDataPacket {
  [colonne: string]: any;
}

/** En-tete renvoye par un INSERT / UPDATE / DELETE. */
export interface ResultSetHeader {
  affectedRows: number;
  /** Alimente par un RETURNING injecte automatiquement (cf. TABLE_PRIMARY_KEY). */
  insertId: number;
  fieldCount: number;
  info: string;
  serverStatus: number;
  warningStatus: number;
}

/**
 * Pool de connexions expose au reste du backend.
 *
 * `query` et `execute` sont volontairement identiques : la couche de
 * compatibilite ne distingue pas requete preparee et requete simple.
 */
export interface DbPool {
  query<T = unknown>(sql: string, params?: unknown[]): Promise<[T, unknown[]]>;
  execute<T = unknown>(sql: string, params?: unknown[]): Promise<[T, unknown[]]>;
}
