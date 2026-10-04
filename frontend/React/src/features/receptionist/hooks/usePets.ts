import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listPets, getPetDetail, getPetHistory, createPet, updatePet } from '../services/pet.service'

export function usePets(
  params: {
    search?: string
    owner_id?: string
    scope?: string
    page?: number
    page_size?: number
  },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['receptionist', 'pets', params],
    queryFn: () => listPets(params),
    staleTime: 30_000,
    enabled: options?.enabled ?? true,
  })
}

export function usePetDetail(petId: string) {
  return useQuery({
    queryKey: ['receptionist', 'pet', petId],
    queryFn: () => getPetDetail(petId),
    enabled: !!petId,
  })
}

export function usePetHistory(petId: string) {
  return useQuery({
    queryKey: ['receptionist', 'pet-history', petId],
    queryFn: () => getPetHistory(petId),
    enabled: !!petId,
    staleTime: 30_000,
  })
}

export function useCreatePet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'pets'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'owners'] })
    },
  })
}

export function useUpdatePet() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ petId, payload }: { petId: string; payload: Parameters<typeof updatePet>[1] }) =>
      updatePet(petId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'pets'] })
    },
  })
}
