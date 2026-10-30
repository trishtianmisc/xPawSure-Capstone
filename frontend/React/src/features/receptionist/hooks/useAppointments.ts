import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../../components/ui/ToastContext'
import { apiErrorCode, apiErrorMessage } from '../../../utils/error'
import {
  listAppointments,
  getAppointmentDetail,
  createAppointment,
  confirmFollowUp,
  updateAppointmentStatus,
} from '../services/appointment.service'

const STATUS_TOAST: Record<string, string> = {
  PENDING: 'Appointment marked as pending',
  CONFIRMED: 'Appointment confirmed',
  CHECKED_IN: 'Patient checked in',
  IN_PROGRESS: 'Consultation in progress',
  COMPLETED: 'Appointment completed',
  CANCELLED: 'Appointment cancelled',
  NO_SHOW: 'Appointment marked as no show',
}

export function useAppointments(params: {
  date?: string
  status?: string
  vet_id?: string
  pet_id?: string
  search?: string
  overdue?: string
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
  const { showToast } = useToast()
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'appointments'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'dashboard'] })
    },
    onError: (error) => {
      // The cached fee may be out of date; refresh it so the payment step
      // appears when the clinic has just started charging for consultations.
      const code = apiErrorCode(error)
      if (code === 'PAYMENT_REQUIRED' || code === 'PAYMENT_INVALID') {
        queryClient.invalidateQueries({ queryKey: ['receptionist', 'clinic-settings'] })
      }
      showToast(apiErrorMessage(error), 'error')
    },
  })
}

export function useConfirmFollowUp() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: ({ aptId, slotId }: { aptId: string; slotId: string }) =>
      confirmFollowUp(aptId, slotId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'appointments'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'appointment', vars.aptId] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'slots'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'schedule'] })
      showToast('Follow-up scheduled — awaiting payment')
    },
    onError: (error) => {
      showToast(apiErrorMessage(error), 'error')
    },
  })
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'appointments'] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'appointment', vars.aptId] })
      queryClient.invalidateQueries({ queryKey: ['receptionist', 'dashboard'] })
      showToast(STATUS_TOAST[vars.status] ?? 'Appointment updated')
    },
    onError: (error) => {
      showToast(apiErrorMessage(error), 'error')
    },
  })
}
