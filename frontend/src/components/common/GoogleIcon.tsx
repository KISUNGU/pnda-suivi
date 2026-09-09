import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';

type GoogleIconProps = {
  name: string;
  size?: number | string;
  filled?: boolean;
  sx?: SxProps<Theme>;
};

export function GoogleIcon({ name, size = 24, filled = false, sx }: GoogleIconProps) {
  const opsz = typeof size === 'number' ? size : 24;

  return (
    <Box
      component="span"
      className="material-symbols-rounded"
      aria-hidden="true"
      sx={{
        fontSize: typeof size === 'number' ? `${size}px` : size,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        verticalAlign: 'middle',
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' ${opsz}`,
        ...sx,
      }}
    >
      {name}
    </Box>
  );
}

export default GoogleIcon;