import type { PatientsReport } from '../types/reports.types'

interface PatientDemographicsCardProps {
  report: PatientsReport
}

// The breed list is a long tail; the card shows the head of the distribution
// and folds the rest into a single line so the panel height stays bounded.
const MAX_BREED_ROWS = 8

function BarRow({
  label,
  count,
  maxCount,
}: {
  label: string
  count: number
  maxCount: number
}) {
  return (
    <li>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-stone-600 dark:text-stone-300">
          {label}
        </span>
        <span className="font-semibold text-stone-700 dark:text-stone-200">
          {count}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-100 dark:bg-stone-700">
        <div
          className="h-1.5 rounded-full bg-sky-500"
          style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
        />
      </div>
    </li>
  )
}

function StatTile({ label, value }: { label: string; value: number }) {
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

export function PatientDemographicsCard({
  report,
}: PatientDemographicsCardProps) {
  const shownBreeds = report.by_breed.slice(0, MAX_BREED_ROWS)
  const hiddenBreeds = report.by_breed.slice(MAX_BREED_ROWS)
  const hiddenBreedTotal = hiddenBreeds.reduce(
    (sum, row) => sum + row.count,
    0,
  )
  const maxCount = Math.max(...shownBreeds.map((row) => row.count), 1)
  const sexLabel = (sex: string) => (sex === 'MALE' ? 'Male' : 'Female')

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">
          Patient Demographics
        </h3>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {report.total} patient{report.total === 1 ? '' : 's'} seen in range
        </span>
      </div>
      {report.total === 0 ? (
        <p className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
          No patients seen in this date range.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              By breed
            </p>
            {report.by_breed.length === 0 ? (
              <p className="text-sm text-stone-400 dark:text-stone-500">
                No breed data.
              </p>
            ) : (
              <>
                <ul className="space-y-2.5">
                  {shownBreeds.map((row) => (
                    <BarRow
                      key={row.breed}
                      label={row.breed}
                      count={row.count}
                      maxCount={maxCount}
                    />
                  ))}
                </ul>
                {hiddenBreeds.length > 0 && (
                  <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">
                    +{hiddenBreeds.length} more breed
                    {hiddenBreeds.length === 1 ? '' : 's'} ({hiddenBreedTotal}{' '}
                    patient{hiddenBreedTotal === 1 ? '' : 's'})
                  </p>
                )}
              </>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              By sex
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {report.by_sex.map((row) => (
                <StatTile
                  key={row.sex}
                  label={sexLabel(row.sex)}
                  value={row.count}
                />
              ))}
            </div>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              By age
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {report.age_buckets.map((row) => (
                <StatTile
                  key={row.bucket}
                  label={row.bucket}
                  value={row.count}
                />
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
              Patients are pets with a qualifying visit in this range (all
              veterinarians).
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
