// frontend/src/components/common/Widget/GradientWidget.tsx
import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface GradientWidgetProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period?: string;
  };
  color?: 'primary' | 'success' | 'warning' | 'info' | 'danger';
  onClick?: () => void;
}

const gradientMap = {
  primary: 'linear-gradient(135deg, #2E7D32, #81C784)',
  success: 'linear-gradient(135deg, #00C853, #69F0AE)',
  warning: 'linear-gradient(135deg, #FF8F00, #FFD54F)',
  info: 'linear-gradient(135deg, #1976D2, #64B5F6)',
  danger: 'linear-gradient(135deg, #D32F2F, #EF9A9A)',
};

export const GradientWidget: React.FC<GradientWidgetProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'primary',
  onClick,
}) => {
  return (
    <Paper
      onClick={onClick}
      sx={{
        background: gradientMap[color],
        borderRadius: 4,
        p: 2.5,
        minHeight: 168,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: 'white',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
        } : {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
        },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, height: '100%' }}>
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {trend.direction === 'up' ? '▲' : '▼'} {trend.value}% {trend.period ? `vs ${trend.period}` : ''}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ fontSize: 40, opacity: 0.8, display: 'flex', alignItems: 'flex-start' }}>{icon}</Box>
      </Box>
    </Paper>
  );
};