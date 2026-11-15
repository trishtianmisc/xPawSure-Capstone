import { useQuery } from '@tanstack/react-query'

import {
  getVetReportAppointments,
  getVetReportSummary,
} from '../services/analytics.service'
import type { VetAnalyticsQuery } from '../types/analytics.types'

const analyticsKey = (endpoint: string, params: VetAnalyticsQuery) =>
  ['veterinarian', 'analytics', endpoint, params] as const

export function useVetReportSummary(params: VetAnalyticsQuery) {
  return useQuery({
    queryKey: analyticsKey('summary', params),
    queryFn: () => getVetReportSummary(params),
    staleTime: 60_000,
  })
}

export function useVetReportAppointments(params: VetAnalyticsQuery) {
  return useQuery({
    queryKey: analyticsKey('appointments', params),
    queryFn: () => getVetReportAppointments(params),
    staleTime: 60_000,
  })
}
