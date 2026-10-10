import { useAuth } from '../../../auth/context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { StatCard, StatCardSkeleton } from '../components/StatCard'
import { useStaffStats } from '../../../staff/hooks/useStaffStats'
import { RecentActivity } from '../components/RecentActivity'
import { PageHero } from '../../../receptionist/components/PageHero'
import { AppointmentsByMonthChart, ChartSkeleton } from '../components/Charts/AppointmentsByMonthChart'
import { ScreeningsByDiseaseChart } from '../components/Charts/ScreeningsByDiseaseChart'
import { VetWorkloadChart } from '../components/Charts/VetWorkloadChart'
import { Button } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { useAppointmentVolume } from '../../appointments/hooks/useAppointments'
import { aggregateVolumeByMonth } from '../../appointments/utils/volume'

function rollingWindowStart(): string {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1)
  const month = String(from.getMonth() + 1).padStart(2, '0')
  return `${from.getFullYear()}-${month}-01`
}

export function DashboardPage() {
  const { user } = useAuth()
  const { data, error } = useDashboard()
  const { data: staffStats, isLoading: staffStatsLoading } = useStaffStats()
  const volume = useAppointmentVolume({ date_from: rollingWindowStart() })
  const appointmentsByMonth = aggregateVolumeByMonth(volume.data ?? [])
  const thisMonthCount = appointmentsByMonth[appointmentsByMonth.length - 1]?.value
  const lastMonthCount = appointmentsByMonth[appointmentsByMonth.length - 2]?.value

  if (error) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="max-w-md text-center">
            <svg
              className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">Failed to load dashboard</h2>
            <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
              {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              className="mt-5 rounded-md bg-amber-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
              onClick={() => window.location.reload()}
              type="button"
            >
              Try again
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

        {staffStatsLoading ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        ) : data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Total Staff"
                value={staffStats?.total || 0}
              />
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Total Patients"
                value={data.stats.total_pets}
              />
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Appointments This Month"
                value={thisMonthCount ?? '—'}
                trend={
                  thisMonthCount !== undefined && lastMonthCount !== undefined
                    ? {
                        direction: thisMonthCount >= lastMonthCount ? 'up' : 'down',
                        value: lastMonthCount > 0
                          ? `${Math.round(Math.abs(thisMonthCount - lastMonthCount) / lastMonthCount * 100)}%`
                          : 'N/A',
                      }
                    : undefined
                }
              />
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Screenings Awaiting Review"
                value={data.stats.screenings_pending_review}
                hint="Reviewed by veterinarians"
              />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {volume.isLoading ? (
                <ChartSkeleton />
              ) : volume.error ? (
                <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
                  <h3 className="mb-4 text-sm font-bold text-stone-700 dark:text-stone-300">
                    Appointments by Month
                  </h3>
                  <div className="py-6 text-center">
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {apiErrorMessage(volume.error)}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="mt-3"
                      loading={volume.isFetching}
                      onClick={() => volume.refetch()}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              ) : (
                <AppointmentsByMonthChart data={appointmentsByMonth} />
              )}
              <ScreeningsByDiseaseChart data={data.charts.screenings_by_disease} />
            </section>

            <section className="grid grid-cols-1 gap-6 ">
              <VetWorkloadChart data={data.charts.vet_workload} />
            </section>



            <RecentActivity data={data.recent} />
          </>
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md text-center">
              <svg
                className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0h1.5m-1.5 0h-11m0 0h-1.5m1.5 0v-1.5A2.25 2.25 0 006 12H3.75m0 0h1.5M3.75 12h16.5m0 0h1.5m-1.5 0v-1.5A2.25 2.25 0 0118 12h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} />
              </svg>
              <h2 className="mt-4 text-lg font-semibold text-stone-600 dark:text-stone-400">No dashboard data</h2>
              <p className="mt-1 text-sm text-stone-400 dark:text-stone-500">
                Your clinic dashboard will populate once you start registering pets and scheduling appointments.
              </p>
            </div>
          </div>
        )}
      </div>
  )
}
