import { useQuery } from '@tanstack/react-query'

import * as petService from '../../../src/services/pet'
import type { Breed } from '../types'

export function useBreeds() {
  return useQuery<Breed[]>({
    queryKey: ['breeds'],
    queryFn: petService.getBreeds,
    staleTime: 1000 * 60 * 30,
  })
}
