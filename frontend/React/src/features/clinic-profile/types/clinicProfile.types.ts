export interface ClinicProfile {
  id: string
  name: string
  email: string
  phone: string
  address: string
  license_number: string
  status: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface ClinicSettings {
  opening_time: string
  closing_time: string
  appointment_duration: number
  max_appointments_per_day: number
  allow_owner_booking: boolean
  timezone: string
  created_at: string
  updated_at: string
}

export interface UpdateProfilePayload {
  name?: string
  email?: string
  phone?: string
  address?: string
}

export interface UpdateSettingsPayload {
  opening_time: string
  closing_time: string
  appointment_duration: number
  max_appointments_per_day: number
  allow_owner_booking: boolean
}

export type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

export interface OperatingHoursDay {
  day_of_week: DayOfWeek
  day_index: number
  opening_time: string | null
  closing_time: string | null
  is_closed: boolean
}

export type UpdateOperatingHoursPayload = OperatingHoursDay[]
