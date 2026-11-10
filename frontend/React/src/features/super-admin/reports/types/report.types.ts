export interface AccuracySummary {
  total_screenings: number
  compared: number
  correct: number
  incorrect: number
  awaiting_comparison: number
  accuracy_percent: number | null
}

interface AccuracyGroupRow {
  compared: number
  correct: number
  accuracy_percent: number | null
}

export interface AccuracyByModelVersion extends AccuracyGroupRow {
  model_version: string
}

export interface AccuracyByDisease extends AccuracyGroupRow {
  disease: string
}

export interface AccuracyByClinic extends AccuracyGroupRow {
  clinic_id: string
  clinic_name: string
}

export interface AccuracyTrendPoint {
  month: string
  compared: number
  correct: number
}

export interface AccuracyReport {
  generated_at: string
  filters: {
    clinic_id: string | null
    model_version: string | null
    date_from: string | null
    date_to: string | null
  }
  summary: AccuracySummary
  model_versions: string[]
  by_model_version: AccuracyByModelVersion[]
  by_disease: AccuracyByDisease[]
  by_clinic: AccuracyByClinic[]
  trend: AccuracyTrendPoint[]
}

export interface AccuracyReportParams {
  clinic_id?: string
  model_version?: string
  date_from?: string
  date_to?: string
}

export type DiseaseSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'UNKNOWN'

export interface ScreeningDiseaseRow {
  disease: string
  severity: DiseaseSeverity
  count: number
}

export interface ConfirmedDiseaseRow {
  disease: string
  count: number
}

export interface DiseaseTrendPoint {
  month: string
  count: number
}

export interface DiseaseReport {
  generated_at: string
  filters: {
    clinic_id: string | null
    date_from: string | null
    date_to: string | null
  }
  totals: {
    screenings: number
    confirmed_diagnoses: number
  }
  screenings_by_disease: ScreeningDiseaseRow[]
  confirmed_by_disease: ConfirmedDiseaseRow[]
  severity_breakdown: Record<DiseaseSeverity, number>
  trend: DiseaseTrendPoint[]
}

export interface DiseaseReportParams {
  clinic_id?: string
  date_from?: string
  date_to?: string
}
