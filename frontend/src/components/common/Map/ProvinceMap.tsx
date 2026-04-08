// frontend/src/components/common/Map/ProvinceMap.tsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import { Box, CircularProgress, Typography, Paper, Stack } from '@mui/material';
import type { Feature, FeatureCollection, Point } from 'geojson';
import 'leaflet/dist/leaflet.css';

interface ProvinceMapProps {
  provinces: any[];
  onProvinceSelect: (province: any) => void;
  selectedProvince?: string;
  height?: number | string;
}

type ProvinceGeoFeature = Feature<Point, { name: string; code: string }>;

// Données géographiques simplifiées pour Kwilu, Kasaï et Kasaï Central
const provincesGeoJSON: FeatureCollection<Point, { name: string; code: string }> = {
  type: 'FeatureCollection',
  features: [
    { 
      type: 'Feature', 
      properties: { name: 'Kwilu', code: 'KW' }, 
      geometry: { type: 'Point', coordinates: [18.8203, -5.0489] } 
    },
    { 
      type: 'Feature', 
      properties: { name: 'Kasaï', code: 'KS' }, 
      geometry: { type: 'Point', coordinates: [22.4167, -5.9443] } 
    },
    { 
      type: 'Feature', 
      properties: { name: 'Kasaï Central', code: 'KC' }, 
      geometry: { type: 'Point', coordinates: [22.4500, -5.8975] } 
    },
  ],
};

const getProvinceColor = (progression: number) => {
  if (progression >= 75) return '#2E7D32';
  if (progression >= 50) return '#FFC107';
  return '#F44336';
};

export const ProvinceMap: React.FC<ProvinceMapProps> = ({ 
  provinces, 
  onProvinceSelect, 
  selectedProvince,
  height = 450 
}) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        center={[-5.5, 20.5]}
        zoom={6.5}
        style={{ height: typeof height === 'number' ? height : height, width: '100%', borderRadius: '12px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {provinces.map((province) => {
          const feature: ProvinceGeoFeature | undefined = provincesGeoJSON.features.find(f => f.properties.name === province.name);
          if (!feature) return null;
          
          return (
            <GeoJSON
              key={province.id}
              data={feature}
              style={() => ({
                fillColor: getProvinceColor(province.progression || 50),
                weight: selectedProvince === province.id ? 3 : 1,
                color: selectedProvince === province.id ? '#2E7D32' : '#FFFFFF',
                fillOpacity: 0.6,
              })}
              eventHandlers={{
                click: () => onProvinceSelect(province),
              }}
            >
              <Tooltip sticky>
                <Box sx={{ p: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {province.name}
                  </Typography>
                  <Typography variant="caption" display="block">
                    🌾 Bénéficiaires: {province.beneficiaires?.total?.toLocaleString() || 0}
                  </Typography>
                  <Typography variant="caption" display="block">
                    📈 Progression: {province.progression || 0}%
                  </Typography>
                </Box>
              </Tooltip>
            </GeoJSON>
          );
        })}
      </MapContainer>
      
      {/* Légende - Correction des caractères > et < */}
      <Paper sx={{ position: 'absolute', bottom: 16, right: 16, p: 1.5, borderRadius: 2, boxShadow: 2, zIndex: 1000 }}>
        <Typography variant="caption" fontWeight={600} gutterBottom display="block">
          Légende
        </Typography>
        <Stack spacing={0.5}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#2E7D32', borderRadius: 1 }} />
            <Typography variant="caption">Performance élevée (plus de 75%)</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#FFC107', borderRadius: 1 }} />
            <Typography variant="caption">Performance moyenne (50-75%)</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 16, height: 16, bgcolor: '#F44336', borderRadius: 1 }} />
            <Typography variant="caption">Performance faible (moins de 50%)</Typography>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
};