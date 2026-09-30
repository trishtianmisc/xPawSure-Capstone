import type { NotificationListResponse, OwnerNotification } from '../../features/notification/types'
import { http } from './http'

export async function getNotifications(): Promise<NotificationListResponse> {
  const { data } = await http.get('/notifications/', { params: { page_size: 100 } })
  return data
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data } = await http.get('/notifications/unread-count/')
  return data.unread_count
}

export async function markNotificationRead(ntfId: string): Promise<OwnerNotification> {
  const { data } = await http.patch(`/notifications/${ntfId}/read/`)
  return data
}

export async function markAllNotificationsRead(): Promise<{ detail: string }> {
  const { data } = await http.patch('/notifications/read-all/')
  return data
}
