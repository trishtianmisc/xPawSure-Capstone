import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useToast } from '../../../components/ui/ToastContext'
import { apiErrorMessage } from '../../../utils/error'
import { paymentService } from '../services/payment.service'
import type { MockCheckoutOutcome, PaymentListParams } from '../types/payment.types'

const PAYMENTS_KEY = 'payments'

export function usePaymentsByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, 'appointment', appointmentId],
    queryFn: () => paymentService.list({ appointment: appointmentId }),
    enabled: !!appointmentId,
  })
}

export function useMockPayment(reference: string, token: string, enabled = true) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, 'mock', reference],
    queryFn: () => paymentService.getMockStatus(reference, token),
    enabled: !!reference && !!token && enabled,
    retry: false,
    refetchInterval: (query) =>
      query.state.data && query.state.data.status === 'PENDING' ? 2000 : false,
  })
}

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, 'list', params],
    queryFn: () => paymentService.list(params),
  })
}

export function useConfirmMockPayment(reference: string, token: string) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (outcome: MockCheckoutOutcome) =>
      paymentService.confirmMock(reference, token, outcome),
    onSuccess: (payment) => {
      queryClient.setQueryData([PAYMENTS_KEY, 'mock', reference], payment)
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY] })
    },
    onError: (error) => {
      showToast(apiErrorMessage(error), 'error')
    },
  })
}
