import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as petService from '../../../src/services/pet'

export function useDeletePet(userId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, Error, string>({
    mutationFn: petService.deletePet,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ['pet', id] })
      queryClient.invalidateQueries({ queryKey: ['pets', userId] })
    },
  })
}
