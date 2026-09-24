import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/AuthContext'
import { useTheme } from '../../../context/ThemeContext'
import type { ReactNode } from 'react'

interface ClinicAdminTopBarProps {
  children?: ReactNode
  breadcrumb?: string
}

function deriveBreadcrumb(pathname: string): string {
  const segments = pathname
    .replace('/clinic/', '')
    .split('/')
    .filter(Boolean)
    .map((s) => {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
        return 'Details'
      }
      return s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')
    })
  return segments.join(' / ') || 'Dashboard'
}

export function ClinicAdminTopBar({ children, breadcrumb }: ClinicAdminTopBarProps) {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const displayBreadcrumb = breadcrumb ?? deriveBreadcrumb(pathname)

  return (
    <header className="h-16 shrink-0 border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="hidden items-center gap-2 text-sm text-stone-500 dark:text-stone-400 sm:flex">
          <button
            onClick={() => navigate('/clinic/dashboard')}
            className="font-medium text-stone-900 transition hover:text-stone-700 dark:text-stone-200 dark:hover:text-stone-300"
          >
            Clinic Admin
          </button>
          <span className="text-stone-300 dark:text-stone-600">/</span>
          <span>{displayBreadcrumb}</span>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Notification bell — TODO: wire to clinic-scoped notifications endpoint */}
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
            <button
              onClick={() => navigate('/clinic/profile')}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              type="button"
            >
              Profile
            </button>
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

          {/* Page-specific actions */}
          {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
      </div>
    </header>
  )
}
