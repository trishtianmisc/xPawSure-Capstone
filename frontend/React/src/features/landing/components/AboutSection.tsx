import type { MouseEvent } from 'react'

import { LandingIcon, type LandingIconName } from './LandingIcon'
import { Reveal } from './Reveal'
import { SectionHeading } from './SectionHeading'
import { scrollToSection } from '../landing.utils'

const ABOUT_POINTS: { title: string; description: string; icon: LandingIconName }[] = [
  {
    title: 'Connected clinic workflow',
    description:
      'Reception, clinic administration, and veterinary care work from the same clinic-scoped records.',
    icon: 'users',
  },
  {
    title: 'Clinic-scoped records',
    description:
      'Every pet, appointment, consultation, prescription, and screening belongs to one clinic.',
    icon: 'shield',
  },
  {
    title: 'Preliminary AI screening',
    description:
      'AI-assisted skin screening offers additional insight for veterinary review — never a diagnosis.',
    icon: 'sparkles',
  },
  {
    title: 'Role-based workspaces',
    description:
      'Each team member sees the tools and information their responsibilities require.',
    icon: 'globe',
  },
]

export function AboutSection() {
  function handleFeaturesClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    scrollToSection('features')
  }

  return (
    <section
      className="scroll-mt-20 border-b border-stone-200 py-20 dark:border-stone-800 dark:bg-stone-900/40 sm:py-24"
      id="about"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="About XPawSure"
              title="One platform for clinic operations and veterinary care."
            />

            <div className="mt-6 space-y-4 text-base leading-7 text-stone-600 dark:text-stone-400">
              <p>
                XPawSure is a veterinary technology platform that brings appointments, pet records,
                consultations, prescriptions, and AI-assisted preliminary screening together in one
                professional workspace.
              </p>
              <p>
                Built for Super Admins, Clinic Admins, receptionists, and veterinarians, XPawSure
                keeps daily clinic work organized while supporting better coordination between
                front-desk staff and the veterinary team.
              </p>
              <p>
                AI-assisted screening is designed to support veterinary professionals with
                preliminary insight. It does not replace professional examination, clinical
                judgment, or a final veterinary diagnosis.
              </p>
            </div>

            <a
              className="mt-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-amber-800 transition hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              href="#features"
              onClick={handleFeaturesClick}
            >
              Explore the platform features
              <LandingIcon className="size-4" name="arrow-right" />
            </a>
          </Reveal>

          <Reveal delay={120}>
            <div className="grid gap-4 sm:grid-cols-2">
              {ABOUT_POINTS.map((point) => (
                <div
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-stone-700 dark:bg-stone-800"
                  key={point.title}
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <LandingIcon className="size-5" name={point.icon} />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-stone-900 dark:text-stone-100">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-400">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
