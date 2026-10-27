import http from '../../../../services/http'
import type {
  AppointmentsReport,
  ReportQuery,
  ReportSummary,
  ScreeningsReport,
  VetWorkloadReport,
} from '../types/reports.types'

export async function getReportSummary(
  params: ReportQuery,
): Promise<ReportSummary> {
  const { data } = await http.get<ReportSummary>('/reports/summary/', {
    params,
  })
  return data
}

export async function getReportAppointments(
  params: ReportQuery,
): Promise<AppointmentsReport> {
  const { data } = await http.get<AppointmentsReport>(
    '/reports/appointments/',
    { params },
  )
  return data
}

export async function getReportVetWorkload(
  params: ReportQuery,
): Promise<VetWorkloadReport> {
  const { data } = await http.get<VetWorkloadReport>(
    '/reports/vet-workload/',
    { params },
  )
  return data
}

export async function getReportScreenings(
  params: ReportQuery,
): Promise<ScreeningsReport> {
  const { data } = await http.get<ScreeningsReport>('/reports/screenings/', {
    params,
  })
  return data
}
