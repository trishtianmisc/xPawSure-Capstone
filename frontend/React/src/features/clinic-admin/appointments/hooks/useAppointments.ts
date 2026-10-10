import { useQuery } from '@tanstack/react-query'

import { listAppointments } from '../../../receptionist/services/appointment.service'
import type { AppointmentListResponse } from '../../../receptionist/types/receptionist.types'
import { getAppointmentVolume, listVeterinarians, type VolumeQueryParams } from '../services/appointments.service'

export interface ClinicAppointmentQuery {
  date?: string
  date_from?: string
  date_to?: string
  status?: string
  vet_id?: string
  pet_id?: string
  search?: string
  page?: number
  page_size?: number
}

export function useClinicAppointments(params: ClinicAppointmentQuery) {
  return useQuery({
    queryKey: ['clinic-admin', 'appointments', params],
    queryFn: (): Promise<AppointmentListResponse> => listAppointments(params),
    staleTime: 30_000,
  })
}

export function useAppointmentVolume(params: VolumeQueryParams = {}) {
  return useQuery({
    queryKey: ['clinic-admin', 'appointment-volume', params],
    queryFn: () => getAppointmentVolume(params),
    staleTime: 60_000,
  })
}

export function useVeterinarians() {
  return useQuery({
    queryKey: ['clinic-admin', 'veterinarians'],
    queryFn: listVeterinarians,
    staleTime: 300_000,
  })
}
