import { useQuery } from '@tanstack/react-query'

import * as vetService from '../../../src/services/vet'
import type { VetAppointment } from '../types'

export function useVetAppointments(range: {
  start_date?: string
  end_date?: string
}) {
  return useQuery<VetAppointment[]>({
    queryKey: ['vet', 'appointments', range.start_date ?? '', range.end_date ?? ''],
    queryFn: () => vetService.getVetAppointments(range),
    select: (appointments) =>
      appointments.filter((appointment) => appointment.apt_status !== 'PENDING'),
  })
}
