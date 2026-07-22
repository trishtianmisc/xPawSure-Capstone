import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { ChartDataPoint } from '../../types/dashboard.types'

const COLORS = ['#d97706', '#dc2626', '#2563eb', '#059669', '#6b7280']

interface ScreeningsByDiseaseChartProps {
  data: ChartDataPoint[]
}

export function ScreeningsByDiseaseChart({ data }: ScreeningsByDiseaseChartProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <h3 className="mb-4 text-sm font-bold text-stone-700 dark:text-stone-300">AI Screenings by Disease</h3>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">No screening data available.</p>
      ) : (
        <ResponsiveContainer height={200} width="100%">
          <PieChart>
            <Pie
              cx="50%"
              cy="50%"
              data={data}
              dataKey="value"
              endAngle={-270}
              innerRadius={50}
              nameKey="label"
              outerRadius={80}
              paddingAngle={2}
              startAngle={90}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
              }}
              formatter={(value: number, name: string) => [`${value} (${name})`, 'Screenings']}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
