import type {
  SeriesPoint,
  StatusCount,
} from '../../../clinic-admin/reports/types/reports.types'

export interface VetAnalyticsQuery {
  date_from?: string
  date_to?: string
}

export interface VetSummaryCounts {
  total_appointments: number
  completion_rate: number
  no_show_rate: number
  cancellation_rate: number
}

export interface VetReportSummary extends VetSummaryCounts {
  previous: VetSummaryCounts
}

export interface VetAppointmentsReport {
  series: SeriesPoint[]
  by_status: StatusCount[]
}
