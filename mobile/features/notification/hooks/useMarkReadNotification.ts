import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as notificationService from '../../../src/services/notification'
import type { OwnerNotification } from '../types'

export function useMarkReadNotification() {
  const queryClient = useQueryClient()

  return useMutation<OwnerNotification, Error, string>({
    mutationFn: (ntfId) => notificationService.markNotificationRead(ntfId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] })
    },
  })
}
