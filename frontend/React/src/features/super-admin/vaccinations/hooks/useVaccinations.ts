import { useQuery } from '@tanstack/react-query'

import { vaccinationService } from '../services/vaccination.service'

import type { VaccinationListParams } from '../types/vaccination.types'

export function useVaccinations(params?: VaccinationListParams) {
  return useQuery({
    queryKey: ['super-admin-vaccinations', params],
    queryFn: () => vaccinationService.list(params),
    staleTime: 30_000,
  })
}
