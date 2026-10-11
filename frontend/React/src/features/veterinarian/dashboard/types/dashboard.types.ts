export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface ScreeningSummary {
  ais_id: string
  disease: string
  ais_confidence: string | number
  ais_model_version: string
  ais_status: string
  ais_source: string
  ais_created_at: string
}

export interface VetDashboardStats {
  consultations_this_month: number
  pending: number
  completed: number
}

export interface VetAppointmentSummary {
  apt_id: string
  pet_id: string
  pet_name: string
  pet_species: string | null
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
  owner_name: string | null
  owner_phone: string | null
  vet_name: string | null
  clinic_name: string
  apt_type: string
  apt_status: AppointmentStatus
  apt_scheduled_at: string
  apt_reason: string | null
  apt_cancellation_reason: string | null
  screening: ScreeningSummary | null
  consultation: VetConsultationInfo | null
  prescription: VetPrescriptionInfo | null
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
  treatment: string | null
  notes: string | null
  created_at: string
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

export interface ConsultationFormValues {
  chief_complaint: string
  objective: string
  diagnosis: string
  notes: string
}

export interface PrescriptionItemFormValues {
  medicine_name: string
  generic_name: string
  dosage: string
  frequency: string
  duration: string
  route: string
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
}
