export interface DashboardStats {
  total_veterinarians: number
  total_pets: number
  screenings_pending_review: number
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface DashboardCharts {
  screenings_by_disease: ChartDataPoint[]
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
  stats: DashboardStats
  charts: DashboardCharts
  recent: RecentItem[]
}
