-- ===========================================================================
-- 0004 — Cadre de résultats v6 REFORMULÉ (codes réels du classeur du 21/08/2026)
--        + Suivi du PTBA 2026 (classeur "SUIVI DU PTBA 2026")
--
-- Généré depuis les feuilles "Cadre Rés REV" et "Feuil1" des classeurs sources.
--   1. cadre_resultats : colonne libelle_court + reconstruction des 36
--      indicateurs avec les codes réels (IODP1.1 … IR3.1.6), cibles et
--      réalisations 2023-2027, cibles finales et réalisé total.
--   2. Remap des références de codes (cadre_cibles_provinciales,
--      calculateur_historique).
--   3. Table ptba_activites + chargement des 109 activités du PTBA 2026.
-- ===========================================================================
begin;

alter table public.cadre_resultats
  add column if not exists libelle_court varchar(255) not null default '';

delete from public.cadre_resultats;

insert into public.cadre_resultats (
  id, code, libelle_court, nom, composante, sous_composante, est_odp,
  reference_value, unite, frequence, source_donnees, methodologie_collecte, responsable,
  prevu_2023, prevu_2024, prevu_2025, prevu_2026, prevu_2027,
  realise_2023, realise_2024, realise_2025, realise_2026, realise_2027,
  final_prevu, final_realise
) values
  (1, 'IODP1.1', 'Ventes des petits exploitants', 'Ventes de produits agricoles et alimentaires par les petits exploitants', 'ODP', 'Améliorer l''accès au marché des petits exploitants dans les zones du projet', true, '26', '%', 'Annuelle', 'Rapport Opérateur Technique', 'Enquêtes (aléatoires) sur la production des bénéficiaires qui ont reçu une subvention', 'UNCP', 0, 5, 10, 36, 30, null, 0, 0, 70, null, 66, null),
  (2, 'IODP2.1.1', 'Adoption de technologies améliorées', 'Les agriculteurs adoptent une technologie agricole améliorée (CRI, nombre)', 'ODP', 'Augmenter la productivité agricole des petits exploitants agricoles dans les zones du projet', true, '0', 'Nombre', 'Annuelle', 'Rapport Opérateur Technique', 'Système d''information sur les bénéficiaires', 'UNCP', 0, 6000, 36000, 30000, 18000, null, 9160, 36026, null, null, 300000, 0),
  (3, 'IODP2.1.2', 'Adoption de technologies améliorées — Femmes', 'Les agriculteurs adoptent une technologie agricole améliorée — Femmes (CRI, nombre)', 'ODP', 'Augmenter la productivité agricole des petits exploitants agricoles dans les zones du projet', true, '0', 'Nombre', 'Annuelle', 'Rapport Opérateur Technique', 'Système d''information sur les bénéficiaires', 'UNCP', 0, 6000, 36000, 30000, 18000, null, 5527, 22697, null, null, 150000, 0),
  (4, 'IODP2.3', 'Rendement du maïs (pratiques AIC)', 'Augmentation du rendement de maïs à travers l’incorporation de pratiques/technologies intelligentes face au climat', 'ODP', 'Augmenter la productivité agricole des petits exploitants agricoles dans les zones du projet', true, '0.5', '%', 'Annuelle', 'Rapport Opérateur Technique', 'Enquête sur les bénéficiaires', 'UNCP', 0, 30, 60, 80, 100, null, 20, 50, 0, null, 80, null),
  (5, 'IODP2.4', 'Rendement du manioc (pratiques AIC)', 'Augmentation du rendement de manioc à travers l’incorporation de pratiques/technologies intelligentes face au climat', 'ODP', 'Augmenter la productivité agricole des petits exploitants agricoles dans les zones du projet', true, '0', '%', 'Annuelle', 'Rapport Opérateur Technique', 'Enquête sur les bénéficiaires', 'UNCP', 0, 0, 25, 40, 50, null, 0, null, 0, null, 40, null),
  (6, 'IODP2.5', 'Mortalité animale (réduction)', 'Reduction du taux de mortalité animale au niveau  des petits exploitants cibles', 'ODP', 'Augmenter la productivité agricole des petits exploitants agricoles dans les zones du projet', true, '0', '%', 'Annuelle', 'Rapport Opérateur Technique', 'Enquête sur les bénéficiaires', 'UNCP', 0, 20, 30, 40, 50, null, 0, null, null, null, 40, null),
  (7, 'IODP3.1', 'Plans de contingence approuvés', 'Plans de contingence pour les risques liés au secteur agricole (y compris le COVID-19) (nombre)', 'ODP', 'Renforcer la capacité du secteur public dans la réponse aux urgences agricoles éligibles', true, '0', 'Nombre', 'Annuelle', 'Rapport du Programme', 'Rapport d''activités du Programme', 'UNCP', 2, 2, 2, 2, 2, 1, null, null, null, null, 6, 0),
  (8, 'IR1.1.1.1', 'Agriculteurs atteints (actifs ou services)', 'Agriculteurs atteints avec des actifs ou des services agricoles (CRI, nombre)', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '0', 'Nombre', 'Semestrielle', 'Rapport Opérateur Technique', 'Données collectées par l''OT sur bénéficiaires de subvention qui ont reçu au moins la première tranche', 'UNCP', 0, 6000, 36000, 30000, 18000, null, 9160, 36026, null, null, 300000, 63186),
  (9, 'IR1.1.1.2', 'Agriculteurs atteints — Femmes', 'Agriculteurs atteints avec des actifs ou des services agricoles — Femmes (CRI, nombre)', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '0', 'Nombre', 'Semestrielle', 'Rapport Opérateur Technique', 'Données collectées par l''OT sur bénéficiaires de subvention qui ont reçu au moins la première tranche', 'UNCP', 0, 3000, 18000, 15000, 9000, null, 5527, 22697, null, null, 150000, 37224),
  (10, 'IR1.1.2', 'Fournisseurs d’intrants proposant l’AIC/AIN', 'Fournisseurs d’intrants et de services agricoles proposant des technologies agricoles intelligente face au climat et/ou nutrition (nombre)', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '4', 'Nombre', 'Semestrielle', 'Rapport Opérateur Technique', 'Données collectées par l’OT sur les prestataires prives d''intrants et services qui sont sur le registre de subvention du PNDA', 'UNCP', 4, 8, 10, 15, 20, 4, 16, 29, null, null, 25, 69),
  (11, 'IR1.1.3.1', 'Exploitants inscrits au RNA', 'Petits exploitants agricoles inscrits au registre national d’agriculteurs (RNA) (nombre)', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '0', 'Nombre', 'Semestrielle', 'Registre National des Agriculteurs (RNA)', 'Système d''information sur les bénéficiaires', 'UNCP', 0, 6000, 36000, 30000, 18000, 0, 9675, 65615, null, null, 300000, 93290),
  (12, 'IR1.1.3.2', 'Exploitants inscrits au RNA — Femmes', 'Petits exploitants agricoles inscrits au registre national d’agriculteurs (RNA) - Femmes (nombre)', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '', 'Nombre', 'Semestrielle', 'Registre National des Agriculteurs (RNA)', 'Système d''information sur les bénéficiaires', 'UNCP', 0, 3000, 18000, 15000, 9000, 0, 5620, 40026, null, null, 150000, 54646),
  (13, 'IR1.1.4', 'Superficie sous pratiques AIC', 'Superficie sous pratiques agricoles intelligentes face au climat dans les provinces ciblées (hectare)', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '0', 'Ha', 'Annuelle', 'Registre National des Agriculteurs', 'RNA', 'UNCP', 0, 3000, 18000, 15000, 9000, 0, 4580, 18013, null, null, 150000, 31593),
  (14, 'IR1.1.5', 'Paquets techniques AIC/AIN proposés', 'Paquets techniques AIC/AIN proposés dans la zone du projet', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '0', 'Nombre', 'À chaque campagne', 'Bases des opérateurs techniques ; rapports de l''INERA ; suivi des UPE ; catalogue national des paquets techniques.', null, 'Opérateurs techniques, INERA, DANTIC et UPE pour la collecte ; UNCP / Unité S&E pour la consolidation.', null, null, null, null, null, null, null, null, null, null, 4, 0),
  (15, 'IR1.1.6.1', 'Bénéficiaires directs du projet', 'Bénéficiaires directs du projet', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '0', 'Nombre', 'Trimestrielle / annuelle', 'RNA/Rapport OT/Rapport OVDA/Rapport BCC/Rapport EQUITY/Rapports des prestataires', null, 'UNCP', null, 6000, 36000, 30000, 18000, null, 9160, 36026, null, null, 600000, 63186),
  (16, 'IR1.1.6.2', 'Bénéficiaires directs — Femmes', 'Bénéficiaires directs du projet - Femmes', 'Composante 1', 'Sous-composante 1.1 : Appui aux petits exploitants', false, '', 'Nombre', 'Trimestrielle / annuelle', 'RNA/Rapport OT/Rapport OVDA/Rapport BCC/Rapport EQUITY/Rapports des prestataires', null, 'UNCP', null, 3000, 18000, 15000, 9000, null, 5527, 22697, null, null, 300000, 37224),
  (17, 'IR2.1.1', 'Routes agricoles réhabilitées', 'Routes réhabilitées (CRI , kilomètres)', 'Composante 2', 'Sous-composante 2.1 : Infrastructures rurales', false, '0', 'Km', 'Annuelle', 'Rapport OVDA', 'Système d''information de l''OVDA', 'OVDA/UNCP', 0, 0, 60, 360, 300, null, 0, 0, null, null, 400, 0),
  (18, 'IR2.1.2', 'CLER fonctionnels', 'Nombre de CLER fonctionnel', 'Composante 2', 'Sous-composante 2.1 : Infrastructures rurales', false, '0', 'Nombre', 'Annuelle', 'Rapport OVDA', 'Système d''information de l''OVDA', 'OVDA/UNCP', 0, 0, 8, 15, 22, null, 0, 0, null, null, 16, 0),
  (19, 'IR2.1.3', 'Provinces soumettant un plan FONER', 'Provinces ciblées ayant soumis leur plan annuel d’entretien routier au FONER (nombre)', 'Composante 2', 'Sous-composante 2.1 : Infrastructures rurales', false, '0', 'Nombre', 'Trimestrielle / annuelle', 'Rapport OVDA', null, 'UNCP', null, null, null, null, null, null, null, null, null, null, 4, null),
  (20, 'IR2.1.4', 'Superficie équipée en irrigation', 'Superficie équipée en infrastructure d''irrigation', 'Composante 2', 'Sous-composante 2.1 : Infrastructures rurales', false, '0', 'Ha', 'Trimestrielle / annuelle', '', null, 'UNCP', null, null, null, null, null, null, null, null, null, null, 300, 0),
  (21, 'IR2.2.1.1', 'Bénéficiaires des services financiers', 'Bénéficiaires atteints par les services financiers (CRI, nombre)', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', 'Nombre', 'Semestrielle', 'Rapport BCC', 'Comptes de BCC et UNCP', 'Gestionnaire du BCC/UNCP', 0, 6000, 36000, 30000, 18000, null, 0, 0, null, null, 300000, 0),
  (22, 'IR2.2.1.2', 'Bénéficiaires des services financiers — Femmes', 'Bénéficiaires atteints par les services financiers - Femmes (CRI, nombre)', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '', 'Nombre', 'Semestrielle', 'Rapport BCC', 'Comptes de BCC et UNCP', 'Gestionnaire du BCC/UNCP', null, 3000, 18000, 15000, 9000, null, 0, 0, null, null, 150000, 0),
  (23, 'IR2.2.2', 'AVEC appuyées techniquement', 'Prestataire de services financiers (AVEC) atteint avec une assistance technique', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', 'Nombre', 'Annuel', 'Rapport Opérateur Technique', 'Données collectées par l’Opérateur techniques sur les agriculteurs bénéficiaires', 'UNCP', 0, 0, 180, 180, 180, null, 95, 890, null, null, 600, 0),
  (24, 'IR2.2.3', 'Volume de prêts sur ligne de crédit', 'Volume de prêts au moyen de lignes de crédit accordées par le programme aux provinces ciblées (montant USD)', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', 'Montant', 'Annuel', 'Rapport BCC sur la ligne de crédit', 'BCC Système de gestion des crédits aux IFP', 'BCC/UNCP', 0, 0, 1200000, 900000, 1200000, null, 0, 0, null, null, 4000000, 0),
  (25, 'IR2.2.4.1', 'PME ayant un prêt ou une marge de crédit', 'Nombre de PME ayant un prêt ou une marge de crédit (CRI, nombre)', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', 'Nombre', 'Annuelle', 'Rapport du FGC', 'Compte du FGC', 'Gestionnaire du FGC', 0, 10, 30, 70, 100, null, 0, 0, null, null, 50, 0),
  (26, 'IR2.2.4.2', 'PME dirigées par des femmes (part)', 'Nombre de PME ayant un prêt ou une marge de crédit — % dirigé par des femmes', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', '%', 'Annuelle', 'Rapport du FGC', 'Compte du FGC', 'Gestionnaire du FGC', null, null, null, null, null, null, null, null, null, null, 50, 0),
  (27, 'IR2.2.5.1', 'Personnes couvertes en méso-assurance', 'Nombre de personnes avec les polices de meso assurance (CRI, nombre)', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', 'Nombre', 'Annuelle', 'Rapport Opérateur Technique', 'Données collectées par l''Opérateur technique sur les bénéficiaires de micro assurance', 'UNCP', 0, 6000, 36000, 30000, 18000, null, 0, 37645, null, null, 300000, 0),
  (28, 'IR2.2.5.2', 'Personnes couvertes en méso-assurance — Femmes', 'Nombre de personnes avec les polices de meso assurance — Femmes (CRI, nombre)', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', 'Nombre', 'Annuelle', 'Rapport Opérateur Technique', 'Données collectées par l’Opérateur technique sur les bénéficiaires de micro assurance', 'UNCP', null, null, null, null, null, null, null, null, null, null, 150000, 0),
  (29, 'IR2.2.6', 'Bénéficiaires formés en éducation financière', 'Bénéficiaires ayant reçu une éducation financière (nombre)', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '0', 'Nombre', 'Semestrielle / annuelle', '', null, '', null, null, null, null, null, null, null, null, null, null, 100000, 0),
  (30, 'IR2.2.7', 'Plans d’affaires mis en œuvre', 'Plans d''affaires mis en œuvre par les agromultiplicateurs et organisations d''agriculteurs', 'Composante 2', 'Sous-composante 2.2 : Accès des petits exploitants au marché', false, '', 'Nombre', 'Trimestrielle / semestrielle', 'Rapport de l''OT', null, 'UNCP', null, 50, 100, 200, 300, null, 0, 0, null, null, 200, 0),
  (31, 'IR3.1.1', 'Réclamations GRM traitées dans les délais', 'Traitement des réclamations du Service de réparation des griefs dans les délais requis (GRM ) (%)', 'Composante 3', 'Sous-composante 3.1 : Renforcement des capacités pour la fourniture de services publics agricoles', false, '0', '%', 'Annuelle', 'Rapport RNA', 'Système d''information du RNA', 'RNA/UNCP', 0, 100, 100, 100, 100, null, 100, 100, null, null, 100, 0),
  (32, 'IR3.1.2', 'Campagnes de vaccination animale', 'Campagnes de vaccination animale dans les provinces ciblées (nombre)', 'Composante 3', 'Sous-composante 3.1 : Renforcement des capacités pour la fourniture de services publics agricoles', false, '0', 'Nombre', 'Trimestrielle / annuelle', 'Rapport de VSF', null, 'UNCP', 0, 0, 1, 2, 1, null, 0, 0, null, null, 2, 0),
  (33, 'IR3.1.3', 'Programmes de R&D sur l’AIC et l’AIN', 'Programmes de R&D agricole sur l’AIC et l’AIN (nombre)', 'Composante 3', 'Sous-composante 3.1 : Renforcement des capacités pour la fourniture de services publics agricoles', false, '0', 'Nombre', 'Annuelle', 'Rapports Opérateur Technique', 'Rapport Direction de la Sante Animale du Ministère de l''Agriculture', 'UNCP', 0, 3, 8, 18, 28, null, 0, 0, null, null, 7, 0),
  (34, 'IR3.1.4', 'Opérationnalisation du RNA', 'Opérationnalisation du registre national d’agriculteurs (Oui/Non)', 'Composante 3', 'Sous-composante 3.1 : Renforcement des capacités pour la fourniture de services publics agricoles', false, 'Non', 'Oui/Non', 'Annuelle', 'Rapports Opérateur Technique et INERA', 'Rapport INERA et visite sur le terrain par l''OT', 'INERA/UNCP', 1, 1, 1, 1, 1, 1, 1, 1, null, null, 1, 0),
  (35, 'IR3.1.5', 'Cas EAS/HS traités', 'Cas d’exploitation et d’abus sexuels/de harcèlement sexuel traité au service (%)', 'Composante 3', 'Sous-composante 3.1 : Renforcement des capacités pour la fourniture de services publics agricoles', false, '0', '%', 'Semestrielle', 'Rapports OT/UNCP/UPEP sur les GRM', 'GRM Système d''information', 'OT/UNCP/UPEP', 100, 100, 100, 100, 100, null, 100, 100, null, null, 100, 0),
  (36, 'IR3.1.6', 'Satisfaction des exploitants appuyés', 'Part des exploitants appuyés se déclarant satisfaits des paquets techniques reçus (%)', 'Composante 3', 'Sous-composante 3.1 : Renforcement des capacités pour la fourniture de services publics agricoles', false, '0', '%', 'Annuelle', 'Rapports OT/UNCP/UPEP sur les GRM', 'Données collectées par l''OT/UNCP/UPEP', 'OT/UNCP/UPEP', 0, 70, 70, 70, 70, null, 0, 0, null, null, 70, 0);

-- Cibles provinciales : anciens codes internes -> codes réels du classeur
update public.cadre_cibles_provinciales set code_cadre = case code_cadre
  when 'ODP-1' then 'IODP1.1'
  when 'ODP-2' then 'IODP2.1.1'
  when 'ODP-7' then 'IR1.1.6.1'
  when 'ODP-7F' then 'IR1.1.6.2'
  else code_cadre end;

-- Historique du calculateur : anciens codes alias -> codes réels
update public.calculateur_historique set indicateur_code = case indicateur_code
  when 'ODP-1' then 'IODP1.1' when 'ODP-2' then 'IODP2.1.1' when 'ODP-2F' then 'IODP2.1.2'
  when 'ODP-3' then 'IODP2.3' when 'ODP-4' then 'IODP2.4' when 'ODP-5' then 'IODP2.5'
  when 'ODP-6' then 'IR2.1.3' when 'ODP-7' then 'IR1.1.6.1' when 'ODP-7F' then 'IR1.1.6.2'
  when 'IODP2.1' then 'IODP2.1.1' when 'IODP2.2' then 'IODP2.1.2' when 'IODP2.6' then 'IODP2.5'
  when 'IODP3.2' then 'IR2.1.3' when 'IODP3.3' then 'IR1.1.6.1' when 'IODP3.4' then 'IR1.1.6.2'
  when 'IR-1.1.1' then 'IR1.1.1.1' when 'IR-1.1.1F' then 'IR1.1.1.2' when 'IR-1.1.2' then 'IR1.1.2'
  when 'IR-1.1.3' then 'IR1.1.3.1' when 'IR-1.1.3F' then 'IR1.1.3.2' when 'IR-1.1.4' then 'IR1.1.4'
  when 'IR-1.1.5' then 'IR1.1.5'
  when 'IR1.1.1' then 'IR1.1.1.1' when 'IR1.1.2' then 'IR1.1.1.2' when 'IR1.1.3' then 'IR1.1.2'
  when 'IR1.1.4' then 'IR1.1.3.1' when 'IR1.1.5' then 'IR1.1.3.2' when 'IR1.1.6' then 'IR1.1.4'
  when 'IR-2.1.1' then 'IR2.1.1' when 'IR-2.1.2' then 'IR2.1.2' when 'IR-2.1.3' then 'IR2.1.3' when 'IR-2.1.4' then 'IR2.1.4'
  when 'IR2.1.4' then 'IR2.1.2' when 'IR2.1.5' then 'IR2.1.3' when 'IR2.1.6' then 'IR2.1.4'
  when 'IR-2.2.1' then 'IR2.2.4.1' when 'IR-2.2.1F' then 'IR2.2.4.2' when 'IR-2.2.2' then 'IR2.2.5.1'
  when 'IR-2.2.2F' then 'IR2.2.5.2' when 'IR-2.2.3' then 'IR2.2.7' when 'IR-2.2.4' then 'IR2.2.3'
  when 'IR-2.2.5' then 'IR2.2.1.1' when 'IR-2.2.5F' then 'IR2.2.1.2' when 'IR-2.2.6' then 'IR2.2.6'
  when 'IR2.2.1' then 'IR2.2.4.1' when 'IR2.2.2' then 'IR2.2.4.2' when 'IR2.2.7' then 'IR2.2.5.1'
  when 'IR2.2.8' then 'IR2.2.5.2'
  when 'IR-3.1.1' then 'IR3.1.2' when 'IR-3.1.2' then 'IR3.1.1' when 'IR-3.1.3' then 'IR3.1.5'
  when 'IR-3.1.4' then 'IR3.1.3' when 'IR-3.1.5' then 'IR3.1.4' when 'IR-3.1.6' then 'IR3.1.6'
  when 'IR3.1.4' then 'IR3.1.1' when 'IR3.1.7' then 'IR3.1.6'
  when 'IR-4.1' then 'IODP3.1' when 'IR4.1' then 'IODP3.1'
  else indicateur_code end;

-- ---------------------------------------------------------------------------
-- Suivi du PTBA (Plan de Travail et Budget Annuel)
-- ---------------------------------------------------------------------------
create table if not exists public.ptba_activites (
  id integer generated always as identity primary key,
  annee integer not null default 2026,
  ordre integer not null,
  composante varchar(100) not null,
  sous_composante varchar(255) not null,
  code varchar(20),
  activite text not null,
  indicateur_realisation varchar(255),
  prevu numeric(18,2),
  realise numeric(18,2),
  commentaire text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ptba_activites_idx_annee on public.ptba_activites (annee);
alter table public.ptba_activites enable row level security;

drop trigger if exists trg_ptba_activites_updated_at on public.ptba_activites;
create trigger trg_ptba_activites_updated_at before update on public.ptba_activites
  for each row execute function set_updated_at();

delete from public.ptba_activites where annee = 2026;

insert into public.ptba_activites (
  annee, ordre, composante, sous_composante, code, activite, indicateur_realisation, prevu, realise, commentaire
) values
  (2026, 1, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.01', 'Recrutement des Opérateurs techniques (O.T.) LT Kwilu', 'OT recruté', 1, 1, null),
  (2026, 2, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.02', 'Recrutement des Opérateurs techniques (O.T.) LT Kasaï', 'OT recruté', 1, 1, null),
  (2026, 3, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.03', 'Recrutement des Opérateurs techniques (O.T.) LT Kasaï Central', 'OT recruté', 1, 1, null),
  (2026, 4, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.04', 'Recrutement des Opérateurs techniques (O.T.) LT Kongo Central', 'OT recruté', 1, 0, null),
  (2026, 5, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.05', 'Opérateur pour enregistrement PEA Kongo Central', 'OT', 1, 1, null),
  (2026, 6, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.06', 'Recrutement de VSF-B pour le volet élevage (3 provinces)', 'VSF recruté', 1, 1, null),
  (2026, 7, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.07', 'Opérateur Technique Avenant pilote', null, 3, 3, null),
  (2026, 8, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.08', 'Production des outils de vulgarisation et traduction en langues locales (Tshiluba et Kikongo)', 'Outils produits', 1, 1, null),
  (2026, 9, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.09', 'Production des bulletins des prix (OBSECO)', 'Bulletins de prix', 12, 0, 'SNV TDR CHEZ PAPA LAZARE'),
  (2026, 10, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.10', 'Superviser des activités', 'Nbre mission', 4, 2, null),
  (2026, 11, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.11', 'Suivre enregistrement PEA dans le RNA (contrat FAO)', 'Nombre de missions effectuées', 4, 2, null),
  (2026, 12, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.12', 'Prendre en charge le comité DANTIC lors de la formation des AC à l''outil IDEA', 'Nombre de missions effectuées', 3, 1, null),
  (2026, 13, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.13', 'Aménager les sites hydro agricoles   Tanganyika', 'Contrat signé', 1, 1, null),
  (2026, 14, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.14', 'Retrait des boutures des maniocs a l''INERA-Ngandajika (Transports, mains d''ouvre pour la coupe, achats sac etc.)', 'Bouture disponible KML', 154, 154, null),
  (2026, 15, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.15', 'Mission de contrôle et vérification des champs semenciers de base (INERA), R1 et R2 (Agri-multiplicateurs) des partenaires au PNDA', 'Nbre mission', 4, 2, null),
  (2026, 16, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.16', 'Mettre en place les champs expérimentaux Riz dans le Kwilu', 'Nbre de champs', 2, 0, 'Les TDR transmis pour examens'),
  (2026, 17, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.17', 'Actualisation CGES, PGPP', 'CGES,PGPP actualisé', 2, 2, 'TDR disponible il faut mettre l''activité dans le STEP'),
  (2026, 18, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.18', 'Actualisation CPPA et PMPP', 'CPPA et PMPP actualisé', 2, 2, null),
  (2026, 19, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.19', 'Actualisation PGMO , CPR ,', 'PGMO , CPR , actualisé', 2, 2, null),
  (2026, 20, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.20', 'Elaboration de plan de Gestion des déchets', 'Plan elaboré', 1, 1, 'Existe'),
  (2026, 21, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.21', 'Dissémination du Plan de Gestion des déchets', 'Plan disseminé', 1, 1, null),
  (2026, 22, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.22', 'Dissémination du CGES PGPP, PMPP, CPR, MGP et plan d''Action VBG', 'Dissemination', 6, 0, 'En attente de l''ANO de la BM'),
  (2026, 23, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.23', 'Evaluation des risques VBG TSHOPO et Kongo Central', 'Mission', 2, 0, 'En attente de l''ANO de la BM'),
  (2026, 24, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.24', 'Mise en œuvre des activités MGP dans le Kongo central et Tshopo', null, 1, 0, 'En attente de l''ANO de la BM'),
  (2026, 25, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.25', 'Equipement et fournitures des CGP', 'Equipement fournis', 1, 1, 'Au niveau des provinces'),
  (2026, 26, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.26', 'Mise en œuvre des activités VBG dans le Kasaï Central, Kasaï et Kwilu', 'Mis en ouvre des activités', 4, 2, null),
  (2026, 27, 'Composante 1', 'Sous-composante 1.1 — Appui direct aux petits exploitants', '1.1.27', 'Recrutement d''un Prestataire VBG dans le Kongo Central', 'Prestataire VBG recruté', 1, 0, null),
  (2026, 28, 'Composante 1', 'Sous-composante 1.2 — Inclusion financière', '1.2.1', 'Recruter consultants Opérateur Financier (OF)', 'OF recrutés', 1, 0, 'Le processus est presqu''à la fin'),
  (2026, 29, 'Composante 1', 'Sous-composante 1.2 — Inclusion financière', '1.2.2', 'Effectuer les missions d''échange d''expérience sur l''inclusion financière', 'Nbre mission réalisés', 1, 0, 'TDR en cours d''elaboration'),
  (2026, 30, 'Composante 1', 'Sous-composante 1.2 — Inclusion financière', '1.2.4', 'Financer les plans d''affaires des AVEC,OP,MPME', 'Nombre de sous-projets appuyés', 50, 0, 'AMI en cours'),
  (2026, 31, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.1', 'Souscrire à l''assurance en faveur des petits exploitants pour les deux saisons 2026 (B et A)', 'Police d''assurances souscrites', 99659, 99659, null),
  (2026, 32, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.2', 'Recruter 8 consultants en appui à l''élaboration de 8 plan des contingences', 'Consultants recrutés', 8, 0, 'Le recrutement est en cours'),
  (2026, 33, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.3', 'Organiser 4 ateliers résidentiels pour l''amélioration et la validation de plans de contingence', 'Nbre d''ateliers', 4, 1, null),
  (2026, 34, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.4', 'Recruter par entente directe TAHMO pour acquerir et installer les stations météorologiques et organiser au niveau central et de chaque province la formation des formateurs sur l''utilisation et l''exploitation des stations météorologiques, la gestion, le traitement et l''analyse des données climatiques', 'TAHMO recruté', 1, 0, null),
  (2026, 35, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.5', 'Signer le protocole de collaboration avec la METTELSAT et appuyer l''institution METTELSAT pour l''exploitation et la maintenance des stations météorologiques ainsi que la gestion, le traitement et l''analyse des données climatiques', 'Protocole Signé', 1, 0, null),
  (2026, 36, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.6', 'Recruter une firme ou une ONG pour mener l''étude sur la cartographie des nouvelles zones méso et micro agro-climatiques et les nouveaux calendriers agricoles dynamiques aux changements climatiques dans les zones d''interventions du projet', 'Nbre d''ateliers', 4, 0, null),
  (2026, 37, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.7', 'Mettre à jour, imprimer et vulgariser le Plan de contingence climatique (y compris la cérémonie de vulgarisation avec le Ministre d''Etat)', 'Plan de contingence mis à jour', 1, 0, null),
  (2026, 38, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.8', 'Appuyer l''élaboration de la stratégie de communication spécifique à l''assurance agricole', 'Strategie elaboré', 1, 1, null),
  (2026, 39, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.9', 'Organiser des ateliers provinciaux de sensibilisation et communication sur l''assurance agricole', 'Nbbre de sessions', 3, 3, null),
  (2026, 40, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.10', 'Organiser le voyage d''études et d''échange au Kenya sur le produit d''assurance élevage', 'Mission', 1, 0, null),
  (2026, 41, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.11', 'Organiser la mission pour la validation du produit d''assurance élevage à Paris chez Axa Climate', 'Mission', 1, 0, null),
  (2026, 42, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.12', 'Organiser 2 campagnes de sensibilisation contre la chenille légionnaire d''automne', 'Session', 2, 0, null),
  (2026, 43, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.13', 'Appuyer les PEA dans la prévention contre la chenille légionaire d''automne', 'Appui  PEA', 1, 0, null),
  (2026, 44, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.14', 'Imprimer et vulgariser le Plan de contingence climatique du secteur agricole', 'Plan de contegence', 1, 1, null),
  (2026, 45, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.15', 'Organiser l''atelier de présentation et d''enterinnement institutionnel du plan de contingence climatique du secteur agricole en RDC', 'Session', 1, 0, null),
  (2026, 46, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.16', 'Atelier national de présentation et appropriation du premier produit d''assurance de l''élevage en RDC', 'Atelier', 1, 0, 'En attente de la validation du produit d''assurance elevage'),
  (2026, 47, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.17', 'Effectuer des missions de suivi des activités liées à la gestion des risques', 'Nbre de mission', 2, 2, null),
  (2026, 48, 'Composante 1', 'Sous-composante 1.3 — Gestion des risques agricoles et assurance', '1.3.18', 'Organiser des réunions et activités de la Task Force', 'Nbre de réunion', 1, 1, null),
  (2026, 49, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.1', 'Réhabiliter routes rurales et non rurales', 'Km de routes réhabilitées', 110, 0, null),
  (2026, 50, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.2', 'Mettre en œuvre le contrat sur les études techniques', 'Nbre en œuvre', 1, 1, null),
  (2026, 51, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.3', 'Construire le pont modulaire de LUBELEYI (Tanganyika)', 'Nbre le pont mo', 1, 0.5, 'Signature du contrat et la mis à disposition des fonds à l''UNOPS'),
  (2026, 52, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.4', 'Fournir un bac de 50T pour le site de Luozi', 'Nbre un bac de', 1, 0.5, 'Signature du contrat avec CHANIC et mis a disposition des fonds'),
  (2026, 53, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.5', 'Actualisation EIES route Kimpese-Kimbembe', 'Nombre de missions effectuées', 1, 1, 'TDR elabore il faut inscrire l''activité dans le STEP'),
  (2026, 54, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.6', 'Elaborations PGES Des rampes de Luozi, Djuma', 'EIES validés', 1, 1, 'ON attend la validation  du EIES'),
  (2026, 55, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.7', 'Actualisation EIES OU PGES Pont Lubeleye', 'PAR validé', 1, 1, 'TDR elaboré'),
  (2026, 56, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.8', 'Actualisation PGES ou EIES Hydro Agricole dans la plaine de Rugumba', 'PPA mis en œuvre', 1, 1, 'Tdr elabore il faut integré dans le STEP'),
  (2026, 57, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.9', 'Actualisation PAR des territoires Luebo et MWEKA', 'Nbre PAR actualisé', 1, 1, 'TDR a mettre dans le STEP'),
  (2026, 58, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.10', 'Actualisation PAR Territoire de GUNGU', 'Nbre PAR actualisé', 1, 0, 'AXE GUNGU mis en veuilleuse'),
  (2026, 59, 'Composante 2', 'Sous-composante 2.1 — Infrastructure de transport rural', '2.1.11', 'Elaboration PAR de l''axe Kimpese-Kimbembe', 'Nbre PAR elaboré', 1, 1, 'Validation de la BM'),
  (2026, 60, 'Composante 2', 'Sous-composante 2.2 — Soutien à l''inclusion des petits exploitants agricoles dans les filières', '2.1.19', 'Soutien à l''inclusion des petits exploitants agricoles dans les filières', 'Nbre des projets appuyés', 50, 0, null),
  (2026, 61, 'Composante 2', 'Sous-composante 2.2 — Soutien à l''inclusion des petits exploitants agricoles dans les filières', '2.1.20', 'Recrutement de FPM et mise en œuvre liées à la ligne de crédit', 'Nbre FPM recrutés', 1, 0, null),
  (2026, 62, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.1', 'Reconstruction du bâtiment des inspections provinciales Agri, Pêche et Elevage et DR & SG Agri, Pêche et Elevage', 'Bâtiment construit', 3, 1.5, null),
  (2026, 63, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.2', 'Reconstruction / Réhabilitation des bâtiments des SG & DEP Agri, Pêche et Elevage et DR', 'Bâtiment construit', 3, 1.5, null),
  (2026, 64, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.3', 'Elaboration des TDR des études prioritaires pour la préparation des investissements futurs du secteur de l''élevage, de la pêche et de l''aquaculture', 'TDR elaborés', 6, 6, null),
  (2026, 65, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.4', 'Formation en gestion axée sur les résultats pour les services étatiques (3 DEP)', 'Formation assurée', 1, 0, 'En attente de l''ANO'),
  (2026, 66, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.5', 'Formation sur l''Agro écologie', 'Formation assurée', 1, 0, 'TDR AU NIVEAU DE PAPA LAZARE'),
  (2026, 67, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.6', 'Elaboration des EIES des Bâtiments pour l''Inspections provinciales d''Agriculture, Pèche et Elevage et Daru et secrétariats Généraux à Kinshasa', null, 3, 3, 'Rapport de restitution pour le 3 provinces'),
  (2026, 68, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.7', 'Enquête auprès des bénéficiaires du PNDA ( 2 enquêtes)', 'Enquete', 1, 0, null),
  (2026, 69, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', null, 'Charges et Fonctionnement', 'Fonctionnement', 12, 6, null),
  (2026, 70, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.9', 'Acquérir le matériel informatique pour les Inspections + administrations (ordinateurs ; imprimantes,)', 'Materiels', 1, 0, 'Marché en cours'),
  (2026, 71, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.10', 'Renforcement des capacités pour la production de semences (One CGIAR)', 'Appui', 1, 0.5, 'Appui en cours'),
  (2026, 72, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.11', 'Acquérir les matériels /équipements agricoles pour la production des intrants (INERA)', 'Materiels', 1, 0, 'Marché en cours'),
  (2026, 73, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.12', 'Appuyer le SENASEM au contrôle et à la certification de la production semencière', 'Appui', 1, 0.5, 'Appui en cours'),
  (2026, 74, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.13', 'Appuyer INERA pour la production semence de base', 'Appui', 1, 0.5, 'Appui en cours'),
  (2026, 75, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.14', 'Appuyer le SNSA sur la collecte des statistiques agricoles dans la zone du PNDA', 'Appui', 1, 1, 'Formation sur le kobocollect'),
  (2026, 76, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.15', 'Appuyer le SENAFIC (Service National des Fertilisants et Intrants Connexes) sur le renforcement des capacités des techniciens de terrain sur la promotion des engrais biologiques', 'Appui', 1, 1, 'En cours à travesr One CGIAR'),
  (2026, 77, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.16', 'Evaluer et actualiser la stratégie sectorielle PECHE, ELEVAGE ET AQUACULTURE', 'Atelier', 1, 0, 'TDR A DEMANDER AU DIRECTEUR PIUS'),
  (2026, 78, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.17', 'Elaborer le document de politique du développement rural', 'Atelier', 1, 0, 'GASPARD'),
  (2026, 79, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.18', 'Elaborer le document de stratégie du développement rural', 'Atelier', 1, 0, null),
  (2026, 80, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.19', 'Effectuer les voyages d''études et d''échange d''expériences', 'Voyage', 3, 3, 'Avec One CGIAR'),
  (2026, 81, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.20', 'Réunions CTN, CPCS', 'Reunion', 8, 4, null),
  (2026, 82, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.21', 'Mission de suivi des activités CTN, CPCS', 'Mission', 4, 3, null),
  (2026, 83, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.22', 'Réaliser l’enquête de base IDEA CONSULT', 'Etude', 1, 1, null),
  (2026, 84, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.23', 'Actualisation PGS', 'Atelier', 1, 1, null),
  (2026, 85, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.24', 'Atelier de formation sur la sécurité routière à Kinshasa', 'Atelier', 1, 0, null),
  (2026, 86, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.25', 'Atelier de formation des staffs PNDA et services étatiques sur le CES', 'Atelier', 1, 0, null),
  (2026, 87, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.26', 'Formation sur Hygiène santé et sécurité', 'Atelier', 1, 0, null),
  (2026, 88, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.27', 'Elaboration PPA Tshopo', 'PPA', 1, 0, null),
  (2026, 89, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.28', 'Fonctionnement des CGP', 'Fonctionnement', 12, 6, null),
  (2026, 90, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.29', 'Former les Agents de l''Etat et Staff PNDA sur les VBG/EAS/HS dans les quatre provinces', 'Atelier', 1, 1, null),
  (2026, 91, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.30', 'Missions de suivi Environnemental, Social/VBG', 'Mission', 4, 2, 'En cours'),
  (2026, 92, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.31', 'Atelier de validation des fiches techniques des paquets techniques', 'Atelier', 1, 0, 'En attente de l''elaboration des TDR'),
  (2026, 93, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.32', 'Atelier de vulgarisation des normes de multiplication des géniteurs auprès des Producteurs et des PEA', 'Atelier', 1, 0, 'En attente de l''elaboration des TDR'),
  (2026, 94, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.33', 'Actualisation du Plan National d’Investissement Agricole, PNIA en PNIASAN', 'Atelier', 1, 0, 'TDR en attente de l''ANO'),
  (2026, 95, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.34', 'Elaborer la stratégie d’opérationnalisation de la Politique agricole durable, PAD', 'Atelier', 1, 0, 'En attente de l''elaboration des TDR'),
  (2026, 96, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.35', 'Elaborer la stratégie de mise en œuvre de la Revanche du sol sur le sous-sol', 'Atelier', 1, 0, 'TDR elaboré en attendte de l''ANO'),
  (2026, 97, 'Composante 3', 'Sous-composante 3.1 — Renforcement des capacités pour la prestation de services publics agricoles', '3.1.36', 'Faire le diagnostic agricole pour les nouvelles provinces PNDA', 'Mission', 1, 0, 'Apres la reunion de CPP en septembre avec la BM'),
  (2026, 98, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.1', 'Préparer la tenue comité de Pilotage et les réunions du CPS et le PTBA', 'Assurée la reunion COPIL', 1, 0, 'En septembre'),
  (2026, 99, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.2', 'Réunions du Comité Technique National CTN', 'Compte rendu de la réunion', 2, 1, 'Avant la mission de supervision'),
  (2026, 100, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.3', 'Réunions du Comité Provincial de Coordination et de Suivi', 'Compte rendu de la réunion', 6, 3, 'En cours'),
  (2026, 101, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.4', 'Organiser la réunion de diffusion du manuel de suivi et évaluation, collecte des données et format rapport à L''UNCP et UPEP', 'Rapport de l''atelier', 1, 0, 'En attente de la mis a jour du manuel de suivi et evaluation en fonction de la restructuration'),
  (2026, 102, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.5', 'Assurer l''audit financier et comptable 2025', 'Rappport de l''audit', 1, 1, null),
  (2026, 103, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.6', 'Former le personnel sur l''utilisation du logiciel de suivi et évaluation à UNCP et UPEP', '3 sessions assurées', 1, 0.3, null),
  (2026, 104, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.7', 'Organiser l''atelier des restitutions de l''étude de référence dans les provinces et à UNCP', '3 sessions assurées', 3, 3, null),
  (2026, 105, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.8', 'Supervision des activités des OT par les Coordinations provinciales SNVA', 'Mission', 1, 0, null),
  (2026, 106, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.9', 'Accompagnement des MPME impliqués dans la culture du cacao dans la province de la Tshopo', 'Appui', 1, 0, 'TDR en cours d''elaboration'),
  (2026, 107, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.10', 'Mettre en œuvre des Plans d''Action de Réinstallation (PAR)', 'Mettre en œuvre', 1, 0, null),
  (2026, 108, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.11', 'Mettre en œuvre les actions issues de la stratégie de gestion des savoirs et de communication', 'Activites', 12, 6, null),
  (2026, 109, 'Composante 3', 'Sous-composante 3.2 — Gestion du Projet et Suivi-Évaluation', '3.2.12', 'Assurer l''adhésion des groupes cibles aux activités du projet à travers les 9 radio communautaires', 'Activites', 12, 6, null);

commit;
