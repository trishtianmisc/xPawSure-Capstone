import { useQuery } from '@tanstack/react-query'
import { getStaffStats } from '../services/staff.service'

export function useStaffStats() {
  return useQuery({
    queryKey: ['staff-stats'],
    queryFn: () => getStaffStats(),
  })
}
