// frontend/src/pages/Outils/CartographiePage.tsx
import React, { useState, useEffect } from 'react';
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
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Avatar,
} from '@mui/material';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import GoogleIcon from '../../components/common/GoogleIcon';

interface ProvincePoint {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  beneficiaires: number;
  cible_beneficiaires: number;
  routes_km: number;
  cible_routes: number;
  production_tonnes: number;
  cible_production: number;
  taux_realisation: number;
  risques_critiques: number;
  plaintes: number;
  projets_actifs: number;
  fournisseurs: number;
  region: string;
}

interface SitePoint {
  id: string;
  nom: string;
  type: 'marche' | 'cler' | 'infrastructure' | 'zone_intervention';
  lat: number;
  lng: number;
  province: string;
  statut: 'actif' | 'en_construction' | 'planifie';
  description: string;
}

const provinces: ProvincePoint[] = [
  {
    id: 'kinshasa', name: 'Kinshasa', code: 'KN', lat: -4.3217, lng: 15.3219,
    beneficiaires: 15230, cible_beneficiaires: 20000,
    routes_km: 45, cible_routes: 80,
    production_tonnes: 2590, cible_production: 4300,
    taux_realisation: 76, risques_critiques: 1, plaintes: 12,
    projets_actifs: 4, fournisseurs: 3, region: 'Centre',
  },
  {
    id: 'kongocentral', name: 'Kongo Central', code: 'KC', lat: -5.3522, lng: 13.9800,
    beneficiaires: 18920, cible_beneficiaires: 25000,
    routes_km: 78, cible_routes: 120,
    production_tonnes: 4440, cible_production: 6700,
    taux_realisation: 85, risques_critiques: 0, plaintes: 8,
    projets_actifs: 5, fournisseurs: 4, region: 'Ouest',
  },
  {
    id: 'kwilu', name: 'Kwilu', code: 'KW', lat: -5.0489, lng: 18.8203,
    beneficiaires: 14250, cible_beneficiaires: 18000,
    routes_km: 52, cible_routes: 90,
    production_tonnes: 3720, cible_production: 5500,
    taux_realisation: 72, risques_critiques: 1, plaintes: 15,
    projets_actifs: 4, fournisseurs: 3, region: 'Ouest',
  },
  {
    id: 'kasai', name: 'Kasaï', code: 'KS', lat: -5.9443, lng: 22.4167,
    beneficiaires: 16890, cible_beneficiaires: 22000,
    routes_km: 63, cible_routes: 100,
    production_tonnes: 5320, cible_production: 7700,
    taux_realisation: 82, risques_critiques: 2, plaintes: 22,
    projets_actifs: 5, fournisseurs: 4, region: 'Centre',
  },
  {
    id: 'hautlomami', name: 'Haut-Lomami', code: 'HL', lat: -8.0000, lng: 26.7333,
    beneficiaires: 11240, cible_beneficiaires: 15000,
    routes_km: 34, cible_routes: 60,
    production_tonnes: 2080, cible_production: 3300,
    taux_realisation: 65, risques_critiques: 0, plaintes: 6,
    projets_actifs: 3, fournisseurs: 2, region: 'Est',
  },
  {
    id: 'tanganyika', name: 'Tanganyika', code: 'TN', lat: -6.1287, lng: 29.1686,
    beneficiaires: 9800, cible_beneficiaires: 12000,
    routes_km: 28, cible_routes: 50,
    production_tonnes: 1590, cible_production: 2700,
    taux_realisation: 58, risques_critiques: 0, plaintes: 4,
    projets_actifs: 2, fournisseurs: 2, region: 'Est',
  },
];

const sites: SitePoint[] = [
  { id: 's1', nom: 'Marché de Kinkole', type: 'marche', lat: -4.3600, lng: 15.5200, province: 'Kinshasa', statut: 'actif', description: 'Marché agricole réhabilité, 450 vendeurs' },
  { id: 's2', nom: 'CLER Matadi-Est', type: 'cler', lat: -5.8200, lng: 13.4600, province: 'Kongo Central', statut: 'actif', description: 'Comité Local d\'Entretien Routier, 35 membres' },
  { id: 's3', nom: 'Route RN1 réhabilitée', type: 'infrastructure', lat: -5.2000, lng: 15.0000, province: 'Kongo Central', statut: 'actif', description: '45 km réhabilités, 12 000 usagers/jour' },
  { id: 's4', nom: 'Marché de Bandundu', type: 'marche', lat: -3.3200, lng: 17.3700, province: 'Kwilu', statut: 'actif', description: 'Marché central réhabilité, 320 vendeurs' },
  { id: 's5', nom: 'Zone intervention Kasaï Central', type: 'zone_intervention', lat: -5.8975, lng: 22.4500, province: 'Kasaï', statut: 'actif', description: '42 villages couverts, 8 200 bénéficiaires' },
  { id: 's6', nom: 'CLER Kamina', type: 'cler', lat: -8.7400, lng: 25.0000, province: 'Haut-Lomami', statut: 'en_construction', description: 'En cours de mise en place, 28 membres' },
  { id: 's7', nom: 'Marché de Kalemie', type: 'marche', lat: -5.9300, lng: 29.2000, province: 'Tanganyika', statut: 'planifie', description: 'Construction prévue T3 2026' },
  { id: 's8', nom: 'Route Kikwit-Idiofa', type: 'infrastructure', lat: -5.0300, lng: 18.8200, province: 'Kwilu', statut: 'en_construction', description: '62 km en cours de réhabilitation' },
];

type CoucheIndicateur = 'beneficiaires' | 'routes' | 'production' | 'taux_realisation' | 'risques';
type TypeSite = 'tous' | 'marche' | 'cler' | 'infrastructure' | 'zone_intervention';

const getColor = (value: number, max: number): string => {
  const pct = value / max;
  if (pct >= 0.75) return '#2E7D32';
  if (pct >= 0.5) return '#FFC107';
  return '#F44336';
};

const getRadius = (value: number, max: number): number => {
  return 10 + (value / max) * 24;
};

const siteColors: Record<string, string> = {
  marche: '#1565C0',
  cler: '#6A1B9A',
  infrastructure: '#E65100',
  zone_intervention: '#00695C',
};

const siteIcons: Record<string, string> = {
  marche: 'storefront',
  cler: 'groups',
  infrastructure: 'construction',
  zone_intervention: 'map',
};

const statutOpacity: Record<string, number> = {
  actif: 1,
  en_construction: 0.6,
  planifie: 0.35,
};

const indicateurLabels: Record<CoucheIndicateur, string> = {
  beneficiaires: 'Bénéficiaires',
  routes: 'Routes réhabilitées (km)',
  production: 'Production agricole (t)',
  taux_realisation: 'Taux de réalisation (%)',
  risques: 'Risques critiques',
};

export const CartographiePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [couche, setCouche] = useState<CoucheIndicateur>('beneficiaires');
  const [filterSite, setFilterSite] = useState<TypeSite>('tous');
  const [selectedProvince, setSelectedProvince] = useState<ProvincePoint | null>(null);
  const [afficherSites, setAfficherSites] = useState(true);
  const [filterProvince, setFilterProvince] = useState('Toutes');

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const getProvinceValue = (p: ProvincePoint): number => {
    switch (couche) {
      case 'beneficiaires': return p.beneficiaires;
      case 'routes': return p.routes_km;
      case 'production': return p.production_tonnes;
      case 'taux_realisation': return p.taux_realisation;
      case 'risques': return p.risques_critiques;
    }
  };

  const getProvinceMax = (): number => {
    const vals = provinces.map(getProvinceValue);
    return Math.max(...vals);
  };

  const filteredSites = sites.filter(s => {
    const matchType = filterSite === 'tous' || s.type === filterSite;
    const matchProvince = filterProvince === 'Toutes' || s.province === filterProvince;
    return matchType && matchProvince;
  });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  const maxVal = getProvinceMax();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
        Cartographie PNDA-SE
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Visualisation géographique des activités, infrastructures et indicateurs du programme
      </Typography>

      <Grid container spacing={3}>
        {/* Panneau gauche : contrôles + détail province */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={2}>
            {/* Couche indicateur */}
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                <GoogleIcon name="layers" size={18} /> Couche indicateur
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel>Indicateur</InputLabel>
                <Select value={couche} label="Indicateur" onChange={e => setCouche(e.target.value as CoucheIndicateur)}>
                  {Object.entries(indicateurLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Paper>

            {/* Filtres sites */}
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                <GoogleIcon name="place" size={18} /> Sites & infrastructures
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={afficherSites ? 'oui' : 'non'}
                onChange={(_, v) => v && setAfficherSites(v === 'oui')}
                size="small"
                fullWidth
                sx={{ mb: 1.5 }}
              >
                <ToggleButton value="oui">Afficher</ToggleButton>
                <ToggleButton value="non">Masquer</ToggleButton>
              </ToggleButtonGroup>

              {afficherSites && (
                <>
                  <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                    <InputLabel>Type de site</InputLabel>
                    <Select value={filterSite} label="Type de site" onChange={e => setFilterSite(e.target.value as TypeSite)}>
                      <MenuItem value="tous">Tous les sites</MenuItem>
                      <MenuItem value="marche">Marchés</MenuItem>
                      <MenuItem value="cler">CLER</MenuItem>
                      <MenuItem value="infrastructure">Infrastructures</MenuItem>
                      <MenuItem value="zone_intervention">Zones d'intervention</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Province</InputLabel>
                    <Select value={filterProvince} label="Province" onChange={e => setFilterProvince(e.target.value)}>
                      <MenuItem value="Toutes">Toutes</MenuItem>
                      {provinces.map(p => <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </>
              )}
            </Paper>

            {/* Légende */}
            <Paper sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Légende</Typography>
              <Stack spacing={0.8}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#2E7D32' }} />
                  <Typography variant="caption">Performance élevée (≥ 75%)</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#FFC107' }} />
                  <Typography variant="caption">Performance moyenne (50–75%)</Typography>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#F44336' }} />
                  <Typography variant="caption">Performance faible (&lt; 50%)</Typography>
                </Stack>
                {afficherSites && (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    {Object.entries(siteColors).map(([type, color]) => (
                      <Stack key={type} direction="row" alignItems="center" spacing={1}>
                        <Box sx={{ width: 12, height: 12, bgcolor: color, borderRadius: 0.5 }} />
                        <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                          {type === 'zone_intervention' ? 'Zone intervention' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </Typography>
                      </Stack>
                    ))}
                    <Divider sx={{ my: 0.5 }} />
                    <Stack direction="row" spacing={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#333', opacity: 1, mt: 0.3 }} />
                      <Typography variant="caption">Actif</Typography>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#333', opacity: 0.6, mt: 0.3 }} />
                      <Typography variant="caption">En construction</Typography>
                    </Stack>
                  </>
                )}
              </Stack>
            </Paper>

            {/* Détail province sélectionnée */}
            {selectedProvince && (
              <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#F1F8E9' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={700}>{selectedProvince.name}</Typography>
                  <Chip
                    label={`${selectedProvince.taux_realisation}%`}
                    size="small"
                    sx={{ bgcolor: getColor(selectedProvince.taux_realisation, 100), color: 'white', fontWeight: 600 }}
                  />
                </Stack>
                <Stack spacing={1.2}>
                  {[
                    { label: 'Bénéficiaires', value: `${selectedProvince.beneficiaires.toLocaleString()} / ${selectedProvince.cible_beneficiaires.toLocaleString()}`, pct: (selectedProvince.beneficiaires / selectedProvince.cible_beneficiaires) * 100 },
                    { label: 'Routes (km)', value: `${selectedProvince.routes_km} / ${selectedProvince.cible_routes}`, pct: (selectedProvince.routes_km / selectedProvince.cible_routes) * 100 },
                    { label: 'Production (t)', value: `${selectedProvince.production_tonnes.toLocaleString()} / ${selectedProvince.cible_production.toLocaleString()}`, pct: (selectedProvince.production_tonnes / selectedProvince.cible_production) * 100 },
                  ].map(row => (
                    <Box key={row.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">{row.label}</Typography>
                        <Typography variant="caption" fontWeight={600}>{row.value}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(row.pct, 100)}
                        sx={{ height: 5, borderRadius: 2, mt: 0.3 }}
                      />
                    </Box>
                  ))}
                  <Divider />
                  <Grid container spacing={1}>
                    {[
                      { icon: 'warning', label: 'Risques', value: selectedProvince.risques_critiques, color: '#F44336' },
                      { icon: 'comment', label: 'Plaintes', value: selectedProvince.plaintes, color: '#E65100' },
                      { icon: 'folder', label: 'Projets', value: selectedProvince.projets_actifs, color: '#2E7D32' },
                      { icon: 'store', label: 'Fourniss.', value: selectedProvince.fournisseurs, color: '#1565C0' },
                    ].map(stat => (
                      <Grid size={{ xs: 6 }} key={stat.label}>
                        <Card sx={{ textAlign: 'center', p: 1 }}>
                          <GoogleIcon name={stat.icon} size={18} sx={{ color: stat.color }} />
                          <Typography variant="h6" fontWeight={700} sx={{ color: stat.color }}>{stat.value}</Typography>
                          <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              </Paper>
            )}
          </Stack>
        </Grid>

        {/* Carte */}
        <Grid size={{ xs: 12, md: 9 }}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden', height: 620 }}>
            <MapContainer
              center={[-4.5, 21.0]}
              zoom={5}
              zoomControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <ZoomControl position="topright" />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />

              {/* Cercles par province */}
              {provinces.map(p => {
                const val = getProvinceValue(p);
                return (
                  <CircleMarker
                    key={p.id}
                    center={[p.lat, p.lng]}
                    radius={getRadius(val, maxVal)}
                    pathOptions={{
                      fillColor: getColor(val, couche === 'taux_realisation' ? 100 : maxVal),
                      color: selectedProvince?.id === p.id ? '#1B5E20' : '#fff',
                      weight: selectedProvince?.id === p.id ? 3 : 1.5,
                      fillOpacity: 0.75,
                    }}
                    eventHandlers={{ click: () => setSelectedProvince(p) }}
                  >
                    <Tooltip permanent direction="center" className="province-label" offset={[0, 0]}>
                      <Box component="span" sx={{ fontWeight: 700, fontSize: 11, color: '#fff' }}>{p.code}</Box>
                    </Tooltip>
                    <Popup>
                      <Box sx={{ minWidth: 180 }}>
                        <Typography variant="subtitle2" fontWeight={700}>{p.name}</Typography>
                        <Typography variant="caption" display="block">{indicateurLabels[couche]} : <strong>{val.toLocaleString()}</strong></Typography>
                        <Typography variant="caption" display="block">Taux réalisation : <strong>{p.taux_realisation}%</strong></Typography>
                        <Typography variant="caption" display="block">Bénéficiaires : <strong>{p.beneficiaires.toLocaleString()}</strong></Typography>
                      </Box>
                    </Popup>
                  </CircleMarker>
                );
              })}

              {/* Sites et infrastructures */}
              {afficherSites && filteredSites.map(site => (
                <CircleMarker
                  key={site.id}
                  center={[site.lat, site.lng]}
                  radius={7}
                  pathOptions={{
                    fillColor: siteColors[site.type],
                    color: siteColors[site.type],
                    weight: 1.5,
                    fillOpacity: statutOpacity[site.statut],
                  }}
                >
                  <Popup>
                    <Box sx={{ minWidth: 180 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <GoogleIcon name={siteIcons[site.type]} size={16} sx={{ color: siteColors[site.type] }} />
                        <Typography variant="subtitle2" fontWeight={700}>{site.nom}</Typography>
                      </Stack>
                      <Typography variant="caption" display="block" color="text.secondary">{site.province}</Typography>
                      <Typography variant="caption" display="block">{site.description}</Typography>
                      <Chip
                        label={site.statut.replace('_', ' ')}
                        size="small"
                        sx={{
                          mt: 0.5,
                          bgcolor: site.statut === 'actif' ? '#E8F5E9' : site.statut === 'en_construction' ? '#FFF3E0' : '#E3F2FD',
                          color: site.statut === 'actif' ? '#2E7D32' : site.statut === 'en_construction' ? '#E65100' : '#1565C0',
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </Paper>

          {/* Résumé statistiques sous la carte */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {provinces.map(p => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={p.id}>
                <Card
                  onClick={() => setSelectedProvince(p)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedProvince?.id === p.id ? '2px solid #2E7D32' : '1px solid #e0e0e0',
                    '&:hover': { borderColor: '#2E7D32' },
                    transition: 'all 0.15s',
                  }}
                >
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 }, textAlign: 'center' }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: getColor(p.taux_realisation, 100), mx: 'auto', mb: 0.5, fontSize: 11, fontWeight: 700 }}>
                      {p.code}
                    </Avatar>
                    <Typography variant="caption" display="block" fontWeight={600} noWrap>{p.name}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">{p.taux_realisation}% réalisé</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CartographiePage;
