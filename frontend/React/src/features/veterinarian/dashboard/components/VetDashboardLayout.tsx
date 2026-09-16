import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

import { useTheme } from '../../../../context/ThemeContext'
import { useAuth } from '../../../auth/context/AuthContext'

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', path: '/veterinarian/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { label: 'Consultations', path: '/veterinarian/consultations', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { label: 'Schedule', path: '/veterinarian/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', path: '/veterinarian/profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
      { label: 'Settings', path: '/veterinarian/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ],
  },
]

export function VetDashboardLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const vetName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
    : 'Vet'

  function isActive(path: string): boolean {
    if (path === '/veterinarian/dashboard') return pathname === path
    return pathname.startsWith(path) && path !== '/veterinarian/dashboard'
  }

  const breadcrumb = pathname
    .replace('/veterinarian/', '')
    .split('/')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' / ') || 'Dashboard'

  return (
    <div className="flex min-h-screen bg-stone-50 dark:bg-stone-950">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white transition-transform dark:border-stone-800 dark:bg-stone-900 lg:static lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-stone-200 px-5 dark:border-stone-800">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-800 to-amber-950 shadow-sm">
            <span className="text-base leading-none" aria-hidden="true">
              🐾
            </span>
          </div>
          <span className="text-base font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            XPawSure
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-6 last:mb-0">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                        active
                          ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
                      }`}
                      to={item.path}
                      onClick={() => setIsMobileNavOpen(false)}
                    >
                      <svg
                        className={`size-5 shrink-0 ${active ? 'text-amber-700 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-stone-200 p-3 dark:border-stone-800">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-bold text-white shadow-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 sm:px-6">
          <button
            className="grid size-10 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 lg:hidden"
            onClick={() => setIsMobileNavOpen((open) => !open)}
            type="button"
            aria-label="Toggle navigation"
          >
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden items-center gap-2 text-sm text-stone-500 dark:text-stone-400 sm:flex">
            <span className="font-medium text-stone-900 dark:text-stone-200">Veterinarian</span>
            <span className="text-stone-300 dark:text-stone-600">/</span>
            <span>{breadcrumb}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              className="relative grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              type="button"
              aria-label="Notifications"
            >
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-600 ring-2 ring-white dark:ring-stone-900" />
            </button>

            <button
              className="grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              onClick={toggleTheme}
              type="button"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-xs font-bold text-white shadow-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <button
                className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                onClick={logout}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-9">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
