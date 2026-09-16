import { useDashboard } from '../hooks/useDashboard'
import { StatCard, StatCardSkeleton } from '../components/StatCard'
import { TodayConsultations } from '../components/TodayConsultations'

export function DashboardPage() {
  const { data, isLoading, error } = useDashboard()

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-red-100 text-3xl dark:bg-red-900/30">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Failed to load dashboard</h2>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            className="mt-6 rounded-md bg-amber-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-950"
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
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Vet Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-base text-amber-200/80">
            Manage consultations, review AI screenings, and maintain medical records.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              accent="from-amber-500 to-amber-700"
              icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
              iconBg="bg-amber-100"
              iconColor="text-amber-700"
              label="Consultations this month"
              subtitle="Total consultations completed"
              value={data.stats.consultations_this_month}
            />
            <StatCard
              accent="from-orange-500 to-orange-700"
              icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
              iconBg="bg-orange-100"
              iconColor="text-orange-700"
              label="Pending"
              subtitle="Awaiting consultation"
              value={data.stats.pending}
            />
            <StatCard
              accent="from-emerald-500 to-emerald-700"
              icon={<svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-700"
              label="Completed"
              subtitle="Successfully completed"
              value={data.stats.completed}
            />
          </div>

          <TodayConsultations consultations={data.today_consultations} />
        </>
      ) : null}
    </div>
  )
}
