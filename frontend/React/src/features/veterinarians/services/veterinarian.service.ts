import http from '../../../services/http'
import type {
  CreateVeterinarianPayload,
  CreateVeterinarianResponse,
  VeterinarianDetail,
  VeterinarianListResponse,
} from '../types/veterinarian.types'

export const veterinarianService = {
  async list(params?: {
    search?: string
    status?: string
    page?: number
    page_size?: number
    sort?: string
  }): Promise<VeterinarianListResponse> {
    const response = await http.get('/veterinarians/', { params })
    return response.data
  },

  async getById(id: string): Promise<VeterinarianDetail> {
    const response = await http.get(`/veterinarians/${id}/`)
    return response.data
  },

  async create(payload: CreateVeterinarianPayload): Promise<CreateVeterinarianResponse> {
    const response = await http.post('/veterinarians/', payload)
    return response.data
  },
}
