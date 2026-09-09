CREATE TABLE IF NOT EXISTS `activite` (
  `id_activite` int NOT NULL AUTO_INCREMENT,
  `type_activite` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code_activite` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date_debut` date NOT NULL,
  `date_fin` date DEFAULT NULL,
  `statut` enum('planifiee','en_cours','terminee','annulee') COLLATE utf8mb4_unicode_ci DEFAULT 'planifiee',
  `id_beneficiaire` int DEFAULT NULL,
  `id_localisation` int DEFAULT NULL,
  `id_utilisateur` int DEFAULT NULL,
  `cout_prevu` decimal(15,2) DEFAULT NULL,
  `cout_reel` decimal(15,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_activite`),
  UNIQUE KEY `code_activite` (`code_activite`),
  KEY `id_beneficiaire` (`id_beneficiaire`),
  KEY `id_localisation` (`id_localisation`),
  KEY `id_utilisateur` (`id_utilisateur`),
  KEY `idx_activite_date` (`date_debut`,`date_fin`),
  KEY `idx_activite_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `activites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `composante` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'planifiee',
  `priorite` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'moyenne',
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `lieu` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `territoire` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commune` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsable_contact` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `equipe` text COLLATE utf8mb4_unicode_ci,
  `participants_prevus` int NOT NULL DEFAULT '0',
  `participants_reels` int DEFAULT NULL,
  `budget_prevu` decimal(15,2) NOT NULL DEFAULT '0.00',
  `budget_reel` decimal(15,2) DEFAULT NULL,
  `objectifs` text COLLATE utf8mb4_unicode_ci,
  `resultats_attendus` text COLLATE utf8mb4_unicode_ci,
  `resultats_obtenus` text COLLATE utf8mb4_unicode_ci,
  `difficultes` text COLLATE utf8mb4_unicode_ci,
  `lecons_apprises` text COLLATE utf8mb4_unicode_ci,
  `documents` text COLLATE utf8mb4_unicode_ci,
  `photos` text COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beneficiaires_cibles` int NOT NULL DEFAULT '0',
  `beneficiaires_atteints` int NOT NULL DEFAULT '0',
  `taux_execution` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_activites_code` (`code`),
  KEY `idx_activites_type` (`type`),
  KEY `idx_activites_statut` (`statut`),
  KEY `idx_activites_province` (`province`),
  KEY `idx_activites_date_debut` (`date_debut`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agriculteurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `farmer_id` bigint DEFAULT NULL,
  `province` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `territoire` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secteur` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `groupement` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom_complet` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sexe` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `saison` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ptech` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `age` int DEFAULT NULL,
  `date_naissance` date DEFAULT NULL,
  `telephone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `situation_matrimoniale` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `niveau_instruction` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `superficie_terres` decimal(10,2) DEFAULT NULL,
  `est_chef_menage` tinyint(1) DEFAULT '0',
  `membre_deja_enregistre` tinyint(1) DEFAULT '0',
  `a_recu_carte` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmer_id` (`farmer_id`),
  KEY `idx_province` (`province`),
  KEY `idx_territoire` (`territoire`),
  KEY `idx_secteur` (`secteur`),
  KEY `idx_groupement` (`groupement`),
  KEY `idx_village` (`village`),
  KEY `idx_sexe` (`sexe`),
  KEY `idx_saison` (`saison`),
  KEY `idx_ptech` (`ptech`)
) ENGINE=InnoDB AUTO_INCREMENT=294360 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `agriculteurs_cultures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `agriculteur_id` int NOT NULL,
  `culture_id` int NOT NULL,
  `superficie_ha` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_agriculteurs_cultures_agriculteur` (`agriculteur_id`),
  KEY `idx_agriculteurs_cultures_culture` (`culture_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alerte_risque` (
  `id_alerte` int NOT NULL AUTO_INCREMENT,
  `id_risque` int NOT NULL,
  `message_alerte` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_alerte` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `est_lue` tinyint(1) DEFAULT '0',
  `destinataire` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_alerte`),
  KEY `id_risque` (`id_risque`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `beneficiaire` (
  `id_beneficiaire` int NOT NULL AUTO_INCREMENT,
  `rna_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sexe` char(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_naissance` date DEFAULT NULL,
  `telephone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_localisation` int NOT NULL,
  `type_exploitant` enum('agriculteur','eleveur','pisciculteur','mixte') COLLATE utf8mb4_unicode_ci DEFAULT 'agriculteur',
  `est_jeune` tinyint(1) DEFAULT '0',
  `est_autochtone` tinyint(1) DEFAULT NULL,
  `niveau_instruction` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `situation_matrimoniale` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_beneficiaire`),
  UNIQUE KEY `rna_id` (`rna_id`),
  KEY `idx_beneficiaire_rna` (`rna_id`),
  KEY `idx_beneficiaire_sexe` (`sexe`),
  KEY `idx_beneficiaire_localisation` (`id_localisation`)
) ;

--
-- Déclencheurs `beneficiaire`
--
DROP TRIGGER IF EXISTS `check_jeune_age`;
DELIMITER $$
CREATE TRIGGER `check_jeune_age` BEFORE INSERT ON `beneficiaire` FOR EACH ROW BEGIN
    IF NEW.est_jeune = 1 AND NEW.date_naissance IS NOT NULL THEN
        IF NEW.date_naissance < DATE_SUB(CURDATE(), INTERVAL 35 YEAR) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un jeune bénéficiaire doit avoir moins de 35 ans';
        END IF;
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `cadre_resultats`
--

DROP TABLE IF EXISTS `cadre_resultats`;
CREATE TABLE IF NOT EXISTS `cadre_resultats` (
  `id` int NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `composante` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sous_composante` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `est_odp` tinyint(1) NOT NULL DEFAULT '0',
  `reference_value` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `unite` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `frequence` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `source_donnees` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `methodologie_collecte` text COLLATE utf8mb4_unicode_ci,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `prevu_2023` decimal(18,2) DEFAULT NULL,
  `realise_2023` decimal(18,2) DEFAULT NULL,
  `prevu_2024` decimal(18,2) DEFAULT NULL,
  `realise_2024` decimal(18,2) DEFAULT NULL,
  `prevu_2025` decimal(18,2) DEFAULT NULL,
  `realise_2025` decimal(18,2) DEFAULT NULL,
  `prevu_2026` decimal(18,2) DEFAULT NULL,
  `realise_2026` decimal(18,2) DEFAULT NULL,
  `final_prevu` decimal(18,2) DEFAULT NULL,
  `final_realise` decimal(18,2) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cadre_resultats_code` (`code`),
  KEY `idx_cadre_resultats_composante` (`composante`),
  KEY `idx_cadre_resultats_est_odp` (`est_odp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `calculateur_historique` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `indicateur_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `indicateur_nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `valeur` decimal(15,2) NOT NULL,
  `unite` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `interpretation` text COLLATE utf8mb4_unicode_ci,
  `donnees` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_calculateur_historique_user` (`user_id`),
  KEY `idx_calculateur_historique_code` (`indicateur_code`),
  KEY `idx_calculateur_historique_date` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cartes_agriculteurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rna_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_carte` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut_carte` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'a_imprimer',
  `date_distribution` date DEFAULT NULL,
  `agent_distribution` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observations` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cartes_agriculteurs_rna` (`rna_id`),
  UNIQUE KEY `uq_cartes_agriculteurs_numero` (`numero_carte`),
  KEY `idx_cartes_agriculteurs_statut` (`statut_carte`),
  KEY `idx_cartes_agriculteurs_date_distribution` (`date_distribution`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cler` (
  `id_cler` int NOT NULL AUTO_INCREMENT,
  `code_cler` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_cler` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_localisation` int NOT NULL,
  `nombre_membres` int DEFAULT NULL,
  `est_fonctionnel` tinyint(1) DEFAULT '0',
  `date_creation` date DEFAULT NULL,
  `km_couverts` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_cler`),
  UNIQUE KEY `code_cler` (`code_cler`),
  KEY `id_localisation` (`id_localisation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `composante` (
  `id_composante` int NOT NULL AUTO_INCREMENT,
  `code_composante` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_composante` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordre` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_composante`),
  UNIQUE KEY `code_composante` (`code_composante`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cultures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categorie` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cultures_nom` (`nom`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `distribution_cartes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rna_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `numero_carte` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_distribution` date DEFAULT NULL,
  `agent_distribution` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` enum('distribuee','en_attente','a_imprimer') COLLATE utf8mb4_unicode_ci DEFAULT 'a_imprimer',
  `observations` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_distribution_cartes_rna` (`rna_id`),
  UNIQUE KEY `uk_distribution_cartes_numero` (`numero_carte`),
  KEY `idx_distribution_cartes_statut` (`statut`),
  KEY `idx_distribution_cartes_date` (`date_distribution`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `donnee_collectee` (
  `id_donnee` int NOT NULL AUTO_INCREMENT,
  `id_formulaire` int NOT NULL,
  `id_beneficiaire` int DEFAULT NULL,
  `id_activite` int DEFAULT NULL,
  `donnees_json` json NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `photos_urls` text COLLATE utf8mb4_unicode_ci,
  `est_synchro` tinyint(1) DEFAULT '0',
  `date_collecte` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_donnee`),
  KEY `id_formulaire` (`id_formulaire`),
  KEY `id_activite` (`id_activite`),
  KEY `idx_donnee_beneficiaire` (`id_beneficiaire`),
  KEY `idx_donnee_synchro` (`est_synchro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `formation` (
  `id_formation` int NOT NULL AUTO_INCREMENT,
  `code_formation` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_theme` int NOT NULL,
  `titre` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `lieu` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `formateur` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_formation`),
  UNIQUE KEY `code_formation` (`code_formation`),
  KEY `id_theme` (`id_theme`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `formulaire` (
  `id_formulaire` int NOT NULL AUTO_INCREMENT,
  `nom_formulaire` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `json_schema` json NOT NULL,
  `est_actif` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_formulaire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fournisseurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sigle` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `territoire` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'En cours',
  `stock_disponible` int NOT NULL DEFAULT '0',
  `stock_total` int NOT NULL DEFAULT '0',
  `beneficiaires_servis` int NOT NULL DEFAULT '0',
  `montant_contrat` decimal(15,2) NOT NULL DEFAULT '0.00',
  `taux_livraison` int NOT NULL DEFAULT '0',
  `date_contrat` date NOT NULL,
  `intrants` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fournisseurs_type` (`type`),
  KEY `idx_fournisseurs_province` (`province`),
  KEY `idx_fournisseurs_statut` (`statut`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `fournisseurs_semences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telephone` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `est_actif` tinyint(1) DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `grm_plaintes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `numero_plainte` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `territoire` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beneficiaire_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beneficiaire_rna` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_reception` datetime NOT NULL,
  `date_traitement` datetime DEFAULT NULL,
  `statut` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'recue',
  `delai_traite` int DEFAULT NULL,
  `prise_en_charge` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resolution` text COLLATE utf8mb4_unicode_ci,
  `est_confidentiel` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_grm_plaintes_numero` (`numero_plainte`),
  KEY `idx_grm_plaintes_type` (`type`),
  KEY `idx_grm_plaintes_province` (`province`),
  KEY `idx_grm_plaintes_statut` (`statut`),
  KEY `idx_grm_plaintes_confidentiel` (`est_confidentiel`),
  KEY `idx_grm_plaintes_date_reception` (`date_reception`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `grm_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_grm_services_type` (`type`),
  KEY `idx_grm_services_province` (`province`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `indicateur` (
  `id_indicateur` int NOT NULL AUTO_INCREMENT,
  `code_indicateur` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_indicateur` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `formule_calcul` text COLLATE utf8mb4_unicode_ci,
  `unite_mesure` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source_donnees` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `frequence` enum('mensuelle','trimestrielle','semestrielle','annuelle') COLLATE utf8mb4_unicode_ci DEFAULT 'annuelle',
  `seuil_alerte` decimal(10,2) DEFAULT NULL,
  `est_iodp` tinyint(1) DEFAULT '0',
  `id_composante` int DEFAULT NULL,
  `id_sous_composante` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cible_2023` decimal(15,2) DEFAULT NULL,
  `cible_2024` decimal(15,2) DEFAULT NULL,
  `cible_2025` decimal(15,2) DEFAULT NULL,
  `cible_2026` decimal(15,2) DEFAULT NULL,
  `realise_2023` decimal(15,2) DEFAULT NULL,
  `realise_2024` decimal(15,2) DEFAULT NULL,
  `realise_2025` decimal(15,2) DEFAULT NULL,
  `realise_2026` decimal(15,2) DEFAULT NULL,
  `methodologie_collecte` text COLLATE utf8mb4_unicode_ci,
  `responsable_collecte` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_indicateur`),
  UNIQUE KEY `code_indicateur` (`code_indicateur`),
  KEY `id_composante` (`id_composante`),
  KEY `id_sous_composante` (`id_sous_composante`),
  KEY `idx_indicateur_code` (`code_indicateur`),
  KEY `idx_indicateur_iodp` (`est_iodp`)
) ENGINE=InnoDB AUTO_INCREMENT=402 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `indicateur_formule` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_indicateur` int DEFAULT NULL,
  `version` int DEFAULT NULL,
  `formule` text COLLATE utf8mb4_general_ci,
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL,
  `est_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `infrastructure` (
  `id_infrastructure` int NOT NULL AUTO_INCREMENT,
  `code_infrastructure` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_type_infrastructure` int NOT NULL,
  `nom_infrastructure` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_localisation` int NOT NULL,
  `longueur_km` decimal(10,2) DEFAULT NULL,
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL,
  `statut` enum('planifiee','en_cours','terminee','abandonnee') COLLATE utf8mb4_unicode_ci DEFAULT 'planifiee',
  `cout_total` decimal(15,2) DEFAULT NULL,
  `id_responsable` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_infrastructure`),
  UNIQUE KEY `code_infrastructure` (`code_infrastructure`),
  KEY `id_localisation` (`id_localisation`),
  KEY `id_responsable` (`id_responsable`),
  KEY `idx_infrastructure_type` (`id_type_infrastructure`),
  KEY `idx_infrastructure_statut` (`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `localisation` (
  `id_localisation` int NOT NULL AUTO_INCREMENT,
  `province` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `territoire` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commune` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `secteur` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `code_postal` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_localisation`),
  UNIQUE KEY `unique_localisation` (`province`,`territoire`,`commune`,`village`),
  KEY `idx_localisation_province` (`province`),
  KEY `idx_localisation_coords` (`latitude`,`longitude`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_reads` (
  `user_id` int NOT NULL,
  `notification_id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`,`notification_id`),
  KEY `idx_notification_reads_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `organisations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sigle` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nom_complet` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_type` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_creation` date NOT NULL,
  `date_agrement` date DEFAULT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `territoire` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commune` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adresse` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `beneficiaires_couverts` int NOT NULL DEFAULT '0',
  `budget_alloue` decimal(15,2) NOT NULL DEFAULT '0.00',
  `taux_execution` int NOT NULL DEFAULT '0',
  `statut` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `membres_total` int NOT NULL DEFAULT '0',
  `membres_femmes` int NOT NULL DEFAULT '0',
  `membres_hommes` int NOT NULL DEFAULT '0',
  `membres_jeunes` int NOT NULL DEFAULT '0',
  `productions` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_organisations_code` (`code`),
  KEY `idx_organisations_type` (`type`),
  KEY `idx_organisations_source_type` (`source_type`),
  KEY `idx_organisations_province` (`province`),
  KEY `idx_organisations_statut` (`statut`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ot_activites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date` date NOT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `territoire` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `village` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participants` int DEFAULT NULL,
  `resultats` text COLLATE utf8mb4_unicode_ci,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ot_equipiers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fonction` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `performance` int NOT NULL DEFAULT '0',
  `enquetes_realisees` int NOT NULL DEFAULT '0',
  `dernier_suivi` date NOT NULL,
  `est_actif` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ot_profile` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sigle` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provinces` json NOT NULL,
  `responsable` json NOT NULL,
  `performances` json NOT NULL,
  `indicateurs` json NOT NULL,
  `objectifs` json NOT NULL,
  `zones` json NOT NULL,
  `dernier_suivi` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ot_rapports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mois` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `annee` int NOT NULL,
  `enquetes` int NOT NULL DEFAULT '0',
  `formations` int NOT NULL DEFAULT '0',
  `suivis` int NOT NULL DEFAULT '0',
  `qualite_donnees` int NOT NULL DEFAULT '0',
  `commentaires` text COLLATE utf8mb4_unicode_ci,
  `soumis_le` date NOT NULL,
  `valide` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `paquets_techniques` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `couts` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ptech_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `participation_formation` (
  `id_participation` int NOT NULL AUTO_INCREMENT,
  `id_formation` int NOT NULL,
  `id_beneficiaire` int NOT NULL,
  `present` tinyint(1) DEFAULT '1',
  `note_test` int DEFAULT NULL,
  `satisfait` tinyint(1) DEFAULT NULL,
  `commentaire` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_participation`),
  UNIQUE KEY `unique_participation` (`id_formation`,`id_beneficiaire`),
  KEY `id_beneficiaire` (`id_beneficiaire`)
) ;

-- --------------------------------------------------------

--
-- Structure de la table `periode`
--

DROP TABLE IF EXISTS `periode`;
CREATE TABLE IF NOT EXISTS `periode` (
  `id_periode` int NOT NULL AUTO_INCREMENT,
  `type_periode` enum('trimestre','semestre','annee') COLLATE utf8mb4_unicode_ci NOT NULL,
  `annee` int NOT NULL,
  `numero` int NOT NULL,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `est_active` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_periode`),
  UNIQUE KEY `unique_periode` (`type_periode`,`annee`,`numero`)
) ;

--
-- Déchargement des données de la table `periode`
--

INSERT INTO `periode` (`id_periode`, `type_periode`, `annee`, `numero`, `date_debut`, `date_fin`, `est_active`, `created_at`) VALUES
(1, 'trimestre', 2026, 1, '2026-01-01', '2026-03-31', 1, '2026-03-30 16:55:09'),
(2, 'trimestre', 2026, 2, '2026-04-01', '2026-06-30', 0, '2026-03-30 16:55:09'),
(3, 'trimestre', 2026, 3, '2026-07-01', '2026-09-30', 0, '2026-03-30 16:55:09'),
(4, 'trimestre', 2026, 4, '2026-10-01', '2026-12-31', 0, '2026-03-30 16:55:09'),
(5, 'semestre', 2026, 1, '2026-01-01', '2026-06-30', 1, '2026-03-30 16:55:09'),
(6, 'semestre', 2026, 2, '2026-07-01', '2026-12-31', 0, '2026-03-30 16:55:09'),
(7, 'annee', 2026, 1, '2026-01-01', '2026-12-31', 1, '2026-03-30 16:55:09');

-- --------------------------------------------------------

--
-- Structure de la table `plainte_grm`
--

DROP TABLE IF EXISTS `plainte_grm`;
CREATE TABLE IF NOT EXISTS `plainte_grm` (
  `id_plainte` int NOT NULL AUTO_INCREMENT,
  `numero_plainte` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_type_plainte` int NOT NULL,
  `id_beneficiaire` int DEFAULT NULL,
  `id_localisation` int NOT NULL,
  `id_utilisateur` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_reception` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date_traitement` timestamp NULL DEFAULT NULL,
  `statut` enum('recue','en_cours','referee','traitee','cloturee') COLLATE utf8mb4_unicode_ci DEFAULT 'recue',
  `id_prise_charge` int DEFAULT NULL,
  `resolution` text COLLATE utf8mb4_unicode_ci,
  `est_confidentiel` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `delai_traite` int GENERATED ALWAYS AS ((case when (`date_traitement` is not null) then (to_days(`date_traitement`) - to_days(`date_reception`)) else NULL end)) STORED,
  PRIMARY KEY (`id_plainte`),
  UNIQUE KEY `numero_plainte` (`numero_plainte`),
  KEY `id_beneficiaire` (`id_beneficiaire`),
  KEY `id_localisation` (`id_localisation`),
  KEY `id_utilisateur` (`id_utilisateur`),
  KEY `id_prise_charge` (`id_prise_charge`),
  KEY `idx_plainte_statut` (`statut`),
  KEY `idx_plainte_type` (`id_type_plainte`),
  KEY `idx_plainte_date` (`date_reception`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `plan_contingence` (
  `id_plan` int NOT NULL AUTO_INCREMENT,
  `code_plan` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_plan` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_approbation` date DEFAULT NULL,
  `date_expiration` date DEFAULT NULL,
  `fichier_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `est_actif` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_plan`),
  UNIQUE KEY `code_plan` (`code_plan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `powerbi_dashboards` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `embed_url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dashboard_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_powerbi_dashboards_dashboard_id` (`dashboard_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `powerbi_reports` (
  `id` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `embed_url` varchar(512) COLLATE utf8mb4_unicode_ci NOT NULL,
  `report_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dataset_id` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `thumbnail_url` varchar(512) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_powerbi_reports_report_id` (`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `prise_en_charge` (
  `id_prise_charge` int NOT NULL AUTO_INCREMENT,
  `nom_organisme` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_service` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adresse` text COLLATE utf8mb4_unicode_ci,
  `est_actif` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_prise_charge`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `profil` (
  `id_profil` int NOT NULL AUTO_INCREMENT,
  `nom_profil` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `niveau_acces` int DEFAULT '1',
  `description` text COLLATE utf8mb4_unicode_ci,
  `est_actif` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_profil`),
  UNIQUE KEY `nom_profil` (`nom_profil`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `provinces` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `region` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `population` bigint NOT NULL DEFAULT '0',
  `progression` int NOT NULL DEFAULT '0',
  `performance_score` int NOT NULL DEFAULT '0',
  `progression_delta` int NOT NULL DEFAULT '0',
  `beneficiaires` json NOT NULL,
  `production` json NOT NULL,
  `infrastructures` json NOT NULL,
  `indicateurs` json NOT NULL,
  `risques` json NOT NULL,
  `plaintes` json NOT NULL,
  `dernier_suivi` date NOT NULL,
  `coord_lat` decimal(10,6) DEFAULT NULL,
  `coord_lng` decimal(10,6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_provinces_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `province_evolution` (
  `id` int NOT NULL AUTO_INCREMENT,
  `province_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mois` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  `beneficiaires` int NOT NULL DEFAULT '0',
  `production` int NOT NULL DEFAULT '0',
  `routes` int NOT NULL DEFAULT '0',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_province_evolution_province` (`province_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recap_beneficiaires_province` (
  `province` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_beneficiaires` int DEFAULT '0',
  `femmes` int DEFAULT '0',
  `hommes` int DEFAULT '0',
  `jeunes` int DEFAULT '0',
  `last_refresh` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`province`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `risque` (
  `id_risque` int NOT NULL AUTO_INCREMENT,
  `code_risque` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_type_risque` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `probabilite` int DEFAULT NULL,
  `impact` int DEFAULT NULL,
  `id_localisation` int DEFAULT NULL,
  `date_identification` date NOT NULL,
  `date_cloture` date DEFAULT NULL,
  `statut` enum('identifie','en_cours','atténue','cloture') COLLATE utf8mb4_unicode_ci DEFAULT 'identifie',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `niveau` varchar(20) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when ((`probabilite` * `impact`) >= 20) then _utf8mb4'Critique' when ((`probabilite` * `impact`) >= 12) then _utf8mb4'Élevé' when ((`probabilite` * `impact`) >= 6) then _utf8mb4'Modéré' else _utf8mb4'Faible' end)) STORED,
  PRIMARY KEY (`id_risque`),
  UNIQUE KEY `code_risque` (`code_risque`),
  KEY `id_type_risque` (`id_type_risque`),
  KEY `id_localisation` (`id_localisation`)
) ;

-- --------------------------------------------------------

--
-- Structure de la table `risques`
--

DROP TABLE IF EXISTS `risques`;
CREATE TABLE IF NOT EXISTS `risques` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `categorie` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `probabilite` tinyint NOT NULL,
  `impact` tinyint NOT NULL,
  `niveau` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `statut` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_attenuation` text COLLATE utf8mb4_unicode_ci,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_identification` date NOT NULL,
  `date_cloture` date DEFAULT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actions_prevues` text COLLATE utf8mb4_unicode_ci,
  `indicateurs_surveillance` text COLLATE utf8mb4_unicode_ci,
  `dernier_suivi` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_risques_code` (`code`),
  KEY `idx_risques_niveau` (`niveau`),
  KEY `idx_risques_statut` (`statut`),
  KEY `idx_risques_province` (`province`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `risque_actions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_risque` int NOT NULL,
  `action` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `responsable` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_debut` date NOT NULL,
  `date_fin` date NOT NULL,
  `statut` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `resultat` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `idx_risque_actions_risque` (`id_risque`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `risque_alertes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_risque` int NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_alerte` date NOT NULL,
  `est_lue` tinyint(1) NOT NULL DEFAULT '0',
  `niveau` varchar(16) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_risque_alertes_risque` (`id_risque`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sous_composante` (
  `id_sous_composante` int NOT NULL AUTO_INCREMENT,
  `id_composante` int NOT NULL,
  `code_sous_composante` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nom_sous_composante` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ordre` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_sous_composante`),
  UNIQUE KEY `unique_sous_composante` (`id_composante`,`code_sous_composante`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subvention` (
  `id_subvention` int NOT NULL AUTO_INCREMENT,
  `code_subvention` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_type_subvention` int NOT NULL,
  `id_beneficiaire` int NOT NULL,
  `montant_total` decimal(15,2) NOT NULL,
  `date_approbation` date NOT NULL,
  `date_debut` date DEFAULT NULL,
  `date_fin` date DEFAULT NULL,
  `statut` enum('approuvee','active','suspendue','terminee') COLLATE utf8mb4_unicode_ci DEFAULT 'approuvee',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_subvention`),
  UNIQUE KEY `code_subvention` (`code_subvention`),
  KEY `id_type_subvention` (`id_type_subvention`),
  KEY `id_beneficiaire` (`id_beneficiaire`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `suivi_missions` (
  `id` int NOT NULL,
  `num` varchar(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `section` int NOT NULL,
  `section_label` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nature_mission` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `objectif` text COLLATE utf8mb4_unicode_ci,
  `hors_projet` int NOT NULL DEFAULT '0',
  `projet` int NOT NULL DEFAULT '0',
  `montant_usd` decimal(12,2) NOT NULL DEFAULT '0.00',
  `dates` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avance_usd` decimal(12,2) NOT NULL DEFAULT '0.00',
  `solde` decimal(12,2) NOT NULL DEFAULT '0.00',
  `province` varchar(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_suivi_missions_province` (`province`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `theme_formation` (
  `id_theme` int NOT NULL AUTO_INCREMENT,
  `nom_theme` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `duree_standard` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_theme`),
  UNIQUE KEY `nom_theme` (`nom_theme`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tranche_subvention` (
  `id_tranche` int NOT NULL AUTO_INCREMENT,
  `id_subvention` int NOT NULL,
  `numero_tranche` int NOT NULL,
  `montant` decimal(15,2) NOT NULL,
  `date_versement` date DEFAULT NULL,
  `conditions_remplies` text COLLATE utf8mb4_unicode_ci,
  `statut` enum('prevue','versee','annulee') COLLATE utf8mb4_unicode_ci DEFAULT 'prevue',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_tranche`),
  UNIQUE KEY `unique_tranche` (`id_subvention`,`numero_tranche`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `type_infrastructure` (
  `id_type_infrastructure` int NOT NULL AUTO_INCREMENT,
  `nom_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `unite_mesure` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_type_infrastructure`),
  UNIQUE KEY `nom_type` (`nom_type`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `type_plainte` (
  `id_type_plainte` int NOT NULL AUTO_INCREMENT,
  `nom_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `delai_traitement` int DEFAULT '30',
  `est_sensible` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_type_plainte`),
  UNIQUE KEY `nom_type` (`nom_type`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `type_risque` (
  `id_type_risque` int NOT NULL AUTO_INCREMENT,
  `nom_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categorie` enum('gestion','technique','politique','socio_economique','environnemental','sante_securite') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_type_risque`),
  UNIQUE KEY `nom_type` (`nom_type`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `type_subvention` (
  `id_type_subvention` int NOT NULL AUTO_INCREMENT,
  `nom_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `montant_max` decimal(15,2) DEFAULT NULL,
  `conditions` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_type_subvention`),
  UNIQUE KEY `nom_type` (`nom_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `utilisateur` (
  `id_utilisateur` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mot_de_passe` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_profil` int NOT NULL,
  `id_localisation` int DEFAULT NULL,
  `dernier_connexion` datetime DEFAULT NULL,
  `est_actif` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_utilisateur`),
  UNIQUE KEY `email` (`email`),
  KEY `id_localisation` (`id_localisation`),
  KEY `idx_utilisateur_email` (`email`),
  KEY `idx_utilisateur_profil` (`id_profil`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `valeur_indicateur` (
  `id_valeur` int NOT NULL AUTO_INCREMENT,
  `id_indicateur` int NOT NULL,
  `id_periode` int NOT NULL,
  `id_localisation` int DEFAULT NULL,
  `valeur_reference` decimal(15,2) DEFAULT NULL,
  `valeur_cible` decimal(15,2) DEFAULT NULL,
  `valeur_reelle` decimal(15,2) DEFAULT NULL,
  `commentaire` text COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `ecart` decimal(15,2) GENERATED ALWAYS AS ((`valeur_reelle` - `valeur_cible`)) STORED,
  `taux_realisation` decimal(5,2) GENERATED ALWAYS AS ((case when (`valeur_cible` > 0) then ((`valeur_reelle` / `valeur_cible`) * 100) else NULL end)) STORED,
  PRIMARY KEY (`id_valeur`),
  UNIQUE KEY `unique_valeur` (`id_indicateur`,`id_periode`,`id_localisation`),
  KEY `id_periode` (`id_periode`),
  KEY `id_localisation` (`id_localisation`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ventes_semences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rna_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` varchar(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `producteur_nom` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type_semence` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantite_kg` decimal(12,2) NOT NULL DEFAULT '0.00',
  `montant_usd` decimal(12,2) NOT NULL DEFAULT '0.00',
  `montant_cdf` decimal(15,2) DEFAULT NULL,
  `fournisseur` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_vente` date NOT NULL,
  `observations` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ventes_semences_rna_id` (`rna_id`),
  KEY `idx_ventes_semences_province` (`province`),
  KEY `idx_ventes_semences_type_semence` (`type_semence`),
  KEY `idx_ventes_semences_date_vente` (`date_vente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

