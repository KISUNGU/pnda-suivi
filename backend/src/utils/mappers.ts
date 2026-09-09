/**
 * Transformations entre les lignes de la base et les objets exposes par l'API,
 * et lecture defensive des corps de requete.
 */
import { getRisqueById, type SqlBeneficiaire } from '../db';

export const splitBeneficiaireName = (nomComplet: string) => {
  const parts = nomComplet.trim().split(/\s+/).filter(Boolean);
  return {
    nom: parts[0] ?? nomComplet,
    prenom: parts.slice(1).join(' '),
  };
};

export const inferBeneficiaireType = (beneficiaire: SqlBeneficiaire): 'agriculteur' | 'eleveur' | 'pisciculteur' | 'mixte' => {
  const source = `${beneficiaire.ptech} ${beneficiaire.saison}`.toLowerCase();

  if (source.includes('pisc')) {
    return 'pisciculteur';
  }

  if (source.includes('elev')) {
    return 'eleveur';
  }

  if (source.includes('mix')) {
    return 'mixte';
  }

  return 'agriculteur';
};

export const mapBeneficiaireToDatabaseRecord = (beneficiaire: SqlBeneficiaire) => {
  const { nom, prenom } = splitBeneficiaireName(beneficiaire.nom_complet);
  const typeExploitant = inferBeneficiaireType(beneficiaire);
  const technologies = beneficiaire.ptech
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    id: beneficiaire.id,
    rna_id: beneficiaire.rna_id,
    nom,
    prenom,
    sexe: beneficiaire.sexe,
    date_naissance: '',
    age: 0,
    telephone: '',
    province: beneficiaire.province,
    territoire: beneficiaire.territoire,
    commune: '',
    village: beneficiaire.village,
    type_exploitant: typeExploitant,
    est_jeune: false,
    superficie_totale: 0,
    superficie_cultivee: 0,
    principales_cultures: beneficiaire.saison ? [beneficiaire.saison] : [],
    technologies_adoptees: technologies,
    est_beneficiaire_subvention: false,
    date_adhesion: beneficiaire.created_at.split('T')[0] ?? '',
    created_at: beneficiaire.created_at,
    updated_at: beneficiaire.created_at,
  };
};

export const parseStringArrayBody = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.map((item) => String(item)).map((item) => item.trim()).filter(Boolean);
};

export const parseDocumentsBody = (value: unknown): Array<{ nom: string; url: string }> | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const nom = 'nom' in item ? String(item.nom ?? '').trim() : '';
      const url = 'url' in item ? String(item.url ?? '').trim() : '';
      if (!nom) {
        return null;
      }

      return { nom, url };
    })
    .filter((item): item is { nom: string; url: string } => Boolean(item));
};

export const mapRisqueToApi = (risque: Awaited<ReturnType<typeof getRisqueById>> extends infer T ? Exclude<T, null> : never) => ({
  ...risque,
  plan_atténuation: risque.plan_attenuation,
});
