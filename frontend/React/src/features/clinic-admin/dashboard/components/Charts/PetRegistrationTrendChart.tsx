import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { ChartDataPoint } from '../../types/dashboard.types'

interface PetRegistrationTrendChartProps {
  data: ChartDataPoint[]
}

export function PetRegistrationTrendChart({ data }: PetRegistrationTrendChartProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <h3 className="mb-4 text-sm font-bold text-stone-700 dark:text-stone-300">Pet Registration Trend</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">No pet registration data available.</p>
      ) : (
        <ResponsiveContainer height={200} width="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-stone-200 dark:stroke-stone-700" />
            <XAxis dataKey="label" fontSize={12} tickLine={false} className="text-stone-500 dark:text-stone-400" />
            <YAxis fontSize={12} tickLine={false} className="text-stone-500 dark:text-stone-400" />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
              }}
            />
            <Line
              dataKey="value"
              dot={false}
              stroke="#059669"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
