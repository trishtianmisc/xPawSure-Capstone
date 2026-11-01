import { Link } from 'react-router-dom'

import type { VetWorkloadReport } from '../types/reports.types'

interface VetWorkloadTableProps {
  report: VetWorkloadReport
  // When provided, each veterinarian name deep-links to the appointments
  // page pre-filtered to that vet (and the current date range).
  vetHref?: (vetId: string) => string
}

export function VetWorkloadTable({ report, vetHref }: VetWorkloadTableProps) {
  const { results, days } = report

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
          Veterinarian Workload
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          Averages per clinic open day ({days} in range)
        </span>
      </div>
      {results.length === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No assigned appointments in this date range.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-100 text-stone-500 dark:border-stone-700 dark:text-stone-400">
                <th className="pb-3 pr-4 font-semibold">Veterinarian</th>
                <th className="pb-3 pr-4 text-right font-semibold">
                  Appointments
                </th>
                <th className="pb-3 pr-4 text-right font-semibold">
                  Completed
                </th>
                <th className="pb-3 pr-4 text-right font-semibold">
                  No-shows
                </th>
                <th className="pb-3 text-right font-semibold">
                  Avg / open day
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
              {results.map((row) => {
                const href = vetHref?.(row.vet_id)
                return (
                  <tr key={row.vet_id}>
                    <td className="py-3 pr-4 font-semibold text-stone-900 dark:text-stone-100">
                      {href ? (
                        <Link
                          to={href}
                          aria-label={`View appointments for ${row.vet_name}`}
                          className="transition hover:text-amber-700 hover:underline dark:hover:text-amber-400"
                        >
                          {row.vet_name}
                        </Link>
                      ) : (
                        row.vet_name
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-stone-600 dark:text-stone-300">
                      {row.total}
                    </td>
                    <td className="py-3 pr-4 text-right text-stone-600 dark:text-stone-300">
                      {row.completed}
                    </td>
                    <td className="py-3 pr-4 text-right text-stone-600 dark:text-stone-300">
                      {row.no_shows}
                    </td>
                    <td className="py-3 text-right font-semibold text-stone-900 dark:text-stone-100">
                      {row.avg_per_day}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
