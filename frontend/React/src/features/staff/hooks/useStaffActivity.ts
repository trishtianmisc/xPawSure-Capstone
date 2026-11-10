import { useQuery } from '@tanstack/react-query'
import { getStaffActivity } from '../services/staff.service'

export function useStaffActivity(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['staff', id, 'activity'],
    queryFn: () => getStaffActivity(id!),
    enabled: !!id && enabled,
  })
}
