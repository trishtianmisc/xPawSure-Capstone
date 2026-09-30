import http from '../../../services/http'
import type { NotificationListResponse } from '../types/receptionist.types'

export async function listNotifications(params: {
  unread_only?: boolean
  page?: number
  page_size?: number
}): Promise<NotificationListResponse> {
  const { data } = await http.get('/notifications/', { params })
  return data
}

export async function getUnreadCount(): Promise<{ unread_count: number }> {
  const { data } = await http.get('/notifications/unread-count/')
  return data
}

export async function markNotificationRead(
  ntfId: string,
): Promise<void> {
  await http.patch(`/notifications/${ntfId}/read/`)
}

export async function markAllNotificationsRead(): Promise<void> {
  await http.patch('/notifications/read-all/')
}
