import { useNavigate } from 'react-router-dom'

import { apiErrorMessage } from '../../../../utils/error'
import { PageHero } from '../../../receptionist/components/PageHero'
import { useDashboard } from '../hooks/useDashboard'
import { useStartConsultation } from '../hooks/useVetAppointments'
import { StatCard, StatCardSkeleton } from '../components/StatCard'
import { TodayConsultations } from '../components/TodayConsultations'

export function DashboardPage() {
  const { data, isLoading, error } = useDashboard()
  const navigate = useNavigate()
  const startConsultation = useStartConsultation()

  function handleStart(aptId: string) {
    startConsultation.mutate(aptId, {
      onSuccess: () => navigate(`/veterinarian/consultations/${aptId}`),
    })
  }

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
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <PageHero
            title="Dashboard"
            subtitle="Manage consultations, review AI screenings, and maintain medical records."
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : data ? (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                icon={<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Consultations this month"
                subtitle="Total consultations completed"
                value={data.stats.consultations_this_month}
              />
              <StatCard
                icon={<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Pending"
                subtitle="Awaiting consultation"
                value={data.stats.pending}
              />
              <StatCard
                icon={<svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} /></svg>}
                label="Completed"
                subtitle="Successfully completed"
                value={data.stats.completed}
              />
            </div>

            <TodayConsultations
              consultations={data.today_consultations}
              onStart={handleStart}
              onView={handleView}
            />
          </>
        ) : null}
      </div>
    </div>
  )
}
