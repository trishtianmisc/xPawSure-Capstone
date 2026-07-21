import { useQuery } from '@tanstack/react-query'

import * as petService from '../../../src/services/pet'
import type { Pet } from '../types'

export function usePets(userId: string | undefined) {
  return useQuery<Pet[]>({
    queryKey: ['pets', userId],
    queryFn: petService.getPets,
    enabled: !!userId,
  })
}
