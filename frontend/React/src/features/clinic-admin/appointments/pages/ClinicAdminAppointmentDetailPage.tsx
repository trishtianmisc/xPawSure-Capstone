import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'

import { apiErrorMessage } from '../../../../utils/error'
import { CLINIC_TIME_ZONE, formatDateTime } from '../../../../utils/format'
import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import { PageHero } from '../../../receptionist/components/PageHero'
import { useClinicAppointmentDetail } from '../hooks/useAppointments'
import type {
  ClinicAdminAppointmentDetail,
  ClinicAdminScreeningSummary,
} from '../types/appointment.types'

function labelize(value: string): string {
  if (value === 'AI_REVIEW') return 'AI Review'
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

function bookedBy(appointment: ClinicAdminAppointmentDetail): string {
  if (appointment.created_by_role === 'RECEPTIONIST') {
    return `Booked by receptionist: ${appointment.created_by_name ?? 'unknown'}`
  }
  if (appointment.created_by_role === 'OWNER') {
    return 'Booked by owner'
  }
  return 'Booked by: unknown'
}

function sourceLabel(source: string | null | undefined): string {
  if (source === 'DEVICE') return "Analyzed on owner's device"
  if (source === 'MOCK') return 'Demo analysis'
  return 'Analysis source unavailable'
}

function screeningOutcome(screening: ClinicAdminScreeningSummary): {
  reviewed: boolean
  text: string | null
} {
  const reviewed =
    Boolean(screening.reviewed_at) || screening.ais_status !== 'PENDING_REVIEW'
  if (!reviewed) return { reviewed: false, text: null }
  if (screening.ais_is_correct === true) {
    return { reviewed: true, text: 'Vet confirmed' }
  }
  if (screening.ais_is_correct === false && screening.vet_diagnosis) {
    return { reviewed: true, text: `Vet changed to: ${screening.vet_diagnosis}` }
  }
  return { reviewed: true, text: 'Vet reviewed' }
}

export function ClinicAdminAppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: appointment, isLoading, error, refetch, isFetching } =
    useClinicAppointmentDetail(id ?? '')
  const settings = useClinicSettings()
  const displayTimeZone =
    settings.data?.timezone ?? (settings.isError ? CLINIC_TIME_ZONE : undefined)

  if (isLoading || settings.isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
        <div className="h-64 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {apiErrorMessage(error)}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300"
        >
          {isFetching ? 'Loading...' : 'Try again'}
        </button>
        <Link
          to="/clinic/appointments"
          className="text-md font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Back
        </Link>
      </div>
    )
  }

  const petSubtitle = [appointment.pet_breed, labelize(appointment.pet_sex)]
    .filter(Boolean)
    .join(' · ')
  const statusChange = appointment.status_change
  const isClosed =
    appointment.apt_status === 'CANCELLED' || appointment.apt_status === 'NO_SHOW'
  const screening = appointment.screening
  const outcome = screening ? screeningOutcome(screening) : null

  return (
    <div className="space-y-6 p-6">
      <Link
        to="/clinic/appointments"
        className="inline-block text-md font-regular text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
      >
        &larr; Back to appointments
      </Link>

      <PageHero
        title={appointment.pet_name}
        subtitle={petSubtitle || undefined}
        avatar={
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-bold text-white ring-1 ring-white/20">
            {initial(appointment.pet_name)}
          </div>
        }
        meta={
          <>
            <AppointmentStatusBadge status={appointment.apt_status} />
            <span className="text-xs text-amber-100/70">{bookedBy(appointment)}</span>
          </>
        }
      />

      {/* Appointment details grid */}
      <section>
        <SectionHeader>Appointment Details</SectionHeader>
        <dl className="overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800">
          <div className={`${ROW_CLASS} grid-cols-1 sm:grid-cols-2`}>
            <DetailCell
              label="Owner"
              value={appointment.owner_name ?? '—'}
              className={FIRST_CELL_CLASS}
            />
            <DetailCell
              label="Veterinarian"
              value={appointment.vet_name ?? 'Unassigned'}
            />
          </div>
          <div className={`${ROW_CLASS} grid-cols-1 sm:grid-cols-2`}>
            <DetailCell
              label="Scheduled"
              value={formatDateTime(appointment.apt_scheduled_at, displayTimeZone)}
              className={FIRST_CELL_CLASS}
            />
            <DetailCell label="Type" value={labelize(appointment.apt_type)} />
          </div>
          {appointment.apt_reason && (
            <div className={ROW_CLASS}>
              <DetailCell label="Reason" value={appointment.apt_reason} />
            </div>
          )}
        </dl>
      </section>

      {/* Status */}
      <section>
        <SectionHeader>Status</SectionHeader>
        <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AppointmentStatusBadge status={appointment.apt_status} />
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {formatDateTime(appointment.apt_scheduled_at, displayTimeZone)}
            </span>
          </div>
          {isClosed && (
            <dl className="mt-4 space-y-3 border-t border-stone-100 pt-4 dark:border-stone-700">
              <div>
                <dt className="text-xs text-stone-500 dark:text-stone-400">
                  Cancellation reason
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {appointment.apt_cancellation_reason ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 dark:text-stone-400">
                  Changed by
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {statusChange?.changed_by ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500 dark:text-stone-400">
                  Changed at
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {statusChange?.changed_at
                    ? formatDateTime(statusChange.changed_at, displayTimeZone)
                    : '—'}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* AI screening */}
      <section>
        <SectionHeader>AI Screening</SectionHeader>
        {screening && outcome ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-800 dark:bg-blue-900/20">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                <svg
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                  />
                </svg>
                AI Screening
              </span>
              <span
                className={
                  outcome.reviewed
                    ? 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }
              >
                {outcome.reviewed ? 'Vet reviewed' : 'Pending review'}
              </span>
            </div>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {screening.disease} ({Math.round(Number(screening.ais_confidence))}%)
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {sourceLabel(screening.ais_source)} · Model {screening.ais_model_version}
            </p>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Analyzed {formatDateTime(screening.ais_created_at, displayTimeZone)}
              {screening.reviewed_at && (
                <>
                  {' '}
                  · Reviewed {formatDateTime(screening.reviewed_at, displayTimeZone)}
                </>
              )}
            </p>
            {outcome.text && (
              <p
                className={
                  screening.ais_is_correct === false
                    ? 'mt-2 text-sm font-semibold text-blue-700 dark:text-blue-300'
                    : 'mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400'
                }
              >
                {outcome.text}
              </p>
            )}
            <p className="mt-4 border-t border-blue-200 pt-3 text-xs text-stone-500 dark:border-blue-800 dark:text-stone-400">
              AI-assisted screening, not a diagnosis. Confirmed by a veterinarian.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
            No screening submitted
          </div>
        )}
      </section>
    </div>
  )
}
