import type { ChartDataPoint, DashboardCharts, DashboardData, DashboardStats, RecentCategory, RecentItem } from '../types/dashboard.types'
import http from '../../../../services/http'

const MOCK_STATS: DashboardStats = {
  total_veterinarians: 6,
  total_pets: 215,
  appointments_this_month: 59,
  appointments_last_month: 51,
  screenings_pending_review: 0,
}

interface ScreeningStatsResponse {
  screenings_pending_review: number
  screenings_by_disease: ChartDataPoint[]
}

const MOCK_CHARTS: DashboardCharts = {
  appointments_by_month: [
    { label: 'Jan', value: 45 },
    { label: 'Feb', value: 52 },
    { label: 'Mar', value: 38 },
    { label: 'Apr', value: 61 },
    { label: 'May', value: 55 },
    { label: 'Jun', value: 72 },
    { label: 'Jul', value: 48 },
    { label: 'Aug', value: 64 },
    { label: 'Sep', value: 59 },
    { label: 'Oct', value: 43 },
    { label: 'Nov', value: 51 },
    { label: 'Dec', value: 47 },
  ],
  screenings_by_disease: [],
  // TODO: source from appointment service — group appointments by vetId, filter
  // to current month (backend appointments app stubbed on this branch).
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

    // TODO: replace remaining MOCK_STATS / MOCK_CHARTS with real endpoints
    // (total_pets, month aggregates, vet workload).
    let stats = MOCK_STATS
    let charts = MOCK_CHARTS
    try {
      const { data } = await http.get<ScreeningStatsResponse>('screenings/stats/')
      stats = { ...MOCK_STATS, screenings_pending_review: data.screenings_pending_review }
      charts = { ...MOCK_CHARTS, screenings_by_disease: data.screenings_by_disease }
    } catch {
      // fall back to zeroed screening stats
    }
    return { stats, charts, recent }
  },
}
