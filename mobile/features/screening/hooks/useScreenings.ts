import { useQuery } from '@tanstack/react-query'

import * as screeningService from '../../../src/services/screening'

export function useScreenings(petId?: string, enabled = true) {
  return useQuery({
    queryKey: ['screenings', petId],
    queryFn: () => screeningService.getScreenings(petId),
    enabled: !!petId && enabled,
  })
}
