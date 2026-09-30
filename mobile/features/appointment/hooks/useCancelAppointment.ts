import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { AppointmentDetail } from '../types'

export function useCancelAppointment() {
  const queryClient = useQueryClient()

  return useMutation<AppointmentDetail, Error, { aptId: string; reason?: string }>({
    mutationFn: ({ aptId, reason }) => appointmentService.cancelAppointment(aptId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment'] })
    },
  })
}
