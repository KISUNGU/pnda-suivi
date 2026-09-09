-- =============================================================================
-- 0009 — Ne pas effacer ce que le rapport ne couvre pas
-- =============================================================================
--
-- Correctif de 0008. Le rapport d'avancement fait foi pour ce qu'il ENONCE,
-- pas pour ce qu'il tait. 0008 recopiait sa colonne « realise » y compris
-- lorsqu'elle etait vide, ce qui effacait 8 realisations 2025 deja connues —
-- dont IR2.2.2, qui valait 890 AVEC appuyees.
--
-- « Les resultats sont evolutifs, le dernier rapport fait foi » veut dire que
-- le dernier rapport MET A JOUR ce qu'il traite. Une cellule vide n'est pas une
-- valeur nulle : c'est une absence de mise a jour.
--
-- Les valeurs restaurees gardent leur source d'origine et n'ont PAS de date de
-- mesure : leur date est inconnue, et c'est exactement ce que le systeme doit
-- pouvoir dire. Elles ne doivent pas etre lues comme etant au 30/11/2025.
-- =============================================================================

begin;

update cadre_valeur set realise = 890, source = 'Feuille de synthese du classeur v6 (date de mesure inconnue)'
 where code_cadre = 'IR2.2.2' and annee = 2025 and province is null and sexe is null;

update cadre_valeur set realise = 0, source = 'Feuille de synthese du classeur v6 (date de mesure inconnue)'
 where annee = 2025 and province is null and sexe is null and realise is null
   and code_cadre in ('IR2.1.1', 'IR2.1.2', 'IR2.2.3', 'IR2.2.4', 'IR2.2.7', 'IR3.1.2', 'IR3.1.6');

commit;
