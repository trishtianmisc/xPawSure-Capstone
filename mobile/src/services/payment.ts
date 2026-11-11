import type {
  CreateCheckoutPayload,
  OwnerPaymentMethod,
  Payment,
  PaymentListResponse,
  PaymentStatus,
} from '../../features/payment/types'
import { http } from './http'

/**
 * Owner-facing payment API.
 *
 * The amount always comes from the clinic's configured fee — it is never sent
 * by the client, only the booking context (pet, slot, method) is.
 */
export async function createCheckout(payload: CreateCheckoutPayload): Promise<Payment> {
  const { data } = await http.post('/payments/checkout/', payload)
  return data
}

/**
 * Start (or resume) the checkout for an already-scheduled follow-up.
 *
 * The backend owns the amount and reuses an existing pending attempt, so the
 * client only supplies the chosen method.
 */
export async function createFollowUpCheckout(
  aptId: string,
  method: OwnerPaymentMethod,
): Promise<Payment> {
  const { data } = await http.post(`/owner/appointments/${aptId}/checkout/`, { method })
  return data
}

export async function getPayment(payId: string): Promise<Payment> {
  const { data } = await http.get(`/payments/${payId}/`)
  return data
}

/** The caller's own receipts; `status: 'PENDING'` resumes an abandoned checkout. */
export async function listMyPayments(params?: {
  status?: PaymentStatus
  /** Narrow the list to one appointment's payments (details screen). */
  appointment?: string
  page?: number
  page_size?: number
}): Promise<PaymentListResponse> {
  const { data } = await http.get('/owner/payments/', { params })
  return data
}

export async function cancelPayment(payId: string): Promise<Payment> {
  const { data } = await http.post(`/payments/${payId}/cancel/`, {})
  return data
}
