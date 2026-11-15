import type { MouseEvent } from 'react'

import { LandingIcon, type LandingIconName } from './LandingIcon'
import { Reveal } from './Reveal'
import { scrollToSection } from '../landing.utils'
import { DecorCircle, DecorPaw } from './Decor'

const ABOUT_POINTS: { title: string; description: string; icon: LandingIconName }[] = [
  {
    title: 'Preliminary AI screening',
    description:
      'AI-assisted skin screening offers additional insight for veterinary review, never a diagnosis.',
    icon: 'sparkles',
  },
  {
    title: 'Connected clinic workflow',
    description:
      'Reception, clinic administration, and veterinary care work from the same clinic-scoped records.',
    icon: 'users',
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
      className="relative overflow-x-clip scroll-mt-20 overflow-x-clip bg-[#fff3e0] py-20 dark:bg-stone-900 sm:py-24"
      id="about"
    >
      <DecorCircle variant="ring" className="size-40 -right-20 -bottom-10" />
      <DecorCircle variant="tan" className="size-80 -left-40 top-70" />
      <DecorPaw className="size-9 left-[5%] top-14" rotate="-18deg" />
      <DecorPaw className="size-10 left-[50%] bottom-50" rotate="-30deg" />
      <DecorPaw className="size-20 right-[80%] -top-1" rotate="-2deg" />
      <DecorPaw className="size-7 right-[8%] top-24" rotate="22deg" delay="1.5s" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <Reveal>
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8a4b24] dark:text-amber-400">
              About XPawSure
            </p>
            <h2 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-[#4a2210] dark:text-stone-100 sm:text-4xl lg:text-[44px]">
              One platform for clinic operations and veterinary care.
            </h2>

            <div className="mt-6 space-y-4 text-base leading-7 text-[#6a3a1e] dark:text-stone-400">
              <p>
                XPawSure is a veterinary technology platform that brings appointments, pet records,
                consultations, prescriptions, and AI-assisted preliminary screening together in one
                professional workspace.
              </p>
              
              <p>
                AI-assisted screening is designed to support veterinary professionals with
                preliminary insight. It does not replace professional examination, clinical
                judgment, or a final veterinary diagnosis.
              </p>
            </div>

            <ul className="mt-8 space-y-4">
              {ABOUT_POINTS.map((point) => (
                <li className="flex items-start gap-4" key={point.title}>
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#4a2210] text-[#f3d1a3] dark:bg-amber-900/40 dark:text-amber-300">
                    <LandingIcon className="size-5" name={point.icon} />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-[#4a2210] dark:text-stone-100">
                      {point.title}
                    </h3>
                    <p className="mt-0.5 text-sm leading-6 text-[#6a3a1e] dark:text-stone-400">
                      {point.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <a
              className="mt-8 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-[#4a2210] underline-offset-4 transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a4b24] dark:text-amber-400"
              href="#features"
              onClick={handleFeaturesClick}
            >
              Explore the platform features
              <LandingIcon className="size-4" name="arrow-right" />
            </a>
          </Reveal>

          <Reveal delay={120}>
            {/* Circle composition from the Figma artwork */}
            <div aria-hidden="true" className="relative mx-auto h-[360px] w-full max-w-md sm:h-[440px]">
              <DecorCircle variant="tan" className="right-0 top-6 size-[300px] sm:size-[380px]" />
              <DecorCircle variant="dark" className="bottom-4 left-2 size-[150px] sm:size-[190px]" />
              <div className="landing-float absolute left-[18%] top-[22%] grid size-[190px] place-items-center rounded-full border-[10px] border-[#f3d1a3] bg-[#fff3e0] sm:size-[230px] dark:border-stone-700 dark:bg-stone-200">
                <img alt="" className="size-50 object-contain sm:size-50" src="/xpawsure-logo.png" />
              </div>
              <DecorPaw className="left-0 top-4 size-7" rotate="-20deg" delay="1.5s" />
              <DecorPaw className="bottom-10 right-4 size-11 text-[#4a2210]" rotate="20deg" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
