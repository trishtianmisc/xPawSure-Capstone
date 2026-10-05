import { useQuery } from '@tanstack/react-query'
import { getStaffDetail } from '../services/staff.service'

export function useStaffDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['staff', id],
    queryFn: () => getStaffDetail(id!),
    enabled: !!id,
  })
}
