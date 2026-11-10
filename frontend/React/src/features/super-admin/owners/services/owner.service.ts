import http from '../../../../services/http'

import type {
  OwnerDetail,
  OwnerListParams,
  OwnerListResponse,
  UpdateOwnerContactPayload,
} from '../types/owner.types'

export const ownerService = {
  async list(params: OwnerListParams = {}): Promise<OwnerListResponse> {
    const searchParams = new URLSearchParams()
    if (params.clinic_id) searchParams.set('clinic_id', params.clinic_id)
    if (params.search) searchParams.set('search', params.search)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.page_size) searchParams.set('page_size', String(params.page_size))

    const query = searchParams.toString()
    const response = await http.get(`/super-admin/owners/${query ? `?${query}` : ''}`)
    return response.data
  },

  async get(ownerId: string): Promise<OwnerDetail> {
    const response = await http.get(`/super-admin/owners/${ownerId}/`)
    return response.data
  },

  async updateContact(ownerId: string, payload: UpdateOwnerContactPayload): Promise<OwnerDetail> {
    const response = await http.put(`/super-admin/owners/${ownerId}/`, payload)
    return response.data
  },
}
