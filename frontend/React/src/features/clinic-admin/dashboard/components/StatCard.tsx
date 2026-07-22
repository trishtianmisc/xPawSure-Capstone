import type { ReactNode } from 'react'

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  trend?: { direction: 'up' | 'down'; value: string }
  className?: string
}

export function StatCard({ icon, label, value, trend, className = '' }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-stone-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-stone-700 dark:bg-stone-800 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="rounded-xl bg-amber-50 p-3 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          {icon}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d={trend.direction === 'up' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-stone-950 dark:text-stone-100">
        {value}
      </p>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        {label}
      </p>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800">
      <div className="h-12 w-12 rounded-xl bg-stone-200 dark:bg-stone-700" />
      <div className="mt-4 h-8 w-20 rounded bg-stone-200 dark:bg-stone-700" />
      <div className="mt-2 h-4 w-32 rounded bg-stone-200 dark:bg-stone-700" />
    </div>
  )
}

export function StatCardError({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load {label}</p>
    </div>
  )
}
