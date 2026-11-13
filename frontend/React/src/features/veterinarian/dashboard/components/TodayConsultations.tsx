import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import { formatDateTime } from '../../../../utils/format'
import type { VetAppointmentSummary } from '../types/dashboard.types'

interface TodayConsultationsProps {
  consultations: VetAppointmentSummary[]
  onView: (aptId: string) => void
}

export function TodayConsultations({ consultations, onView }: TodayConsultationsProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Upcoming Consultations
        </h2>
      </div>
      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {consultations.length > 0 ? (
          consultations.map((c) => (
            <div
              key={c.apt_id}
              onClick={() => onView(c.apt_id)}
              className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  {c.pet_name} — {c.owner_name ?? 'Unknown'}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {c.vet_name ?? 'Unassigned'} · {formatDateTime(c.apt_scheduled_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <AppointmentStatusBadge status={c.apt_status} />
                <span className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400">
                  View
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="px-5 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            No upcoming consultations
          </p>
        )}
      </div>
    </div>
  )
}
