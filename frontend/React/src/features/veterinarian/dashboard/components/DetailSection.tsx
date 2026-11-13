import type { ReactNode } from 'react'

export function DetailSection({
  action,
  children,
  title,
}: {
  action?: ReactNode
  children: ReactNode
  title: string
}) {
  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          {title}
        </h2>
        {action}
      </div>
      <div className="divide-y divide-stone-200 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm dark:divide-stone-700 dark:border-stone-700 dark:bg-stone-800">
        {children}
      </div>
    </section>
  )
}

export function DetailRowGroup({ children }: { children: ReactNode }) {
  return (
    <div className="grid divide-y divide-stone-200 sm:grid-cols-2 sm:divide-y-0 dark:divide-stone-700">
      {children}
    </div>
  )
}

export function DetailCell({
  className = '',
  divider = false,
  label,
  value,
}: {
  className?: string
  divider?: boolean
  label: string
  value: ReactNode
}) {
  return (
    <div
      className={`min-w-0 p-4 ${
        divider ? 'border-stone-200 sm:border-r dark:border-stone-700' : ''
      } ${className}`}
    >
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-stone-900 dark:text-stone-100">
        {value}
      </p>
    </div>
  )
}
