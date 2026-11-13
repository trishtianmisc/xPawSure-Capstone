import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import { PageHero } from '../../../receptionist/components/PageHero'
import { clinicToday, formatDateTime } from '../../../../utils/format'
import { ConsultationSummary } from '../components/ConsultationSummary'
import { DetailCell, DetailRowGroup, DetailSection } from '../components/DetailSection'
import { PrescriptionSummary } from '../components/PrescriptionSummary'
import { SymptomAnswersCard } from '../components/SymptomAnswersCard'
import {
  useAppointmentDetail,
  useRequestCancellation,
  useRequestReschedule,
  useStartConsultation,
} from '../hooks/useVetAppointments'

function ageFromBirthDate(birthDate: string | null): string {
  if (!birthDate) return '—'
  const birth = new Date(birthDate)
  const now = clinicToday()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1
  if (years < 1) return '<1 yr'
  return `${years} yr${years === 1 ? '' : 's'}`
}

function PetAvatar({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <span className="m-2 inline-flex size-28 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white ring-2 ring-white/20">
        <svg className="size-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
        </svg>
      </span>
    )
  }

  return (
    <img
      alt={name}
      className="m-2 size-28 shrink-0 rounded-2xl object-cover ring-2 ring-white/20"
      onError={() => setFailed(true)}
      src={src}
    />
  )
}

function ScreeningImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  useEffect(() => {
    if (!zoomed) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomed(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [zoomed])

  if (!src || failed) {
    return (
      <div
        aria-hidden="true"
        className="size-28 shrink-0 rounded-xl bg-stone-300 dark:bg-stone-600"
      />
    )
  }

  return (
    <>
      <button
        aria-label={`Zoom ${alt} screening image`}
        className="group shrink-0 cursor-zoom-in overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        onClick={() => setZoomed(true)}
        type="button"
      >
        <img
          alt={alt}
          className="size-28 rounded-xl object-cover transition group-hover:brightness-90"
          onError={() => setFailed(true)}
          src={src}
        />
      </button>
      {zoomed && (
        <div
          aria-label="AI screening image preview"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomed(false)}
          role="dialog"
        >
          <button
            aria-label="Close image preview"
            className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            onClick={() => setZoomed(false)}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <img
            alt={alt}
            className="max-h-[85vh] max-w-full rounded-md object-contain"
            onClick={(event) => event.stopPropagation()}
            src={src}
          />
        </div>
      )}
    </>
  )
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
              <PetAvatar
                name={appointment.pet_name}
                src={appointment.pet_profile_image}
              />
            }
            meta={
              <>
                {appointment.clinic_name && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                    {appointment.clinic_name}
                  </span>
                )}
              </>
            }
            actions={
              <button
                className="self-start text-sm font-semibold text-amber-100 underline decoration-amber-100/60 underline-offset-4 transition hover:text-white hover:decoration-white"
                onClick={() =>
                  navigate(
                    `/veterinarian/pets/${appointment.pet_id}/history?apt=${appointment.apt_id}`,
                  )
                }
                type="button"
              >
                View consultation history
              </button>
            }
          />
        </div>

        {/* Appointment */}
        <DetailSection title="Appointment Details">
          <DetailRowGroup>
            <DetailCell divider label="Owner" value={appointment.owner_name ?? '—'} />
            <DetailCell label="Contact info" value={appointment.owner_phone ?? '—'} />
          </DetailRowGroup>
          <DetailRowGroup>
            <DetailCell
              divider
              label="Booked time"
              value={formatDateTime(appointment.apt_created_at)}
            />
            <DetailCell
              label="Scheduled"
              value={formatDateTime(appointment.apt_scheduled_at)}
            />
          </DetailRowGroup>
          {(appointment.apt_checked_in_at || appointment.apt_completed_at) && (
            <DetailRowGroup>
              {appointment.apt_checked_in_at && appointment.apt_completed_at ? (
                <>
                  <DetailCell
                    divider
                    label="Checked in"
                    value={formatDateTime(appointment.apt_checked_in_at)}
                  />
                  <DetailCell
                    label="Completed"
                    value={formatDateTime(appointment.apt_completed_at)}
                  />
                </>
              ) : (
                <DetailCell
                  className="sm:col-span-2"
                  label={appointment.apt_checked_in_at ? 'Checked in' : 'Completed'}
                  value={formatDateTime(
                    appointment.apt_checked_in_at ?? appointment.apt_completed_at,
                  )}
                />
              )}
            </DetailRowGroup>
          )}
          <DetailRowGroup>
            <DetailCell
              divider
              label="Status"
              value={<AppointmentStatusBadge status={appointment.apt_status} />}
            />
            <DetailCell
              label="Ref. No"
              value={appointment.payment_provider_ref ?? 'Not yet added'}
            />
          </DetailRowGroup>
          {appointment.apt_reschedule_request_reason && (
            <DetailCell
              label="Reschedule request"
              value={
                <span className="text-amber-800 dark:text-amber-500">
                  {appointment.apt_reschedule_request_reason}
                </span>
              }
            />
          )}
          {appointment.apt_cancellation_request_reason && (
            <DetailCell
              label="Cancellation request"
              value={
                <span className="text-red-700 dark:text-red-400">
                  {appointment.apt_cancellation_request_reason}
                </span>
              }
            />
          )}
        </DetailSection>

      {/* AI Screening */}
      {appointment.screening && (
        <DetailSection title="AI Screening">
          <div className="flex items-start gap-4 p-4">
            <ScreeningImage
              alt={appointment.screening.disease}
              src={appointment.screening.image_url ?? null}
            />
            <div className="min-w-0 flex-1 rounded-md border border-stone-200 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Final Assessment
              </p>
              <p className="mt-1 text-sm font-bold text-amber-800 dark:text-amber-500">
                {appointment.screening.disease}
              </p>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                AI screening result ·{' '}
                {Math.round(Number(appointment.screening.ais_confidence))}% confidence
              </p>
            </div>
          </div>
        </DetailSection>
      )}

      {appointment.screening && (
        <SymptomAnswersCard rows={appointment.screening.symptom_answers ?? []} />
      )}

      {/* Consultation */}
      {appointment.consultation && (
        <ConsultationSummary consultation={appointment.consultation} screening={appointment.screening} />
      )}

      {/* Prescription */}
      {appointment.prescription && (
        <PrescriptionSummary
          prescription={appointment.prescription}
          onPreview={() =>
            navigate(`/veterinarian/appointments/${appointment.apt_id}/prescription/preview`)
          }
        />
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
