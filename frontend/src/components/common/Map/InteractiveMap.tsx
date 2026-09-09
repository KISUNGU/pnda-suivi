// frontend/src/components/common/Map/InteractiveMap.tsx
//
// Carte de couverture provinciale — données réelles du Registre National
// Agricole, servies par /api/provinces. Aucune donnée n'est fabriquée ici :
// en l'absence de réponse exploitable, la carte affiche un état vide explicite
// plutôt que des valeurs de démonstration.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Popup,
  CircleMarker,
  GeoJSON,
  Tooltip,
  useMap,
} from 'react-leaflet';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import provincialService, {
  type ProvinceData,
  type ProvinceContour,
} from '../../../services/provincial.service';
import {
  CENTRE_RDC,
  formaterNombre,
  indexerContours,
  part,
  resoudreCoordonnees,
} from './geoProvinces';

// Correction des icônes Leaflet par défaut
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  /** Appelé au clic sur une province. Reçoit l'enregistrement complet servi par l'API. */
  onProvinceClick?: (province: ProvinceData) => void;
  height?: number | string;
}

/** Province effectivement affichable : dotée de coordonnées résolues. */
interface ProvincePositionnee {
  province: ProvinceData;
  position: [number, number];
  total: number;
}

/** Palette séquentielle, du plus dense au moins dense. */
const PALETTE = ['#1B5E20', '#2E7D32', '#66BB6A', '#A5D6A7'] as const;

/** Recentre la carte lorsque l'étendue des données change. */
const AjusterVue: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      map.setView(CENTRE_RDC, 5);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 7);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 8 });
  }, [map, points]);
  return null;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ onProvinceClick, height = 500 }) => {
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [contours, setContours] = useState<ProvinceContour[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [provRes, contoursRes] = await Promise.all([
        provincialService.getAllProvinces(),
        provincialService.getContours().catch(() => ({ data: [] as ProvinceContour[] })),
      ]);
      setProvinces(Array.isArray(provRes.data) ? provRes.data : []);
      setContours(Array.isArray(contoursRes.data) ? contoursRes.data : []);
      setErreur(null);
    } catch {
      setProvinces([]);
      setContours([]);
      setErreur("Impossible de charger les données provinciales.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Chargement initial depuis l'API : synchronisation légitime avec un
    // système externe, le composant n'ayant aucune donnée locale à afficher.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    charger();
  }, [charger]);

  const contoursIndex = useMemo(() => indexerContours(contours), [contours]);

  /** Provinces réellement cartographiables, triées par effectif décroissant. */
  const positionnees = useMemo<ProvincePositionnee[]>(() => {
    return provinces
      .map((province) => {
        const position = resoudreCoordonnees(province, contoursIndex);
        if (!position) return null;
        return { province, position, total: province.beneficiaires?.total ?? 0 };
      })
      .filter((entree): entree is ProvincePositionnee => entree !== null)
      .sort((a, b) => b.total - a.total);
  }, [provinces, contoursIndex]);

  const maxTotal = useMemo(
    () => positionnees.reduce((max, e) => Math.max(max, e.total), 0),
    [positionnees],
  );

  const points = useMemo(() => positionnees.map((e) => e.position), [positionnees]);

  /**
   * Seuils de la légende, dérivés de la province la plus peuplée du jeu de
   * données courant. Ils ne sont donc jamais en décalage avec les chiffres
   * affichés, contrairement à des paliers figés dans le code.
   */
  const seuils = useMemo(
    () => [Math.round(maxTotal * 0.75), Math.round(maxTotal * 0.5), Math.round(maxTotal * 0.25)],
    [maxTotal],
  );

  const couleur = useCallback(
    (total: number): string => {
      if (maxTotal <= 0) return PALETTE[3];
      if (total >= seuils[0]) return PALETTE[0];
      if (total >= seuils[1]) return PALETTE[1];
      if (total >= seuils[2]) return PALETTE[2];
      return PALETTE[3];
    },
    [maxTotal, seuils],
  );

  /** Rayon proportionnel à la racine de l'effectif, mis à l'échelle du maximum observé. */
  const rayon = useCallback(
    (total: number): number => (maxTotal <= 0 ? 8 : 7 + 18 * Math.sqrt(total / maxTotal)),
    [maxTotal],
  );

  const provincesAvecDonnees = positionnees.filter((e) => e.total > 0).length;
  const nonPositionnees = provinces.length - positionnees.length;

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          justifyContent: 'center',
          alignItems: 'center',
          height,
          bgcolor: 'action.hover',
          borderRadius: 2,
        }}
      >
        <CircularProgress sx={{ color: '#2E7D32' }} />
        <Typography variant="caption" color="text.secondary">
          Chargement des données provinciales…
        </Typography>
      </Box>
    );
  }

  if (erreur) {
    return (
      <Box sx={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
        <Alert
          severity="error"
          sx={{ width: '100%' }}
          action={
            <Button color="inherit" size="small" onClick={charger}>
              Réessayer
            </Button>
          }
        >
          {erreur} La carte ne présente aucune donnée tant que le service n'a pas répondu.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
        <MapContainer
          center={CENTRE_RDC}
          zoom={5}
          style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
          zoomControl
        >
          <AjusterVue points={points} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {/* Contours officiels, lorsqu'ils ont été importés dans la base */}
          {contours
            .filter((contour) => contour.contour_geojson)
            .map((contour) => (
              <GeoJSON
                key={`contour-${contour.id}`}
                data={contour.contour_geojson as never}
                style={{ color: '#2E7D32', weight: 1, fillColor: '#2E7D32', fillOpacity: 0.06 }}
              />
            ))}

          {positionnees.map(({ province, position, total }) => (
            <CircleMarker
              key={province.id}
              center={position}
              radius={rayon(total)}
              fillColor={couleur(total)}
              color="#FFFFFF"
              weight={2}
              opacity={1}
              fillOpacity={0.75}
              eventHandlers={{
                click: () => onProvinceClick?.(province),
                mouseover: (e) => e.target.openTooltip(),
                mouseout: (e) => e.target.closeTooltip(),
              }}
            >
              <Tooltip sticky>
                <Box sx={{ p: 0.5, minWidth: 190 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {province.name}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Exploitants inscrits : {formaterNombre(total)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    Femmes : {formaterNombre(province.beneficiaires?.femmes)} (
                    {part(province.beneficiaires?.femmes ?? 0, total)} %)
                  </Typography>
                  {province.performance_score != null && (
                    <Typography variant="caption" display="block">
                      Score de performance : {province.performance_score} %
                    </Typography>
                  )}
                </Box>
              </Tooltip>

              <Popup>
                <Box sx={{ p: 0.5, minWidth: 250 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {province.name}
                  </Typography>
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    <LignePopup label="Exploitants inscrits (RNA)" valeur={formaterNombre(total)} />
                    <LignePopup
                      label="Femmes"
                      valeur={`${formaterNombre(province.beneficiaires?.femmes)} (${part(
                        province.beneficiaires?.femmes ?? 0,
                        total,
                      )} %)`}
                    />
                    <LignePopup label="Hommes" valeur={formaterNombre(province.beneficiaires?.hommes)} />
                    <LignePopup
                      label="Jeunes (15–35 ans)"
                      valeur={`${formaterNombre(province.beneficiaires?.jeunes)} (${part(
                        province.beneficiaires?.jeunes ?? 0,
                        total,
                      )} %)`}
                    />
                    {province.beneficiaires?.cible ? (
                      <LignePopup
                        label="Cible"
                        valeur={`${formaterNombre(province.beneficiaires.cible)} (${part(
                          total,
                          province.beneficiaires.cible,
                        )} % atteint)`}
                      />
                    ) : null}

                    <Divider sx={{ my: 0.5 }} />

                    <LignePopup
                      label="Routes réhabilitées"
                      valeur={
                        province.infrastructures?.routes
                          ? `${formaterNombre(province.infrastructures.routes.rehabilitees)} / ${formaterNombre(
                              province.infrastructures.routes.prevues,
                            )} ${province.infrastructures.routes.unite ?? 'km'}`
                          : '—'
                      }
                    />
                    <LignePopup
                      label="CLER fonctionnels"
                      valeur={
                        province.infrastructures?.cler
                          ? `${formaterNombre(province.infrastructures.cler.fonctionnels)} / ${formaterNombre(
                              province.infrastructures.cler.total,
                            )}`
                          : '—'
                      }
                    />
                    <LignePopup
                      label="Plaintes enregistrées"
                      valeur={
                        province.plaintes
                          ? `${formaterNombre(province.plaintes.total)} (${formaterNombre(
                              province.plaintes.en_cours,
                            )} en cours)`
                          : '—'
                      }
                    />
                  </Stack>

                  {province.dernier_suivi && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Dernier suivi : {province.dernier_suivi}
                    </Typography>
                  )}

                  {onProvinceClick && (
                    <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                      <Chip
                        label="Voir les détails"
                        size="small"
                        color="primary"
                        onClick={() => onProvinceClick(province)}
                        sx={{ cursor: 'pointer' }}
                      />
                    </Box>
                  )}
                </Box>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* État vide : aucune province exploitable — on ne comble pas le vide par des chiffres */}
        {positionnees.length === 0 && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255,255,255,0.86)',
              zIndex: 900,
              p: 3,
            }}
          >
            <Alert severity="info" sx={{ maxWidth: 460 }}>
              Aucune province géolocalisée n'est disponible dans la base. Renseignez les
              coordonnées ou importez les contours officiels depuis la page Cartographie &amp; SIG.
            </Alert>
          </Box>
        )}

        {/* Légende — seuils calculés sur les données affichées */}
        {positionnees.length > 0 && maxTotal > 0 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              bgcolor: 'background.paper',
              p: 1.5,
              borderRadius: 2,
              boxShadow: 3,
              zIndex: 1000,
              minWidth: 190,
            }}
          >
            <Typography variant="caption" fontWeight={600} display="block" gutterBottom>
              Exploitants inscrits au RNA
            </Typography>
            <EntreeLegende couleur={PALETTE[0]} texte={`≥ ${formaterNombre(seuils[0])}`} />
            <EntreeLegende
              couleur={PALETTE[1]}
              texte={`${formaterNombre(seuils[1])} – ${formaterNombre(seuils[0])}`}
            />
            <EntreeLegende
              couleur={PALETTE[2]}
              texte={`${formaterNombre(seuils[2])} – ${formaterNombre(seuils[1])}`}
            />
            <EntreeLegende couleur={PALETTE[3]} texte={`< ${formaterNombre(seuils[2])}`} />
          </Box>
        )}
      </Box>

      {/* Provenance de la donnée — exigée pour toute restitution cartographique */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        sx={{ mt: 1 }}
      >
        <Typography variant="caption" color="text.secondary">
          Source : Registre National Agricole — service /api/provinces.{' '}
          {provincesAvecDonnees} province{provincesAvecDonnees > 1 ? 's' : ''} avec effectif renseigné
          sur {provinces.length} servie{provinces.length > 1 ? 's' : ''}.
        </Typography>
        {nonPositionnees > 0 && (
          <Typography variant="caption" color="warning.main">
            {nonPositionnees} province{nonPositionnees > 1 ? 's' : ''} sans coordonnées, non
            représentée{nonPositionnees > 1 ? 's' : ''}.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};

/** Ligne clé/valeur du popup. */
const LignePopup: React.FC<{ label: string; valeur: string }> = ({ label, valeur }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" fontWeight={500}>
      {valeur}
    </Typography>
  </Box>
);

/** Entrée de la légende. */
const EntreeLegende: React.FC<{ couleur: string; texte: string }> = ({ couleur, texte }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
    <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: couleur, flexShrink: 0 }} />
    <Typography variant="caption">{texte}</Typography>
  </Box>
);

export default InteractiveMap;
