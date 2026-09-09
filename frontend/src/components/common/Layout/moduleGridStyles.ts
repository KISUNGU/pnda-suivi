import type { SxProps, Theme } from '@mui/material/styles';

export const moduleGridStyles = {
  summaryGrid: {
    mb: 4,
    alignItems: 'stretch',
    '& > .MuiGrid-root': {
      display: 'flex',
    },
  } satisfies SxProps<Theme>,
  filterPanel: { p: 2, mb: 3, borderRadius: 2 } satisfies SxProps<Theme>,
  sectionPanel: {
    p: 2,
    borderRadius: 2,
    minHeight: 168,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  } satisfies SxProps<Theme>,
  elevatedPanel: {
    p: 2.5,
    borderRadius: 2.1,
    minHeight: 168,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  } satisfies SxProps<Theme>,
  statCard: {
    borderRadius: 2,
    minHeight: 168,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  } satisfies SxProps<Theme>,
  statAccentCard: (accentColor: string, backgroundColor?: string): SxProps<Theme> => ({
    borderRadius: 2,
    minHeight: 168,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: `4px solid ${accentColor}`,
    ...(backgroundColor ? { bgcolor: backgroundColor } : {}),
  }),
};