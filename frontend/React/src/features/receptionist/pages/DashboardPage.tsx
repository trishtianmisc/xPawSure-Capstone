import { useAuth } from '../../auth/context/AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useUpcomingAppointments } from '../hooks/useUpcomingAppointments'
import { AppointmentStatusBadge } from '../components/AppointmentStatusBadge'
import { formatDate, formatDateTime, formatTime } from '../../../utils/format'

function StatCard({
  label,
  value,
  icon,
  subValue,
}: {
  label: string
  value: number | string
  icon: string
  subValue?: string
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-4">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
          <svg className="size-6 text-amber-700 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
          {subValue && (
            <p className="text-xs font-medium text-stone-400 dark:text-stone-500">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ListSkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="px-5 py-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
          <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-stone-200 dark:bg-stone-800" />
        </div>
      ))}
    </>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data: stats, isLoading, error } = useDashboardStats()
  const {
    upcoming,
    nextUp,
    isLoading: appointmentsLoading,
    error: appointmentsError,
    refetch: refetchAppointments,
  } = useUpcomingAppointments()

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800" />
        <div className="mb-8 h-24 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <div className="text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400">Failed to load dashboard</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-stone-900 dark:text-stone-100">
        Welcome back, {user?.first_name}
      </h1>

      {/* Up Next */}
      <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Up Next
            </p>
            {appointmentsLoading ? (
              <div className="mt-2 h-5 w-64 max-w-full animate-pulse rounded bg-amber-200 dark:bg-amber-800/40" />
            ) : appointmentsError ? (
              <p className="mt-1 text-sm font-medium text-stone-600 dark:text-stone-300">
                Unable to load today&apos;s schedule
              </p>
            ) : nextUp ? (
              <>
                <p className="mt-1 truncate text-lg font-bold text-stone-900 dark:text-stone-100">
                  {nextUp.pet_name} — {nextUp.owner_name ?? 'Unknown owner'}
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-300">
                  {nextUp.vet_name ?? 'Unassigned'} ·{' '}
                  {formatTime(nextUp.apt_scheduled_at) || formatDate(nextUp.apt_scheduled_at)}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-stone-600 dark:text-stone-300">
                No more appointments today
              </p>
            )}
          </div>
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <svg
              className="size-6 text-amber-700 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value={stats?.today.total ?? 0}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
        <StatCard
          label="Pending"
          value={stats?.today.pending ?? 0}
          subValue={`${stats?.today.confirmed ?? 0} Confirmed`}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
        <StatCard
          label="Checked In"
          value={stats?.today.checked_in ?? 0}
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
        <StatCard
          label="Completed"
          value={stats?.today.completed ?? 0}
          icon="M5 13l4 4L19 7"
        />
      </div>

      {/* Totals */}
      {/* <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total Owners"
          value={stats?.total_owners ?? 0}
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
        <StatCard
          label="Total Pets"
          value={stats?.total_pets ?? 0}
          icon="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </div> */}

      {/* Upcoming Appointments */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="border-b border-stone-200 px-5 py-4 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">Upcoming Appointments</h2>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {appointmentsLoading ? (
            <ListSkeleton />
          ) : appointmentsError ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-stone-500 dark:text-stone-400">Failed to load appointments</p>
              <button
                onClick={() => refetchAppointments()}
                className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                Retry
              </button>
            </div>
          ) : upcoming.length > 0 ? (
            upcoming.map((apt) => (
              <div key={apt.apt_id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                    {apt.pet_name} — {apt.owner_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {apt.vet_name ?? 'Unassigned'} · {formatDateTime(apt.apt_scheduled_at)}
                  </p>
                </div>
                <AppointmentStatusBadge status={apt.apt_status} />
              </div>
            ))
          ) : (
            <p className="px-5 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
              No upcoming appointments
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
