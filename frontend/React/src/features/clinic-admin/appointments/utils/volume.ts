import type { ChartDataPoint } from '../../dashboard/types/dashboard.types'
import type { VolumePoint } from '../services/appointments.service'

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function aggregateVolumeByMonth(
  points: VolumePoint[],
  maxMonths = 12,
): ChartDataPoint[] {
  const totals = new Map<string, number>()
  const order: string[] = []
  for (const point of points) {
    const monthKey = point.date.slice(0, 7)
    if (!totals.has(monthKey)) {
      totals.set(monthKey, 0)
      order.push(monthKey)
    }
    totals.set(monthKey, (totals.get(monthKey) ?? 0) + point.count)
  }
  const result: ChartDataPoint[] = order.map((monthKey) => ({
    label: MONTH_LABELS[Number(monthKey.slice(5, 7)) - 1] ?? monthKey,
    value: totals.get(monthKey) ?? 0,
  }))
  return result.slice(-maxMonths)
}
