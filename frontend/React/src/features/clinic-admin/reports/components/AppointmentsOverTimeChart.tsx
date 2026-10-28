import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { SeriesPoint } from '../types/reports.types'
import { seriesLabel, type Granularity } from '../utils/granularity'

interface AppointmentsOverTimeChartProps {
  data: SeriesPoint[]
  granularity: Granularity
  onGranularityChange: (granularity: Granularity) => void
}

const GRANULARITY_OPTIONS: Array<{ value: Granularity; label: string }> = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
]

const SUBTITLES: Record<Granularity, string> = {
  day: 'Daily appointment count',
  week: 'Weekly totals · weeks start Monday',
  month: 'Monthly totals',
}

export function AppointmentsOverTimeChart({
  data,
  granularity,
  onGranularityChange,
}: AppointmentsOverTimeChartProps) {
  const points = data.map((point) => ({
    label: seriesLabel(point.date, granularity),
    value: point.count,
  }))

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            Appointments Over Time
          </h3>
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {SUBTITLES[granularity]}
          </span>
        </div>
        <div
          className="flex shrink-0 overflow-hidden rounded-md border border-stone-200 dark:border-stone-700"
          role="group"
          aria-label="Chart granularity"
        >
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={granularity === option.value}
              onClick={() => onGranularityChange(option.value)}
              className={`px-2.5 py-1 text-xs font-semibold transition ${
                granularity === option.value
                  ? 'bg-amber-700 text-white'
                  : 'text-stone-500 hover:bg-stone-50 dark:text-stone-400 dark:hover:bg-stone-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {points.every((point) => point.value === 0) ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No appointments in this date range.
        </p>
      ) : (
        <ResponsiveContainer height={220} width="100%">
          <BarChart data={points}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="stroke-stone-200 dark:stroke-stone-700"
            />
            <XAxis
              dataKey="label"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd"
              className="text-stone-500 dark:text-stone-400"
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              allowDecimals={false}
              className="text-stone-500 dark:text-stone-400"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
              }}
              labelClassName="font-semibold"
            />
            <Bar dataKey="value" fill="#a85015" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
