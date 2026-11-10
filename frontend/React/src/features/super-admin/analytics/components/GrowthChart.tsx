import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { GrowthPoint } from '../types/analytics.types'

interface GrowthChartProps {
  title: string
  subtitle: string
  data: GrowthPoint[]
  color?: string
}

function formatLabel(month: string): string {
  const [year, mon] = month.split('-')
  const date = new Date(Number(year), Number(mon) - 1, 1)
  return date.toLocaleString('default', { month: 'short' })
}

export function GrowthChart({ title, subtitle, data, color = '#d97706' }: GrowthChartProps) {
  const chartData = data.map((point) => ({
    label: formatLabel(point.month),
    value: point.count,
  }))
  const hasData = data.some((point) => point.count > 0)

  return (
    <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">{title}</h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">{subtitle}</span>
      </div>
      {!hasData ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">No data available.</p>
      ) : (
        <ResponsiveContainer height={200} width="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="stroke-stone-200 dark:stroke-stone-700" />
            <XAxis dataKey="label" fontSize={12} tickLine={false} className="text-stone-500 dark:text-stone-400" />
            <YAxis allowDecimals={false} fontSize={12} tickLine={false} className="text-stone-500 dark:text-stone-400" />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
              }}
              labelClassName="font-semibold"
            />
            <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function GrowthChartSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 h-4 w-40 rounded bg-stone-200 dark:bg-stone-700" />
      <div className="h-[200px] rounded bg-stone-100 dark:bg-stone-700/50" />
    </div>
  )
}
