import http from '../../../services/http'
import { apiErrorMessage } from '../../../utils/error'
import type {
  BulkUploadResponse,
  CreateStaffPayload,
  CreateStaffResponse,
  StaffListResponse,
  StaffMember,
  StaffStats,
  UpdateStaffPayload,
} from '../types/staff.types'

export async function listStaff(params?: {
  role?: string
  search?: string
  status?: string
  page?: number
  page_size?: number
}): Promise<StaffListResponse> {
  try {
    const response = await http.get('/staff/', { params })
    return response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error), { cause: error })
  }
}

export async function getStaffDetail(id: string): Promise<StaffMember> {
  try {
    const response = await http.get(`/staff/${id}/`)
    return response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error), { cause: error })
  }
}

export async function createStaff(payload: CreateStaffPayload): Promise<CreateStaffResponse> {
  try {
    const response = await http.post('/staff/', payload)
    return response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error), { cause: error })
  }
}

export async function updateStaff(id: string, payload: UpdateStaffPayload): Promise<StaffMember> {
  try {
    const response = await http.patch(`/staff/${id}/`, payload)
    return response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error), { cause: error })
  }
}

export async function staffAction(id: string, action: string): Promise<{ detail: string }> {
  try {
    const response = await http.post(`/staff/${id}/${action}/`)
    return response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error), { cause: error })
  }
}

export async function bulkUploadStaff(file: File): Promise<BulkUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await http.post('/staff/bulk-upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error), { cause: error })
  }
}

export async function getStaffStats(): Promise<StaffStats> {
  try {
    const response = await http.get('/staff/stats/')
    return response.data
  } catch (error) {
    throw new Error(apiErrorMessage(error), { cause: error })
  }
}
