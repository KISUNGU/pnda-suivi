import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import logoSamentor from '../../assets/samantor-logo.png';

interface SamentorLogoProps {
  alt?: string;
  height?: number | string;
  sx?: SxProps<Theme>;
}

export const SamentorLogo: React.FC<SamentorLogoProps> = ({
  alt = 'Logo Samentor',
  height = 56,
  sx,
}) => {
  return (
    <Box
      component="img"
      src={logoSamentor}
      alt={alt}
      sx={{
        display: 'block',
        height,
        width: 'auto',
        objectFit: 'contain',
        filter: 'drop-shadow(0 8px 14px rgba(0, 0, 0, 0.18))',
        ...sx,
      }}
    />
  );
};