import { useState } from 'react'

import { useDeclineVetRequest } from '../hooks/useAppointments'
import { formatDateTime, formatPhone } from '../../../utils/format'
import type { AppointmentDetail, VetRequest } from '../types/receptionist.types'
import { RescheduleModal } from './RescheduleModal'

interface VetRequestCardProps {
  appointment: AppointmentDetail
}

const TYPE_LABEL: Record<VetRequest['type'], string> = {
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
  phone:
    'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
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

// Status drives the tint of the header strip, the pill and the outcome row.
// Full class strings so Tailwind can see them.
const STATUS_STYLES: Record<
  VetRequest['status'],
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

/**
 * The veterinarian's open request on the appointment detail page. The
 * reason text is receptionist-only and must never reach owner or clinic
 * admin payloads; the owner phone sits here so the desk can call while
 * handling the request.
 */
export function VetRequestCard({ appointment }: VetRequestCardProps) {
  const request = appointment.vet_request
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineNote, setDeclineNote] = useState('')
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)
  const decline = useDeclineVetRequest()

  if (!request) return null

  const isOpen = request.status === 'OPEN' && !!appointment.has_open_request
  const canReschedule =
    isOpen &&
    !!appointment.stf_id &&
    (appointment.apt_status === 'PENDING' || appointment.apt_status === 'CONFIRMED')
  const styles = STATUS_STYLES[request.status]
  const isClosed = request.status === 'DECLINED' || request.status === 'RESOLVED'
  const closedVerb = request.status === 'DECLINED' ? 'Declined' : 'Resolved'
  const closedBy = request.resolved_by ?? 'the clinic'
  const elapsed =
    request.requested_at && request.resolved_at
      ? elapsedLabel(request.requested_at, request.resolved_at)
      : null

  function handleDecline() {
    decline.mutate(
      { aptId: appointment.apt_id, note: declineNote.trim() },
      {
        onSuccess: () => {
          setShowDeclineModal(false)
          setDeclineNote('')
        },
      },
    )
  }


  return (
    <section className="mb-5 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800">
      {/* Header: request type on the left, status on the right, tinted by state */}
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

      <div className="p-5">
        {request.reason && (
          <div className="mb-5">
            <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">
              Message
            </p>
            <blockquote className="rounded-none border-l-4 border-stone-300 py-0.5 pl-4 text-base leading-relaxed text-stone-900 dark:border-stone-600 dark:text-stone-100">
              {request.reason}
            </blockquote>
          </div>
        )}

        {/* Timeline: who asked, and how it ended */}
        <div className="space-y-2">
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
                  {formatDateTime(request.requested_at)}
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
                    {formatDateTime(request.resolved_at)}
                  </p>
                )}
              </div>
              {request.status === 'DECLINED' && request.decline_note && (
                <p className="mt-2 border-l-2 border-stone-300 pl-3 text-xs text-stone-600 dark:border-stone-600 dark:text-stone-300">
                  Note: {request.decline_note}
                </p>
              )}
            </div>
          )}
        </div>

        
      </div>

      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <h3 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Decline Request
            </h3>
            <textarea
              value={declineNote}
              onChange={(event) => setDeclineNote(event.target.value)}
              placeholder="Note for the veterinarian (required, 200 characters max)"
              className="mb-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              rows={3}
              maxLength={200}
            />
            <p className="mb-4 text-right text-xs text-stone-400 dark:text-stone-500">
              {declineNote.length}/200
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeclineModal(false)
                  setDeclineNote('')
                }}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={!declineNote.trim() || decline.isPending}
                className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {decline.isPending ? 'Declining...' : 'Decline Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRescheduleModal && (
        <RescheduleModal
          appointment={appointment}
          onClose={() => setShowRescheduleModal(false)}
        />
      )}
    </section>
  )
}

function labelize(value: string): string {
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}
