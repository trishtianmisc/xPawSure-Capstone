const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const

/** Strict YYYY-MM-DD format + real calendar date (rejects 2023-02-30). */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_PATTERN.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/** True only for a valid date strictly after today (date-only, local time). */
export function isFutureIsoDate(value: string): boolean {
  if (!isValidIsoDate(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return new Date(year, month - 1, day).getTime() > startOfToday.getTime()
}

/** Formats a Date from local components (no timezone drift). */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parses YYYY-MM-DD into a local Date; falls back to today when invalid. */
export function isoToDate(value: string): Date {
  if (isValidIsoDate(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date()
}

/** Display form like "Feb 1, 2023"; empty string when invalid. */
export function formatBirthDateDisplay(value: string): string {
  if (!isValidIsoDate(value)) return ''
  const [year, month, day] = value.split('-').map(Number)
  return `${MONTH_ABBR[month - 1]} ${day}, ${year}`
}
