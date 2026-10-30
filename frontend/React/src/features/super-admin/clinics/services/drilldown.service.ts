import http from '../../../../services/http'

export interface ClinicStaffRow {
  id: string
  user_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: string
  position: string
  is_active: boolean
  must_change_password: boolean
  created_at: string
  license_number: string | null
  license_expiration_date: string | null
}

export interface ClinicOwnerRow {
  id: string
  user_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  is_active: boolean
  created_at: string
}

export interface ClinicPetRow {
  id: string
  name: string
  sex: string
  breed: string | null
  owner_name: string
  is_active: boolean
  created_at: string
}

export interface ClinicAppointmentRow {
  id: string
  pet_name: string
  owner_name: string
  veterinarian_name: string | null
  type: string
  status: string
  scheduled_at: string
  created_at: string
}

export interface DrilldownListResponse<T> {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: T[]
}

interface ListParams {
  search?: string
  status?: string
  role?: string
  page?: number
  page_size?: number
}

function buildQuery(params: ListParams = {}): string {
  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.status) searchParams.set('status', params.status)
  if (params.role) searchParams.set('role', params.role)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.page_size) searchParams.set('page_size', String(params.page_size))
  const query = searchParams.toString()
  return query ? `?${query}` : ''
}

export const drilldownService = {
  async listStaff(clinicId: string, params: ListParams = {}): Promise<DrilldownListResponse<ClinicStaffRow>> {
    const response = await http.get(`/super-admin/clinics/${clinicId}/staff/${buildQuery(params)}`)
    return response.data
  },

  async listOwners(clinicId: string, params: ListParams = {}): Promise<DrilldownListResponse<ClinicOwnerRow>> {
    const response = await http.get(`/super-admin/clinics/${clinicId}/owners/${buildQuery(params)}`)
    return response.data
  },

  async listPets(clinicId: string, params: ListParams = {}): Promise<DrilldownListResponse<ClinicPetRow>> {
    const response = await http.get(`/super-admin/clinics/${clinicId}/pets/${buildQuery(params)}`)
    return response.data
  },

  async listAppointments(clinicId: string, params: ListParams = {}): Promise<DrilldownListResponse<ClinicAppointmentRow>> {
    const response = await http.get(`/super-admin/clinics/${clinicId}/appointments/${buildQuery(params)}`)
    return response.data
  },
}
