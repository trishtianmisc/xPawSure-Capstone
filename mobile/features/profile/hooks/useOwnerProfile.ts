import { useQuery } from '@tanstack/react-query'

import * as profileService from '../../../src/services/profile'

export function useOwnerProfile() {
  return useQuery({
    queryKey: ['ownerProfile'],
    queryFn: profileService.getOwnerProfile,
  })
}
