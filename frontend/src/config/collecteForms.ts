// frontend/src/config/collecteForms.ts

// Définition des types
export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'datetime' | 'textarea' | 'checkbox' | 'radio' | 'photo' | 'signature';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  dependsOn?: {
    field: string;
    value: any;
  };
}

export interface CollecteForm {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'production' | 'adoption' | 'plainte' | 'satisfaction' | 'suivi';
  icon: string;
  fields: FormField[];
  isActive: boolean;
}

// Données des formulaires
export const collecteForms: CollecteForm[] = [
  {
    id: 'enquete_production',
    name: 'Enquête de production agricole',
    description: 'Collecte des données de production par exploitation',
    version: '1.0',
    category: 'production',
    icon: 'agriculture',
    isActive: true,
    fields: [
      { id: 'rna_id', label: 'ID RNA', type: 'text', required: true, placeholder: 'RNA-XXXXX' },
      { id: 'nom_exploitant', label: 'Nom de l\'exploitant', type: 'text', required: true },
      { id: 'prenom_exploitant', label: 'Prénom de l\'exploitant', type: 'text', required: true },
      { id: 'sexe', label: 'Sexe', type: 'select', required: true, options: [
        { value: 'M', label: 'Homme' },
        { value: 'F', label: 'Femme' },
      ] },
      { id: 'culture', label: 'Culture', type: 'select', required: true, options: [
        { value: 'mais', label: 'Maïs' },
        { value: 'manioc', label: 'Manioc' },
        { value: 'arachide', label: 'Arachide' },
        { value: 'riz', label: 'Riz' },
        { value: 'soja', label: 'Soja' },
      ] },
      { id: 'superficie', label: 'Superficie cultivée (ha)', type: 'number', required: true, validation: { min: 0, max: 100 } },
      { id: 'production', label: 'Production totale (kg)', type: 'number', required: true, validation: { min: 0 } },
      { id: 'quantite_vendue', label: 'Quantité vendue (kg)', type: 'number', validation: { min: 0 } },
      { id: 'prix_unitaire', label: 'Prix unitaire (FC/kg)', type: 'number', validation: { min: 0 } },
      { id: 'marche_vente', label: 'Marché de vente', type: 'select', options: [
        { value: 'formel', label: 'Marché formel' },
        { value: 'informel', label: 'Marché informel' },
        { value: 'cooperative', label: 'Coopérative' },
      ] },
      { id: 'photos', label: 'Photos du champ', type: 'photo' },
    ],
  },
  {
    // FICHE ADOPTION AMENDÉE — « Fiche d'enquête de suivi individuel des champs des PEA »
    id: 'adoption_technologie',
    name: 'Fiche d\'adoption — Suivi individuel des champs PEA',
    description: 'Évaluer le niveau d\'adoption des techniques agricoles promues par le projet et apprécier leur application dans les champs des PEA (Kwilu – Kasaï – Kasaï Central)',
    version: '2.0',
    category: 'adoption',
    icon: 'science',
    isActive: true,
    fields: [
      // I. Identification de l'enquête
      { id: 'code_enqueteur', label: 'Code de l\'enquêteur', type: 'text', required: true },
      { id: 'nom_enqueteur', label: 'Nom de l\'enquêteur / Animateur communautaire', type: 'text', required: true },
      { id: 'date_enquete', label: 'Date de l\'enquête', type: 'date', required: true },
      { id: 'composante', label: 'Composante du projet', type: 'select', required: true, options: [
        { value: 'productivite_agricole', label: 'Productivité Agricole' },
      ] },
      { id: 'saison', label: 'Saison agricole', type: 'select', required: true, options: [
        { value: 'A-2026', label: 'A-2026' },
        { value: 'B-2026', label: 'B-2026' },
        { value: 'A-2027', label: 'A-2027' },
        { value: 'B-2027', label: 'B-2027' },
      ] },
      // II. Identification du producteur
      { id: 'rna_id', label: 'Numéro d\'identification du PEA', type: 'text', required: true, placeholder: 'RNA-XXXXX' },
      { id: 'nom_producteur', label: 'Nom et prénom du producteur', type: 'text', required: true },
      { id: 'sexe', label: 'Sexe', type: 'select', required: true, options: [
        { value: 'M', label: 'Homme' },
        { value: 'F', label: 'Femme' },
      ] },
      { id: 'telephone', label: 'Téléphone (si disponible)', type: 'text' },
      { id: 'province', label: 'Province', type: 'select', required: true, options: [
        { value: 'kwilu', label: 'Kwilu' },
        { value: 'kasai', label: 'Kasaï' },
        { value: 'kasai_central', label: 'Kasaï Central' },
      ] },
      { id: 'territoire', label: 'Territoire', type: 'text', required: true },
      { id: 'secteur', label: 'Secteur', type: 'text' },
      { id: 'groupement', label: 'Groupement', type: 'text' },
      { id: 'village', label: 'Village / Localité', type: 'text', required: true },
      { id: 'organisation_paysanne', label: 'Organisation paysanne / AVEC', type: 'text' },
      // III. Informations sur le champ visité
      { id: 'date_visite', label: 'Date de la visite', type: 'date', required: true },
      { id: 'culture', label: 'Culture observée', type: 'select', required: true, options: [
        { value: 'mais', label: 'Maïs' },
        { value: 'soja', label: 'Soja' },
        { value: 'niebe', label: 'Niébé' },
        { value: 'manioc', label: 'Manioc' },
        { value: 'arachide', label: 'Arachide' },
        { value: 'autre', label: 'Autre' },
      ] },
      { id: 'culture_autre', label: 'Autre culture (préciser)', type: 'text', dependsOn: { field: 'culture', value: 'autre' } },
      { id: 'superficie', label: 'Superficie du champ (ha)', type: 'number', required: true, validation: { min: 0, max: 100 } },
      { id: 'gps_latitude', label: 'Coordonnées GPS — Latitude', type: 'number', validation: { min: -90, max: 90 } },
      { id: 'gps_longitude', label: 'Coordonnées GPS — Longitude', type: 'number', validation: { min: -180, max: 180 } },
      { id: 'photos', label: 'Photo du champ', type: 'photo' },
      { id: 'stade_phenologique', label: 'Stade phénologique de la culture', type: 'select', required: true, options: [
        { value: 'preparation_sol', label: 'Préparation du sol' },
        { value: 'semis', label: 'Semis' },
        { value: 'croissance', label: 'Croissance végétative' },
        { value: 'floraison', label: 'Floraison' },
        { value: 'fructification', label: 'Fructification' },
        { value: 'recolte', label: 'Récolte' },
      ] },
      // IV. Évaluation de l'adoption des techniques (0 = non appliquée, 1 = partielle, 2 = correcte)
      ...([
        ['tech_non_incineration', 'Non-incinération du champ'],
        ['tech_biofertilisants', 'Utilisation de biofertilisants'],
        ['tech_rotation_cultures', 'Rotation des cultures'],
        ['tech_association_cultures', 'Association des cultures'],
        ['tech_bio_insecticides', 'Utilisation de bio-insecticides'],
        ['tech_semis_ligne', 'Semis en ligne'],
        ['tech_ecartements', 'Respect des écartements recommandés'],
        ['tech_sarclage_temps', 'Sarclage effectué à temps'],
        ['tech_nb_sarclages', 'Nombre de sarclages conforme'],
        ['tech_paillage', 'Paillage'],
        ['tech_buttage', 'Buttage'],
        ['tech_billonnage', 'Billonnage'],
        ['tech_mais_mucuna', 'Association Maïs–Mucuna'],
        ['tech_semences_ameliorees', 'Utilisation de semences améliorées'],
        ['tech_autre', 'Autre technique (préciser)'],
      ] as Array<[string, string]>).map(([id, label]): FormField => ({
        id,
        label,
        type: 'radio',
        options: [
          { value: '0', label: '0 — Non appliquée' },
          { value: '1', label: '1 — Partiellement appliquée' },
          { value: '2', label: '2 — Correctement appliquée' },
        ],
      })),
      { id: 'technique_observee', label: 'Technique observée', type: 'textarea' },
      // V. Calcul du taux d'adoption
      { id: 'nb_techniques_evaluees', label: 'Nombre total de techniques évaluées', type: 'number', validation: { min: 0, max: 15 } },
      { id: 'nb_techniques_correctes', label: 'Nombre de techniques correctement appliquées', type: 'number', validation: { min: 0, max: 15 } },
      { id: 'taux_adoption', label: 'Taux d\'adoption (%) = (correctes ÷ évaluées) × 100', type: 'number', validation: { min: 0, max: 100 } },
      { id: 'niveau_adoption', label: 'Niveau d\'adoption', type: 'select', options: [
        { value: 'faible', label: 'Faible (< 40 %)' },
        { value: 'moyen', label: 'Moyen (40 à 69 %)' },
        { value: 'eleve', label: 'Élevé (70 % et plus)' },
      ] },
      // VI. Utilisation des semences
      { id: 'source_semence', label: 'Source de la semence utilisée', type: 'select', options: [
        { value: 'projet', label: 'Fournie par le projet' },
        { value: 'agri_x', label: 'Achat auprès d\'un Agri-X' },
        { value: 'production_propre', label: 'Production propre' },
        { value: 'champ_communautaire', label: 'Champ communautaire / AVEC' },
        { value: 'marche_local', label: 'Marché local' },
        { value: 'autre', label: 'Autre' },
      ] },
      { id: 'source_semence_autre', label: 'Autre source (préciser)', type: 'text', dependsOn: { field: 'source_semence', value: 'autre' } },
      { id: 'variete', label: 'Variété utilisée', type: 'text' },
      { id: 'quantite_semee', label: 'Quantité semée (kg)', type: 'number', validation: { min: 0 } },
      // VII. État général du champ
      { id: 'etat_general', label: 'État général', type: 'select', options: [
        { value: 'tres_bon', label: 'Très bon' },
        { value: 'bon', label: 'Bon' },
        { value: 'moyen', label: 'Moyen' },
        { value: 'mauvais', label: 'Mauvais' },
      ] },
      { id: 'presence_ravageurs', label: 'Présence de ravageurs', type: 'radio', options: [
        { value: 'oui', label: 'Oui' },
        { value: 'non', label: 'Non' },
      ] },
      { id: 'ravageurs_precision', label: 'Si oui, préciser (ravageurs)', type: 'text', dependsOn: { field: 'presence_ravageurs', value: 'oui' } },
      { id: 'presence_maladies', label: 'Présence de maladies', type: 'radio', options: [
        { value: 'oui', label: 'Oui' },
        { value: 'non', label: 'Non' },
      ] },
      { id: 'maladies_precision', label: 'Si oui, préciser (maladies)', type: 'text', dependsOn: { field: 'presence_maladies', value: 'oui' } },
      // VIII. Éligibilité au paiement
      { id: 'eligible_paiement', label: 'Le PEA atteint-il le seuil minimal d\'adoption fixé par le PNDA ?', type: 'radio', required: true, options: [
        { value: 'oui', label: 'Oui' },
        { value: 'non', label: 'Non' },
      ] },
      { id: 'motif_eligibilite', label: 'Motif', type: 'textarea' },
      // IX. Contraintes et recommandations
      { id: 'difficultes', label: 'Principales difficultés rencontrées', type: 'textarea' },
      { id: 'recommandations', label: 'Solutions ou recommandations proposées', type: 'textarea' },
      // X. Observations de l'enquêteur
      { id: 'observations', label: 'Observations de l\'enquêteur', type: 'textarea' },
      { id: 'signature_enqueteur', label: 'Nom et signature de l\'enquêteur', type: 'text' },
      { id: 'empreinte_producteur', label: 'Nom ou empreinte du producteur', type: 'text' },
    ],
  },
  {
    id: 'plainte_grm',
    name: 'Enregistrement de plainte',
    description: 'Collecte des plaintes via le mécanisme GRM',
    version: '1.0',
    category: 'plainte',
    icon: 'chat',
    isActive: true,
    fields: [
      { id: 'type_plainte', label: 'Type de plainte', type: 'select', required: true, options: [
        { value: 'technique', label: 'Technique' },
        { value: 'administratif', label: 'Administratif' },
        { value: 'financier', label: 'Financier' },
        { value: 'vbg', label: 'VBG' },
        { value: 'eas', label: 'EAS' },
        { value: 'hs', label: 'HS' },
        { value: 'environnemental', label: 'Environnemental' },
      ] },
      { id: 'description', label: 'Description', type: 'textarea', required: true },
      { id: 'beneficiaire_nom', label: 'Nom du bénéficiaire', type: 'text' },
      { id: 'beneficiaire_rna', label: 'ID RNA', type: 'text' },
      { id: 'confidentiel', label: 'Plainte confidentielle', type: 'checkbox' },
      { id: 'photos', label: 'Preuves (photos)', type: 'photo' },
    ],
  },
  {
    id: 'satisfaction_formation',
    name: 'Évaluation de satisfaction',
    description: 'Collecte des retours sur les formations',
    version: '1.0',
    category: 'satisfaction',
    icon: 'star',
    isActive: true,
    fields: [
      { id: 'formation_id', label: 'ID de la formation', type: 'text', required: true },
      { id: 'formation_nom', label: 'Nom de la formation', type: 'text', required: true },
      { id: 'participant_nom', label: 'Nom du participant', type: 'text', required: true },
      { id: 'qualite_formateur', label: 'Qualité du formateur', type: 'select', options: [
        { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
        { value: '4', label: '⭐⭐⭐⭐ Très bien' },
        { value: '3', label: '⭐⭐⭐ Bien' },
        { value: '2', label: '⭐⭐ Moyen' },
        { value: '1', label: '⭐ Insuffisant' },
      ] },
      { id: 'contenu', label: 'Contenu de la formation', type: 'select', options: [
        { value: '5', label: '⭐⭐⭐⭐⭐ Excellent' },
        { value: '4', label: '⭐⭐⭐⭐ Très bien' },
        { value: '3', label: '⭐⭐⭐ Bien' },
        { value: '2', label: '⭐⭐ Moyen' },
        { value: '1', label: '⭐ Insuffisant' },
      ] },
      { id: 'recommandation', label: 'Recommanderiez-vous cette formation ?', type: 'radio', options: [
        { value: 'oui', label: 'Oui' },
        { value: 'non', label: 'Non' },
      ] },
      { id: 'commentaires', label: 'Commentaires', type: 'textarea' },
    ],
  },
  {
    id: 'suivi_subvention',
    name: 'Suivi des subventions',
    description: 'Collecte des données de suivi des subventions',
    version: '1.0',
    category: 'suivi',
    icon: 'payments',
    isActive: true,
    fields: [
      { id: 'subvention_id', label: 'ID de la subvention', type: 'text', required: true },
      { id: 'beneficiaire_nom', label: 'Nom du bénéficiaire', type: 'text', required: true },
      { id: 'montant_recu', label: 'Montant reçu (FC)', type: 'number', required: true },
      { id: 'date_reception', label: 'Date de réception', type: 'date', required: true },
      { id: 'utilisation', label: 'Utilisation des fonds', type: 'textarea', required: true },
      { id: 'satisfaction', label: 'Satisfaction', type: 'select', options: [
        { value: 'satisfait', label: 'Satisfait' },
        { value: 'moyen', label: 'Moyen' },
        { value: 'insatisfait', label: 'Insatisfait' },
      ] },
      { id: 'photos', label: 'Preuves d\'utilisation', type: 'photo' },
    ],
  },
];

// Fonctions utilitaires
export const getFormById = (id: string): CollecteForm | undefined => {
  return collecteForms.find(form => form.id === id);
};

export const getFormsByCategory = (category: string): CollecteForm[] => {
  return collecteForms.filter(form => form.category === category);
};

export const getActiveForms = (): CollecteForm[] => {
  return collecteForms.filter(form => form.isActive);
};

export default collecteForms;