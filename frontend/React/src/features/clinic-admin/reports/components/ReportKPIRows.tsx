import type { SummaryCounts } from '../types/reports.types'

type Direction = 'up' | 'down' | 'flat'
type GoodDirection = 'up' | 'down'

interface Delta {
  direction: Direction
  text: string
}

interface KpiCardProps {
  label: string
  value: string
  delta: Delta | null
  goodDirection: GoodDirection
  hint?: string
}

// Rates compare in percentage points; counts compare as percent change.
// A previous count of 0 has no meaningful baseline, so no delta is shown.
function countDelta(current: number, previous: number): Delta | null {
  if (previous === 0) return null
  const pct = Math.round(((current - previous) / previous) * 100)
  return {
    direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat',
    text: `${pct > 0 ? '+' : ''}${pct}%`,
  }
}

function rateDelta(current: number, previous: number): Delta {
  const pts = Math.round((current - previous) * 10) / 10
  return {
    direction: pts > 0 ? 'up' : pts < 0 ? 'down' : 'flat',
    text: `${pts > 0 ? '+' : ''}${pts} pts`,
  }
}

function deltaClasses(direction: Direction, good: GoodDirection): string {
  if (direction === 'flat') return 'text-stone-400 dark:text-stone-500'
  const isGood = (direction === 'up') === (good === 'up')
  return isGood
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400'
}

function KpiCard({ label, value, delta, goodDirection, hint }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-stone-950 dark:text-stone-100">
        {value}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        {delta ? (
          <span
            className={`flex items-center gap-0.5 text-xs font-semibold ${deltaClasses(delta.direction, goodDirection)}`}
          >
            {delta.direction !== 'flat' && (
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d={
                    delta.direction === 'up'
                      ? 'M5 10l7-7m0 0l7 7m-7-7v18'
                      : 'M19 14l-7 7m0 0l-7-7m7 7V3'
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            )}
            {delta.text}
          </span>
        ) : (
          <span className="text-xs font-semibold text-stone-400 dark:text-stone-500">
            &mdash;
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-0.5 text-[11px] text-stone-400 dark:text-stone-500">
          {hint}
        </p>
      )}
    </div>
  )
}

interface ReportKPIRowsProps {
  summary: SummaryCounts
  previous: SummaryCounts
  days: number
  vetSelected: boolean
}

export function ReportKPIRows({
  summary,
  previous,
  days,
  vetSelected,
}: ReportKPIRowsProps) {
  const comparison = `vs previous ${days} day${days === 1 ? '' : 's'}`

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
          label="Completion Rate"
          value={`${summary.completion_rate}%`}
          delta={rateDelta(summary.completion_rate, previous.completion_rate)}
          goodDirection="up"
          hint="of elapsed, non-cancelled visits"
        />
        <KpiCard
          label="No-Show Rate"
          value={`${summary.no_show_rate}%`}
          delta={rateDelta(summary.no_show_rate, previous.no_show_rate)}
          goodDirection="down"
          hint="of elapsed, non-cancelled visits"
        />
        <KpiCard
          label="Cancellation Rate"
          value={`${summary.cancellation_rate}%`}
          delta={rateDelta(summary.cancellation_rate, previous.cancellation_rate)}
          goodDirection="down"
          hint="of all appointments"
        />
        <KpiCard
          label={vetSelected ? 'New Patients (all vets)' : 'New Patients'}
          value={String(summary.new_patients)}
          delta={countDelta(summary.new_patients, previous.new_patients)}
          goodDirection="up"
          hint="first visit at this clinic"
        />
      </div>
    </div>
  )
}
