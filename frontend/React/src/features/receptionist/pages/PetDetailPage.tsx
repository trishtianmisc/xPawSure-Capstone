import { type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button, Card } from '../../../components/ui'
import { apiErrorMessage } from '../../../utils/error'
import {
  CLINIC_TIME_ZONE,
  formatDate,
  formatDateTime,
  formatPhone,
} from '../../../utils/format'
import { useClinicSettings } from '../../clinic-profile/hooks/useClinicSettings'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import { DetailLoadError } from '../components/DetailLoadError'
import { PageHero } from '../components/PageHero'
import { usePetDetail, usePetHistory } from '../hooks/usePets'
import type {
  AppointmentHistoryItem,
  PetDetail,
  PetHistory,
} from '../types/receptionist.types'

const ICONS = {
  back: 'M10 19l-7-7m0 0l7-7m-7 7h18',
  appointments:
    'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  vaccinations:
    'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  phone:
    'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
  mail: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
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

function ageFrom(dob: string | null): string {
  if (!dob) return '-'
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return '-'
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1
  if (years < 0) return '-'
  return years === 0 ? '<1 yr' : `${years} ${years === 1 ? 'yr' : 'yrs'}`
}

function initial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

function dueBadge(nextDue: string | null): { label: string; className: string } | null {
  if (!nextDue) return null
  const due = new Date(nextDue)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) {
    return { label: 'Overdue', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  }
  if (days <= 30) {
    return { label: 'Due soon', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' }
  }
  return { label: 'Up to date', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' }
}

/**
 * Earliest visit still ahead of the desk: PENDING/CONFIRMED only, soonest first.
 * History arrives newest-first, so the order cannot be trusted for this.
 */
function nextAppointmentFrom(
  appointments: AppointmentHistoryItem[],
): AppointmentHistoryItem | null {
  const now = Date.now()
  const upcoming = appointments
    .filter((apt) => apt.apt_status === 'PENDING' || apt.apt_status === 'CONFIRMED')
    .filter((apt) => {
      const at = new Date(apt.apt_scheduled_at).getTime()
      return !Number.isNaN(at) && at >= now
    })
    .sort(
      (a, b) =>
        new Date(a.apt_scheduled_at).getTime() -
        new Date(b.apt_scheduled_at).getTime(),
    )
  return upcoming[0] ?? null
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
  compact = false,
}: {
  label: string
  value: string
  icon: IconName
  tone: keyof typeof TILE_TONES
  compact?: boolean
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
          <p
            className={`font-bold leading-none tabular-nums text-stone-900 dark:text-stone-50 ${
              compact ? 'text-lg' : 'text-3xl'
            }`}
          >
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
}: {
  icon: IconName
  title: string
  meta?: string
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

function DetailRow({ label, value }: { label: string; value: string }) {
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

function OwnerCard({ pet }: { pet: PetDetail }) {
  const owner = pet.owner

  return (
    <Card>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        Owner
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <div className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-base font-bold text-white shadow-sm">
          {owner?.name ? initial(owner.name) : '?'}
        </div>
        <p className="min-w-0 text-base font-semibold text-stone-900 dark:text-stone-100">
          {owner?.name || '-'}
        </p>
      </div>
      <div className="mt-5 space-y-4 border-t border-stone-100 pt-5 dark:border-stone-700">
        <ContactRow icon="phone" label="Phone">
          {owner?.phone ? (
            <a
              className="hover:text-amber-800 dark:hover:text-amber-400"
              href={`tel:${owner.phone}`}
            >
              {formatPhone(owner.phone)}
            </a>
          ) : (
            <span className="text-stone-400 dark:text-stone-500">-</span>
          )}
        </ContactRow>
        <ContactRow icon="mail" label="Email">
          {owner?.email ? (
            <a
              className="hover:text-amber-800 dark:hover:text-amber-400"
              href={`mailto:${owner.email}`}
            >
              {owner.email}
            </a>
          ) : (
            <span className="text-stone-400 dark:text-stone-500">-</span>
          )}
        </ContactRow>
      </div>
    </Card>
  )
}

const TH_CLASSES = 'px-4 py-3 text-xs font-semibold uppercase tracking-wide'
const ROW_CLASSES = 'transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50'

function VaccinationHistory({
  history,
  timeZone,
}: {
  history: PetHistory
  timeZone: string
}) {
  const records = history.vaccinations

  return (
    <Card padding="sm">
      <SectionHeader
        icon="vaccinations"
        meta={`${records.length} record${records.length === 1 ? '' : 's'}`}
        title="Vaccination history"
      />
      {records.length === 0 ? (
        <EmptyState icon="vaccinations" message="No vaccination records." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-stone-50/70 text-stone-500 dark:bg-stone-800/40 dark:text-stone-400">
                <th className={TH_CLASSES}>Vaccine</th>
                <th className={TH_CLASSES}>Given on</th>
                <th className={TH_CLASSES}>Next due</th>
                <th className={`${TH_CLASSES} hidden md:table-cell`}>Given by</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
              {records.map((vac) => {
                const badge = vac.is_latest_in_series ? dueBadge(vac.next_due) : null
                return (
                  <tr className={ROW_CLASSES} key={vac.id}>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-stone-900 dark:text-stone-100">
                          {vac.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            vac.source === 'VET'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
                          }`}
                        >
                          {vac.source === 'VET' ? 'Veterinarian' : 'Owner'}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-stone-600 dark:text-stone-300">
                      {formatDate(vac.date_given, timeZone)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-stone-600 dark:text-stone-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>{formatDate(vac.next_due, timeZone)}</span>
                        {badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3.5 text-stone-600 md:table-cell dark:text-stone-300">
                      {vac.veterinarian ?? '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function AppointmentHistory({ history }: { history: PetHistory }) {
  const navigate = useNavigate()
  const records = history.appointments

  return (
    <Card padding="sm">
      <SectionHeader
        icon="appointments"
        meta={`${records.length} appointment${records.length === 1 ? '' : 's'}`}
        title="Appointment history"
      />
      {records.length === 0 ? (
        <EmptyState icon="appointments" message="No appointments recorded." />
      ) : (
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
              {records.map((appointment) => (
                <tr
                  className={`${ROW_CLASSES} cursor-pointer`}
                  key={appointment.apt_id}
                  onClick={() =>
                    navigate(`/receptionist/appointments/${appointment.apt_id}`)
                  }
                >
                  <td className="whitespace-nowrap px-4 py-3.5 font-medium text-stone-800 dark:text-stone-200">
                    {formatDateTime(appointment.apt_scheduled_at)}
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const petQuery = usePetDetail(id ?? '')
  const historyQuery = usePetHistory(id ?? '')
  const settings = useClinicSettings()
  const displayTimeZone = settings.data?.timezone ?? CLINIC_TIME_ZONE

  const pet = petQuery.data
  const history = historyQuery.data
  const historyLoading = historyQuery.isLoading && !history

  if (petQuery.isLoading) {
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

  if (petQuery.error || !pet) {
    return (
      <DetailLoadError
        entity="Patient"
        error={petQuery.error}
        onRetry={petQuery.refetch}
        isRetrying={petQuery.isFetching}
        onBack={() => navigate('/receptionist/pets')}
      />
    )
  }

  const nextAppointment = nextAppointmentFrom(history?.appointments ?? [])
  const subtitle = [pet.breed_name ?? 'Unknown breed', labelize(pet.sex), ageFrom(pet.date_of_birth)]
    .filter(Boolean)
    .join(' | ')

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <Link
        className="group inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100"
        to="/receptionist/pets"
      >
        <Icon
          name="back"
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
        Back to patients
      </Link>

      <PageHero
        avatar={
          pet.profile_picture ? (
            <img
              alt=""
              className="size-16 shrink-0 rounded-full object-cover ring-2 ring-white/20"
              src={pet.profile_picture}
            />
          ) : (
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-bold text-white ring-1 ring-white/20">
              {initial(pet.name)}
            </div>
          )
        }
        subtitle={subtitle || undefined}
        title={pet.name}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          icon="appointments"
          label="Appointments"
          tone="amber"
          value={String(history?.appointments.length ?? 0)}
        />
        <SummaryTile
          icon="vaccinations"
          label="Vaccinations"
          tone="emerald"
          value={String(history?.vaccinations.length ?? 0)}
        />
        <SummaryTile
          compact
          icon="clock"
          label="Next appointment"
          tone="sky"
          value={
            nextAppointment
              ? formatDateTime(nextAppointment.apt_scheduled_at, displayTimeZone)
              : '-'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <OwnerCard pet={pet} />

        <Card>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Patient details
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <DetailRow label="Breed" value={pet.breed_name ?? '-'} />
            <DetailRow label="Sex" value={labelize(pet.sex)} />
            <DetailRow label="Age" value={ageFrom(pet.date_of_birth)} />
            <DetailRow
              label="Date of birth"
              value={pet.date_of_birth ? formatDate(pet.date_of_birth, displayTimeZone) : '-'}
            />
            <DetailRow
              label="Weight"
              value={pet.weight ? `${pet.weight} kg` : '-'}
            />
            <DetailRow label="Color" value={pet.color ?? '-'} />
            <DetailRow label="Microchip" value={pet.microchip_number ?? '-'} />
            <DetailRow
              label="Registered"
              value={formatDate(pet.created_at, displayTimeZone)}
            />
          </dl>
        </Card>
      </div>

      {historyQuery.error ? (
        <Card padding="sm">
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Could not load the medical history.
            </p>
            <p className="max-w-md text-xs text-stone-400 dark:text-stone-500">
              {apiErrorMessage(historyQuery.error)}
            </p>
            <Button
              className="mt-1"
              loading={historyQuery.isFetching}
              onClick={() => historyQuery.refetch()}
              size="sm"
              type="button"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        </Card>
      ) : historyLoading ? (
        <>
          <Card padding="sm">
            <SectionHeader icon="vaccinations" title="Vaccination history" />
            <div className="mt-4 h-40 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
          </Card>
          <Card padding="sm">
            <SectionHeader icon="appointments" title="Appointment history" />
            <div className="mt-4 h-40 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
          </Card>
        </>
      ) : history ? (
        <>
          <VaccinationHistory history={history} timeZone={displayTimeZone} />
          <AppointmentHistory history={history} />
        </>
      ) : null}
    </div>
  )
}
