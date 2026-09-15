import http from '../../../services/http'
import type {
  BulkUploadResponse,
  CreateStaffPayload,
  CreateStaffResponse,
  StaffListResponse,
  StaffMember,
  StaffStats,
  UpdateStaffPayload,
} from '../types/staff.types'

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const err = error as Error & { response?: { data?: unknown } }
    const data = err.response?.data
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>
      if (typeof record.detail === 'string') {
        return record.detail
      }
      return Object.values(record).flat().join(', ')
    }
    return err.message
  }
  return 'An unexpected error occurred.'
}

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
    throw new Error(toErrorMessage(error))
  }
}

export async function getStaffDetail(id: string): Promise<StaffMember> {
  try {
    const response = await http.get(`/staff/${id}/`)
    return response.data
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function createStaff(payload: CreateStaffPayload): Promise<CreateStaffResponse> {
  try {
    const response = await http.post('/staff/', payload)
    return response.data
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function updateStaff(id: string, payload: UpdateStaffPayload): Promise<StaffMember> {
  try {
    const response = await http.patch(`/staff/${id}/`, payload)
    return response.data
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}

export async function staffAction(id: string, action: string): Promise<{ detail: string }> {
  try {
    const response = await http.post(`/staff/${id}/${action}/`)
    return response.data
  } catch (error) {
    throw new Error(toErrorMessage(error))
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
    throw new Error(toErrorMessage(error))
  }
}

export async function getStaffStats(): Promise<StaffStats> {
  try {
    const response = await http.get('/staff/stats/')
    return response.data
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}
