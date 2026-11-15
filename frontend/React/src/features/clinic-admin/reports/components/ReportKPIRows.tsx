import { Button } from '../../../../components/ui'
import { formatPeso } from '../../../../utils/currency'
import type {
  ReportRevenue,
  SummaryCounts,
} from '../types/reports.types'
import {
  countDelta,
  optionalRateDelta,
  rateDelta,
  type Delta,
} from '../utils/kpiDeltas'
import { KpiCard } from './KpiCard'

// Revenue compares as percent change. A previous total of 0 has no
// meaningful baseline, so the card says so instead of inventing a delta.
function revenueDelta(current: number, previous: number): Delta {
  if (previous === 0) return { direction: 'flat', text: 'No prior data' }
  const pct = Math.round(((current - previous) / previous) * 100)
  return {
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    text: `${pct > 0 ? '+' : ''}${pct}%`,
  }
}

interface ReportKPIRowsProps {
  summary: SummaryCounts
  previous: SummaryCounts
  agreementRate: number | null
  previousAgreementRate: number | null
  // Preset-aware wording for the equal-length baseline ("vs previous 13
  // days", "vs yesterday", ...), computed by the page so the printable
  // report and the screen always agree.
  comparisonLabel: string
  vetSelected: boolean
  revenue?: ReportRevenue
  revenueLoading?: boolean
  revenueError?: unknown
  onRevenueRetry?: () => void
}

export function ReportKPIRows({
  summary,
  previous,
  agreementRate,
  previousAgreementRate,
  comparisonLabel,
  vetSelected,
  revenue,
  revenueLoading,
  revenueError,
  onRevenueRetry,
}: ReportKPIRowsProps) {
  const comparison = comparisonLabel

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-stone-700 dark:text-stone-300">
          Key Metrics
        </h2>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {comparison}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label="Total Appointments"
          value={String(summary.total_appointments)}
          delta={countDelta(summary.total_appointments, previous.total_appointments)}
          goodDirection="up"
        />
        <KpiCard
          label="No-Show Rate"
          value={`${summary.no_show_rate}%`}
          delta={rateDelta(summary.no_show_rate, previous.no_show_rate)}
          goodDirection="down"
          hint="of elapsed, non-cancelled visits"
        />
        <KpiCard
          label="AI-Vet Agreement Rate"
          value={agreementRate === null ? '—' : `${agreementRate}%`}
          delta={optionalRateDelta(agreementRate, previousAgreementRate)}
          goodDirection="up"
          hint="of judged AI screenings"
        />
        <KpiCard
          label={vetSelected ? 'New Patients (all vets)' : 'New Patients'}
          value={String(summary.new_patients)}
          delta={countDelta(summary.new_patients, previous.new_patients)}
          goodDirection="up"
          hint="first visit at this clinic"
        />
        {/* Revenue runs on its own query, so it loads, fails, and retries
            without ever replacing the summary-driven cards above. */}
        {revenueLoading ? (
          <div className="h-32 animate-pulse rounded-xl border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800" />
        ) : revenueError ? (
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Revenue
            </p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950 dark:text-stone-100">
              &mdash;
            </p>
            <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
              Failed to load
            </p>
            {onRevenueRetry && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="mt-2"
                onClick={onRevenueRetry}
              >
                Try again
              </Button>
            )}
          </div>
        ) : revenue ? (
          <KpiCard
            label="Revenue"
            value={formatPeso(revenue.revenue)}
            delta={revenueDelta(
              Number(revenue.revenue),
              Number(revenue.previous_revenue),
            )}
            goodDirection="up"
            hint={`${revenue.payment_count} payment${revenue.payment_count === 1 ? '' : 's'}`}
            valueClassName="text-2xl"
          />
        ) : (
          <KpiCard
            label="Revenue"
            value="—"
            delta={null}
            goodDirection="up"
            hint="No data"
          />
        )}
      </div>
    </div>
  )
}
