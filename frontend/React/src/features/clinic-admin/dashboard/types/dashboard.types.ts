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
}

export interface RecentItem {
  id: string
  title: string
  subtitle: string
  timestamp: string
}

export interface RecentActivity {
  pets: RecentItem[]
  appointments: RecentItem[]
  screenings: RecentItem[]
  consultations: RecentItem[]
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export interface DashboardData {
  stats: DashboardStats
  charts: DashboardCharts
  recent: RecentActivity
  notifications: NotificationItem[]
}
