import { useQuery } from '@tanstack/react-query'

import * as appointmentService from '../../../src/services/appointment'
import type { OwnerClinic } from '../types'

export function useClinics() {
  return useQuery<OwnerClinic[]>({
    queryKey: ['appointment', 'clinics'],
    queryFn: appointmentService.getOwnerClinics,
  })
}
