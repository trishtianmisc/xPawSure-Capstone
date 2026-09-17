import { useQuery } from '@tanstack/react-query'
import { listStaff } from '../services/staff.service'

export function useStaff(params?: {
  role?: string
  search?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['staff', params],
    queryFn: () => listStaff(params),
  })
}
