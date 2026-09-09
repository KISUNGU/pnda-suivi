// One-off conversion: MySQL schema dump (database/schema_only.sql) -> Postgres/Supabase DDL.
// Usage: node database/convert-schema.js
const fs = require('fs');
const path = require('path');

let src = fs.readFileSync(path.join(__dirname, 'schema_only.sql'), 'utf8');
if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
const lines = src.split(/\r?\n/);

const tables = [];
let current = null;

for (const rawLine of lines) {
  const line = rawLine;
  const createMatch = line.match(/^CREATE TABLE IF NOT EXISTS `([^`]+)` \($/);
  if (createMatch) {
    current = { name: createMatch[1], lines: [] };
    continue;
  }
  if (current && /^\)\s*(ENGINE=.*)?;?\s*$/.test(line)) {
    tables.push(current);
    current = null;
    continue;
  }
  if (current) {
    current.lines.push(line.replace(/,$/, ''));
  }
}

function stripQuotesIdent(s) {
  return s.replace(/`/g, '');
}

const RESERVED = new Set(['user', 'role', 'group', 'order', 'limit', 'check', 'default', 'table', 'primary', 'column', 'grant', 'left', 'right']);
function ident(name) {
  return RESERVED.has(name.toLowerCase()) ? `"${name}"` : name;
}

function convertColumnLine(line) {
  const m = line.match(/^\s*`([^`]+)`\s+(.*)$/);
  if (!m) return null;
  const colName = m[1];
  let rest = m[2];

  let notNull = /NOT NULL/i.test(rest);
  const hasDefault = rest.match(/DEFAULT\s+('[^']*'|-?\d+(\.\d+)?|CURRENT_TIMESTAMP|NULL)/i);
  const autoIncrement = /AUTO_INCREMENT/i.test(rest);
  const onUpdateTs = /ON UPDATE CURRENT_TIMESTAMP/i.test(rest);

  let pgType = null;
  let checkClause = null;
  let defaultClause = null;

  let typeMatch;
  if ((typeMatch = rest.match(/^tinyint\(1\)/i))) {
    pgType = 'boolean';
    if (hasDefault) {
      const v = hasDefault[1].replace(/'/g, '');
      defaultClause = v === '1' ? 'true' : 'false';
    }
  } else if ((typeMatch = rest.match(/^(int|bigint|smallint)\b/i))) {
    pgType = typeMatch[1].toLowerCase() === 'int' ? 'integer' : typeMatch[1].toLowerCase();
    if (autoIncrement) {
      pgType += ' GENERATED ALWAYS AS IDENTITY';
    } else if (hasDefault) {
      defaultClause = hasDefault[1].replace(/'/g, '');
    }
  } else if ((typeMatch = rest.match(/^decimal\((\d+),(\d+)\)/i))) {
    pgType = `numeric(${typeMatch[1]},${typeMatch[2]})`;
    if (hasDefault) defaultClause = hasDefault[1].replace(/'/g, '');
  } else if ((typeMatch = rest.match(/^varchar\((\d+)\)/i))) {
    pgType = `varchar(${typeMatch[1]})`;
    if (hasDefault) defaultClause = hasDefault[1] === 'NULL' ? null : hasDefault[1];
  } else if ((typeMatch = rest.match(/^char\((\d+)\)/i))) {
    pgType = `char(${typeMatch[1]})`;
    if (hasDefault) defaultClause = hasDefault[1] === 'NULL' ? null : hasDefault[1];
  } else if (/^text\b/i.test(rest)) {
    pgType = 'text';
    if (hasDefault) defaultClause = hasDefault[1];
  } else if (/^date\b/i.test(rest) && !/^datetime/i.test(rest)) {
    pgType = 'date';
    if (hasDefault) defaultClause = /CURRENT_TIMESTAMP/i.test(hasDefault[1]) ? 'now()' : hasDefault[1];
  } else if (/^(datetime|timestamp)\b/i.test(rest)) {
    pgType = 'timestamptz';
    if (hasDefault) defaultClause = /CURRENT_TIMESTAMP/i.test(hasDefault[1]) ? 'now()' : hasDefault[1];
  } else if (/^json\b/i.test(rest)) {
    pgType = 'jsonb';
  } else if ((typeMatch = rest.match(/^enum\(([^)]*)\)/i))) {
    pgType = 'text';
    const values = typeMatch[1];
    checkClause = `${colName} IN (${values})`;
    if (hasDefault) defaultClause = hasDefault[1];
  } else {
    pgType = 'text';
  }

  let colDef = `  ${ident(colName)} ${pgType}`;
  if (notNull && !autoIncrement) colDef += ' NOT NULL';
  if (defaultClause !== null && defaultClause !== undefined && !autoIncrement) colDef += ` DEFAULT ${defaultClause}`;

  return { colName, colDef, checkClause, onUpdateTs };
}

let out = [];
out.push('-- Auto-generated from database/schema_only.sql (MySQL) for Supabase/Postgres.');
out.push('-- Review before applying. ENUM columns become text + CHECK constraints.');
out.push('');
out.push(`CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`);
out.push('');

for (const table of tables) {
  const tName = ident(table.name);
  const colDefs = [];
  const checks = [];
  const uniqueConstraints = [];
  const indexes = [];
  let primaryKey = null;
  let hasUpdatedAt = false;

  for (const line of table.lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (/^PRIMARY KEY/i.test(trimmed)) {
      const cols = trimmed.match(/\(([^)]+)\)/)[1].replace(/`/g, '');
      primaryKey = cols;
      continue;
    }
    if (/^UNIQUE KEY/i.test(trimmed)) {
      const m = trimmed.match(/^UNIQUE KEY `([^`]+)` \(([^)]+)\)/i);
      if (m) uniqueConstraints.push({ name: `${table.name}_${m[1]}`, cols: m[2].replace(/`/g, '') });
      continue;
    }
    if (/^KEY/i.test(trimmed)) {
      const m = trimmed.match(/^KEY `([^`]+)` \(([^)]+)\)/i);
      if (m) indexes.push({ name: `${table.name}_${m[1]}`, cols: m[2].replace(/`/g, '') });
      continue;
    }

    const converted = convertColumnLine(line);
    if (converted) {
      colDefs.push(converted.colDef);
      if (converted.checkClause) checks.push(`CHECK (${converted.checkClause})`);
      if (converted.colName === 'updated_at') hasUpdatedAt = true;
    }
  }

  if (primaryKey) colDefs.push(`  PRIMARY KEY (${primaryKey})`);
  for (const uc of uniqueConstraints) colDefs.push(`  CONSTRAINT ${uc.name} UNIQUE (${uc.cols})`);
  for (const c of checks) colDefs.push(`  ${c}`);

  out.push(`CREATE TABLE IF NOT EXISTS ${tName} (`);
  out.push(colDefs.join(',\n'));
  out.push(');');
  out.push('');

  for (const idx of indexes) {
    out.push(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${tName} (${idx.cols});`);
  }
  if (indexes.length) out.push('');

  if (hasUpdatedAt) {
    out.push(`CREATE TRIGGER trg_${table.name}_updated_at BEFORE UPDATE ON ${tName}
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    out.push('');
  }
}

fs.writeFileSync(path.join(__dirname, 'schema_postgres.sql'), out.join('\n'), 'utf8');
console.log(`Converted ${tables.length} tables -> database/schema_postgres.sql`);
