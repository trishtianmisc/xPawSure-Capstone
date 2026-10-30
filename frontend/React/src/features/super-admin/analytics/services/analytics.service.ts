import http from '../../../../services/http'

import type { ClinicOverview, PlatformAnalytics } from '../types/analytics.types'

export const analyticsService = {
  async getOverview(): Promise<PlatformAnalytics> {
    const response = await http.get('/super-admin/analytics/overview/')
    return response.data
  },

  async getClinicOverview(clinicId: string): Promise<ClinicOverview> {
    const response = await http.get(`/super-admin/clinics/${clinicId}/overview/`)
    return response.data
  },
}
