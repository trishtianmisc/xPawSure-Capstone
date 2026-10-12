import type { AppointmentStatus } from '../types/receptionist.types'

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  CHECKED_IN: {
    label: 'Checked In',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  },
  NO_SHOW: {
    label: 'No-Show',
    className: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  },
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${config.className}`}>
      {config.label}
    </span>
  )
}
