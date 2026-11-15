import type { ReactNode } from 'react'

export type StatCardTone = 'sky' | 'rose' | 'violet' | 'emerald' | 'amber'

// Full class strings so Tailwind can see them.
const TONES: Record<StatCardTone, { container: string; icon: string }> = {
  sky: {
    container: 'bg-sky-100/80 dark:bg-sky-900/25',
    icon: 'bg-white/70 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  },
  rose: {
    container: 'bg-rose-100/80 dark:bg-rose-900/25',
    icon: 'bg-white/70 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  },
  violet: {
    container: 'bg-violet-100/80 dark:bg-violet-900/25',
    icon: 'bg-white/70 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  },
  emerald: {
    container: 'bg-emerald-100/80 dark:bg-emerald-900/25',
    icon: 'bg-white/70 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  amber: {
    container: 'bg-amber-100/80 dark:bg-amber-900/25',
    icon: 'bg-white/70 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
}

interface StatCardProps {
  icon: ReactNode
  label: string
  value: number | string
  trend?: { direction: 'up' | 'down'; value: string }
  hint?: string
  className?: string
  valueClassName?: string
  // Optional tint. Omit it to keep the original white card.
  tone?: StatCardTone
}

export function StatCard({
  icon,
  label,
  value,
  trend,
  hint,
  className = '',
  valueClassName = 'text-4xl',
  tone,
}: StatCardProps) {
  const styles = tone ? TONES[tone] : null

  return (
    <div
      className={`p-6 transition hover:shadow-md ${
        styles
          ? `rounded-3xl ${styles.container}`
          : 'rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800'
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`rounded-xl p-3 ${
            styles
              ? styles.icon
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}
        >
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
      <p className={`mt-4 font-extrabold tracking-tight text-stone-950 dark:text-stone-100 ${valueClassName}`}>
        {value}
      </p>
      <p
        className={`mt-1 text-sm ${
          styles
            ? 'font-medium text-stone-600 dark:text-stone-300'
            : 'text-stone-500 dark:text-stone-400'
        }`}
      >
        {label}
      </p>
      {hint && (
        <p
          className={`mt-0.5 text-xs ${
            styles
              ? 'text-stone-500 dark:text-stone-400'
              : 'text-stone-400 dark:text-stone-500'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

export function StatCardSkeleton({ tone }: { tone?: StatCardTone }) {
  const styles = tone ? TONES[tone] : null
  return (
    <div
      className={`animate-pulse p-6 ${
        styles
          ? `rounded-3xl ${styles.container}`
          : 'rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800'
      }`}
    >
      <div className={`h-12 w-12 rounded-xl ${styles ? 'bg-white/60 dark:bg-stone-700/60' : 'bg-stone-200 dark:bg-stone-700'}`} />
      <div className={`mt-4 h-8 w-20 rounded ${styles ? 'bg-white/60 dark:bg-stone-700/60' : 'bg-stone-200 dark:bg-stone-700'}`} />
      <div className={`mt-2 h-4 w-32 rounded ${styles ? 'bg-white/60 dark:bg-stone-700/60' : 'bg-stone-200 dark:bg-stone-700'}`} />
    </div>
  )
}

export function StatCardError({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
      <p className="text-sm font-medium text-red-700 dark:text-red-400">Failed to load {label}</p>
    </div>
  )
}
