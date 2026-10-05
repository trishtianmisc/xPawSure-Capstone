import { useQuery } from '@tanstack/react-query'

import * as screeningService from '../../../src/services/screening'
import type { ScreeningListResponse } from '../types'

export function useAllScreenings() {
  return useQuery<ScreeningListResponse>({
    queryKey: ['screenings', 'all'],
    queryFn: () => screeningService.getScreenings(),
  })
}
