import { useQuery } from '@tanstack/react-query'
import { listOwners, getOwnerDetail } from '../services/owner.service'

export function useOwners(
  params: {
    search?: string
    page?: number
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['receptionist', 'owners', params],
    queryFn: () => listOwners(params),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  })
}

export function useOwnerDetail(ownerId: string) {
  return useQuery({
    queryKey: ['receptionist', 'owner', ownerId],
    queryFn: () => getOwnerDetail(ownerId),
    enabled: !!ownerId,
  })
}
