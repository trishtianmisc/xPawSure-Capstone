import { useQueryClient } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import { useEffect, useState } from 'react'

import { apiErrorMessage } from '../../../src/utils/error'
import type { OwnerPaymentMethod, Payment } from '../types'
import { useCancelPayment } from './useCancelPayment'
import { useCreateFollowUpCheckout } from './useCreateFollowUpCheckout'
import { usePayment } from './usePayment'

interface UseFollowUpPaymentOptions {
  appointmentId: string
  fee: number
  /** The latest payment the appointment query returned, if any. */
  payment: Payment | null
}

/**
 * Logic for paying a follow-up that is already booked in CONFIRMATION.
 *
 * Unlike booking, the slot already exists, so this only creates (or resumes)
 * the checkout and then relies on the normal payment poll to notice success.
 * The backend moves the appointment to CONFIRMED and links the payment once
 * the provider confirms it.
 */
export function useFollowUpPayment({
  appointmentId,
  fee,
  payment,
}: UseFollowUpPaymentOptions) {
  const queryClient = useQueryClient()
  const [method, setMethod] = useState<OwnerPaymentMethod>('GCASH')
  const [checkout, setCheckout] = useState<Payment | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const createCheckout = useCreateFollowUpCheckout()
  const cancelPayment = useCancelPayment()

  // The freshly-created checkout wins for the first render; after that the
  // parent's refetched payment and the poll below take over.
  const seeded = checkout ?? payment
  const { data: livePayment, refetch } = usePayment(
    seeded?.pay_id ?? null,
    seeded ?? undefined,
  )
  const active = livePayment ?? seeded
  const isPaid = active?.status === 'PAID'
  const isPending = active?.status === 'PENDING'

  useEffect(() => {
    if (!isPaid) return
    // Payment success is also the moment the backend confirms the follow-up.
    void queryClient.invalidateQueries({
      queryKey: ['appointment', 'detail', appointmentId],
    })
    void queryClient.invalidateQueries({
      queryKey: ['payments', 'appointment', appointmentId],
    })
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }, [appointmentId, isPaid, queryClient])

  async function openCheckout(url: string | null) {
    if (!url) {
      setMessage('The checkout link is not ready yet. Please try again.')
      return
    }
    try {
      await Linking.openURL(url)
    } catch {
      setMessage(
        'We could not open the checkout page. Tap "Open checkout page" to retry.',
      )
    }
  }

  function selectMethod(next: OwnerPaymentMethod) {
    setMethod(next)
    setMessage(null)
  }

  function pay() {
    setMessage(null)
    if (isPaid) return

    if (isPending && active?.checkout_url) {
      void openCheckout(active.checkout_url)
      return
    }

    createCheckout.mutate(
      { aptId: appointmentId, method },
      {
        onSuccess: (created) => {
          setCheckout(created)
          void openCheckout(created.checkout_url)
        },
        onError: (error) => setMessage(apiErrorMessage(error)),
      },
    )
  }

  function cancel() {
    if (!active || active.status !== 'PENDING') return

    cancelPayment.mutate(active.pay_id, {
      onSuccess: () => {
        setCheckout(null)
        void queryClient.invalidateQueries({
          queryKey: ['payments', 'appointment', appointmentId],
        })
      },
      onError: (error) => setMessage(apiErrorMessage(error)),
    })
  }

  return {
    active,
    amount: active?.amount ?? fee,
    currency: active?.currency ?? 'PHP',
    method,
    selectMethod,
    pay,
    cancel,
    message,
    refetch,
    isPaying: createCheckout.isPending,
    isCancelling: cancelPayment.isPending,
    isPending,
    isPaid,
    canChooseMethod: !active || !['PENDING', 'PAID'].includes(active.status),
  }
}
