import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { HeroPhone } from './HeroPhone'
import { LandingIcon } from './LandingIcon'
import { Reveal } from './Reveal'
import { scrollToSection } from '../landing.utils'
import { DecorCircle, DecorPaw } from './Decor'

const CONDITIONS = ['Mange', 'Allergic dermatitis', 'Hotspot', 'Bacterial infection', 'Fungal infection']

const btn =
  'inline-flex h-12 items-center justify-center rounded-full border-2 px-7 text-[15px] font-semibold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a4b24]'

export function HeroSection() {
  function handleDownloadClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    scrollToSection('download')
  }

  return (
    <section className="relative -mt-[72px] scroll-mt-20 overflow-x-clip pb-20 pt-[72px] sm:pb-24" id="home">
      <DecorCircle variant="tan" className="size-72 -left-32 top-10" />
      <DecorCircle variant="brown" className="size-72 -right-32 top-40" />
      <DecorPaw className="size-8 right-[6%] top-16" rotate="18deg" />
      <DecorPaw className="size-6 left-[10%] bottom-12" rotate="-12deg" delay="2s" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:px-8">
        <Reveal>
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8a4b24] dark:text-amber-200">
            AI-assisted canine skin screening
          </p>
          <h1 className="mt-4 text-2xl font-bold leading-[1.05] tracking-tight text-[#4a2210] dark:text-white sm:text-3xl lg:text-[50px]">
            Spot skin trouble early. Care with confidence.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#6a3a1e] dark:text-stone-400">
            Pet owners screen skin concerns from a photo and a few guided questions. Clinics manage
            patients, appointments and veterinary records in one secure workspace.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              className={`${btn} gap-2 border-[#4a2210] bg-[#4a2210] text-[#fff3e0] hover:bg-[#6b3a1f] dark:border-amber-900 dark:bg-amber-800 dark:text-stone-100`}
              href="#download"
              onClick={handleDownloadClick}
            >
              Download the app
              <LandingIcon className="size-4" name="arrow-right" />
            </a>
            <Link
              className={`${btn} border-[#4a2210] text-[#4a2210] hover:bg-[#4a2210]/10 dark:border-stone-300 dark:text-stone-100`}
              to="/login"
            >
              Sign In to your clinic
            </Link>
          </div>

          <ul className="mt-7 flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <li className="rounded-full bg-[#fff3e0] px-3.5 py-1.5 text-[13px] font-medium text-[#6a3a1e] dark:bg-stone-800 dark:text-stone-300" key={c}>
                {c}
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-center gap-2.5 text-sm text-[#6a3a1e] dark:text-stone-400">
            <LandingIcon className="size-5 shrink-0 text-[#8a4b24] dark:text-amber-800" name="check" />
            AI-assisted screening supports, but never replaces, veterinary judgment.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <HeroPhone />
        </Reveal>
      </div>
    </section>
  )
}
