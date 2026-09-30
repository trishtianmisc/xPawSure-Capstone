import { useQuery } from '@tanstack/react-query'

import * as notificationService from '../../../src/services/notification'

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.getNotifications,
  })
}
