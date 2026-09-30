import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { ChartDataPoint } from '../../types/dashboard.types'

interface VetWorkloadChartProps {
  data: ChartDataPoint[]
}

export function VetWorkloadChart({ data }: VetWorkloadChartProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <h3 className="mb-4 text-sm font-bold text-stone-700 dark:text-stone-300">Vet Workload Distribution</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">No workload data available.</p>
      ) : (
        <ResponsiveContainer height={200} width="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="currentColor" className="stroke-stone-200 dark:stroke-stone-700" />
            <XAxis allowDecimals={false} type="number" fontSize={12} tickLine={false} className="text-stone-500 dark:text-stone-400" />
            <YAxis dataKey="label" type="category" fontSize={12} tickLine={false} width={110} className="text-stone-500 dark:text-stone-400" />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
              }}
              labelClassName="font-semibold"
            />
            <Bar dataKey="value" fill="#d97706" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="value" position="right" fontSize={12} className="fill-stone-500 dark:fill-stone-400" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
