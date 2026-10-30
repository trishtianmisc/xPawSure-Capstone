import http from '../../../../services/http'

import type {
  AdminListParams,
  AdminListResponse,
  ClinicAdmin,
  CreateAdminPayload,
  CreateAdminResult,
} from '../types/admin.types'

export const adminService = {
  async list(params: AdminListParams = {}): Promise<AdminListResponse> {
    const searchParams = new URLSearchParams()
    if (params.clinic_id) searchParams.set('clinic_id', params.clinic_id)
    if (params.search) searchParams.set('search', params.search)
    if (params.status) searchParams.set('status', params.status)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.page_size) searchParams.set('page_size', String(params.page_size))

    const query = searchParams.toString()
    const response = await http.get(`/super-admin/admins/${query ? `?${query}` : ''}`)
    return response.data
  },

  async listForClinic(clinicId: string): Promise<ClinicAdmin[]> {
    const response = await http.get(`/super-admin/clinics/${clinicId}/admins/`)
    return response.data
  },

  async create(clinicId: string, data: CreateAdminPayload): Promise<CreateAdminResult> {
    const response = await http.post(`/super-admin/clinics/${clinicId}/admins/`, data)
    return response.data
  },

  async resendCredentials(adminUserId: string): Promise<{ email_sent: boolean }> {
    const response = await http.post(`/super-admin/admins/${adminUserId}/resend-credentials/`)
    return response.data
  },

  async deactivate(adminUserId: string): Promise<{ is_active: boolean }> {
    const response = await http.post(`/super-admin/admins/${adminUserId}/deactivate/`)
    return response.data
  },

  async activate(adminUserId: string): Promise<{ is_active: boolean }> {
    const response = await http.post(`/super-admin/admins/${adminUserId}/activate/`)
    return response.data
  },
}
