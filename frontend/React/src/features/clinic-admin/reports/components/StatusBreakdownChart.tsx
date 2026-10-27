import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import type { StatusCount } from '../types/reports.types'

// Seven statuses, one color each, so the legend never shifts between
// periods. Gray for cancelled reads as "dropped" rather than "bad".
const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#2563eb',
  CHECKED_IN: '#0891b2',
  IN_PROGRESS: '#7c3aed',
  COMPLETED: '#059669',
  CANCELLED: '#6b7280',
  NO_SHOW: '#dc2626',
}

function statusLabel(code: string): string {
  const lower = code.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

interface StatusBreakdownChartProps {
  data: StatusCount[]
}

export function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  const points = data.map((row) => ({
    label: statusLabel(row.status),
    value: row.count,
    color: STATUS_COLORS[row.status] ?? '#6b7280',
  }))
  const total = points.reduce((sum, point) => sum + point.value, 0)

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
          Status Breakdown
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {total} appointment{total === 1 ? '' : 's'}
        </span>
      </div>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No appointments in this date range.
        </p>
      ) : (
        <>
          <ResponsiveContainer height={180} width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={points}
                dataKey="value"
                endAngle={-270}
                innerRadius={45}
                nameKey="label"
                outerRadius={75}
                paddingAngle={2}
                startAngle={90}
              >
                {points.map((point) => (
                  <Cell key={point.label} fill={point.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e7e5e4',
                  fontSize: '13px',
                }}
                formatter={(value, name) => [
                  `${value ?? ''} (${name ?? ''})`,
                  'Appointments',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
            {points.map((point) => (
              <div
                key={point.label}
                className="flex items-center justify-between gap-2 text-xs text-stone-600 dark:text-stone-400"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: point.color }}
                  />
                  <span className="truncate">{point.label}</span>
                </span>
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {point.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
