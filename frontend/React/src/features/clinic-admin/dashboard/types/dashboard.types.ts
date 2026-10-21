export interface ClinicDashboardStats {
  total_pets: number
  total_owners: number
}

export interface ScreeningStats {
  screenings_pending_review: number
  screenings_by_disease: ChartDataPoint[]
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface DashboardCharts {
  vet_workload: ChartDataPoint[]
}

export type RecentCategory = 'staff' | 'clinic' | 'cancellation'

export interface RecentItem {
  id: string
  title: string
  subtitle: string
  timestamp: string
  category?: RecentCategory
}

export interface DashboardData {
  charts: DashboardCharts
  recent: RecentItem[]
}
