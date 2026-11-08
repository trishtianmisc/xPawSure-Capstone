import { describe, expect, it } from 'vitest'

import {
  DEFAULT_WINDOW_DAYS,
  defaultWindow,
  formatRange,
  formatShortDate,
  previousWindow,
  toISODate,
  windowDays,
} from './dateRanges'

describe('toISODate', () => {
  it('formats local dates as zero-padded YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('defaultWindow', () => {
  it('spans DEFAULT_WINDOW_DAYS ending today', () => {
    const window = defaultWindow(new Date(2026, 9, 26))
    expect(window.date_to).toBe('2026-10-26')
    expect(window.date_from).toBe('2026-09-27')
    expect(windowDays(window.date_from, window.date_to)).toBe(DEFAULT_WINDOW_DAYS)
  })

  it('is inclusive across a month boundary', () => {
    const window = defaultWindow(new Date(2026, 2, 3))
    expect(window.date_from).toBe('2026-02-02')
    expect(window.date_to).toBe('2026-03-03')
  })
})

describe('previousWindow', () => {
  it('uses an equal-length window immediately before, not calendar months', () => {
    expect(previousWindow('2026-10-01', '2026-10-08')).toEqual({
      date_from: '2026-09-23',
      date_to: '2026-09-30',
    })
  })

  it('handles a single-day window', () => {
    expect(previousWindow('2026-10-01', '2026-10-01')).toEqual({
      date_from: '2026-09-30',
      date_to: '2026-09-30',
    })
  })

  it('crosses year boundaries', () => {
    expect(previousWindow('2026-01-01', '2026-01-03')).toEqual({
      date_from: '2025-12-29',
      date_to: '2025-12-31',
    })
  })
})

describe('windowDays', () => {
  it('counts both ends of the range', () => {
    expect(windowDays('2026-10-01', '2026-10-08')).toBe(8)
    expect(windowDays('2026-10-01', '2026-10-01')).toBe(1)
    expect(windowDays('2026-02-28', '2026-03-01')).toBe(2)
  })
})

describe('formatShortDate', () => {
  it('renders month and day', () => {
    expect(formatShortDate('2026-10-05')).toBe('Oct 5')
  })
})

describe('formatRange', () => {
  it('omits the start year inside the same year', () => {
    expect(formatRange('2026-10-01', '2026-10-08')).toBe('Oct 1 – Oct 8, 2026')
  })

  it('keeps the start year when the range spans years', () => {
    expect(formatRange('2025-12-30', '2026-01-02')).toBe(
      'Dec 30, 2025 – Jan 2, 2026',
    )
  })
})
