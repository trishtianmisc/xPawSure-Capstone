import { useQuery } from '@tanstack/react-query'

import { analyticsService } from '../services/analytics.service'

export function usePlatformAnalytics() {
  return useQuery({
    queryKey: ['super-admin-analytics'],
    queryFn: analyticsService.getOverview,
    staleTime: 30_000,
  })
}
