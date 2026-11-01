import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Button, Card } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import {
  CLINIC_TIME_ZONE,
  formatDate,
  formatDateTime,
  formatPhone,
} from '../../../../utils/format'
import { useClinicSettings } from '../../../clinic-profile/hooks/useClinicSettings'
import { AppointmentStatusBadge } from '../../../receptionist/components/AppointmentStatusBadge'
import { PageHero } from '../../../receptionist/components/PageHero'
import { PatientVaccinationBadge } from '../components/PatientVaccinationBadge'
import { useClinicPatient, useClinicPatientAppointments } from '../hooks/usePatients'

// Matches the staff list's table pagination: 10 rows per page.
const APPOINTMENTS_PAGE_SIZE = 10

function labelize(value: string): string {
  if (value === 'AI_REVIEW') return 'AI Review'
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function ageLabel(age: number | null): string {
  if (age === null) return '-'
  if (age === 0) return '<1 yr'
  return `${age} ${age === 1 ? 'yr' : 'yrs'}`
}

function initial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

function SummaryTile({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <Card className="text-center" padding="sm">
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
    </Card>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-stone-900 dark:text-stone-100">
        {value}
      </dd>
    </div>
  )
}

export function ClinicAdminPatientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: patient, isLoading, error, refetch, isFetching } =
    useClinicPatient(id ?? '')
  const [page, setPage] = useState(1)
  // Switching patients must never leave the previous patient's page number
  // pointing beyond the new history; adjusting during render avoids a frame
  // that fetches the new history with the old page (React's documented
  // "adjusting state when props change" pattern).
  const [renderedPatientId, setRenderedPatientId] = useState(id)
  if (id !== renderedPatientId) {
    setRenderedPatientId(id)
    setPage(1)
  }
  const history = useClinicPatientAppointments(id ?? '', {
    page,
    page_size: APPOINTMENTS_PAGE_SIZE,
  })
  const settings = useClinicSettings()
  const displayTimeZone = settings.data?.timezone ?? CLINIC_TIME_ZONE

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        <div className="h-5 w-40 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-40 animate-pulse rounded-md bg-stone-200 dark:bg-stone-800" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="h-24 animate-pulse rounded-md bg-stone-200 dark:bg-stone-800"
              key={index}
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-md bg-stone-200 dark:bg-stone-800" />
      </div>
    )
  }

  if (error || !patient) {
    const notFound =
      (error as { response?: { status?: number } } | null)?.response?.status ===
      404

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-6 py-6 text-center">
        <h1 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
          {notFound ? 'Patient not found' : 'Failed to load patient'}
        </h1>
        <p className="max-w-md text-sm text-stone-500 dark:text-stone-400">
          {notFound
            ? 'This pet is not a patient of your clinic.'
            : apiErrorMessage(error)}
        </p>
        {!notFound && (
          <Button
            loading={isFetching}
            onClick={() => refetch()}
            size="sm"
            type="button"
            variant="secondary"
          >
            Try again
          </Button>
        )}
        <Link
          className="text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          to="/clinic/patients"
        >
          Back to patients
        </Link>
      </div>
    )
  }

  const historyData = history.data
  const startItem = historyData
    ? (historyData.page - 1) * historyData.page_size + 1
    : 0
  const endItem = historyData
    ? Math.min(historyData.page * historyData.page_size, historyData.total)
    : 0

  const subtitle = [
    patient.breed,
    labelize(patient.sex),
    ageLabel(patient.age),
  ]
    .filter(Boolean)
    .join(' | ')

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <Link
        className="inline-block text-md font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
        to="/clinic/patients"
      >
        &larr; Back to patients
      </Link>

      <PageHero
        avatar={
          patient.profile_picture ? (
            <img
              alt=""
              className="size-16 shrink-0 rounded-full object-cover ring-2 ring-white/20"
              src={patient.profile_picture}
            />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-bold text-white ring-1 ring-white/20">
              {initial(patient.name)}
            </div>
          )
        }
    
        subtitle={subtitle || undefined}
        title={patient.name}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile label="Consultations" value={patient.summary.consultations} />
        <SummaryTile label="Vaccinations" value={patient.summary.vaccinations} />
        <SummaryTile label="AI screenings" value={patient.summary.ai_screenings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr]">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Owner
          </h2>
          <p className="mt-3 text-base font-semibold text-stone-900 dark:text-stone-100">
            {patient.owner.name}
          </p>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <span className="text-stone-500 dark:text-stone-400">Phone: </span>
              {patient.owner.phone ? (
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {formatPhone(patient.owner.phone)}
                </span>
              ) : (
                <span className="text-stone-500 dark:text-stone-400">-</span>
              )}
            </p>
            <p className="break-all">
              <span className="text-stone-500 dark:text-stone-400">Email: </span>
              <span className="font-medium text-stone-900 dark:text-stone-100">
                {patient.owner.email}
              </span>
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Patient details
          </h2>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Breed" value={patient.breed ?? '-'} />
            <DetailRow label="Sex" value={labelize(patient.sex)} />
            <DetailRow label="Age" value={ageLabel(patient.age)} />
            <DetailRow
              label="Date of birth"
              value={formatDate(patient.date_of_birth)}
            />
            <DetailRow
              label="Weight"
              value={patient.weight ? `${patient.weight} kg` : '-'}
            />
            <DetailRow label="Color" value={patient.color ?? '-'} />
            <DetailRow
              label="Registered"
              value={formatDate(patient.registered_at, displayTimeZone)}
            />
          </dl>
        </Card>
      </div>

      <Card padding="sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 dark:border-stone-700">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Vaccination history
          </h2>
          <PatientVaccinationBadge status={patient.vaccination_status} />
        </div>
        {patient.vaccinations.length === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            No vaccination records.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-500 dark:border-stone-700 dark:text-stone-400">
                  <th className="px-3 py-3 font-semibold">Vaccine</th>
                  <th className="px-3 py-3 font-semibold">Date given</th>
                  <th className="px-3 py-3 font-semibold">Next due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {patient.vaccinations.map((vaccination, index) => (
                  <tr key={`${vaccination.name}-${vaccination.date_given}-${index}`}>
                    <td className="px-3 py-3 font-medium text-stone-800 dark:text-stone-200">
                      {vaccination.name}
                    </td>
                    <td className="px-3 py-3 text-stone-600 dark:text-stone-300">
                      {formatDate(vaccination.date_given)}
                    </td>
                    <td className="px-3 py-3 text-stone-600 dark:text-stone-300">
                      {formatDate(vaccination.next_due)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="sm">
        <div className="border-b border-stone-100 pb-3 dark:border-stone-700">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Appointment history
          </h2>
        </div>
        {history.isLoading ? (
          <div className="h-40 animate-pulse rounded-md bg-stone-100 dark:bg-stone-800" />
        ) : history.isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              {apiErrorMessage(history.error)}
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={history.isFetching}
              onClick={() => history.refetch()}
              className="mt-3"
            >
              Try again
            </Button>
          </div>
        ) : history.data && history.data.total === 0 ? (
          <p className="py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            No appointments recorded.
          </p>
        ) : history.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-500 dark:border-stone-700 dark:text-stone-400">
                    <th className="px-3 py-3 font-semibold">Date and time</th>
                    <th className="px-3 py-3 font-semibold">Type</th>
                    <th className="px-3 py-3 font-semibold">Veterinarian</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {history.data.results.map((appointment) => (
                    <tr key={appointment.apt_id}>
                      <td className="whitespace-nowrap px-3 py-3 text-stone-600 dark:text-stone-300">
                        {formatDateTime(
                          appointment.apt_scheduled_at,
                          displayTimeZone,
                        )}
                      </td>
                      <td className="px-3 py-3 text-stone-600 dark:text-stone-300">
                        {labelize(appointment.apt_type)}
                      </td>
                      <td className="px-3 py-3 text-stone-600 dark:text-stone-300">
                        {appointment.vet_name ?? 'Unassigned'}
                      </td>
                      <td className="px-3 py-3">
                        <AppointmentStatusBadge status={appointment.apt_status} />
                        {appointment.apt_status === 'CANCELLED' &&
                          appointment.apt_cancellation_reason && (
                            <p className="mt-1 max-w-xs text-xs text-stone-500 dark:text-stone-400">
                              Reason: {appointment.apt_cancellation_reason}
                            </p>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-5 py-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Showing {startItem}–{endItem} of {history.data.total}{' '}
                appointments
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={page >= history.data.total_pages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  )
}
