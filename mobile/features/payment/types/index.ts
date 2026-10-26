import type { AppointmentType } from '../../appointment/types'

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'VOID'

/** CASH exists on the model but is staff-only; owners are offered GCash/Card. */
export type PaymentMethod = 'GCASH' | 'CARD' | 'CASH'

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
  provider: string
  checkout_url: string | null
  expires_at: string | null
  paid_at: string | null
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface CreateCheckoutPayload {
  pet_id: string
  slot_id: string
  apt_type: AppointmentType
  method: PaymentMethod
  reason?: string
  screening_id?: string
}

export interface PaymentListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Payment[]
}
