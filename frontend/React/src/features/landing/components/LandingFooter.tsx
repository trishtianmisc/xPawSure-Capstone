import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import { DecorCircle, DecorPaw } from './Decor'
import { LandingIcon } from './LandingIcon'
import { Wordmark } from './PawIcon'
import { LANDING_NAV_ITEMS, scrollToSection } from '../landing.utils'

const linkClass =
  'rounded text-sm font-medium text-[#f3d1a3] transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d1a3]'
const headingClass = 'text-sm font-semibold text-[#fff3e0]'

export function LandingFooter() {
  const year = new Date().getFullYear()

  function handleSectionClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault()
    scrollToSection(id)
  }

  return (
    <footer className="relative overflow-hidden bg-[#4a2210] text-[#f3d1a3] print:hidden dark:bg-stone-950">
      <DecorCircle variant="ring" className="-bottom-36 -right-24 size-80 !border-[#6b3a1f]" />
      <DecorPaw className="right-[18%] top-10 size-7 !text-[#d2a97e]" rotate="18deg" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-8 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
          <div>
            <a
              aria-label="Xpawsure home"
              className="inline-flex items-center gap-2.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f3d1a3]"
              href="#home"
              onClick={(event) => handleSectionClick(event, 'home')}
            >
              <span className="grid size-11 place-items-center rounded-full border-[3px] border-[#d2a97e] bg-[#fff3e0]">
                <img alt="" className="size-8 object-contain" src="/xpawsure-logo.png" />
              </span>
              <Wordmark className="text-2xl text-[#fff3e0] [&_svg]:text-[#d2a97e]" />
            </a>
            <p className="mt-5 max-w-xs text-sm leading-6">
              Veterinary clinic management with AI-assisted preliminary screening for canine skin
              conditions.
            </p>
            <p className="mt-3 flex max-w-xs items-start gap-2 text-sm leading-6">
              <LandingIcon className="mt-0.5 size-4 shrink-0 text-[#d2a97e]" name="shield" />
              Screening supports, never replaces, veterinary judgment.
            </p>
          </div>

          <nav aria-label="Footer platform links">
            <h2 className={headingClass}>Platform</h2>
            <ul className="mt-4 space-y-3">
              {LANDING_NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <a
                    className={linkClass}
                    href={`#${item.id}`}
                    onClick={(event) => handleSectionClick(event, item.id)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Footer access links">
            <h2 className={headingClass}>Get started</h2>
            <ul className="mt-4 space-y-3">
              <li>
                <a className={linkClass} href="#download" onClick={(event) => handleSectionClick(event, 'download')}>
                  Download the app
                </a>
              </li>
              <li>
                <Link className={linkClass} to="/login">
                  Login
                </Link>
              </li>
              <li>
                <a className={linkClass} href="mailto:support@xpawsure.com?subject=XPawSure%20clinic%20inquiry">
                  Contact
                </a>
              </li>
              <li>
                <span className="inline-block rounded-full bg-[#6b3a1f] px-3 py-1 text-xs font-medium text-[#f3d1a3]">
                  Clinic accounts by invitation
                </span>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className={headingClass}>Contact</h2>
            <a
              className="mt-4 inline-flex items-center gap-2.5 rounded-full bg-[#fff3e0] px-4 py-2.5 text-sm font-semibold text-[#4a2210] transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d1a3]"
              href="mailto:support@xpawsure.com?subject=XPawSure%20clinic%20inquiry"
            >
              <LandingIcon className="size-4 text-[#8a4b24]" name="mail" />
              support@xpawsure.com
            </a>
            <p className="mt-4 max-w-xs text-sm leading-6">
              Interested clinics are onboarded directly by the XPawSure team. Reach out to discuss
              access for your veterinary clinic.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-[#6b3a1f] pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} XPawSure. All rights reserved.</p>
          <p>AI-assisted screening provides preliminary information only and is not a diagnosis.</p>
        </div>
      </div>
    </footer>
  )
}
