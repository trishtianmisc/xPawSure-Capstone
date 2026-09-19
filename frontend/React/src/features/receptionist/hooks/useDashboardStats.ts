import { useQuery } from '@tanstack/react-query'
import { getDashboardStats } from '../services/dashboard.service'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['receptionist', 'dashboard'],
    queryFn: getDashboardStats,
    staleTime: 30_000,
  })
}
