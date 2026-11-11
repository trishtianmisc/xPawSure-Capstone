import { Alert, Badge, Card } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { useAccuracyReport } from '../hooks/useReports'

import type { AccuracyReportParams } from '../types/report.types'

interface AccuracyTabProps {
  params: AccuracyReportParams
}

function percent(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`
}

export function AccuracyTab({ params }: AccuracyTabProps) {
  const { data, isLoading, error } = useAccuracyReport(params)

  if (error) return <Alert variant="error">{apiErrorMessage(error)}</Alert>

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
      </div>
    )
  }

  if (!data) return null

  const { summary } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card padding="md">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Accuracy</p>
          <p className="mt-1 text-3xl font-bold text-stone-900 dark:text-stone-100">
            {percent(summary.accuracy_percent)}
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            {summary.compared} of {summary.total_screenings} screenings compared
          </p>
        </Card>
        <Card padding="md">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Correct</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {summary.correct}
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            {summary.incorrect} incorrect of {summary.compared} compared
          </p>
        </Card>
        <Card padding="md">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Awaiting comparison</p>
          <p className="mt-1 text-3xl font-bold text-stone-900 dark:text-stone-100">
            {summary.awaiting_comparison}
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Screenings without a confirmed diagnosis yet
          </p>
        </Card>
      </div>

      <p className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        Preliminary analytics only: device predictions are compared against the veterinarian's
        confirmed diagnosis after the fact. Agreement is never treated as confirmation.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            By model version
          </h3>
          {data.by_model_version.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
              No compared screenings yet.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 dark:border-stone-700 dark:text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Version</th>
                  <th className="py-2 pr-3 font-semibold">Compared</th>
                  <th className="py-2 pr-3 font-semibold">Correct</th>
                  <th className="py-2 font-semibold">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {data.by_model_version.map((row) => (
                  <tr key={row.model_version}>
                    <td className="py-2.5 pr-3 font-mono text-xs text-stone-700 dark:text-stone-300">
                      {row.model_version}
                    </td>
                    <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{row.compared}</td>
                    <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{row.correct}</td>
                    <td className="py-2.5 font-semibold text-stone-800 dark:text-stone-200">
                      {percent(row.accuracy_percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card padding="md">
          <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
            By disease
          </h3>
          {data.by_disease.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
              No compared screenings yet.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 dark:border-stone-700 dark:text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Disease</th>
                  <th className="py-2 pr-3 font-semibold">Compared</th>
                  <th className="py-2 pr-3 font-semibold">Correct</th>
                  <th className="py-2 font-semibold">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {data.by_disease.map((row) => (
                  <tr key={row.disease}>
                    <td className="py-2.5 pr-3 text-stone-700 dark:text-stone-300">{row.disease}</td>
                    <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{row.compared}</td>
                    <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{row.correct}</td>
                    <td className="py-2.5 font-semibold text-stone-800 dark:text-stone-200">
                      {percent(row.accuracy_percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card padding="md">
        <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
          By clinic
        </h3>
        {data.by_clinic.length === 0 ? (
          <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
            No compared screenings yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 dark:border-stone-700 dark:text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Clinic</th>
                  <th className="py-2 pr-3 font-semibold">Compared</th>
                  <th className="py-2 pr-3 font-semibold">Correct</th>
                  <th className="py-2 font-semibold">Accuracy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {data.by_clinic.map((row) => (
                  <tr key={row.clinic_id}>
                    <td className="py-2.5 pr-3 text-stone-700 dark:text-stone-300">{row.clinic_name}</td>
                    <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{row.compared}</td>
                    <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{row.correct}</td>
                    <td className="py-2.5 font-semibold text-stone-800 dark:text-stone-200">
                      {percent(row.accuracy_percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="md">
        <h3 className="mb-4 text-sm font-semibold text-stone-700 dark:text-stone-300">
          Monthly trend
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 dark:border-stone-700 dark:text-stone-500">
                <th className="py-2 pr-3 font-semibold">Month</th>
                <th className="py-2 pr-3 font-semibold">Compared</th>
                <th className="py-2 pr-3 font-semibold">Correct</th>
                <th className="py-2 font-semibold">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
              {data.trend.map((point) => (
                <tr key={point.month}>
                  <td className="py-2.5 pr-3 text-stone-700 dark:text-stone-300">{point.month}</td>
                  <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{point.compared}</td>
                  <td className="py-2.5 pr-3 text-stone-500 dark:text-stone-400">{point.correct}</td>
                  <td className="py-2.5 text-stone-800 dark:text-stone-200">
                    {point.compared > 0
                      ? percent(Math.round((point.correct * 1000) / point.compared) / 10)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {data.model_versions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Versions seen:
          </span>
          {data.model_versions.map((version) => (
            <Badge key={version} variant="info">{version}</Badge>
          ))}
        </div>
      )}
    </div>
  )
}
