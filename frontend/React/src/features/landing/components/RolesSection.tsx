import { LandingIcon, type LandingIconName } from './LandingIcon'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const ROLES: {
  title: string
  tag: string
  description: string
  icon: LandingIconName
  responsibilities: string[]
}[] = [
  {
    title: 'Super Admin',
    tag: 'Platform',
    description: 'Oversees the platform and keeps clinic access and platform operations organized.',
    icon: 'globe',
    responsibilities: [
      'Manages clinics across the platform',
      'Creates clinics and Clinic Admin accounts',
      'Reviews platform-wide analytics',
    ],
  },
  {
    title: 'Clinic Admin',
    tag: 'Clinic',
    description: 'Runs the clinic account, staff, and configuration.',
    icon: 'building',
    responsibilities: [
      'Manages clinic profile and settings',
      'Manages veterinarian and receptionist accounts',
      'Reviews clinic reports',
    ],
  },
  {
    title: 'Receptionist',
    tag: 'Front desk',
    description: 'Keeps the front desk and appointment flow running smoothly.',
    icon: 'calendar',
    responsibilities: [
      'Schedules and manages appointments',
      'Registers owners and pets',
      'Checks patients in',
    ],
  },
  {
    title: 'Veterinarian',
    tag: 'Clinical',
    description: 'Leads consultations and records clinical care.',
    icon: 'plus',
    responsibilities: [
      'Conducts consultations',
      'Reviews AI screening results',
      'Records diagnoses, observations, and prescriptions',
    ],
  },
]

export function RolesSection() {
  return (
    <section className="border-y border-stone-200 bg-stone-50 py-20 dark:border-stone-800 dark:bg-stone-900/40 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="XPawSure gives every team member a focused workspace while keeping clinic information connected across the workflow."
            eyebrow="Built for your team"
            title="Four roles. One coordinated clinic workflow."
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((role, index) => (
              <div
                className="flex flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800"
                key={role.title}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <LandingIcon className="size-5" name={role.icon} />
                  </span>
                  <span className="text-xs font-bold tracking-wider text-stone-300 dark:text-stone-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>

                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400">
                  {role.tag}
                </p>
                <h3 className="mt-1 text-base font-bold text-stone-900 dark:text-stone-100">
                  {role.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  {role.description}
                </p>

                <ul className="mt-4 space-y-2.5 border-t border-stone-100 pt-4 dark:border-stone-700">
                  {role.responsibilities.map((responsibility) => (
                    <li
                      className="flex gap-2 text-sm leading-5 text-stone-600 dark:text-stone-400"
                      key={responsibility}
                    >
                      <LandingIcon
                        className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400"
                        name="check"
                      />
                      {responsibility}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
