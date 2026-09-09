-- Auto-generated from database/schema_only.sql (MySQL) for Supabase/Postgres.
-- Review before applying. ENUM columns become text + CHECK constraints.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS activite (
  id_activite integer GENERATED ALWAYS AS IDENTITY,
  type_activite varchar(50) NOT NULL,
  code_activite varchar(50),
  description text,
  date_debut date NOT NULL,
  date_fin date DEFAULT NULL,
  statut text DEFAULT 'planifiee',
  id_beneficiaire integer DEFAULT NULL,
  id_localisation integer DEFAULT NULL,
  id_utilisateur integer DEFAULT NULL,
  cout_prevu numeric(15,2) DEFAULT NULL,
  cout_reel numeric(15,2) DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_activite),
  CONSTRAINT activite_code_activite UNIQUE (code_activite),
  CHECK (statut IN ('planifiee','en_cours','terminee','annulee'))
);

CREATE INDEX IF NOT EXISTS activite_id_beneficiaire ON activite (id_beneficiaire);
CREATE INDEX IF NOT EXISTS activite_id_localisation ON activite (id_localisation);
CREATE INDEX IF NOT EXISTS activite_id_utilisateur ON activite (id_utilisateur);
CREATE INDEX IF NOT EXISTS activite_idx_activite_date ON activite (date_debut,date_fin);
CREATE INDEX IF NOT EXISTS activite_idx_activite_statut ON activite (statut);

CREATE TRIGGER trg_activite_updated_at BEFORE UPDATE ON activite
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS activites (
  id integer GENERATED ALWAYS AS IDENTITY,
  code varchar(64) NOT NULL,
  titre varchar(255) NOT NULL,
  description text,
  type varchar(64) NOT NULL,
  composante varchar(128),
  statut varchar(64) NOT NULL DEFAULT 'planifiee',
  priorite varchar(32) NOT NULL DEFAULT 'moyenne',
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  lieu varchar(255),
  province varchar(128) NOT NULL,
  territoire varchar(128),
  commune varchar(128),
  village varchar(128),
  responsable varchar(255) NOT NULL,
  responsable_contact varchar(128),
  equipe text,
  participants_prevus integer NOT NULL DEFAULT 0,
  participants_reels integer DEFAULT NULL,
  budget_prevu numeric(15,2) NOT NULL DEFAULT 0.00,
  budget_reel numeric(15,2) DEFAULT NULL,
  objectifs text,
  resultats_attendus text,
  resultats_obtenus text,
  difficultes text,
  lecons_apprises text,
  documents text,
  photos text,
  created_by varchar(255),
  beneficiaires_cibles integer NOT NULL DEFAULT 0,
  beneficiaires_atteints integer NOT NULL DEFAULT 0,
  taux_execution integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT activites_uq_activites_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS activites_idx_activites_type ON activites (type);
CREATE INDEX IF NOT EXISTS activites_idx_activites_statut ON activites (statut);
CREATE INDEX IF NOT EXISTS activites_idx_activites_province ON activites (province);
CREATE INDEX IF NOT EXISTS activites_idx_activites_date_debut ON activites (date_debut);

CREATE TRIGGER trg_activites_updated_at BEFORE UPDATE ON activites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS agriculteurs (
  id integer GENERATED ALWAYS AS IDENTITY,
  farmer_id bigint DEFAULT NULL,
  province varchar(100),
  territoire varchar(100),
  secteur varchar(150),
  groupement varchar(150),
  village varchar(150),
  nom_complet varchar(255) NOT NULL,
  sexe varchar(20),
  saison varchar(50),
  ptech varchar(50),
  created_at timestamptz DEFAULT now(),
  age integer DEFAULT NULL,
  date_naissance date DEFAULT NULL,
  telephone varchar(20),
  situation_matrimoniale varchar(50),
  niveau_instruction varchar(50),
  superficie_terres numeric(10,2) DEFAULT NULL,
  est_chef_menage boolean DEFAULT false,
  membre_deja_enregistre boolean DEFAULT false,
  a_recu_carte boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS agriculteurs_idx_farmer_id ON agriculteurs (farmer_id);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_province ON agriculteurs (province);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_territoire ON agriculteurs (territoire);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_secteur ON agriculteurs (secteur);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_groupement ON agriculteurs (groupement);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_village ON agriculteurs (village);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_sexe ON agriculteurs (sexe);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_saison ON agriculteurs (saison);
CREATE INDEX IF NOT EXISTS agriculteurs_idx_ptech ON agriculteurs (ptech);

CREATE TRIGGER trg_agriculteurs_updated_at BEFORE UPDATE ON agriculteurs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS agriculteurs_cultures (
  id integer GENERATED ALWAYS AS IDENTITY,
  agriculteur_id integer NOT NULL,
  culture_id integer NOT NULL,
  superficie_ha numeric(10,2) DEFAULT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS agriculteurs_cultures_idx_agriculteurs_cultures_agriculteur ON agriculteurs_cultures (agriculteur_id);
CREATE INDEX IF NOT EXISTS agriculteurs_cultures_idx_agriculteurs_cultures_culture ON agriculteurs_cultures (culture_id);

CREATE TABLE IF NOT EXISTS alerte_risque (
  id_alerte integer GENERATED ALWAYS AS IDENTITY,
  id_risque integer NOT NULL,
  message_alerte text NOT NULL,
  date_alerte timestamptz DEFAULT now(),
  est_lue boolean DEFAULT false,
  destinataire varchar(200),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_alerte)
);

CREATE INDEX IF NOT EXISTS alerte_risque_id_risque ON alerte_risque (id_risque);

CREATE TABLE IF NOT EXISTS beneficiaire (
  id_beneficiaire integer GENERATED ALWAYS AS IDENTITY,
  rna_id varchar(50),
  nom varchar(100) NOT NULL,
  prenom varchar(100),
  sexe char(1),
  date_naissance date DEFAULT NULL,
  telephone varchar(20),
  id_localisation integer NOT NULL,
  type_exploitant text DEFAULT 'agriculteur',
  est_jeune boolean DEFAULT false,
  est_autochtone boolean DEFAULT false,
  niveau_instruction varchar(50),
  situation_matrimoniale varchar(50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_beneficiaire),
  CONSTRAINT beneficiaire_rna_id UNIQUE (rna_id),
  CHECK (type_exploitant IN ('agriculteur','eleveur','pisciculteur','mixte'))
);

CREATE INDEX IF NOT EXISTS beneficiaire_idx_beneficiaire_rna ON beneficiaire (rna_id);
CREATE INDEX IF NOT EXISTS beneficiaire_idx_beneficiaire_sexe ON beneficiaire (sexe);
CREATE INDEX IF NOT EXISTS beneficiaire_idx_beneficiaire_localisation ON beneficiaire (id_localisation);

CREATE TRIGGER trg_beneficiaire_updated_at BEFORE UPDATE ON beneficiaire
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS cadre_resultats (
  id integer NOT NULL,
  code varchar(50) NOT NULL,
  nom varchar(500) NOT NULL,
  composante varchar(100) NOT NULL,
  sous_composante varchar(255) NOT NULL DEFAULT '',
  est_odp boolean NOT NULL DEFAULT false,
  reference_value varchar(100) NOT NULL DEFAULT '',
  unite varchar(50) NOT NULL,
  frequence varchar(50) NOT NULL DEFAULT '',
  source_donnees varchar(255) NOT NULL DEFAULT '',
  methodologie_collecte text,
  responsable varchar(255) NOT NULL DEFAULT '',
  prevu_2023 numeric(18,2) DEFAULT NULL,
  realise_2023 numeric(18,2) DEFAULT NULL,
  prevu_2024 numeric(18,2) DEFAULT NULL,
  realise_2024 numeric(18,2) DEFAULT NULL,
  prevu_2025 numeric(18,2) DEFAULT NULL,
  realise_2025 numeric(18,2) DEFAULT NULL,
  prevu_2026 numeric(18,2) DEFAULT NULL,
  realise_2026 numeric(18,2) DEFAULT NULL,
  final_prevu numeric(18,2) DEFAULT NULL,
  final_realise numeric(18,2) DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT cadre_resultats_uq_cadre_resultats_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS cadre_resultats_idx_cadre_resultats_composante ON cadre_resultats (composante);
CREATE INDEX IF NOT EXISTS cadre_resultats_idx_cadre_resultats_est_odp ON cadre_resultats (est_odp);

CREATE TRIGGER trg_cadre_resultats_updated_at BEFORE UPDATE ON cadre_resultats
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS calculateur_historique (
  id integer GENERATED ALWAYS AS IDENTITY,
  user_id integer NOT NULL,
  indicateur_code varchar(50) NOT NULL,
  indicateur_nom varchar(255) NOT NULL,
  valeur numeric(15,2) NOT NULL,
  unite varchar(50) NOT NULL,
  interpretation text,
  donnees jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS calculateur_historique_idx_calculateur_historique_user ON calculateur_historique (user_id);
CREATE INDEX IF NOT EXISTS calculateur_historique_idx_calculateur_historique_code ON calculateur_historique (indicateur_code);
CREATE INDEX IF NOT EXISTS calculateur_historique_idx_calculateur_historique_date ON calculateur_historique (created_at);

CREATE TABLE IF NOT EXISTS cartes_agriculteurs (
  id integer GENERATED ALWAYS AS IDENTITY,
  rna_id varchar(64) NOT NULL,
  numero_carte varchar(64),
  statut_carte varchar(32) NOT NULL DEFAULT 'a_imprimer',
  date_distribution date DEFAULT NULL,
  agent_distribution varchar(255),
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT cartes_agriculteurs_uq_cartes_agriculteurs_rna UNIQUE (rna_id),
  CONSTRAINT cartes_agriculteurs_uq_cartes_agriculteurs_numero UNIQUE (numero_carte)
);

CREATE INDEX IF NOT EXISTS cartes_agriculteurs_idx_cartes_agriculteurs_statut ON cartes_agriculteurs (statut_carte);
CREATE INDEX IF NOT EXISTS cartes_agriculteurs_idx_cartes_agriculteurs_date_distribution ON cartes_agriculteurs (date_distribution);

CREATE TRIGGER trg_cartes_agriculteurs_updated_at BEFORE UPDATE ON cartes_agriculteurs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS cler (
  id_cler integer GENERATED ALWAYS AS IDENTITY,
  code_cler varchar(50) NOT NULL,
  nom_cler varchar(200) NOT NULL,
  id_localisation integer NOT NULL,
  nombre_membres integer DEFAULT NULL,
  est_fonctionnel boolean DEFAULT false,
  date_creation date DEFAULT NULL,
  km_couverts numeric(10,2) DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_cler),
  CONSTRAINT cler_code_cler UNIQUE (code_cler)
);

CREATE INDEX IF NOT EXISTS cler_id_localisation ON cler (id_localisation);

CREATE TRIGGER trg_cler_updated_at BEFORE UPDATE ON cler
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS composante (
  id_composante integer GENERATED ALWAYS AS IDENTITY,
  code_composante varchar(20) NOT NULL,
  nom_composante varchar(200) NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_composante),
  CONSTRAINT composante_code_composante UNIQUE (code_composante)
);

CREATE TRIGGER trg_composante_updated_at BEFORE UPDATE ON composante
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS cultures (
  id integer GENERATED ALWAYS AS IDENTITY,
  nom varchar(100) NOT NULL,
  categorie varchar(50),
  PRIMARY KEY (id),
  CONSTRAINT cultures_uk_cultures_nom UNIQUE (nom)
);

CREATE TABLE IF NOT EXISTS distribution_cartes (
  id integer GENERATED ALWAYS AS IDENTITY,
  rna_id varchar(64) NOT NULL,
  numero_carte varchar(64),
  date_distribution date DEFAULT NULL,
  agent_distribution varchar(255),
  statut text DEFAULT 'a_imprimer',
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT distribution_cartes_uk_distribution_cartes_rna UNIQUE (rna_id),
  CONSTRAINT distribution_cartes_uk_distribution_cartes_numero UNIQUE (numero_carte),
  CHECK (statut IN ('distribuee','en_attente','a_imprimer'))
);

CREATE INDEX IF NOT EXISTS distribution_cartes_idx_distribution_cartes_statut ON distribution_cartes (statut);
CREATE INDEX IF NOT EXISTS distribution_cartes_idx_distribution_cartes_date ON distribution_cartes (date_distribution);

CREATE TRIGGER trg_distribution_cartes_updated_at BEFORE UPDATE ON distribution_cartes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS donnee_collectee (
  id_donnee integer GENERATED ALWAYS AS IDENTITY,
  id_formulaire integer NOT NULL,
  id_beneficiaire integer DEFAULT NULL,
  id_activite integer DEFAULT NULL,
  donnees_json jsonb NOT NULL,
  latitude numeric(10,8) DEFAULT NULL,
  longitude numeric(11,8) DEFAULT NULL,
  photos_urls text,
  est_synchro boolean DEFAULT false,
  date_collecte timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_donnee)
);

CREATE INDEX IF NOT EXISTS donnee_collectee_id_formulaire ON donnee_collectee (id_formulaire);
CREATE INDEX IF NOT EXISTS donnee_collectee_id_activite ON donnee_collectee (id_activite);
CREATE INDEX IF NOT EXISTS donnee_collectee_idx_donnee_beneficiaire ON donnee_collectee (id_beneficiaire);
CREATE INDEX IF NOT EXISTS donnee_collectee_idx_donnee_synchro ON donnee_collectee (est_synchro);

CREATE TRIGGER trg_donnee_collectee_updated_at BEFORE UPDATE ON donnee_collectee
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS formation (
  id_formation integer GENERATED ALWAYS AS IDENTITY,
  code_formation varchar(50) NOT NULL,
  id_theme integer NOT NULL,
  titre varchar(200) NOT NULL,
  description text,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  lieu varchar(200),
  formateur varchar(200),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_formation),
  CONSTRAINT formation_code_formation UNIQUE (code_formation)
);

CREATE INDEX IF NOT EXISTS formation_id_theme ON formation (id_theme);

CREATE TRIGGER trg_formation_updated_at BEFORE UPDATE ON formation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS formulaire (
  id_formulaire integer GENERATED ALWAYS AS IDENTITY,
  nom_formulaire varchar(200) NOT NULL,
  version varchar(20),
  json_schema jsonb NOT NULL,
  est_actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_formulaire)
);

CREATE TRIGGER trg_formulaire_updated_at BEFORE UPDATE ON formulaire
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS fournisseurs (
  id integer GENERATED ALWAYS AS IDENTITY,
  nom varchar(255) NOT NULL,
  sigle varchar(64),
  type varchar(128) NOT NULL,
  province varchar(128) NOT NULL,
  territoire varchar(128) NOT NULL,
  responsable varchar(255) NOT NULL,
  telephone varchar(64) NOT NULL,
  email varchar(255),
  statut varchar(64) NOT NULL DEFAULT 'En cours',
  stock_disponible integer NOT NULL DEFAULT 0,
  stock_total integer NOT NULL DEFAULT 0,
  beneficiaires_servis integer NOT NULL DEFAULT 0,
  montant_contrat numeric(15,2) NOT NULL DEFAULT 0.00,
  taux_livraison integer NOT NULL DEFAULT 0,
  date_contrat date NOT NULL,
  intrants text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS fournisseurs_idx_fournisseurs_type ON fournisseurs (type);
CREATE INDEX IF NOT EXISTS fournisseurs_idx_fournisseurs_province ON fournisseurs (province);
CREATE INDEX IF NOT EXISTS fournisseurs_idx_fournisseurs_statut ON fournisseurs (statut);

CREATE TRIGGER trg_fournisseurs_updated_at BEFORE UPDATE ON fournisseurs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS fournisseurs_semences (
  id integer GENERATED ALWAYS AS IDENTITY,
  nom varchar(255) NOT NULL,
  province varchar(128),
  contact varchar(255),
  telephone varchar(50),
  est_actif boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS grm_plaintes (
  id integer GENERATED ALWAYS AS IDENTITY,
  numero_plainte varchar(64) NOT NULL,
  type varchar(32) NOT NULL,
  description text NOT NULL,
  province varchar(128),
  territoire varchar(128),
  village varchar(255),
  beneficiaire_nom varchar(255),
  beneficiaire_rna varchar(64),
  date_reception timestamptz NOT NULL,
  date_traitement timestamptz DEFAULT NULL,
  statut varchar(32) NOT NULL DEFAULT 'recue',
  delai_traite integer DEFAULT NULL,
  prise_en_charge varchar(255),
  resolution text,
  est_confidentiel boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT grm_plaintes_uq_grm_plaintes_numero UNIQUE (numero_plainte)
);

CREATE INDEX IF NOT EXISTS grm_plaintes_idx_grm_plaintes_type ON grm_plaintes (type);
CREATE INDEX IF NOT EXISTS grm_plaintes_idx_grm_plaintes_province ON grm_plaintes (province);
CREATE INDEX IF NOT EXISTS grm_plaintes_idx_grm_plaintes_statut ON grm_plaintes (statut);
CREATE INDEX IF NOT EXISTS grm_plaintes_idx_grm_plaintes_confidentiel ON grm_plaintes (est_confidentiel);
CREATE INDEX IF NOT EXISTS grm_plaintes_idx_grm_plaintes_date_reception ON grm_plaintes (date_reception);

CREATE TRIGGER trg_grm_plaintes_updated_at BEFORE UPDATE ON grm_plaintes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS grm_services (
  id integer GENERATED ALWAYS AS IDENTITY,
  nom varchar(255) NOT NULL,
  type varchar(64) NOT NULL,
  province varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS grm_services_idx_grm_services_type ON grm_services (type);
CREATE INDEX IF NOT EXISTS grm_services_idx_grm_services_province ON grm_services (province);

CREATE TRIGGER trg_grm_services_updated_at BEFORE UPDATE ON grm_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS indicateur (
  id_indicateur integer GENERATED ALWAYS AS IDENTITY,
  code_indicateur varchar(50) NOT NULL,
  nom_indicateur varchar(200) NOT NULL,
  description text,
  formule_calcul text,
  unite_mesure varchar(50),
  source_donnees varchar(200),
  frequence text DEFAULT 'annuelle',
  seuil_alerte numeric(10,2) DEFAULT NULL,
  est_iodp boolean DEFAULT false,
  id_composante integer DEFAULT NULL,
  id_sous_composante integer DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  cible_2023 numeric(15,2) DEFAULT NULL,
  cible_2024 numeric(15,2) DEFAULT NULL,
  cible_2025 numeric(15,2) DEFAULT NULL,
  cible_2026 numeric(15,2) DEFAULT NULL,
  realise_2023 numeric(15,2) DEFAULT NULL,
  realise_2024 numeric(15,2) DEFAULT NULL,
  realise_2025 numeric(15,2) DEFAULT NULL,
  realise_2026 numeric(15,2) DEFAULT NULL,
  methodologie_collecte text,
  responsable_collecte varchar(200),
  PRIMARY KEY (id_indicateur),
  CONSTRAINT indicateur_code_indicateur UNIQUE (code_indicateur),
  CHECK (frequence IN ('mensuelle','trimestrielle','semestrielle','annuelle'))
);

CREATE INDEX IF NOT EXISTS indicateur_id_composante ON indicateur (id_composante);
CREATE INDEX IF NOT EXISTS indicateur_id_sous_composante ON indicateur (id_sous_composante);
CREATE INDEX IF NOT EXISTS indicateur_idx_indicateur_code ON indicateur (code_indicateur);
CREATE INDEX IF NOT EXISTS indicateur_idx_indicateur_iodp ON indicateur (est_iodp);

CREATE TRIGGER trg_indicateur_updated_at BEFORE UPDATE ON indicateur
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS indicateur_formule (
  id integer GENERATED ALWAYS AS IDENTITY,
  id_indicateur integer DEFAULT NULL,
  version integer DEFAULT NULL,
  formule text,
  date_debut date DEFAULT NULL,
  date_fin date DEFAULT NULL,
  est_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS infrastructure (
  id_infrastructure integer GENERATED ALWAYS AS IDENTITY,
  code_infrastructure varchar(50) NOT NULL,
  id_type_infrastructure integer NOT NULL,
  nom_infrastructure varchar(200) NOT NULL,
  id_localisation integer NOT NULL,
  longueur_km numeric(10,2) DEFAULT NULL,
  date_debut date DEFAULT NULL,
  date_fin date DEFAULT NULL,
  statut text DEFAULT 'planifiee',
  cout_total numeric(15,2) DEFAULT NULL,
  id_responsable integer DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_infrastructure),
  CONSTRAINT infrastructure_code_infrastructure UNIQUE (code_infrastructure),
  CHECK (statut IN ('planifiee','en_cours','terminee','abandonnee'))
);

CREATE INDEX IF NOT EXISTS infrastructure_id_localisation ON infrastructure (id_localisation);
CREATE INDEX IF NOT EXISTS infrastructure_id_responsable ON infrastructure (id_responsable);
CREATE INDEX IF NOT EXISTS infrastructure_idx_infrastructure_type ON infrastructure (id_type_infrastructure);
CREATE INDEX IF NOT EXISTS infrastructure_idx_infrastructure_statut ON infrastructure (statut);

CREATE TRIGGER trg_infrastructure_updated_at BEFORE UPDATE ON infrastructure
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS localisation (
  id_localisation integer GENERATED ALWAYS AS IDENTITY,
  province varchar(100) NOT NULL,
  territoire varchar(100),
  commune varchar(100),
  village varchar(100),
  secteur varchar(100),
  latitude numeric(10,8) DEFAULT NULL,
  longitude numeric(11,8) DEFAULT NULL,
  code_postal varchar(20),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_localisation),
  CONSTRAINT localisation_unique_localisation UNIQUE (province,territoire,commune,village)
);

CREATE INDEX IF NOT EXISTS localisation_idx_localisation_province ON localisation (province);
CREATE INDEX IF NOT EXISTS localisation_idx_localisation_coords ON localisation (latitude,longitude);

CREATE TRIGGER trg_localisation_updated_at BEFORE UPDATE ON localisation
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS notification_reads (
  user_id integer NOT NULL,
  notification_id varchar(191) NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,notification_id)
);

CREATE INDEX IF NOT EXISTS notification_reads_idx_notification_reads_user_id ON notification_reads (user_id);

CREATE TABLE IF NOT EXISTS organisations (
  id integer GENERATED ALWAYS AS IDENTITY,
  code varchar(64) NOT NULL,
  nom varchar(255) NOT NULL,
  sigle varchar(64),
  nom_complet varchar(255),
  type varchar(64) NOT NULL,
  source_type varchar(64),
  date_creation date NOT NULL,
  date_agrement date DEFAULT NULL,
  province varchar(128) NOT NULL,
  territoire varchar(128),
  commune varchar(128),
  adresse varchar(255),
  responsable varchar(255) NOT NULL,
  telephone varchar(64) NOT NULL,
  email varchar(255),
  "role" varchar(255),
  beneficiaires_couverts integer NOT NULL DEFAULT 0,
  budget_alloue numeric(15,2) NOT NULL DEFAULT 0.00,
  taux_execution integer NOT NULL DEFAULT 0,
  statut varchar(64) NOT NULL DEFAULT 'active',
  membres_total integer NOT NULL DEFAULT 0,
  membres_femmes integer NOT NULL DEFAULT 0,
  membres_hommes integer NOT NULL DEFAULT 0,
  membres_jeunes integer NOT NULL DEFAULT 0,
  productions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT organisations_uq_organisations_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS organisations_idx_organisations_type ON organisations (type);
CREATE INDEX IF NOT EXISTS organisations_idx_organisations_source_type ON organisations (source_type);
CREATE INDEX IF NOT EXISTS organisations_idx_organisations_province ON organisations (province);
CREATE INDEX IF NOT EXISTS organisations_idx_organisations_statut ON organisations (statut);

CREATE TRIGGER trg_organisations_updated_at BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ot_activites (
  id integer GENERATED ALWAYS AS IDENTITY,
  type varchar(32) NOT NULL,
  titre varchar(255) NOT NULL,
  description text,
  date date NOT NULL,
  province varchar(128) NOT NULL,
  territoire varchar(128),
  village varchar(128),
  statut varchar(32) NOT NULL,
  responsable varchar(255),
  participants integer DEFAULT NULL,
  resultats text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TRIGGER trg_ot_activites_updated_at BEFORE UPDATE ON ot_activites
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ot_equipiers (
  id integer GENERATED ALWAYS AS IDENTITY,
  nom varchar(128) NOT NULL,
  prenom varchar(128) NOT NULL,
  fonction varchar(32) NOT NULL,
  telephone varchar(64),
  email varchar(255),
  province varchar(128) NOT NULL,
  performance integer NOT NULL DEFAULT 0,
  enquetes_realisees integer NOT NULL DEFAULT 0,
  dernier_suivi date NOT NULL,
  est_actif boolean NOT NULL DEFAULT true,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ot_profile (
  id varchar(32) NOT NULL,
  nom varchar(255) NOT NULL,
  sigle varchar(64) NOT NULL,
  region varchar(128) NOT NULL,
  provinces jsonb NOT NULL,
  responsable jsonb NOT NULL,
  performances jsonb NOT NULL,
  indicateurs jsonb NOT NULL,
  objectifs jsonb NOT NULL,
  zones jsonb NOT NULL,
  dernier_suivi date NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS ot_rapports (
  id integer GENERATED ALWAYS AS IDENTITY,
  mois varchar(32) NOT NULL,
  annee integer NOT NULL,
  enquetes integer NOT NULL DEFAULT 0,
  formations integer NOT NULL DEFAULT 0,
  suivis integer NOT NULL DEFAULT 0,
  qualite_donnees integer NOT NULL DEFAULT 0,
  commentaires text,
  soumis_le date NOT NULL,
  valide boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS paquets_techniques (
  id integer GENERATED ALWAYS AS IDENTITY,
  code varchar(50) NOT NULL,
  nom varchar(255) NOT NULL,
  description text,
  couts numeric(15,2) DEFAULT 0.00,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT paquets_techniques_uk_ptech_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS participation_formation (
  id_participation integer GENERATED ALWAYS AS IDENTITY,
  id_formation integer NOT NULL,
  id_beneficiaire integer NOT NULL,
  present boolean DEFAULT true,
  note_test integer DEFAULT NULL,
  satisfait boolean DEFAULT false,
  commentaire text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_participation),
  CONSTRAINT participation_formation_unique_participation UNIQUE (id_formation,id_beneficiaire)
);

CREATE INDEX IF NOT EXISTS participation_formation_id_beneficiaire ON participation_formation (id_beneficiaire);

CREATE TABLE IF NOT EXISTS periode (
  id_periode integer GENERATED ALWAYS AS IDENTITY,
  type_periode text NOT NULL,
  annee integer NOT NULL,
  numero integer NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  est_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_periode),
  CONSTRAINT periode_unique_periode UNIQUE (type_periode,annee,numero),
  CHECK (type_periode IN ('trimestre','semestre','annee'))
);

CREATE TABLE IF NOT EXISTS plainte_grm (
  id_plainte integer GENERATED ALWAYS AS IDENTITY,
  numero_plainte varchar(50) NOT NULL,
  id_type_plainte integer NOT NULL,
  id_beneficiaire integer DEFAULT NULL,
  id_localisation integer NOT NULL,
  id_utilisateur integer DEFAULT NULL,
  description text NOT NULL,
  date_reception timestamptz DEFAULT now(),
  date_traitement timestamptz DEFAULT NULL,
  statut text DEFAULT 'recue',
  id_prise_charge integer DEFAULT NULL,
  resolution text,
  est_confidentiel boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  delai_traite integer NOT NULL,
  PRIMARY KEY (id_plainte),
  CONSTRAINT plainte_grm_numero_plainte UNIQUE (numero_plainte),
  CHECK (statut IN ('recue','en_cours','referee','traitee','cloturee'))
);

CREATE INDEX IF NOT EXISTS plainte_grm_id_beneficiaire ON plainte_grm (id_beneficiaire);
CREATE INDEX IF NOT EXISTS plainte_grm_id_localisation ON plainte_grm (id_localisation);
CREATE INDEX IF NOT EXISTS plainte_grm_id_utilisateur ON plainte_grm (id_utilisateur);
CREATE INDEX IF NOT EXISTS plainte_grm_id_prise_charge ON plainte_grm (id_prise_charge);
CREATE INDEX IF NOT EXISTS plainte_grm_idx_plainte_statut ON plainte_grm (statut);
CREATE INDEX IF NOT EXISTS plainte_grm_idx_plainte_type ON plainte_grm (id_type_plainte);
CREATE INDEX IF NOT EXISTS plainte_grm_idx_plainte_date ON plainte_grm (date_reception);

CREATE TRIGGER trg_plainte_grm_updated_at BEFORE UPDATE ON plainte_grm
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS plan_contingence (
  id_plan integer GENERATED ALWAYS AS IDENTITY,
  code_plan varchar(50) NOT NULL,
  nom_plan varchar(200) NOT NULL,
  province varchar(100) NOT NULL,
  date_approbation date DEFAULT NULL,
  date_expiration date DEFAULT NULL,
  fichier_url varchar(500),
  est_actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_plan),
  CONSTRAINT plan_contingence_code_plan UNIQUE (code_plan)
);

CREATE TRIGGER trg_plan_contingence_updated_at BEFORE UPDATE ON plan_contingence
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS powerbi_dashboards (
  id varchar(32) NOT NULL,
  name varchar(255) NOT NULL,
  description text NOT NULL,
  embed_url varchar(512) NOT NULL,
  dashboard_id varchar(128) NOT NULL,
  category varchar(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT powerbi_dashboards_uq_powerbi_dashboards_dashboard_id UNIQUE (dashboard_id)
);

CREATE TABLE IF NOT EXISTS powerbi_reports (
  id varchar(32) NOT NULL,
  name varchar(255) NOT NULL,
  description text NOT NULL,
  embed_url varchar(512) NOT NULL,
  report_id varchar(128) NOT NULL,
  dataset_id varchar(128) NOT NULL,
  category varchar(64) NOT NULL,
  thumbnail_url varchar(512),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT powerbi_reports_uq_powerbi_reports_report_id UNIQUE (report_id)
);

CREATE TRIGGER trg_powerbi_reports_updated_at BEFORE UPDATE ON powerbi_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS prise_en_charge (
  id_prise_charge integer GENERATED ALWAYS AS IDENTITY,
  nom_organisme varchar(200) NOT NULL,
  type_service varchar(100) NOT NULL,
  telephone varchar(20),
  email varchar(100),
  province varchar(100),
  adresse text,
  est_actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_prise_charge)
);

CREATE TABLE IF NOT EXISTS profil (
  id_profil integer GENERATED ALWAYS AS IDENTITY,
  nom_profil varchar(50) NOT NULL,
  niveau_acces integer DEFAULT 1,
  description text,
  est_actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_profil),
  CONSTRAINT profil_nom_profil UNIQUE (nom_profil)
);

CREATE TRIGGER trg_profil_updated_at BEFORE UPDATE ON profil
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS provinces (
  id varchar(64) NOT NULL,
  name varchar(128) NOT NULL,
  code varchar(16) NOT NULL,
  region varchar(64) NOT NULL,
  population bigint NOT NULL DEFAULT 0,
  progression integer NOT NULL DEFAULT 0,
  performance_score integer NOT NULL DEFAULT 0,
  progression_delta integer NOT NULL DEFAULT 0,
  beneficiaires jsonb NOT NULL,
  production jsonb NOT NULL,
  infrastructures jsonb NOT NULL,
  indicateurs jsonb NOT NULL,
  risques jsonb NOT NULL,
  plaintes jsonb NOT NULL,
  dernier_suivi date NOT NULL,
  coord_lat numeric(10,6) DEFAULT NULL,
  coord_lng numeric(10,6) DEFAULT NULL,
  PRIMARY KEY (id),
  CONSTRAINT provinces_uq_provinces_code UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS province_evolution (
  id integer GENERATED ALWAYS AS IDENTITY,
  province_id varchar(64) NOT NULL,
  mois varchar(16) NOT NULL,
  beneficiaires integer NOT NULL DEFAULT 0,
  production integer NOT NULL DEFAULT 0,
  routes integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS province_evolution_idx_province_evolution_province ON province_evolution (province_id);

CREATE TABLE IF NOT EXISTS recap_beneficiaires_province (
  province varchar(100) NOT NULL,
  total_beneficiaires integer DEFAULT 0,
  femmes integer DEFAULT 0,
  hommes integer DEFAULT 0,
  jeunes integer DEFAULT 0,
  last_refresh timestamptz DEFAULT now(),
  PRIMARY KEY (province)
);

CREATE TABLE IF NOT EXISTS risque (
  id_risque integer GENERATED ALWAYS AS IDENTITY,
  code_risque varchar(50) NOT NULL,
  id_type_risque integer NOT NULL,
  description text NOT NULL,
  probabilite integer DEFAULT NULL,
  impact integer DEFAULT NULL,
  id_localisation integer DEFAULT NULL,
  date_identification date NOT NULL,
  date_cloture date DEFAULT NULL,
  statut text DEFAULT 'identifie',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  niveau varchar(20),
  PRIMARY KEY (id_risque),
  CONSTRAINT risque_code_risque UNIQUE (code_risque),
  CHECK (statut IN ('identifie','en_cours','atténue','cloture'))
);

CREATE INDEX IF NOT EXISTS risque_id_type_risque ON risque (id_type_risque);
CREATE INDEX IF NOT EXISTS risque_id_localisation ON risque (id_localisation);

CREATE TRIGGER trg_risque_updated_at BEFORE UPDATE ON risque
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS risques (
  id integer GENERATED ALWAYS AS IDENTITY,
  code varchar(64) NOT NULL,
  nom varchar(255) NOT NULL,
  description text,
  categorie varchar(64) NOT NULL,
  probabilite text NOT NULL,
  impact text NOT NULL,
  niveau varchar(32) NOT NULL,
  statut varchar(32) NOT NULL,
  plan_attenuation text,
  responsable varchar(255),
  date_identification date NOT NULL,
  date_cloture date DEFAULT NULL,
  province varchar(128),
  actions_prevues text,
  indicateurs_surveillance text,
  dernier_suivi date DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT risques_uq_risques_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS risques_idx_risques_niveau ON risques (niveau);
CREATE INDEX IF NOT EXISTS risques_idx_risques_statut ON risques (statut);
CREATE INDEX IF NOT EXISTS risques_idx_risques_province ON risques (province);

CREATE TRIGGER trg_risques_updated_at BEFORE UPDATE ON risques
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS risque_actions (
  id integer GENERATED ALWAYS AS IDENTITY,
  id_risque integer NOT NULL,
  action text NOT NULL,
  responsable varchar(255) NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  statut varchar(32) NOT NULL,
  resultat text,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS risque_actions_idx_risque_actions_risque ON risque_actions (id_risque);

CREATE TABLE IF NOT EXISTS risque_alertes (
  id integer GENERATED ALWAYS AS IDENTITY,
  id_risque integer NOT NULL,
  message text NOT NULL,
  date_alerte date NOT NULL,
  est_lue boolean NOT NULL DEFAULT false,
  niveau varchar(16) NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS risque_alertes_idx_risque_alertes_risque ON risque_alertes (id_risque);

CREATE TABLE IF NOT EXISTS sous_composante (
  id_sous_composante integer GENERATED ALWAYS AS IDENTITY,
  id_composante integer NOT NULL,
  code_sous_composante varchar(20) NOT NULL,
  nom_sous_composante varchar(200) NOT NULL,
  ordre integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_sous_composante),
  CONSTRAINT sous_composante_unique_sous_composante UNIQUE (id_composante,code_sous_composante)
);

CREATE TRIGGER trg_sous_composante_updated_at BEFORE UPDATE ON sous_composante
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS subvention (
  id_subvention integer GENERATED ALWAYS AS IDENTITY,
  code_subvention varchar(50) NOT NULL,
  id_type_subvention integer NOT NULL,
  id_beneficiaire integer NOT NULL,
  montant_total numeric(15,2) NOT NULL,
  date_approbation date NOT NULL,
  date_debut date DEFAULT NULL,
  date_fin date DEFAULT NULL,
  statut text DEFAULT 'approuvee',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_subvention),
  CONSTRAINT subvention_code_subvention UNIQUE (code_subvention),
  CHECK (statut IN ('approuvee','active','suspendue','terminee'))
);

CREATE INDEX IF NOT EXISTS subvention_id_type_subvention ON subvention (id_type_subvention);
CREATE INDEX IF NOT EXISTS subvention_id_beneficiaire ON subvention (id_beneficiaire);

CREATE TRIGGER trg_subvention_updated_at BEFORE UPDATE ON subvention
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS suivi_missions (
  id integer NOT NULL,
  num varchar(32) NOT NULL,
  section integer NOT NULL,
  section_label varchar(255) NOT NULL,
  nature_mission text NOT NULL,
  objectif text,
  hors_projet integer NOT NULL DEFAULT 0,
  projet integer NOT NULL DEFAULT 0,
  montant_usd numeric(12,2) NOT NULL DEFAULT 0.00,
  dates varchar(64),
  avance_usd numeric(12,2) NOT NULL DEFAULT 0.00,
  solde numeric(12,2) NOT NULL DEFAULT 0.00,
  province varchar(128) NOT NULL,
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS suivi_missions_idx_suivi_missions_province ON suivi_missions (province);

CREATE TABLE IF NOT EXISTS theme_formation (
  id_theme integer GENERATED ALWAYS AS IDENTITY,
  nom_theme varchar(100) NOT NULL,
  duree_standard integer DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_theme),
  CONSTRAINT theme_formation_nom_theme UNIQUE (nom_theme)
);

CREATE TABLE IF NOT EXISTS tranche_subvention (
  id_tranche integer GENERATED ALWAYS AS IDENTITY,
  id_subvention integer NOT NULL,
  numero_tranche integer NOT NULL,
  montant numeric(15,2) NOT NULL,
  date_versement date DEFAULT NULL,
  conditions_remplies text,
  statut text DEFAULT 'prevue',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_tranche),
  CONSTRAINT tranche_subvention_unique_tranche UNIQUE (id_subvention,numero_tranche),
  CHECK (statut IN ('prevue','versee','annulee'))
);

CREATE TABLE IF NOT EXISTS type_infrastructure (
  id_type_infrastructure integer GENERATED ALWAYS AS IDENTITY,
  nom_type varchar(100) NOT NULL,
  unite_mesure varchar(20),
  description text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_type_infrastructure),
  CONSTRAINT type_infrastructure_nom_type UNIQUE (nom_type)
);

CREATE TABLE IF NOT EXISTS type_plainte (
  id_type_plainte integer GENERATED ALWAYS AS IDENTITY,
  nom_type varchar(100) NOT NULL,
  description text,
  delai_traitement integer DEFAULT 30,
  est_sensible boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_type_plainte),
  CONSTRAINT type_plainte_nom_type UNIQUE (nom_type)
);

CREATE TABLE IF NOT EXISTS type_risque (
  id_type_risque integer GENERATED ALWAYS AS IDENTITY,
  nom_type varchar(50) NOT NULL,
  categorie text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_type_risque),
  CONSTRAINT type_risque_nom_type UNIQUE (nom_type),
  CHECK (categorie IN ('gestion','technique','politique','socio_economique','environnemental','sante_securite'))
);

CREATE TABLE IF NOT EXISTS type_subvention (
  id_type_subvention integer GENERATED ALWAYS AS IDENTITY,
  nom_type varchar(100) NOT NULL,
  montant_max numeric(15,2) DEFAULT NULL,
  conditions text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_type_subvention),
  CONSTRAINT type_subvention_nom_type UNIQUE (nom_type)
);

CREATE TABLE IF NOT EXISTS utilisateur (
  id_utilisateur integer GENERATED ALWAYS AS IDENTITY,
  nom varchar(100) NOT NULL,
  prenom varchar(100),
  email varchar(150) NOT NULL,
  mot_de_passe varchar(255) NOT NULL,
  telephone varchar(20),
  id_profil integer NOT NULL,
  id_localisation integer DEFAULT NULL,
  dernier_connexion timestamptz DEFAULT NULL,
  est_actif boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (id_utilisateur),
  CONSTRAINT utilisateur_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS utilisateur_id_localisation ON utilisateur (id_localisation);
CREATE INDEX IF NOT EXISTS utilisateur_idx_utilisateur_email ON utilisateur (email);
CREATE INDEX IF NOT EXISTS utilisateur_idx_utilisateur_profil ON utilisateur (id_profil);

CREATE TRIGGER trg_utilisateur_updated_at BEFORE UPDATE ON utilisateur
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS valeur_indicateur (
  id_valeur integer GENERATED ALWAYS AS IDENTITY,
  id_indicateur integer NOT NULL,
  id_periode integer NOT NULL,
  id_localisation integer DEFAULT NULL,
  valeur_reference numeric(15,2) DEFAULT NULL,
  valeur_cible numeric(15,2) DEFAULT NULL,
  valeur_reelle numeric(15,2) DEFAULT NULL,
  commentaire text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ecart numeric(15,2),
  taux_realisation numeric(5,2),
  PRIMARY KEY (id_valeur),
  CONSTRAINT valeur_indicateur_unique_valeur UNIQUE (id_indicateur,id_periode,id_localisation)
);

CREATE INDEX IF NOT EXISTS valeur_indicateur_id_periode ON valeur_indicateur (id_periode);
CREATE INDEX IF NOT EXISTS valeur_indicateur_id_localisation ON valeur_indicateur (id_localisation);

CREATE TRIGGER trg_valeur_indicateur_updated_at BEFORE UPDATE ON valeur_indicateur
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ventes_semences (
  id integer GENERATED ALWAYS AS IDENTITY,
  rna_id varchar(64) NOT NULL,
  province varchar(128),
  producteur_nom varchar(255),
  type_semence varchar(255) NOT NULL,
  quantite_kg numeric(12,2) NOT NULL DEFAULT 0.00,
  montant_usd numeric(12,2) NOT NULL DEFAULT 0.00,
  montant_cdf numeric(15,2) DEFAULT NULL,
  fournisseur varchar(255),
  date_vente date NOT NULL,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS ventes_semences_idx_ventes_semences_rna_id ON ventes_semences (rna_id);
CREATE INDEX IF NOT EXISTS ventes_semences_idx_ventes_semences_province ON ventes_semences (province);
CREATE INDEX IF NOT EXISTS ventes_semences_idx_ventes_semences_type_semence ON ventes_semences (type_semence);
CREATE INDEX IF NOT EXISTS ventes_semences_idx_ventes_semences_date_vente ON ventes_semences (date_vente);

CREATE TRIGGER trg_ventes_semences_updated_at BEFORE UPDATE ON ventes_semences
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
