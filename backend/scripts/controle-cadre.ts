/**
 * Controle de coherence du cadre de resultats, en ligne de commande.
 *
 *   npm run controle:cadre
 *
 * Les regles vivent dans src/db/cadre.ts et sont partagees avec la route
 * GET /api/cadre-resultats/controle : le terminal et l'interface disent donc
 * exactement la meme chose. Ce fichier ne fait que la mise en forme.
 *
 * Sortie en code 1 s'il reste une anomalie bloquante — utilisable comme garde
 * avant une revue ou la production d'un ISR.
 */
import { controlerCadre, type Anomalie } from '../src/db/cadre';

const BARRE = 20;

function afficherGroupe(titre: string, liste: Anomalie[]) {
  if (!liste.length) return;
  console.log(`\n${titre} — ${liste.length}`);
  let regleCourante = '';
  for (const a of liste) {
    if (a.regle !== regleCourante) {
      console.log(`\n  ${a.regle}`);
      regleCourante = a.regle;
    }
    console.log(`    ${a.detail}`);
  }
}

async function main() {
  const rapport = await controlerCadre();

  console.log('Completude des realisations (national, tous sexes)\n');
  for (const c of rapport.completude) {
    const plein = Math.round((c.renseignes / c.total) * BARRE);
    console.log(
      `  ${c.annee} : ${String(c.renseignes).padStart(2)}/${c.total}` +
      `  ${'#'.repeat(plein).padEnd(BARRE, '.')}  ${c.part} %`
    );
  }

  afficherGroupe('BLOQUANT', rapport.anomalies.filter((a) => a.gravite === 'bloquant'));
  afficherGroupe('A VERIFIER', rapport.anomalies.filter((a) => a.gravite === 'a_verifier'));

  console.log(`\n${rapport.bloquants} anomalie(s) bloquante(s), ${rapport.a_verifier} a verifier.`);
  if (!rapport.anomalies.length) console.log('Aucune anomalie detectee.');

  process.exit(rapport.bloquants > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
