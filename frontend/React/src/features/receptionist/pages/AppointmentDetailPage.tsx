import { useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { useAppointmentDetail, useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import { formatDateLong, formatDateTime, formatPhone, formatTime } from '../../../utils/format'

function labelize(value: string): string {
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function initial(name: string | null | undefined): string {
  return name?.trim()?.[0]?.toUpperCase() ?? '?'
}

function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
      {children}
    </h2>
  )
}

interface DetailCellProps {
  label: string
  value: ReactNode
  className?: string
}

function DetailCell({ label, value, className = '' }: DetailCellProps) {
  return (
    <div className={`px-4 py-3 ${className}`}>
      <dt className="text-xs text-stone-500 dark:text-stone-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  )
}

const ROW_CLASS = 'grid grid-cols-1 border-b border-stone-200 last:border-b-0 dark:border-stone-700'
const FIRST_CELL_CLASS = 'sm:border-r sm:border-stone-200 dark:sm:border-stone-700'

// Mirrors NO_SHOW_GRACE_MINUTES in backend appointments/tasks.py.
const GRACE_PERIOD_MINUTES = 60

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: appointment, isLoading, error } = useAppointmentDetail(id ?? '')
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
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <p className="text-sm text-stone-500">Appointment not found</p>
      </div>
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

  const canConfirm = appointment.apt_status === 'PENDING' && !isPast
  const canCheckIn =
    appointment.apt_status === 'CONFIRMED' && !pastBeyondGrace
  const canComplete =
    appointment.apt_status === 'CHECKED_IN' || appointment.apt_status === 'IN_PROGRESS'
  const canCancel =
    appointment.apt_status === 'PENDING' ||
    appointment.apt_status === 'CONFIRMED' ||
    appointment.apt_status === 'CHECKED_IN'
  const canNoShow = appointment.apt_status === 'CONFIRMED' && isPast

  const aptId = appointment.apt_id
  const petSubtitle = appointment.pet_breed ?? labelize(appointment.pet_sex)

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
          <AppointmentStatusBadge status={appointment.apt_status} />
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

      

      {/* Appointment Details */}
      <section>
        <SectionHeader>Appointment Details</SectionHeader>
        <dl className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
          <div className={`${ROW_CLASS} grid-cols-1 sm:grid-cols-2`}>
            <DetailCell
              label="Date"
              value={formatDateLong(appointment.apt_scheduled_at)}
              className={FIRST_CELL_CLASS}
            />
            <DetailCell label="Time" value={formatTime(appointment.apt_scheduled_at) || '—'} />
          </div>
          <div className={`${ROW_CLASS} grid-cols-1 sm:grid-cols-2`}>
            <DetailCell label="Type" value={labelize(appointment.apt_type)} className={FIRST_CELL_CLASS} />
            <DetailCell label="Veterinarian" value={appointment.vet_name ?? 'Unassigned'} />
          </div>
          <div className={`${ROW_CLASS} grid-cols-1 sm:grid-cols-2`}>
            <DetailCell label="Sex" value={labelize(appointment.pet_sex)} className={FIRST_CELL_CLASS} />
            <DetailCell label="Created by" value={appointment.created_by_name ?? '—'} />
          </div>
          {appointment.apt_reason && (
            <div className={ROW_CLASS}>
              <DetailCell label="Reason" value={appointment.apt_reason} />
            </div>
          )}
          <div className={ROW_CLASS}>
            <DetailCell
              label="Payment"
              value={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Payment Verified
                </span>
              }
            />
          </div>
          {appointment.apt_checked_in_at && (
            <div className={`${ROW_CLASS} grid-cols-1 sm:grid-cols-2`}>
              <DetailCell
                label="Checked in"
                value={formatDateTime(appointment.apt_checked_in_at)}
                className={FIRST_CELL_CLASS}
              />
              <DetailCell
                label="Completed"
                value={
                  appointment.apt_completed_at
                    ? formatDateTime(appointment.apt_completed_at)
                    : '—'
                }
              />
            </div>
          )}
          {appointment.apt_cancellation_reason && (
            <div className={ROW_CLASS}>
              <DetailCell
                label="Cancellation Reason"
                value={appointment.apt_cancellation_reason}
              />
            </div>
          )}
        </dl>
      </section>

      {/* AI Screening Result */}
      {appointment.screening && (
        <section className="mt-6">
          <SectionHeader>AI Screening Result</SectionHeader>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="mb-3 flex items-center gap-2">
              <svg className="size-4 shrink-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                {appointment.screening.ais_source === 'MOCK'
                  ? 'Demo Analysis'
                  : 'On-Device Analysis'}
              </span>
            </div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {appointment.screening.disease} ({Math.round(Number(appointment.screening.ais_confidence))}%)
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Model {appointment.screening.ais_model_version} · {appointment.screening.ais_status.replace(/_/g, ' ')}
            </p>
          </div>
        </section>
      )}

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
            disabled={updateStatus.isPending}
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
