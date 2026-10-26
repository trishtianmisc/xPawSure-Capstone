import http from '../../../services/http'
import type {
  CheckoutPayload,
  MockCheckoutOutcome,
  Payment,
  PaymentListParams,
  PaymentListResponse,
} from '../types/payment.types'

export const paymentService = {
  /** Create (and for cash, immediately settle) the payment that gates a booking. */
  async checkout(payload: CheckoutPayload): Promise<Payment> {
    const { data } = await http.post('/payments/checkout/', payload)
    return data
  },

  async get(payId: string): Promise<Payment> {
    const { data } = await http.get(`/payments/${payId}/`)
    return data
  },

  async list(params: PaymentListParams = {}): Promise<PaymentListResponse> {
    const { data } = await http.get('/payments/', { params })
    return data
  },

  async cancel(payId: string): Promise<Payment> {
    const { data } = await http.post(`/payments/${payId}/cancel/`, {})
    return data
  },

  /** Status of a mock checkout; the signed token is the only credential. */
  async getMockStatus(reference: string, token: string): Promise<Payment> {
    const { data } = await http.get(`/payments/mock/${reference}/`, { params: { token } })
    return data
  },

  async confirmMock(
    reference: string,
    token: string,
    outcome: MockCheckoutOutcome,
  ): Promise<Payment> {
    const { data } = await http.post(`/payments/mock/${reference}/confirm/`, {
      token,
      outcome,
    })
    return data
  },
}
