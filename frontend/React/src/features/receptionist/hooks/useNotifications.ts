import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notification.service'

export function useNotifications(params: {
  unread_only?: boolean
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['receptionist', 'notifications', params],
    queryFn: () => listNotifications(params),
    staleTime: 15_000,
  })
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['receptionist', 'notifications', 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 15_000,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'notifications'] })
    },
  })
}
