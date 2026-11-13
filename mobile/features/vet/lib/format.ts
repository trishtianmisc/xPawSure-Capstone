import {
  formatDate as formatManilaDate,
  formatTime as formatManilaTime,
  manilaDateParts,
  manilaToday,
} from '../../../src/utils/datetime'

export { formatManilaDate as formatShortDate, formatManilaTime as formatTime }

export function localDateStr(date: Date = manilaToday()): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

export function formatAppointmentStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

export function ageFromBirthDate(birthDate?: string | null): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return '—'
  const now = manilaDateParts()
  const born = manilaDateParts(birth)
  let years = now.year - born.year
  const monthDiff = now.month - born.month
  if (monthDiff < 0 || (monthDiff === 0 && now.day < born.day)) years -= 1
  if (years < 1) return '<1 yr'
  return `${years} yr${years === 1 ? '' : 's'}`
}

const POSITION_LABELS: Record<string, string> = {
  CLINIC_ADMIN: 'Clinic Admin',
  VETERINARIAN: 'Veterinarian',
  RECEPTIONIST: 'Receptionist',
}

export function formatPosition(position?: string | null): string {
  if (!position) return 'N/A'
  return POSITION_LABELS[position] ?? position
}
