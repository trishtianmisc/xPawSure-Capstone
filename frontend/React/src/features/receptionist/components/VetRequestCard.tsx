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

const STATUS_BADGE: Record<VetRequest['status'], string> = {
  OPEN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  DECLINED: 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
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
  const decline = useDeclineVetRequest()

  if (!request) return null

  const isOpen = request.status === 'OPEN' && !!appointment.has_open_request
  const canReschedule =
    isOpen &&
    !!appointment.stf_id &&
    (appointment.apt_status === 'PENDING' || appointment.apt_status === 'CONFIRMED')

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
    <section className="mb-5 rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
          Veterinarian request
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_BADGE[request.status]}`}>
          {request.status === 'OPEN' ? 'Open' : labelize(request.status)}
        </span>
        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700 dark:bg-stone-700 dark:text-stone-200">
          {TYPE_LABEL[request.type]}
        </span>
      </div>

      {request.reason && (
        <p className="mb-3 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700 dark:bg-stone-900/40 dark:text-stone-300">
          {request.reason}
        </p>
      )}

      <div className="space-y-1 text-xs text-stone-500 dark:text-stone-400">
        {request.requested_by && (
          <p>
            Requested by {request.requested_by}
            {request.requested_at && <> · {formatDateTime(request.requested_at)}</>}
          </p>
        )}
        {appointment.owner_phone && (
          <p>Owner phone · {formatPhone(appointment.owner_phone)}</p>
        )}
        {request.status === 'DECLINED' && (
          <p className="text-stone-600 dark:text-stone-300">
            Declined by {request.resolved_by ?? 'the clinic'}
            {request.resolved_at && <> · {formatDateTime(request.resolved_at)}</>}
            {request.decline_note && <> — Note: {request.decline_note}</>}
          </p>
        )}
        {request.status === 'RESOLVED' && (
          <p className="text-stone-600 dark:text-stone-300">
            Resolved by {request.resolved_by ?? 'the clinic'}
            {request.resolved_at && <> · {formatDateTime(request.resolved_at)}</>}
          </p>
        )}
      </div>

      {isOpen && (
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setShowDeclineModal(true)}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
          >
            Decline
          </button>
          {canReschedule && (
            <button
              type="button"
              onClick={() => setShowRescheduleModal(true)}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Reschedule
            </button>
          )}
        </div>
      )}

      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <h3 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Decline Request
            </h3>
            <textarea
              value={declineNote}
              onChange={(event) => setDeclineNote(event.target.value)}
              placeholder="Note for the veterinarian (required,200 characters max)"
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
