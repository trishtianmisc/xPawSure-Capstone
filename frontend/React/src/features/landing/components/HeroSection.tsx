import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import { DashboardPreview } from './DashboardPreview'
import { LandingIcon } from './LandingIcon'
import { Reveal } from './Reveal'
import { scrollToSection } from '../landing.utils'

const HERO_HIGHLIGHTS = [
  'Role-based clinic access',
  'Clinic-level data isolation',
  'AI supports every decision',
]

export function HeroSection() {
  function handleExploreClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    scrollToSection('features')
  }

  return (
    <section
      className="scroll-mt-20 border-b border-stone-200 bg-white py-16 dark:border-stone-800 dark:bg-stone-950 sm:py-20 lg:py-24"
      id="home"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8">
        <Reveal>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-950 dark:text-white sm:text-5xl">
            Smarter Veterinary Care,{' '}
            <span className="text-amber-900 dark:text-amber-300">Better Pet Health.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-7 text-stone-600 dark:text-stone-400 sm:text-lg sm:leading-8">
            XPawSure brings veterinary clinic management and AI-powered preliminary screening
            together, helping veterinary professionals manage appointments, streamline
            consultations, and support better pet healthcare.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
              to="/login"
            >
              Get Started
              <LandingIcon className="size-4" name="arrow-right" />
            </Link>
            <a
              className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 text-sm font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
              href="#features"
              onClick={handleExploreClick}
            >
              Explore Features
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5">
            {HERO_HIGHLIGHTS.map((highlight) => (
              <li
                className="flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400"
                key={highlight}
              >
                <LandingIcon className="size-4 text-amber-700 dark:text-amber-400" name="check" />
                {highlight}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={120}>
          <DashboardPreview />
        </Reveal>
      </div>
    </section>
  )
}
