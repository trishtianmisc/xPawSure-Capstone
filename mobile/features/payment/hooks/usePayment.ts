import { useQuery } from '@tanstack/react-query'

import * as paymentService from '../../../src/services/payment'
import type { Payment } from '../types'

/**
 * Poll a single payment while it is still `PENDING`, then stop.
 *
 * `initialData` is the freshly created checkout so the screen never flashes an
 * empty state between "Pay" and the first poll.
 */
export function usePayment(payId: string | null, initialData?: Payment) {
  return useQuery<Payment>({
    queryKey: ['payment', payId ?? ''],
    queryFn: () => paymentService.getPayment(payId as string),
    enabled: !!payId,
    initialData,
    refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? 2000 : false),
  })
}
