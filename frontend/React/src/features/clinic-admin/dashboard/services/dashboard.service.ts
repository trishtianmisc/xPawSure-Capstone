import type {
  ClinicDashboardStats,
  DashboardData,
  RecentCategory,
  RecentItem,
  ScreeningStats,
} from '../types/dashboard.types'
import http from '../../../../services/http'

interface AuditLogRow {
  id: string
  title: string
  subtitle: string
  category: RecentCategory
  timestamp: string
}

export async function getClinicDashboardStats(): Promise<ClinicDashboardStats> {
  const { data } = await http.get<ClinicDashboardStats>('/dashboard/stats/')
  return data
}

export async function getScreeningStats(): Promise<ScreeningStats> {
  const { data } = await http.get<ScreeningStats>('/screenings/stats/')
  return data
}

export const dashboardService = {
  async get(): Promise<DashboardData> {
    let recent: RecentItem[]
    try {
      const { data } = await http.get<AuditLogRow[]>('audit-logs/', { params: { limit: 10 } })
      recent = data.map((row) => ({
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        timestamp: row.timestamp,
        category: row.category,
      }))
    } catch {
      recent = []
    }

    // Charts come from their own real endpoints (e.g. the vet workload
    // chart uses GET /reports/vet-workload/); this service only feeds
    // Recent Activity.
    return { recent }
  },
}
