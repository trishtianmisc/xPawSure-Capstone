export interface OwnerListItem {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address: string | null
  is_active: boolean
  pet_count: number
  created_at: string
}

export interface OwnerPet {
  id: string
  name: string
  sex: string
  breed_id: string
  breed_name: string
  date_of_birth: string | null
  weight: string | null
  color: string | null
  microchip_number: string | null
  profile_picture: string | null
  qr_code: string | null
  qr_code_url: string | null
  created_at: string
}

export interface OwnerClinic {
  id: string
  name: string
  status: string
}

export interface OwnerDetail extends OwnerListItem {
  pets: OwnerPet[]
  clinics: OwnerClinic[]
}

export interface OwnerListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: OwnerListItem[]
}

export interface OwnerListParams {
  clinic_id?: string
  search?: string
  page?: number
  page_size?: number
}

/** Contact info only — email and role are not editable through this endpoint. */
export interface UpdateOwnerContactPayload {
  first_name: string
  last_name: string
  phone?: string
  address?: string
}
