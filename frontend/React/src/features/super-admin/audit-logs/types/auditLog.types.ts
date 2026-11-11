export interface AuditLogEntry {
  id: string
  user_id: string | null
  action: string
  module: string
  table_name: string
  record_id: string | null
  description: string | null
  ip_address: string | null
  device: string | null
  timestamp: string
}

export interface AuditLogListResponse {
  total: number
  page: number
  page_size: number
  total_pages: number
  results: AuditLogEntry[]
}

export interface AuditLogParams {
  clinic_id?: string
  module?: string
  action?: string
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}
