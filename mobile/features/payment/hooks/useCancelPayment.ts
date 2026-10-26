import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as paymentService from '../../../src/services/payment'
import type { Payment } from '../types'

export function useCancelPayment() {
  const queryClient = useQueryClient()

  return useMutation<Payment, Error, string>({
    mutationFn: paymentService.cancelPayment,
    onSuccess: (payment) => {
      queryClient.setQueryData(['payment', payment.pay_id], payment)
      queryClient.invalidateQueries({ queryKey: ['payments'] })
    },
  })
}
