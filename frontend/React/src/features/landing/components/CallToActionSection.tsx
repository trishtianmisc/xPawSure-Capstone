import { Link } from 'react-router-dom'

import { DecorCircle } from './Decor'
import { LandingIcon } from './LandingIcon'
import { PawIcon } from './PawIcon'
import { Reveal } from './Reveal'
import { APP_LINKS } from '../landing.utils'

const focusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2'
const pill = `inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 px-6 text-sm font-semibold transition hover:-translate-y-0.5 ${focusRing}`

export function CallToActionSection() {
  return (
    <section
      className="relative scroll-mt-20 overflow-x-clip bg-[#8a4b24] py-20 dark:bg-stone-900 sm:py-24"
      id="contact"
    >
      {/* The hero and navbar "Download" buttons scroll to this id */}
      <div className="mx-auto max-w-6xl scroll-mt-24 px-4 sm:px-6 lg:px-8" id="download">
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Pet owners */}
            <div className="relative overflow-hidden rounded-[2.25rem] bg-[#d2a97e] p-8 text-[#4a2210] sm:p-11 dark:bg-stone-800 dark:text-stone-100">
              <DecorCircle variant="ring-light" className="-bottom-24 -right-20 size-72 dark:!border-stone-700" />
              <div className="relative z-10">
                <p className="text-[13px] font-semibold uppercase tracking-[0.22em]">For pet owners</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">Get the XPawsure mobile app</h2>
                <p className="mt-3 max-w-md text-base leading-7">
                  Screen skin concerns from home and share the result with your veterinarian.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a
                    className={`${pill} border-[#4a2210] bg-[#4a2210] text-[#fff3e0] hover:bg-[#6b3a1f] focus-visible:outline-[#4a2210] dark:border-amber-300 dark:bg-amber-300 dark:text-stone-950`}
                    href={APP_LINKS.googlePlay}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Link to App
                  </a>
                </div>
                <div aria-hidden="true" className="mt-9 flex items-end gap-4">
                  <PawIcon className="landing-float size-14 text-[#4a2210] dark:text-amber-400" />
                  <PawIcon className="landing-float size-9 text-[#8a4b24] [animation-delay:1s]" />
                  <PawIcon className="landing-float size-11 text-[#6b3a1f] [animation-delay:2s] dark:text-amber-300" />
                </div>
              </div>
            </div>

            {/* Clinics */}
            <div className="relative overflow-hidden rounded-[2.25rem] bg-[#4a2210] p-8 text-[#fff3e0] sm:p-11 dark:bg-stone-950 dark:ring-1 dark:ring-stone-800">
              <DecorCircle variant="brown" className="-right-16 -top-20 size-64 !bg-[#6b3a1f]" />
              <div className="relative z-10">
                <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#e9bf8c]">
                  For clinic personnel
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight">Your clinic workspace</h2>
                <p className="mt-3 max-w-md text-base leading-7">
                  Securely manage patients and veterinary records in one place. Clinic accounts are
                  provisioned by the XPawSure team.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    className={`${pill} border-[#fff3e0] bg-[#fff3e0] text-[#4a2210] focus-visible:outline-[#fff3e0]`}
                    to="/login"
                  >
                    Log in
                    <LandingIcon className="size-4" name="arrow-right" />
                  </Link>
                 
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
