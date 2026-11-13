import { useQuery } from '@tanstack/react-query'

import * as vetService from '../../../src/services/vet'
import type { VetPetConsultationHistory } from '../types'

export function useVetPetConsultationHistory(petId?: string) {
  return useQuery<VetPetConsultationHistory>({
    queryKey: ['vet', 'pet-history', petId],
    queryFn: () => vetService.getPetConsultationHistory(petId as string),
    enabled: !!petId,
  })
}
