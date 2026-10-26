import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useToast } from '../../../components/ui/ToastContext'
import { apiErrorCode, apiErrorMessage } from '../../../utils/error'
import { paymentService } from '../services/payment.service'
import type { CheckoutPayload, MockCheckoutOutcome, PaymentListParams } from '../types/payment.types'

const PAYMENTS_KEY = 'payments'

export function useCreateCheckout() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => paymentService.checkout(payload),
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY] })
      queryClient.setQueryData([PAYMENTS_KEY, 'detail', payment.pay_id], payment)
    },
    onError: (error) => {
      // A clinic with no fee answers PAYMENT_NOT_REQUIRED; that is a normal
      // branch, not a failure, so the caller books without payment silently.
      if (apiErrorCode(error) === 'PAYMENT_NOT_REQUIRED') return
      showToast(apiErrorMessage(error), 'error')
    },
  })
}

/** Polls a checkout while it is still open; stops as soon as it settles. */
export function usePayment(payId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [PAYMENTS_KEY, 'detail', payId],
    queryFn: () => paymentService.get(payId),
    enabled: !!payId && (options?.enabled ?? true),
    refetchInterval: (query) =>
      query.state.data && query.state.data.status === 'PENDING' ? 2000 : false,
  })
}

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

export function useCancelPayment() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  return useMutation({
    mutationFn: (payId: string) => paymentService.cancel(payId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PAYMENTS_KEY] })
    },
    onError: (error) => {
      showToast(apiErrorMessage(error), 'error')
    },
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
