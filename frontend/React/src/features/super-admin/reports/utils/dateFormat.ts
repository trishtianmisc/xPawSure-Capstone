const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
})

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatReportDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value

  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  if (date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) {
    return value
  }
  return longDateFormatter.format(date)
}

export function formatReportMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return value

  const [, year, month] = match
  const monthNumber = Number(month)
  if (monthNumber < 1 || monthNumber > 12) return value

  return monthFormatter.format(new Date(Date.UTC(Number(year), monthNumber - 1, 1)))
}
