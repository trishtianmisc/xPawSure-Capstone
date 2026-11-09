export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'VOID'

export type PaymentMethod = 'GCASH' | 'CARD' | 'CASH'

export type PaymentProvider = 'MOCK' | 'PAYMONGO' | 'XENDIT' | 'CASH'

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
  /** Clinic-local calendar days on PAY_PAID_AT; excludes unpaid rows. */
  paid_from?: string
  paid_to?: string
  page?: number
  page_size?: number
}

/**
 * Totals over EVERY payment matching the filters (not just the current
 * page), as fixed two-decimal strings. `paid_total` follows the same
 * PAID + paid-at rules as the Reports revenue KPI, so the two reconcile.
 */
export interface PaymentListSummary {
  paid_total: string
  pending_total: string
  refunded_total: string
  payment_count: number
}

export interface PaymentListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  summary: PaymentListSummary
  results: Payment[]
}

/** Error body the payments API returns; branch on `code`, not on prose. */
export interface PaymentErrorBody {
  detail: string
  code: string
  amount?: number
  currency?: string
}
