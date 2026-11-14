import { Link } from 'react-router-dom'

import { LandingIcon } from './LandingIcon'
import { Reveal } from './Reveal'

export function CallToActionSection() {
  return (
    <section
      className="scroll-mt-20 bg-stone-50 py-20 dark:bg-stone-950 sm:py-24"
      id="contact"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-[#f4d0a5] px-6 py-12 shadow-sm sm:px-10 sm:py-14 lg:px-14">
            <div
              aria-hidden="true"
              className="absolute -right-10 -top-10 size-40 rounded-full bg-amber-950/10"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-16 -left-10 size-48 rounded-full border-[1.5rem] border-amber-950/10"
            />

            <div className="relative grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-900/75">
                  Get started
                </p>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-amber-950 sm:text-4xl">
                  Better Clinic Management Starts Here.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-amber-950/75">
                  Discover a smarter way to manage veterinary clinic operations with XPawSure.
                </p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-amber-950/65">
                  Clinic accounts are provisioned by the XPawSure team. Contact us to discuss
                  access for your veterinary clinic.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <Link
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
                  to="/login"
                >
                  Get Started
                  <LandingIcon className="size-4" name="arrow-right" />
                </Link>
                <a
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-amber-950/25 bg-white/40 px-6 text-sm font-semibold text-amber-950 shadow-sm transition hover:bg-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
                  href="mailto:support@xpawsure.com?subject=XPawSure%20clinic%20inquiry"
                >
                  Contact Us
                </a>
              </div>
            </div>

            <a
              className="relative mt-8 inline-flex items-center gap-2 rounded text-sm font-semibold text-amber-950/80 transition hover:text-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950"
              href="mailto:support@xpawsure.com?subject=XPawSure%20clinic%20inquiry"
            >
              <LandingIcon className="size-4" name="mail" />
              support@xpawsure.com
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
