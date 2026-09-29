import { useQuery } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { PrescriptionRecord } from '../../../src/services/records'

export function usePrescription(id: string | undefined) {
  return useQuery<PrescriptionRecord>({
    queryKey: ['prescription', id],
    queryFn: () => recordsService.getPrescription(id!),
    enabled: !!id,
  })
}
