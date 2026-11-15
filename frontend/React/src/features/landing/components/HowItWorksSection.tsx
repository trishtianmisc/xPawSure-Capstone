import { LandingIcon, type LandingIconName } from './LandingIcon'
import { Reveal } from './Reveal'
import { DecorCircle, DecorPaw } from './Decor'

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
      'Pet owners submit a single skin photo through the XPawSure mobile app for preliminary screening, then book a consultation.',
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
    <section className="relative overflow-x-clip scroll-mt-20 py-20 sm:py-24" id="how-it-works">
      <DecorCircle variant="tan" className="size-72 -left-32 top-10" />
      <DecorCircle variant="brown" className="size-72 -right-32 top-40" />
      <DecorPaw className="size-8 right-[6%] top-16" rotate="18deg" />
      <DecorPaw className="size-6 left-[10%] bottom-12" rotate="-12deg" delay="2s" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8a4b24] dark:text-amber-400">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-[#4a2210] dark:text-stone-100 sm:text-4xl lg:text-[44px]">
              From appointment to consultation, connected.
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#6a3a1e] dark:text-stone-400">
              A straightforward workflow that connects the front desk, the veterinarian, and the
              pet owner&apos;s screening submission.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <ol className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, index) => (
              <li className="group text-center" key={step.title}>
                <span
                  aria-hidden="true"
                  className="mx-auto grid size-9 place-items-center rounded-full bg-[#4a2210] text-[15px] font-bold text-[#fff3e0] dark:bg-amber-300 dark:text-stone-950"
                >
                  {index + 1}
                </span>
                <span className="mx-auto mt-5 grid h-36 place-items-center text-[#4a2210] transition duration-200 group-hover:-translate-y-1 dark:text-amber-300">
                  <LandingIcon className="size-20" name={step.icon} />
                </span>
                <h3 className="mt-3 text-lg font-semibold text-[#4a2210] dark:text-stone-100">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-7 text-[#6a3a1e] dark:text-stone-400">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </Reveal>

       
      </div>
    </section>
  )
}
