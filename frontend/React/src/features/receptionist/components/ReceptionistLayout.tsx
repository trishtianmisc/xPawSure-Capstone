import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'

import { useTheme } from '../../../context/ThemeContext'
import { useAuth } from '../../auth/context/AuthContext'
import { useUnreadCount } from '../hooks/useNotifications'

interface NavItem {
  label: string
  path: string
  icon: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', path: '/receptionist/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Schedule', path: '/receptionist/schedule', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { label: 'Appointments', path: '/receptionist/appointments', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
      { label: 'Pets', path: '/receptionist/pets', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
      { label: 'Owners', path: '/receptionist/owners', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    ],
  },
]

export function ReceptionistLayout() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { data: unreadData } = useUnreadCount()

  function isActive(path: string): boolean {
    if (path === '/receptionist/dashboard') return pathname === path
    return pathname.startsWith(path)
  }

  const breadcrumb = pathname
    .replace('/receptionist/', '')
    .split('/')
    .filter(Boolean)
    .map((s) => {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
        return 'Details'
      }
      return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
    })
    .join(' / ') || 'Dashboard'

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50 dark:bg-stone-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen flex-col border-r border-stone-200 bg-white transition-all duration-200 dark:border-stone-800 dark:bg-stone-900 lg:static lg:translate-x-0 ${isCollapsed ? 'w-20' : 'w-64'
          } ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Branding */}
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-stone-200 px-5 dark:border-stone-800">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-800 to-amber-950 shadow-sm">
            <span className="text-base leading-none" aria-hidden="true">🐾</span>
          </div>
          {!isCollapsed && (
            <span className="text-base font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
              XPawSure
            </span>
          )}
        </div>

        <button
          className="absolute right-3 top-6 z-10 hidden size-6 place-items-center rounded-full border border-stone-200 text-stone-500 shadow-sm transition hover:bg-stone-700 dark:text-stone-700 dark:bg-stone-900 dark:hover:text-stone-200 lg:grid"
          onClick={() => setIsCollapsed((c) => !c)}
          type="button"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" height="16" width="16">
            <path d="M12.7769375 14.284625H2.2230625c-0.8326875 0 -1.5076875 -0.675 -1.5076875 -1.5076875l0 -10.553875c0 -0.8326875 0.675 -1.5076875 1.5076875 -1.5076875h10.553875c0.8326875 0 1.5076875 0.675 1.5076875 1.5076875v10.553875c0 0.8326875 -0.675 1.5076875 -1.5076875 1.5076875Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            <path d="M3.9192500000000003 5.9923125 2.6 7.5l1.3192499999999998 1.5076875" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
            <path d="M5.615375 14.284625V0.7153750000000001" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" />
          </svg>
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-6 last:mb-0">
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400 dark:text-stone-500">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <Link
                      key={item.path}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${active
                        ? 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                      to={item.path}
                      onClick={() => setIsMobileNavOpen(false)}
                    >
                      <svg
                        className={`size-5 shrink-0 ${active
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-stone-400 dark:text-stone-500'
                          }`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      {!isCollapsed && <span>{item.label}</span>}
                      {isCollapsed && (
                        <span className="pointer-events-none absolute left-full z-50 ml-3 -translate-y-0 whitespace-nowrap rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-stone-700">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-stone-200 p-3 dark:border-stone-800">
          <Link
            to="/receptionist/profile"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition hover:bg-stone-100 dark:hover:bg-stone-800 ${isCollapsed ? 'justify-center' : ''}`}
            onClick={() => setIsMobileNavOpen(false)}
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-bold text-white shadow-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user?.email}</p>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
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
            <span className="font-medium text-stone-900 dark:text-stone-200">Receptionist</span>
            <span className="text-stone-300 dark:text-stone-600">/</span>
            <span>{breadcrumb}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Notification bell */}
            <button
              className="relative grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              type="button"
              aria-label="Notifications"
            >
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {(unreadData?.unread_count ?? 0) > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-stone-900">
                  {unreadData!.unread_count > 9 ? '9+' : unreadData!.unread_count}
                </span>
              )}
            </button>

            {/* Theme toggle */}
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

            {/* User avatar + sign out */}
            <div className="hidden items-center gap-3 sm:flex">
              <Link
                to="/receptionist/profile"
                className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-xs font-bold text-white shadow-sm transition hover:ring-2 hover:ring-amber-400/50"
              >
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Link>
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

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
