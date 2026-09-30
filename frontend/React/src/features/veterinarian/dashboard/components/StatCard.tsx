interface StatCardProps {
  label: string
  value: number
  icon?: React.ReactNode
  subtitle?: string
  accent?: string
  iconBg?: string
  iconColor?: string
}

export function StatCard({ label, value, icon, subtitle, accent = 'from-amber-500 to-amber-700', iconBg = 'bg-amber-100', iconColor = 'text-amber-700' }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-md border border-stone-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-stone-700 dark:bg-stone-800">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            {label}
          </p>
          <p className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            {value}
          </p>
        </div>
        {icon && (
          <div className={`grid size-11 shrink-0 place-items-center rounded-md ${iconBg} dark:opacity-80`}>
            <div className={`size-5 ${iconColor}`}>
              {icon}
            </div>
          </div>
        )}
      </div>
      {subtitle && (
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">{subtitle}</p>
      )}
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accent} scale-x-0 transition-transform group-hover:scale-x-100`} />
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="animate-pulse rounded-md border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-800">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="h-8 w-12 rounded bg-stone-200 dark:bg-stone-700" />
        </div>
        <div className="size-11 rounded-md bg-stone-200 dark:bg-stone-700" />
      </div>
      <div className="mt-3 h-3 w-32 rounded bg-stone-200 dark:bg-stone-700" />
    </div>
  )
}
