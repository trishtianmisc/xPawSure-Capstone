import type {
  ClinicDashboardStats,
  DashboardCharts,
  DashboardData,
  RecentCategory,
  RecentItem,
  ScreeningStats,
} from '../types/dashboard.types'
import http from '../../../../services/http'

const MOCK_CHARTS: DashboardCharts = {
  // TODO: source from an appointment endpoint that groups by vet and month.
  vet_workload: [
    { label: 'Dr. Santos', value: 14 },
    { label: 'Dr. Cruz', value: 12 },
    { label: 'Dr. Reyes', value: 10 },
    { label: 'Dr. Villanueva', value: 9 },
    { label: 'Dr. Lim', value: 8 },
    { label: 'Dr. Aquino', value: 6 },
  ],
}

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

    // Only vet workload is still mocked; appointments, patients, and
    // screenings come from their own real endpoints.
    return { charts: MOCK_CHARTS, recent }
  },
}
