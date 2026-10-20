export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export type ConsultationTab = 'TODAY' | 'UPCOMING' | 'COMPLETED'

export interface VetScreeningSummary {
  ais_id: string
  disease: string
  ais_confidence: string | number
  ais_model_version: string
  ais_status: string
  ais_source: string
  ais_created_at: string
}

export interface VetAppointment {
  apt_id: string
  pet_id: string
  pet_name: string
  pet_breed?: string | null
  pet_species?: string | null
  pet_sex?: string | null
  pet_birth_date?: string | null
  owner_name: string | null
  owner_phone?: string | null
  vet_name: string | null
  clinic_name?: string | null
  apt_type: string
  apt_status: AppointmentStatus
  apt_scheduled_at: string
  apt_reason: string | null
  apt_cancellation_reason?: string | null
  apt_reschedule_request_reason?: string | null
  apt_cancellation_request_reason?: string | null
  screening: VetScreeningSummary | null
}

export interface VetDashboardStats {
  consultations_this_month: number
  pending: number
  completed: number
}

export interface VetDashboardData {
  clinic_name: string | null
  stats: VetDashboardStats
  today_consultations: VetAppointment[]
}

export interface ScheduleDayAppointment {
  id: string
  time: string
  pet_name: string
  breed: string
  owner_name: string
}

export interface ScheduleMonthAppointment extends ScheduleDayAppointment {
  date: string
}

export interface ScheduleWeekDay {
  dayLabel: string
  appointments: ScheduleDayAppointment[]
}
