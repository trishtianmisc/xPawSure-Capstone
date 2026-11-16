import { useQuery } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { OwnerVet } from '../types'

/**
 * Vets for a clinic. `date` is optional: omit it to list every bookable vet
 * (used when the veterinarian is chosen before the schedule); pass it to get
 * only the vets with slots that day plus their per-day counts. Vets whose
 * account setup is unfinished are never listed.
 */
export function useVets(clinicId: string | undefined, date?: string) {
  return useQuery<OwnerVet[]>({
    queryKey: ['appointment', 'vets', clinicId, date ?? null],
    queryFn: () => appointmentService.getOwnerVets(clinicId as string, date),
    enabled: !!clinicId,
  })
}
