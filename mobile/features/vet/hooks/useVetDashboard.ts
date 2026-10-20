import { useQuery } from '@tanstack/react-query'

import * as vetService from '../../../src/services/vet'
import type { VetDashboardData } from '../types'

export function useVetDashboard(date?: string) {
  return useQuery<VetDashboardData>({
    queryKey: ['vet', 'dashboard', date ?? 'today'],
    queryFn: () => vetService.getVetDashboard(date),
  })
}
