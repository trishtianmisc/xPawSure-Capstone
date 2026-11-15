import { LandingIcon, type LandingIconName } from './LandingIcon'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'

const FEATURES: { title: string; description: string; icon: LandingIconName }[] = [
  {
    title: 'AI-Assisted Screening',
    description:
      'Review preliminary screening results from a single skin photo submitted through the XPawSure mobile app.',
    icon: 'sparkles',
  },
  {
    title: 'Appointment Scheduling',
    description:
      'Book, confirm, check in, and track appointments across veterinarian schedules.',
    icon: 'calendar',
  },
  {
    title: 'Consultation Records',
    description:
      'Document examination findings, diagnoses, and clinical observations in a structured record.',
    icon: 'document',
  },
  {
    title: 'Pet & Owner Management',
    description:
      'Keep owner details, pet profiles, and complete medical histories easy to find.',
    icon: 'heart',
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
  {
    title: 'Notifications',
    description:
      'Keep clinic teams and pet owners informed about appointment updates and reminders.',
    icon: 'bell',
  },
]

export function FeaturesSection() {
  return (
    <section
      className="scroll-mt-20 bg-white py-20 dark:bg-stone-950 sm:py-24"
      id="features"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            description="Built around the real workflows of veterinary teams — from front-desk scheduling to clinical records and screening review."
            eyebrow="Core features"
            title="Everything your clinic needs, organized in one place."
          />
        </Reveal>

        <Reveal delay={100}>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                className="group rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md dark:border-stone-700 dark:bg-stone-800 dark:hover:border-amber-900/60"
                key={feature.title}
              >
                <span className="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-800 transition group-hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:group-hover:bg-amber-900/50">
                  <LandingIcon className="size-5" name={feature.icon} />
                </span>
                <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-stone-100">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
