import { useQuery } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { ConsultationRecord } from '../../../src/services/records'

export function useConsultation(id: string | undefined) {
  return useQuery<ConsultationRecord>({
    queryKey: ['consultation', id],
    queryFn: () => recordsService.getConsultation(id!),
    enabled: !!id,
  })
}
