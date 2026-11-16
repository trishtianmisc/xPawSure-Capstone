import http from '../../../../services/http'
import type {
  VetAnalyticsQuery,
  VetAppointmentsReport,
  VetReportSummary,
} from '../types/analytics.types'

export async function getVetReportSummary(
  params: VetAnalyticsQuery,
): Promise<VetReportSummary> {
  const { data } = await http.get<VetReportSummary>(
    '/veterinarian/reports/summary/',
    { params },
  )
  return data
}

export async function getVetReportAppointments(
  params: VetAnalyticsQuery,
): Promise<VetAppointmentsReport> {
  const { data } = await http.get<VetAppointmentsReport>(
    '/veterinarian/reports/appointments/',
    { params },
  )
  return data
}
