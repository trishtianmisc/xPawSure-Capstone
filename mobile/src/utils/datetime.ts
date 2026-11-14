// The app is operated by Philippine clinics, so every displayed timestamp is
// rendered in Manila time regardless of the device's own time zone.
export const APP_TIME_ZONE = 'Asia/Manila'

type DateInput = string | Date | null | undefined

export interface ManilaDateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

function toDate(value: DateInput): Date | null {
  if (value == null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function manilaDateParts(value: Date = new Date()): ManilaDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((entry) => entry.type === type)?.value ?? 0)
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
  }
}

export function manilaDateKey(value: DateInput = new Date()): string {
  const date = toDate(value)
  if (!date) return ''
  const { year, month, day } = manilaDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// A Date whose local Y/M/D components are today in Manila. Calendar helpers
// can keep using local getters safely on the result.
export function manilaToday(): Date {
  const { year, month, day } = manilaDateParts()
  return new Date(year, month - 1, day)
}

export function manilaHour(): number {
  return manilaDateParts().hour
}

const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
}

const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
}

export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS,
): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleDateString('en-US', { ...options, timeZone: APP_TIME_ZONE })
}

export function formatTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTIONS,
): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleTimeString('en-US', { ...options, timeZone: APP_TIME_ZONE })
}

export function formatDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = { ...DEFAULT_DATE_OPTIONS, ...DEFAULT_TIME_OPTIONS },
): string {
  const date = toDate(value)
  if (!date) return '—'
  return date.toLocaleString('en-US', { ...options, timeZone: APP_TIME_ZONE })
}
