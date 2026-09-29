import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as notificationService from '../../../src/services/notification'

export function useMarkAllReadNotifications() {
  const queryClient = useQueryClient()

  return useMutation<{ detail: string }, Error, void>({
    mutationFn: notificationService.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] })
    },
  })
}
