import type { DashboardData } from '../types/dashboard.types'

const MOCK_DASHBOARD: DashboardData = {
  stats: {
    total_owners: 128,
    total_pets: 215,
    today_appointments: 12,
    pending_appointments: 8,
    completed_appointments: 4,
    total_veterinarians: 6,
    total_receptionists: 4,
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
    pet_registration_trend: [
      { label: 'Jan', value: 12 },
      { label: 'Feb', value: 18 },
      { label: 'Mar', value: 15 },
      { label: 'Apr', value: 22 },
      { label: 'May', value: 19 },
      { label: 'Jun', value: 25 },
      { label: 'Jul', value: 21 },
      { label: 'Aug', value: 28 },
      { label: 'Sep', value: 16 },
      { label: 'Oct', value: 20 },
      { label: 'Nov', value: 14 },
      { label: 'Dec', value: 23 },
    ],
    vaccination_trend: [
      { label: 'Jan', value: 30 },
      { label: 'Feb', value: 42 },
      { label: 'Mar', value: 35 },
      { label: 'Apr', value: 48 },
      { label: 'May', value: 41 },
      { label: 'Jun', value: 55 },
      { label: 'Jul', value: 39 },
      { label: 'Aug', value: 51 },
      { label: 'Sep', value: 44 },
      { label: 'Oct', value: 37 },
      { label: 'Nov', value: 46 },
      { label: 'Dec', value: 50 },
    ],
  },
  recent: {
    pets: [
      { id: '1', title: 'Buddy', subtitle: 'Golden Retriever · Male', timestamp: '2 hours ago' },
      { id: '2', title: 'Luna', subtitle: 'Shih Tzu · Female', timestamp: '4 hours ago' },
      { id: '3', title: 'Max', subtitle: 'Labrador · Male', timestamp: 'Yesterday' },
      { id: '4', title: 'Bella', subtitle: 'Pomeranian · Female', timestamp: 'Yesterday' },
    ],
    appointments: [
      { id: '1', title: 'Rex · Annual Checkup', subtitle: 'Dr. Santos · 10:00 AM', timestamp: 'Today' },
      { id: '2', title: 'Milo · Vaccination', subtitle: 'Dr. Cruz · 11:30 AM', timestamp: 'Today' },
      { id: '3', title: 'Coco · Grooming', subtitle: 'Dr. Santos · 2:00 PM', timestamp: 'Today' },
      { id: '4', title: 'Charlie · Follow-up', subtitle: 'Dr. Reyes · 3:30 PM', timestamp: 'Today' },
    ],
    screenings: [
      { id: '1', title: 'Rocky · Possible Mange', subtitle: 'Confidence: 94%', timestamp: '1 hour ago' },
      { id: '2', title: 'Daisy · Skin Irritation', subtitle: 'Confidence: 87%', timestamp: '3 hours ago' },
      { id: '3', title: 'Oscar · Hot Spot', subtitle: 'Confidence: 91%', timestamp: '5 hours ago' },
    ],
    consultations: [
      { id: '1', title: 'Luna · Skin Allergy', subtitle: 'Dr. Reyes completed', timestamp: '1 hour ago' },
      { id: '2', title: 'Thor · Ear Infection', subtitle: 'Dr. Cruz completed', timestamp: '3 hours ago' },
    ],
  },
  notifications: [
    {
      id: '1',
      title: 'New Appointment',
      message: 'A new appointment has been booked by Maria Santos for her pet Luna.',
      type: 'APPOINTMENT_CREATED',
      is_read: false,
      created_at: '10 minutes ago',
    },
    {
      id: '2',
      title: 'AI Screening Ready',
      message: 'AI screening results for Rocky are pending your review.',
      type: 'AI_SCREENING_COMPLETED',
      is_read: false,
      created_at: '1 hour ago',
    },
    {
      id: '3',
      title: 'Appointment Reminder',
      message: 'Rex has an appointment at 10:00 AM tomorrow with Dr. Santos.',
      type: 'APPOINTMENT_REMINDER',
      is_read: true,
      created_at: '3 hours ago',
    },
    {
      id: '4',
      title: 'Vaccination Due',
      message: 'Milo is due for his annual booster vaccination.',
      type: 'VACCINATION_REMINDER',
      is_read: true,
      created_at: 'Yesterday',
    },
  ],
}

export const dashboardService = {
  async get(): Promise<DashboardData> {
    return MOCK_DASHBOARD
  },
}
