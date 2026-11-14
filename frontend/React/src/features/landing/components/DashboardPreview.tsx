import { LandingIcon, type LandingIconName } from './LandingIcon'

const PREVIEW_NAV: { label: string; icon: LandingIconName; isActive?: boolean }[] = [
  { label: 'Dashboard', icon: 'home', isActive: true },
  { label: 'Appointments', icon: 'calendar' },
  { label: 'Patients', icon: 'heart' },
  { label: 'Consultations', icon: 'document' },
  { label: 'Reports', icon: 'chart' },
]

const PREVIEW_STATS = [
  { label: 'Appointments', value: '12' },
  { label: 'Patients', value: '248' },
  { label: 'Screenings', value: '7' },
]

const PREVIEW_APPOINTMENTS = [
  { name: 'Max', detail: 'Check-up · 9:30 AM', status: 'Confirmed' },
  { name: 'Bella', detail: 'Skin screening · 10:15 AM', status: 'Checked in' },
  { name: 'Coco', detail: 'Vaccination · 11:00 AM', status: 'Confirmed' },
]

export function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="relative rounded-[2rem] bg-[#f4d0a5] p-3 shadow-xl shadow-amber-950/10 dark:border dark:border-amber-900/40 dark:bg-amber-950/40 sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-4 size-24 rounded-full bg-amber-950/10 dark:bg-amber-200/5"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 -left-3 size-16 rounded-full bg-white/30 dark:bg-amber-100/5"
        />

        <div
          aria-hidden="true"
          className="relative overflow-hidden rounded-2xl border border-amber-950/10 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900"
        >
          <div className="flex items-center gap-1.5 border-b border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-800">
            <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
            <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
            <span className="size-1.5 rounded-full bg-stone-300 dark:bg-stone-600" />
            <span className="ml-2 text-[9px] font-semibold text-stone-500 dark:text-stone-400">
              Clinic workspace
            </span>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Preview
            </span>
          </div>

          <div className="grid grid-cols-[84px_1fr] sm:grid-cols-[112px_1fr]">
            <div className="border-r border-stone-200 bg-stone-50/80 p-2 dark:border-stone-700 dark:bg-stone-800/50">
              <div className="flex items-center gap-1.5 px-1 py-1">
                <img alt="" className="size-5 object-contain" src="/xpawsure-logo.png" />
                <span className="text-[9px] font-extrabold tracking-tight text-amber-950 dark:text-stone-100">
                  XPawSure
                </span>
              </div>

              <div className="mt-2 space-y-0.5">
                {PREVIEW_NAV.map((item) => (
                  <div
                    className={`flex items-center gap-1.5 rounded-md px-1.5 py-1.5 ${
                      item.isActive
                        ? 'bg-amber-100/80 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
                        : 'text-stone-500 dark:text-stone-400'
                    }`}
                    key={item.label}
                  >
                    <LandingIcon className="size-3 shrink-0" name={item.icon} />
                    <span className="truncate text-[8px] font-semibold sm:text-[9px]">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-1.5 py-1.5 dark:border-stone-700 dark:bg-stone-800">
                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-[7px] font-bold text-white">
                  CM
                </span>
                <span className="truncate text-[8px] font-semibold text-stone-600 dark:text-stone-300">
                  Clinic admin
                </span>
              </div>
            </div>

            <div className="min-w-0 p-2.5 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-extrabold tracking-tight text-stone-900 dark:text-stone-100 sm:text-xs">
                    Clinic overview
                  </p>
                  <p className="text-[8px] font-medium text-stone-500 dark:text-stone-400 sm:text-[9px]">
                    Today at your clinic
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[8px] font-semibold text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  Today
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-1 sm:gap-2">
                {PREVIEW_STATS.map((stat) => (
                  <div
                    className="rounded-lg border border-stone-200 bg-white p-1.5 dark:border-stone-700 dark:bg-stone-800 sm:p-2"
                    key={stat.label}
                  >
                    <p className="text-sm font-extrabold leading-none tracking-tight text-stone-900 dark:text-stone-100 sm:text-base">
                      {stat.value}
                    </p>
                    <p className="mt-1 truncate text-[7px] font-semibold text-stone-500 dark:text-stone-400 sm:text-[8px]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-2.5 rounded-lg border border-stone-200 bg-white p-2 dark:border-stone-700 dark:bg-stone-800 sm:mt-3 sm:p-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-bold text-stone-800 dark:text-stone-200 sm:text-[10px]">
                    Today&apos;s appointments
                  </p>
                  <span className="text-[7px] font-semibold text-amber-800 dark:text-amber-400 sm:text-[8px]">
                    View all
                  </span>
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {PREVIEW_APPOINTMENTS.map((appointment) => (
                    <div className="flex items-center gap-1.5" key={appointment.name}>
                      <span className="grid size-4 shrink-0 place-items-center rounded-full bg-amber-50 text-[7px] font-bold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 sm:size-5">
                        {appointment.name.charAt(0)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[8px] font-semibold text-stone-800 dark:text-stone-200 sm:text-[9px]">
                          {appointment.name}
                        </p>
                        <p className="truncate text-[7px] text-stone-500 dark:text-stone-400 sm:text-[8px]">
                          {appointment.detail}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[6px] font-bold sm:text-[7px] ${
                          appointment.status === 'Checked in'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}
                      >
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-900/50 dark:bg-amber-900/20 sm:mt-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  <LandingIcon className="size-3.5" name="sparkles" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[8px] font-bold text-amber-950 dark:text-amber-100 sm:text-[9px]">
                    AI screening result
                  </p>
                  <p className="truncate text-[7px] text-amber-900/80 dark:text-amber-200/80 sm:text-[8px]">
                    Fungal · 86% confidence · preliminary
                  </p>
                </div>
                <span className="shrink-0 text-[7px] font-semibold text-amber-800 dark:text-amber-300 sm:text-[8px]">
                  Review
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs font-medium text-stone-500 dark:text-stone-400">
        A preview of the XPawSure clinic workspace
      </p>
    </div>
  )
}
