import { LandingIcon, type LandingIconName } from './LandingIcon'
import { Reveal } from './Reveal'
import { DecorCircle, DecorPaw } from './Decor'

const FEATURES: { title: string; description: string; icon: LandingIconName }[] = [
  {
    title: 'AI-Assisted Screening',
    description:
      'Review preliminary screening results from a single skin photo submitted through the XPawSure mobile app.',
    icon: 'sparkles',
  },
  {
    title: 'Appointment Scheduling',
    description: 'Book, confirm, check in, and track appointments across veterinarian schedules.',
    icon: 'calendar',
  },
  {
    title: 'Consultation Records',
    description:
      'Document examination findings, diagnoses, and clinical observations in a structured record.',
    icon: 'document',
  },
  {
    title: 'Prescription Management',
    description:
      'Create prescription records with medication schedules and printable prescription documents.',
    icon: 'clipboard-check',
  },
  {
    title: 'Clinic & Staff Management',
    description:
      'Manage clinic settings, operating hours, and veterinarian and receptionist accounts.',
    icon: 'building',
  },
  {
    title: 'Reports & Analytics',
    description:
      'Track appointments, patient metrics, screening activity, and clinic performance.',
    icon: 'chart',
  },
]

export function FeaturesSection() {
  return (
    <section className="relative overflow-x-clip scroll-mt-20 bg-[#fff3e0] py-20 dark:bg-stone-900 sm:py-24" id="features">
      <DecorCircle variant="ring" className="size-80 -right-28 -bottom-10" />
      <DecorCircle variant="tan" className="size-80 -left-40 top-70" />
      <DecorPaw className="size-9 left-[5%] top-14" rotate="-18deg" />
      <DecorPaw className="size-10 left-[50%] bottom-50" rotate="-30deg" />
      <DecorPaw className="size-20 right-[80%] -top-1" rotate="-2deg" />
      <DecorPaw className="size-7 right-[8%] top-24" rotate="22deg" delay="1.5s" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8a4b24] dark:text-amber-400">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-[#4a2210] dark:text-stone-100 sm:text-4xl lg:text-[44px]">
              Everything your clinic needs, organized in one place.
            </h2>
            <p className="mt-4 text-lg leading-8 text-[#6a3a1e] dark:text-stone-400">
              Built around the real workflows of veterinary teams, from front-desk scheduling to
              clinical records and screening review.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <ul className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li className="group" key={feature.title}>
                <span className="grid size-14 place-items-center rounded-2xl bg-[#4a2210] text-[#f3d1a3] transition duration-200 group-hover:-translate-y-1 dark:bg-amber-900/40 dark:text-amber-300">
                  <LandingIcon className="size-6" name={feature.icon} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-[#4a2210] dark:text-stone-100">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[15px] leading-7 text-[#6a3a1e] dark:text-stone-400">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
