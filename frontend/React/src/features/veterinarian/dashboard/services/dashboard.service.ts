import type { VetDashboardData } from '../types/dashboard.types'

const MOCK_VET_DASHBOARD: VetDashboardData = {
  clinic_name: 'Pawcare Veterinary Clinic',
  stats: {
    consultations_this_month: 6,
    pending: 4,
    completed: 5,
  },
  today_consultations: [
    {
      id: '1',
      pet_name: 'Max',
      breed: 'Golden Retriever',
      time: '10:00 AM',
      status: 'COMPLETED',
    },
    {
      id: '2',
      pet_name: 'Bella',
      breed: 'Shih Tzu',
      time: '1:30 PM',
      status: 'PENDING',
    },
  ],
}

export const dashboardService = {
  async get(): Promise<VetDashboardData> {
    return MOCK_VET_DASHBOARD
  },
}
