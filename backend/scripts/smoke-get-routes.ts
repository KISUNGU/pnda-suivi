/**
 * Smoke test : appelle toutes les routes GET sans parametre et rapporte leur
 * code HTTP.
 *
 * Complement de list-routes.ts : celui-ci verifie que les routes sont bien
 * MONTEES, celui-la qu'elles REPONDENT. Le second demande donc une base de
 * donnees accessible (DATABASE_URL), et ne tourne pas en CI.
 *
 *   npm run smoke
 *
 * L'application est montee dans ce processus sur un port ephemere : ni serveur
 * a demarrer a cote, ni course au demarrage. Le jeton est signe a la volee avec
 * le JWT_SECRET local, valable trente minutes, le temps que les 81 appels aboutissent, et sert uniquement a traverser
 * authenticateToken.
 */
import http from 'http';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

import app from '../src/app';
import { JWT_SECRET } from '../src/config/env';

const ROLE = process.argv[2] ?? 'admin';
const INSTANTANE = path.resolve(__dirname, 'routes.snapshot.txt');

const routes = fs.readFileSync(INSTANTANE, 'utf-8')
  .split('\n')
  .filter((l) => l.startsWith('GET'))
  .map((l) => l.split(/\s+/)[1])
  .filter((p) => p && !p.includes(':'));

const jeton = jwt.sign(
  { id: 0, email: 'smoke@local', role: ROLE, province: null },
  JWT_SECRET,
  { expiresIn: '30m' }
);

function appeler(serveur: http.Server, chemin: string): Promise<{ code: number; extrait: string }> {
  const { port } = serveur.address() as { port: number };
  return new Promise((resoudre) => {
    const requete = http.get(
      { host: '127.0.0.1', port, path: chemin, headers: { Authorization: `Bearer ${jeton}` } },
      (reponse) => {
        let corps = '';
        reponse.on('data', (bloc) => { if (corps.length < 200) corps += bloc; });
        reponse.on('end', () => resoudre({ code: reponse.statusCode ?? 0, extrait: corps.slice(0, 140) }));
      }
    );
    requete.on('error', (e) => resoudre({ code: 0, extrait: e.message }));
    requete.setTimeout(30_000, () => { requete.destroy(); resoudre({ code: 0, extrait: 'timeout' }); });
  });
}

async function main() {
  const serveur = app.listen(0);
  await new Promise((r) => serveur.once('listening', r));
  console.log(`Smoke sur ${routes.length} routes GET, role « ${ROLE} ».\n`);

  const echecs: Array<{ chemin: string; code: number; extrait: string }> = [];
  let ok = 0;

  for (const chemin of routes) {
    const { code, extrait } = await appeler(serveur, chemin);
    if (code >= 200 && code < 300) { ok += 1; continue; }
    echecs.push({ chemin, code, extrait });
    console.log(`  ${code}  ${chemin}\n        ${extrait.replace(/\s+/g, ' ')}`);
  }

  console.log(`\n${ok}/${routes.length} en 2xx, ${echecs.length} hors 2xx.`);
  serveur.close();
  process.exit(echecs.some((e) => e.code === 0 || e.code >= 500) ? 1 : 0);
}

main();
