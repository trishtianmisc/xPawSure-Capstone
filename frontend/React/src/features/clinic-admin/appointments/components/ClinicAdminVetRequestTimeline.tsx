import { formatDateTime } from '../../../../utils/format'
import type { ClinicAdminVetRequest } from '../types/appointment.types'

const TYPE_LABEL: Record<ClinicAdminVetRequest['type'], string> = {
  RESCHEDULE: 'Reschedule request',
  CANCEL: 'Cancellation request',
}

const ICONS = {
  reschedule:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  cancel:
    'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  open: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  check: 'M5 13l4 4L19 7',
} as const

type IconName = keyof typeof ICONS

function Icon({ name, className = 'size-4' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
    >
      <path d={ICONS[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Same tints as the receptionist's vet request card so the request reads the
// same way in both modules.
const STATUS_STYLES: Record<
  ClinicAdminVetRequest['status'],
  { header: string; pill: string; row: string; rowText: string; icon: IconName }
> = {
  OPEN: {
    header: 'bg-amber-100/80 dark:bg-amber-900/25',
    pill: 'text-amber-800 dark:text-amber-300',
    row: 'bg-amber-100/80 dark:bg-amber-900/25',
    rowText: 'text-amber-800 dark:text-amber-300',
    icon: 'open',
  },
  DECLINED: {
    header: 'bg-stone-200/70 dark:bg-stone-800',
    pill: 'text-stone-700 dark:text-stone-200',
    row: 'bg-stone-100 dark:bg-stone-800/70',
    rowText: 'text-stone-600 dark:text-stone-300',
    icon: 'cancel',
  },
  RESOLVED: {
    header: 'bg-emerald-100/80 dark:bg-emerald-900/25',
    pill: 'text-emerald-800 dark:text-emerald-300',
    row: 'bg-emerald-100/80 dark:bg-emerald-900/25',
    rowText: 'text-emerald-800 dark:text-emerald-300',
    icon: 'check',
  },
}

function labelize(value: string): string {
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? '')
      .join('')
      .toUpperCase() || '?'
  )
}

// "9 min later", "2 hr later", "1 day later". Null when the dates are bad or
// out of order.
function elapsedLabel(from: string, to: string): string | null {
  const minutes = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60000)
  if (!Number.isFinite(minutes) || minutes < 0) return null
  if (minutes < 1) return 'moments later'
  if (minutes < 60) return `${minutes} min later`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr later`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} later`
}

interface ClinicAdminVetRequestTimelineProps {
  request: ClinicAdminVetRequest
  timeZone?: string
}

/**
 * Read-only view of the vet's open request for clinic admin oversight: the
 * request type, its state, and who asked and how the clinic answered. The
 * vet's message and the decline note are receptionist/vet-only, so they are
 * never rendered here.
 */
export function ClinicAdminVetRequestTimeline({
  request,
  timeZone,
}: ClinicAdminVetRequestTimelineProps) {
  const styles = STATUS_STYLES[request.status]
  const isClosed = request.status === 'DECLINED' || request.status === 'RESOLVED'
  const closedVerb = request.status === 'DECLINED' ? 'Declined' : 'Resolved'
  const closedBy = request.resolved_by ?? 'the clinic'
  const elapsed =
    request.requested_at && request.resolved_at
      ? elapsedLabel(request.requested_at, request.resolved_at)
      : null

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div
        className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${styles.header}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/70 text-stone-700 dark:bg-stone-900/40 dark:text-stone-200">
            <Icon
              name={request.type === 'CANCEL' ? 'cancel' : 'reschedule'}
              className="size-5"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Veterinarian request
            </p>
            <h2 className="text-base font-semibold leading-tight text-stone-900 dark:text-stone-100">
              {TYPE_LABEL[request.type]}
            </h2>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-white/70 py-1 pl-2.5 pr-3 text-xs font-semibold dark:bg-stone-900/40 ${styles.pill}`}
        >
          <Icon name={styles.icon} className="size-3.5" />
          {request.status === 'OPEN' ? 'Open' : labelize(request.status)}
        </span>
      </div>

      <div className="space-y-2 p-5">
        {request.requested_by && (
          <div className="flex items-center gap-3 rounded-2xl bg-stone-50 px-3 py-2.5 dark:bg-stone-900/40">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
              {initials(request.requested_by)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                {request.requested_by}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">Requested</p>
            </div>
            {request.requested_at && (
              <p className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                {formatDateTime(request.requested_at, timeZone)}
              </p>
            )}
          </div>
        )}

        {isClosed && (
          <div className={`rounded-2xl px-3 py-2.5 ${styles.row}`}>
            <div className="flex items-center gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full bg-white/70 text-xs font-bold text-stone-700 dark:bg-stone-900/40 dark:text-stone-200">
                {initials(closedBy)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {closedBy}
                </p>
                <p className={`text-xs ${styles.rowText}`}>
                  {closedVerb}
                  {elapsed && <> · {elapsed}</>}
                </p>
              </div>
              {request.resolved_at && (
                <p className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                  {formatDateTime(request.resolved_at, timeZone)}
                </p>
              )}
            </div>
          </div>
        )}

        {!isClosed && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Awaiting the reception desk.
          </p>
        )}
      </div>
    </section>
  )
}
