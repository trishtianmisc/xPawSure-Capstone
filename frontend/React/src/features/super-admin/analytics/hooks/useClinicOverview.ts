import { useQuery } from '@tanstack/react-query'

import { analyticsService } from '../services/analytics.service'

export function useClinicOverview(clinicId?: string) {
  return useQuery({
    queryKey: ['super-admin-clinic-overview', clinicId],
    queryFn: () => analyticsService.getClinicOverview(clinicId!),
    enabled: Boolean(clinicId),
    staleTime: 30_000,
  })
}
