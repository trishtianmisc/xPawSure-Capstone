import { useQuery } from '@tanstack/react-query'
import { listStaff } from '../services/staff.service'

export function useStaff(params?: {
  role?: string
  search?: string
  status?: string
  sort?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['staff', params],
    queryFn: () => listStaff(params),
  })
}
