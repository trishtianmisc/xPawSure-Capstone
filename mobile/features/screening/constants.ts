import type { ScreeningStatus } from './types'

export const DISEASE_META: Record<string, { color: string; icon: string }> = {
  ALLERGIC_DERMATITIS: { color: '#E67E22', icon: 'alert-circle-outline' },
  BACTERIAL: { color: '#C0392B', icon: 'bacteria-outline' },
  FUNGAL: { color: '#8E44AD', icon: 'flower-tulip-outline' },
  HOTSPOT: { color: '#D35400', icon: 'fire' },
  MANGE: { color: '#27AE60', icon: 'bug-outline' },
}

export const STATUS_STYLES: Record<ScreeningStatus, { label: string; bg: string; fg: string }> = {
  PENDING_REVIEW: { label: 'Pending review', bg: '#FFF4E0', fg: '#B25E09' },
  REVIEWED: { label: 'Reviewed', bg: '#E4EEFB', fg: '#2E5F9E' },
  CONFIRMED: { label: 'Confirmed', bg: '#E5F9E7', fg: '#1B8A3B' },
  DISMISSED: { label: 'Dismissed', bg: '#FFE5E5', fg: '#D92D2D' },
}
