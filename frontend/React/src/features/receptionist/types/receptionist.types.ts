export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'VACCINATION' | 'AI_REVIEW' | 'EMERGENCY'
export type AppointmentStatus =
  | 'REVIEW'
  | 'CONFIRMATION'
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
  ais_confidence: string
  ais_model_version: string
  ais_status: string
  ais_source: 'MOCK' | 'DEVICE'
  ais_created_at: string
  ais_is_correct: boolean | null
  /** Owner's questionnaire rows (display-only); null when absent. */
  symptom_answers?: { question: string; answer: string }[] | null
}

/** Attached screening, reduced to a status line; null when none attached. */
export interface ScreeningStatusSummary {
  review_status: 'PENDING_REVIEW' | 'REVIEWED'
}

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

export type VetRequestType = 'RESCHEDULE' | 'CANCEL'
export type VetRequestStatus = 'OPEN' | 'RESOLVED' | 'DECLINED'

/** Vet-initiated request payload; receptionist/vet responses only. */
export interface VetRequest {
  type: VetRequestType
  status: VetRequestStatus
  reason: string | null
  requested_by: string | null
  requested_at: string | null
  decline_note: string | null
  resolved_by: string | null
  resolved_at: string | null
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
  screening: ScreeningSummary | null
  apt_checked_in_at: string | null
  apt_completed_at: string | null
  apt_cancelled_at: string | null
  apt_created_at: string
  has_open_request?: boolean
  vet_request?: VetRequest | null
}

/**
 * Detail payload: the AI screening block is vet-only, so only its presence and
 * review state reach the reception desk and clinic admin.
 */
export interface AppointmentDetail extends Omit<Appointment, 'screening'> {
  screening_status: ScreeningStatusSummary | null
  pet_breed: string | null
  pet_sex: string
  clinic_name: string
  owner_phone: string | null
  owner_email: string | null
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
  owner_name: string | null
  last_visit_date: string | null
  next_appointment_date: string | null
}

export interface PetListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Pet[]
}

/** Single-pet payload: the owner block is detail-only, never on list rows. */
export interface PetDetail extends Pet {
  owner: {
    name: string
    phone: string | null
    email: string
  } | null
}

export interface VaccinationRecord {
  id: string
  consultation_id: string | null
  pet_id: string
  pet_name: string
  veterinarian: string | null
  name: string
  brand: string | null
  batch_no: string | null
  series_id: string
  is_latest_in_series: boolean
  dose: string | null
  route: string | null
  date_given: string
  next_due: string | null
  notes: string | null
  source: 'VET' | 'OWNER'
  created_at: string
}

/** Appointment row in a pet's history; deliberately free of clinical data. */
export interface AppointmentHistoryItem {
  apt_id: string
  apt_scheduled_at: string
  apt_type: AppointmentType
  apt_status: AppointmentStatus
  vet_name: string | null
}

/**
 * Reception desk history: who treated the pet and when, plus its vaccines.
 * Consultations, prescriptions, and screenings are vet/clinic-admin only.
 */
export interface PetHistory {
  vaccinations: VaccinationRecord[]
  appointments: AppointmentHistoryItem[]
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

/** Dashboard group row; receptionist-only (never sent to clinic admins). */
export interface VetRequestSummary {
  apt_id: string
  pet_name: string
  owner_name: string | null
  apt_scheduled_at: string
  request_type: VetRequestType
  reason: string
  requested_at: string | null
}

export interface DashboardStats {
  today: {
    pending: number
    confirmed: number
    checked_in: number
    completed: number
    cancelled: number
    no_show: number
    total: number
  }
  upcoming: {
    pending: number
    confirmed: number
  }
  total_owners: number
  total_pets: number
  recent_appointments: Appointment[]
  unpaid_completions: Appointment[]
  needs_attention: number
  review_pending: number
  vet_requests?: VetRequestSummary[]
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
  is_past: boolean
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
  already_existed: number
  skipped_dates: { date: string; reason: string }[]
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
  skipped_passed: number
}
