import http from '../../../services/http'
import type {
  BulkUploadResponse,
  CreateStaffPayload,
  CreateStaffResponse,
  StaffListResponse,
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

export async function getStaffDetail(id: string): Promise<StaffListResponse['results'][number]> {
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

export async function bulkUploadStaff(file: File): Promise<BulkUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await http.post('/staff/bulk-upload/', formData)
    return response.data
  } catch (error) {
    throw new Error(toErrorMessage(error))
  }
}
