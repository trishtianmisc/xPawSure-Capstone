import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { formatDate, formatTime } from '../../../utils/format'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import { PageHero } from '../components/PageHero'
import { usePetDetail, usePetHistory } from '../hooks/usePets'
import type { ConsultationRecord, PetHistory, ScreeningSummary } from '../types/receptionist.types'

function labelize(value: string): string {
  if (value === 'AI_REVIEW') return 'AI Review'
  const lower = value.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function ageFrom(dob: string | null): string | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - birth.getFullYear()
  const monthDiff = now.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) years -= 1
  if (years < 0) return null
  return years === 0 ? '<1 yr' : `${years} ${years === 1 ? 'yr' : 'yrs'}`
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

const SCREENING_STATUS: Record<string, { label: string; className: string }> = {
  PENDING_REVIEW: {
    label: 'Pending review',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  },
  REVIEWED: {
    label: 'Reviewed',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  },
  CONFIRMED: {
    label: 'Confirmed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  },
  DISMISSED: {
    label: 'Dismissed',
    className: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  },
}

function ScreeningStatusBadge({ status }: { status: string }) {
  const config = SCREENING_STATUS[status] ?? SCREENING_STATUS.PENDING_REVIEW
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${config.className}`}>
      {config.label}
    </span>
  )
}

function SectionShell({
  title,
  count,
  children,
}: {
  title: string
  count: number | null
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 sm:px-5 dark:border-stone-800">
        <h2 className="text-sm font-semibold text-stone-900 sm:text-base dark:text-stone-100">{title}</h2>
        {count !== null && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
      <p className="text-sm font-medium text-stone-600 dark:text-stone-400">{title}</p>
      <p className="text-xs text-stone-400 dark:text-stone-500">{hint}</p>
    </div>
  )
}

function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-4 py-5 sm:px-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-5 w-full animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
      ))}
    </div>
  )
}

const TH =
  'px-5 py-4 text-left text-sm font-semibold text-stone-500 dark:text-stone-400'
const TD = 'px-5 py-4 text-sm text-stone-700 dark:text-stone-300'
const ROW =
  'border-t border-stone-100 dark:border-stone-800/70 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/40'

function SoapField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3 dark:bg-stone-800/60">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm text-stone-800 dark:text-stone-200">
        {value?.trim() ? value : '—'}
      </p>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 text-center dark:border-stone-800 dark:bg-stone-800/50">
      <p className="text-xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
        {label}
      </p>
    </div>
  )
}

function AiVsVetComparison({
  screening,
  diagnosis,
}: {
  screening: ScreeningSummary | null
  diagnosis: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-900/50 dark:bg-violet-900/20">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
          AI Screening
        </p>
        {screening ? (
          <>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {screening.disease}{' '}
              <span className="font-normal text-stone-600 dark:text-stone-300">
                · {Math.round(Number(screening.ais_confidence))}% confidence
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ScreeningStatusBadge status={screening.ais_status} />
              <span className="text-[11px] text-stone-500 dark:text-stone-400">
                {formatDate(screening.ais_created_at)} · {screening.ais_model_version} ·{' '}
                {screening.ais_source === 'DEVICE' ? 'On-device' : 'Demo'}
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No AI screening linked to this visit.
          </p>
        )}
      </div>
      <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900/50 dark:bg-blue-900/20">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          Veterinarian diagnosis
        </p>
        <p className="whitespace-pre-wrap text-sm font-semibold text-stone-900 dark:text-stone-100">
          {diagnosis.trim() ? diagnosis : '—'}
        </p>
      </div>
    </div>
  )
}

function Sections({ history }: { history: PetHistory }) {
  const navigate = useNavigate()
  const [openConsultation, setOpenConsultation] = useState<string | null>(null)

  const appointmentById = useMemo(
    () => new Map(history.appointments.map((apt) => [apt.apt_id, apt])),
    [history.appointments],
  )
  const prescriptionByCon = useMemo(
    () => new Map(history.prescriptions.map((prs) => [prs.consultation_id, prs])),
    [history.prescriptions],
  )

  function contextFor(con: ConsultationRecord) {
    return {
      screening: appointmentById.get(con.appointment_id)?.screening ?? null,
      prescription: prescriptionByCon.get(con.id) ?? null,
    }
  }

  return (
    <>
      <SectionShell title="Consultations" count={history.consultations.length}>
        {history.consultations.length === 0 ? (
          <EmptyState title="No consultations recorded" hint="Consultation notes will appear here after a visit." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-stone-50 dark:bg-stone-800/50">
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Veterinarian</th>
                  <th className={`${TH} hidden lg:table-cell`}>AI Screening</th>
                  <th className={TH}>Diagnosis</th>
                  <th className={`${TH} w-8`} />
                </tr>
              </thead>
              <tbody>
                {history.consultations.map((con) => {
                  const open = openConsultation === con.id
                  const { screening, prescription } = contextFor(con)
                  return (
                    <Fragment key={con.id}>
                      <tr
                        onClick={() => setOpenConsultation(open ? null : con.id)}
                        className={`${ROW} cursor-pointer`}
                      >
                        <td className={`${TD} whitespace-nowrap`}>{formatDate(con.created_at)}</td>
                        <td className={TD}>{con.veterinarian}</td>
                        <td className={`${TD} hidden lg:table-cell`}>
                          {screening
                            ? `${screening.disease} · ${Math.round(Number(screening.ais_confidence))}%`
                            : '—'}
                        </td>
                        <td className={TD}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-stone-900 dark:text-stone-100">
                              {con.diagnosis}
                            </span>
                            {prescription && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                Rx
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-stone-400">
                          <span className={`inline-block text-xs transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t border-stone-100 bg-stone-50/70 dark:border-stone-800/70 dark:bg-stone-800/30">
                          <td colSpan={5} className="px-4 py-4 sm:px-5">
                            <div className="space-y-4">
                              <AiVsVetComparison screening={screening} diagnosis={con.diagnosis} />

                              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <SoapField label="Chief Complaint" value={con.chief_complaint} />
                                <SoapField label="Subjective" value={con.subjective} />
                                <SoapField label="Objective" value={con.objective} />
                                <SoapField label="Assessment" value={con.assessment} />
                                <SoapField label="Plan" value={con.plan} />
                                <SoapField label="Treatment" value={con.treatment} />
                                <SoapField label="Notes" value={con.notes} />
                              </div>

                              <div>
                                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                                  Prescription
                                </p>
                                {prescription ? (
                                  <>
                                    {prescription.instructions && (
                                      <p className="mb-2 text-sm text-stone-600 dark:text-stone-300">
                                        <span className="font-semibold text-stone-800 dark:text-stone-100">
                                          Instructions:
                                        </span>{' '}
                                        {prescription.instructions}
                                      </p>
                                    )}
                                    <ul className="space-y-2">
                                      {prescription.items.map((item) => (
                                        <li
                                          key={item.id}
                                          className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-700 dark:bg-stone-900"
                                        >
                                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                              {item.medicine_name}
                                            </p>
                                            <p className="text-xs text-stone-500 dark:text-stone-400">
                                              {item.dosage} · {item.frequency} · {item.duration} · {labelize(item.route)}
                                            </p>
                                          </div>
                                          {item.notes && (
                                            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{item.notes}</p>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                ) : (
                                  <p className="text-sm text-stone-500 dark:text-stone-400">
                                    No prescription issued for this visit.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      <SectionShell title="Vaccinations" count={history.vaccinations.length}>
        {history.vaccinations.length === 0 ? (
          <EmptyState title="No vaccinations recorded" hint="Vet-issued and owner-reported vaccines will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-stone-50 dark:bg-stone-800/50">
                <tr>
                  <th className={TH}>Vaccine</th>
                  <th className={TH}>Given on</th>
                  <th className={TH}>Next due</th>
                  <th className={`${TH} hidden sm:table-cell`}>Dose</th>
                  <th className={`${TH} hidden md:table-cell`}>Given by</th>
                </tr>
              </thead>
              <tbody>
                {history.vaccinations.map((vac) => {
                  const badge = dueBadge(vac.next_due)
                  return (
                    <tr key={vac.id} className={ROW}>
                      <td className={TD}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-stone-900 dark:text-stone-100">{vac.name}</span>
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
                      <td className={`${TD} whitespace-nowrap`}>{formatDate(vac.date_given)}</td>
                      <td className={`${TD} whitespace-nowrap`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{vac.next_due ? formatDate(vac.next_due) : '—'}</span>
                          {badge && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${TD} hidden sm:table-cell`}>{vac.dose}</td>
                      <td className={`${TD} hidden md:table-cell`}>{vac.veterinarian ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>

      <SectionShell title="Appointments" count={history.appointments.length}>
        {history.appointments.length === 0 ? (
          <EmptyState title="No appointments at this clinic" hint="Booked visits will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-stone-50 dark:bg-stone-800/50">
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Type</th>
                  <th className={`${TH} hidden md:table-cell`}>Veterinarian</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.appointments.map((apt) => (
                  <tr
                    key={apt.apt_id}
                    onClick={() => navigate(`/receptionist/appointments/${apt.apt_id}`)}
                    className={`${ROW} cursor-pointer`}
                  >
                    <td className={`${TD} whitespace-nowrap`}>
                      <span>{formatDate(apt.apt_scheduled_at)}</span>
                      <span className="ml-2 text-xs text-stone-400 dark:text-stone-500">
                        {formatTime(apt.apt_scheduled_at)}
                      </span>
                    </td>
                    <td className={TD}>{labelize(apt.apt_type)}</td>
                    <td className={`${TD} hidden md:table-cell`}>{apt.vet_name ?? '—'}</td>
                    <td className={TD}>
                      <AppointmentStatusBadge status={apt.apt_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionShell>
    </>
  )
}

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const petQuery = usePetDetail(id ?? '')
  const historyQuery = usePetHistory(id ?? '')

  const pet = petQuery.data
  const history = historyQuery.data
  const historyLoading = historyQuery.isLoading || historyQuery.isFetching

  if (petQuery.isLoading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
          <div className="h-28 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="h-64 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        </div>
      </div>
    )
  }

  if (petQuery.error || !pet) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <p className="text-sm text-stone-500">Patient not found</p>
      </div>
    )
  }

  const age = ageFrom(pet.date_of_birth)
  const initial = pet.name.charAt(0).toUpperCase()
  const linkedScreenings = history
    ? history.appointments.filter((apt) => apt.screening !== null).length
    : 0

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
        >
          ← Back
        </button>

        <PageHero
          title={pet.name}
          avatar={
            pet.profile_picture ? (
              <img
                src={pet.profile_picture}
                alt={pet.name}
                className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white/20"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 text-xl font-bold text-white ring-2 ring-white/10">
                {initial}
              </div>
            )
          }
          meta={
            <>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                {pet.breed_name ?? 'Unknown breed'}
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                {labelize(pet.sex)}
              </span>
              {age && (
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100">
                  {age}
                </span>
              )}
            </>
          }
          actions={
            <button
              onClick={() => navigate('/receptionist/appointments/new')}
              className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
              type="button"
            >
              + Book Appointment
            </button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold text-stone-900 sm:text-base dark:text-stone-100">
              Patient Information
            </h2>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['Breed', pet.breed_name ?? '—'],
                ['Sex', labelize(pet.sex)],
                ['Date of Birth', pet.date_of_birth ? formatDate(pet.date_of_birth) : '—'],
                ['Weight', pet.weight ? `${pet.weight} kg` : '—'],
                ['Color', pet.color ?? '—'],
                ['Microchip', pet.microchip_number ?? '—'],
                ['QR Code', pet.qr_code ?? '—'],
                ['Registered', formatDate(pet.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3 border-b border-stone-100 pb-2 sm:block sm:border-0 sm:pb-0 dark:border-stone-800/60">
                  <dt className="text-xs text-stone-500 dark:text-stone-400">{label}</dt>
                  <dd className="text-sm font-medium text-stone-900 sm:mt-0.5 dark:text-stone-100">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="mb-4 text-sm font-semibold text-stone-900 sm:text-base dark:text-stone-100">
              Record Summary
            </h2>
            {historyLoading && !history ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Consultations" value={String(history?.consultations.length ?? 0)} />
                <StatTile label="Prescriptions" value={String(history?.prescriptions.length ?? 0)} />
                <StatTile label="Vaccinations" value={String(history?.vaccinations.length ?? 0)} />
                <StatTile label="AI Screenings" value={String(linkedScreenings)} />
              </div>
            )}
          </div>
        </div>

        {historyQuery.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-400">
            Could not load the medical history. Please try again.
          </div>
        ) : historyLoading && !history ? (
          <div className="space-y-6">
            <SectionShell title="Consultations" count={null}>
              <SkeletonRows />
            </SectionShell>
            <SectionShell title="Vaccinations" count={null}>
              <SkeletonRows />
            </SectionShell>
            <SectionShell title="Appointments" count={null}>
              <SkeletonRows />
            </SectionShell>
          </div>
        ) : history ? (
          <Sections history={history} />
        ) : null}
      </div>
    </div>
  )
}
