import { useQuery } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { OwnerSlot } from '../types'

export function useSlots(vetId: string | undefined, date: string | undefined) {
  return useQuery<OwnerSlot[]>({
    queryKey: ['appointment', 'slots', vetId, date],
    queryFn: () => appointmentService.getOwnerSlots(vetId as string, date as string),
    enabled: !!vetId && !!date,
  })
}
