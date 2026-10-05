import { useQuery } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { PrescriptionRecord } from '../../../src/services/records'

export function usePrescriptions(petId?: string) {
  return useQuery<PrescriptionRecord[]>({
    queryKey: ['prescriptions', petId ?? 'all'],
    queryFn: () => recordsService.getPrescriptions(petId),
  })
}
