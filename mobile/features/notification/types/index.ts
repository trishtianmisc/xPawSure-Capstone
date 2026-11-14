export type NotificationTypeName =
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_REMINDER'
  | 'CONSULTATION_AVAILABLE'
  | 'PRESCRIPTION_AVAILABLE'
  | 'VACCINATION_REMINDER'
  | 'AI_SCREENING_COMPLETED'
  | 'AI_SCREENING_REVIEWED'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_EXPIRED'
  | 'SYSTEM'

export interface OwnerNotification {
  ntf_id: string
  ntf_title: string
  ntf_message: string
  ntf_type: NotificationTypeName
  ntf_is_read: boolean
  ntf_reference_table: string | null
  ntf_reference_id: string | null
  ntf_created_at: string
  ntf_read_at: string | null
  pet_name: string | null
  pet_profile_image: string | null
  appointment_scheduled_at: string | null
}

export interface NotificationListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: OwnerNotification[]
}
