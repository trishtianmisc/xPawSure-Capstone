import { useState, type ReactNode } from 'react'
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

const ICONS = {
  back: 'M10 19l-7-7m0 0l7-7m-7 7h18',
  consultations:
    'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  vaccinations:
    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  screenings:
    'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
  user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  phone:
    'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  calendar:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  heart:
    'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
} as const

type IconName = keyof typeof ICONS

function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      viewBox="0 0 24 24"
    >
      <path d={ICONS[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

const TILE_TONES = {
  amber:
    'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/40',
  emerald:
    'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/40',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-800/40',
} as const

function SummaryTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: IconName
  tone: keyof typeof TILE_TONES
}) {
  return (
    <Card padding="md">
      <div className="flex items-center gap-4">
        <div
          className={`grid size-12 shrink-0 place-items-center rounded-xl ring-1 ${TILE_TONES[tone]}`}
        >
          <Icon name={icon} className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-3xl font-bold leading-none tabular-nums text-stone-900 dark:text-stone-50">
            {value}
          </p>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {label}
          </p>
        </div>
      </div>
    </Card>
  )
}

function SectionHeader({
  icon,
  title,
  meta,
  action,
}: {
  icon: IconName
  title: string
  meta?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-2 pb-4 dark:border-stone-700">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          <Icon name={icon} className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          {meta && (
            <p className="text-xs text-stone-500 dark:text-stone-400">{meta}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
        <Icon name={icon} className="size-6" />
      </span>
      <p className="text-sm text-stone-500 dark:text-stone-400">{message}</p>
    </div>
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
    <div className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-100 dark:bg-stone-800/60 dark:ring-stone-700/60">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-stone-900 dark:text-stone-100">
        {value}
      </dd>
    </div>
  )
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: IconName
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        <Icon name={icon} className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {label}
        </p>
        <div className="mt-0.5 break-all text-sm font-medium text-stone-900 dark:text-stone-100">
          {children}
        </div>
      </div>
    </div>
  )
}

const TH_CLASSES =
  'px-4 py-3 text-xs font-semibold uppercase tracking-wide'
const ROW_CLASSES =
  'transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50'

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
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <div className="h-5 w-40 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        <div className="h-36 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="h-24 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800"
              key={index}
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          <div className="h-56 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="h-56 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
      </div>
    )
  }

  if (error || !patient) {
    const notFound =
      (error as { response?: { status?: number } } | null)?.response?.status ===
      404

    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 px-6 py-6 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
          <Icon name="heart" className="size-7" />
        </span>
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
          className="text-sm font-medium text-amber-800 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-300"
          to="/clinic/patients"
        >
          &larr; Back to patients
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
        className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        to="/clinic/patients"
      >
        <Icon
          name="back"
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
        Back to patients
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
        <SummaryTile
          icon="consultations"
          label="Consultations"
          tone="amber"
          value={patient.summary.consultations}
        />
        <SummaryTile
          icon="vaccinations"
          label="Vaccinations"
          tone="emerald"
          value={patient.summary.vaccinations}
        />
        <SummaryTile
          icon="screenings"
          label="AI screenings"
          tone="sky"
          value={patient.summary.ai_screenings}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Owner
          </h2>
          <div className="mt-4 flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-base font-bold text-white shadow-sm">
              {initial(patient.owner.name)}
            </div>
            <p className="min-w-0 text-base font-semibold text-stone-900 dark:text-stone-100">
              {patient.owner.name}
            </p>
          </div>
          <div className="mt-5 space-y-4 border-t border-stone-100 pt-5 dark:border-stone-700">
            <ContactRow icon="phone" label="Phone">
              {patient.owner.phone ? (
                <a
                  className="hover:text-amber-800 dark:hover:text-amber-400"
                  href={`tel:${patient.owner.phone}`}
                >
                  {formatPhone(patient.owner.phone)}
                </a>
              ) : (
                <span className="text-stone-400 dark:text-stone-500">-</span>
              )}
            </ContactRow>
            <ContactRow icon="mail" label="Email">
              <a
                className="hover:text-amber-800 dark:hover:text-amber-400"
                href={`mailto:${patient.owner.email}`}
              >
                {patient.owner.email}
              </a>
            </ContactRow>
          </div>
        </Card>

        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Patient details
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
        <SectionHeader
          action={<PatientVaccinationBadge status={patient.vaccination_status} />}
          icon="vaccinations"
          meta={`${patient.vaccinations.length} record${patient.vaccinations.length === 1 ? '' : 's'}`}
          title="Vaccination history"
        />
        {patient.vaccinations.length === 0 ? (
          <EmptyState icon="vaccinations" message="No vaccination records." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-stone-50/70 text-stone-500 dark:bg-stone-800/40 dark:text-stone-400">
                  <th className={TH_CLASSES}>Vaccine</th>
                  <th className={TH_CLASSES}>Date given</th>
                  <th className={TH_CLASSES}>Next due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                {patient.vaccinations.map((vaccination, index) => (
                  <tr
                    className={ROW_CLASSES}
                    key={`${vaccination.name}-${vaccination.date_given}-${index}`}
                  >
                    <td className="px-4 py-3.5 font-semibold text-stone-900 dark:text-stone-100">
                      {vaccination.name}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600 dark:text-stone-300">
                      {formatDate(vaccination.date_given)}
                    </td>
                    <td className="px-4 py-3.5 text-stone-600 dark:text-stone-300">
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
        <SectionHeader
          icon="calendar"
          meta={
            history.data
              ? `${history.data.total} appointment${history.data.total === 1 ? '' : 's'}`
              : undefined
          }
          title="Appointment history"
        />
        {history.isLoading ? (
          <div className="mt-4 h-40 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
        ) : history.isError ? (
          <div className="py-10 text-center">
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
          <EmptyState icon="calendar" message="No appointments recorded." />
        ) : history.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50/70 text-stone-500 dark:bg-stone-800/40 dark:text-stone-400">
                    <th className={TH_CLASSES}>Date and time</th>
                    <th className={TH_CLASSES}>Type</th>
                    <th className={TH_CLASSES}>Veterinarian</th>
                    <th className={TH_CLASSES}>Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                  {history.data.results.map((appointment) => (
                    <tr className={ROW_CLASSES} key={appointment.apt_id}>
                      <td className="whitespace-nowrap px-4 py-3.5 font-medium text-stone-800 dark:text-stone-200">
                        {formatDateTime(
                          appointment.apt_scheduled_at,
                          displayTimeZone,
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                          {labelize(appointment.apt_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-stone-600 dark:text-stone-300">
                        {appointment.vet_name ?? (
                          <span className="italic text-stone-400 dark:text-stone-500">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <AppointmentStatusBadge status={appointment.apt_status} uniform />
                        {appointment.apt_status === 'CANCELLED' &&
                          appointment.apt_cancellation_reason && (
                            <p className="mt-1.5 max-w-xs border-l-2 border-stone-200 pl-2 text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                              {appointment.apt_cancellation_reason}
                            </p>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-4 pt-4 dark:border-stone-700">
              <span className="text-sm text-stone-500 dark:text-stone-400">
                Showing {startItem}–{endItem} of {history.data.total}{' '}
                appointments
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium tabular-nums text-stone-400 dark:text-stone-500">
                  Page {history.data.page} of {history.data.total_pages}
                </span>
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
