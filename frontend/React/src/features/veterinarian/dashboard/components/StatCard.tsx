interface StatCardProps {
  label: string
  value: number
  icon?: React.ReactNode
  subtitle?: string
}

export function StatCard({ label, value, icon, subtitle }: StatCardProps) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
            <div className="size-6 text-amber-700 dark:text-amber-400">
              {icon}
            </div>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</p>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
          {subtitle && (
            <p className="text-xs font-medium text-stone-400 dark:text-stone-500">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex animate-pulse items-center gap-4">
        <div className="size-12 shrink-0 rounded-xl bg-stone-200 dark:bg-stone-700" />
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="h-6 w-12 rounded bg-stone-200 dark:bg-stone-700" />
        </div>
      </div>
    </div>
  )
}
