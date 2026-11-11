import { useQuery } from '@tanstack/react-query'

import { auditLogService } from '../services/auditLog.service'

import type { AuditLogParams } from '../types/auditLog.types'

export function useAuditLogs(params?: AuditLogParams) {
  return useQuery({
    queryKey: ['super-admin-audit-logs', params],
    queryFn: () => auditLogService.list(params),
    staleTime: 30_000,
  })
}
