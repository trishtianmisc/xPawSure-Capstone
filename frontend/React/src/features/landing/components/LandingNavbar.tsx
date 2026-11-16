import { useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'

import { useTheme } from '../../../context/ThemeContext'
import { LandingIcon } from './LandingIcon'
import { Wordmark } from './PawIcon'
import { LANDING_NAV_ITEMS, scrollToSection } from '../landing.utils'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a4b24]'

export function LandingNavbar() {
  const { theme, toggleTheme } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(LANDING_NAV_ITEMS[0].id)

  useEffect(() => {
    function updateActiveSection() {
      let current = LANDING_NAV_ITEMS[0].id
      for (const item of LANDING_NAV_ITEMS) {
        const section = document.getElementById(item.id)
        if (section && section.getBoundingClientRect().top <= 120) current = item.id
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
    `rounded-full px-4 py-2 text-[15px] font-medium transition ${focusRing} ${
      isActive
        ? 'bg-[#a0522d] text-[#fff3e0] dark:bg-amber-700/50 dark:text-amber-200'
        : 'text-[#4a2210] hover:text-[#a0522d] dark:text-stone-300 dark:hover:text-amber-100'
    }`

  const outlineBtn = `inline-flex h-11 items-center justify-center rounded-full border-2 border-[#4a2210] px-5 text-sm font-semibold text-[#4a2210] transition hover:-translate-y-0.5 hover:bg-[#4a2210]/10 dark:border-stone-300 dark:text-stone-100 dark:hover:bg-stone-100/10 ${focusRing}`
  const solidBtn = `inline-flex h-11 items-center justify-center rounded-full border-2 border-[#4a2210] bg-[#4a2210] px-5 text-sm font-semibold text-[#fff3e0] transition hover:-translate-y-0.5 hover:bg-[#6b3a1f] dark:border-amber-900 dark:bg-amber-800 dark:text-stone-100 dark:hover:bg-amber-600 ${focusRing}`

  return (
    <header className="sticky top-0 z-50 bg-[#f3d1a3]/90 backdrop-blur dark:bg-stone-950/90">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          aria-label="Xpawsure home"
          className={`flex shrink-0 items-center gap-2.5 rounded-full ${focusRing}`}
          href="#home"
          onClick={(event) => handleSectionClick(event, 'home')}
        >
          <span className="grid size-11 place-items-center rounded-full border-[3px] border-[#d2a97e] bg-[#fff3e0] dark:border-stone-600 dark:bg-stone-200">
            <img alt="" className="size-8 object-contain" src="/xpawsure-logo.png" />
          </span>
          <Wordmark className="text-[26px] text-[#4a2210] dark:text-stone-100" />
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
            className={`grid size-10 place-items-center rounded-full text-[#6a3a1e] transition hover:bg-[#4a2210]/10 dark:text-stone-400 dark:hover:bg-stone-800 ${focusRing}`}
            onClick={toggleTheme}
            type="button"
          >
            <LandingIcon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <Link className={`hidden sm:inline-flex ${outlineBtn}`} to="/login">
            Sign In
          </Link>
          <a
            className={`hidden sm:inline-flex ${solidBtn}`}
            href="#download"
            onClick={(event) => handleSectionClick(event, 'download')}
          >
            Download app
          </a>
          <button
            aria-controls="landing-mobile-nav"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close navigation' : 'Open navigation'}
            className={`grid size-10 place-items-center rounded-full text-[#4a2210] transition hover:bg-[#4a2210]/10 dark:text-stone-300 dark:hover:bg-stone-800 lg:hidden ${focusRing}`}
            onClick={() => setIsMenuOpen((open) => !open)}
            type="button"
          >
            <LandingIcon name={isMenuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <div
          className="animate-slide-in absolute inset-x-0 top-full rounded-b-3xl bg-[#fff3e0] shadow-lg dark:bg-stone-900 lg:hidden"
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
            <div className="grid gap-2 pt-3 sm:hidden">
              <Link className={outlineBtn} onClick={() => setIsMenuOpen(false)} to="/login">
                Clinic login
              </Link>
              <a className={solidBtn} href="#download" onClick={(event) => handleSectionClick(event, 'download')}>
                Download app
              </a>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
