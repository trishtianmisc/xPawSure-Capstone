export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('63') && digits.length === 12) {
    return `0${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 12)}`
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`
  }
  return phone
}

export function normalizePhoneInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0') && digits.length <= 11) {
    return digits
  }
  if (digits.startsWith('63') && digits.length <= 12) {
    return '0' + digits.slice(2)
  }
  if (digits.startsWith('9') && digits.length <= 10) {
    return '0' + digits
  }
  return digits
}

// Clinic operations run in Philippine time. This is the default for every
// formatter below; callers may still pass a clinic-specific timezone override.
export const CLINIC_TIME_ZONE = 'Asia/Manila'

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

interface ClinicDateParts {
  year: number
  month: number
  day: number
}

export function clinicDateParts(value: Date = new Date()): ClinicDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0)
  return { year: part('year'), month: part('month'), day: part('day') }
}

export function clinicDateKey(value: Date | string = new Date()): string {
  const date = toDate(value)
  if (!date) return ''
  const { year, month, day } = clinicDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// A Date whose local Y/M/D components are today in Manila. Calendar helpers
// (week starts, date inputs) can keep using local getters safely.
export function clinicToday(): Date {
  const { year, month, day } = clinicDateParts()
  return new Date(year, month - 1, day)
}

function isMidnight(date: Date, timeZone: string): boolean {
  // hourCycle h23 (not hour12) so midnight formats as 00, never 24.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? ''
  const minute = parts.find((p) => p.type === 'minute')?.value ?? ''
  return Number(hour) === 0 && Number(minute) === 0
}

export function formatDate(
  value: string | Date | null | undefined,
  timeZone: string = CLINIC_TIME_ZONE,
): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  })
}

/** Local calendar date as `YYYY-MM-DD` for date query params. */
export function isoDate(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * True when the appointment's clinic-local calendar day is after the
 * clinic-local day of `atMs` — check-in is not yet allowed. Mirrors the
 * backend appointment-date gate in appointments/services.py.
 */
export function isFutureClinicDay(scheduledAt: string, atMs: number): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return (
    formatter.format(new Date(scheduledAt)) > formatter.format(new Date(atMs))
  )
}

export function formatDateLong(
  value: string | Date | null | undefined,
  timeZone: string = CLINIC_TIME_ZONE,
): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  })
}

export function formatTime(
  value: string | Date | null | undefined,
  timeZone: string = CLINIC_TIME_ZONE,
): string {
  const date = toDate(value)
  if (!date) return '—'
  if (isMidnight(date, timeZone)) return ''
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  })
}

export function formatClockTime(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim())
  if (!match) return value
  const hours = Number(match[1])
  if (hours > 23) return value
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours % 12 || 12
  return `${hours12}:${minutes} ${period}`
}

export function formatDateTime(
  value: string | Date | null | undefined,
  timeZone: string = CLINIC_TIME_ZONE,
): string {
  const date = toDate(value)
  if (!date) return '—'
  const time = formatTime(date, timeZone)
  return time ? `${formatDate(date, timeZone)} · ${time}` : formatDate(date, timeZone)
}

export function formatRelativeTime(iso: string): string {
  const timestamp = new Date(iso)
  if (Number.isNaN(timestamp.getTime())) return iso

  const diffMs = timestamp.getTime() - Date.now()
  const absMs = Math.abs(diffMs)
  const minuteMs = 60_000
  const hourMs = 3_600_000
  const dayMs = 86_400_000
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (absMs < minuteMs) return rtf.format(Math.round(diffMs / 1000), 'second')
  if (absMs < hourMs) return rtf.format(Math.round(diffMs / minuteMs), 'minute')
  if (absMs < dayMs) return rtf.format(Math.round(diffMs / hourMs), 'hour')
  if (absMs < dayMs * 7) return rtf.format(Math.round(diffMs / dayMs), 'day')

  const sameYear = clinicDateParts(timestamp).year === clinicDateParts().year
  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: CLINIC_TIME_ZONE,
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
