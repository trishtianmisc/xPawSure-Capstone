import { useQuery } from '@tanstack/react-query'

import * as petService from '../../../src/services/pet'
import type { Pet } from '../types'

export function usePet(id: string | undefined) {
  return useQuery<Pet>({
    queryKey: ['pet', id],
    queryFn: () => petService.getPet(id!),
    enabled: !!id,
  })
}
