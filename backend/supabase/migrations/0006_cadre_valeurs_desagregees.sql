-- =============================================================================
-- 0006 — Le cadre de resultats passe des colonnes aux lignes
-- =============================================================================
--
-- Etat avant cette migration
-- --------------------------
-- cadre_resultats porte ses valeurs en colonnes : prevu_2023 ... realise_2027.
-- Consequences :
--   * ajouter une annee de projet impose un ALTER TABLE ;
--   * il n'existe aucune dimension province ni sexe — la desagregation n'est
--     qu'un texte libre dans la colonne desagrege_par ;
--   * l'axe sexe est porte en DUPLIQUANT l'indicateur (4 lignes « — Femmes »),
--     sans aucune cle vers la ligne mere. Rien ne peut donc detecter qu'un
--     sous-total contredit son total. C'est exactement ce qui s'est produit sur
--     IR1.1.6, ou le sous-total femmes recopie le total et fait dire au systeme
--     que 100 % des beneficiaires directs sont des femmes.
--
-- Ce que fait cette migration
-- ---------------------------
--   1. rattache les 4 lignes « — Femmes » a leur indicateur mere ;
--   2. cree cadre_valeur : une ligne par (indicateur, annee, province, sexe) ;
--   3. y recopie l'integralite des valeurs existantes, sans en corriger aucune.
--
-- Ce qu'elle ne fait pas
-- ----------------------
-- Elle ne corrige AUCUNE donnee et ne supprime AUCUNE colonne. cadre_resultats
-- reste intacte et l'API continue de la lire : rien ne casse. Les anomalies sont
-- recopiees telles quelles, puis signalees par scripts/controle-cadre.ts. Leur
-- correction demande une decision de l'UNCP et une nouvelle version officielle
-- du classeur, pas une retouche en base.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Rattachement des desagregations a leur indicateur mere
-- -----------------------------------------------------------------------------
alter table cadre_resultats
  add column if not exists code_parent             text,
  add column if not exists axe_desagregation       text,
  add column if not exists modalite_desagregation  text;

comment on column cadre_resultats.code_parent is
  'Renseigne quand cette ligne est la desagregation d''un autre indicateur et non un indicateur autonome. Vestige de la saisie Excel : a terme ces lignes disparaissent au profit de lignes de cadre_valeur portant sexe = ''F''.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cadre_resultats_code_parent_fkey') then
    alter table cadre_resultats
      add constraint cadre_resultats_code_parent_fkey
      foreign key (code_parent) references cadre_resultats(code) on update cascade;
  end if;
end $$;

update cadre_resultats set code_parent = 'IODP2.1.1', axe_desagregation = 'sexe', modalite_desagregation = 'F' where code = 'IODP2.1.2';
update cadre_resultats set code_parent = 'IR1.1.1.1', axe_desagregation = 'sexe', modalite_desagregation = 'F' where code = 'IR1.1.1.2';
update cadre_resultats set code_parent = 'IR1.1.3.1', axe_desagregation = 'sexe', modalite_desagregation = 'F' where code = 'IR1.1.3.2';
update cadre_resultats set code_parent = 'IR1.1.6.1', axe_desagregation = 'sexe', modalite_desagregation = 'F' where code = 'IR1.1.6.2';

-- -----------------------------------------------------------------------------
-- 2. cadre_valeur — une ligne par point de mesure
-- -----------------------------------------------------------------------------
create table if not exists cadre_valeur (
  id           bigserial primary key,

  code_cadre   text     not null references cadre_resultats(code) on update cascade,
  annee        smallint not null check (annee between 2020 and 2040),
  -- NULL = national. Sinon provinces.name (« Kwilu », « Kasaï Central », ...).
  province     text,
  -- NULL = tous sexes. Sinon 'F' ou 'M'.
  sexe         char(1)  check (sexe in ('F', 'M')),

  cible        numeric,
  realise      numeric,

  -- Cycle de validation. Tout l'existant arrive en 'consolide' : ces valeurs
  -- viennent du classeur officiel, elles ne repassent pas par le terrain.
  statut       text not null default 'brouillon'
               check (statut in ('brouillon', 'soumis', 'controle_ot', 'valide_upep', 'consolide')),

  -- Tracabilite : d'ou vient le chiffre, qui l'a saisi, qui l'a valide.
  source       text,
  commentaire  text,
  saisi_par    integer,
  valide_par   integer,
  valide_le    timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table cadre_valeur is
  'Valeurs du cadre de resultats, une ligne par indicateur x annee x province x sexe. Remplace les colonnes prevu_20xx / realise_20xx de cadre_resultats, qui restent en place le temps de la bascule de l''API.';
comment on column cadre_valeur.province is 'NULL = valeur nationale. Sinon le nom de province tel qu''il figure dans provinces.name.';
comment on column cadre_valeur.sexe is 'NULL = tous sexes confondus. La ligne totale et la ligne femmes coexistent donc, et leur coherence devient verifiable.';

-- NULLS NOT DISTINCT : sans cela, PostgreSQL considere deux lignes nationales
-- (province NULL, sexe NULL) comme differentes et autorise les doublons.
create unique index if not exists cadre_valeur_cle
  on cadre_valeur (code_cadre, annee, province, sexe) nulls not distinct;

create index if not exists cadre_valeur_code_annee on cadre_valeur (code_cadre, annee);
create index if not exists cadre_valeur_province   on cadre_valeur (province) where province is not null;

-- -----------------------------------------------------------------------------
-- 3. Reprise des valeurs existantes
-- -----------------------------------------------------------------------------

-- 3a. Valeurs nationales, tous sexes : les 28 indicateurs qui ne sont pas une
--     desagregation. Les colonnes annuelles sont depliees en lignes.
insert into cadre_valeur (code_cadre, annee, province, sexe, cible, realise, statut, source)
select c.code, a.annee, null, null, a.cible, a.realise, 'consolide',
       'Reprise 0006 depuis cadre_resultats.prevu_/realise_' || a.annee
  from cadre_resultats c
 cross join lateral (values
    (2023::smallint, c.prevu_2023, c.realise_2023),
    (2024::smallint, c.prevu_2024, c.realise_2024),
    (2025::smallint, c.prevu_2025, c.realise_2025),
    (2026::smallint, c.prevu_2026, c.realise_2026),
    (2027::smallint, c.prevu_2027, c.realise_2027)
 ) as a(annee, cible, realise)
 where c.code_parent is null
   and (a.cible is not null or a.realise is not null)
on conflict do nothing;

-- 3b. Les 4 lignes « — Femmes » deviennent des lignes sexe = 'F' de leur mere.
--     C'est ici que le doublon d'indicateur disparait : la valeur femmes vient
--     se ranger sous le meme code que le total, et devient comparable.
insert into cadre_valeur (code_cadre, annee, province, sexe, cible, realise, statut, source)
select c.code_parent, a.annee, null, 'F', a.cible, a.realise, 'consolide',
       'Reprise 0006 depuis ' || c.code || ' (ligne « — Femmes » de l''ancien modele)'
  from cadre_resultats c
 cross join lateral (values
    (2023::smallint, c.prevu_2023, c.realise_2023),
    (2024::smallint, c.prevu_2024, c.realise_2024),
    (2025::smallint, c.prevu_2025, c.realise_2025),
    (2026::smallint, c.prevu_2026, c.realise_2026),
    (2027::smallint, c.prevu_2027, c.realise_2027)
 ) as a(annee, cible, realise)
 where c.code_parent is not null
   and c.axe_desagregation = 'sexe'
   and (a.cible is not null or a.realise is not null)
on conflict do nothing;

-- 3c. Cibles provinciales. Elles sont reprises telles quelles mais restent
--     douteuses : la plupart portent la province « Kasaï Central » avec la
--     valeur nationale, et celles d'IR1.1.6.2 recopient celles d'IR1.1.6.1.
--     controle-cadre.ts les signale ; c'est a l'UNCP de trancher.
insert into cadre_valeur (code_cadre, annee, province, sexe, cible, statut, source, commentaire)
select coalesce(c.code_parent, p.code_cadre),
       p.annee::smallint,
       p.province,
       case when c.axe_desagregation = 'sexe' then c.modalite_desagregation::char(1) end,
       p.cible,
       'consolide',
       'Reprise 0006 depuis cadre_cibles_provinciales',
       'Cible provinciale a verifier : voir le rapport de controle du cadre.'
  from cadre_cibles_provinciales p
  join cadre_resultats c on c.code = p.code_cadre
on conflict do nothing;

commit;

-- =============================================================================
-- Note sur final_prevu / final_realise
-- =============================================================================
-- Ces deux colonnes ne sont pas reprises : sur les lignes verifiees, final_prevu
-- reproduit exactement prevu_2027 (30/30, 300000/300000, 150000/150000). Il
-- s'agit de la cible de fin de projet, deja portee par l'annee 2027. Les
-- conserver dans le nouveau modele reintroduirait deux sources pour un meme
-- chiffre. Elles restent dans cadre_resultats et controle-cadre.ts signale tout
-- ecart entre les deux.
-- =============================================================================
