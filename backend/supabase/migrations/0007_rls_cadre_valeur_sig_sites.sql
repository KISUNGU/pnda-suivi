-- =============================================================================
-- 0007 — Aligner cadre_valeur et sig_sites sur la posture RLS du reste du schema
-- =============================================================================
--
-- Etat constate : RLS est active sur 68 des 71 tables de public, avec ZERO
-- policy. En PostgreSQL, RLS active sans policy interdit tout acces. Le backend
-- fonctionne parce qu'il se connecte avec le proprietaire de la base, qui
-- contourne RLS ; tout client passant par les cles anon ou authenticated de
-- Supabase se voit, lui, integralement refuse.
--
-- Autrement dit, RLS ne porte aujourd'hui aucune regle metier : c'est un refus
-- global que l'API contourne. Le cloisonnement provincial repose donc
-- entierement sur middleware/scope.ts, sans seconde ligne de defense.
--
-- Cette migration ne change pas cette posture — la definir est un chantier de
-- Phase 6. Elle se contente d'y aligner les trois tables qui y echappaient, pour
-- que cadre_valeur, qui portera les valeurs du cadre, ne soit pas la seule table
-- ouverte du schema.
-- =============================================================================

alter table cadre_valeur enable row level security;
alter table sig_sites    enable row level security;

comment on table cadre_valeur is
  'Valeurs du cadre de resultats, une ligne par indicateur x annee x province x sexe. RLS active sans policy, comme le reste du schema : seul le proprietaire de la base y accede, et le cloisonnement provincial est applique par l''API (middleware/scope.ts). Definir de vraies policies est un chantier de Phase 6.';
