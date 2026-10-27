import type { ScreeningsReport } from '../types/reports.types'

interface ScreeningsAnalyticsCardProps {
  report: ScreeningsReport
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-700/40">
      <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-stone-900 dark:text-stone-100">
        {value}
      </p>
    </div>
  )
}

export function ScreeningsAnalyticsCard({
  report,
}: ScreeningsAnalyticsCardProps) {
  const total = report.reviewed + report.pending_review
  const maxCount = Math.max(...report.by_condition.map((row) => row.count), 1)

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
          AI Screenings
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {total} screening{total === 1 ? '' : 's'}
        </span>
      </div>
      {total === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No screenings in this date range.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              By condition
            </p>
            <ul className="space-y-2.5">
              {report.by_condition.map((row) => (
                <li key={row.disease}>
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate text-stone-600 dark:text-stone-300">
                      {row.disease}
                    </span>
                    <span className="font-semibold text-stone-700 dark:text-stone-200">
                      {row.count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-700">
                    <div
                      className="h-1.5 rounded-full bg-amber-500"
                      style={{
                        width: `${Math.round((row.count / maxCount) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Review progress
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <StatTile
                label="Avg confidence"
                value={`${report.avg_confidence}%`}
              />
              <StatTile label="Reviewed" value={report.reviewed} />
              <StatTile label="Pending review" value={report.pending_review} />
              <StatTile label="Vet confirmed" value={report.vet_confirmed} />
              <StatTile label="Vet changed" value={report.vet_changed} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
              AI output is advisory only and never a diagnosis.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
