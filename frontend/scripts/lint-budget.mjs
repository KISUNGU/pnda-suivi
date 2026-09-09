/**
 * Cliquet de qualite ESLint.
 *
 * Le frontend porte une dette de lint heritee. La bloquer d'un coup arreterait
 * le chantier ; l'ignorer la laisserait grossir. Ce script fige le nombre de
 * problemes constate et echoue des qu'il augmente. Quand il diminue, il
 * demande a ce que le budget soit reabaisse : la dette ne peut que decroitre.
 *
 *   node scripts/lint-budget.mjs           verifie
 *   node scripts/lint-budget.mjs --write   enregistre le compte actuel
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ICI = dirname(fileURLToPath(import.meta.url));
const BUDGET = resolve(ICI, '..', '.lint-budget.json');

let brut = '[]';
try {
  brut = execFileSync('npx', ['eslint', '.', '--format', 'json'], {
    cwd: resolve(ICI, '..'), encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024,
  });
} catch (e) {
  // eslint sort en code 1 des qu'il trouve une erreur : le rapport JSON reste
  // sur stdout et c'est lui qui nous interesse.
  brut = e.stdout?.toString() || '';
  if (!brut.trim()) {
    console.error('ESLint n\'a produit aucun rapport :\n' + (e.stderr?.toString() ?? e.message));
    process.exit(2);
  }
}

const rapport = JSON.parse(brut);
const erreurs = rapport.reduce((n, f) => n + f.errorCount, 0);
const avertissements = rapport.reduce((n, f) => n + f.warningCount, 0);

if (process.argv.includes('--write')) {
  writeFileSync(BUDGET, JSON.stringify({ erreurs, avertissements }, null, 2) + '\n');
  console.log(`Budget enregistre : ${erreurs} erreurs, ${avertissements} avertissements.`);
  process.exit(0);
}

if (!existsSync(BUDGET)) {
  console.error('Aucun budget de reference. Lancer : node scripts/lint-budget.mjs --write');
  process.exit(1);
}

const ref = JSON.parse(readFileSync(BUDGET, 'utf-8'));

if (erreurs > ref.erreurs || avertissements > ref.avertissements) {
  console.error(
    `La dette de lint augmente : ${erreurs} erreurs / ${avertissements} avertissements ` +
    `contre ${ref.erreurs} / ${ref.avertissements} autorises.\n` +
    `Corriger les nouveaux problemes plutot que de relever le budget.`
  );
  process.exit(1);
}

if (erreurs < ref.erreurs || avertissements < ref.avertissements) {
  console.error(
    `Dette reduite : ${erreurs} erreurs / ${avertissements} avertissements ` +
    `(budget : ${ref.erreurs} / ${ref.avertissements}).\n` +
    `Abaisser le budget : node scripts/lint-budget.mjs --write`
  );
  process.exit(1);
}

console.log(`OK : ${erreurs} erreurs / ${avertissements} avertissements, conforme au budget.`);
