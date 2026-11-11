import { useEffect, useRef, useState } from 'react'

import { formatRelativeTime } from '../../../utils/format'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '../hooks/useNotifications'

/**
 * Header bell with a working dropdown: recent notifications, per-item
 * mark-as-read, and mark-all. The list only fetches once opened.
 */
export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { data: unreadData } = useUnreadCount()
  const { data, isLoading } = useNotifications(
    { page_size: 10 },
    { enabled: open },
  )
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  useEffect(() => {
    if (!open) return
    function handleMouseDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [open])

  const unreadCount = unreadData?.unread_count ?? 0
  const notifications = data?.results ?? []

  return (
    <div ref={containerRef} className="relative">
      <button
        className="relative grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg className="size-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-amber-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-stone-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-800"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3 dark:border-stone-700">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
                className="text-xs font-semibold text-amber-700 transition hover:underline disabled:opacity-50 dark:text-amber-400"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-700" />
                    <div className="h-3 w-full rounded bg-stone-200 dark:bg-stone-700" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-700">
                {notifications.map((notification) => (
                  <li key={notification.ntf_id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!notification.ntf_is_read) {
                          markRead.mutate(notification.ntf_id)
                        }
                      }}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-stone-700/50 ${
                        notification.ntf_is_read ? '' : 'bg-amber-50/50 dark:bg-amber-900/10'
                      }`}
                    >
                      {!notification.ntf_is_read && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${
                            notification.ntf_is_read
                              ? 'text-stone-600 dark:text-stone-300'
                              : 'font-semibold text-stone-900 dark:text-stone-100'
                          }`}
                        >
                          {notification.ntf_title}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-xs text-stone-500 dark:text-stone-400">
                          {notification.ntf_message}
                        </span>
                        <span className="mt-1 block text-[11px] text-stone-400 dark:text-stone-500">
                          {formatRelativeTime(notification.ntf_created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
