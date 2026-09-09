import React from 'react';
import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import logoPnda from '../../assets/logo_pnda.png';

interface PndaLogoProps {
  alt?: string;
  height?: number | string;
  sx?: SxProps<Theme>;
}

export const PndaLogo: React.FC<PndaLogoProps> = ({
  alt = 'Logo PNDA',
  height = 56,
  sx,
}) => {
  return (
    <Box
      component="img"
      src={logoPnda}
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