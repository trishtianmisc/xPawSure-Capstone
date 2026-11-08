import { useQuery } from '@tanstack/react-query'

import {
  getReportAppointments,
  getReportPatients,
  getReportScreenings,
  getReportSummary,
  getReportVetWorkload,
} from '../services/reports.service'
import type { ReportQuery } from '../types/reports.types'

const reportsKey = (endpoint: string, params: ReportQuery) =>
  ['clinic-admin', 'reports', endpoint, params] as const

export function useReportSummary(params: ReportQuery) {
  return useQuery({
    queryKey: reportsKey('summary', params),
    queryFn: () => getReportSummary(params),
    staleTime: 60_000,
  })
}

export function useReportAppointments(params: ReportQuery) {
  return useQuery({
    queryKey: reportsKey('appointments', params),
    queryFn: () => getReportAppointments(params),
    staleTime: 60_000,
  })
}

export function useReportVetWorkload(params: ReportQuery) {
  return useQuery({
    queryKey: reportsKey('vet-workload', params),
    queryFn: () => getReportVetWorkload(params),
    staleTime: 60_000,
  })
}

export function useReportScreenings(params: ReportQuery) {
  return useQuery({
    queryKey: reportsKey('screenings', params),
    queryFn: () => getReportScreenings(params),
    staleTime: 60_000,
  })
}

export function useReportPatients(params: ReportQuery) {
  return useQuery({
    queryKey: reportsKey('patients', params),
    queryFn: () => getReportPatients(params),
    staleTime: 60_000,
  })
}
