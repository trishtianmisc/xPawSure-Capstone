export interface Veterinarian {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  is_active: boolean
  license_number: string | null
  license_expiration_date: string | null
  created_at: string
}

export interface VeterinarianDetail extends Veterinarian {
  must_change_password: boolean
  clinic_id: string
  clinic_name: string
  updated_at: string
}

export interface CreateVeterinarianPayload {
  first_name: string
  last_name: string
  email: string
  phone?: string
  license_number: string
  license_expiration_date?: string | null
}

export interface VeterinarianListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: Veterinarian[]
}

export interface CreateVeterinarianResponse extends VeterinarianDetail {
  temp_password: string
}
