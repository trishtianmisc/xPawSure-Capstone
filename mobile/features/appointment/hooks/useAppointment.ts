import { useQuery } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { AppointmentDetail } from '../types'

export function useAppointment(aptId: string | undefined) {
  return useQuery<AppointmentDetail>({
    queryKey: ['appointment', 'detail', aptId],
    queryFn: () => appointmentService.getAppointment(aptId as string),
    enabled: !!aptId,
  })
}
