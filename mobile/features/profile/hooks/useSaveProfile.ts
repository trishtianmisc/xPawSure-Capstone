import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as authService from '../../../src/services/auth'
import * as profileService from '../../../src/services/profile'
import type { OwnerProfile } from '../../../src/services/profile'

export interface SaveProfilePayload {
  first_name: string
  last_name: string
  phone?: string
  address?: string
  profile_picture?: string | null
}

export function useSaveProfile() {
  const queryClient = useQueryClient()

  return useMutation<OwnerProfile, Error, SaveProfilePayload>({
    mutationFn: async (payload) => {
      await authService.updateProfile({
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone ?? '',
      })
      return profileService.updateOwnerProfile({
        address: payload.address ?? '',
        profile_picture: payload.profile_picture,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownerProfile'] })
    },
  })
}
