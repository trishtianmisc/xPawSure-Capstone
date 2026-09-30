import type { TodayConsultation } from '../types/dashboard.types'

interface TodayConsultationsProps {
  consultations: TodayConsultation[]
}

const STATUS_STYLES: Record<TodayConsultation['status'], string> = {
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  IN_PROGRESS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export function TodayConsultations({ consultations }: TodayConsultationsProps) {
  return (
    <div className="rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-700">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Today&apos;s Consultations</h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Appointments scheduled for today.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 dark:border-stone-700">
              <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Pet name</th>
              <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Breed</th>
              <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Time</th>
              <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Status</th>
              <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {consultations.map((c) => (
              <tr key={c.id} className="border-b border-stone-100 last:border-0 dark:border-stone-700/50">
                <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-200">{c.pet_name}</td>
                <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{c.breed}</td>
                <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{c.time}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status]}`}>
                    {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {c.status === 'PENDING' && (
                      <button
                        className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950"
                        type="button"
                      >
                        Start
                      </button>
                    )}
                    <button
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                      type="button"
                    >
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {consultations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
                  No consultations scheduled for today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
