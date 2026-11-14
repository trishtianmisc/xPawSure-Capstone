import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as notificationService from '../../../src/services/notification'

export function useClearNotifications() {
  const queryClient = useQueryClient()

  return useMutation<{ detail: string }, Error, void>({
    mutationFn: notificationService.clearNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] })
    },
  })
}
