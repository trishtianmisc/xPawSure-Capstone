import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../../notifications/services/notification.service'

const QUERY_KEY = ['veterinarian', 'notifications']

export function useVetNotifications(params: {
  unread_only?: boolean
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: [...QUERY_KEY, params],
    queryFn: () => listNotifications(params),
    staleTime: 15_000,
  })
}

export function useVetUnreadCount() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useMarkVetNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useMarkAllVetNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
