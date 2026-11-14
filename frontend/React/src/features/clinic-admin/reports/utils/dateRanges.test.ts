import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_WINDOW_DAYS,
  comparisonLabel,
  defaultWindow,
  formatRange,
  formatShortDate,
  presetWindow,
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
  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('defaults to the Manila calendar day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T16:30:00Z'))

    expect(defaultWindow()).toEqual({
      date_from: '2026-09-03',
      date_to: '2026-10-02',
    })
  })
})

describe('presetWindow', () => {
  // 12:00Z on Oct 26 is already Oct 26 evening in Manila: the clinic's
  // calendar day, not the browser's UTC day, must decide the window.
  const NOW = new Date('2026-10-26T12:00:00Z')
  const TZ = 'Asia/Manila'

  it('resolves Today to a single clinic-local day', () => {
    expect(presetWindow('today', TZ, NOW)).toEqual({
      date_from: '2026-10-26',
      date_to: '2026-10-26',
    })
  })

  it('resolves This month from the 1st through today with no future days', () => {
    expect(presetWindow('this-month', TZ, NOW)).toEqual({
      date_from: '2026-10-01',
      date_to: '2026-10-26',
    })
  })

  it('resolves This year as year-to-date, never a full calendar year', () => {
    expect(presetWindow('this-year', TZ, NOW)).toEqual({
      date_from: '2026-01-01',
      date_to: '2026-10-26',
    })
  })

  it('resolves Last 30 days as exactly 30 inclusive days ending today', () => {
    const window = presetWindow('last-30', TZ, NOW)
    expect(window).toEqual({ date_from: '2026-09-27', date_to: '2026-10-26' })
    expect(windowDays(window.date_from, window.date_to)).toBe(30)
  })

  it('uses the clinic timezone, not the browser or UTC day', () => {
    // 20:00Z on Nov 1 is already Nov 2 in Manila (UTC+8).
    const lateUtc = new Date('2026-11-01T20:00:00Z')
    expect(presetWindow('today', TZ, lateUtc).date_to).toBe('2026-11-02')
    expect(presetWindow('this-month', TZ, lateUtc)).toEqual({
      date_from: '2026-11-01',
      date_to: '2026-11-02',
    })
    expect(presetWindow('this-year', TZ, lateUtc).date_from).toBe('2026-01-01')
    expect(presetWindow('last-30', TZ, lateUtc).date_from).toBe('2026-10-04')
  })

  it('handles year-to-date across a leap-year boundary', () => {
    expect(
      presetWindow('this-year', TZ, new Date('2028-01-01T12:00:00Z')),
    ).toEqual({ date_from: '2028-01-01', date_to: '2028-01-01' })
    // 2028 is a leap year: Feb 1 + 29 inclusive days lands on Mar 1.
    expect(
      presetWindow('last-30', TZ, new Date('2028-03-01T12:00:00Z')),
    ).toEqual({ date_from: '2028-02-01', date_to: '2028-03-01' })
  })
})

describe('comparisonLabel', () => {
  it('calls the single-day baseline yesterday', () => {
    expect(comparisonLabel('today', 1)).toBe('vs yesterday')
  })

  it('counts days for equal-length windows of any preset', () => {
    expect(comparisonLabel('this-month', 28)).toBe('vs previous 28 days')
    expect(comparisonLabel('this-year', 299)).toBe('vs previous 299 days')
    expect(comparisonLabel('last-30', 30)).toBe('vs previous 30 days')
    expect(comparisonLabel('custom', 8)).toBe('vs previous 8 days')
  })

  it('never claims a calendar month or year for the baseline', () => {
    for (const [preset, days] of [
      ['this-month', 31],
      ['this-year', 366],
      ['custom', 30],
    ] as const) {
      expect(comparisonLabel(preset, days)).not.toMatch(/month|year/)
    }
  })

  it('uses singular day wording for a one-day custom range', () => {
    expect(comparisonLabel('custom', 1)).toBe('vs previous 1 day')
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
