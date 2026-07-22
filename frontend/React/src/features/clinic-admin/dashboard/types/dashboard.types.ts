export interface DashboardStats {
  total_owners: number
  total_pets: number
  today_appointments: number
  pending_appointments: number
  completed_appointments: number
  total_veterinarians: number
  total_receptionists: number
  screenings_pending_review: number
}

export interface ChartDataPoint {
  label: string
  value: number
}

export interface DashboardCharts {
  appointments_by_month: ChartDataPoint[]
  screenings_by_disease: ChartDataPoint[]
  pet_registration_trend: ChartDataPoint[]
  vaccination_trend: ChartDataPoint[]
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
