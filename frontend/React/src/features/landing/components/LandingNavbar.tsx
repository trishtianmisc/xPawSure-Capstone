import { useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import { useTheme } from '../../../context/ThemeContext'
import { LandingIcon } from './LandingIcon'
import { LANDING_NAV_ITEMS, scrollToSection } from '../landing.utils'

export function LandingNavbar() {
  const { theme, toggleTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(LANDING_NAV_ITEMS[0].id)

  useEffect(() => {
    function updateActiveSection() {
      let current = LANDING_NAV_ITEMS[0].id
      for (const item of LANDING_NAV_ITEMS) {
        const section = document.getElementById(item.id)
        if (section && section.getBoundingClientRect().top <= 120) {
          current = item.id
        }
      }
      setActiveSection(current)
    }

    function closeMenuOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    updateActiveSection()
    window.addEventListener('scroll', updateActiveSection, { passive: true })
    window.addEventListener('resize', updateActiveSection)
    window.addEventListener('keydown', closeMenuOnEscape)

    return () => {
      window.removeEventListener('scroll', updateActiveSection)
      window.removeEventListener('resize', updateActiveSection)
      window.removeEventListener('keydown', closeMenuOnEscape)
    }
  }, [])

  function handleSectionClick(event: MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault()
    setIsMenuOpen(false)
    scrollToSection(id)
  }

  const navLinkClasses = (isActive: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${
      isActive
        ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'
        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
    }`

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          className="flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-700"
          href="#home"
          onClick={(event) => handleSectionClick(event, 'home')}
        >
          <span className="grid size-9 place-items-center rounded-xl bg-amber-950/15 shadow-sm dark:bg-stone-300">
            <img alt="" className="size-8 object-contain" src="/xpawsure-logo.png" />
          </span>
          <span className="text-base font-extrabold tracking-tight text-amber-950/90 dark:text-stone-100">
            XPawSure
          </span>
        </a>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          {LANDING_NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id
            return (
              <a
                aria-current={isActive ? 'location' : undefined}
                className={navLinkClasses(isActive)}
                href={`#${item.id}`}
                key={item.id}
                onClick={(event) => handleSectionClick(event, item.id)}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            onClick={toggleTheme}
            type="button"
          >
            <LandingIcon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>

          <Link
            className="hidden h-10 items-center justify-center rounded-xl bg-amber-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800 sm:inline-flex"
            to="/login"
          >
            Login
          </Link>

          <button
            aria-controls="landing-mobile-nav"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
            className="grid size-10 place-items-center rounded-lg text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 lg:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            <LandingIcon name={isMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div
          className="animate-slide-in absolute inset-x-0 top-full border-b border-stone-200 bg-white shadow-lg dark:border-stone-800 dark:bg-stone-950 lg:hidden"
          id="landing-mobile-nav"
        >
          <nav aria-label="Mobile navigation" className="mx-auto max-w-6xl space-y-1 px-4 py-4 sm:px-6">
            {LANDING_NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id
              return (
                <a
                  aria-current={isActive ? 'location' : undefined}
                  className={`block ${navLinkClasses(isActive)}`}
                  href={`#${item.id}`}
                  key={item.id}
                  onClick={(event) => handleSectionClick(event, item.id)}
                >
                  {item.label}
                </a>
              )
            })}
            <Link
              className="mt-3 flex h-11 items-center justify-center rounded-xl bg-amber-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-800"
              onClick={() => setIsMenuOpen(false)}
              to="/login"
            >
              Login
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
