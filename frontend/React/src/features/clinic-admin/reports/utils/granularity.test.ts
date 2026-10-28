import { describe, expect, it } from 'vitest'

import type { SeriesPoint } from '../types/reports.types'
import { aggregateSeries, seriesLabel } from './granularity'

// Oct 19 2026 is a Monday; Oct 24 Sat, Oct 25 Sun, Oct 26 Mon.
const DAILY: SeriesPoint[] = [
  { date: '2026-10-19', count: 2 },
  { date: '2026-10-20', count: 0 },
  { date: '2026-10-24', count: 3 },
  { date: '2026-10-25', count: 4 },
  { date: '2026-10-26', count: 1 },
  { date: '2026-10-31', count: 5 },
  { date: '2026-11-01', count: 6 },
]

describe('aggregateSeries', () => {
  it('returns the series unchanged for daily granularity', () => {
    expect(aggregateSeries(DAILY, 'day')).toBe(DAILY)
  })

  it('buckets Monday–Sunday weeks and sums their counts', () => {
    const weekly = aggregateSeries(DAILY, 'week')
    expect(weekly).toEqual([
      // Oct 19-25: Mon 19 + Tue 20 + Sat 24 + Sun 25
      { date: '2026-10-19', count: 9 },
      // Oct 26 - Nov 1: Mon 26 + Sat 31 + Sun Nov 1
      { date: '2026-10-26', count: 12 },
    ])
  })

  it('keeps Saturday and Sunday of the same week together', () => {
    const weekly = aggregateSeries(
      [
        { date: '2026-10-24', count: 1 },
        { date: '2026-10-25', count: 2 },
      ],
      'week',
    )
    expect(weekly).toEqual([{ date: '2026-10-19', count: 3 }])
  })

  it('buckets calendar months and keeps chronological order', () => {
    const monthly = aggregateSeries(DAILY, 'month')
    expect(monthly).toEqual([
      { date: '2026-10-01', count: 15 },
      { date: '2026-11-01', count: 6 },
    ])
  })

  it('returns an empty array for empty input', () => {
    expect(aggregateSeries([], 'month')).toEqual([])
  })
})

describe('seriesLabel', () => {
  it('formats day and week buckets as a short date', () => {
    expect(seriesLabel('2026-10-19', 'day')).toBe('Oct 19')
    expect(seriesLabel('2026-10-19', 'week')).toBe('Oct 19')
  })

  it('formats month buckets as month and year', () => {
    expect(seriesLabel('2026-11-01', 'month')).toBe('Nov 2026')
  })
})
