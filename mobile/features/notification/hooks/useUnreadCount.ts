import { useQuery } from '@tanstack/react-query'

import * as notificationService from '../../../src/services/notification'

export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: ['unreadNotificationCount'],
    queryFn: notificationService.getUnreadNotificationCount,
    enabled,
    refetchInterval: 60_000,
  })
}
