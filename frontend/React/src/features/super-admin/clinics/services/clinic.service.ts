import http from '../../../../services/http'

export interface CreateClinicPayload {
  name: string
  email: string
  phone?: string
  address?: string
  license_number?: string
}

export interface UpdateClinicPayload {
  name?: string
  email?: string
  phone?: string
  address?: string
  license_number?: string
}

export interface ClinicResponse {
  id: string
  name: string
  email: string
  phone: string
  address: string
  license_number: string
  status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface ClinicListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: ClinicResponse[]
}

export interface ClinicStats {
  total: number
  active: number
  inactive: number
  suspended: number
  archived: number
  recent: ClinicResponse[]
}

export interface ListParams {
  search?: string
  status?: string
  sort?: string
  page?: number
  page_size?: number
}

export const clinicService = {
  async create(data: CreateClinicPayload): Promise<ClinicResponse> {
    const response = await http.post('/clinics/', data)
    return response.data
  },

  async list(params: ListParams = {}): Promise<ClinicListResponse> {
    const searchParams = new URLSearchParams()
    if (params.search) searchParams.set('search', params.search)
    if (params.status) searchParams.set('status', params.status)
    if (params.sort) searchParams.set('sort', params.sort)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.page_size) searchParams.set('page_size', String(params.page_size))

    const query = searchParams.toString()
    const url = `/clinics/${query ? `?${query}` : ''}`
    const response = await http.get(url)
    return response.data
  },

  async getById(id: string): Promise<ClinicResponse> {
    const response = await http.get(`/clinics/${id}/`)
    return response.data
  },

  async update(id: string, data: UpdateClinicPayload): Promise<ClinicResponse> {
    const response = await http.put(`/clinics/${id}/`, data)
    return response.data
  },

  async delete(id: string): Promise<void> {
    await http.delete(`/clinics/${id}/`)
  },

  async changeStatus(id: string, status: string): Promise<ClinicResponse> {
    const response = await http.patch(`/clinics/${id}/status/`, { status })
    return response.data
  },

  async getStats(): Promise<ClinicStats> {
    const response = await http.get('/clinics/stats/')
    return response.data
  },
}
