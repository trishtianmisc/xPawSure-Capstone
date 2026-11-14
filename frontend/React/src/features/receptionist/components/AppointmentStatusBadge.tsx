import type { AppointmentStatus } from '../types/receptionist.types'

export const UNIFORM_APPOINTMENT_BADGE_CLASS =
  'inline-flex h-[1.625rem] w-[7.25rem] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-1.5 font-bold uppercase leading-none tracking-wide'

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; className: string }> = {
  REVIEW: {
    label: 'Needs Review',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  CONFIRMATION: {
    label: 'Awaiting Payment',
    className: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  },
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
    className: 'bg-stone-300 text-stone-900 dark:bg-stone-700 dark:text-stone-100',
  },
}

export function AppointmentStatusBadge({
  status,
  compact = false,
  uniform = false,
}: {
  status: AppointmentStatus
  compact?: boolean
  uniform?: boolean
}) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING
  const hasLongLabel = config.label.length > 9

  const sizeClass = compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
  const badgeClass = uniform
    ? `${UNIFORM_APPOINTMENT_BADGE_CLASS} ${
        hasLongLabel ? 'text-[10px]' : 'text-xs'
      } ${config.className}`
    : `inline-flex shrink-0 items-center rounded-full font-bold uppercase tracking-wide ${sizeClass} ${config.className}`

  return <span className={badgeClass}>{config.label}</span>
}
