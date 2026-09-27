import type { ScreeningSummary } from '../../screening/types'

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'VACCINATION' | 'AI_REVIEW' | 'EMERGENCY'

export interface AppointmentListItem {
  apt_id: string
  pet_id: string
  pet_name: string
  pet_species: string | null
  cln_id: string
  stf_id: string | null
  vet_name: string | null
  owner_name: string | null
  apt_type: AppointmentType
  apt_status: AppointmentStatus
  apt_scheduled_at: string
  apt_reason: string | null
  created_by_name: string | null
  screening: ScreeningSummary | null
  apt_checked_in_at: string | null
  apt_completed_at: string | null
  apt_cancelled_at: string | null
  apt_created_at: string
}

export interface AppointmentDetail extends AppointmentListItem {
  pet_breed: string | null
  pet_sex: string
  clinic_name: string
  owner_phone: string | null
  apt_cancellation_reason: string | null
  apt_updated_at: string
}

export interface AppointmentListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: AppointmentListItem[]
}

export interface OwnerClinic {
  cln_id: string
  cln_name: string
  cln_address: string | null
  cln_phone: string | null
  cln_logo_url: string | null
}

export interface OwnerVet {
  stf_id: string
  full_name: string
  email: string | null
  available_count: number
}

export interface OwnerSlot {
  vsl_id: string
  stf_id: string
  cln_id: string
  vsl_date: string
  vsl_start_time: string
  vsl_end_time: string
  vsl_appointment: string | null
  vet_name: string | null
  vsl_created_at: string
}

export interface BookAppointmentPayload {
  pet_id: string
  slot_id: string
  apt_type: AppointmentType
  reason?: string
  screening_id: string
}
