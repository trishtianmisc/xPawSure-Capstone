import type { DashboardData } from '../types/dashboard.types'

const MOCK_DASHBOARD: DashboardData = {
  stats: {
    total_veterinarians: 6,
    total_pets: 215,
    appointments_this_month: 59,
    appointments_last_month: 51,
    screenings_pending_review: 3,
  },
  charts: {
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
    screenings_by_disease: [
      { label: 'Mange', value: 35 },
      { label: 'Hot Spot', value: 22 },
      { label: 'Ringworm', value: 18 },
      { label: 'Allergic Dermatitis', value: 15 },
      { label: 'Other', value: 10 },
    ],
    // TODO: source from appointment service — group appointments by vetId, filter
    // to current month (backend appointments app stubbed on this branch; full
    // implementation lives on the Clinic-Receptionist branch).
    vet_workload: [
      { label: 'Dr. Santos', value: 14 },
      { label: 'Dr. Cruz', value: 12 },
      { label: 'Dr. Reyes', value: 10 },
      { label: 'Dr. Villanueva', value: 9 },
      { label: 'Dr. Lim', value: 8 },
      { label: 'Dr. Aquino', value: 6 },
    ],
  },
  recent: [
    { id: 'r1', title: 'Veterinarian onboarded', subtitle: 'Dr. Cruz added to the clinic team', timestamp: '2 hours ago', category: 'staff' },
    { id: 'r2', title: 'Staff account disabled', subtitle: 'Maria Reyes (Receptionist)', timestamp: '5 hours ago', category: 'staff' },
    { id: 'r3', title: 'First login recorded', subtitle: 'Dr. Santos activated her account (invited → active)', timestamp: 'Yesterday', category: 'security' },
    { id: 'r4', title: 'Clinic profile updated', subtitle: 'Contact number changed', timestamp: 'Yesterday', category: 'clinic' },
    { id: 'r5', title: 'Operating hours updated', subtitle: 'Mon–Sat · 8:00 AM – 6:00 PM', timestamp: '2 days ago', category: 'clinic' },
    { id: 'r6', title: 'Clinic logo updated', subtitle: 'New branding uploaded', timestamp: '3 days ago', category: 'clinic' },
    { id: 'r7', title: 'Clinic-wide cancellation', subtitle: '6 appointments cancelled — schedule conflict', timestamp: '4 days ago', category: 'cancellation' },
  ],
}

export const dashboardService = {
  async get(): Promise<DashboardData> {
    return MOCK_DASHBOARD
  },
}
