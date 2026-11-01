import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import { PageHero } from '../../../receptionist/components/PageHero'
import { ConsultationSummary } from '../components/ConsultationSummary'
import { PrescriptionSummary } from '../components/PrescriptionSummary'
import {
  useAppointmentDetail,
  useRequestCancellation,
  useRequestReschedule,
  useStartConsultation,
} from '../hooks/useVetAppointments'

function formatDateTime(iso: string): string {
  const date = new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

function ageFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1
  if (years < 1) return '<1 yr'
  return `${years} yr${years === 1 ? '' : 's'}`
}

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: appointment, isLoading, error } = useAppointmentDetail(id ?? '')
  const startConsultation = useStartConsultation()
  const requestReschedule = useRequestReschedule()
  const requestCancellation = useRequestCancellation()
  const [requestType, setRequestType] = useState<'RESCHEDULE' | 'CANCEL' | null>(null)
  const [requestReason, setRequestReason] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestReview, setRequestReview] = useState(false)
  const [requestSubmitted, setRequestSubmitted] = useState(false)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4 p-6">
        <div className="h-6 w-48 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-24 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-64 rounded-md bg-stone-200 dark:bg-stone-700" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Appointment not found
          </h2>
          <button
            className="mt-4 rounded-md bg-amber-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
            onClick={() => navigate('/veterinarian/dashboard')}
            type="button"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const canStart = appointment.apt_status === 'CHECKED_IN'
  const canEditConsultation = appointment.apt_status === 'IN_PROGRESS'
  const canRequest =
    appointment.apt_status === 'CONFIRMED' &&
    !appointment.apt_reschedule_request_reason &&
    !appointment.apt_cancellation_request_reason

  function handleStart() {
    if (!appointment) return
    const aptId = appointment.apt_id
    startConsultation.mutate(aptId, {
      onSuccess: () => navigate(`/veterinarian/consultations/${aptId}`),
    })
  }

  const requestPending = requestReschedule.isPending || requestCancellation.isPending

  function openRequest(type: 'RESCHEDULE' | 'CANCEL') {
    setRequestType(type)
    setRequestReason('')
    setRequestError('')
    setRequestReview(false)
    setRequestSubmitted(false)
  }

  function closeRequest() {
    setRequestType(null)
    setRequestReason('')
    setRequestError('')
    setRequestReview(false)
  }

  function handleRequestContinue() {
    if (!requestReason.trim()) {
      setRequestError('Please enter a reason.')
      return
    }
    setRequestError('')
    setRequestReview(true)
  }

  function confirmRequest() {
    if (!appointment || !requestType) return
    const reason = requestReason.trim()
    const mutation = requestType === 'RESCHEDULE' ? requestReschedule : requestCancellation
    mutation.mutate(
      { aptId: appointment.apt_id, reason },
      {
        onSuccess: () => {
          closeRequest()
          setRequestSubmitted(true)
        },
        onError: (err) => {
          const detail = (
            err as { response?: { data?: { detail?: string } } }
          )?.response?.data?.detail
          setRequestReview(false)
          setRequestError(detail ?? 'Something went wrong. Please try again.')
        },
      },
    )
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <button
          className="mb-4 text-sm font-semibold text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
          onClick={() => navigate(-1)}
          type="button"
        >
          &lt; Appointment Details
        </button>

        <div className="mb-6">
          <PageHero
            title={appointment.pet_name}
            subtitle={`${appointment.pet_breed ?? '—'} | ${ageFromBirthDate(appointment.pet_birth_date)} | ${
              appointment.pet_sex === 'MALE' ? 'Male' : appointment.pet_sex === 'FEMALE' ? 'Female' : '—'
            }`}
            avatar={
              <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-white ring-2 ring-white/20">
                <svg className="size-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
                </svg>
              </span>
            }
            meta={
              <>
                {appointment.clinic_name && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                    {appointment.clinic_name}
                  </span>
                )}
                {appointment.vet_name && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                    {appointment.vet_name}
                  </span>
                )}
              </>
            }
          />
        </div>

        {/* Appointment */}
        <div className="mb-5 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Appointment
          </h2>
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Date &amp; Time</dt>
              <dd className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {formatDateTime(appointment.apt_scheduled_at)}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-sm text-stone-500 dark:text-stone-400">Status</dt>
              <dd>
                <AppointmentStatusBadge status={appointment.apt_status} />
              </dd>
            </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-stone-500 dark:text-stone-400">Ref. No</dt>
            <dd className="text-sm text-stone-400 dark:text-stone-500">Not yet added</dd>
          </div>
          {appointment.apt_reschedule_request_reason && (
            <div className="flex items-center justify-between gap-4">
              <dt className="shrink-0 text-sm text-stone-500 dark:text-stone-400">Reschedule request</dt>
              <dd className="text-right text-sm font-semibold text-amber-800 dark:text-amber-500">
                {appointment.apt_reschedule_request_reason}
              </dd>
            </div>
          )}
          {appointment.apt_cancellation_request_reason && (
            <div className="flex items-center justify-between gap-4">
              <dt className="shrink-0 text-sm text-stone-500 dark:text-stone-400">Cancellation request</dt>
              <dd className="text-right text-sm font-semibold text-red-700 dark:text-red-400">
                {appointment.apt_cancellation_request_reason}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Owner */}
      <div className="mb-5 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Owner
        </h2>
        <dl className="space-y-3">
          <div className="flex items-center justify-between">
            <dt className="text-sm text-stone-500 dark:text-stone-400">Name</dt>
            <dd className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {appointment.owner_name ?? '—'}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-stone-500 dark:text-stone-400">Contact info</dt>
            <dd className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {appointment.owner_phone ?? '—'}
            </dd>
          </div>
        </dl>
      </div>

      {/* AI Screening */}
      {appointment.screening && (
        <div className="mb-6 rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            AI Screening
          </h2>
          <div className="mb-4 h-20 rounded-md bg-stone-300 dark:bg-stone-600" />
          <div className="rounded-md border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
            <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
              Final Assessment
            </p>
            <p className="mt-1 text-sm font-bold text-amber-800 dark:text-amber-500">
              {appointment.screening.disease}
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              AI screening result ·{' '}
              {Math.round(Number(appointment.screening.ais_confidence))}% confidence ·{' '}
              {appointment.screening.ais_model_version}
            </p>
          </div>
        </div>
      )}

      {/* Consultation */}
      {appointment.consultation && (
        <ConsultationSummary consultation={appointment.consultation} />
      )}

      {/* Prescription */}
      {appointment.prescription && (
        <PrescriptionSummary prescription={appointment.prescription} />
      )}

      {/* Actions */}
      <div className="flex flex-col items-end gap-3">
        {requestSubmitted && (
          <p className="w-full rounded-md bg-green-50 px-4 py-2 text-right text-sm font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-400">
            Request submitted. You will be notified once it is reviewed.
          </p>
        )}
        {canRequest && (
          <div className="flex w-full justify-end gap-3">
            <button
              className="w-56 rounded-md border border-green-700 px-5 py-2.5 text-sm font-semibold text-green-800 transition hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/40"
              onClick={() => openRequest('RESCHEDULE')}
              type="button"
            >
              Reschedule
            </button>
            <button
              className="w-56 rounded-md border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/40"
              onClick={() => openRequest('CANCEL')}
              type="button"
            >
              Cancel
            </button>
          </div>
        )}
        {canStart && (
          <button
            className="w-56 rounded-md bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
            disabled={startConsultation.isPending}
            onClick={handleStart}
            type="button"
          >
            {startConsultation.isPending ? 'Starting…' : 'Start Consultation'}
          </button>
        )}
        {canEditConsultation && (
          <button
            className="w-56 rounded-md border border-amber-700 px-5 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
            onClick={() => navigate(`/veterinarian/consultations/${appointment.apt_id}`)}
            type="button"
          >
            Edit Consultation
          </button>
        )}
      </div>

      {/* Request Modal */}
      {requestType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-stone-900">
            {!requestReview ? (
              <>
                <h3 className="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-100">
                  {requestType === 'RESCHEDULE'
                    ? 'Request to Reschedule'
                    : 'Request for Cancellation'}
                </h3>
                <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
                  {requestType === 'RESCHEDULE'
                    ? 'Enter a reason for rescheduling this appointment. You will be asked to confirm before it is submitted.'
                    : 'Enter a reason for cancelling this appointment. You will be asked to confirm before it is submitted.'}
                </p>
                <textarea
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="Enter reason..."
                  className="mb-4 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  rows={3}
                />
                {requestError && (
                  <p className="mb-4 text-sm font-medium text-red-700 dark:text-red-400">
                    {requestError}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={closeRequest}
                    disabled={requestPending}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestContinue}
                    disabled={requestPending}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                      requestType === 'RESCHEDULE'
                        ? 'bg-green-700 hover:bg-green-800'
                        : 'bg-red-700 hover:bg-red-800'
                    }`}
                    type="button"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-2 text-lg font-semibold text-stone-900 dark:text-stone-100">
                  {requestType === 'RESCHEDULE'
                    ? 'Submit reschedule request?'
                    : 'Submit cancellation request?'}
                </h3>
                <p className="mb-4 text-sm text-stone-600 dark:text-stone-300">
                  You&apos;re requesting to{' '}
                  {requestType === 'RESCHEDULE' ? 'reschedule' : 'cancel'}{' '}
                  {appointment.pet_name} on {formatDateTime(appointment.apt_scheduled_at)}. The
                  appointment stays Confirmed until clinic staff reviews this request.
                </p>
                <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Reason
                  </p>
                  <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">
                    {requestReason.trim()}
                  </p>
                </div>
                {requestError && (
                  <p className="mb-4 text-sm font-medium text-red-700 dark:text-red-400">
                    {requestError}
                  </p>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setRequestReview(false)}
                    disabled={requestPending}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
                    type="button"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={confirmRequest}
                    disabled={requestPending}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                      requestType === 'RESCHEDULE'
                        ? 'bg-green-700 hover:bg-green-800'
                        : 'bg-red-700 hover:bg-red-800'
                    }`}
                    type="button"
                  >
                    {requestPending
                      ? 'Submitting…'
                      : requestType === 'RESCHEDULE'
                        ? 'Submit Request'
                        : 'Submit Cancellation Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
