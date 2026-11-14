import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { formatDateTime } from '../../../../utils/format'
import type { Notification } from '../../../notifications/types/notification.types'
import {
  useMarkAllVetNotificationsRead,
  useMarkVetNotificationRead,
  useVetNotifications,
  useVetUnreadCount,
} from '../hooks/useVetNotifications'

export function VetNotificationsMenu() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const { data: unreadData } = useVetUnreadCount()
  const { data, isLoading, isError, refetch } = useVetNotifications({ page_size: 8 })
  const markRead = useMarkVetNotificationRead()
  const markAllRead = useMarkAllVetNotificationsRead()

  const unreadCount = unreadData?.unread_count ?? 0
  const notifications = data?.results ?? []

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function toggleOpen() {
    if (!isOpen) void refetch()
    setIsOpen((open) => !open)
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.ntf_is_read) {
      markRead.mutate(notification.ntf_id)
    }
    if (
      notification.ntf_reference_table === 'APPOINTMENT' &&
      notification.ntf_reference_id
    ) {
      navigate(`/veterinarian/appointments/${notification.ntf_reference_id}`)
    }
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Notifications"
        className="relative grid size-9 place-items-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-amber-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
        onClick={toggleOpen}
        type="button"
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

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl dark:border-stone-700 dark:bg-stone-900">
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-700">
            <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                className="text-xs font-semibold text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400"
                disabled={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                Loading notifications...
              </p>
            ) : isError ? (
              <p className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                Unable to load notifications.
              </p>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <button
                  key={notification.ntf_id}
                  className={`flex w-full items-start gap-3 border-b border-stone-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-amber-50/70 dark:border-stone-800 dark:hover:bg-amber-900/10 ${
                    notification.ntf_is_read ? '' : 'bg-amber-50/40 dark:bg-amber-900/10'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  type="button"
                >
                  <span
                    className={`mt-1 size-2 shrink-0 rounded-full ${
                      notification.ntf_is_read
                        ? 'bg-transparent'
                        : 'bg-amber-600 dark:bg-amber-400'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm text-stone-900 dark:text-stone-100 ${
                        notification.ntf_is_read ? 'font-medium' : 'font-bold'
                      }`}
                    >
                      {notification.ntf_title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-stone-500 dark:text-stone-400">
                      {notification.ntf_message}
                    </span>
                    <span className="mt-1 block text-[11px] font-medium text-stone-400 dark:text-stone-500">
                      {formatDateTime(notification.ntf_created_at)}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-stone-500 dark:text-stone-400">
                You&apos;re all caught up.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
