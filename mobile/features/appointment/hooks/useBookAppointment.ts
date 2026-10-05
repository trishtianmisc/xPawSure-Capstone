import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { AppointmentDetail, BookAppointmentPayload } from '../types'

export function useBookAppointment() {
  const queryClient = useQueryClient()

  return useMutation<AppointmentDetail, Error, BookAppointmentPayload>({
    mutationFn: appointmentService.bookAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointment'] })
    },
  })
}
