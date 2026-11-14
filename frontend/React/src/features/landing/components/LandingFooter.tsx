import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import { LandingIcon } from './LandingIcon'
import { LANDING_NAV_ITEMS, scrollToSection } from '../landing.utils'

export function LandingFooter() {
  const year = new Date().getFullYear()

  function handleSectionClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault()
    scrollToSection(id)
  }

  return (
    <footer className="border-t border-stone-200 bg-white print:hidden dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.4fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-950/15 shadow-sm dark:bg-stone-300">
                <img alt="" className="size-8 object-contain" src="/xpawsure-logo.png" />
              </span>
              <span className="text-base font-extrabold tracking-tight text-amber-950/90 dark:text-stone-100">
                XPawSure
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-stone-600 dark:text-stone-400">
              Veterinary clinic management with AI-assisted preliminary screening for canine skin
              conditions.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-300">
              <LandingIcon className="size-3.5" name="shield" />
              Screening supports, never replaces, veterinary judgment
            </p>
          </div>

          <nav aria-label="Footer platform links">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
              Platform
            </h2>
            <ul className="mt-4 space-y-2.5">
              {LANDING_NAV_ITEMS.map((item) => (
                <li key={item.id}>
                  <a
                    className="rounded text-sm font-medium text-stone-600 transition hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:text-amber-300"
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
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
              Access
            </h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  className="rounded text-sm font-medium text-stone-600 transition hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:text-amber-300"
                  to="/login"
                >
                  Login
                </Link>
              </li>
              <li>
                <a
                  className="rounded text-sm font-medium text-stone-600 transition hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:text-amber-300"
                  href="mailto:support@xpawsure.com?subject=XPawSure%20clinic%20inquiry"
                >
                  Contact
                </a>
              </li>
              <li>
                <span className="text-sm text-stone-500 dark:text-stone-500">
                  Clinic accounts by invitation
                </span>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
              Contact
            </h2>
            <a
              className="mt-4 inline-flex items-center gap-2 rounded text-sm font-semibold text-stone-700 transition hover:text-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 dark:text-stone-300 dark:hover:text-amber-300"
              href="mailto:support@xpawsure.com?subject=XPawSure%20clinic%20inquiry"
            >
              <LandingIcon className="size-4 text-amber-800 dark:text-amber-400" name="mail" />
              support@xpawsure.com
            </a>
            <p className="mt-3 max-w-xs text-sm leading-6 text-stone-500 dark:text-stone-400">
              Interested clinics are onboarded directly by the XPawSure team. Reach out to discuss
              access for your veterinary clinic.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-stone-200 pt-6 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {year} XPawSure. All rights reserved.</p>
          <p>AI-assisted screening provides preliminary information only and is not a diagnosis.</p>
        </div>
      </div>
    </footer>
  )
}
