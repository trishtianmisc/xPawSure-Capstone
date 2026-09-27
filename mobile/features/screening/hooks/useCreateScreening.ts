import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as screeningService from '../../../src/services/screening'
import type { CreateScreeningPayload, Screening } from '../types'

export function useCreateScreening() {
  const queryClient = useQueryClient()

  return useMutation<Screening, Error, CreateScreeningPayload>({
    mutationFn: screeningService.createScreening,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screenings'] })
    },
  })
}
