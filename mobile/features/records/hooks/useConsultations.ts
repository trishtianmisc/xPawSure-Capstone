import { useQuery } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { ConsultationRecord } from '../../../src/services/records'

export function useConsultations(petId?: string, enabled = true) {
  return useQuery<ConsultationRecord[]>({
    queryKey: ['consultations', petId ?? 'all'],
    queryFn: () => recordsService.getConsultations(petId),
    enabled,
  })
}
