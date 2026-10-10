import type { ChartDataPoint, DashboardCharts, DashboardData, DashboardStats, RecentCategory, RecentItem } from '../types/dashboard.types'
import http from '../../../../services/http'

const MOCK_STATS: DashboardStats = {
  total_veterinarians: 6,
  total_pets: 215,
  screenings_pending_review: 3,
}

const MOCK_CHARTS: DashboardCharts = {
  screenings_by_disease: [
    { label: 'Mange', value: 35 },
    { label: 'Hot Spot', value: 22 },
    { label: 'Ringworm', value: 18 },
    { label: 'Allergic Dermatitis', value: 15 },
    { label: 'Other', value: 10 },
  ],
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

    // TODO: replace MOCK_STATS / remaining MOCK_CHARTS with real endpoints
    // (total_pets, screenings, vet workload). Appointment stats and the
    // appointments-by-month chart are real, via GET /api/appointments/volume/
    // (see useAppointmentVolume). Screenings stay mock until ai_screenings
    // has a backend.
    return { stats: MOCK_STATS, charts: MOCK_CHARTS, recent }
  },
}
