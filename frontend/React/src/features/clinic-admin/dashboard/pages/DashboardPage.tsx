import { useAuth } from '../../../auth/context/AuthContext'
import { useDashboard } from '../hooks/useDashboard'
import { StatCard, StatCardError, StatCardSkeleton } from '../components/StatCard'
import { QuickActions } from '../components/QuickActions'
import { RecentActivity, RecentActivitySkeleton } from '../components/RecentActivity'
import { NotificationsPanel, NotificationsSkeleton } from '../components/NotificationsPanel'
import { AppointmentsByMonthChart, ChartSkeleton } from '../components/Charts/AppointmentsByMonthChart'
import { ScreeningsByDiseaseChart } from '../components/Charts/ScreeningsByDiseaseChart'
import { PetRegistrationTrendChart } from '../components/Charts/PetRegistrationTrendChart'
import { VaccinationTrendChart } from '../components/Charts/VaccinationTrendChart'

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useDashboard()

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : ''

  if (error) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-red-100 text-3xl dark:bg-red-900/30">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Failed to load dashboard</h2>
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              className="mt-6 rounded-lg bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950"
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
        {isLoading ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </>
        ) : data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Pet Owners"
                trend={{ direction: 'up', value: '12%' }}
                value={data.stats.total_owners}
              /> */}
              {/* <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Registered Pets"
                trend={{ direction: 'up', value: '8%' }}
                value={data.stats.total_pets}
              /> */}
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Today's Appointments"
                value={`${data.stats.today_appointments}`}
              />
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Pending Appointments"
                trend={{ direction: 'down', value: '3' }}
                value={data.stats.pending_appointments}
              />
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Completed Today"
                value={data.stats.completed_appointments}
              />
              {/* <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Veterinarians"
                value={data.stats.total_veterinarians}
              /> */}
              {/* <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Receptionists"
                value={data.stats.total_receptionists}
              /> */}
              <StatCard
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label={"Screenings Awaiting"} 
                trend={{ direction: 'up', value: '3 new' }}
                value={data.stats.screenings_pending_review}
                
              />
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AppointmentsByMonthChart data={data.charts.appointments_by_month} />
              <ScreeningsByDiseaseChart data={data.charts.screenings_by_disease} />
              <PetRegistrationTrendChart data={data.charts.pet_registration_trend} />
              <VaccinationTrendChart data={data.charts.vaccination_trend} />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecentActivity data={data.recent} />
              </div>
              <div className="space-y-6">
                <QuickActions />
                <NotificationsPanel notifications={data.notifications} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-stone-100 text-3xl dark:bg-stone-800">
                📊
              </div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">No dashboard data</h2>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                Your clinic dashboard will populate once you start registering pets and scheduling appointments.
              </p>
            </div>
          </div>
        )}
      </div>
  )
}
