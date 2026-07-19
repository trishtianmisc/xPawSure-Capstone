import { DashboardLayout } from '../components/DashboardLayout'

const STATS = [
  {
    label: 'Total Clinics',
    value: '0',
    subtitle: 'Active clinics on the platform',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    accent: 'from-amber-500 to-amber-700',
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    label: 'Clinic Admins',
    value: '0',
    subtitle: 'Registered clinic administrators',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    accent: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
  },
  {
    label: 'Pending Approvals',
    value: '0',
    subtitle: 'Clinics awaiting onboarding',
    icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
    accent: 'from-violet-500 to-violet-700',
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
  },
]

const QUICK_ACTIONS = [
  { label: 'Register New Clinic', description: 'Onboard a new veterinary clinic', color: 'bg-amber-900 hover:bg-amber-950', href: '/super-admin/clinics/new' },
  { label: 'View All Clinics', description: 'Browse and manage existing clinics', color: 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50', href: '#' },
]

const RECENT_ACTIVITY = [
  { action: 'No recent activity', time: '', type: 'empty' as const },
]

export function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-2xl bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              Platform Overview
            </h1>
            <p className="mt-2 max-w-xl text-base text-amber-200/80">
              Manage clinics, administrators, and monitor platform-wide activity from a single view.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                    {stat.label}
                  </p>
                  <p className="text-4xl font-extrabold tracking-tight text-stone-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${stat.iconBg}`}>
                  <svg className={`size-5 ${stat.iconColor}`} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p className="mt-3 text-sm text-stone-500">{stat.subtitle}</p>
              <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${stat.accent} scale-x-0 transition-transform group-hover:scale-x-100`} />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900">Quick Actions</h2>
            <p className="mt-1 text-sm text-stone-500">Common tasks to get started.</p>
            <div className="mt-5 space-y-3">
              {QUICK_ACTIONS.map((action) => (
                <a
                  key={action.label}
                  className={`flex items-center justify-between rounded-xl px-5 py-4 text-sm font-semibold shadow-sm transition ${action.color}`}
                  href={action.href}
                >
                  <div>
                    <p className={action.color.includes('bg-amber') ? 'text-white' : 'text-stone-900'}>{action.label}</p>
                    <p className={`mt-0.5 text-xs font-normal ${action.color.includes('bg-amber') ? 'text-amber-200' : 'text-stone-500'}`}>
                      {action.description}
                    </p>
                  </div>
                  <svg className={`size-5 shrink-0 ${action.color.includes('bg-amber') ? 'text-amber-200' : 'text-stone-400'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-stone-900">Recent Activity</h2>
            <p className="mt-1 text-sm text-stone-500">Latest platform events.</p>
            <div className="mt-5">
              {RECENT_ACTIVITY.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-5">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-stone-200">
                    <svg className="size-4 text-stone-400" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-stone-500">{item.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
