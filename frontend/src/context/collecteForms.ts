// frontend/src/config/collecteForms.ts

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox' | 'radio' | 'photo';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
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
      { id: 'photos', label: 'Photos du champ', type: 'photo' },
    ],
  },
  {
    id: 'adoption_technologie',
    name: 'Adoption des technologies agricoles',
    description: 'Suivi de l\'adoption des technologies AIC/AIN',
    version: '1.0',
    category: 'adoption',
    icon: 'science',
    isActive: true,
    fields: [
      { id: 'rna_id', label: 'ID RNA', type: 'text', required: true },
      { id: 'nom_exploitant', label: 'Nom de l\'exploitant', type: 'text', required: true },
      { id: 'technologies', label: 'Technologies adoptées', type: 'select', required: true, options: [
        { value: 'semences_ameliorees', label: 'Semences améliorées' },
        { value: 'engrais_organiques', label: 'Engrais organiques' },
        { value: 'irrigation', label: 'Irrigation' },
        { value: 'conservation_sols', label: 'Conservation des sols' },
        { value: 'agroforesterie', label: 'Agroforesterie' },
      ] },
      { id: 'surface_aic', label: 'Surface sous pratiques AIC (ha)', type: 'number', validation: { min: 0 } },
      { id: 'satisfaction', label: 'Niveau de satisfaction', type: 'select', options: [
        { value: 'ts', label: 'Très satisfait' },
        { value: 's', label: 'Satisfait' },
        { value: 'n', label: 'Neutre' },
        { value: 'i', label: 'Insatisfait' },
        { value: 'ti', label: 'Très insatisfait' },
      ] },
      { id: 'difficultes', label: 'Difficultés rencontrées', type: 'textarea' },
      { id: 'photos', label: 'Photos des parcelles', type: 'photo' },
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
];

export const getFormById = (id: string): CollecteForm | undefined => {
  return collecteForms.find(form => form.id === id);
};

export const getActiveForms = (): CollecteForm[] => {
  return collecteForms.filter(form => form.isActive);
};