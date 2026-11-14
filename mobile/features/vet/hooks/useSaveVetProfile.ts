import { useMutation, useQueryClient } from '@tanstack/react-query'

import { updateProfile } from '../../../src/services/auth'

export interface SaveVetProfilePayload {
  first_name: string
  last_name: string
  phone?: string
  profile_picture?: string | null
}

export function useSaveVetProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: SaveVetProfilePayload) =>
      updateProfile({
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone ?? '',
        profile_picture: payload.profile_picture,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vet', 'profile'] })
    },
  })
}
