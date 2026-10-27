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

interface AppointmentsOverTimeChartProps {
  data: SeriesPoint[]
}

function labelFor(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function AppointmentsOverTimeChart({
  data,
}: AppointmentsOverTimeChartProps) {
  const points = data.map((point) => ({
    label: labelFor(point.date),
    value: point.count,
  }))

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
          Appointments Over Time
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          Daily appointment count
        </span>
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
            <Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
