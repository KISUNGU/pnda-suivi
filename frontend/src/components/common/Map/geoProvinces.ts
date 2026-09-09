// frontend/src/components/common/Map/geoProvinces.ts
//
// Utilitaires géographiques partagés par les composants cartographiques.
// Centralisés ici pour éviter que chaque carte ne redéfinisse sa propre
// table de coordonnées : une seule source de vérité, conformément au
// principe de non-duplication des référentiels.
import type { ProvinceData, ProvinceContour } from '../../../services/provincial.service';

/** Centre géographique approximatif de la RDC (WGS84). */
export const CENTRE_RDC: [number, number] = [-4.0383, 21.7587];

/**
 * Coordonnées de repli, utilisées uniquement lorsque ni la base ni les
 * contours importés ne fournissent de point de référence pour la province.
 * Ce sont des chefs-lieux, pas des centroïdes calculés : elles servent à
 * positionner un marqueur, jamais à produire un indicateur.
 */
export const COORDS_DEFAUT: Record<string, [number, number]> = {
  kinshasa: [-4.4419, 15.2663],
  kongocentral: [-5.35, 14.4],
  kwilu: [-5.0489, 18.8203],
  kwango: [-6.0333, 17.6667],
  maindombe: [-2.95, 18.05],
  kasai: [-5.9443, 20.8],
  kasaicentral: [-6.5, 22.4],
  kasaioriental: [-6.15, 23.6],
  lomami: [-6.1333, 24.4833],
  sankuru: [-4.3167, 23.4333],
  hautlomami: [-6.1284, 25.4176],
  tanganyika: [-5.7959, 28.4181],
};

/** Normalise un libellé de province pour la comparaison (accents, casse, séparateurs). */
export const normaliser = (valeur: string): string =>
  valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_']/g, '');

/** Indexe les contours par nom normalisé. */
export const indexerContours = (contours: ProvinceContour[]): Map<string, ProvinceContour> => {
  const index = new Map<string, ProvinceContour>();
  contours.forEach((contour) => index.set(normaliser(contour.name), contour));
  return index;
};

/**
 * Résout les coordonnées d'une province, par ordre de fiabilité décroissante :
 * coordonnées de la base, puis point de référence du contour importé, puis
 * table de repli. Retourne null si aucune source n'est disponible — dans ce
 * cas la province ne doit pas être affichée sur la carte.
 */
export const resoudreCoordonnees = (
  province: ProvinceData,
  contoursIndex: Map<string, ProvinceContour>,
): [number, number] | null => {
  if (province.coordonnees) return [province.coordonnees.lat, province.coordonnees.lng];
  const contour = contoursIndex.get(normaliser(province.name));
  if (contour?.coord_lat != null && contour?.coord_lng != null) {
    return [contour.coord_lat, contour.coord_lng];
  }
  return COORDS_DEFAUT[normaliser(province.name)] ?? COORDS_DEFAUT[province.id] ?? null;
};

/** Formate un entier selon la convention francophone (espace insécable fine). */
export const formaterNombre = (valeur: number | null | undefined): string =>
  valeur == null ? '—' : valeur.toLocaleString('fr-FR');

/** Part en pourcentage, avec garde contre la division par zéro. */
export const part = (numerateur: number, denominateur: number): number =>
  denominateur > 0 ? Math.round((numerateur / denominateur) * 100) : 0;
