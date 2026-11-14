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

/**
 * Shown once the scan's visit is completed and a consultation was recorded.
 * Consulted supersedes Booked: the appointment already happened.
 */
export const CONSULTED_PILL = { label: 'Consulted', bg: '#E6F4EA', fg: '#1E7A46' } as const

/**
 * The single status pill an owner sees for a scan. Consulted wins over Booked;
 * a scan that is neither booked nor consulted shows no pill.
 */
export function screeningStatusPill(isConsulted: boolean, isBooked: boolean) {
  if (isConsulted) return CONSULTED_PILL
  if (isBooked) return BOOKED_PILL
  return null
}
