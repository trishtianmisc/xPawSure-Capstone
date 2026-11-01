import { useQuery } from '@tanstack/react-query'

import * as paymentService from '../../../src/services/payment'
import type { PaymentListResponse } from '../types'

/** Every payment record attached to one appointment. */
export function useAppointmentPayment(appointmentId: string | undefined) {
  return useQuery<PaymentListResponse>({
    queryKey: ['payments', 'appointment', appointmentId],
    queryFn: () =>
      paymentService.listMyPayments({
        appointment: appointmentId as string,
        page_size: 20,
      }),
    enabled: !!appointmentId,
  })
}
