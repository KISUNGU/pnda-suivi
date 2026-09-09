-- =============================================================================
-- 0008 — Le rapport d'avancement devient la source des realisations
-- =============================================================================
--
-- Arbitrage du proprietaire du projet, 09/09/2026 :
--   1. la source qui fait foi est le RAPPORT D'AVANCEMENT (les resultats sont
--      evolutifs, c'est le dernier rapport qui vaut) ;
--   2. la desagregation par sexe d'IR1.1.6 doit exister ;
--   3. la colonne « 2027 » des fiches porte la CIBLE FINALE, pas une cible
--      annuelle ;
--   4. les valeurs 4/6/8/10 d'IR3.1.5 sont un NOMBRE DE CAS attendus, pas la
--      cible de l'indicateur ;
--   5. chaque realisation porte desormais sa date de mesure.
--
-- Source : « Rapport d'avancement », date de Mars 2026, tableau des indicateurs
-- intitule « Realise au 30 nov. 2025 ». La date de mesure retenue est donc le
-- 2025-11-30 et non la date du document.
--
-- Le rapport ne porte AUCUN code d'indicateur — recherche exhaustive sur ses
-- 499 paragraphes et 12 tableaux. La correspondance libelle -> code a ete
-- etablie a la main ; le libelle d'origine est conserve dans le commentaire de
-- chaque ligne pour que l'arbitrage reste verifiable.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Date de mesure (decision 5)
-- -----------------------------------------------------------------------------
alter table cadre_valeur add column if not exists date_mesure date;

comment on column cadre_valeur.date_mesure is
  'Date a laquelle la realisation a ete mesuree. Sans elle, deux sources qui mesurent le meme indicateur a six mois d''intervalle paraissent se contredire — c''est ce qui s''est produit entre les fiches du classeur et le rapport d''avancement.';

-- -----------------------------------------------------------------------------
-- 2. Realisations et cibles 2025 issues du rapport
-- -----------------------------------------------------------------------------

create temporary table rapport_2026_03 (
  code       text,
  sexe       char(1),
  prevu_2025 numeric,
  realise    numeric,
  cible_finale numeric,
  libelle    text
) on commit drop;

insert into rapport_2026_03 (code, sexe, prevu_2025, realise, cible_finale, libelle) values
  ('IODP1.1', null, 36, 70, 66, 'Taux de vente de produits agricoles et alimentaires par les petits exp'),
  ('IODP2.1.1', null, 130000, 75741, 300000, 'Les agriculteurs adoptent une technologie agricole améliorée (nombre)'),
  ('IODP2.1.1', 'F', 65000, 38628, 150000, 'Les agriculteurs adoptent une technologie agricole améliorée — Femmes '),
  ('IODP2.3', null, 50, 160, 100, 'Maïs'),
  ('IODP2.4', null, 0, null, 50, 'Manioc'),
  ('IODP2.5', null, 0, null, 50, 'Reduction du taux de mortalité animale au niveau des petits exploitant'),
  ('IR1.1.1.1', null, 130000, 99659, 300000, 'Agriculteurs atteints avec des actifs ou des services agricoles (CRI, '),
  ('IR1.1.1.1', 'F', 65000, 50826, 150000, 'Agriculteurs atteints avec des actifs ou des services agricoles — Femm'),
  ('IR1.1.5', null, 2, 2, 4, 'Nombre des paquets techniques AIC/AIN proposés dans la zone du projet'),
  ('IR1.1.2', null, 30, 78, 50, 'Fournisseurs d’intrants et de services agricoles proposant des technol'),
  ('IR1.1.3.1', null, 130000, 294355, 300000, 'Petits exploitants agricoles inscrits au registre national d’agriculte'),
  ('IR1.1.3.1', 'F', 65000, 149684, 150000, 'Petits exploitants agricoles inscrits au registre national d’agriculte'),
  ('IR1.1.4', null, 65000, 37871, 150000, 'Superficie sous pratiques agricoles intelligentes face au climat dans '),
  ('IR1.1.6.1', null, 180000, 99659, 600000, 'Bénéficiaires directs du projet'),
  ('IR1.1.6.1', 'F', 90000, 50826, 300000, 'Bénéficiaires directs du projet - Femmes'),
  ('IR2.1.1', null, 0, null, 200, 'Routes réhabilitées rurales et non rurales (CRI , kilomètres)'),
  ('IR2.1.2', null, 0, null, 17, 'Nombre de CLER fonctionnel'),
  ('IR2.1.3', null, 0, null, 4, 'Provinces sélectionnées soumettant des plans annuels d''entretien routi'),
  ('IR2.1.4', null, 0, null, 300, 'Superficie équipée avec l’infrastructure d’irrigation infrastructure'),
  ('IR2.2.4', null, 0, null, 50, 'PME ayant un prêt ou une marge de crédit (CRI, nombre)'),
  ('IR2.2.5', null, 130000, 99659, 300000, 'Nombre de personnes avec les polices de meso assurance (CRI, nombre)'),
  ('IR2.2.5', 'F', 65000, 50826, 150000, 'Nombre de personnes avec les polices de meso assurance - Femmes (CRI, '),
  ('IR2.2.7', null, 100, null, 300, 'Organisations ayant mis en œuvre  un plan d''affaires'),
  ('IR2.2.2', null, 400, null, 600, 'Prestataire de services financiers (AVEC) atteint avec une assistance '),
  ('IR2.2.3', null, 3000000, null, 4000000, 'Volume de prêts au moyen de lignes de crédit accordées par le programm'),
  ('IR3.1.2', null, 2, null, 2, 'Campagnes de vaccination animale dans les provinces ciblées (nombre)'),
  ('IR3.1.1', null, 100, 100, 100, 'Traitement des réclamations du Service de réparation des griefs dans l'),
  ('IR3.1.5', null, 100, 100, 100, 'Cas d’exploitation et d’abus sexuels/de harcèlement sexuel traité au s'),
  ('IR3.1.6', null, 70, null, 70, 'Les petits exploitants agricoles qui ont reçu des appuis pour l''adopti'),
  ('IODP3.1', null, 4, 2, 6, 'Plans de contingence des risques agricoles préparés et approuvés (Nomb');

-- Seuls les indicateurs presents dans cadre_resultats sont repris : le rapport
-- en liste deux (PME dirigees par des femmes, meso-assurance femmes) qui n'ont
-- pas de ligne dans le cadre charge en base.
delete from rapport_2026_03 r
 where not exists (select 1 from cadre_resultats c where c.code = r.code);

-- 2a. Mise a jour des lignes 2025 nationales existantes
update cadre_valeur v
   set cible       = r.prevu_2025,
       realise     = r.realise,
       date_mesure = date '2025-11-30',
       statut      = 'consolide',
       source      = 'Rapport d''avancement Mars 2026 — realise au 30/11/2025',
       commentaire = 'Libelle dans le rapport : ' || r.libelle,
       updated_at  = now()
  from rapport_2026_03 r
 where v.code_cadre = r.code
   and v.annee = 2025
   and v.province is null
   and v.sexe is not distinct from r.sexe;

-- 2b. Insertion des lignes absentes — dont la desagregation par sexe d'IR1.1.6,
--     qui n'avait aucune fiche dans le classeur (decision 2).
insert into cadre_valeur (code_cadre, annee, province, sexe, cible, realise, statut, source, commentaire, date_mesure)
select r.code, 2025, null, r.sexe, r.prevu_2025, r.realise, 'consolide',
       'Rapport d''avancement Mars 2026 — realise au 30/11/2025',
       'Libelle dans le rapport : ' || r.libelle,
       date '2025-11-30'
  from rapport_2026_03 r
 where not exists (
   select 1 from cadre_valeur v
    where v.code_cadre = r.code and v.annee = 2025 and v.province is null
      and v.sexe is not distinct from r.sexe);

-- -----------------------------------------------------------------------------
-- 3. Cible finale (decision 3)
-- -----------------------------------------------------------------------------
-- La cible finale du rapport fait foi.
update cadre_resultats c
   set final_prevu = r.cible_finale, updated_at = now()
  from rapport_2026_03 r
 where c.code = r.code and r.sexe is null and r.cible_finale is not null;

-- La colonne « 2027 » des fiches portait la cible finale cumulee et non une
-- cible annuelle : 270 000 (Kwilu) + 150 000 (Kasai) + 180 000 (Kasai Central)
-- = 600 000, soit la cible de fin de projet d'IR1.1.6. Les lignes 2027 qui
-- reproduisent la cible finale sont donc supprimees plutot que corrigees : la
-- vraie cible annuelle 2027 n'est connue d'aucune des sources qui font foi, et
-- une valeur absente vaut mieux qu'une valeur fausse.
delete from cadre_valeur v
 using cadre_resultats c
 where v.annee = 2027
   and v.province is null
   and c.code = v.code_cadre
   and c.final_prevu is not null
   and v.cible = c.final_prevu;

-- Les cibles provinciales 2027 relevent du meme defaut de lecture.
delete from cadre_valeur
 where annee = 2027
   and province is not null
   and source like 'Reprise 0006%';

-- -----------------------------------------------------------------------------
-- 4. IR3.1.5 — cas EAS/HS (decision 4)
-- -----------------------------------------------------------------------------
-- L'indicateur est un taux de traitement : sa cible est 100 %, confirmee par le
-- rapport. Les valeurs 4, 6, 8 et 10 de la fiche sont un nombre de cas attendus
-- — le denominateur du taux — et non la cible. Elles etaient importees comme
-- cibles annuelles, d'ou un « realise 100 pour une cible de 4 ».
update cadre_valeur
   set cible = 100,
       commentaire = coalesce(commentaire || ' — ', '') ||
         'Cible ramenee a 100 % (taux de traitement). La valeur precedente etait le nombre de cas attendus de la fiche, non la cible.'
 where code_cadre = 'IR3.1.5' and province is null and cible is not null and cible < 100;

update cadre_resultats
   set commentaires = coalesce(commentaires || ' | ', '') ||
       'Cibles annuelles 4/6/8/10 de la fiche = nombre de cas EAS/HS attendus, pas la cible. La cible de l''indicateur est 100 % de traitement.'
 where code = 'IR3.1.5';

commit;