import type { SeriesPoint } from '../types/reports.types'
import { toISODate } from './dateRanges'

export type Granularity = 'day' | 'week' | 'month'

// Calendar-aligned buckets: weeks run Monday–Sunday, months follow the
// calendar. The daily input series is zero-filled across the range, so every
// day lands in exactly one bucket and buckets stay in chronological order.
// Partial weeks/months at the range edges are partial by design.
function bucketStart(date: string, granularity: Granularity): string {
  if (granularity === 'day') return date
  const parsed = new Date(`${date}T00:00:00`)
  if (granularity === 'week') {
    const daysSinceMonday = (parsed.getDay() + 6) % 7
    parsed.setDate(parsed.getDate() - daysSinceMonday)
  } else {
    parsed.setDate(1)
  }
  return toISODate(parsed)
}

export function aggregateSeries(
  series: SeriesPoint[],
  granularity: Granularity,
): SeriesPoint[] {
  if (granularity === 'day') return series
  const buckets: SeriesPoint[] = []
  const byKey = new Map<string, SeriesPoint>()
  for (const point of series) {
    const key = bucketStart(point.date, granularity)
    let bucket = byKey.get(key)
    if (!bucket) {
      bucket = { date: key, count: 0 }
      byKey.set(key, bucket)
      buckets.push(bucket)
    }
    bucket.count += point.count
  }
  return buckets
}

// Bucket keys are always a day within the bucket, so labels only need to
// distinguish the granularity: day/week show a date (the week label is the
// Monday it starts on), month shows month + year.
export function seriesLabel(date: string, granularity: Granularity): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (granularity === 'month') {
    return parsed.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
