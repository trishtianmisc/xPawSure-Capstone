import { useState } from 'react'

import { Modal } from '../../../components/ui/Modal'
import {
  CLINIC_TIME_ZONE,
  formatDateLong,
  isFutureClinicDay,
} from '../../../utils/format'
import { useUpdateAppointmentStatus } from '../hooks/useAppointments'
import type { AppointmentStatus } from '../types/receptionist.types'

// Mirrors NO_SHOW_GRACE_MINUTES in backend appointments/services.py.
const GRACE_PERIOD_MINUTES = 60

const PRIMARY_CLASS =
  'rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50'
const CHECK_IN_CLASS =
  'rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20'
const NO_SHOW_CLASS =
  'rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 disabled:opacity-50 dark:border-stone-600 dark:text-stone-400 dark:hover:bg-stone-800'
const MODAL_BTN_CLASS =
  'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50'

interface QuickStatusActionProps {
  aptId: string
  status: AppointmentStatus
  scheduledAt: string
  /** Past-due and queue rows offer No-show; regular list rows keep it on the detail page. */
  allowNoShow?: boolean
  /** The appointments list hides Check-in; the dashboard queue and detail page keep it. */
  allowCheckIn?: boolean
}

/**
 * Row-level status buttons: PENDING → Confirm, CONFIRMED → Check in,
 * plus an optional No-show that asks for confirmation because the
 * transition is terminal.
 */
export function QuickStatusAction({
  aptId,
  status,
  scheduledAt,
  allowNoShow = false,
  allowCheckIn = true,
}: QuickStatusActionProps) {
  const updateStatus = useUpdateAppointmentStatus()
  const [showNoShowModal, setShowNoShowModal] = useState(false)
  // Client clock for past-due action gating; captured once on mount because
  // impure time reads are not allowed during render. Backend remains
  // authoritative — stale client time can only over/under-gate, never bypass.
  const [nowMs] = useState(() => Date.now())

  const scheduledMs = new Date(scheduledAt).getTime()
  const isPast = scheduledMs < nowMs
  const pastBeyondGrace = isPast && nowMs - scheduledMs > GRACE_PERIOD_MINUTES * 60_000
  // Backend enforces this; the button only pre-gates until the appointment's
  // clinic-local date arrives.
  const checkInTooEarly = isFutureClinicDay(scheduledAt, nowMs)
  const busy = updateStatus.isPending

  const canConfirm = status === 'PENDING' && !isPast
  const canCheckIn = allowCheckIn && status === 'CONFIRMED' && !pastBeyondGrace
  const canNoShow = allowNoShow && status === 'CONFIRMED'

  if (!canConfirm && !canCheckIn && !canNoShow) return null

  return (
    <div className="flex items-center justify-end gap-2">
      {canConfirm && (
        <button
          type="button"
          disabled={busy}
          onClick={() => updateStatus.mutate({ aptId, status: 'CONFIRMED' })}
          className={PRIMARY_CLASS}
        >
          Confirm
        </button>
      )}
      {canCheckIn && (
        <button
          type="button"
          disabled={busy || checkInTooEarly}
          title={
            checkInTooEarly
              ? `Check-in opens on ${formatDateLong(scheduledAt, CLINIC_TIME_ZONE)}`
              : undefined
          }
          onClick={() => updateStatus.mutate({ aptId, status: 'CHECKED_IN' })}
          className={CHECK_IN_CLASS}
        >
          Check in
        </button>
      )}
      {canNoShow && (
        <button
          type="button"
          disabled={busy}
          onClick={() => setShowNoShowModal(true)}
          className={NO_SHOW_CLASS}
        >
          No-show
        </button>
      )}
      <Modal
        open={showNoShowModal}
        onClose={() => setShowNoShowModal(false)}
        title="Mark as no-show?"
      >
        <p className="text-sm text-stone-600 dark:text-stone-300">
          This appointment will be closed as no-show. This cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowNoShowModal(false)}
            className={`${MODAL_BTN_CLASS} border border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-700`}
          >
            Keep appointment
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              updateStatus.mutate(
                { aptId, status: 'NO_SHOW' },
                { onSuccess: () => setShowNoShowModal(false) },
              )
            }
            className={`${MODAL_BTN_CLASS} bg-red-700 text-white hover:bg-red-800`}
          >
            Mark no-show
          </button>
        </div>
      </Modal>
    </div>
  )
}
