import { LandingIcon, type LandingIconName } from './LandingIcon'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const STEPS: { title: string; description: string; icon: LandingIconName }[] = [
  {
    title: 'Access the platform',
    description:
      'Sign in with your clinic account. Role-based access opens the workspace for your responsibilities.',
    icon: 'login',
  },
  {
    title: 'Manage appointments & records',
    description:
      'Receptionists schedule visits, manage veterinarian availability, and keep owner and pet records up to date.',
    icon: 'calendar',
  },
  {
    title: 'Capture a screening photo',
    description:
      'Pet owners submit a single skin photo through the XPawSure mobile app for preliminary screening.',
    icon: 'camera',
  },
  {
    title: 'Conduct the consultation',
    description:
      'Veterinarians examine the pet and review the preliminary screening result during the consultation.',
    icon: 'plus',
  },
  {
    title: 'Record findings & prescriptions',
    description:
      "Diagnoses, observations, and prescriptions are documented and kept in the pet's medical history.",
    icon: 'clipboard-check',
  },
]

export function HowItWorksSection() {
  return (
    <section
      className="scroll-mt-20 bg-white py-20 dark:bg-stone-950 sm:py-24"
      id="how-it-works"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="A straightforward workflow that connects the front desk, the veterinarian, and the pet owner's screening submission."
            eyebrow="How it works"
            title="From appointment to consultation, connected."
          />
        </Reveal>

        <Reveal delay={100}>
          <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li
                className="relative flex flex-col rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-800"
                key={step.title}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <LandingIcon className="size-5" name={step.icon} />
                  </span>
                  <span className="text-xs font-bold tracking-wider text-stone-300 dark:text-stone-600">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-400">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 text-sm font-bold text-stone-900 dark:text-stone-100">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal delay={160}>
          <p className="mx-auto mt-8 max-w-3xl rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-center text-sm leading-6 text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-400">
            Clinic staff work in the XPawSure web workspace. Pet owners use the companion mobile app
            for preliminary screening and appointment access.
          </p>
        </Reveal>
      </div>
    </section>
  )
}
