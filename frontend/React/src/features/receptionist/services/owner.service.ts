import http from '../../../services/http'
import type { Owner, OwnerDetail, OwnerListResponse } from '../types/receptionist.types'

export async function listOwners(params: {
  search?: string
  page?: number
  page_size?: number
}): Promise<OwnerListResponse> {
  const { data } = await http.get('/owners/', { params })
  return data
}

export async function getOwnerDetail(ownerId: string): Promise<OwnerDetail> {
  const { data } = await http.get(`/owners/${ownerId}/`)
  return data
}
