export function formatNotificationRelativeDate(dateString: string): string {
  const target = new Date(dateString);

  if (Number.isNaN(target.getTime())) {
    return dateString;
  }

  const diffMs = target.getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });

  const units: Array<{ unit: Intl.RelativeTimeFormatUnit; ms: number }> = [
    { unit: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
    { unit: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
    { unit: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
    { unit: 'day', ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour', ms: 60 * 60 * 1000 },
    { unit: 'minute', ms: 60 * 1000 },
  ];

  for (const { unit, ms } of units) {
    if (absDiffMs >= ms || unit === 'minute') {
      return formatter.format(Math.round(diffMs / ms), unit);
    }
  }

  return "à l'instant";
}