import { Alert, Card } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { useDiseaseReport } from '../hooks/useReports'
import { formatReportMonth } from '../utils/dateFormat'

import type { DiseaseReportParams } from '../types/report.types'

interface DiseasesTabProps {
  params: DiseaseReportParams
}

export function DiseasesTab({ params }: DiseasesTabProps) {
  const { data, isLoading, error } = useDiseaseReport(params)

  if (error) return <Alert variant="error">{apiErrorMessage(error)}</Alert>

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="md">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">AI screenings</p>
          <p className="mt-1 text-3xl font-bold text-stone-900 dark:text-stone-100">
            {data.totals.screenings}
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Predictions recorded by the on-device classifier
          </p>
        </Card>
        <Card padding="md">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Confirmed diagnoses</p>
          <p className="mt-1 text-3xl font-bold text-stone-900 dark:text-stone-100">
            {data.totals.confirmed_diagnoses}
          </p>
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            Consultations with a specific disease recorded
          </p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="md">
          <h3 className="mb-1 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Screenings by disease
          </h3>
          <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
            Structured predictions by disease
          </p>
          {data.screenings_by_disease.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
              No screenings in range.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 dark:border-stone-700 dark:text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Disease</th>
                  <th className="py-2 font-semibold">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {data.screenings_by_disease.map((row) => (
                  <tr key={row.disease}>
                    <td className="py-2.5 pr-3 text-stone-700 dark:text-stone-300">{row.disease}</td>
                    <td className="py-2.5 font-semibold text-stone-800 dark:text-stone-200">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card padding="md">
          <h3 className="mb-1 text-sm font-semibold text-stone-700 dark:text-stone-300">
            Confirmed diagnoses
          </h3>
          <p className="mb-4 text-xs text-stone-400 dark:text-stone-500">
            From consultations, grouped case-insensitively (top 20)
          </p>
          {data.confirmed_by_disease.length === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
              No confirmed diagnoses in range.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 dark:border-stone-700 dark:text-stone-500">
                  <th className="py-2 pr-3 font-semibold">Diagnosis</th>
                  <th className="py-2 font-semibold">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {data.confirmed_by_disease.map((row) => (
                  <tr key={row.disease}>
                    <td className="py-2.5 pr-3 capitalize text-stone-700 dark:text-stone-300">
                      {row.disease}
                    </td>
                    <td className="py-2.5 font-semibold text-stone-800 dark:text-stone-200">
                      {row.count}
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
          Monthly screening volume
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-stone-400 dark:border-stone-700 dark:text-stone-500">
                <th className="py-2 pr-3 font-semibold">Month</th>
                <th className="py-2 font-semibold">Screenings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
              {data.trend.map((point) => (
                <tr key={point.month}>
                  <td className="py-2.5 pr-3 text-stone-700 dark:text-stone-300">
                    {formatReportMonth(point.month)}
                  </td>
                  <td className="py-2.5 text-stone-800 dark:text-stone-200">{point.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
