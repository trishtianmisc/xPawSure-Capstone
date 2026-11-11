import { useQuery } from '@tanstack/react-query'

import {
  dashboardService,
  getClinicDashboardStats,
  getScreeningStats,
  type ScreeningStatsQuery,
} from '../services/dashboard.service'

export function useDashboard() {
  return useQuery({
    queryKey: ['clinic-admin', 'dashboard'],
    queryFn: () => dashboardService.get(),
    staleTime: 30_000,
  })
}

export function useClinicDashboardStats() {
  return useQuery({
    queryKey: ['clinic-admin', 'dashboard', 'stats'],
    queryFn: getClinicDashboardStats,
    staleTime: 30_000,
  })
}

export function useScreeningStats(params: ScreeningStatsQuery = {}) {
  return useQuery({
    queryKey: ['clinic-admin', 'dashboard', 'screenings', params],
    queryFn: () => getScreeningStats(params),
    staleTime: 30_000,
  })
}
