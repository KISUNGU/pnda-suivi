/**
 * Controle de coherence du cadre de resultats.
 *
 * Le cadre est le livrable bailleur : un chiffre faux y voyage jusqu'au rapport
 * ISR. Ces regles cherchent les incoherences qu'aucune contrainte de base ne
 * peut attraper, parce qu'elles portent sur le SENS des valeurs.
 *
 *   npm run controle:cadre
 *
 * Le script lit cadre_valeur quand la table existe (apres la migration 0006),
 * et sinon reconstitue les memes lignes depuis les colonnes prevu_/realise_ de
 * cadre_resultats. Il donne donc le meme resultat avant et apres la bascule —
 * ce qui vaut verification que la migration ne change pas le sens des donnees.
 *
 * Sortie en code 1 s'il reste une anomalie bloquante.
 */
import { getDbPool } from '../src/db/core';

type Anomalie = { regle: string; gravite: 'bloquant' | 'a_verifier'; detail: string };

/** Lignes (code, annee, province, sexe, cible, realise), quelle que soit la source. */
const SOURCE_CADRE_VALEUR = `select code_cadre, annee, province, sexe, cible, realise from cadre_valeur`;

const SOURCE_COLONNES = `
  select coalesce(c.code_parent, c.code) as code_cadre,
         a.annee, null::text as province,
         case when c.code_parent is not null then 'F' end as sexe,
         a.cible, a.realise
    from cadre_resultats c
   cross join lateral (values
      (2023, c.prevu_2023, c.realise_2023), (2024, c.prevu_2024, c.realise_2024),
      (2025, c.prevu_2025, c.realise_2025), (2026, c.prevu_2026, c.realise_2026),
      (2027, c.prevu_2027, c.realise_2027)
   ) as a(annee, cible, realise)
   where a.cible is not null or a.realise is not null`;

/**
 * Avant la migration 0006, code_parent n'existe pas : les lignes « — Femmes »
 * sont alors identifiees par leur libelle, comme le faisait le classeur.
 */
// replace() prend ici des fonctions et non des chaines : une chaine de
// remplacement contenant `$'` serait interpretee par JavaScript comme « tout ce
// qui suit la correspondance », ce qui corrompt le SQL.
const SOURCE_COLONNES_SANS_PARENT = SOURCE_COLONNES
  .replace(/coalesce\(c\.code_parent, c\.code\)/,
    () => `case when c.libelle_court ilike '%Femmes' then regexp_replace(c.code, '[.]2$', '.1') else c.code end`)
  .replace(/case when c\.code_parent is not null then 'F' end/,
    () => `case when c.libelle_court ilike '%Femmes' then 'F' end`);

async function existe(table: string): Promise<boolean> {
  const [rows] = await getDbPool().query<Array<{ n: number }>>(
    `select count(*)::int as n from information_schema.tables where table_schema='public' and table_name = ?`, [table]);
  return Number(rows[0]?.n ?? 0) > 0;
}

async function colonneExiste(table: string, colonne: string): Promise<boolean> {
  const [rows] = await getDbPool().query<Array<{ n: number }>>(
    `select count(*)::int as n from information_schema.columns where table_schema='public' and table_name = ? and column_name = ?`,
    [table, colonne]);
  return Number(rows[0]?.n ?? 0) > 0;
}

async function main() {
  const surCadreValeur = await existe('cadre_valeur');
  const source = surCadreValeur
    ? SOURCE_CADRE_VALEUR
    : (await colonneExiste('cadre_resultats', 'code_parent') ? SOURCE_COLONNES : SOURCE_COLONNES_SANS_PARENT);

  console.log(`Source : ${surCadreValeur ? 'cadre_valeur' : 'colonnes de cadre_resultats'}\n`);

  const anomalies: Anomalie[] = [];
  const pool = getDbPool();

  // --- Regle 1 : un sous-total femmes ne peut pas depasser son total ---------
  const [depassements] = await pool.query<Array<Record<string, unknown>>>(`
    with v as (${source})
    select t.code_cadre, t.annee, t.realise as total, f.realise as femmes
      from v t join v f on f.code_cadre = t.code_cadre and f.annee = t.annee
                       and f.sexe = 'F' and t.sexe is null
                       and coalesce(f.province,'') = coalesce(t.province,'')
     where t.realise is not null and f.realise is not null and f.realise > t.realise
     order by t.code_cadre, t.annee`);
  for (const d of depassements) {
    anomalies.push({ regle: 'sous-total femmes > total', gravite: 'bloquant',
      detail: `${d.code_cadre} ${d.annee} : femmes ${d.femmes} > total ${d.total}` });
  }

  // --- Regle 2 : un sous-total strictement egal au total est une recopie -----
  // 100 % de femmes n'est pas impossible en theorie, mais sur un indicateur de
  // beneficiaires c'est le symptome classique du copier-coller de tableur.
  const [egaux] = await pool.query<Array<Record<string, unknown>>>(`
    with v as (${source})
    select t.code_cadre, t.annee, t.realise
      from v t join v f on f.code_cadre = t.code_cadre and f.annee = t.annee
                       and f.sexe = 'F' and t.sexe is null
                       and coalesce(f.province,'') = coalesce(t.province,'')
     where t.realise is not null and f.realise is not null and t.realise = f.realise
       and t.realise <> 0
     order by t.code_cadre, t.annee`);
  for (const e of egaux) {
    anomalies.push({ regle: 'sous-total femmes = total (recopie probable)', gravite: 'bloquant',
      detail: `${e.code_cadre} ${e.annee} : les deux valent ${e.realise} — le systeme annonce 100 % de femmes` });
  }

  // --- Regle 3 : cible femmes egale a la cible totale ------------------------
  const [ciblesEgales] = await pool.query<Array<Record<string, unknown>>>(`
    with v as (${source})
    select t.code_cadre, t.annee, t.cible
      from v t join v f on f.code_cadre = t.code_cadre and f.annee = t.annee
                       and f.sexe = 'F' and t.sexe is null
                       and coalesce(f.province,'') = coalesce(t.province,'')
     where t.cible is not null and f.cible is not null and t.cible = f.cible and t.cible <> 0
     order by t.code_cadre, t.annee`);
  for (const c of ciblesEgales) {
    anomalies.push({ regle: 'cible femmes = cible totale', gravite: 'a_verifier',
      detail: `${c.code_cadre} ${c.annee} : cible ${c.cible} pour les deux — ailleurs la cible femmes vaut la moitie` });
  }

  // --- Regle 4 : realise tres au-dessus de la cible sur une annee close ------
  const [depassees] = await pool.query<Array<Record<string, unknown>>>(`
    with v as (${source})
    select code_cadre, annee, cible, realise, sexe
      from v
     where annee <= 2025 and cible is not null and realise is not null
       and cible > 0 and realise > cible * 1.5
     order by code_cadre, annee`);
  for (const d of depassees) {
    const pct = Math.round((Number(d.realise) / Number(d.cible) - 1) * 100);
    anomalies.push({ regle: 'realise depasse la cible de plus de 50 %', gravite: 'a_verifier',
      detail: `${d.code_cadre} ${d.annee}${d.sexe ? ` (${d.sexe})` : ''} : ${d.realise} pour une cible de ${d.cible} (+${pct} %)` });
  }

  // --- Regle 5 : final_prevu doit refleter la cible 2027 ---------------------
  const [finals] = await pool.query<Array<Record<string, unknown>>>(`
    select code, final_prevu, prevu_2027 from cadre_resultats
     where final_prevu is not null and prevu_2027 is not null and final_prevu <> prevu_2027`);
  for (const f of finals) {
    anomalies.push({ regle: 'final_prevu different de prevu_2027', gravite: 'a_verifier',
      detail: `${f.code} : final ${f.final_prevu} vs 2027 ${f.prevu_2027} — deux chiffres pour la cible de fin de projet` });
  }

  // --- Regle 6 : une cible provinciale egale a la cible nationale ------------
  if (surCadreValeur) {
    const [provinciales] = await pool.query<Array<Record<string, unknown>>>(`
      with v as (${source})
      select p.code_cadre, p.annee, p.province, p.cible
        from v p join v n on n.code_cadre = p.code_cadre and n.annee = p.annee
                         and n.province is null and coalesce(n.sexe,'-') = coalesce(p.sexe,'-')
       where p.province is not null and p.cible is not null and n.cible is not null and p.cible = n.cible
       order by p.code_cadre, p.annee`);
    for (const p of provinciales) {
      anomalies.push({ regle: 'cible provinciale = cible nationale', gravite: 'a_verifier',
        detail: `${p.code_cadre} ${p.annee} ${p.province} : ${p.cible}, identique au national — cible nationale rangee sous une province ?` });
    }
  }

  // --- Completude ------------------------------------------------------------
  const [completude] = await pool.query<Array<Record<string, unknown>>>(`
    with v as (${source})
    select annee, count(*) filter (where realise is not null)::int as renseignes, count(*)::int as total
      from v where sexe is null and province is null group by annee order by annee`);

  // --- Restitution -----------------------------------------------------------
  console.log('Completude des realisations (national, tous sexes)');
  for (const c of completude) {
    const n = Number(c.renseignes), t = Number(c.total);
    console.log(`  ${c.annee} : ${String(n).padStart(2)}/${t}  ${'#'.repeat(Math.round(n / t * 20)).padEnd(20, '.')}  ${Math.round(n / t * 100)} %`);
  }

  const bloquants = anomalies.filter((a) => a.gravite === 'bloquant');
  const aVerifier = anomalies.filter((a) => a.gravite === 'a_verifier');

  for (const [titre, liste] of [['BLOQUANT', bloquants], ['A VERIFIER', aVerifier]] as const) {
    if (!liste.length) continue;
    console.log(`\n${titre} — ${liste.length}`);
    let regleCourante = '';
    for (const a of liste) {
      if (a.regle !== regleCourante) { console.log(`\n  ${a.regle}`); regleCourante = a.regle; }
      console.log(`    ${a.detail}`);
    }
  }

  console.log(`\n${bloquants.length} anomalie(s) bloquante(s), ${aVerifier.length} a verifier.`);
  if (!anomalies.length) console.log('Aucune anomalie detectee.');
  process.exit(bloquants.length > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
