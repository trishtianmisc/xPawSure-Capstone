import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import type { VetAppointmentSummary } from '../types/dashboard.types'

interface ConsultationsTableProps {
  consultations: VetAppointmentSummary[]
  onView: (aptId: string) => void
  onStart: (aptId: string) => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function ConsultationsTable({ consultations, onView, onStart }: ConsultationsTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-400">
              <th className="px-5 py-4 font-semibold">Pet name</th>
              <th className="px-5 py-4 font-semibold">Breed</th>
              <th className="px-5 py-4 font-semibold">Date</th>
              <th className="px-5 py-4 font-semibold">Time</th>
              <th className="px-5 py-4 font-semibold">Status</th>
              <th className="px-5 py-4 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
            {consultations.map((c) => {
              const canStart = c.apt_status === 'CHECKED_IN'

              return (
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
                    {formatDate(c.apt_scheduled_at)}
                  </td>
                  <td className="px-5 py-4 text-stone-500 dark:text-stone-400">
                    {formatTime(c.apt_scheduled_at)}
                  </td>
                  <td className="px-5 py-4">
                    <AppointmentStatusBadge status={c.apt_status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {canStart && (
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
              )
            })}
            {consultations.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-500 dark:text-stone-400">
                  No consultations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
