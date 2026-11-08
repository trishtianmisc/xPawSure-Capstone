import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateProfile } from '../../../src/services/auth'

export interface SaveVetProfilePayload {
  first_name: string
  last_name: string
  phone?: string
}

export function useSaveVetProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveVetProfilePayload) =>
      updateProfile({
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone ?? '',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vet', 'profile'] })
    },
  })
}
