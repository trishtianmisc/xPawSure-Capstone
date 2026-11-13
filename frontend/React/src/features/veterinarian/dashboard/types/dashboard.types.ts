export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface ScreeningAnswer {
  question: string
  answer: string
}

export interface ScreeningSummary {
  ais_id: string
  disease: string
  ais_confidence: string | number
  ais_model_version: string
  ais_status: string
  ais_source: string
  ais_created_at: string
  /** Owner's questionnaire rows (display-only); null when absent. */
  symptom_answers?: ScreeningAnswer[] | null
  image_url?: string | null
}

export interface VetTodayStats {
  total: number
  confirmed: number
  ongoing: number
  completed: number
}

export interface VetDashboardStats {
  consultations_this_month: number
  pending: number
  completed: number
  today_stats: VetTodayStats
}

export interface VetAppointmentSummary {
  apt_id: string
  pet_id: string
  pet_name: string
  pet_species: string | null
  pet_profile_image?: string | null
  vet_name: string | null
  owner_name: string | null
  apt_type: string
  apt_status: AppointmentStatus
  apt_scheduled_at: string
  apt_reason: string | null
  apt_checked_in_at?: string | null
  apt_completed_at?: string | null
  screening: ScreeningSummary | null
}

export interface VetAppointmentDetail {
  apt_id: string
  pet_id: string
  pet_name: string
  pet_breed: string | null
  pet_sex: string
  pet_birth_date: string | null
  pet_weight: string | null
  pet_color: string | null
  pet_profile_image: string | null
  owner_name: string | null
  owner_phone: string | null
  owner_address: string | null
  vet_name: string | null
  vet_license_number: string | null
  clinic_name: string
  clinic_address: string | null
  clinic_phone: string | null
  apt_type: string
  apt_status: AppointmentStatus
  apt_scheduled_at: string
  apt_reason: string | null
  apt_cancellation_reason: string | null
  apt_reschedule_request_reason: string | null
  apt_cancellation_request_reason: string | null
  apt_created_at: string
  apt_checked_in_at: string | null
  apt_completed_at: string | null
  screening: ScreeningSummary | null
  consultation: VetConsultationInfo | null
  prescription: VetPrescriptionInfo | null
  payment_provider_ref: string | null
}

export interface VetConsultationInfo {
  id: string
  appointment_id: string
  pet_id: string
  pet_name: string
  veterinarian: string
  chief_complaint: string | null
  subjective: string | null
  objective: string | null
  assessment: string | null
  plan: string | null
  diagnosis: string
  specific_disease: string | null
  treatment: string | null
  notes: string | null
  follow_up_required: boolean
  follow_up_target_date: string | null
  created_at: string
}

export interface VetConsultationHistoryItem extends VetConsultationInfo {
  scheduled_at: string
  checked_in_at: string | null
  completed_at: string | null
}

export interface VetPrescriptionItemInfo {
  id: string
  medicine_name: string
  generic_name: string | null
  dosage: string
  frequency: string
  duration: string
  route: string
  quantity: number | null
  notes: string | null
}

export interface VetPrescriptionInfo {
  id: string
  consultation_id: string
  pet_id: string
  pet_name: string
  veterinarian: string
  instructions: string | null
  items: VetPrescriptionItemInfo[]
  created_at: string
}

export interface VetPetConsultationHistory {
  pet: {
    pet_id: string
    pet_name: string
    pet_species: string | null
  }
  consultations: VetConsultationHistoryItem[]
}

export interface ConsultationFormValues {
  chief_complaint: string
  objective: string
  diagnosis: string
  specific_disease: string
  notes: string
  follow_up_required: boolean
  follow_up_target_date: string | null
}

export interface PrescriptionItemFormValues {
  medicine_name: string
  generic_name: string
  dosage: string
  frequency: string
  duration: string
  route: string
  quantity: number
  notes: string
}

export interface PrescriptionSavePayload {
  consultation_id: string
  instructions: string
  items: PrescriptionItemFormValues[]
}

export interface VetDashboardData {
  clinic_name: string | null
  stats: VetDashboardStats
  today_consultations: VetAppointmentSummary[]
  upcoming_consultations: VetAppointmentSummary[]
}
