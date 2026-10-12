import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { dashboardService } from '../services/dashboard.service'
import type {
  ConsultationFormValues,
  PrescriptionSavePayload,
} from '../types/dashboard.types'

function useVetCacheRefresh() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['veterinarian', 'dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['veterinarian', 'appointments'] })
    queryClient.invalidateQueries({ queryKey: ['veterinarian', 'appointment'] })
    queryClient.invalidateQueries({ queryKey: ['veterinarian', 'schedule'] })
  }
}

export function useVetAppointments() {
  return useQuery({
    queryKey: ['veterinarian', 'appointments'],
    queryFn: () => dashboardService.listAppointments(),
    staleTime: 30_000,
  })
}

export function useVetScheduleAppointments(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['veterinarian', 'schedule', startDate, endDate],
    queryFn: () =>
      dashboardService.listAppointments({
        start_date: startDate,
        end_date: endDate,
      }),
    enabled: !!startDate && !!endDate,
    staleTime: 30_000,
  })
}

export function useAppointmentDetail(aptId: string) {
  return useQuery({
    queryKey: ['veterinarian', 'appointment', aptId],
    queryFn: () => dashboardService.getAppointmentDetail(aptId),
    enabled: !!aptId,
    staleTime: 30_000,
  })
}

export function useStartConsultation() {
  const refresh = useVetCacheRefresh()
  return useMutation({
    mutationFn: (aptId: string) => dashboardService.startConsultation(aptId),
    onSuccess: refresh,
  })
}

export function useCancelAppointment() {
  const refresh = useVetCacheRefresh()
  return useMutation({
    mutationFn: ({ aptId, reason }: { aptId: string; reason: string }) =>
      dashboardService.cancelAppointment(aptId, reason),
    onSuccess: refresh,
  })
}

export function useSaveConsultation() {
  const refresh = useVetCacheRefresh()
  return useMutation({
    mutationFn: (input: {
      aptId: string
      conId?: string | null
      payload: ConsultationFormValues
    }) =>
      input.conId
        ? dashboardService.updateConsultation(input.conId, input.payload)
        : dashboardService.createConsultation(input.aptId, input.payload),
    onSuccess: refresh,
  })
}

export function useSavePrescription() {
  const refresh = useVetCacheRefresh()
  return useMutation({
    mutationFn: (payload: PrescriptionSavePayload) =>
      dashboardService.savePrescription(payload),
    onSuccess: refresh,
  })
}
