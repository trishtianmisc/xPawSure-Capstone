import http from '../../../../services/http'

import type { AuditLogListResponse, AuditLogParams } from '../types/auditLog.types'

export const auditLogService = {
  async list(params: AuditLogParams = {}): Promise<AuditLogListResponse> {
    const searchParams = new URLSearchParams()
    if (params.clinic_id) searchParams.set('clinic_id', params.clinic_id)
    if (params.module) searchParams.set('module', params.module)
    if (params.action) searchParams.set('action', params.action)
    if (params.search) searchParams.set('search', params.search)
    if (params.date_from) searchParams.set('date_from', params.date_from)
    if (params.date_to) searchParams.set('date_to', params.date_to)
    if (params.page) searchParams.set('page', String(params.page))
    if (params.page_size) searchParams.set('page_size', String(params.page_size))

    const query = searchParams.toString()
    const response = await http.get(`/super-admin/audit-logs/${query ? `?${query}` : ''}`)
    return response.data
  },
}
