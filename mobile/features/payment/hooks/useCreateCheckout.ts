import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as paymentService from '../../../src/services/payment'
import type { CreateCheckoutPayload, Payment } from '../types'

export function useCreateCheckout() {
  const queryClient = useQueryClient()

  return useMutation<Payment, Error, CreateCheckoutPayload>({
    mutationFn: paymentService.createCheckout,
    onSuccess: (payment) => {
      // Seed the poll query so the very next render already has the checkout.
      queryClient.setQueryData(['payment', payment.pay_id], payment)
    },
  })
}
