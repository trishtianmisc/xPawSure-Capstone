import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as petService from '../../../src/services/pet'
import type { Pet, PetUpdatePayload } from '../types'

export function useUpdatePet(userId: string) {
  const queryClient = useQueryClient()

  return useMutation<Pet, Error, { id: string; payload: PetUpdatePayload }>({
    mutationFn: ({ id, payload }) => petService.updatePet(id, payload),
    onSuccess: (pet, { id }) => {
      queryClient.setQueryData(['pet', id], pet)
      queryClient.invalidateQueries({ queryKey: ['pets', userId] })
    },
  })
}
