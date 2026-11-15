import { clinicToday } from '../../../../utils/format'

export interface DateWindow {
  date_from: string
  date_to: string
}

export type RangePreset =
  | 'today'
  | 'this-month'
  | 'this-month-full'
  | 'this-year'
  | 'last-30'
  | 'custom'

// The page only resolves fixed presets itself; 'custom' keeps whatever window
// the date inputs already hold, so presetWindow never sees it.
export type FixedRangePreset = Exclude<RangePreset, 'custom'>

// The backend defaults to the last 30 clinic-local days when no dates are
// sent. The page always sends explicit dates so the comparison label and the
// CSV filename have concrete values, so the client mirrors that same span.
export const DEFAULT_WINDOW_DAYS = 30

const MS_PER_DAY = 86_400_000

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseISODate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// en-CA formats as YYYY-MM-DD, so the clinic's "today" is a plain calendar
// string that never depends on the browser's own timezone. Mirrors the
// backend's datetime.now(get_clinic_timezone(...)).date() default window.
function clinicISODate(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

export function defaultWindow(now = clinicToday()): DateWindow {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const from = new Date(to)
  from.setDate(from.getDate() - (DEFAULT_WINDOW_DAYS - 1))
  return { date_from: toISODate(from), date_to: toISODate(to) }
}

export function presetWindow(
  preset: FixedRangePreset,
  timeZone: string,
  now = new Date(),
): DateWindow {
  const to = parseISODate(clinicISODate(timeZone, now))
  switch (preset) {
    case 'today':
      return { date_from: toISODate(to), date_to: toISODate(to) }
    case 'this-year':
      // Year-to-date: Jan 1 through today, never future zero days.
      return { date_from: `${to.getFullYear()}-01-01`, date_to: toISODate(to) }
    case 'last-30': {
      const from = new Date(to)
      from.setDate(from.getDate() - 29)
      return { date_from: toISODate(from), date_to: toISODate(to) }
    }
    case 'this-month':
      return {
        date_from: `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}-01`,
        date_to: toISODate(to),
      }
    case 'this-month-full': {
      // Vet Analytics aligns with the Consultations month filter: the whole
      // calendar month, including appointments scheduled after today.
      const from = new Date(to.getFullYear(), to.getMonth(), 1)
      const lastDay = new Date(to.getFullYear(), to.getMonth() + 1, 0)
      return { date_from: toISODate(from), date_to: toISODate(lastDay) }
    }
  }
}

// The baseline behind "vs previous ..." is always the equal-length window
// immediately before the range (the API's previous_window), never a calendar
// month or year, so only day-count wording is honest. Today is exactly one
// day, which reads as "vs yesterday".
export function comparisonLabel(preset: RangePreset, days: number): string {
  if (preset === 'today') return 'vs yesterday'
  return `vs previous ${days} day${days === 1 ? '' : 's'}`
}

// Equal-length window immediately before the requested one: Oct 1-8 (8 days)
// compares against Sep 23-30, never against "last month".
export function previousWindow(date_from: string, date_to: string): DateWindow {
  const from = parseISODate(date_from)
  const to = parseISODate(date_to)
  const length = Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1
  const prevTo = new Date(from)
  prevTo.setDate(prevTo.getDate() - 1)
  const prevFrom = new Date(prevTo)
  prevFrom.setDate(prevFrom.getDate() - (length - 1))
  return { date_from: toISODate(prevFrom), date_to: toISODate(prevTo) }
}

export function windowDays(date_from: string, date_to: string): number {
  const from = parseISODate(date_from)
  const to = parseISODate(date_to)
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) + 1
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function formatRange(date_from: string, date_to: string): string {
  const from = parseISODate(date_from)
  const to = parseISODate(date_to)
  const sameYear = from.getFullYear() === to.getFullYear()
  const fromLabel = from.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
  const toLabel = to.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${fromLabel} – ${toLabel}`
}
