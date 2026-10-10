import { useNavigate, useParams } from 'react-router-dom'

import { ConsultationSummary } from '../components/ConsultationSummary'
import { PrescriptionSummary } from '../components/PrescriptionSummary'
import {
  useAppointmentDetail,
  useStartConsultation,
} from '../hooks/useVetAppointments'
import type { AppointmentStatus } from '../types/dashboard.types'

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  CONFIRMED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CHECKED_IN: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  NO_SHOW: 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300',
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked In',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
}

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

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-4">
        <div className="h-6 w-48 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-24 rounded-md bg-stone-200 dark:bg-stone-700" />
        <div className="h-64 rounded-md bg-stone-200 dark:bg-stone-700" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
            Appointment not found
          </h2>
          <button
            className="mt-4 rounded-md bg-amber-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-950"
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

  function handleStart() {
    if (!appointment) return
    const aptId = appointment.apt_id
    startConsultation.mutate(aptId, {
      onSuccess: () => navigate(`/veterinarian/consultations/${aptId}`),
    })
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button
        className="mb-4 text-sm font-semibold text-stone-600 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        onClick={() => navigate(-1)}
        type="button"
      >
        &lt; Appointment Details
      </button>

      {/* Pet header */}
      <div className="mb-6 flex items-center gap-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-stone-200 dark:bg-stone-700">
          <svg className="size-7 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 0115 0" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {appointment.pet_name}
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {appointment.pet_breed ?? '—'} | {ageFromBirthDate(appointment.pet_birth_date)} |{' '}
            {appointment.pet_sex === 'MALE' ? 'Male' : appointment.pet_sex === 'FEMALE' ? 'Female' : '—'}
          </p>
        </div>
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
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[appointment.apt_status]}`}
              >
                {STATUS_LABELS[appointment.apt_status]}
              </span>
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-sm text-stone-500 dark:text-stone-400">Ref. No</dt>
            <dd className="text-sm text-stone-400 dark:text-stone-500">Not yet added</dd>
          </div>
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
        {canStart && (
          <button
            className="w-56 rounded-md bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950 disabled:opacity-50"
            disabled={startConsultation.isPending}
            onClick={handleStart}
            type="button"
          >
            {startConsultation.isPending ? 'Starting…' : 'Start Consultation'}
          </button>
        )}
        {canEditConsultation && (
          <button
            className="w-56 rounded-md border border-amber-800 px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-50 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
            onClick={() => navigate(`/veterinarian/consultations/${appointment.apt_id}`)}
            type="button"
          >
            Edit Consultation
          </button>
        )}
      </div>
    </div>
  )
}
