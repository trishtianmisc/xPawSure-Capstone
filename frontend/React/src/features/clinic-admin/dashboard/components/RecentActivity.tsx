import type { RecentItem, RecentCategory } from '../types/dashboard.types'
import { formatRelativeTime } from '../../../../utils/format'

interface RecentActivityProps {
  data: RecentItem[]
}

const CATEGORY_META: Record<RecentCategory, { label: string; icon: string }> = {
  staff: { label: 'Staff', icon: '👥' },
  clinic: { label: 'Clinic', icon: '🏥' },
  cancellation: { label: 'Cancellation', icon: '⚠️' },
}

const MAX_ITEMS = 10

export function RecentActivity({ data }: RecentActivityProps) {
  const items = data.slice(0, MAX_ITEMS)

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">Recent Activity</h2>
      {items.length === 0 ? (
        <p className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">No recent administrative activity.</p>
      ) : (
        <div className="space-y-1">
          {items.map((item) => {
            const meta = item.category ? CATEGORY_META[item.category] : null
            return (
              <div key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-stone-50 dark:hover:bg-stone-700/50">
                <div className="flex min-w-0 items-center gap-3">
                  {meta && <span className="shrink-0 text-base" role="img" aria-label={meta.label}>{meta.icon}</span>}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-stone-900 dark:text-stone-100">{item.title}</p>
                    <p className="truncate text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
                  </div>
                </div>
                <span className="shrink-0 pl-3 text-xs text-stone-400 dark:text-stone-500">{formatRelativeTime(item.timestamp)}</span>
              </div>
            )
          })}
        </div>
      )}
      {/* TODO: Add a "View full audit log" link/button below the list once an audit log page or route is planned (none exists today). */}
    </div>
  )
}

export function RecentActivitySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-5 w-36 rounded bg-stone-200 dark:bg-stone-700" />
      <div className="space-y-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-stone-100 dark:bg-stone-700/50" />
        ))}
      </div>
    </div>
  )
}
