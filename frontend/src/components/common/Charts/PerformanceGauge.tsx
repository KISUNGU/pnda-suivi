// frontend/src/components/common/Charts/PerformanceGauge.tsx
import React from 'react';
import { Box, Typography, Paper, LinearProgress } from '@mui/material';
import GoogleIcon from '../GoogleIcon';

interface PerformanceGaugeProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export const PerformanceGauge: React.FC<PerformanceGaugeProps> = ({
  title,
  current,
  target,
  unit = '%',
  color = 'primary',
}) => {
  const percentage = Math.min((current / target) * 100, 100);
  
  const getColor = () => {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'primary';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const colorValue = color === 'primary' ? getColor() : color;

  return (
    <Paper sx={{ p: 2, borderRadius: '7px' }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 1, minWidth: 0 }}>
        <Typography
          fontWeight={700}
          color={`${colorValue}.main`}
          sx={{
            fontSize: 'clamp(1.25rem, 2.4vw, 1.7rem)',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {current}{unit}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          / {target}{unit}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 8,
          borderRadius: '8px',
          bgcolor: 'action.selected',
          '& .MuiLinearProgress-bar': {
            bgcolor: `${colorValue}.main`,
            borderRadius: '8px',
          },
        }}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Progression: {percentage.toFixed(0)}%
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {percentage >= 50 ? (
            <GoogleIcon name="trending_up" size={24} sx={{ color: 'success.main' }} />
          ) : (
            <GoogleIcon name="trending_down" size={24} sx={{ color: 'error.main' }} />
          )}
          <Typography variant="caption" color="text.secondary">
            {percentage >= target ? 'Objectif atteint' : `Encore ${(target - current).toFixed(0)}${unit}`}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};