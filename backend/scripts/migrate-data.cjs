/**
 * Import des données depuis les dumps mysqldump (database/pnda_se.sql,
 * database/agriculteurs.sql) vers le schéma Postgres/Supabase déjà en place
 * (supabase/migrations/0001_schema_initial_from_mysql.sql).
 *
 * Usage : node scripts/migrate-data.cjs <fichier.sql> [...autres fichiers]
 * Rejouable sans risque : chaque ligne est insérée avec ON CONFLICT DO NOTHING
 * sur la clé primaire, et les séquences d'identité sont réalignées à la fin.
 */
require('dotenv').config();
const fs = require('fs');
const readline = require('readline');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Tables à ignorer explicitement lors de l'import en masse (gérées à part,
// ou déjà couvertes par une autre logique).
const SKIP_TABLES = new Set(process.argv.includes('--skip-agriculteurs') ? ['agriculteurs'] : []);

/** Décode une chaîne littérale MySQL ('...') : \' \" \\ \n \r \0 -> caractère réel. */
function unescapeMysqlString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '\\' && i + 1 < raw.length) {
      const n = raw[i + 1];
      i++;
      if (n === 'n') out += '\n';
      else if (n === 'r') out += '\r';
      else if (n === 't') out += '\t';
      else if (n === '0') out += '\0';
      else out += n; // \' \" \\ \% \_ -> le caractère littéral
    } else {
      out += c;
    }
  }
  return out;
}

/** Découpe un tuple `(a, 'b, c', NULL, ...)` (parenthèses incluses) en valeurs JS. */
function parseTuple(tuple) {
  const inner = tuple.slice(1, -1); // retire ( et )
  const values = [];
  let i = 0;
  const n = inner.length;
  while (i < n) {
    while (i < n && (inner[i] === ' ' || inner[i] === ',')) i++;
    if (i >= n) break;
    if (inner[i] === "'") {
      let j = i + 1;
      let raw = '';
      while (j < n) {
        if (inner[j] === '\\' && j + 1 < n) {
          raw += inner[j] + inner[j + 1];
          j += 2;
          continue;
        }
        if (inner[j] === "'") {
          if (inner[j + 1] === "'") { // '' -> apostrophe littérale (rare, mais valide en SQL)
            raw += "'";
            j += 2;
            continue;
          }
          break;
        }
        raw += inner[j];
        j++;
      }
      values.push({ raw: unescapeMysqlString(raw), quoted: true });
      i = j + 1;
    } else {
      let j = i;
      while (j < n && inner[j] !== ',') j++;
      const tok = inner.slice(i, j).trim();
      values.push({ raw: tok === 'NULL' ? null : tok, quoted: false });
      i = j;
    }
  }
  return values;
}

/** Convertit une valeur brute (issue du parseTuple) selon le type Postgres cible. */
function coerce(value, pgType) {
  if (value.raw === null) return null;
  const raw = value.raw;
  if (!value.quoted) {
    // littéral numérique MySQL (int, decimal) ou NULL déjà traité au-dessus
    if (pgType === 'boolean') return raw === '1';
    return raw;
  }
  // valeur entre quotes
  if (pgType === 'boolean') return raw === '1';
  if (raw === '0000-00-00' || raw === '0000-00-00 00:00:00') return null;
  return raw;
}

async function getSchema(tables) {
  const { rows } = await pool.query(
    `SELECT table_name, column_name, data_type, is_identity
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [tables]
  );
  const schema = new Map();
  for (const r of rows) {
    if (!schema.has(r.table_name)) schema.set(r.table_name, new Map());
    schema.get(r.table_name).set(r.column_name, { type: r.data_type, identity: r.is_identity === 'YES' });
  }
  return schema;
}

async function getPrimaryKeys(tables) {
  const { rows } = await pool.query(
    `SELECT tc.table_name, kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public' AND tc.table_name = ANY($1)`,
    [tables]
  );
  const pks = new Map();
  for (const r of rows) {
    if (!pks.has(r.table_name)) pks.set(r.table_name, []);
    pks.get(r.table_name).push(r.column_name);
  }
  return pks;
}

const BATCH_SIZE = 500;

async function flushBatch(table, columns, batch, schema, pks) {
  if (batch.length === 0) return;
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const hasIdentity = columns.some((c) => schema.get(table)?.get(c)?.identity);
  const overriding = hasIdentity ? 'OVERRIDING SYSTEM VALUE' : '';
  // Cible générique (pas de liste de colonnes) : ignore toute violation de
  // contrainte unique sur la table (PK, ou UNIQUE(code)/(nom_profil)/...),
  // pas seulement celle de la clé primaire.
  const conflict = 'ON CONFLICT DO NOTHING';

  const params = [];
  const tuples = [];
  for (const row of batch) {
    const placeholders = row.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
    tuples.push(`(${placeholders.join(', ')})`);
  }
  const sql = `INSERT INTO "${table}" (${cols}) ${overriding} VALUES ${tuples.join(', ')} ${conflict}`;
  await pool.query(sql, params);
}

async function importFile(file, schema, pks, stats) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
  let table = null;
  let columns = null;
  let batch = [];
  let skipping = false;

  const finishTable = async () => {
    if (table && !skipping) await flushBatch(table, columns, batch, schema, pks);
    batch = [];
  };

  for await (const line of rl) {
    const header = line.match(/^INSERT INTO `([a-zA-Z_0-9]+)` \(([^)]+)\) VALUES/);
    if (header) {
      await finishTable();
      table = header[1];
      columns = header[2].split(',').map((c) => c.trim().replace(/`/g, ''));
      skipping = SKIP_TABLES.has(table) || !schema.has(table);
      if (skipping && !SKIP_TABLES.has(table)) {
        console.warn(`[skip] table inconnue du schéma Postgres : ${table}`);
      }
      stats[table] = stats[table] || 0;
      continue;
    }
    if (!table || skipping) continue;
    const trimmed = line.trim();
    if (!trimmed.startsWith('(')) continue;

    const endsStatement = trimmed.endsWith(';');
    const tupleText = endsStatement ? trimmed.slice(0, -1).replace(/,$/, '') : trimmed.replace(/,$/, '');
    const values = parseTuple(tupleText);
    const colTypes = schema.get(table);
    const row = columns.map((c, idx) => coerce(values[idx], colTypes.get(c)?.type));
    batch.push(row);
    stats[table]++;

    if (batch.length >= BATCH_SIZE) {
      await flushBatch(table, columns, batch, schema, pks);
      batch = [];
    }
  }
  await finishTable();
}

async function resetSequences(schema) {
  for (const [table, cols] of schema.entries()) {
    for (const [col, info] of cols.entries()) {
      if (!info.identity) continue;
      await pool.query(
        `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX("${col}") FROM "${table}"), 1))`,
        [table, col]
      );
    }
  }
}

async function main() {
  const files = process.argv.slice(2).filter((a) => a.endsWith('.sql'));
  if (files.length === 0) {
    console.error('Usage: node migrate-data.cjs <dump1.sql> [dump2.sql ...] [--skip-agriculteurs]');
    process.exit(1);
  }

  // Découverte des tables ciblées : toutes celles déjà connues du schéma Postgres.
  const { rows: allTables } = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
  );
  const tableNames = allTables.map((r) => r.table_name);
  const schema = await getSchema(tableNames);
  const pks = await getPrimaryKeys(tableNames);

  const stats = {};
  for (const file of files) {
    console.log(`--- import ${file} ---`);
    await importFile(file, schema, pks, stats);
  }

  console.log('Réalignement des séquences...');
  await resetSequences(schema);

  console.log('--- lignes lues/insérées (tentées, ON CONFLICT DO NOTHING) ---');
  for (const [t, n] of Object.entries(stats)) console.log(t, n);

  await pool.end();
}

main().catch((e) => {
  console.error('ERREUR', e);
  process.exit(1);
});
