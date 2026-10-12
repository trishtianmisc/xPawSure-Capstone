import { describe, expect, it } from 'vitest'

import type { VolumePoint } from '../services/appointments.service'
import { aggregateVolumeByMonth } from './volume'

function point(date: string, count: number): VolumePoint {
  return { date, count }
}

function dailyRange(startYear: number, startMonth: number, days: number): VolumePoint[] {
  const points: VolumePoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startYear, startMonth - 1, 1 + i)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    points.push({ date: `${d.getFullYear()}-${month}-${day}`, count: 1 })
  }
  return points
}

describe('aggregateVolumeByMonth', () => {
  it('returns an empty array for empty input', () => {
    expect(aggregateVolumeByMonth([])).toEqual([])
  })

  it('groups daily counts into calendar months and sums them', () => {
    const points = [
      point('2026-08-30', 2),
      point('2026-08-31', 3),
      point('2026-09-01', 1),
      point('2026-09-15', 4),
      point('2026-10-01', 7),
    ]
    expect(aggregateVolumeByMonth(points)).toEqual([
      { label: 'Aug', value: 5 },
      { label: 'Sep', value: 5 },
      { label: 'Oct', value: 7 },
    ])
  })

  it('preserves chronological order of first appearance', () => {
    const points = [
      point('2026-07-01', 1),
      point('2026-08-01', 1),
      point('2026-06-01', 1),
    ]
    expect(aggregateVolumeByMonth(points).map((p) => p.label)).toEqual([
      'Jul', 'Aug', 'Jun',
    ])
  })

  it('keeps only the last 12 months when the window is longer', () => {
    const points = dailyRange(2025, 1, 400)
    const result = aggregateVolumeByMonth(points)
    expect(result).toHaveLength(12)
    expect(result[0].label).toBe('Mar')
    expect(result[result.length - 1].label).toBe('Feb')
  })

  it('honors a custom maxMonths value', () => {
    const points = dailyRange(2026, 1, 90)
    const result = aggregateVolumeByMonth(points, 2)
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.label)).toEqual(['Feb', 'Mar'])
  })
})
