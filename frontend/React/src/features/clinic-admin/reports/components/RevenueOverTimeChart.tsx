import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatPeso, formatPesoCompact } from '../../../../utils/currency'
import type { RevenueSeriesPoint } from '../types/reports.types'
import { seriesLabel, type Granularity } from '../utils/granularity'

interface RevenueOverTimeChartProps {
  series: RevenueSeriesPoint[]
  // Deep link into the payments page pre-filtered to this exact range and
  // PAID status, so the chart's total and the payments list reconcile.
  paymentsHref: string
}

// Monthly buckets arrive as YYYY-MM, daily as YYYY-MM-DD; the chart keys off
// that shape instead of asking the backend which one it sent.
function chartGranularity(series: RevenueSeriesPoint[]): Granularity {
  return series[0]?.date.length === 7 ? 'month' : 'day'
}

export function RevenueOverTimeChart({
  series,
  paymentsHref,
}: RevenueOverTimeChartProps) {
  const granularity = chartGranularity(series)
  const points = series.map((point) => {
    // seriesLabel parses YYYY-MM-DD, so month keys need their day attached.
    const labelDate =
      granularity === 'month' ? `${point.date}-01` : point.date
    return {
      axis: seriesLabel(labelDate, granularity),
      // Full date in the tooltip: a bare "Oct 5" hides the year.
      tip:
        granularity === 'month'
          ? seriesLabel(labelDate, 'month')
          : new Date(`${point.date}T00:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
      revenue: Number(point.amount),
    }
  })

  const allZero = points.every((point) => point.revenue === 0)

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
            Revenue Over Time
          </h3>
          <span className="text-xs text-stone-400 dark:text-stone-500">
            {granularity === 'month'
              ? 'Monthly paid revenue'
              : 'Daily paid revenue'}
          </span>
        </div>
        <Link
          to={paymentsHref}
          className="shrink-0 text-xs font-semibold text-amber-700 transition hover:text-amber-800 hover:underline dark:text-amber-400 dark:hover:text-amber-300 print:hidden"
        >
          View payments
        </Link>
      </div>
      {allZero ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No payments in this date range.
        </p>
      ) : (
        <ResponsiveContainer height={220} width="100%">
          <AreaChart data={points}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="stroke-stone-200 dark:stroke-stone-700"
            />
            <XAxis
              dataKey="axis"
              fontSize={11}
              tickLine={false}
              interval="preserveStartEnd"
              className="text-stone-500 dark:text-stone-400"
            />
            <YAxis
              fontSize={12}
              tickLine={false}
              tickFormatter={formatPesoCompact}
              className="text-stone-500 dark:text-stone-400"
            />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e7e5e4',
                fontSize: '13px',
              }}
              labelClassName="font-semibold"
              formatter={(value) => [formatPeso(Number(value)), 'Revenue']}
              labelFormatter={(_label, payload) =>
                payload?.[0]?.payload?.tip ?? ''
              }
            />
            {/* One series only: paid revenue. Dots stay visible so a
                1-3 point range (e.g. a month inside a yearly view) still
                reads day by day. */}
            <Area
              dataKey="revenue"
              name="Revenue"
              type="monotone"
              stroke="#a85015"
              strokeWidth={2}
              fill="#a85015"
              fillOpacity={0.15}
              dot={{ r: 2, fill: '#a85015', strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
