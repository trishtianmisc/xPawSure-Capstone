import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as paymentService from '../../../src/services/payment'
import type { OwnerPaymentMethod, Payment } from '../types'

interface FollowUpCheckoutVariables {
  aptId: string
  method: OwnerPaymentMethod
}

export function useCreateFollowUpCheckout() {
  const queryClient = useQueryClient()

  return useMutation<Payment, Error, FollowUpCheckoutVariables>({
    mutationFn: ({ aptId, method }) =>
      paymentService.createFollowUpCheckout(aptId, method),
    onSuccess: (payment) => {
      // Seed the poll query so the very next render already has the checkout.
      queryClient.setQueryData(['payment', payment.pay_id], payment)
      void queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
