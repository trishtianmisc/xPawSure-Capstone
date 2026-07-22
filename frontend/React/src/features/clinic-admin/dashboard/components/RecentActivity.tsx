import type { RecentActivity as RecentActivityType } from '../types/dashboard.types'

interface RecentActivityProps {
  data: RecentActivityType
}

const sections: { key: keyof RecentActivityType; label: string; icon: string }[] = [
  { key: 'pets', label: 'New Pets', icon: '🐾' },
  { key: 'appointments', label: 'Appointments', icon: '📅' },
  { key: 'screenings', label: 'AI Screenings', icon: '🔬' },
  { key: 'consultations', label: 'Consultations', icon: '🩺' },
]

export function RecentActivity({ data }: RecentActivityProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">Recent Activity</h2>
      <div className="space-y-4">
        {sections.map((section) => {
          const items = data[section.key]
          return (
            <div key={section.key}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-stone-600 dark:text-stone-400">
                <span className="text-base" role="img">{section.icon}</span>
                {section.label}
              </div>
              {items.length === 0 ? (
                <p className="px-3 py-2 text-sm text-stone-400 dark:text-stone-500">No recent {section.label.toLowerCase()}.</p>
              ) : (
                <div className="space-y-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-stone-50 dark:hover:bg-stone-700/50">
                      <div>
                        <p className="font-medium text-stone-900 dark:text-stone-100">{item.title}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">{item.subtitle}</p>
                      </div>
                      <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">{item.timestamp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RecentActivitySkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 rounded bg-stone-200 dark:bg-stone-700" />
          <div className="space-y-1">
            <div className="h-12 rounded-lg bg-stone-100 dark:bg-stone-700/50" />
            <div className="h-12 rounded-lg bg-stone-100 dark:bg-stone-700/50" />
          </div>
        </div>
      ))}
    </div>
  )
}
