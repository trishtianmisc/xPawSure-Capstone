import type {
  AppointmentStatus,
  AppointmentType,
} from '../../../receptionist/types/receptionist.types'

export type VaccinationStatus =
  | 'up_to_date'
  | 'due_soon'
  | 'overdue'
  | 'none_recorded'

export type PatientSort = 'name' | 'last_visit' | 'no_shows'
export type SortOrder = 'asc' | 'desc'

export interface ClinicPatientOwner {
  name: string
  phone: string | null
  email: string
}

export interface ClinicPatientListItem {
  id: string
  name: string
  profile_picture: string | null
  breed: string | null
  sex: string
  age: number | null
  owner: ClinicPatientOwner
  last_visit_date: string | null
  next_appointment_date: string | null
  total_appointments: number
  no_show_count: number
  cancelled_count: number
  vaccination_status: VaccinationStatus
}

export interface ClinicPatientListResponse {
  total: number
  total_patients: number
  page: number
  page_size: number
  total_pages: number
  results: ClinicPatientListItem[]
}

export interface ClinicPatientVaccination {
  name: string
  date_given: string
  next_due: string | null
}

export interface ClinicPatientAppointment {
  apt_id: string
  apt_scheduled_at: string
  apt_type: AppointmentType
  apt_status: AppointmentStatus
  vet_name: string | null
  apt_cancellation_reason: string | null
}

export interface ClinicPatientSummary {
  consultations: number
  vaccinations: number
  ai_screenings: number
}

export interface ClinicPatientDetail {
  id: string
  name: string
  profile_picture: string | null
  breed: string | null
  sex: string
  age: number | null
  date_of_birth: string | null
  weight: string | null
  color: string | null
  registered_at: string
  owner: ClinicPatientOwner
  summary: ClinicPatientSummary
  vaccination_status: VaccinationStatus
  vaccinations: ClinicPatientVaccination[]
  appointments: ClinicPatientAppointment[]
}

export interface ClinicPatientQuery {
  search?: string
  breed?: string
  vaccination_status?: VaccinationStatus
  has_no_shows?: boolean
  sort?: PatientSort
  order?: SortOrder
  page?: number
  page_size?: number
}

export interface BreedOption {
  id: string
  name: string
}
