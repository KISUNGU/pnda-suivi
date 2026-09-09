-- Lien entre une collecte terrain et l'agent collecteur qui l'a saisie
ALTER TABLE donnee_collectee ADD COLUMN IF NOT EXISTS id_agent integer;
CREATE INDEX IF NOT EXISTS donnee_collectee_idx_id_agent ON donnee_collectee (id_agent);

-- Distinguer formation / sensibilisation et rattacher une province pour le module Environnement/VBG
ALTER TABLE formation ADD COLUMN IF NOT EXISTS type varchar(32) NOT NULL DEFAULT 'formation';
ALTER TABLE formation ADD COLUMN IF NOT EXISTS province varchar(128);

CREATE TABLE IF NOT EXISTS indicateur_environnemental (
  id integer GENERATED ALWAYS AS IDENTITY,
  code varchar(32) NOT NULL,
  nom varchar(255) NOT NULL,
  description text,
  categorie varchar(32) NOT NULL DEFAULT 'environnement',
  unite varchar(32) NOT NULL DEFAULT 'nombre',
  valeur_actuelle numeric(15,2) NOT NULL DEFAULT 0,
  valeur_cible numeric(15,2) NOT NULL DEFAULT 0,
  tendance varchar(16) NOT NULL DEFAULT 'stable',
  periode varchar(32),
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CONSTRAINT indicateur_environnemental_code UNIQUE (code),
  CHECK (categorie IN ('environnement','vbg','eas','hs')),
  CHECK (tendance IN ('hausse','baisse','stable'))
);

CREATE TRIGGER trg_indicateur_environnemental_updated_at BEFORE UPDATE ON indicateur_environnemental
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS aide_article (
  id integer GENERATED ALWAYS AS IDENTITY,
  titre varchar(255) NOT NULL,
  contenu text NOT NULL,
  categorie varchar(32) NOT NULL DEFAULT 'guide',
  tags jsonb NOT NULL DEFAULT '[]',
  auteur varchar(128),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TRIGGER trg_aide_article_updated_at BEFORE UPDATE ON aide_article
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS aide_faq (
  id integer GENERATED ALWAYS AS IDENTITY,
  question text NOT NULL,
  reponse text NOT NULL,
  categorie varchar(64),
  popularite integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS aide_tutoriel (
  id integer GENERATED ALWAYS AS IDENTITY,
  titre varchar(255) NOT NULL,
  description text,
  duree varchar(32),
  niveau varchar(32) NOT NULL DEFAULT 'debutant',
  video_url text,
  etapes jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id),
  CHECK (niveau IN ('debutant','intermediaire','avance'))
);

CREATE TABLE IF NOT EXISTS aide_demande (
  id integer GENERATED ALWAYS AS IDENTITY,
  sujet varchar(255) NOT NULL,
  message text NOT NULL,
  email varchar(255) NOT NULL,
  statut varchar(32) NOT NULL DEFAULT 'nouvelle',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Réglages applicatifs génériques, stockés en clé/valeur JSON (une ligne par section)
CREATE TABLE IF NOT EXISTS configuration (
  cle varchar(64) NOT NULL,
  valeur jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cle)
);
