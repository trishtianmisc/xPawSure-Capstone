import { useQuery } from '@tanstack/react-query'

import * as paymentService from '../../../src/services/payment'
import type { PaymentListResponse, PaymentStatus } from '../types'

/** The caller's receipts, optionally filtered by status ('ALL' = no filter). */
export function useMyPayments(status: PaymentStatus | 'ALL' = 'ALL') {
  return useQuery<PaymentListResponse>({
    queryKey: ['payments', 'me', status],
    queryFn: () => paymentService.listMyPayments(status === 'ALL' ? undefined : { status }),
  })
}
