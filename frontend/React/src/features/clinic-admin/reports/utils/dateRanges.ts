export interface DateWindow {
  date_from: string
  date_to: string
}

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

export function defaultWindow(now = new Date()): DateWindow {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const from = new Date(to)
  from.setDate(from.getDate() - (DEFAULT_WINDOW_DAYS - 1))
  return { date_from: toISODate(from), date_to: toISODate(to) }
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
