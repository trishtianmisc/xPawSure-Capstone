import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { formatDateTime, formatTime, isoDate } from '../../../utils/format'
import { useAppointments } from '../hooks/useAppointments'
import { useUpcomingAppointments } from '../hooks/useUpcomingAppointments'
import type { Appointment, AppointmentStatus } from '../types/receptionist.types'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'
import { QuickStatusAction } from './QuickStatusAction'

const TODAY_CAP = 10

/** Statuses that represent a live visit — the only rows the NOW/NEXT chip can mark. */
const ACTIVE_STATUSES: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
]

function ListSkeleton() {
  return (
    <div className="divide-y divide-stone-100 dark:divide-stone-800">
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-5 py-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        </div>
      ))}
    </div>
  )
}

/**
 * The current or next appointment: an in-progress visit wins, otherwise the
 * soonest non-terminal row in time order. Finished and closed rows are never
 * marked.
 */
function currentOrNextId(rows: Appointment[]): string | null {
  const active = rows.filter((apt) => ACTIVE_STATUSES.includes(apt.apt_status))
  if (active.length === 0) return null
  const inProgress = active.find((apt) => apt.apt_status === 'IN_PROGRESS')
  return (inProgress ?? active[0]).apt_id
}

interface TabButtonProps {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}

function TabButton({ active, children, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
          : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * One card, two tabs: today's queue with row actions and the current/next
 * highlight, plus future-day appointments. Replaces the separate queue and
 * upcoming cards so the dashboard stays one screen of work.
 */
export function AppointmentsCard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'today' | 'upcoming'>('today')

  const todayQuery = useAppointments({
    date: isoDate(),
    sort: 'apt_scheduled_at',
    page_size: 50,
  })
  const {
    upcoming,
    isLoading: upcomingLoading,
    error: upcomingError,
    refetch: refetchUpcoming,
  } = useUpcomingAppointments()

  const todayRows = (todayQuery.data?.results ?? []).filter(
    (apt) => apt.apt_status !== 'CANCELLED' && apt.apt_status !== 'NO_SHOW',
  )
  const visibleToday = todayRows.slice(0, TODAY_CAP)
  const hiddenToday = todayRows.length - visibleToday.length
  const highlightId = currentOrNextId(todayRows)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-5 py-4 dark:border-stone-800">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
            Appointments
          </h2>
          <div role="tablist" aria-label="Appointment range" className="flex gap-1">
            <TabButton active={tab === 'today'} onClick={() => setTab('today')}>
              Today
            </TabButton>
            <TabButton
              active={tab === 'upcoming'}
              onClick={() => setTab('upcoming')}
            >
              Upcoming
            </TabButton>
          </div>
        </div>
        <Link
          to="/receptionist/appointments"
          className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
        >
          All appointments &rarr;
        </Link>
      </header>

      <div role="tabpanel">
        {tab === 'today' ? (
          <>
            {todayQuery.isLoading ? (
              <ListSkeleton />
            ) : todayQuery.error ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Failed to load appointments
                </p>
                <button
                  onClick={() => todayQuery.refetch()}
                  className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
                >
                  Retry
                </button>
              </div>
            ) : visibleToday.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                No appointments today
              </p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {visibleToday.map((apt) => {
                  const isCurrentOrNext = apt.apt_id === highlightId
                  return (
                    <div
                      key={apt.apt_id}
                      data-apt-id={apt.apt_id}
                      onClick={() =>
                        navigate(`/receptionist/appointments/${apt.apt_id}`)
                      }
                      className={`flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3 transition ${
                        isCurrentOrNext
                          ? 'border-l-2 border-amber-500 bg-amber-50/70 dark:bg-amber-900/10'
                          : 'hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="w-16 shrink-0 font-mono text-xs font-semibold text-stone-600 dark:text-stone-300">
                          {formatTime(apt.apt_scheduled_at)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                            {apt.pet_name} — {apt.owner_name ?? 'Unknown owner'}
                          </p>
                          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                            {apt.vet_name ?? 'Unassigned'}
                          </p>
                        </div>
                      </div>
                      <div
                        className="flex shrink-0 items-center gap-3"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {isCurrentOrNext && (
                          <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold tracking-wide text-white dark:bg-amber-500">
                            {apt.apt_status === 'IN_PROGRESS' ? 'NOW' : 'NEXT'}
                          </span>
                        )}
                        <AppointmentStatusBadge status={apt.apt_status} />
                        <QuickStatusAction
                          aptId={apt.apt_id}
                          status={apt.apt_status}
                          scheduledAt={apt.apt_scheduled_at}
                          allowNoShow
                        />
                      </div>
                    </div>
                  )
                })}
                {hiddenToday > 0 && (
                  <div className="px-5 py-3">
                    <Link
                      to={`/receptionist/appointments?date_from=${isoDate()}&date_to=${isoDate()}`}
                      className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      +{hiddenToday} more &rarr;
                    </Link>
                  </div>
                )}
              </div>
            )}
          </>
        ) : upcomingLoading ? (
          <ListSkeleton />
        ) : upcomingError ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Failed to load appointments
            </p>
            <button
              onClick={() => refetchUpcoming()}
              className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              Retry
            </button>
          </div>
        ) : upcoming.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
            No upcoming appointments
          </p>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {upcoming.map((apt) => (
              <div
                key={apt.apt_id}
                data-apt-id={apt.apt_id}
                onClick={() => navigate(`/receptionist/appointments/${apt.apt_id}`)}
                className="flex cursor-pointer items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                    {apt.pet_name} — {apt.owner_name ?? 'Unknown owner'}
                  </p>
                  <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                    {apt.vet_name ?? 'Unassigned'} ·{' '}
                    {formatDateTime(apt.apt_scheduled_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <AppointmentStatusBadge status={apt.apt_status} />
                  <span className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400">
                    View
                  </span>
                </div>
              </div>
            ))}
            {upcoming.length >= 10 && (
              <div className="px-5 py-3">
                <Link
                  to={`/receptionist/appointments?date_from=${isoDate(tomorrow)}`}
                  className="text-sm font-semibold text-amber-700 hover:underline dark:text-amber-400"
                >
                  View all upcoming &rarr;
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
