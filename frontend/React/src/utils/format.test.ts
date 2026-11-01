import { describe, expect, it } from 'vitest'

import {
  CLINIC_TIME_ZONE,
  formatClockTime,
  formatDate,
  formatDateTime,
  formatTime,
} from './format'

describe('formatClockTime', () => {
  it('formats morning times with AM', () => {
    expect(formatClockTime('08:00')).toBe('8:00 AM')
    expect(formatClockTime('09:30')).toBe('9:30 AM')
  })

  it('formats noon as PM and midnight as AM', () => {
    expect(formatClockTime('12:00')).toBe('12:00 PM')
    expect(formatClockTime('00:15')).toBe('12:15 AM')
  })

  it('formats afternoon and evening times with PM', () => {
    expect(formatClockTime('13:05')).toBe('1:05 PM')
    expect(formatClockTime('17:30')).toBe('5:30 PM')
  })

  it('tolerates HH:MM:SS input', () => {
    expect(formatClockTime('09:00:00')).toBe('9:00 AM')
  })

  it('returns invalid input unchanged', () => {
    expect(formatClockTime('')).toBe('')
    expect(formatClockTime('morning')).toBe('morning')
    expect(formatClockTime('24:00')).toBe('24:00')
  })
})

describe('clinic time zone formatting', () => {
  it('renders a UTC timestamp in Asia/Manila', () => {
    expect(formatDateTime('2026-10-08T10:40:00Z', CLINIC_TIME_ZONE)).toBe(
      'Oct 8, 2026 · 6:40 PM',
    )
  })

  it('rolls the date over to the Manila calendar day', () => {
    // 16:30 UTC is already 00:30 the next day in Manila.
    expect(formatDate('2026-10-01T16:30:00Z', CLINIC_TIME_ZONE)).toBe(
      'Oct 2, 2026',
    )
    expect(formatTime('2026-10-01T16:30:00Z', CLINIC_TIME_ZONE)).toBe('12:30 AM')
  })

  it('omits the time for Manila midnight but keeps the date', () => {
    // 16:00 UTC == 00:00 PHT the next day.
    expect(formatDateTime('2026-10-08T16:00:00Z', CLINIC_TIME_ZONE)).toBe(
      'Oct 9, 2026',
    )
  })

  it('keeps em dash for empty values regardless of time zone', () => {
    expect(formatDateTime(null, CLINIC_TIME_ZONE)).toBe('—')
    expect(formatDate(undefined, CLINIC_TIME_ZONE)).toBe('—')
  })
})
