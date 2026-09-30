export interface DashboardStats {
  total_veterinarians: number
  total_pets: number
  appointments_this_month: number
  appointments_last_month: number
  screenings_pending_review: number
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface DashboardCharts {
  appointments_by_month: ChartDataPoint[]
  screenings_by_disease: ChartDataPoint[]
  vet_workload: ChartDataPoint[]
}

export type RecentCategory = 'staff' | 'clinic' | 'security' | 'cancellation'

export interface RecentItem {
  id: string
  title: string
  subtitle: string
  timestamp: string
  category?: RecentCategory
}

export interface DashboardData {
  stats: DashboardStats
  charts: DashboardCharts
  recent: RecentItem[]
}
