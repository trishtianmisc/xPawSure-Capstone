import { useClinicOverview } from '../../analytics/hooks/useClinicOverview'

const APPOINTMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  CONFIRMED: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
  CHECKED_IN: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  NO_SHOW: 'bg-stone-100 text-stone-800 dark:bg-stone-700 dark:text-stone-300',
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-stone-900 dark:text-stone-100">{value}</p>
    </div>
  )
}

export function ClinicOverviewTab({ clinicId }: { clinicId: string }) {
  const { data, isLoading } = useClinicOverview(clinicId)

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-md bg-stone-200 dark:bg-stone-700" />
        ))}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Staff" value={data.staff.total} />
        <Metric label="Owners" value={data.owners} />
        <Metric label="Pets" value={data.pets} />
        <Metric label="Appointments" value={data.appointments.total} />
        <Metric label="Consultations" value={data.consultations} />
        <Metric label="Prescriptions" value={data.prescriptions} />
        <Metric label="Vaccinations" value={data.vaccinations} />
        <Metric label="AI Screenings" value={data.screenings} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">Staff Breakdown</h3>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-500 dark:text-stone-400">Clinic Admins</dt>
              <dd className="font-semibold text-stone-900 dark:text-stone-100">{data.staff.clinic_admins}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500 dark:text-stone-400">Veterinarians</dt>
              <dd className="font-semibold text-stone-900 dark:text-stone-100">{data.staff.veterinarians}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500 dark:text-stone-400">Receptionists</dt>
              <dd className="font-semibold text-stone-900 dark:text-stone-100">{data.staff.receptionists}</dd>
            </div>
            <div className="flex justify-between border-t border-stone-100 pt-2 dark:border-stone-700">
              <dt className="text-stone-500 dark:text-stone-400">Active accounts</dt>
              <dd className="font-semibold text-emerald-600 dark:text-emerald-400">{data.staff.active}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-stone-500 dark:text-stone-400">Deactivated</dt>
              <dd className="font-semibold text-red-600 dark:text-red-400">{data.staff.inactive}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-md border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800">
          <h3 className="text-sm font-bold text-stone-700 dark:text-stone-300">Appointments by Status</h3>
          {Object.keys(data.appointments.by_status).length === 0 ? (
            <p className="mt-4 text-sm text-stone-400 dark:text-stone-500">No appointments yet.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(data.appointments.by_status).map(([status, count]) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${APPOINTMENT_STATUS_COLORS[status] ?? 'bg-stone-100 text-stone-700 dark:bg-stone-700 dark:text-stone-300'}`}
                >
                  {status.replace('_', ' ')}
                  <span className="font-bold">{count as number}</span>
                </span>
              ))}
            </div>
          )}
          <div className="mt-5 border-t border-stone-100 pt-4 dark:border-stone-700">
            <p className="text-sm text-stone-500 dark:text-stone-400">Payments collected</p>
            <p className="mt-1 text-2xl font-extrabold text-stone-900 dark:text-stone-100">
              ₱{Number(data.payments.paid_amount).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              {data.payments.paid_count} of {data.payments.total_count} payments marked paid
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
