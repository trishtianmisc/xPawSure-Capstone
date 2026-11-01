import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import type { VetAppointmentSummary } from '../types/dashboard.types'

interface TodayConsultationsProps {
  consultations: VetAppointmentSummary[]
  onStart: (aptId: string) => void
  onView: (aptId: string) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function TodayConsultations({ consultations, onStart, onView }: TodayConsultationsProps) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="border-b border-stone-200 px-6 py-4 dark:border-stone-700">
        <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
          Today&apos;s Consultations
        </h2>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Appointments scheduled for today.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
              <th className="px-5 py-4 font-semibold">Pet name</th>
              <th className="px-5 py-4 font-semibold">Breed</th>
              <th className="px-5 py-4 font-semibold">Time</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
            {consultations.map((c) => (
              <tr
                key={c.apt_id}
                className="transition hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
              >
                <td className="px-5 py-4 font-medium text-stone-900 dark:text-stone-200">
                  {c.pet_name}
                </td>
                <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                  {c.pet_species ?? '—'}
                </td>
                <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                  {formatTime(c.apt_scheduled_at)}
                </td>
                <td className="px-5 py-4">
                  <AppointmentStatusBadge status={c.apt_status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    {c.apt_status === 'CHECKED_IN' && (
                      <button
                        className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
                        onClick={() => onStart(c.apt_id)}
                        type="button"
                      >
                        Start
                      </button>
                    )}
                    <button
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-700"
                      onClick={() => onView(c.apt_id)}
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
