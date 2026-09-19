import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { useAppointmentDetail, useUpdateAppointmentStatus } from '../hooks/useAppointments'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: appointment, isLoading, error } = useAppointmentDetail(id ?? '')
  const updateStatus = useUpdateAppointmentStatus()
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

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
    updateStatus.mutate(
      { aptId: appointment.apt_id, status: newStatus },
      { onSuccess: () => {} },
    )
  }

  function handleCancel() {
    updateStatus.mutate(
      { aptId: appointment.apt_id, status: 'CANCELLED', cancellationReason: cancelReason },
      { onSuccess: () => { setShowCancelModal(false); setCancelReason('') } },
    )
  }

  const canCheckIn = appointment.apt_status === 'BOOKED'
  const canComplete = appointment.apt_status === 'CHECKED_IN'
  const canCancel = appointment.apt_status === 'BOOKED' || appointment.apt_status === 'CHECKED_IN'
  const canNoShow = appointment.apt_status === 'BOOKED'

  return (
    <div className="p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        ← Back
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
            {appointment.pet_name}
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {appointment.owner_name ?? 'Unknown owner'}
          </p>
        </div>
        <AppointmentStatusBadge status={appointment.apt_status} />
      </div>

      {/* Actions */}
      <div className="mb-6 flex flex-wrap gap-3">
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
            No Show
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

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointment Info */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Appointment Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Type</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.apt_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Scheduled</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">
                {new Date(appointment.apt_scheduled_at).toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Veterinarian</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.vet_name ?? 'Unassigned'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Created by</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.created_by_name ?? '—'}</dd>
            </div>
            {appointment.apt_reason && (
              <div>
                <dt className="text-sm text-stone-500 dark:text-stone-400">Reason</dt>
                <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">{appointment.apt_reason}</dd>
              </div>
            )}
            {appointment.apt_cancellation_reason && (
              <div>
                <dt className="text-sm text-stone-500 dark:text-stone-400">Cancellation Reason</dt>
                <dd className="mt-1 text-sm text-stone-900 dark:text-stone-100">{appointment.apt_cancellation_reason}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Pet & Owner Info */}
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">Pet & Owner</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Pet</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.pet_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Breed</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.pet_breed ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Sex</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.pet_sex}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Owner</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.owner_name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Phone</dt>
              <dd className="text-sm font-medium text-stone-900 dark:text-stone-100">{appointment.owner_phone ?? '—'}</dd>
            </div>
          </dl>
        </div>
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
    </div>
  )
}
