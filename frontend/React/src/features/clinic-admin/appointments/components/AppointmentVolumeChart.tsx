import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { ChartDataPoint } from '../../dashboard/types/dashboard.types'

interface AppointmentVolumeChartProps {
  data: ChartDataPoint[]
}

export function AppointmentVolumeChart({ data }: AppointmentVolumeChartProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
          Appointment Volume — Last 30 Days
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          Daily appointment count
        </span>
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No appointment data available.
        </p>
      ) : (
        <ResponsiveContainer height={200} width="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-stone-200 dark:stroke-stone-700" />
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
