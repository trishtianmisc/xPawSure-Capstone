import type { AppointmentStatus } from '../../../receptionist/types/receptionist.types'

export interface ReportQuery {
  date_from?: string
  date_to?: string
  vet_id?: string
}

export interface SummaryCounts {
  total_appointments: number
  completion_rate: number
  no_show_rate: number
  cancellation_rate: number
  new_patients: number
}

export interface ReportSummary extends SummaryCounts {
  previous: SummaryCounts
}

export interface SeriesPoint {
  date: string
  count: number
}

export interface StatusCount {
  status: AppointmentStatus
  count: number
}

export interface AppointmentsReport {
  series: SeriesPoint[]
  by_status: StatusCount[]
}

export interface VetWorkloadRow {
  vet_id: string
  vet_name: string
  total: number
  completed: number
  no_shows: number
  // Fixed two-decimal string: PAID payments in the window attributed to this
  // vet through the payment's appointment (same rule as the revenue KPI).
  revenue: string
  avg_per_day: number
}

export interface VetWorkloadReport {
  results: VetWorkloadRow[]
  days: number
}

export interface ConditionCount {
  disease: string
  count: number
}

export interface ScreeningsReport {
  by_condition: ConditionCount[]
  avg_confidence: number
  reviewed: number
  pending_review: number
  vet_confirmed: number
  vet_changed: number
}

export interface BreedCount {
  breed: string
  count: number
}

export interface SexCount {
  sex: 'MALE' | 'FEMALE'
  count: number
}

export interface AgeBucketCount {
  bucket: string
  count: number
}

export interface PatientsReport {
  total: number
  by_breed: BreedCount[]
  by_sex: SexCount[]
  age_buckets: AgeBucketCount[]
}

export interface ReportRevenue {
  revenue: string
  currency: string
  payment_count: number
  previous_revenue: string
  date_from: string
  date_to: string
  // Zero-filled buckets across the range: daily YYYY-MM-DD keys up to 31
  // days, monthly YYYY-MM keys beyond. amount is a fixed two-decimal string
  // and the sum of the series always equals `revenue`.
  series: RevenueSeriesPoint[]
}

export interface RevenueSeriesPoint {
  date: string
  amount: string
}
