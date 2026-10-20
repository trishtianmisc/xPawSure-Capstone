import { useQuery } from '@tanstack/react-query'

import * as vetService from '../../../src/services/vet'
import type { VetAppointmentDetail } from '../types'

export function useVetAppointment(aptId?: string) {
  return useQuery<VetAppointmentDetail>({
    queryKey: ['vet', 'appointment', aptId],
    queryFn: () => vetService.getVetAppointment(aptId as string),
    enabled: !!aptId,
  })
}
