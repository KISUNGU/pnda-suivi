// frontend/src/pages/Outils/CartographiePage.tsx
//
// Cartographie & SIG du PNDA — données réelles du Registre National des
// Agriculteurs (RNA), agrégées par province via /api/provinces.
// Les contours officiels des provinces (GeoJSON WGS84) peuvent être importés
// depuis cette page ; en leur absence, les provinces sont figurées par des
// cercles proportionnels posés sur leurs coordonnées de référence.
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Stack,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  CircularProgress,
  LinearProgress,
  Avatar,
  Button,
  Alert,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Tooltip, Popup, ZoomControl, useMapEvents } from 'react-leaflet';
import type { Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';
import GoogleIcon from '../../components/common/GoogleIcon';
import { GradientWidget } from '../../components/common/Widget/GradientWidget';
import provincialService, { type ProvinceData, type ProvinceContour } from '../../services/provincial.service';
import sigService, {
  type SigSite,
  type SigSiteInput,
  type SigOverview,
  type SigTerritoireDensite,
} from '../../services/sig.service';
import { COORDS_DEFAUT, normaliser } from '../../components/common/Map/geoProvinces';

type CoucheIndicateur = 'beneficiaires' | 'femmes' | 'jeunes' | 'performance';

const indicateurLabels: Record<CoucheIndicateur, string> = {
  beneficiaires: 'Exploitants inscrits au RNA',
  femmes: 'Part des femmes (%)',
  jeunes: 'Part des jeunes 15–35 ans (%)',
  performance: 'Score de performance (%)',
};



const getColor = (pct: number): string => {
  if (pct >= 0.75) return '#2E7D32';
  if (pct >= 0.5) return '#FFC107';
  return '#F44336';
};

/** Typologie des sites géolocalisés du projet (table sig_sites). */
const SITE_TYPES: Record<string, { label: string; color: string }> = {
  bureau: { label: 'Bureau', color: '#1565C0' },
  perimetre: { label: 'Périmètre agricole', color: '#2E7D32' },
  route: { label: 'Axe routier', color: '#795548' },
  marche: { label: 'Marché', color: '#E65100' },
  cler: { label: 'CLER', color: '#6A1B9A' },
  entrepot: { label: 'Entrepôt', color: '#00838F' },
  autre: { label: 'Autre', color: '#546E7A' },
};

const STATUT_SITE_LABELS: Record<string, string> = {
  operationnel: 'Opérationnel',
  en_travaux: 'En travaux',
  planifie: 'Planifié',
};

/** Capture du clic carte en mode « ajout de site ». */
const ClicCarte: React.FC<{ actif: boolean; onClic: (lat: number, lng: number) => void }> = ({ actif, onClic }) => {
  useMapEvents({
    click: (e) => {
      if (actif) onClic(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

export const CartographiePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [contours, setContours] = useState<ProvinceContour[]>([]);
  const [couche, setCouche] = useState<CoucheIndicateur>('beneficiaires');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fichierRef = useRef<HTMLInputElement>(null);
  // ── SIG : sites du projet, synthèse et densité territoriale ──
  const [sigOverview, setSigOverview] = useState<SigOverview | null>(null);
  const [sites, setSites] = useState<SigSite[]>([]);
  const [territoires, setTerritoires] = useState<SigTerritoireDensite[]>([]);
  const [afficherSites, setAfficherSites] = useState(true);
  const [typeSite, setTypeSite] = useState<string>('tous');
  const [modeAjout, setModeAjout] = useState(false);
  const [nouveauSite, setNouveauSite] = useState<SigSiteInput | null>(null);

  const chargerSig = async () => {
    const [overviewRes, sitesRes, territoiresRes] = await Promise.all([
      sigService.getOverview().catch(() => null),
      sigService.getSites().catch(() => ({ data: [] as SigSite[] })),
      sigService.getTerritoires().catch(() => ({ data: [] as SigTerritoireDensite[] })),
    ]);
    if (overviewRes) setSigOverview(overviewRes.data);
    setSites(sitesRes.data);
    setTerritoires(territoiresRes.data);
  };

  const charger = async () => {
    try {
      const [provRes, contoursRes] = await Promise.all([
        provincialService.getAllProvinces(),
        provincialService.getContours().catch(() => ({ data: [] as ProvinceContour[] })),
      ]);
      setProvinces(provRes.data);
      setContours(contoursRes.data);
      await chargerSig();
      setErreur(null);
    } catch {
      setErreur('Impossible de charger les données cartographiques.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contourParProvince = useMemo(() => {
    const m = new Map<string, ProvinceContour>();
    contours.forEach((c) => m.set(normaliser(c.name), c));
    return m;
  }, [contours]);

  const getValeur = (p: ProvinceData): number => {
    const total = p.beneficiaires?.total ?? 0;
    switch (couche) {
      case 'beneficiaires': return total;
      case 'femmes': return total > 0 ? Math.round(((p.beneficiaires?.femmes ?? 0) / total) * 100) : 0;
      case 'jeunes': return total > 0 ? Math.round(((p.beneficiaires?.jeunes ?? 0) / total) * 100) : 0;
      case 'performance': return p.performance_score ?? 0;
    }
  };

  const maxVal = useMemo(
    () => Math.max(...provinces.map(getValeur), 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provinces, couche],
  );

  const coords = (p: ProvinceData): [number, number] | null => {
    if (p.coordonnees) return [p.coordonnees.lat, p.coordonnees.lng];
    const contour = contourParProvince.get(normaliser(p.name));
    if (contour?.coord_lat != null && contour?.coord_lng != null) return [contour.coord_lat, contour.coord_lng];
    return COORDS_DEFAUT[normaliser(p.name)] ?? COORDS_DEFAUT[p.id] ?? null;
  };

  const selected = provinces.find((p) => p.id === selectedId) ?? null;
  const totalBeneficiaires = provinces.reduce((somme, p) => somme + (p.beneficiaires?.total ?? 0), 0);
  const totalFemmes = provinces.reduce((somme, p) => somme + (p.beneficiaires?.femmes ?? 0), 0);
  const totalJeunes = provinces.reduce((somme, p) => somme + (p.beneficiaires?.jeunes ?? 0), 0);
  const aDesContours = contours.some((c) => c.contour_geojson);

  const sitesVisibles = useMemo(
    () => (typeSite === 'tous' ? sites : sites.filter((s) => s.type === typeSite)),
    [sites, typeSite],
  );

  /** Densité par territoire — restreinte à la province sélectionnée le cas échéant. */
  const territoiresVisibles = useMemo(() => {
    const liste = selected
      ? territoires.filter((t) => normaliser(t.province) === normaliser(selected.name))
      : territoires;
    return liste.slice(0, 12);
  }, [territoires, selected]);

  const ajouterSite = (lat: number, lng: number) => {
    setModeAjout(false);
    setNouveauSite({
      nom: '',
      type: 'autre',
      province: selected?.name ?? provinces[0]?.name ?? '',
      territoire: '',
      statut: 'operationnel',
      lat: Math.round(lat * 1e6) / 1e6,
      lng: Math.round(lng * 1e6) / 1e6,
    });
  };

  const enregistrerSite = async () => {
    if (!nouveauSite || !nouveauSite.nom.trim() || !nouveauSite.province) return;
    try {
      await sigService.createSite(nouveauSite);
      setNouveauSite(null);
      setMessage('Site enregistré.');
      await chargerSig();
    } catch {
      setMessage("Impossible d'enregistrer le site.");
    }
  };

  const supprimerSite = async (id: number) => {
    try {
      await sigService.deleteSite(id);
      setMessage('Site supprimé.');
      await chargerSig();
    } catch {
      setMessage('Impossible de supprimer le site.');
    }
  };

  /** Import d'un fichier GeoJSON de contours (FeatureCollection WGS84). */
  const importerContours = async (fichier: File) => {
    setMessage(null);
    try {
      const geo = JSON.parse(await fichier.text());
      const features: Array<{ geometry?: Geometry; properties?: Record<string, unknown> }> =
        geo?.type === 'FeatureCollection' ? geo.features : geo?.type === 'Feature' ? [geo] : [];
      if (!features.length) throw new Error('FeatureCollection GeoJSON attendue');

      const resultats: string[] = [];
      for (const contour of contours) {
        const cible = normaliser(contour.name);
        const feature = features.find((f) =>
          ['nom', 'name', 'NAME_1', 'shapeName', 'NOM', 'province', 'adm1_name'].some((cle) => {
            const valeur = f.properties?.[cle];
            return typeof valeur === 'string' && normaliser(valeur) === cible;
          }),
        );
        if (feature?.geometry && ['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
          await provincialService.putContour(contour.id, feature.geometry);
          resultats.push(`${contour.name} ✓`);
        }
      }
      setMessage(resultats.length
        ? `Contours importés : ${resultats.join(' · ')}`
        : 'Aucune province du fichier ne correspond au référentiel (propriété nom/name/shapeName attendue).');
      await charger();
    } catch (e) {
      setMessage(`Import impossible — ${e instanceof Error ? e.message : 'fichier invalide'}`);
    } finally {
      if (fichierRef.current) fichierRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Cartographie & SIG
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Provinces ciblées du PNDA — données réelles du Registre National des Agriculteurs (RNA)
      </Typography>

      {erreur && <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>{erreur}</Alert>}
      {message && (
        <Alert severity="info" onClose={() => setMessage(null)} sx={{ mb: 3, borderRadius: '10px' }}>
          {message}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <GradientWidget
            title="Exploitants inscrits (RNA)"
            value={totalBeneficiaires.toLocaleString('fr-FR')}
            icon={<GoogleIcon name="groups" size={36} />}
            trend={{ value: provinces.length, direction: 'up', period: 'provinces suivies' }}
            color="primary"
            onClick={() => navigate('/beneficiaires/rna')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <GradientWidget
            title="Femmes"
            value={`${totalBeneficiaires > 0 ? Math.round((totalFemmes / totalBeneficiaires) * 100) : 0}%`}
            icon={<GoogleIcon name="female" size={36} />}
            trend={{ value: totalFemmes, direction: 'up', period: 'exploitantes' }}
            onClick={() => navigate('/beneficiaires/rna')}
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <GradientWidget
            title="Jeunes (15–35 ans)"
            value={`${totalBeneficiaires > 0 ? Math.round((totalJeunes / totalBeneficiaires) * 100) : 0}%`}
            icon={<GoogleIcon name="diversity_3" size={36} />}
            onClick={() => navigate('/beneficiaires/rna')}
            trend={{ value: totalJeunes, direction: 'up', period: 'exploitants' }}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <GradientWidget
            title="Sites du projet"
            value={sigOverview?.sites_total ?? sites.length}
            icon={<GoogleIcon name="location_on" size={36} />}
            onClick={() => navigate('/dashboard/provincial')}
            trend={{ value: Object.keys(sigOverview?.sites_par_type ?? {}).length, direction: 'up', period: 'types de sites' }}
            color="danger"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <GradientWidget
            title="Couverture RNA"
            value={sigOverview?.territoires_couverts ?? '—'}
            icon={<GoogleIcon name="travel_explore" size={36} />}
            onClick={() => navigate('/beneficiaires/rna')}
            trend={{ value: sigOverview?.villages_couverts ?? 0, direction: 'up', period: 'villages couverts' }}
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 2 }}>
          <GradientWidget
            title="Contours SIG"
            value={aDesContours ? `${contours.filter((c) => c.contour_geojson).length}/${contours.length}` : '—'}
            onClick={() => navigate('/dashboard/provincial')}
            icon={<GoogleIcon name="map" size={36} />}
            trend={{ value: contours.length, direction: 'up', period: aDesContours ? 'provinces avec contour' : 'à importer' }}
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Panneau gauche : contrôles + détail province */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                <GoogleIcon name="layers" size={18} /> Couche indicateur
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Indicateur</InputLabel>
                <Select value={couche} label="Indicateur" onChange={(e) => setCouche(e.target.value as CoucheIndicateur)}>
                  {Object.entries(indicateurLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                <GoogleIcon name="location_on" size={18} /> Sites du projet
              </Typography>
              <FormControlLabel
                control={<Switch size="small" checked={afficherSites} onChange={(e) => setAfficherSites(e.target.checked)} />}
                label={<Typography variant="caption">Afficher les sites ({sitesVisibles.length})</Typography>}
                sx={{ mb: 1 }}
              />
              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>Type de site</InputLabel>
                <Select value={typeSite} label="Type de site" onChange={(e) => setTypeSite(e.target.value)}>
                  <MenuItem value="tous">Tous les types</MenuItem>
                  {Object.entries(SITE_TYPES).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: v.color }} />
                        <span>{v.label}{sigOverview?.sites_par_type?.[k] ? ` (${sigOverview.sites_par_type[k]})` : ''}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant={modeAjout ? 'contained' : 'outlined'}
                color={modeAjout ? 'warning' : 'primary'}
                size="small"
                fullWidth
                startIcon={<GoogleIcon name={modeAjout ? 'close' : 'add_location_alt'} size={18} />}
                onClick={() => setModeAjout((v) => !v)}
              >
                {modeAjout ? 'Annuler l\u2019ajout' : 'Ajouter un site'}
              </Button>
              {modeAjout && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                  Cliquez sur la carte à l’emplacement du site.
                </Typography>
              )}
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                <GoogleIcon name="public" size={18} /> Contours officiels (SIG)
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {aDesContours
                  ? 'Contours importés : la carte affiche les limites administratives.'
                  : 'Importer une FeatureCollection GeoJSON (WGS84) des provinces de la RDC — source recommandée : limites officielles RGC / HDX.'}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                startIcon={<GoogleIcon name="upload_file" size={18} />}
                onClick={() => fichierRef.current?.click()}
              >
                Importer un GeoJSON
              </Button>
              <input
                ref={fichierRef}
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                hidden
                onChange={(e) => e.target.files?.[0] && importerContours(e.target.files[0])}
              />
            </Paper>

            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Légende</Typography>
              <Stack spacing={0.8}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#2E7D32' }} />
                  <Typography variant="caption">Valeur élevée (≥ 75 % du max)</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#FFC107' }} />
                  <Typography variant="caption">Valeur moyenne (50–75 %)</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#F44336' }} />
                  <Typography variant="caption">Valeur faible (&lt; 50 %)</Typography>
                </Stack>
              </Stack>
            </Paper>

            {selected && (
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{selected.name}</Typography>
                  <Chip
                    label={`${selected.performance_score ?? 0}%`}
                    size="small"
                    sx={{ bgcolor: getColor((selected.performance_score ?? 0) / 100), color: 'white', fontWeight: 600 }}
                  />
                </Stack>
                <Stack spacing={1.2}>
                  {[
                    {
                      label: 'Exploitants RNA',
                      value: `${(selected.beneficiaires?.total ?? 0).toLocaleString('fr-FR')} / ${(selected.beneficiaires?.cible ?? 0).toLocaleString('fr-FR')}`,
                      pct: selected.beneficiaires?.cible ? ((selected.beneficiaires.total ?? 0) / selected.beneficiaires.cible) * 100 : 0,
                    },
                    {
                      label: 'Femmes',
                      value: `${(selected.beneficiaires?.femmes ?? 0).toLocaleString('fr-FR')}`,
                      pct: selected.beneficiaires?.total ? ((selected.beneficiaires.femmes ?? 0) / selected.beneficiaires.total) * 100 : 0,
                    },
                    {
                      label: 'Jeunes 15–35 ans',
                      value: `${(selected.beneficiaires?.jeunes ?? 0).toLocaleString('fr-FR')}`,
                      pct: selected.beneficiaires?.total ? ((selected.beneficiaires.jeunes ?? 0) / selected.beneficiaires.total) * 100 : 0,
                    },
                  ].map((row) => (
                    <Box key={row.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                        <Typography variant="caption" fontWeight={600}>{row.value}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={Math.min(row.pct, 100)} sx={{ height: 5, borderRadius: 2, mt: 0.3 }} />
                    </Box>
                  ))}
                  <Divider />
                  <Typography variant="caption" color="text.secondary">
                    Dernier suivi RNA : {selected.dernier_suivi || '—'}
                  </Typography>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>

        {/* Carte */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', height: 620 }}>
            <MapContainer center={[-5.5, 19.5]} zoom={6} zoomControl={false} style={{ height: '100%', width: '100%' }}>
              <ZoomControl position="topright" />
              <ClicCarte actif={modeAjout} onClic={ajouterSite} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {/* Contours administratifs (si importés) */}
              {provinces.map((p) => {
                const contour = contourParProvince.get(normaliser(p.name));
                if (!contour?.contour_geojson) return null;
                const val = getValeur(p);
                return (
                  <GeoJSON
                    key={`${p.id}-${couche}-contour`}
                    data={contour.contour_geojson}
                    style={() => ({
                      fillColor: getColor(val / (couche === 'beneficiaires' ? maxVal : 100)),
                      color: selectedId === p.id ? '#1B5E20' : '#FFFFFF',
                      weight: selectedId === p.id ? 3 : 1.5,
                      fillOpacity: 0.55,
                    })}
                    eventHandlers={{ click: () => setSelectedId(p.id) }}
                  >
                    <Tooltip sticky>
                      <strong>{p.name}</strong> — {indicateurLabels[couche]} : {val.toLocaleString('fr-FR')}
                    </Tooltip>
                  </GeoJSON>
                );
              })}

              {/* Cercles proportionnels (toujours visibles pour l'étiquette / le clic) */}
              {provinces.map((p) => {
                const position = coords(p);
                if (!position) return null;
                const val = getValeur(p);
                const contour = contourParProvince.get(normaliser(p.name));
                const rayon = contour?.contour_geojson ? 6 : 12 + (val / maxVal) * 26;
                return (
                  <CircleMarker
                    key={`${p.id}-${couche}`}
                    center={position}
                    radius={rayon}
                    pathOptions={{
                      fillColor: getColor(val / (couche === 'beneficiaires' ? maxVal : 100)),
                      color: selectedId === p.id ? '#1B5E20' : '#fff',
                      weight: selectedId === p.id ? 3 : 1.5,
                      fillOpacity: 0.8,
                    }}
                    eventHandlers={{ click: () => setSelectedId(p.id) }}
                  >
                    <Tooltip permanent direction="center" className="province-label" offset={[0, 0]}>
                      <Box component="span" sx={{ fontWeight: 700, fontSize: 11 }}>{p.code}</Box>
                    </Tooltip>
                    <Popup>
                      <Box sx={{ minWidth: 200 }}>
                        <Typography variant="subtitle2" fontWeight={700}>{p.name}</Typography>
                        <Typography variant="caption" display="block">
                          {indicateurLabels[couche]} : <strong>{val.toLocaleString('fr-FR')}</strong>
                        </Typography>
                        <Typography variant="caption" display="block">
                          Exploitants RNA : <strong>{(p.beneficiaires?.total ?? 0).toLocaleString('fr-FR')}</strong>
                        </Typography>
                        <Typography variant="caption" display="block">
                          Femmes : <strong>{(p.beneficiaires?.femmes ?? 0).toLocaleString('fr-FR')}</strong>
                          {' '}· Jeunes : <strong>{(p.beneficiaires?.jeunes ?? 0).toLocaleString('fr-FR')}</strong>
                        </Typography>
                      </Box>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Sites géolocalisés du projet (API /api/sig/sites) */}
              {afficherSites && sitesVisibles.map((site) => {
                const typeInfo = SITE_TYPES[site.type] ?? SITE_TYPES.autre;
                return (
                  <CircleMarker
                    key={`site-${site.id}`}
                    center={[site.lat, site.lng]}
                    radius={7}
                    pathOptions={{ fillColor: typeInfo.color, color: '#fff', weight: 1.5, fillOpacity: 0.95 }}
                  >
                    <Tooltip>{site.nom}</Tooltip>
                    <Popup>
                      <Box sx={{ minWidth: 210 }}>
                        <Typography variant="subtitle2" fontWeight={700}>{site.nom}</Typography>
                        <Chip
                          label={typeInfo.label}
                          size="small"
                          sx={{ bgcolor: `${typeInfo.color}20`, color: typeInfo.color, fontWeight: 700, my: 0.5 }}
                        />
                        <Typography variant="caption" display="block">
                          {site.province}{site.territoire ? ` · ${site.territoire}` : ''}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Statut : <strong>{STATUT_SITE_LABELS[site.statut] ?? site.statut}</strong>
                        </Typography>
                        {Object.entries(site.details ?? {}).map(([k, v]) => (
                          <Typography key={k} variant="caption" display="block">
                            {k.replace(/_/g, ' ')} : <strong>{String(v)}</strong>
                          </Typography>
                        ))}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {site.lat.toFixed(4)}, {site.lng.toFixed(4)}
                        </Typography>
                        <Button
                          size="small"
                          color="error"
                          startIcon={<GoogleIcon name="delete" size={16} />}
                          onClick={() => supprimerSite(site.id)}
                          sx={{ mt: 0.5 }}
                        >
                          Supprimer
                        </Button>
                      </Box>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </Paper>

          {/* Résumé sous la carte */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {provinces.map((p) => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={p.id}>
                <Card
                  onClick={() => setSelectedId(p.id)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedId === p.id ? '2px solid #7AC143' : '1px solid rgba(148, 163, 184, 0.35)',
                    '&:hover': { borderColor: '#2E7D32' },
                    transition: 'all 0.15s',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: getColor((p.performance_score ?? 0) / 100), mx: 'auto', mb: 0.5, fontSize: 11, fontWeight: 700 }}>
                      {p.code}
                    </Avatar>
                    <Typography variant="caption" display="block" fontWeight={600} noWrap>{p.name}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {(p.beneficiaires?.total ?? 0).toLocaleString('fr-FR')} exploitants
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Densité RNA par territoire (API /api/sig/territoires) */}
          <Paper sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                <GoogleIcon name="travel_explore" size={20} /> Densité RNA par territoire
                {selected ? ` — ${selected.name}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Bénéficiaires enregistrés au RNA par territoire{selected ? '' : ' (12 premiers, toutes provinces)'}
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Province</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Territoire</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Bénéficiaires</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Femmes</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Villages</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {territoiresVisibles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography variant="caption" color="text.secondary">Aucune donnée territoriale</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    territoiresVisibles.map((t) => (
                      <TableRow key={`${t.province}-${t.territoire}`} hover>
                        <TableCell>{t.province}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{t.territoire}</TableCell>
                        <TableCell align="right">{t.beneficiaires.toLocaleString('fr-FR')}</TableCell>
                        <TableCell align="right">
                          {t.femmes.toLocaleString('fr-FR')}
                          {t.beneficiaires > 0 && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {' '}({Math.round((t.femmes / t.beneficiaires) * 100)}%)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">{t.villages.toLocaleString('fr-FR')}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      {/* Dialogue de création d'un site géolocalisé */}
      <Dialog open={nouveauSite !== null} onClose={() => setNouveauSite(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau site du projet</DialogTitle>
        <DialogContent>
          {nouveauSite && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Nom du site"
                size="small"
                fullWidth
                autoFocus
                value={nouveauSite.nom}
                onChange={(e) => setNouveauSite({ ...nouveauSite, nom: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={nouveauSite.type}
                  label="Type"
                  onChange={(e) => setNouveauSite({ ...nouveauSite, type: e.target.value })}
                >
                  {Object.entries(SITE_TYPES).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Province</InputLabel>
                <Select
                  value={nouveauSite.province}
                  label="Province"
                  onChange={(e) => setNouveauSite({ ...nouveauSite, province: e.target.value })}
                >
                  {provinces.map((p) => (
                    <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Territoire (optionnel)"
                size="small"
                fullWidth
                value={nouveauSite.territoire}
                onChange={(e) => setNouveauSite({ ...nouveauSite, territoire: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={nouveauSite.statut}
                  label="Statut"
                  onChange={(e) => setNouveauSite({ ...nouveauSite, statut: e.target.value })}
                >
                  {Object.entries(STATUT_SITE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                Coordonnées (WGS84) : {nouveauSite.lat}, {nouveauSite.lng}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNouveauSite(null)}>Annuler</Button>
          <Button variant="contained" disabled={!nouveauSite?.nom.trim()} onClick={enregistrerSite}>
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CartographiePage;
