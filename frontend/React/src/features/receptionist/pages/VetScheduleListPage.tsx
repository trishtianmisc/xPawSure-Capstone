import { useNavigate } from 'react-router-dom'
import { useVetScheduleList } from '../hooks/useAvailableSlots'

export function VetScheduleListPage() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useVetScheduleList()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Vet Schedule</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Select a veterinarian to view their schedule
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
          ))}
        </div>
      ) : error ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">Failed to load veterinarians</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Retry
            </button>
          </div>
        </div>
      ) : !data || data.vets.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">No veterinarians found</p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              Add veterinarians to your clinic to manage their schedules
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {data.vets.map(vet => (
            <button
              key={vet.stf_id}
              onClick={() => navigate(`/receptionist/schedule/${vet.stf_id}`)}
              className="flex w-full items-center justify-between rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-amber-300 hover:shadow-sm dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-700"
            >
              <div className="flex items-center gap-4">
                <div className="flex size-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  {vet.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
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
                <div className="text-right">
                  <div className="flex items-center gap-2">
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
  )
}
