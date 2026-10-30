import { Alert, Card } from '../../../../components/ui'
import { apiErrorMessage } from '../../../../utils/error'
import { DashboardLayout } from '../../dashboard/components/DashboardLayout'
import { GrowthChart, GrowthChartSkeleton } from '../components/GrowthChart'
import { usePlatformAnalytics } from '../hooks/usePlatformAnalytics'

interface StatCardProps {
  label: string
  value: number | string
  subtitle: string
  accent: string
  iconBg: string
  iconColor: string
  icon: string
}

function StatCard({ label, value, subtitle, accent, iconBg, iconColor, icon }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-800">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</p>
          <p className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">{value}</p>
        </div>
        <div className={`grid size-11 shrink-0 place-items-center rounded-md ${iconBg} dark:opacity-80`}>
          <svg className={`size-5 ${iconColor}`} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent} scale-x-0 transition-transform group-hover:scale-x-100`} />
    </div>
  )
}

function BreakdownBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-stone-700 dark:text-stone-300">{label}</span>
        <span className="text-stone-500 dark:text-stone-400">
          {count} <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function AnalyticsPage() {
  const { data, isLoading, error } = usePlatformAnalytics()

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-md bg-stone-200 dark:bg-stone-700" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <GrowthChartSkeleton />
          <GrowthChartSkeleton />
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="error">{apiErrorMessage(error)}</Alert>
      </DashboardLayout>
    )
  }

  if (!data) return null

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: 'Super Admins',
    CLINIC_ADMIN: 'Clinic Admins',
    VETERINARIAN: 'Veterinarians',
    RECEPTIONIST: 'Receptionists',
    OWNER: 'Owners',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    CHECKED_IN: 'Checked In',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    NO_SHOW: 'No Show',
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="rounded-md bg-gradient-to-br from-amber-900 to-amber-950 p-7 sm:p-9">
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Platform Analytics</h1>
            <p className="mt-2 max-w-xl text-base text-amber-200/80">
              Cross-clinic activity across XPawSure. Read-only — medical records are never modified here.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            accent="from-amber-500 to-amber-700"
            icon="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            iconBg="bg-amber-100"
            iconColor="text-amber-700"
            label="Total Clinics"
            subtitle={`${data.clinics.by_status.ACTIVE ?? 0} active`}
            value={data.clinics.total}
          />
          <StatCard
            accent="from-sky-500 to-sky-700"
            icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6-4a4 4 0 11-4-4"
            iconBg="bg-sky-100"
            iconColor="text-sky-700"
            label="Total Users"
            subtitle={`${data.users.active} active`}
            value={data.users.total}
          />
          <StatCard
            accent="from-emerald-500 to-emerald-700"
            icon="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
            label="Registered Pets"
            subtitle="Across all clinics"
            value={data.pets.total}
          />
          <StatCard
            accent="from-violet-500 to-violet-700"
            icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            iconBg="bg-violet-100"
            iconColor="text-violet-700"
            label="Appointments"
            subtitle={`${data.appointments.by_status.COMPLETED ?? 0} completed`}
            value={data.appointments.total}
          />
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Owners</p>
            <p className="mt-2 text-2xl font-extrabold text-stone-900 dark:text-stone-100">{data.owners}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Consultations</p>
            <p className="mt-2 text-2xl font-extrabold text-stone-900 dark:text-stone-100">{data.consultations}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">AI Screenings</p>
            <p className="mt-2 text-2xl font-extrabold text-stone-900 dark:text-stone-100">{data.screenings.total}</p>
          </div>
          <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">Revenue (Paid)</p>
            <p className="mt-2 text-2xl font-extrabold text-stone-900 dark:text-stone-100">
              ₱{Number(data.payments.paid_amount).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{data.payments.paid_count} paid payments</p>
          </div>
        </div>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <GrowthChart color="#d97706" data={data.growth.clinics} subtitle="Last 12 months" title="Clinic Registrations" />
          <GrowthChart color="#0284c7" data={data.growth.users} subtitle="Last 12 months" title="User Registrations" />
          <GrowthChart color="#059669" data={data.growth.pets} subtitle="Last 12 months" title="Pet Registrations" />
          <GrowthChart color="#7c3aed" data={data.growth.appointments} subtitle="Last 12 months" title="Appointments Created" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card padding="lg">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Users by Role</h2>
            <div className="mt-5 space-y-4">
              {Object.entries(roleLabels).map(([role, label]) => (
                <BreakdownBar
                  key={role}
                  color="bg-sky-500"
                  count={data.users.by_role[role] ?? 0}
                  label={label}
                  total={data.users.total}
                />
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">Appointments by Status</h2>
            <div className="mt-5 space-y-4">
              {Object.entries(statusLabels).map(([key, label]) => (
                <BreakdownBar
                  key={key}
                  color="bg-violet-500"
                  count={data.appointments.by_status[key] ?? 0}
                  label={label}
                  total={data.appointments.total}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
