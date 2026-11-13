import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../../auth/context/AuthContext'
import { apiErrorMessage } from '../../../../utils/error'
import { clinicDateKey, formatDate, formatTime } from '../../../../utils/format'
import { PageHero } from '../../../receptionist/components/PageHero'
import { useDashboard } from '../hooks/useDashboard'
import { StatCard, StatCardSkeleton } from '../components/StatCard'
import { TodayConsultations } from '../components/TodayConsultations'

function StatIcon({ path }: { path: string }) {
  return (
    <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
    </svg>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useDashboard()
  const navigate = useNavigate()

  const todayKey = clinicDateKey()
  const nextUp =
    data?.upcoming_consultations.find(
      (apt) => clinicDateKey(apt.apt_scheduled_at) === todayKey,
    ) ?? null
  const nextUpIsOngoing =
    nextUp?.apt_status === 'CHECKED_IN' || nextUp?.apt_status === 'IN_PROGRESS'

  function handleView(aptId: string) {
    navigate(`/veterinarian/appointments/${aptId}`)
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-red-100 text-3xl dark:bg-red-900/30">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Failed to load dashboard
          </h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            {apiErrorMessage(error)}
          </p>
          <button
            className="mt-6 rounded-md bg-amber-700 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
            onClick={() => window.location.reload()}
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-6">
      <PageHero
        title="Dashboard"
        subtitle={`Welcome back${user?.first_name ? `, ${user.first_name}` : ''}. Here's your clinic overview.`}
      />

      {isLoading ? (
        <>
          <div className="h-28 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        </>
      ) : data ? (
        <>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-900/20">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                  {nextUpIsOngoing ? 'Ongoing' : 'Up Next'}
                </p>
                {nextUp ? (
                  <>
                    <p className="mt-1 truncate text-lg font-bold text-stone-900 dark:text-stone-100">
                      {nextUp.pet_name} — {nextUp.owner_name ?? 'Unknown owner'}
                    </p>
                    <p className="text-sm text-stone-600 dark:text-stone-300">
                      {nextUp.vet_name ?? 'Unassigned'} ·{' '}
                      {formatTime(nextUp.apt_scheduled_at) ||
                        formatDate(nextUp.apt_scheduled_at)}
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<StatIcon path="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
              label="Today's Consultations"
              value={data.stats.today_stats.total}
            />
            <StatCard
              icon={<StatIcon path="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />}
              label="Upcoming"
              subtitle="Confirmed today"
              value={data.stats.today_stats.confirmed}
            />
            <StatCard
              icon={<StatIcon path="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />}
              label="Ongoing"
              subtitle="Checked in and in progress"
              value={data.stats.today_stats.ongoing}
            />
            <StatCard
              icon={<StatIcon path="M5 13l4 4L19 7" />}
              label="Completed"
              subtitle="Completed today"
              value={data.stats.today_stats.completed}
            />
          </div>

          <TodayConsultations
            consultations={data.upcoming_consultations}
            onView={handleView}
          />
        </>
      ) : null}
    </div>
  )
}
