import { useNavigate } from 'react-router-dom'

import { Button } from '../../../components/ui'
import { useVetScheduleList } from '../hooks/useAvailableSlots'
import { PageHero } from '../components/PageHero'
import { apiErrorMessage } from '../../../utils/error'

export function VetScheduleListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error, refetch, isFetching } = useVetScheduleList()

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <PageHero
            title="Vet Schedule"
            subtitle="Select a veterinarian to view their schedule."
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          </div>
        ) : error ? (
          <div className="overflow-hidden rounded-md border border-stone-200 bg-white py-16 text-center shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <svg
              className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">Failed to load veterinarians</h3>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">{apiErrorMessage(error)}</p>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="mt-4"
              loading={isFetching}
              onClick={() => refetch()}
            >
              Try again
            </Button>
          </div>
        ) : !data || data.vets.length === 0 ? (
          <div className="overflow-hidden rounded-md border border-stone-200 bg-white py-16 text-center shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <svg
              className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
            <h3 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No veterinarians found</h3>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              Add veterinarians to your clinic to manage their schedules.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.vets.map((vet) => (
              <button
                key={vet.stf_id}
                onClick={() => navigate(`/receptionist/schedule/${vet.stf_id}`)}
                className="flex w-full items-center justify-between rounded-md border border-stone-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/50 hover:shadow-sm dark:border-stone-700 dark:bg-stone-800 dark:hover:border-amber-700 dark:hover:bg-amber-900/10"
              >
                <div className="flex items-center gap-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    {vet.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-stone-900 dark:text-stone-100">
                      {vet.full_name}
                    </div>
                    <div className="text-xs text-stone-500 dark:text-stone-400">
                      Veterinarian
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {vet.today_summary.has_slots ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <span className="size-1.5 rounded-full bg-green-500" />
                          {vet.today_summary.available} open
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          <span className="size-1.5 rounded-full bg-blue-500" />
                          {vet.today_summary.booked} booked
                        </span>
                        {vet.today_summary.blocked > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <span className="size-1.5 rounded-full bg-red-500" />
                            {vet.today_summary.blocked} blocked
                          </span>
                        )}
                      </>
                    ) : vet.today_summary.is_working ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        No slots generated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                        Closed today
                      </span>
                    )}
                  </div>
                  <svg className="size-5 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
