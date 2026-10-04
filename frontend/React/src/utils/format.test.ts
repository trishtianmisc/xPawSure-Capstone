import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatTime } from './format'

function localIso(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): string {
  return new Date(year, month - 1, day, hour, minute, second).toISOString()
}

describe('formatDate', () => {
  it('formats an ISO timestamp as "Oct 2, 2026"', () => {
    expect(formatDate(localIso(2026, 10, 2, 22, 55, 6))).toBe('Oct 2, 2026')
  })

  it('returns an em dash for null, empty, or invalid input', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
    expect(formatDate('not-a-date')).toBe('—')
  })
})

describe('formatTime', () => {
  it('formats time without seconds in 12-hour AM/PM format', () => {
    expect(formatTime(localIso(2026, 10, 2, 22, 55, 6))).toBe('10:55 PM')
    expect(formatTime(localIso(2026, 10, 2, 10, 5, 0))).toBe('10:05 AM')
  })

  it('returns an empty string at midnight (no time set)', () => {
    expect(formatTime(localIso(2026, 10, 2, 0, 0, 0))).toBe('')
    expect(formatTime(localIso(2026, 1, 1, 0, 0, 59))).toBe('')
  })

  it('returns an em dash for null or invalid input', () => {
    expect(formatTime(null)).toBe('—')
    expect(formatTime('not-a-date')).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('combines date and time with a middle dot', () => {
    expect(formatDateTime(localIso(2026, 10, 2, 22, 55, 6))).toBe(
      'Oct 2, 2026 · 10:55 PM',
    )
  })

  it('omits the time at midnight', () => {
    expect(formatDateTime(localIso(2026, 10, 2, 0, 0, 0))).toBe('Oct 2, 2026')
  })

  it('returns an em dash for null or invalid input', () => {
    expect(formatDateTime(null)).toBe('—')
    expect(formatDateTime('not-a-date')).toBe('—')
  })
})
