import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '../../../auth/context/AuthContext'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', path: '/super-admin/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
      { label: 'Clinics', path: '/super-admin/clinics', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      { label: 'Admins', path: '/super-admin/admins', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', path: '/super-admin/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ],
  },
]

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  function isActive(path: string): boolean {
    if (path === '/super-admin/dashboard') return pathname === path
    return pathname.startsWith(path)
  }

  const breadcrumb = pathname
    .replace('/super-admin/', '')
    .split('/')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' / ') || 'Dashboard'

  return (
    <div className="flex min-h-screen bg-stone-50">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-stone-200 bg-white transition-transform lg:static lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-stone-200 px-5">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-800 to-amber-950 shadow-sm">
            <span className="text-base leading-none" aria-hidden="true">
              🐾
            </span>
          </div>
          <span className="text-base font-extrabold tracking-tight text-stone-900">
            XPawSure
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-6 last:mb-0">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-stone-400">
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
                          ? 'bg-amber-50 text-amber-900'
                          : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                      }`}
                      to={item.path}
                      onClick={() => setIsMobileNavOpen(false)}
                    >
                      <svg
                        className={`size-5 shrink-0 ${active ? 'text-amber-700' : 'text-stone-400'}`}
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

        <div className="border-t border-stone-200 p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-sm font-bold text-white shadow-sm">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="truncate text-xs text-stone-500">{user?.email}</p>
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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 bg-white px-4 sm:px-6">
          <button
            className="grid size-10 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-amber-700 lg:hidden"
            onClick={() => setIsMobileNavOpen((open) => !open)}
            type="button"
            aria-label="Toggle navigation"
          >
            <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden items-center gap-2 text-sm text-stone-500 sm:flex">
            <span className="font-medium text-stone-900">Super Admin</span>
            <span className="text-stone-300">/</span>
            <span>{breadcrumb}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              className="relative grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-amber-700"
              type="button"
              aria-label="Notifications"
            >
              <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-2 top-2 size-2 rounded-full bg-amber-600 ring-2 ring-white" />
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800 text-xs font-bold text-white shadow-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <button
                className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-amber-700"
                onClick={logout}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-7 lg:p-9">
          {children}
        </main>
      </div>
    </div>
  )
}
