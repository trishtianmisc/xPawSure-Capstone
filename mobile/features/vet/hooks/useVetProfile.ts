import { useQuery } from '@tanstack/react-query'

import { getProfile } from '../../../src/services/auth'

export function useVetProfile() {
  return useQuery({
    queryKey: ['vet', 'profile'],
    queryFn: getProfile,
  })
}
