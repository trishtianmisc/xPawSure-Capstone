import type { AppointmentStatus, VetAppointmentSummary } from '../types/dashboard.types'

interface ConsultationsTableProps {
  consultations: VetAppointmentSummary[]
  onView: (aptId: string) => void
  onStart: (aptId: string) => void
}

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CHECKED_IN: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  NO_SHOW: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked In',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
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
    <div className="overflow-x-auto rounded-md border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-stone-200 dark:border-stone-700">
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Pet name</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Breed</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Date</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Time</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Status</th>
            <th className="px-6 py-3 font-semibold text-stone-500 dark:text-stone-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {consultations.map((c) => {
            const canStart = c.apt_status === 'CHECKED_IN'

            return (
              <tr key={c.apt_id} className="border-b border-stone-100 last:border-0 dark:border-stone-700/50">
                <td className="px-6 py-4 font-medium text-stone-900 dark:text-stone-200">{c.pet_name}</td>
                <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{c.pet_species ?? '—'}</td>
                <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{formatDate(c.apt_scheduled_at)}</td>
                <td className="px-6 py-4 text-stone-500 dark:text-stone-400">{formatTime(c.apt_scheduled_at)}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.apt_status]}`}>
                    {STATUS_LABELS[c.apt_status]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {canStart && (
                      <button
                        className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950"
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
  )
}
