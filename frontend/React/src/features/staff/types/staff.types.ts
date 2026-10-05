export interface StaffMember {
  id: string
  user_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: 'VETERINARIAN' | 'RECEPTIONIST'
  position: 'VETERINARIAN' | 'RECEPTIONIST'
  is_active: boolean
  must_change_password: boolean
  created_at: string
  updated_at?: string
  clinic_id?: string
  clinic_name?: string
  license_number?: string | null
  license_expiration_date?: string | null
}

export interface StaffStats {
  total: number
  veterinarians: number
  receptionists: number
  active: number
  pending_setup: number
  deactivated: number
  licenses_expiring_soon: number
}

export interface CreateStaffPayload {
  email: string
  first_name: string
  last_name: string
  phone?: string
  role: 'VETERINARIAN' | 'RECEPTIONIST'
  license_number?: string
  license_expiration_date?: string
}

export interface CreateStaffResponse {
  id: string
  user_id: string
  email: string
  role: 'VETERINARIAN' | 'RECEPTIONIST'
  first_name: string
  last_name: string
  temp_password: string
  must_change_password: boolean
  license_number?: string | null
  license_expiration_date?: string | null
}

export interface UpdateStaffPayload {
  first_name?: string
  last_name?: string
  phone?: string
  license_number?: string
  license_expiration_date?: string
}

export interface StaffListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: StaffMember[]
}

export interface BulkUploadStaffResult {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'VETERINARIAN' | 'RECEPTIONIST'
}

export interface BulkUploadRowError {
  row: number
  email: string
  errors: string
}

export interface BulkUploadResponse {
  total_rows: number
  success_count: number
  fail_count: number
  results: BulkUploadStaffResult[]
  errors: BulkUploadRowError[]
}
