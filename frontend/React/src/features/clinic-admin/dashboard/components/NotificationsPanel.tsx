import type { NotificationItem } from '../types/dashboard.types'

const typeIcons: Record<string, string> = {
  APPOINTMENT_CREATED: '📅',
  APPOINTMENT_CONFIRMED: '✅',
  APPOINTMENT_CANCELLED: '❌',
  APPOINTMENT_REMINDER: '⏰',
  AI_SCREENING_COMPLETED: '🔬',
  AI_SCREENING_REVIEWED: '📋',
  VACCINATION_REMINDER: '💉',
  CONSULTATION_AVAILABLE: '🩺',
}

interface NotificationsPanelProps {
  notifications: NotificationItem[]
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-stone-900 dark:text-stone-100">Notifications</h2>
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-800">
          <p className="text-sm text-stone-500 dark:text-stone-400">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-4 transition hover:shadow-sm ${
                n.is_read
                  ? 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800'
                  : 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20'
              }`}
            >
              <span className="mt-0.5 text-lg" role="img">{typeIcons[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-semibold ${n.is_read ? 'text-stone-700 dark:text-stone-300' : 'text-stone-900 dark:text-stone-100'}`}>
                    {n.title}
                  </p>
                  {!n.is_read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400 line-clamp-2">
                  {n.message}
                </p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">{n.created_at}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function NotificationsSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-xl bg-stone-100 dark:bg-stone-700/50" />
      ))}
    </div>
  )
}
