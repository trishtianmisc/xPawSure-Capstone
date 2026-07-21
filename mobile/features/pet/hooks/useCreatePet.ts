import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as petService from '../../../src/services/pet'
import type { Pet, PetCreatePayload } from '../types'

export function useCreatePet() {
  const queryClient = useQueryClient()

  return useMutation<Pet, Error, PetCreatePayload>({
    mutationFn: petService.createPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pets'] })
    },
  })
}
