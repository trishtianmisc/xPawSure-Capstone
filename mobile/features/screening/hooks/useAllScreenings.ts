import { useQuery } from '@tanstack/react-query'

import * as screeningService from '../../../src/services/screening'
import type { ScreeningListResponse } from '../types'

export function useAllScreenings(petId?: string) {
  return useQuery<ScreeningListResponse>({
    queryKey: ['screenings', petId ?? 'all'],
    queryFn: () => screeningService.getScreenings(petId),
  })
}
