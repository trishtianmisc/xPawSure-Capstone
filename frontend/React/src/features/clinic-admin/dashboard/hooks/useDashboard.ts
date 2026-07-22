import { useQuery } from '@tanstack/react-query'

import { dashboardService } from '../services/dashboard.service'

export function useDashboard() {
  return useQuery({
    queryKey: ['clinic-admin', 'dashboard'],
    queryFn: () => dashboardService.get(),
    staleTime: 30_000,
  })
}
