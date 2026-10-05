import { useQuery } from '@tanstack/react-query'
import { listOwners, getOwnerDetail } from '../services/owner.service'

export function useOwners(params: {
  search?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['receptionist', 'owners', params],
    queryFn: () => listOwners(params),
    staleTime: 30_000,
  })
}

export function useOwnerDetail(ownerId: string) {
  return useQuery({
    queryKey: ['receptionist', 'owner', ownerId],
    queryFn: () => getOwnerDetail(ownerId),
    enabled: !!ownerId,
  })
}
