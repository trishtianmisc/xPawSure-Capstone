export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'VACCINATION' | 'AI_REVIEW' | 'EMERGENCY'
export type AppointmentStatus = 'BOOKED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

export interface VetSlot {
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

export interface Vet {
  stf_id: string
  full_name: string
  email: string
}

export interface Appointment {
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
  apt_checked_in_at: string | null
  apt_completed_at: string | null
  apt_cancelled_at: string | null
  apt_created_at: string
}

export interface AppointmentDetail extends Appointment {
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
  results: Appointment[]
}

export interface CreateAppointmentPayload {
  pet_id: string
  slot_id: string
  apt_type: AppointmentType
  reason?: string
}

export interface Owner {
  own_id: string
  full_name: string
  email: string
  phone: string | null
  own_address: string | null
  pet_count: number
  own_created_at: string
}

export interface OwnerDetail extends Owner {
  own_profile_image: string | null
  pets: Pet[]
  own_updated_at: string
}

export interface OwnerListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Owner[]
}

export interface Pet {
  id: string
  name: string
  sex: string
  breed_id: string | null
  breed_name: string | null
  date_of_birth: string | null
  weight: number | null
  color: string | null
  microchip_number: string | null
  profile_picture: string | null
  qr_code: string | null
  qr_code_url: string | null
  created_at: string
}

export interface PetListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Pet[]
}

export interface CreatePetPayload {
  owner_id: string
  pet_name: string
  pet_sex: string
  brd_id?: string | null
  pet_birth_date?: string | null
  pet_weight?: number | null
  pet_color?: string | null
  pet_microchip_no?: string | null
}

export interface UpdatePetPayload {
  pet_name?: string
  pet_sex?: string
  brd_id?: string | null
  pet_birth_date?: string | null
  pet_weight?: number | null
  pet_color?: string | null
  pet_microchip_no?: string | null
}

export interface Notification {
  ntf_id: string
  ntf_title: string
  ntf_message: string
  ntf_type: string
  ntf_is_read: boolean
  ntf_reference_table: string | null
  ntf_reference_id: string | null
  ntf_created_at: string
  ntf_read_at: string | null
}

export interface NotificationListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Notification[]
}

export interface DashboardStats {
  today: {
    booked: number
    checked_in: number
    completed: number
    cancelled: number
    no_show: number
    total: number
  }
  total_owners: number
  total_pets: number
  recent_appointments: Appointment[]
}

export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'BLOCKED'

export interface ScheduleAppointment {
  apt_id: string
  pet_name: string
  owner_name: string
  apt_type: string
  apt_status: string
}

export interface ScheduleSlot {
  vsl_id: string
  vsl_start_time: string
  vsl_end_time: string
  status: SlotStatus
  appointment: ScheduleAppointment | null
}

export interface ScheduleDay {
  date: string
  is_working: boolean
  slots: ScheduleSlot[]
}

export interface ScheduleVet {
  stf_id: string
  full_name: string
  days: ScheduleDay[]
}

export interface ScheduleResponse {
  start_date: string
  end_date: string
  vets: ScheduleVet[]
}

export interface GenerateSlotsPayload {
  start_date: string
  end_date: string
  vet_id?: string
}

export interface GenerateSlotsResponse {
  generated: boolean
  slots_created: number
}

export interface VetTodaySummary {
  total_slots: number
  booked: number
  available: number
  blocked: number
  is_working: boolean
  has_slots: boolean
}

export interface VetScheduleSummary {
  stf_id: string
  full_name: string
  today_summary: VetTodaySummary
}

export interface VetScheduleListResponse {
  vets: VetScheduleSummary[]
}

export interface UpdateSlotStatusPayload {
  status: 'AVAILABLE' | 'BLOCKED'
}

export interface UpdateSlotStatusResponse {
  vsl_id: string
  status: SlotStatus
}

export interface BlockRemainingResponse {
  blocked: number
  skipped_booked: number
}
