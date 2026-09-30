export interface VetDashboardStats {
  consultations_this_month: number
  pending: number
  completed: number
}

export interface TodayConsultation {
  id: string
  pet_name: string
  breed: string
  time: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
}

export interface VetDashboardData {
  clinic_name: string
  stats: VetDashboardStats
  today_consultations: TodayConsultation[]
}
