import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listAppointments,
  getAppointmentDetail,
  createAppointment,
  updateAppointmentStatus,
} from '../services/appointment.service'

export function useAppointments(params: {
  date?: string
  status?: string
  vet_id?: string
  pet_id?: string
  search?: string
  page?: number
  page_size?: number
}) {
  return useQuery({
    queryKey: ['receptionist', 'appointments', params],
    queryFn: () => listAppointments(params),
    staleTime: 30_000,
  })
}

export function useAppointmentDetail(aptId: string) {
  return useQuery({
    queryKey: ['receptionist', 'appointment', aptId],
    queryFn: () => getAppointmentDetail(aptId),
    enabled: !!aptId,
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'appointments'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'dashboard'] })
    },
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      aptId,
      status,
      cancellationReason,
    }: {
      aptId: string
      status: string
      cancellationReason?: string
    }) => updateAppointmentStatus(aptId, status, cancellationReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'appointments'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'dashboard'] })
    },
  })
}
