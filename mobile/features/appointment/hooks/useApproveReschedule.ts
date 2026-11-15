import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { AppointmentDetail } from '../types'

export function useApproveReschedule() {
  const queryClient = useQueryClient()

  return useMutation<AppointmentDetail, Error, string>({
    mutationFn: (aptId) => appointmentService.approveReschedule(aptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotificationCount'] })
    },
  })
}
