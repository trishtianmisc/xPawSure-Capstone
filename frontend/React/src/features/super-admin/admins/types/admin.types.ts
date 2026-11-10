export interface ClinicAdmin {
  id: string
  staff_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  is_active: boolean
  must_change_password: boolean
  last_login: string | null
  created_at: string
  clinic_id: string
  clinic_name: string
}

export interface AdminListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: ClinicAdmin[]
}

export interface AdminListParams {
  clinic_id?: string
  search?: string
  status?: string
  page?: number
  page_size?: number
}

export interface CreateAdminPayload {
  email: string
  first_name: string
  last_name: string
  phone?: string
}

export interface CreateAdminResult {
  user_id: string
  staff_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  temp_password: string
  must_change_password: boolean
}
