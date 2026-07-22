import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { clinicService } from '../../clinics/services/clinic.service'
import { DashboardLayout } from '../components/DashboardLayout'

const STAT_CARDS = [
  {
    label: 'Total Clinics',
    key: 'total' as const,
    subtitle: 'Active clinics on the platform',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    accent: 'from-amber-500 to-amber-700',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    label: 'Active',
    key: 'active' as const,
    subtitle: 'Clinics currently active',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    accent: 'from-emerald-500 to-emerald-700',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
  },
  {
    label: 'Suspended',
    key: 'suspended' as const,
    subtitle: 'Clinics currently suspended',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
    accent: 'from-red-500 to-red-700',
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-700',
  },
]

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: stats } = useQuery({
    queryKey: ['clinic-stats'],
    queryFn: clinicService.getStats,
    staleTime: 30_000,
  })

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Platform Overview
            </h1>
            <p className="mt-2 max-w-xl text-base text-amber-200/80">
              Manage clinics, administrators, and monitor platform-wide activity from a single view.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STAT_CARDS.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-md border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-800"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    {stat.label}
                  </p>
                  <p className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                    {stats?.[stat.key] ?? 0}
                  </p>
                </div>
                <div className={`grid size-11 shrink-0 place-items-center rounded-md ${stat.iconBg} dark:opacity-80`}>
                  <svg className={`size-5 ${stat.iconColor}`} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{stat.subtitle}</p>
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${stat.accent} scale-x-0 transition-transform group-hover:scale-x-100`} />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Quick Actions</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Common tasks to get started.</p>
            <div className="mt-5 space-y-3">
              <button
                className="flex w-full items-center justify-between rounded-md bg-amber-900 px-5 py-4 text-left text-sm font-semibold text-white shadow-sm transition hover:bg-amber-950"
                type="button"
                onClick={() => navigate('/super-admin/clinics/new')}
              >
                <div>
                  <p className="text-white">Register New Clinic</p>
                  <p className="mt-0.5 text-xs font-normal text-amber-200">Onboard a new veterinary clinic</p>
                </div>
                <svg className="size-5 shrink-0 text-amber-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                className="flex w-full items-center justify-between rounded-md border border-stone-300 bg-white px-5 py-4 text-left text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-700 dark:text-stone-200 dark:hover:bg-stone-600"
                type="button"
                onClick={() => navigate('/super-admin/clinics')}
              >
                <div>
                  <p className="text-stone-900 dark:text-stone-100">View All Clinics</p>
                  <p className="mt-0.5 text-xs font-normal text-stone-500 dark:text-stone-400">Browse and manage existing clinics</p>
                </div>
                <svg className="size-5 shrink-0 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Recent Activity</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Latest clinics registered.</p>
            <div className="mt-5">
              {stats && stats.recent.length > 0 ? (
                <div className="space-y-2">
                  {stats.recent.map((clinic) => (
                    <button
                      key={clinic.id}
                      className="flex w-full items-center gap-3 rounded-md bg-stone-50 px-4 py-3 text-left transition hover:bg-amber-50 dark:bg-stone-700/50 dark:hover:bg-amber-900/20"
                      type="button"
                      onClick={() => navigate(`/super-admin/clinics/${clinic.id}`)}
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                        <svg className="size-4 text-amber-700 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-200">{clinic.name}</p>
                        <p className="text-xs text-stone-400 dark:text-stone-500">{new Date(clinic.created_at).toLocaleDateString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-md bg-stone-50 px-4 py-5 dark:bg-stone-700/50">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-200 dark:bg-stone-700">
                    <svg className="size-4 text-stone-400 dark:text-stone-500" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-stone-500 dark:text-stone-400">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
