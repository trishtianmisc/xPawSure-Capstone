import { useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { useAppointmentDetail, useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { usePaymentsByAppointment } from '../../payments/hooks/usePayments'
import { PaymentStatusBadge } from '../../payments/components/PaymentStatusBadge'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import { DetailLoadError } from '../components/DetailLoadError'
import { FollowUpReviewCard } from '../components/FollowUpReviewCard'
import { VetRequestCard } from '../components/VetRequestCard'
import {
  CLINIC_TIME_ZONE,
  formatDateLong,
  formatDateTime,
  formatPhone,
  formatTime,
  isFutureClinicDay,
} from '../../../utils/format'

function labelize(value: string): string {
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function initial(name: string | null | undefined): string {
  return name?.trim()?.[0]?.toUpperCase() ?? '?'
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-5 mb-5 text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
      {children}
    </h2>
  )
}

const PAYMENT_PANEL_TONE: Record<string, string> = {
  PAID: 'bg-emerald-300/30 dark:bg-emerald-900/25',
  PENDING: 'bg-amber-100/80 dark:bg-amber-900/25',
  FAILED: 'bg-rose-100/80 dark:bg-rose-900/25',
  EXPIRED: 'bg-stone-200/70 dark:bg-stone-800',
  REFUNDED: 'bg-stone-200/70 dark:bg-stone-800',
  VOID: 'bg-stone-200/70 dark:bg-stone-800',
}
const PAYMENT_PANEL_FALLBACK = 'bg-stone-100 dark:bg-stone-800/70'

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

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-semibold text-stone-900 dark:text-stone-100">
        {children}
      </dd>
    </div>
  )
}

function PersonChip({ name, tone }: { name: string; tone: 'sky' | 'stone' }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${tone === 'sky'
            ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
            : 'bg-stone-100 text-stone-600 dark:bg-stone-700 dark:text-stone-300'
          }`}
      >
        {initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}


// Mirrors NO_SHOW_GRACE_MINUTES in backend appointments/services.py.
const GRACE_PERIOD_MINUTES = 60

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: appointment, isLoading, error, refetch, isFetching } = useAppointmentDetail(id ?? '')
  const { data: payments, isLoading: paymentsLoading } = usePaymentsByAppointment(id ?? '')
  const payment = payments?.results?.[0]
  const updateStatus = useUpdateAppointmentStatus()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showNoShowModal, setShowNoShowModal] = useState(false)
  // Client clock for past-due action gating; captured once on mount because
  // impure time reads are not allowed during render. Backend remains
  // authoritative — stale client time can only over/under-gate, never bypass.
  const [nowMs] = useState(() => Date.now())

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800 mb-6" />
        <div className="h-64 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <DetailLoadError
        entity="Appointment"
        error={error}
        onRetry={refetch}
        isRetrying={isFetching}
        onBack={() => navigate(-1)}
      />
    )
  }

  function handleStatusChange(newStatus: string) {
    if (newStatus === 'CANCELLED') {
      setShowCancelModal(true)
      return
    }
    if (newStatus === 'NO_SHOW') {
      setShowNoShowModal(true)
      return
    }
    updateStatus.mutate({ aptId, status: newStatus })
  }

  function handleNoShow() {
    updateStatus.mutate(
      { aptId, status: 'NO_SHOW' },
      { onSuccess: () => setShowNoShowModal(false) },
    )
  }

  function handleCancel() {
    updateStatus.mutate(
      { aptId, status: 'CANCELLED', cancellationReason: cancelReason },
      { onSuccess: () => { setShowCancelModal(false); setCancelReason('') } },
    )
  }

  const scheduledMs = new Date(appointment.apt_scheduled_at).getTime()
  const isPast = scheduledMs < nowMs
  const pastBeyondGrace =
    isPast && nowMs - scheduledMs > GRACE_PERIOD_MINUTES * 60_000
  // Backend enforces this; the button only pre-gates until the appointment's
  // clinic-local date arrives.
  const checkInTooEarly = isFutureClinicDay(appointment.apt_scheduled_at, nowMs)

  const canConfirm = appointment.apt_status === 'PENDING' && !isPast
  const canCheckIn =
    appointment.apt_status === 'CONFIRMED' && !pastBeyondGrace
  const canComplete =
    appointment.apt_status === 'CHECKED_IN' || appointment.apt_status === 'IN_PROGRESS'
  const canCancel =
    appointment.apt_status === 'REVIEW' ||
    appointment.apt_status === 'CONFIRMATION' ||
    appointment.apt_status === 'PENDING' ||
    appointment.apt_status === 'CONFIRMED' ||
    appointment.apt_status === 'CHECKED_IN'
  const canNoShow = appointment.apt_status === 'CONFIRMED' && isPast

  const aptId = appointment.apt_id
  const petSubtitle = appointment.pet_breed ?? labelize(appointment.pet_sex)
  // A recorded payment already renders its own status badge, so this fallback
  // only covers appointments that still owe a payment or await scheduling.
  const pendingPaymentLabel =
    appointment.apt_status === 'CONFIRMATION'
      ? 'Awaiting Payment'
      : appointment.apt_status === 'REVIEW'
        ? 'Not Yet Scheduled'
        : null
  const paymentClasses =
    appointment.apt_status === 'CONFIRMATION'
      ? 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300'
      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        ← Back
      </button>

      {/* Pet card */}
      <div className="mb-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <div className="flex items-center gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-100 text-lg font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            {initial(appointment.pet_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-stone-900 dark:text-stone-100">
              {appointment.pet_name}
            </p>
            <p className="truncate text-sm text-stone-500 dark:text-stone-400">
              {petSubtitle}
            </p>
          </div>
          <AppointmentStatusBadge status={appointment.apt_status} uniform />
        </div>
      </div>

      {/* Owner card */}
      <div className="mb-5 rounded-xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-800/60">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-200 text-sm font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
            {initial(appointment.owner_name)}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-stone-900 dark:text-stone-100">
            {appointment.owner_name ?? 'Unknown owner'}
          </p>
          <span className="text-xs text-stone-400 dark:text-stone-500">Owner</span>
        </div>
        {(appointment.owner_phone || appointment.owner_email) && (
          <div className="mt-3 space-y-2 sm:pl-12">
            {appointment.owner_phone && (
              <div className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {formatPhone(appointment.owner_phone)}
              </div>
            )}
            {appointment.owner_email && (
              <div className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
                <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                {appointment.owner_email}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Screening presence only: the report itself is vet-only */}
      <p className="mb-5 flex items-center gap-4 text-sm font-bold text-stone-500 dark:text-stone-400">
        <span
          aria-hidden="true"
          className={
            appointment.screening_status
              ? 'size-1.5 shrink-0 rounded-full bg-blue-500'
              : 'size-1.5 shrink-0 rounded-full bg-stone-300 dark:bg-stone-600'
          }
        />
        {appointment.screening_status
          ? `AI screening attached · ${
              appointment.screening_status.review_status === 'PENDING_REVIEW'
                ? 'Awaiting vet review'
                : 'Reviewed by vet'
            }`
          : 'No AI screening attached'}
      </p>

      {appointment.vet_request && (
        <VetRequestCard appointment={appointment} />
      )}

      <FollowUpReviewCard appointment={appointment} />

      {/* Appointment Details */}
      <section>
        <SectionHeader>Appointment Details</SectionHeader>

        <div className="grid gap-3 lg:grid-cols-[1.15fr_1fr]">
          {/* Visit: schedule headline, then who and what */}
          <div className="rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
            <div className="flex items-center gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                <svg className="size-6" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold leading-tight text-stone-900 dark:text-stone-100">
                  {formatDateLong(appointment.apt_scheduled_at)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {formatTime(appointment.apt_scheduled_at) || '—'}
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-3.5 border-t border-stone-100 pt-4 dark:border-stone-700">
              <DetailLine label="Type">
                <span className="inline-block rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                  {labelize(appointment.apt_type)}
                </span>
              </DetailLine>
              <DetailLine label="Veterinarian">
                {appointment.vet_name ? (
                  <PersonChip name={appointment.vet_name} tone="sky" />
                ) : (
                  <span className="font-normal italic text-stone-400 dark:text-stone-500">Unassigned</span>
                )}
              </DetailLine>
              <DetailLine label="Created by">
                {appointment.created_by_name ? (
                  <PersonChip name={appointment.created_by_name} tone="stone" />
                ) : (
                  '—'
                )}
              </DetailLine>
              <DetailLine label="Patient sex">{labelize(appointment.pet_sex)}</DetailLine>
            </dl>
          </div>

          {/* Payment: tinted by status */}
          <div
            className={`rounded-3xl p-5 ${(payment && PAYMENT_PANEL_TONE[payment.status]) || PAYMENT_PANEL_FALLBACK
              }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-stone-600 dark:text-stone-300">Payment</p>
              {paymentsLoading ? (
                <span className="text-xs text-stone-400">Loading…</span>
              ) : payment ? (
                <PaymentStatusBadge status={payment.status} />
              ) : pendingPaymentLabel ? (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${paymentClasses}`}>
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {pendingPaymentLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-4">
              <p className="text-xs text-stone-500 dark:text-stone-400">Amount</p>
              <p className="mt-0.5 text-3xl font-bold leading-tight tabular-nums text-stone-900 dark:text-stone-50">
                {payment ? `₱${Number(payment.amount).toFixed(2)}` : '—'}
              </p>
            </div>

            <dl className="mt-5 space-y-3 border-t border-black/10 pt-4 dark:border-white/10">
              <DetailLine label="Receipt">
                {payment ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-mono text-xs">{payment.reference_no}</span>
                  </span>
                ) : (
                  '—'
                )}
              </DetailLine>
              <DetailLine label="Method">
                {payment ? (
                  <span className="inline-block rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-semibold dark:bg-stone-900/40">
                    {payment.method}
                  </span>
                ) : (
                  '—'
                )}
              </DetailLine>
              <DetailLine label="Paid at">
                {payment?.paid_at ? formatDateTime(payment.paid_at) : '—'}
              </DetailLine>
            </dl>
          </div>
        </div>

        {/* Notes and history: only shown when there's something to show */}
        {(appointment.apt_reason ||
          appointment.apt_checked_in_at ||
          appointment.apt_cancellation_reason) && (
            <div className="mt-3 space-y-5 rounded-3xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
              {appointment.apt_reason && (
                <div>
                  <p className="mb-2 text-xs font-medium text-stone-500 dark:text-stone-400">Reason</p>
                  <blockquote className="rounded-none border-l-4 border-stone-300 py-0.5 pl-4 text-base leading-relaxed text-stone-900 dark:border-stone-600 dark:text-stone-100">
                    {appointment.apt_reason}
                  </blockquote>
                </div>
              )}

              {appointment.apt_checked_in_at && (
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-900/40">
                    <dt className="text-xs text-stone-500 dark:text-stone-400">Checked in</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {formatDateTime(appointment.apt_checked_in_at)}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-stone-50 px-4 py-3 dark:bg-stone-900/40">
                    <dt className="text-xs text-stone-500 dark:text-stone-400">Completed</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {appointment.apt_completed_at ? formatDateTime(appointment.apt_completed_at) : '—'}
                    </dd>
                  </div>
                </dl>
              )}

              {appointment.apt_cancellation_reason && (
                <div className="rounded-2xl bg-rose-100/80 px-4 py-3 dark:bg-rose-900/25">
                  <p className="text-xs font-medium text-rose-800 dark:text-rose-300">Cancellation reason</p>
                  <p className="mt-1 text-sm text-stone-900 dark:text-stone-100">
                    {appointment.apt_cancellation_reason}
                  </p>
                </div>
              )}
            </div>
          )}
      </section>

      {/* Actions */}
      <div className="mb-6 p-5 flex flex-wrap justify-end gap-3">
        {canConfirm && (
          <button
            onClick={() => handleStatusChange('CONFIRMED')}
            disabled={updateStatus.isPending}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Confirm
          </button>
        )}
        {canCheckIn && (
          <button
            onClick={() => handleStatusChange('CHECKED_IN')}
            disabled={updateStatus.isPending || checkInTooEarly}
            title={
              checkInTooEarly
                ? `Check-in opens on ${formatDateLong(
                  appointment.apt_scheduled_at,
                  CLINIC_TIME_ZONE,
                )}`
                : undefined
            }
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            Check In
          </button>
        )}
        {canComplete && (
          <button
            onClick={() => handleStatusChange('COMPLETED')}
            disabled={updateStatus.isPending}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
          >
            Complete
          </button>
        )}
        {canNoShow && (
          <button
            onClick={() => handleStatusChange('NO_SHOW')}
            disabled={updateStatus.isPending}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
          >
            Mark No-Show
          </button>
        )}
        {canCancel && (
          <button
            onClick={() => handleStatusChange('CANCELLED')}
            disabled={updateStatus.isPending}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <h3 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Cancel Appointment</h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="mb-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              rows={3}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason('') }}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
              >
                Keep
              </button>
              <button
                onClick={handleCancel}
                disabled={updateStatus.isPending}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
              >
                {updateStatus.isPending ? 'Cancelling...' : 'Cancel Appointment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No-Show Confirmation Modal */}
      {showNoShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
            <h3 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Mark as No-Show</h3>
            <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
              Mark this appointment as a no-show? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNoShowModal(false)}
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
              >
                Keep
              </button>
              <button
                onClick={handleNoShow}
                disabled={updateStatus.isPending}
                className="rounded-lg bg-stone-700 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {updateStatus.isPending ? 'Saving...' : 'Mark No-Show'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
