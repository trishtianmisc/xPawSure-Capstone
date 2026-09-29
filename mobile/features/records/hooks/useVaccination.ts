import { useQuery } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { VaccinationRecordItem } from '../../../src/services/records'

export function useVaccination(id: string | undefined) {
  return useQuery<VaccinationRecordItem>({
    queryKey: ['vaccination', id],
    queryFn: () => recordsService.getVaccination(id!),
    enabled: !!id,
  })
}
