import { useQuery } from '@tanstack/react-query'

import { dashboardService } from '../services/dashboard.service'

export function useDashboard() {
  return useQuery({
    queryKey: ['veterinarian', 'dashboard'],
    queryFn: () => dashboardService.get(),
    staleTime: 30_000,
  })
}
