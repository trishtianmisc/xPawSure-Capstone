export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'VOID'

export type PaymentMethod = 'GCASH' | 'CARD' | 'CASH'

export type PaymentProvider = 'MOCK' | 'PAYMONGO' | 'CASH'

export type MockCheckoutOutcome = 'success' | 'decline' | 'expire'

export interface Payment {
  pay_id: string
  reference_no: string
  clinic_id: string
  owner_id: string
  owner_name: string | null
  appointment_id: string | null
  pet_name: string | null
  amount: number
  currency: string
  method: PaymentMethod
  status: PaymentStatus
  provider: PaymentProvider
  checkout_url: string | null
  expires_at: string | null
  paid_at: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface CheckoutPayload {
  pet_id: string
  slot_id: string
  apt_type: string
  method: PaymentMethod
  reason?: string
  screening_id?: string | null
}

export interface PaymentListParams {
  status?: string
  method?: string
  reference?: string
  appointment?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export interface PaymentListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Payment[]
}

/** Error body the payments API returns; branch on `code`, not on prose. */
export interface PaymentErrorBody {
  detail: string
  code: string
  amount?: number
  currency?: string
}
