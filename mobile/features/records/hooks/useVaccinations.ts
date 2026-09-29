import { useQuery } from '@tanstack/react-query'

import * as recordsService from '../../../src/services/records'
import type { VaccinationRecordItem } from '../../../src/services/records'

export function useVaccinations(petId?: string, enabled = true) {
  return useQuery<VaccinationRecordItem[]>({
    queryKey: ['vaccinations', petId ?? 'all'],
    queryFn: () => recordsService.getVaccinations(petId),
    enabled,
  })
}
