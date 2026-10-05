import { useQuery } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { AppointmentListResponse } from '../types'

export function useMyAppointments() {
  return useQuery<AppointmentListResponse>({
    queryKey: ['appointment', 'mine'],
    queryFn: appointmentService.getMyAppointments,
  })
}
