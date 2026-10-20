import { useQuery } from '@tanstack/react-query'

import * as vetService from '../../../src/services/vet'
import type { VetAppointment } from '../types'

export function useVetAppointment(aptId?: string) {
  return useQuery<VetAppointment>({
    queryKey: ['vet', 'appointment', aptId],
    queryFn: () => vetService.getVetAppointment(aptId as string),
    enabled: !!aptId,
  })
}
