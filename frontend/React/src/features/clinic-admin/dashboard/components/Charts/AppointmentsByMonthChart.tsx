import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { ChartDataPoint } from '../../types/dashboard.types'

interface AppointmentsByMonthChartProps {
  data: ChartDataPoint[]
}

export function AppointmentsByMonthChart({ data }: AppointmentsByMonthChartProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <h3 className="mb-4 text-sm font-bold text-stone-700 dark:text-stone-300">Appointments by Month</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">No appointment data available.</p>
      ) : (
        <ResponsiveContainer height={200} width="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-stone-200 dark:stroke-stone-700" />
            <XAxis dataKey="label" fontSize={12} tickLine={false} className="text-stone-500 dark:text-stone-400" />
            <YAxis fontSize={12} tickLine={false} className="text-stone-500 dark:text-stone-400" />
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

export function ChartSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 h-4 w-40 rounded bg-stone-200 dark:bg-stone-700" />
      <div className="h-[200px] rounded bg-stone-100 dark:bg-stone-700/50" />
    </div>
  )
}
