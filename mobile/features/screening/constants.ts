export const DISEASE_META: Record<string, { color: string; icon: string }> = {
  ALLERGIC_DERMATITIS: { color: '#E67E22', icon: 'alert-circle-outline' },
  BACTERIAL: { color: '#C0392B', icon: 'bacteria-outline' },
  FUNGAL: { color: '#8E44AD', icon: 'flower-tulip-outline' },
  HOTSPOT: { color: '#D35400', icon: 'fire' },
  MANGE: { color: '#27AE60', icon: 'bug-outline' },
}

/**
 * Owners only ever see whether a scan led to a booked appointment — the
 * internal review workflow (pending/reviewed/confirmed) is not shown.
 */
export const BOOKED_PILL = { label: 'Booked', bg: '#E4EEFB', fg: '#2E5F9E' } as const
