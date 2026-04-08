// frontend/src/components/common/Map/InteractiveMap.tsx
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { Box, CircularProgress, Typography, Chip, Stack } from '@mui/material';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Correction des icônes Leaflet par défaut
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface ProvinceData {
  id: string;
  name: string;
  coordinates: [number, number];
  beneficiaires: number;
  femmes: number;
  hommes: number;
  superficiesAIC: number;
  routesRehabilitees: number;
  plainteCount: number;
}

interface InteractiveMapProps {
  onProvinceClick?: (province: ProvinceData) => void;
  height?: number | string;
}

// Données fictives pour les provinces (seront remplacées par l'API)
const provincesData: ProvinceData[] = [
  { id: 'kinshasa', name: 'Kinshasa', coordinates: [-4.4419, 15.2663], beneficiaires: 15230, femmes: 6853, hommes: 8377, superficiesAIC: 1250, routesRehabilitees: 45, plainteCount: 12 },
  { id: 'kongocentral', name: 'Kongo Central', coordinates: [-5.8163, 13.4663], beneficiaires: 18920, femmes: 8514, hommes: 10406, superficiesAIC: 2100, routesRehabilitees: 78, plainteCount: 8 },
  { id: 'kwilu', name: 'Kwilu', coordinates: [-5.0489, 18.8203], beneficiaires: 14250, femmes: 6412, hommes: 7838, superficiesAIC: 1850, routesRehabilitees: 52, plainteCount: 15 },
  { id: 'kasai', name: 'Kasaï', coordinates: [-5.9443, 22.4167], beneficiaires: 16890, femmes: 7600, hommes: 9290, superficiesAIC: 2450, routesRehabilitees: 63, plainteCount: 22 },
  { id: 'hautlomami', name: 'Haut-Lomami', coordinates: [-6.1284, 25.4176], beneficiaires: 11240, femmes: 5058, hommes: 6182, superficiesAIC: 980, routesRehabilitees: 34, plainteCount: 6 },
  { id: 'tanganyika', name: 'Tanganyika', coordinates: [-5.7959, 28.4181], beneficiaires: 9800, femmes: 4410, hommes: 5390, superficiesAIC: 720, routesRehabilitees: 28, plainteCount: 4 },
];

// Composant pour recentrer la carte
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, 6);
  return null;
}

// Fonction pour déterminer la couleur selon le nombre de bénéficiaires
const getMarkerColor = (beneficiaires: number): string => {
  if (beneficiaires > 15000) return '#2E7D32';
  if (beneficiaires > 12000) return '#4CAF50';
  if (beneficiaires > 8000) return '#81C784';
  return '#A5D6A7';
};

// Fonction pour déterminer la taille du marqueur
const getMarkerRadius = (beneficiaires: number): number => {
  return Math.sqrt(beneficiaires) / 8;
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({ onProvinceClick, height = 500 }) => {
  const [loading, setLoading] = useState(true);
  const [center] = useState<[number, number]>([-4.0383, 21.7587]); // Centre de la RDC

  useEffect(() => {
    // Simuler le chargement des données
    setTimeout(() => setLoading(false), 500);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height, bgcolor: '#F1F8E9', borderRadius: 2 }}>
        <CircularProgress sx={{ color: '#2E7D32' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={6}
        style={{ height: typeof height === 'number' ? height : height, width: '100%', borderRadius: '12px' }}
        zoomControl={true}
      >
        <ChangeView center={center} />
        
        {/* Fond de carte */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {/* Marqueurs pour chaque province */}
        {provincesData.map((province) => (
          <CircleMarker
            key={province.id}
            center={province.coordinates}
            radius={getMarkerRadius(province.beneficiaires)}
            fillColor={getMarkerColor(province.beneficiaires)}
            color="#FFFFFF"
            weight={2}
            opacity={1}
            fillOpacity={0.7}
            eventHandlers={{
              click: () => {
                if (onProvinceClick) onProvinceClick(province);
              },
              mouseover: (e) => {
                e.target.openTooltip();
              },
              mouseout: (e) => {
                e.target.closeTooltip();
              },
            }}
          >
            <Tooltip sticky>
              <Box sx={{ p: 1, minWidth: 200 }}>
                <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                  {province.name}
                </Typography>
                <Typography variant="caption" display="block">
                  🌾 Bénéficiaires: {province.beneficiaires.toLocaleString()}
                </Typography>
                <Typography variant="caption" display="block">
                  👩 Femmes: {province.femmes.toLocaleString()} ({Math.round((province.femmes / province.beneficiaires) * 100)}%)
                </Typography>
                <Typography variant="caption" display="block">
                  🗺️ Superficies AIC: {province.superficiesAIC.toLocaleString()} ha
                </Typography>
              </Box>
            </Tooltip>
            <Popup>
              <Box sx={{ p: 1, minWidth: 250 }}>
                <Typography variant="subtitle1" fontWeight={600} color="primary.main" gutterBottom>
                  {province.name}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">🌾 Bénéficiaires:</Typography>
                    <Typography variant="body2" fontWeight={500}>{province.beneficiaires.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">👩 Femmes:</Typography>
                    <Typography variant="body2" fontWeight={500}>{province.femmes.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">👨 Hommes:</Typography>
                    <Typography variant="body2" fontWeight={500}>{province.hommes.toLocaleString()}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">🗺️ Superficies AIC:</Typography>
                    <Typography variant="body2" fontWeight={500}>{province.superficiesAIC.toLocaleString()} ha</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">🛣️ Routes réhabilitées:</Typography>
                    <Typography variant="body2" fontWeight={500}>{province.routesRehabilitees} km</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">⚠️ Plaintes:</Typography>
                    <Typography variant="body2" fontWeight={500} color={province.plainteCount > 15 ? 'error.main' : 'warning.main'}>
                      {province.plainteCount}
                    </Typography>
                  </Box>
                </Stack>
                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <Chip 
                    label="Voir détails" 
                    size="small" 
                    color="primary" 
                    onClick={() => onProvinceClick && onProvinceClick(province)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Box>
              </Box>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Légende */}
      <Box sx={{ 
        position: 'absolute', 
        bottom: 16, 
        right: 16, 
        bgcolor: 'white', 
        p: 1.5, 
        borderRadius: 2, 
        boxShadow: 2,
        zIndex: 1000,
        minWidth: 180
      }}>
        <Typography variant="caption" fontWeight={600} gutterBottom display="block">
          Légende
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#2E7D32' }} />
          <Typography variant="caption">+ de 15 000 bénéficiaires</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#4CAF50' }} />
          <Typography variant="caption">12 000 - 15 000 bénéficiaires</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#81C784' }} />
          <Typography variant="caption">8 000 - 12 000 bénéficiaires</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: '#A5D6A7' }} />
          <Typography variant="caption">Moins de 8 000 bénéficiaires</Typography>
        </Box>
      </Box>
    </Box>
  );
};