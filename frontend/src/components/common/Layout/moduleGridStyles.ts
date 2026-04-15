import type { SxProps, Theme } from '@mui/material/styles';

export const moduleGridStyles = {
  summaryGrid: { mb: 4 } satisfies SxProps<Theme>,
  filterPanel: { p: 2, mb: 3, borderRadius: 2 } satisfies SxProps<Theme>,
  sectionPanel: { p: 2, borderRadius: 2 } satisfies SxProps<Theme>,
  elevatedPanel: { p: 2.5, borderRadius: 3 } satisfies SxProps<Theme>,
  statCard: { borderRadius: 2, height: '100%' } satisfies SxProps<Theme>,
  statAccentCard: (accentColor: string, backgroundColor?: string): SxProps<Theme> => ({
    borderRadius: 2,
    height: '100%',
    borderLeft: `4px solid ${accentColor}`,
    ...(backgroundColor ? { bgcolor: backgroundColor } : {}),
  }),
};