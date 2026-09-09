/**
 * Inventaire des routes HTTP reellement montees sur l'application Express.
 *
 * Sert de filet de securite au decoupage de app.ts : la liste doit rester
 * identique avant et apres un refactoring qui ne vise pas a changer l'API.
 *
 *   npm run routes            -> affiche l'inventaire
 *   npm run routes -- --check -> compare a scripts/routes.snapshot.txt (code 1 si ecart)
 *   npm run routes -- --write -> regenere l'instantane (a faire quand l'API change volontairement)
 *
 * L'application est importee sans etre demarree et sans ouvrir de connexion
 * a la base : aucun effet de bord.
 */
import fs from 'fs';
import path from 'path';

import app from '../src/app';

const INSTANTANE = path.resolve(__dirname, 'routes.snapshot.txt');

type Couche = {
  route?: { path: string | string[]; methods: Record<string, boolean> };
  name?: string;
  handle?: { stack?: Couche[] };
  regexp?: RegExp;
};

/** Parcourt la pile Express, y compris les routers montes via app.use(). */
function collecter(couches: Couche[], prefixe = ''): string[] {
  const routes: string[] = [];

  for (const couche of couches) {
    if (couche.route) {
      const chemins = Array.isArray(couche.route.path) ? couche.route.path : [couche.route.path];
      for (const chemin of chemins) {
        for (const [methode, actif] of Object.entries(couche.route.methods)) {
          if (actif && methode !== '_all') {
            routes.push(`${methode.toUpperCase().padEnd(6)} ${prefixe}${chemin}`);
          }
        }
      }
    } else if (couche.name === 'router' && couche.handle?.stack) {
      routes.push(...collecter(couche.handle.stack, prefixe + prefixeDeRegexp(couche.regexp)));
    }
  }

  return routes;
}

/** Reconstitue le prefixe d'un router monte, a partir de la regexp d'Express. */
function prefixeDeRegexp(regexp?: RegExp): string {
  if (!regexp) return '';
  const brut = regexp.source
    .replace('\\/?(?=\\/|$)', '')
    .replace(/^\^/, '')
    .replace(/\$$/, '')
    .replace(/\\\//g, '/');
  return brut === '/' || brut === '(?:/)?' ? '' : brut;
}

const pile = (app as unknown as { _router?: { stack: Couche[] } })._router?.stack ?? [];
const routes = collecter(pile).sort();
const contenu = routes.join('\n') + '\n';

const mode = process.argv[2];

if (mode === '--write') {
  fs.writeFileSync(INSTANTANE, contenu, 'utf-8');
  console.log(`Instantane ecrit : ${routes.length} routes -> ${path.relative(process.cwd(), INSTANTANE)}`);
} else if (mode === '--check') {
  if (!fs.existsSync(INSTANTANE)) {
    console.error('Aucun instantane de reference. Lancer : npm run routes -- --write');
    process.exit(1);
  }
  const reference = fs.readFileSync(INSTANTANE, 'utf-8');
  if (reference === contenu) {
    console.log(`OK : ${routes.length} routes, identiques a l'instantane.`);
  } else {
    const avant = new Set(reference.trim().split('\n'));
    const apres = new Set(routes);
    const disparues = [...avant].filter((r) => !apres.has(r));
    const apparues = [...apres].filter((r) => !avant.has(r));
    console.error("ECART avec l'instantane des routes :");
    for (const r of disparues) console.error(`  - ${r}`);
    for (const r of apparues) console.error(`  + ${r}`);
    process.exit(1);
  }
} else {
  console.log(contenu.trimEnd());
  console.error(`\n${routes.length} routes.`);
}
