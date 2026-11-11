import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ownerService } from '../services/owner.service'

import type { OwnerListParams, UpdateOwnerContactPayload } from '../types/owner.types'

export function useOwners(params?: OwnerListParams) {
  return useQuery({
    queryKey: ['super-admin-owners', params],
    queryFn: () => ownerService.list(params),
    staleTime: 30_000,
  })
}

export function useOwner(ownerId: string | null) {
  return useQuery({
    queryKey: ['super-admin-owner', ownerId],
    queryFn: () => ownerService.get(ownerId as string),
    enabled: Boolean(ownerId),
    staleTime: 30_000,
  })
}

export function useUpdateOwnerContact(ownerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateOwnerContactPayload) => ownerService.updateContact(ownerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin-owners'] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-owner', ownerId] })
      queryClient.invalidateQueries({ queryKey: ['super-admin-clinic-owners'] })
    },
  })
}
