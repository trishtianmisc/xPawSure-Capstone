import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../auth/context/AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { AppointmentsCard } from '../components/AppointmentsCard'
import { CheckInModal } from '../components/CheckInModal'
import { NeedsAttentionPanel } from '../components/NeedsAttentionPanel'
import { PageHero } from '../components/PageHero'

type StatTone = 'amber' | 'sky' | 'emerald' | 'violet'

const TONE_CLASSES: Record<StatTone, string> = {
  amber:
    'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  emerald:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  violet:
    'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
}

function StatCard({
  scope,
  label,
  value,
  icon,
  tone,
  subValue,
}: {
  scope: 'Today' | 'Upcoming'
  label: string
  value: number | string
  icon: string
  tone: StatTone
  subValue?: string
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            data-scope={scope}
            className="inline-block rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500 dark:bg-stone-800 dark:text-stone-400"
          >
            {scope}
          </span>
          <p className="mt-2.5 text-sm font-medium text-stone-500 dark:text-stone-400">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold leading-none text-stone-900 dark:text-stone-100">
            {value}
          </p>
          {subValue && (
            <p className="mt-2 text-xs font-medium text-stone-400 dark:text-stone-500">
              {subValue}
            </p>
          )}
        </div>
        <div
          className={`grid size-10 shrink-0 place-items-center rounded-lg ${TONE_CLASSES[tone]}`}
        >
          <svg
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d={icon}
            />
          </svg>
        </div>
      </div>
    </div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: stats, isLoading, error, refetch: refetchStats } = useDashboardStats()
  const [checkInOpen, setCheckInOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8 h-28 animate-pulse rounded-md bg-stone-200 dark:bg-stone-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-stone-200 dark:bg-stone-800" />
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
            onClick={() => refetchStats()}
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
      <div className="mb-8">
        <PageHero
          title={`Welcome back, ${user?.first_name}`}
          subtitle="Here's what needs your attention today."
          actions={
            <button
              type="button"
              onClick={() => setCheckInOpen(true)}
              className="shrink-0 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              Check in patient
            </button>
          }
        />
      </div>

      {/* Key stats — scope chip on each card says whether the count is
          today-only or spans upcoming days */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          scope="Today"
          label="Appointments"
          value={stats?.today.total ?? 0}
          tone="amber"
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
        <StatCard
          scope="Upcoming"
          label="To confirm"
          value={stats?.upcoming.pending ?? 0}
          subValue={`${stats?.upcoming.confirmed ?? 0} confirmed`}
          tone="sky"
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
        <StatCard
          scope="Today"
          label="Checked in"
          value={stats?.today.checked_in ?? 0}
          tone="emerald"
          icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
        <StatCard
          scope="Today"
          label="Completed"
          value={stats?.today.completed ?? 0}
          tone="violet"
          icon="M5 13l4 4L19 7"
        />
      </div>

      {/* Follow-ups needing review */}
      {(stats?.review_pending ?? 0) > 0 && (
        <button
          type="button"
          onClick={() => navigate('/receptionist/appointments?status=REVIEW')}
          className="mb-8 flex w-full items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-left transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30"
        >
          <span className="flex min-w-0 items-center gap-3">
            <svg
              className="size-5 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2.25-13.5H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25h10.5A2.25 2.25 0 0019.5 19.5v-15a2.25 2.25 0 00-2.25-2.25z"
              />
            </svg>
            <span className="min-w-0 truncate text-sm font-semibold text-amber-800 dark:text-amber-300">
              {stats?.review_pending ?? 0} follow-up appointment
              {(stats?.review_pending ?? 0) === 1 ? '' : 's'} need
              {(stats?.review_pending ?? 0) === 1 ? 's' : ''} review
            </span>
          </span>
          <span className="shrink-0 text-sm font-bold text-amber-700 dark:text-amber-400">
            Review &rarr;
          </span>
        </button>
      )}

      {/* Action list: pending confirmations and past-due rows */}
      <NeedsAttentionPanel />

      {/* Today's queue and future appointments in one tabbed card */}
      <AppointmentsCard />

      <CheckInModal open={checkInOpen} onClose={() => setCheckInOpen(false)} />
    </div>
  )
}
