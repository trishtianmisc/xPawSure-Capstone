import { useQuery } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { OwnerVet } from '../types'

export function useVets(clinicId: string | undefined, date: string | undefined) {
  return useQuery<OwnerVet[]>({
    queryKey: ['appointment', 'vets', clinicId, date],
    queryFn: () => appointmentService.getOwnerVets(clinicId as string, date as string),
    enabled: !!clinicId && !!date,
  })
}
